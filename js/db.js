// ============================================================
//  db.js — Firestore CRUD helpers with SQLite mirror & Offline Fallbacks
//  Provides robust seed data matching the DBMS project documentation
// ============================================================
import { db } from './firebase-config.js';
import {
  collection, doc, getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initSQL, sqlUpsertUser, sqlUpsertPlayer, sqlUpsertMatch }
  from './sql-layer.js';

// Ensure SQL is ready (no-op if already initialised)
initSQL().catch(e => console.warn('[SQL] init skipped:', e.message));

// ── OFFICIAL CHENNAI SUPER KINGS (CSK) IPL 2026 SQUAD (11 PLAYING XI + 4 SUBSTITUTES = 15 PLAYERS) ──
const LEGACY_PLACEHOLDER_IDS = [
  'cric_p02', 'cric_p03', 'cric_p04', 'cric_p05', 'cric_p06',
  'cric_p07', 'cric_p08', 'cric_p09', 'cric_p10', 'cric_p11',
  'cric_sub01', 'cric_sub02', 'cric_sub03', 'cric_sub04'
];

export const CRICKET_SQUAD_TEMPLATES = [
  // 11 Playing XI (Active)
  { id: 'csk_01', uid: 'csk_01', name: 'Ruturaj Gaikwad',  email: 'ruturaj@chennaisuperkings.com', sport: 'Cricket', teamCode: 'CSK2026', position: 'Captain / Opening Batsman',     jerseyNumber: '31', runs: 2839, wickets: 0,  goals: 2839, assists: 0,  matchesPlayed: 85,  fitnessScore: 97, status: 'Active' },
  { id: 'csk_02', uid: 'csk_02', name: 'Ayush Mhatre',     email: 'ayush@chennaisuperkings.com',   sport: 'Cricket', teamCode: 'CSK2026', position: 'Opening Batsman',               jerseyNumber: '19', runs: 441,  wickets: 0,  goals: 441,  assists: 0,  matchesPlayed: 13,  fitnessScore: 93, status: 'Active' },
  { id: 'csk_03', uid: 'csk_03', name: 'Sanju Samson',     email: 'sanju@chennaisuperkings.com',   sport: 'Cricket', teamCode: 'CSK2026', position: 'Wicket-Keeper / Top-Order',     jerseyNumber: '11', runs: 5181, wickets: 0,  goals: 5181, assists: 0,  matchesPlayed: 191, fitnessScore: 95, status: 'Active' },
  { id: 'csk_04', uid: 'csk_04', name: 'Shivam Dube',      email: 'dube@chennaisuperkings.com',    sport: 'Cricket', teamCode: 'CSK2026', position: 'Middle-Order All-Rounder',      jerseyNumber: '25', runs: 2129, wickets: 6,  goals: 2129, assists: 6,  matchesPlayed: 92,  fitnessScore: 92, status: 'Active' },
  { id: 'csk_05', uid: 'csk_05', name: 'Dewald Brevis',    email: 'brevis@chennaisuperkings.com',  sport: 'Cricket', teamCode: 'CSK2026', position: 'Explosive Middle-Order Batter', jerseyNumber: '12', runs: 606,  wickets: 1,  goals: 606,  assists: 1,  matchesPlayed: 27,  fitnessScore: 94, status: 'Active' },
  { id: 'csk_06', uid: 'csk_06', name: 'MS Dhoni',         email: 'dhoni@chennaisuperkings.com',   sport: 'Cricket', teamCode: 'CSK2026', position: 'Wicket-Keeper / Finisher',      jerseyNumber: '07', runs: 5439, wickets: 0,  goals: 5439, assists: 0,  matchesPlayed: 278, fitnessScore: 94, status: 'Active' },
  { id: 'csk_07', uid: 'csk_07', name: 'Jamie Overton',    email: 'overton@chennaisuperkings.com', sport: 'Cricket', teamCode: 'CSK2026', position: 'Pace All-Rounder',              jerseyNumber: '08', runs: 151,  wickets: 14, goals: 151,  assists: 14, matchesPlayed: 13,  fitnessScore: 91, status: 'Active' },
  { id: 'csk_08', uid: 'csk_08', name: 'Anshul Kamboj',    email: 'kamboj@chennaisuperkings.com',  sport: 'Cricket', teamCode: 'CSK2026', position: 'Pace All-Rounder',              jerseyNumber: '35', runs: 74,   wickets: 31, goals: 74,   assists: 31, matchesPlayed: 25,  fitnessScore: 93, status: 'Active' },
  { id: 'csk_09', uid: 'csk_09', name: 'Noor Ahmad',       email: 'noor@chennaisuperkings.com',    sport: 'Cricket', teamCode: 'CSK2026', position: 'Left-Arm Wrist Spinner',        jerseyNumber: '15', runs: 31,   wickets: 61, goals: 31,   assists: 61, matchesPlayed: 51,  fitnessScore: 95, status: 'Active' },
  { id: 'csk_10', uid: 'csk_10', name: 'Khaleel Ahmed',    email: 'khaleel@chennaisuperkings.com', sport: 'Cricket', teamCode: 'CSK2026', position: 'Left-Arm Fast Bowler',          jerseyNumber: '71', runs: 2,    wickets: 91, goals: 2,    assists: 91, matchesPlayed: 76,  fitnessScore: 92, status: 'Active' },
  { id: 'csk_11', uid: 'csk_11', name: 'Nathan Ellis',     email: 'ellis@chennaisuperkings.com',   sport: 'Cricket', teamCode: 'CSK2026', position: 'Fast Bowler (Death Overs)',     jerseyNumber: '72', runs: 19,   wickets: 19, goals: 19,   assists: 19, matchesPlayed: 17,  fitnessScore: 94, status: 'Active' },
  // 4 Substitutes / Impact Bench (Official 15-Member CSK IPL 2026 Squad: 11 Playing XI + 4 Substitutes)
  { id: 'csk_12', uid: 'csk_12', name: 'Sarfaraz Khan',    email: 'sarfaraz@chennaisuperkings.com',sport: 'Cricket', teamCode: 'CSK2026', position: 'Substitute Middle-Order Batter', jerseyNumber: '97', runs: 746,  wickets: 0,  goals: 746,  assists: 0,  matchesPlayed: 60,  fitnessScore: 89, status: 'Substitute' },
  { id: 'csk_13', uid: 'csk_13', name: 'Urvil Patel',      email: 'urvil@chennaisuperkings.com',   sport: 'Cricket', teamCode: 'CSK2026', position: 'Substitute Wicket-Keeper',       jerseyNumber: '27', runs: 197,  wickets: 0,  goals: 197,  assists: 0,  matchesPlayed: 10,  fitnessScore: 91, status: 'Substitute' },
  { id: 'csk_14', uid: 'csk_14', name: 'Rahul Chahar',     email: 'chahar@chennaisuperkings.com',  sport: 'Cricket', teamCode: 'CSK2026', position: 'Substitute Leg-Spinner',         jerseyNumber: '17', runs: 129,  wickets: 75, goals: 129,  assists: 75, matchesPlayed: 80,  fitnessScore: 90, status: 'Substitute' },
  { id: 'csk_15', uid: 'csk_15', name: 'Mukesh Choudhary', email: 'mukesh@chennaisuperkings.com',  sport: 'Cricket', teamCode: 'CSK2026', position: 'Substitute Left-Arm Pacer',      jerseyNumber: '90', runs: 8,    wickets: 25, goals: 8,    assists: 25, matchesPlayed: 24,  fitnessScore: 91, status: 'Substitute' }
];

