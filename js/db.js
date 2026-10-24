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

// ── DEFAULT SEED DATA (from DBMS Academic Project Specifications) ──
export const SEED_PLAYERS = [
  { id: 'p_01', uid: 'p_01', name: 'Dhanush K', email: 'dhanush@sportsms.edu', sport: 'Football', teamCode: 'STORM2026', position: 'Forward', jerseyNumber: '10', goals: 18, assists: 9, matchesPlayed: 22, fitnessScore: 94, status: 'Active' },
  { id: 'p_02', uid: 'p_02', name: 'Dharanidharan A', email: 'dharani@sportsms.edu', sport: 'Football', teamCode: 'STORM2026', position: 'Midfielder', jerseyNumber: '7', goals: 12, assists: 15, matchesPlayed: 24, fitnessScore: 96, status: 'Active' },
  { id: 'p_03', uid: 'p_03', name: 'Dharsan B V', email: 'dharsan@sportsms.edu', sport: 'Basketball', teamCode: 'STORM2026', position: 'Point Guard', jerseyNumber: '23', goals: 25, assists: 14, matchesPlayed: 20, fitnessScore: 91, status: 'Active' },
  { id: 'p_04', uid: 'p_04', name: 'Arun Kumar', email: 'arun@sportsms.edu', sport: 'Football', teamCode: 'STORM2026', position: 'Defender', jerseyNumber: '4', goals: 3, assists: 7, matchesPlayed: 19, fitnessScore: 88, status: 'Active' },
  { id: 'p_05', uid: 'p_05', name: 'Vigneshwaran S', email: 'vignesh@sportsms.edu', sport: 'Cricket', teamCode: 'STORM2026', position: 'All-Rounder', jerseyNumber: '18', goals: 15, assists: 11, matchesPlayed: 17, fitnessScore: 90, status: 'Active' },
  { id: 'p_06', uid: 'p_06', name: 'Praveen Raj', email: 'praveen@sportsms.edu', sport: 'Athletics', teamCode: 'STORM2026', position: 'Sprinter', jerseyNumber: '1', goals: 8, assists: 2, matchesPlayed: 14, fitnessScore: 98, status: 'Active' },
  { id: 'p_07', uid: 'p_07', name: 'Rohit Sharma', email: 'rohit@sportsms.edu', sport: 'Cricket', teamCode: 'STORM2026', position: 'Batsman', jerseyNumber: '45', goals: 22, assists: 10, matchesPlayed: 25, fitnessScore: 89, status: 'Active' },
  { id: 'p_08', uid: 'p_08', name: 'Santhosh M', email: 'santhosh@sportsms.edu', sport: 'Kabaddi', teamCode: 'STORM2026', position: 'Raider', jerseyNumber: '9', goals: 19, assists: 4, matchesPlayed: 16, fitnessScore: 92, status: 'Injured' }
];

export const SEED_COACHES = [
  { id: 'c_01', uid: 'c_01', name: 'Mrs. K. Karpoora Sundari', email: 'karpoora@krct.ac.in', specialization: 'Head Coach & Athletics', experience: '10 Years', sport: 'Football', teamCode: 'STORM2026' },
  { id: 'c_02', uid: 'c_02', name: 'Coach Anand V', email: 'anand@sportsms.edu', specialization: 'Tactical Offense', experience: '8 Years', sport: 'Basketball', teamCode: 'STORM2026' },
  { id: 'c_03', uid: 'c_03', name: 'Coach Rajesh K', email: 'rajesh@sportsms.edu', specialization: 'Fitness & Conditioning', experience: '6 Years', sport: 'Cricket', teamCode: 'STORM2026' }
];

