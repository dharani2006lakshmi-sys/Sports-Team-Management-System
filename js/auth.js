// ============================================================
//  auth.js — Login, Register, Logout, Demo Sessions
//  + SQL mirror layer (initSQL / sqlLogAuth / sqlUpsertUser)
//  + Biometric credential ID storage (webauthn.js)
// ============================================================
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── SQL layer (initialised lazily so pages don't block)
import { initSQL, sqlLogAuth, sqlUpsertUser, sqlUpsertPlayer }
  from './sql-layer.js';

// ── Kick off SQLite init in the background immediately ────
let _sqlReady = initSQL().catch(e =>
  console.warn('[SQL] Init failed (non-fatal):', e.message)
);

// ── REGISTER new user ──────────────────────────────────────
export async function registerUser({ name, email, password, role, sport, teamCode }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  const profileData = {
    uid, name, email, role, sport,
    teamCode: teamCode || null,
    createdAt: serverTimestamp(),
    biometricCredentials: [],
    ...(role === 'player' ? {
      position: '', jerseyNumber: '',
      age: '', height: '', weight: '',
      goals: 0, assists: 0, matchesPlayed: 0,
      fitnessScore: 0, status: 'Active'
    } : {}),
    ...(role === 'coach' ? {
      specialization: '', experience: ''
    } : {}),
    ...(role === 'manager' ? {
      department: ''
    } : {})
  };

  try {
    await setDoc(doc(db, 'users', uid), profileData);
    if (role === 'player') {
      await setDoc(doc(db, 'players', uid), profileData);
    } else if (role === 'coach') {
      await setDoc(doc(db, 'coaches', uid), profileData);
    } else if (role === 'manager') {
      await setDoc(doc(db, 'managers', uid), profileData);
    }
  } catch (err) {
    console.warn('[Firebase] Firestore write failed:', err);
  }

  // SQL mirror
  try {
    await _sqlReady;
    sqlUpsertUser({ uid, name, email, role, sport, teamCode });
    if (role === 'player') sqlUpsertPlayer({ ...profileData, uid });
    sqlLogAuth(uid, email, 'password', 'register');
  } catch(e) {}

  sessionStorage.setItem('ch_uid',  uid);
  sessionStorage.setItem('ch_role', role);
  sessionStorage.setItem('ch_name', name);
  sessionStorage.setItem('ch_email', email);

  return { uid, role };
}

// ── LOGIN existing user ────────────────────────────────────
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  let data = null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      data = snap.data();
    }
  } catch (err) {
    console.warn('[Firebase] Profile fetch failed, falling back to local:', err);
  }

  if (!data) {
    data = {
      uid,
      name: email.split('@')[0],
      email: email,
      role: 'manager',
      sport: 'Cricket',
      teamCode: 'CSK2026'
    };
  }

  const linked = resolveLinkedCskProfile(cred.user.email || data.email || email, uid, cred.user.displayName, data);
  if (linked) {
    data = linked.profile;
    if (linked.migrated) {
      try {
        await setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
        await setDoc(doc(db, data.role + 's', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
        if (data.role === 'player') sqlUpsertPlayer(data);
      } catch(_) {}
    }
  }

  sessionStorage.setItem('ch_uid',   uid);
  sessionStorage.setItem('ch_role',  data.role);
  sessionStorage.setItem('ch_name',  data.name);
  sessionStorage.setItem('ch_email', data.email || email);

  // SQL mirror
  try {
    await _sqlReady;
    sqlUpsertUser({ uid, name: data.name, email, role: data.role, sport: data.sport, teamCode: data.teamCode });
    sqlLogAuth(uid, email, 'password', 'login');
  } catch(e) {}

  return data;
}

// ── BIOMETRIC LOGIN helper ─────────────────────────────────
export async function loginWithBiometricResult(uid, userData) {
  sessionStorage.setItem('ch_uid',   uid);
  sessionStorage.setItem('ch_role',  userData.role);
  sessionStorage.setItem('ch_name',  userData.name);
  sessionStorage.setItem('ch_email', userData.email || '');

  try {
    await _sqlReady;
    sqlLogAuth(uid, userData.email || '', 'biometric', 'login');
  } catch(e) {}
}

// ── DEMO LOGIN helper (Instant access for viva/presentations)
export function demoLogin(role) {
  const names = {
    coach:   'Zaheer Khan (CSK Coach)',
    manager: 'Kasi Viswanathan (CSK Manager)',
    player:  'MS Dhoni (CSK #07)'
  };
  const uid   = `demo_${role}_001`;
  const name  = names[role] || `${role.toUpperCase()} User`;
  const email = `${role}@chennaisuperkings.com`;

  sessionStorage.setItem('ch_demo',  'true');
  sessionStorage.setItem('ch_uid',   uid);
  sessionStorage.setItem('ch_role',  role);
  sessionStorage.setItem('ch_name',  name);
  sessionStorage.setItem('ch_email', email);
  sessionStorage.setItem('ch_sport', 'Cricket');
  sessionStorage.setItem('ch_team',  'CSK2026');

  try {
    _sqlReady.then(() => {
      sqlUpsertUser({ uid, name, email, role, sport: 'Cricket', teamCode: 'CSK2026' });
      sqlLogAuth(uid, email, 'demo', 'login');
    });
  } catch(e) {}

  redirectToDashboard(role);
}

// ── LOGOUT ────────────────────────────────────────────────
export async function logoutUser() {
  const uid    = sessionStorage.getItem('ch_uid');
  const email  = sessionStorage.getItem('ch_email') || '';
  const isDemo = sessionStorage.getItem('ch_demo') === 'true';

  try {
    await Promise.race([_sqlReady, new Promise(r => setTimeout(r, 350))]);
    if (uid) sqlLogAuth(uid, email, isDemo ? 'demo' : 'session', 'logout');
  } catch(e) {}

  try { await signOut(auth); } catch(e) {}
  sessionStorage.clear();
  window.location.href = 'index.html';
}

// ── LINKED 3-ACCOUNT CSK 2026 PERSONAS ──────────────────────
export const LINKED_GOOGLE_ACCOUNTS = {
  'dharanidharan2006lakshmi@gmail.com': {
    role: 'coach',
    name: 'Zaheer Khan',
    sport: 'Cricket',
    teamCode: 'CSK2026',
    specialization: 'Head Coach — Chennai Super Kings',
    experience: '12',
    title: 'CSK Head Coach'
  },
  'firee4531@gmail.com': {
    role: 'manager',
    name: 'Kasi Viswanathan',
    sport: 'Cricket',
    teamCode: 'CSK2026',
    department: 'Chennai Super Kings Management',
    title: 'CSK Team Manager'
  },
  'dharanidharan.ec24@krct.ac.in': {
    role: 'player',
    name: 'MS Dhoni',
    sport: 'Cricket',
    teamCode: 'CSK2026',
    position: 'Wicket-Keeper / Finisher',
    jerseyNumber: '07',
    runs: 5439, wickets: 0, goals: 5439, assists: 0,
    matchesPlayed: 278, fitnessScore: 94, status: 'Active'
  }
};

const STALE_PERSONA_RE = /^(ram|dharani|d\s*tech|dharanidharan(\s*a)?|stephen fleming|sports user|demo user|user)$/i;

export function resolveLinkedCskProfile(emailRaw, uid, displayName, existingData = {}) {
  const emailLower = String(emailRaw || existingData?.email || '').trim().toLowerCase();
  const preset = LINKED_GOOGLE_ACCOUNTS[emailLower];
  if (!preset) return null;

  const cleanExisting = { ...(existingData || {}) };
  const existingName = String(cleanExisting.name || '').trim();
  const needsCskMigration = !existingName
    || STALE_PERSONA_RE.test(existingName)
    || cleanExisting.teamCode !== 'CSK2026'
    || (preset.role === 'player' && existingName.toLowerCase() !== 'ms dhoni');

  const profile = needsCskMigration
    ? { ...cleanExisting, ...preset }
    : { ...preset, ...cleanExisting };

  profile.uid = uid;
  profile.email = emailRaw || cleanExisting.email || emailLower;
  profile.role = preset.role;
  profile.sport = 'Cricket';
  profile.teamCode = 'CSK2026';
  profile.name = (needsCskMigration ? preset.name : (existingName || preset.name)) || displayName;
  delete profile._legacyId;
  return { profile, migrated: needsCskMigration };
}

// ── AUTH GUARD — call on every protected page ──────────────
export function requireAuth(allowedRoles = []) {
  return new Promise((resolve, reject) => {
    // Check if running in demo session
    if (sessionStorage.getItem('ch_demo') === 'true') {
      const role = sessionStorage.getItem('ch_role') || (allowedRoles[0] || 'manager');
      if (allowedRoles.length && !allowedRoles.includes(role)) {
        redirectToDashboard(role);
        return reject('Wrong role');
      }
      const data = {
        uid: sessionStorage.getItem('ch_uid') || `demo_${role}_001`,
        name: sessionStorage.getItem('ch_name') || 'Demo User',
        email: sessionStorage.getItem('ch_email') || `${role}@chennaisuperkings.com`,
        role: role,
        sport: sessionStorage.getItem('ch_sport') || 'Cricket',
        teamCode: 'CSK2026',
        runs: 250, wickets: 5, goals: 250, assists: 5,
        matchesPlayed: 15, fitnessScore: 94, status: 'Active',
        position: 'All-Rounder', jerseyNumber: '07'
      };
      return resolve(data);
    }

    // Firebase Auth State
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Fallback: check if session has logged in user info
        const storedRole = sessionStorage.getItem('ch_role');
        const storedUid  = sessionStorage.getItem('ch_uid');
        if (storedRole && storedUid) {
          return resolve({
            uid: storedUid,
            name: sessionStorage.getItem('ch_name') || 'Sports User',
            email: sessionStorage.getItem('ch_email') || '',
            role: storedRole,
            sport: sessionStorage.getItem('ch_sport') || 'Cricket',
            teamCode: 'CSK2026'
          });
        }
        window.location.href = 'index.html';
        return reject('Not logged in');
      }

      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        let data;
        if (!snap.exists()) {
          data = {
            uid: user.uid,
            name: user.displayName || (user.email ? user.email.split('@')[0] : 'Sports User'),
            email: user.email || '',
            role: allowedRoles[0] || 'player',
            sport: 'Cricket',
            teamCode: 'CSK2026'
          };
        } else {
          data = snap.data();
        }

        const linked = resolveLinkedCskProfile(user.email || data.email, user.uid, user.displayName, data);
        if (linked) {
          data = linked.profile;
          if (linked.migrated) {
            try {
              await setDoc(doc(db, 'users', user.uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
              await setDoc(doc(db, data.role + 's', user.uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
              if (data.role === 'player') sqlUpsertPlayer(data);
            } catch (_) {}
          }
        }

        if (allowedRoles.length && !allowedRoles.includes(data.role)) {
          redirectToDashboard(data.role);
          return reject('Wrong role');
        }

        sessionStorage.setItem('ch_uid',   user.uid);
        sessionStorage.setItem('ch_role',  data.role);
        sessionStorage.setItem('ch_name',  data.name);
        sessionStorage.setItem('ch_email', data.email || '');

        // SQL mirror
        try {
          await _sqlReady;
          sqlUpsertUser({
            uid: user.uid, name: data.name, email: data.email,
            role: data.role, sport: data.sport, teamCode: data.teamCode
          });
        } catch(e) {}

        resolve(data);
      } catch (err) {
        console.warn('Profile fetch error, using basic user info:', err);
        const basic = {
          uid: user.uid,
          name: user.displayName || (user.email ? user.email.split('@')[0] : 'Sports User'),
          email: user.email || '',
          role: sessionStorage.getItem('ch_role') || (allowedRoles[0] || 'manager'),
          sport: 'Cricket',
          teamCode: 'CSK2026'
        };
        const linked = resolveLinkedCskProfile(user.email, user.uid, user.displayName, basic);
        resolve(linked ? linked.profile : basic);
      }
    });
  });
}

// ── REDIRECT helper ────────────────────────────────────────
export function redirectToDashboard(role) {
  const map = {
    coach:   'dashboard-coach.html',
    player:  'dashboard-player.html',
    manager: 'dashboard-manager.html'
  };
  window.location.href = map[role] || 'index.html';
}