// ── DEFAULT SEED DATA (Official CSK 2026 15-Member Squad) ──
export const SEED_PLAYERS = [
  ...CRICKET_SQUAD_TEMPLATES
];

export const SEED_COACHES = [
  { id: 'c_01', uid: 'c_01', name: 'Zaheer Khan',     email: 'zaheer@chennaisuperkings.com',  specialization: 'Head Coach', experience: '12 Years', sport: 'Cricket', teamCode: 'CSK2026' },
  { id: 'c_02', uid: 'c_02', name: 'Michael Hussey',  email: 'hussey@chennaisuperkings.com',  specialization: 'Batting Coach', experience: '8 Years', sport: 'Cricket', teamCode: 'CSK2026' },
  { id: 'c_03', uid: 'c_03', name: 'Eric Simons',     email: 'simons@chennaisuperkings.com',  specialization: 'Bowling Consultant', experience: '10 Years', sport: 'Cricket', teamCode: 'CSK2026' }
];

export const SEED_MATCHES = [
  { id: 'm_01', title: 'IPL 2026 El Clasico', opponent: 'Mumbai Indians (MI)', date: '2026-11-15', time: '19:30', venue: 'M. A. Chidambaram Stadium, Chepauk', sport: 'Cricket', type: 'IPL League', status: 'upcoming', result: 'Upcoming' },
  { id: 'm_02', title: 'Southern Derby', opponent: 'Royal Challengers Bengaluru (RCB)', date: '2026-10-28', time: '19:30', venue: 'M. A. Chidambaram Stadium, Chepauk', sport: 'Cricket', type: 'IPL League', status: 'completed', scoreUs: 198, scoreThem: 176, result: 'Won by 22 runs' },
  { id: 'm_03', title: 'Chepauk Fortress Match', opponent: 'Kolkata Knight Riders (KKR)', date: '2026-10-18', time: '19:30', venue: 'M. A. Chidambaram Stadium, Chepauk', sport: 'Cricket', type: 'IPL League', status: 'completed', scoreUs: 184, scoreThem: 181, result: 'Won by 3 runs' },
  { id: 'm_04', title: 'Away Encounter', opponent: 'Rajasthan Royals (RR)', date: '2026-10-10', time: '15:30', venue: 'Sawai Mansingh Stadium, Jaipur', sport: 'Cricket', type: 'IPL League', status: 'completed', scoreUs: 172, scoreThem: 175, result: 'Lost by 3 wickets' },
  { id: 'm_05', title: 'Sunrisers Clash', opponent: 'Sunrisers Hyderabad (SRH)', date: '2026-10-02', time: '19:30', venue: 'M. A. Chidambaram Stadium, Chepauk', sport: 'Cricket', type: 'IPL League', status: 'completed', scoreUs: 214, scoreThem: 189, result: 'Won by 25 runs' }
];