export const SEED_MATCHES = [
  { id: 'm_01', title: 'State Championship Semi-Final', opponent: 'Anna University Tigers', date: '2026-11-05', time: '15:30', venue: 'KRCT Sports Arena', result: 'Upcoming' },
  { id: 'm_02', title: 'Regional League Match', opponent: 'NIT Trichy Hawks', date: '2026-10-28', time: '14:00', venue: 'City Stadium', result: 'Won 3-1' },
  { id: 'm_03', title: 'Inter-College Derby', opponent: 'PSG Tech Lions', date: '2026-10-15', time: '16:00', venue: 'PSG Ground', result: 'Won 2-0' },
  { id: 'm_04', title: 'Autumn Invitational', opponent: 'SASTRA Warriors', date: '2026-10-02', time: '10:00', venue: 'KRCT Sports Arena', result: 'Draw 1-1' },
  { id: 'm_05', title: 'South Zone Trophy', opponent: 'SRM Gladiators', date: '2026-09-18', time: '15:00', venue: 'SRM Complex', result: 'Won 4-2' }
];

export const SEED_ANNOUNCEMENTS = [
  { id: 'a_01', title: 'State Championship Briefing', text: 'Mandatory technical briefing on Monday 4 PM at the Sports Complex Seminar Hall. All registered squad members must attend.', author: 'Mrs. K. Karpoora Sundari', createdAt: new Date(Date.now() - 3600000 * 4) },
  { id: 'a_02', title: 'Morning Fitness Schedule Change', text: 'Conditioning sessions shifted to 6:30 AM due to scheduled turf irrigation and maintenance.', author: 'Coach Rajesh K', createdAt: new Date(Date.now() - 3600000 * 28) },
  { id: 'a_03', title: 'Sports Nutrition & Recovery Camp', text: 'Special workshop with certified physiotherapist this Saturday at 10 AM. Fitness evaluations will be conducted.', author: 'Dharanidharan A', createdAt: new Date(Date.now() - 3600000 * 72) }
];

export const SEED_TRAINING = [
  { id: 't_01', title: 'Cardio & Stamina Building', duration: '60 mins', intensity: 'High', sport: 'Football', schedule: 'Mon, Wed, Fri', notes: 'High-intensity interval sprints and recovery laps.' },
  { id: 't_02', title: 'Tactical Passing & Set Pieces', duration: '45 mins', intensity: 'Medium', sport: 'Football', schedule: 'Tue, Thu', notes: 'Corner kick execution, defensive wall alignment, and quick transitions.' },
  { id: 't_03', title: 'Strength & Core Conditioning', duration: '50 mins', intensity: 'High', sport: 'All Sports', schedule: 'Saturday', notes: 'Core stability, resistance band workouts, and agility ladder drills.' }
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
  return SEED_PLAYERS.find(p => p.uid === uid) || SEED_PLAYERS[0];
};

export const getAllPlayers = async () => {
  try {
    const snap = await getDocs(collection(db, 'players'));
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

export async function updatePlayer(uid, data) {
  try {
    const update = { ...data, updatedAt: serverTimestamp() };
    await updateDoc(doc(db, 'players', uid), update);
    await updateDoc(doc(db, 'users',   uid), update);
  } catch(e) {}
  try {
    sqlUpsertPlayer({ uid, ...data });
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
    if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

// ── LEADERBOARD ───────────────────────────────────────────
export const getLeaderboard = async () => {
  const players = await getAllPlayers();
  return players
    .filter(p => (p.matchesPlayed || p.matches || 0) > 0)
    .sort((a, b) => ((b.goals || 0) + (b.assists || 0)) - ((a.goals || 0) + (a.assists || 0)));
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
    { id: 'att_01', title: 'Tactical Practice Session', date: '2026-10-22', presentCount: 18, totalCount: 20, sport: 'Football' },
    { id: 'att_02', title: 'Strength & Core Conditioning', date: '2026-10-20', presentCount: 17, totalCount: 20, sport: 'All Sports' },
    { id: 'att_03', title: 'Match Simulation Drills', date: '2026-10-18', presentCount: 19, totalCount: 20, sport: 'Football' }
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
