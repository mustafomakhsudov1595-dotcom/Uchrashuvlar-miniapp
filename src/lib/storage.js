import { newId } from './meetings.js';
import { isTelegram, initData } from './telegram.js';

// Ma'lumotlar telefon/brauzer xotirasida (localStorage) saqlanadi.
// Keyinchalik server yoki Telegram CloudStorage'ga o'tish uchun faqat shu fayl o'zgaradi.
const KEY = 'uchrashuvlar:v1';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function clean(m) {
  if (!m || typeof m !== 'object') return null;
  if (typeof m.id !== 'string' || typeof m.name !== 'string') return null;
  if (!DATE_RE.test(m.date) || !TIME_RE.test(m.time)) return null;
  return {
    id: m.id,
    name: m.name,
    date: m.date,
    time: m.time,
    location: typeof m.location === 'string' ? m.location : '',
    phone: typeof m.phone === 'string' ? m.phone : '',
    lat: Number.isFinite(Number(m.lat)) && m.lat !== null && m.lat !== '' ? Number(m.lat) : null,
    lon: Number.isFinite(Number(m.lon)) && m.lon !== null && m.lon !== '' ? Number(m.lon) : null,
    cat: ['work', 'family', 'personal', 'other'].includes(m.cat) ? m.cat : '',
    status: m.status === 'done' || m.status === 'cancelled' ? m.status : '',
    from: typeof m.from === 'string' ? m.from : '',
    src: typeof m.src === 'string' ? m.src : '',
    guests: Number(m.guests) || 0,
    notes: typeof m.notes === 'string' ? m.notes : '',
    checklist: Array.isArray(m.checklist)
      ? m.checklist
          .filter((i) => i && typeof i.text === 'string')
          .map((i) => ({ id: String(i.id ?? newId()), text: i.text, done: Boolean(i.done) }))
      : [],
    createdAt: Number(m.createdAt) || Date.now(),
    updatedAt: Number(m.updatedAt) || 0,
  };
}

export function loadMeetings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.map(clean).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function saveMeetings(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

// ---- Loyihalar ----
const PKEY = 'uchrashuvlar:projects:v1';
const PDEL_KEY = 'uchrashuvlar:pdeleted';
const PTYPES = ['site', 'bot', 'video', 'other'];
const PSTATUS = ['new', 'work', 'review', 'done', 'paused'];

export function cleanProject(p) {
  if (!p || typeof p !== 'object' || typeof p.id !== 'string' || typeof p.name !== 'string') return null;
  if (!DATE_RE.test(p.date)) return null;
  const n = (v) => (v === null || v === '' || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
  return {
    id: p.id,
    name: p.name,
    client: typeof p.client === 'string' ? p.client : '',
    contact: typeof p.contact === 'string' ? p.contact : '',
    type: PTYPES.includes(p.type) ? p.type : 'other',
    status: PSTATUS.includes(p.status) ? p.status : 'new',
    date: p.date,
    time: TIME_RE.test(p.time) ? p.time : '18:00',
    price: n(p.price),
    paid: n(p.paid),
    notes: typeof p.notes === 'string' ? p.notes : '',
    tasks: Array.isArray(p.tasks)
      ? p.tasks.filter((t) => t && typeof t.text === 'string').map((t) => ({ id: String(t.id ?? newId()), text: t.text, done: Boolean(t.done), due: DATE_RE.test(t.due) ? t.due : '' }))
      : [],
    createdAt: Number(p.createdAt) || Date.now(),
    updatedAt: Number(p.updatedAt) || 0,
  };
}
export function loadProjects() {
  try {
    const d = JSON.parse(localStorage.getItem(PKEY) || '[]');
    return Array.isArray(d) ? d.map(cleanProject).filter(Boolean) : [];
  } catch {
    return [];
  }
}
export function saveProjects(list) {
  try {
    localStorage.setItem(PKEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
export function loadPDeleted() {
  try {
    const d = JSON.parse(localStorage.getItem(PDEL_KEY) || '[]');
    return Array.isArray(d) ? d.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
export const savePDeleted = (ids) => {
  try {
    localStorage.setItem(PDEL_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
};
export const projSignature = (list) =>
  JSON.stringify(list.map((p) => [p.id, p.updatedAt, p.name, p.status, p.date, p.time, p.price, p.paid, p.tasks.map((t) => [t.id, t.done, t.text, t.due])]).sort((a, b) => (a[0] < b[0] ? -1 : 1)));

// ---- Server bilan sinxronlash (faqat Telegram ichida) ----
// Uchrashuvlar serverda ham saqlanadi: shu sabab bot buyruqlari va eslatmalar ishlaydi,
// telefon va kompyuterdagi ma'lumotlar bir xil bo'ladi.
const DEL_KEY = 'uchrashuvlar:deleted';

export function loadDeleted() {
  try {
    const d = JSON.parse(localStorage.getItem(DEL_KEY) || '[]');
    return Array.isArray(d) ? d.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveDeleted(ids) {
  try {
    localStorage.setItem(DEL_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export const signature = (list) =>
  JSON.stringify(
    list
      .map((m) => [m.id, m.updatedAt, m.name, m.date, m.time, m.location, m.notes, m.phone, m.cat, m.status, m.lat, m.lon, m.checklist.map((i) => [i.id, i.text, i.done])])
      .sort((a, b) => (a[0] < b[0] ? -1 : 1)),
  );

const PLACES_KEY = 'uchrashuvlar:places';
export function loadPlaces() {
  try {
    const d = JSON.parse(localStorage.getItem(PLACES_KEY) || '{}');
    return { list: Array.isArray(d.list) ? d.list.filter((x) => typeof x === 'string') : [], at: Number(d.at) || 0 };
  } catch {
    return { list: [], at: 0 };
  }
}
export function savePlaces(list, at) {
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify({ list, at }));
  } catch {
    /* ignore */
  }
}

const headers = () => ({ 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData });

// Serverga yuboradi, birlashtirilgan natijani qaytaradi: { meetings, lang, places, placesAt }
export async function syncRemote({ meetings, deleted, lang, places, placesAt, projects, pdeleted }) {
  if (!isTelegram) return null;
  const res = await fetch('/api/meetings', {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ meetings, deleted, lang, places, placesAt, projects, pdeleted, tz: -new Date().getTimezoneOffset() }),
  });
  if (!res.ok) throw new Error(`sync ${res.status}`);
  const data = await res.json();
  return {
    meetings: Array.isArray(data.meetings) ? data.meetings.map(clean).filter(Boolean) : [],
    projects: Array.isArray(data.projects) ? data.projects.map(cleanProject).filter(Boolean) : [],
    lang: data.lang,
    places: Array.isArray(data.places) ? data.places : [],
    placesAt: Number(data.placesAt) || 0,
  };
}

// Taklif havolasi yaratadi (uchrashuv serverda bo'lishi kerak)
export async function createInvite(id) {
  const res = await fetch('/api/meetings', { method: 'PUT', headers: headers(), body: JSON.stringify({ action: 'invite', id }) });
  if (!res.ok) throw new Error(`invite ${res.status}`);
  return res.json();
}

// Kalendar obuna havolasi uchun maxfiy kalit (server yaratadi)
export async function getCalendarToken() {
  const res = await fetch('/api/meetings', { method: 'PUT', headers: headers(), body: JSON.stringify({ action: 'cal' }) });
  if (!res.ok) throw new Error(`cal ${res.status}`);
  return (await res.json()).token;
}