export const SEED_ANNOUNCEMENTS = [
  { id: 'a_01', title: 'CSK Pre-Match Tactical Briefing (vs MI)', text: 'Mandatory team meeting at 5:00 PM at Chepauk Dressing Room. Spin combinations and death-over plans will be finalized.', author: 'Zaheer Khan', createdAt: new Date(Date.now() - 3600000 * 4) },
  { id: 'a_02', title: 'Chepauk Net Session Timing', text: 'Floodlight net practice shifted to 6:30 PM today. All Playing XI batters and impact substitutes must report on time.', author: 'Ruturaj Gaikwad', createdAt: new Date(Date.now() - 3600000 * 28) },
  { id: 'a_03', title: 'Recovery & Ice-Bath Protocol', text: 'Mandatory recovery session with the CSK physio unit tomorrow morning at 9:30 AM for fast bowlers.', author: 'Team Management', createdAt: new Date(Date.now() - 3600000 * 72) }
];

export const SEED_TRAINING = [
  { id: 't_01', title: 'Powerplay & Death-Over Six Hitting', duration: '75 mins', intensity: 'High', sport: 'Cricket', schedule: 'Mon, Wed, Fri', notes: 'Range hitting drills vs pace and spin for Gaikwad, Samson, Dube, Brevis & Dhoni.' },
  { id: 't_02', title: 'Yorker & Slower-Ball Execution', duration: '60 mins', intensity: 'High', sport: 'Cricket', schedule: 'Tue, Thu', notes: 'Death-over target bowling under lights with Nathan Ellis, Khaleel Ahmed, Kamboj & Mukesh.' },
  { id: 't_03', title: 'Chepauk Spin & Fielding Drills', duration: '50 mins', intensity: 'Medium', sport: 'Cricket', schedule: 'Saturday', notes: 'Turn & bounce bowling plans for Noor Ahmad & Rahul Chahar plus high-catch reflex work.' }
];

// Helper to seed SQLite database with initial records
function _seedSQLite() {
  try {
    SEED_PLAYERS.forEach(p => sqlUpsertPlayer(p));
    SEED_MATCHES.forEach(m => sqlUpsertMatch(m.id, m));
    SEED_COACHES.forEach(c => sqlUpsertUser({ uid: c.uid, name: c.name, email: c.email, role: 'coach', sport: c.sport, teamCode: c.teamCode }));
  } catch(e) {}
}
setTimeout(_seedSQLite, 1000);

// ── USERS ──────────────────────────────────────────────────
export const getUser = async (uid) => {
  try {
    const s = await getDoc(doc(db, 'users', uid));
    if (s.exists()) return s.data();
  } catch(e) {}
  const found = SEED_PLAYERS.find(p => p.uid === uid) || SEED_COACHES.find(c => c.uid === uid);
  return found || null;
};

export async function updateUser(uid, data) {
  try {
    await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
  } catch(e) {}
  try {
    sqlUpsertUser({ uid, ...data });
  } catch(e) {}
}

// ── PLAYERS ───────────────────────────────────────────────
export const getPlayer = async (uid) => {
  try {
    const s = await getDoc(doc(db, 'players', uid));
    if (s.exists()) return s.data();
  } catch(e) {}
  return SEED_PLAYERS.find(p => p.uid === uid) || null;
};

function _dedupeByNamePreferLive(list, templatePrefix) {
  const byName = new Map();
  for (const item of list) {
    const key = String(item.name || item.id || '').trim().toLowerCase();
    const prev = byName.get(key);
    const isTemplate = String(item.id || '').startsWith(templatePrefix);
    if (!prev || (String(prev.id || '').startsWith(templatePrefix) && !isTemplate)) {
      byName.set(key, item);
    }
  }
  return [...byName.values()];
}

export const getAllPlayers = async () => {
  try {
    const snap = await getDocs(collection(db, 'players'));
    if (!snap.empty) {
      const raw = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => String(p.name || '').trim().toLowerCase() !== 'ram');
      const list = _dedupeByNamePreferLive(raw, 'csk_');
      list.forEach(p => { try { sqlUpsertPlayer(p); } catch(e) {} });
      return list;
    }
  } catch(e) {
    console.warn('[db.js] getAllPlayers using seed data fallback:', e.message);
  }
  return [...SEED_PLAYERS];
};

export const getPlayersByTeam = async (teamCode) => {
  try {
    const q = query(collection(db, 'players'), where('teamCode', '==', teamCode));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {}
  return SEED_PLAYERS.filter(p => !teamCode || p.teamCode === teamCode);
};

export function getStatusBadgeClass(status = 'Active') {
  if (status === 'Active') return 'badge-green';
  if (status === 'Substitute') return 'badge-blue';
  if (status === 'Injured' || status === 'Suspended') return 'badge-red';
  return 'badge-orange';
}

export async function addPlayerRecord(data) {
  const newId = data.id || ('cric_' + Date.now());
  const record = {
    id: newId,
    uid: newId,
    sport: 'Cricket',
    teamCode: 'CSK2026',
    status: 'Active',
    ...data
  };
  try {
    await setDoc(doc(db, 'players', newId), { ...record, createdAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn('[db.js] Firestore addPlayer fallback:', e.message);
  }
  const existing = SEED_PLAYERS.find(p => p.id === newId);
  if (!existing) SEED_PLAYERS.push(record);
  try { sqlUpsertPlayer(record); } catch (e) {}
  return record;
}

export async function ensureCricketSquad(existingPlayers = []) {
  const hasCsk = existingPlayers.some(p => String(p.id || '').startsWith('csk_'));
  const hasLegacyPlaceholder = existingPlayers.some(p =>
    LEGACY_PLACEHOLDER_IDS.includes(p.id) || String(p.name || '').trim().toLowerCase() === 'ram'
  );
  if (hasCsk && !hasLegacyPlaceholder && localStorage.getItem('ch_csk_squad_2026_v3') === '1') {
    return false;
  }

  let changed = false;
  let rawPlayers = existingPlayers;
  try {
    const rawSnap = await getDocs(collection(db, 'players'));
    if (!rawSnap.empty) rawPlayers = rawSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {}

  const hasLiveDhoni = rawPlayers.some(p =>
    !String(p.id || '').startsWith('csk_') && String(p.name || '').trim().toLowerCase() === 'ms dhoni'
  );

  // Remove old random placeholder docs, stale 'ram' entries, and duplicate csk_06 if live Dhoni doc exists
  for (const p of rawPlayers) {
    const isRam = String(p.name || '').trim().toLowerCase() === 'ram';
    const isDupDhoni = hasLiveDhoni && p.id === 'csk_06';
    if (LEGACY_PLACEHOLDER_IDS.includes(p.id) || isRam || isDupDhoni) {
      try {
        await deleteDoc(doc(db, 'players', p.id));
        changed = true;
      } catch (e) {}
    }
  }

  const remainingIds = new Set(
    rawPlayers
      .filter(p => !LEGACY_PLACEHOLDER_IDS.includes(p.id) && String(p.name || '').trim().toLowerCase() !== 'ram')
      .map(p => p.id || p.uid)
  );
  const missingCsk = CRICKET_SQUAD_TEMPLATES.filter(p =>
    !remainingIds.has(p.id) && !(hasLiveDhoni && p.id === 'csk_06')
  );

  let wroteToFirestore = false;
  for (const p of missingCsk) {
    try {
      await setDoc(doc(db, 'players', p.id), { ...p, createdAt: serverTimestamp() }, { merge: true });
      wroteToFirestore = true;
      changed = true;
    } catch (e) {
      if (!SEED_PLAYERS.some(sp => sp.id === p.id)) SEED_PLAYERS.push(p);
    }
    try { sqlUpsertPlayer(p); } catch (e) {}
  }

  if (wroteToFirestore || changed || hasCsk) {
    localStorage.setItem('ch_csk_squad_2026_v3', '1');
  }
  return changed;
}

export async function updatePlayer(uid, data) {
  try {
    const update = { ...data, updatedAt: serverTimestamp() };
    await setDoc(doc(db, 'players', uid), update, { merge: true });
    try { await updateDoc(doc(db, 'users', uid), update); } catch(_) {}
  } catch(e) {}
  const sp = SEED_PLAYERS.find(p => p.uid === uid || p.id === uid);
  if (sp) Object.assign(sp, data);
  try {
    sqlUpsertPlayer({ uid, ...(sp || {}), ...data });
  } catch(e) {}
}

export const deletePlayer = async (uid) => {
  try {
    await deleteDoc(doc(db, 'players', uid));
  } catch(e) {}
  const idx = SEED_PLAYERS.findIndex(p => p.uid === uid || p.id === uid);
  if (idx !== -1) SEED_PLAYERS.splice(idx, 1);
};

// ── COACHES ───────────────────────────────────────────────
export const getAllCoaches = async () => {
  try {
    const snap = await getDocs(collection(db, 'coaches'));
    if (!snap.empty) {
      const liveCoaches = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => !/^(ram|dharani|stephen fleming)$/i.test(String(c.name || '').trim()));
      return _dedupeByNamePreferLive([...SEED_COACHES, ...liveCoaches], 'c_');
    }
  } catch(e) {}
  return [...SEED_COACHES];
};

// ── MATCHES ───────────────────────────────────────────────
export const getAllMatches = async () => {
  try {
    const q = query(collection(db, 'matches'), orderBy('date', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.forEach(m => { try { sqlUpsertMatch(m.id, m); } catch(e) {} });
      return list;
    }
  } catch(e) {
    console.warn('[db.js] getAllMatches using seed data fallback:', e.message);
  }
  return [...SEED_MATCHES];
};

export async function addMatch(data) {
  try {
    const ref = await addDoc(collection(db, 'matches'), { ...data, createdAt: serverTimestamp() });
    sqlUpsertMatch(ref.id, data);
    return ref;
  } catch(e) {
    const newId = 'm_' + Date.now();
    const newMatch = { id: newId, ...data };
    SEED_MATCHES.push(newMatch);
    sqlUpsertMatch(newId, data);
    return { id: newId };
  }
}

export async function updateMatch(id, data) {
  try {
    await updateDoc(doc(db, 'matches', id), { ...data, updatedAt: serverTimestamp() });
  } catch(e) {}
  try {
    sqlUpsertMatch(id, data);
  } catch(e) {}
  const match = SEED_MATCHES.find(m => m.id === id);
  if (match) Object.assign(match, data);
}

export const deleteMatch = async (id) => {
  try {
    await deleteDoc(doc(db, 'matches', id));
  } catch(e) {}
  const idx = SEED_MATCHES.findIndex(m => m.id === id);
  if (idx !== -1) SEED_MATCHES.splice(idx, 1);
};

// ── ANNOUNCEMENTS ─────────────────────────────────────────
export const getAnnouncements = async () => {
  try {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {}
  return [...SEED_ANNOUNCEMENTS];
};

export const addAnnouncement = async (data) => {
  try {
    return await addDoc(collection(db, 'announcements'), { ...data, createdAt: serverTimestamp() });
  } catch(e) {
    const newAnn = { id: 'a_' + Date.now(), ...data, createdAt: new Date() };
    SEED_ANNOUNCEMENTS.unshift(newAnn);
    return { id: newAnn.id };
  }
};

export const deleteAnnouncement = async (id) => {
  try {
    await deleteDoc(doc(db, 'announcements', id));
  } catch(e) {}
  const idx = SEED_ANNOUNCEMENTS.findIndex(a => a.id === id);
  if (idx !== -1) SEED_ANNOUNCEMENTS.splice(idx, 1);
};

// ── TRAINING PLANS ────────────────────────────────────────
export const getTrainingPlans = async () => {
  try {
    const q = query(collection(db, 'training'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {}
  return [...SEED_TRAINING];
};

export const addTrainingPlan = async (data) => {
  try {
    return await addDoc(collection(db, 'training'), { ...data, createdAt: serverTimestamp() });
  } catch(e) {
    const newPlan = { id: 't_' + Date.now(), ...data };
    SEED_TRAINING.unshift(newPlan);
    return { id: newPlan.id };
  }
};

export const deleteTrainingPlan = async (id) => {
  try {
    await deleteDoc(doc(db, 'training', id));
  } catch(e) {}
  const idx = SEED_TRAINING.findIndex(t => t.id === id);
  if (idx !== -1) SEED_TRAINING.splice(idx, 1);
};

// ── SPORT-AWARE STAT HELPERS ──────────────────────────────
export function getSportStatLabels(sport = '') {
  const s = String(sport).trim().toLowerCase();
  if (s === 'cricket') {
    return {
      isCricket: true,
      primaryLabel: 'Runs',
      secondaryLabel: 'Wickets',
      primaryScoredLabel: 'Runs Scored',
      secondaryTakenLabel: 'Wickets Taken',
      primaryShort: 'Runs',
      secondaryShort: 'Wkts',
      primaryIcon: '🏏',
      secondaryIcon: '🎯',
      posPlaceholder: 'Batsman / Bowler / All-Rounder'
    };
  }
  if (s === 'basketball') {
    return {
      isCricket: false,
      primaryLabel: 'Points',
      secondaryLabel: 'Assists',
      primaryScoredLabel: 'Points Scored',
      secondaryTakenLabel: 'Assists',
      primaryShort: 'Pts',
      secondaryShort: 'Ast',
      primaryIcon: '🏀',
      secondaryIcon: '🤝',
      posPlaceholder: 'Point Guard / Forward'
    };
  }
  return {
    isCricket: false,
    primaryLabel: 'Goals',
    secondaryLabel: 'Assists',
    primaryScoredLabel: 'Goals Scored',
    secondaryTakenLabel: 'Assists',
    primaryShort: 'Goals',
    secondaryShort: 'Ast',
    primaryIcon: '⚽',
    secondaryIcon: '🤝',
    posPlaceholder: 'Forward / Midfielder'
  };
}

export function getPlayerPrimaryStat(p) {
  if (!p) return 0;
  if (String(p.sport || '').trim().toLowerCase() === 'cricket') {
    return Number(p.runs ?? p.goals ?? 0);
  }
  return Number(p.goals ?? 0);
}

export function getPlayerSecondaryStat(p) {
  if (!p) return 0;
  if (String(p.sport || '').trim().toLowerCase() === 'cricket') {
    return Number(p.wickets ?? p.assists ?? 0);
  }
  return Number(p.assists ?? 0);
}

export function getPlayerImpactScore(p) {
  const pri = getPlayerPrimaryStat(p);
  const sec = getPlayerSecondaryStat(p);
  if (String(p?.sport || '').trim().toLowerCase() === 'cricket') {
    return pri + (sec * 20);
  }
  return pri + sec;
}

export function getTableStatHeaders(list = []) {
  if (!list.length) return { primary: 'Runs / Goals', secondary: 'Wickets / Assists', singleSport: false };
  const sports = [...new Set(list.map(p => String(p.sport || '').trim().toLowerCase()).filter(Boolean))];
  if (sports.length === 1) {
    const m = getSportStatLabels(sports[0]);
    return { primary: m.primaryLabel, secondary: m.secondaryLabel, singleSport: true, meta: m };
  }
  return { primary: 'Goals / Runs', secondary: 'Assists / Wkts', singleSport: false };
}

export function getPlayerBadges(p) {
  const badges = [];
  const pri = getPlayerPrimaryStat(p);
  const sec = getPlayerSecondaryStat(p);
  const isCricket = String(p?.sport || '').trim().toLowerCase() === 'cricket';

  if (isCricket) {
    if (pri >= 500) badges.push({ id: 'runs500', icon: '🏏', label: '500+ Runs', desc: 'Score 500 runs', color: 'var(--gold)' });
    else if (pri >= 100) badges.push({ id: 'runs100', icon: '💯', label: '100+ Runs', desc: 'Score 100 runs', color: 'var(--cyan)' });
    else if (pri >= 50) badges.push({ id: 'runs50', icon: '🏏', label: '50+ Runs', desc: 'Score a half-century', color: 'var(--cyan)' });
    if (sec >= 5) badges.push({ id: 'wkts5', icon: '🎯', label: '5+ Wickets', desc: 'Take 5 wickets', color: 'var(--green)' });
  } else {
    if (pri >= 20) badges.push({ id: 'goals20', icon: '🔥', label: '20 Goals', desc: 'Score 20 goals', color: 'var(--red)' });
    else if (pri >= 10) badges.push({ id: 'goals10', icon: '⚽', label: '10 Goals', desc: 'Score 10 goals', color: 'var(--gold)' });
    else if (pri >= 5) badges.push({ id: 'goals5', icon: '🎯', label: '5 Goals', desc: 'Score 5 goals', color: 'var(--cyan)' });
    if (sec >= 5) badges.push({ id: 'assists5', icon: '🤝', label: '5 Assists', desc: 'Make 5 assists', color: 'var(--green)' });
  }

  if ((p.matchesPlayed || 0) >= 10) badges.push({ id: 'matches10', icon: '🏃', label: '10+ Matches', desc: 'Play 10 matches', color: 'var(--blue)' });
  if ((p.fitnessScore || 0) >= 90) badges.push({ id: 'fitness90', icon: '💪', label: 'Peak Fitness', desc: 'Reach 90% fitness score', color: '#e040fb' });
  if (p.status === 'Active' && pri > 0 && (p.matchesPlayed || 0) > 0) {
    badges.push({ id: 'star', icon: '⭐', label: 'Active Star', desc: 'Active key performer', color: 'var(--gold)' });
  }
  return badges;
}

// ── LEADERBOARD ───────────────────────────────────────────
export const getLeaderboard = async () => {
  const players = await getAllPlayers();
  return players
    .filter(p => (p.matchesPlayed || p.matches || 0) > 0)
    .sort((a, b) => getPlayerImpactScore(b) - getPlayerImpactScore(a));
};

// ── UTIL: Format Date Helpers ─────────────────────────────
export const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = (ts && ts.toDate) ? ts.toDate() : new Date(ts);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
};

export const fmtDateTime = (ts) => {
  if (!ts) return '—';
  const d = (ts && ts.toDate) ? ts.toDate() : new Date(ts);
  return isNaN(d) ? '—' : d.toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
};

// ── ATTENDANCE ────────────────────────────────────────────
export const addAttendanceSession = async (data) => {
  try {
    return await addDoc(collection(db, 'attendance'), { ...data, createdAt: serverTimestamp() });
  } catch(e) {
    return { id: 'att_' + Date.now() };
  }
};

export const getAttendanceSessions = async () => {
  try {
    const q = query(collection(db, 'attendance'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {}
  return [
    { id: 'att_01', title: 'Chepauk Tactical Practice Session', date: '2026-10-22', presentCount: 14, totalCount: 15, sport: 'Cricket' },
    { id: 'att_02', title: 'Strength & Core Conditioning', date: '2026-10-20', presentCount: 15, totalCount: 15, sport: 'Cricket' },
    { id: 'att_03', title: 'Death-Over & Net Simulation Drills', date: '2026-10-18', presentCount: 14, totalCount: 15, sport: 'Cricket' }
  ];
};

export const deleteAttendanceSession = async (id) => {
  try {
    await deleteDoc(doc(db, 'attendance', id));
  } catch(e) {}
};

// ── CHAT ─────────────────────────────────────────────────
export const sendChatMessage = async (data) => {
  try {
    return await addDoc(collection(db, 'chat'), { ...data, ts: serverTimestamp() });
  } catch(e) {
    return { id: 'chat_' + Date.now() };
  }
};

export const getChatMessages = async (limitN = 60) => {
  try {
    const q = query(collection(db, 'chat'), orderBy('ts', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {}
  return [
    { sender: 'Mrs. K. Karpoora Sundari', role: 'coach', text: 'Team, please report by 6:30 AM tomorrow for warm-ups.', time: '06:00 PM' },
    { sender: 'Dhanush K', role: 'player', text: 'Understood Coach! All forwards are ready.', time: '06:05 PM' },
    { sender: 'Dharanidharan A', role: 'manager', text: 'New kit and energy drinks have arrived at the equipment room.', time: '06:12 PM' }
  ];
};

// ── PROGRESS SNAPSHOTS (for Chart) ───────────────────────
export const saveProgressSnapshot = async (uid, data) => {
  try {
    return await addDoc(collection(db, 'progress'), { uid, ...data, ts: serverTimestamp() });
  } catch(e) {
    return { id: 'prog_' + Date.now() };
  }
};

export const getProgressSnapshots = async (uid) => {
  try {
    const q = query(collection(db, 'progress'), where('uid', '==', uid), orderBy('ts', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {}
  return [
    { match: 'Match 1', goals: 1, assists: 0, fitness: 88 },
    { match: 'Match 2', goals: 2, assists: 1, fitness: 90 },
    { match: 'Match 3', goals: 2, assists: 2, fitness: 92 },
    { match: 'Match 4', goals: 3, assists: 1, fitness: 94 },
    { match: 'Match 5', goals: 4, assists: 2, fitness: 95 }
  ];
};
