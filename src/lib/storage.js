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
const SKEY = 'uchrashuvlar:subs:v1';
const SDEL_KEY = 'uchrashuvlar:sdeleted';
const EKEY = 'uchrashuvlar:expenses:v1';
const EDEL_KEY = 'uchrashuvlar:edeleted';
const GOAL_KEY = 'uchrashuvlar:goal';
const SVKEY = 'uchrashuvlar:services:v1';
const PVKEY = 'uchrashuvlar:payables:v1';
const PVDEL_KEY = 'uchrashuvlar:pvdeleted';
const SVDEL_KEY = 'uchrashuvlar:svdeleted';
export const EXCATS = ['ads', 'team', 'host', 'tools', 'other'];
const YM_RE = /^\d{4}-\d{2}$/;
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
    url: typeof p.url === 'string' ? p.url.trim().slice(0, 200) : '',
    domExp: DATE_RE.test(p.domExp) ? p.domExp : '',
    mon: p.mon && typeof p.mon === 'object' ? { ok: Boolean(p.mon.ok), code: p.mon.code ?? '', at: Number(p.mon.at) || 0 } : undefined,
    pays: Array.isArray(p.pays) ? p.pays.filter((x) => x && Number(x.a) > 0 && DATE_RE.test(x.d)).slice(-40).map((x) => ({ a: Math.round(Number(x.a)), d: x.d })) : [],
    tasks: Array.isArray(p.tasks)
      ? p.tasks.filter((t) => t && typeof t.text === 'string').map((t) => ({ id: String(t.id ?? newId()), text: t.text, done: Boolean(t.done), due: DATE_RE.test(t.due) ? t.due : '' }))
      : [],
    createdAt: Number(p.createdAt) || Date.now(),
    updatedAt: Number(p.updatedAt) || 0,
  };
}
// ---- Toʻlash kerak (majburiyatlar) ----
export function cleanPayable(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || typeof x.who !== 'string' || !x.who.trim() || !DATE_RE.test(x.due)) return null;
  const amount = Number(x.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const pays = Array.isArray(x.pays) ? x.pays.filter((y) => y && Number(y.a) > 0 && DATE_RE.test(y.d)).slice(-60).map((y) => ({ id: String(y.id ?? newId()), a: Math.round(Number(y.a)), d: y.d })) : [];
  return {
    id: x.id,
    who: x.who.trim(),
    note: typeof x.note === 'string' ? x.note.trim() : '',
    amount: Math.round(amount),
    due: x.due,
    paid: Math.min(Math.round(amount), pays.reduce((n, y) => n + y.a, 0)),
    pays,
    cat: EXCATS.includes(x.cat) ? x.cat : 'other',
    repeat: x.repeat === 'month' ? 'month' : '',
    ...(Number(x.cn) >= 2 && Number(x.cn) <= 120 ? { cn: Math.round(Number(x.cn)), ci: Number(x.ci) >= 1 && Number(x.ci) <= Number(x.cn) ? Math.round(Number(x.ci)) : 1 } : { cn: 0, ci: 0 }),
    nextId: typeof x.nextId === 'string' ? x.nextId : '',
    pid: typeof x.pid === 'string' ? x.pid : '',
    createdAt: Number(x.createdAt) || Date.now(),
    updatedAt: Number(x.updatedAt) || 0,
  };
}
export function loadPayables() {
  try {
    const d = JSON.parse(localStorage.getItem(PVKEY) || '[]');
    return Array.isArray(d) ? d.map(cleanPayable).filter(Boolean) : [];
  } catch {
    return [];
  }
}
export function savePayables(list) {
  try {
    localStorage.setItem(PVKEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
export function loadPvDeleted() {
  try {
    const d = JSON.parse(localStorage.getItem(PVDEL_KEY) || '[]');
    return Array.isArray(d) ? d.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
export const savePvDeleted = (ids) => {
  try {
    localStorage.setItem(PVDEL_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
};
export const payablesSignature = (list) => JSON.stringify(list.map((x) => [x.id, x.updatedAt, x.who, x.note, x.amount, x.due, x.paid, x.repeat, x.cn, x.ci, x.cat, x.pid, x.pays.length]).sort((a, b) => (a[0] < b[0] ? -1 : 1)));

// ---- Servis: tayyor saytlar ----
export function cleanService(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || typeof x.name !== 'string' || !x.name.trim() || !DATE_RE.test(x.doneAt)) return null;
  return {
    id: x.id,
    name: x.name.trim(),
    client: typeof x.client === 'string' ? x.client.trim() : '',
    phone: typeof x.phone === 'string' ? x.phone.trim() : '',
    url: typeof x.url === 'string' ? x.url.trim() : '',
    claudeUrl: typeof x.claudeUrl === 'string' ? x.claudeUrl.trim() : '',
    doneAt: x.doneAt,
    months: Math.min(60, Math.max(1, Math.round(Number(x.months) || 12))),
    notes: typeof x.notes === 'string' ? x.notes : '',
    requests: Array.isArray(x.requests) ? x.requests.filter((r) => r && typeof r.text === 'string' && r.text.trim() && DATE_RE.test(r.d)).slice(-50).map((r) => ({ id: String(r.id ?? newId()), d: r.d, text: r.text.trim(), done: Boolean(r.done) })) : [],
    changes: Array.isArray(x.changes) ? x.changes.filter((c) => c && typeof c.text === 'string' && c.text.trim() && DATE_RE.test(c.d)).slice(-200).map((c) => ({ id: String(c.id ?? newId()), d: c.d, text: c.text.trim(), rid: c.rid ? String(c.rid) : '' })) : [],
    cl: x.cl && typeof x.cl === 'object' ? { s: String(x.cl.s || 'ok'), at: Number(x.cl.at) || 0 } : undefined,
    seo: x.seo && typeof x.seo === 'object' ? { score: Number(x.seo.score) || 0, at: Number(x.seo.at) || 0, bad: Array.isArray(x.seo.bad) ? x.seo.bad : [] } : undefined,
    createdAt: Number(x.createdAt) || Date.now(),
    updatedAt: Number(x.updatedAt) || 0,
  };
}
export function loadServices() {
  try {
    const d = JSON.parse(localStorage.getItem(SVKEY) || '[]');
    return Array.isArray(d) ? d.map(cleanService).filter(Boolean) : [];
  } catch {
    return [];
  }
}
export function saveServices(list) {
  try {
    localStorage.setItem(SVKEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
export function loadSvDeleted() {
  try {
    const d = JSON.parse(localStorage.getItem(SVDEL_KEY) || '[]');
    return Array.isArray(d) ? d.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
export const saveSvDeleted = (ids) => {
  try {
    localStorage.setItem(SVDEL_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
};
export const servicesSignature = (list) => JSON.stringify(list.map((x) => [x.id, x.updatedAt, x.name, x.client, x.phone, x.url, x.claudeUrl, x.doneAt, x.months, x.notes, x.requests.map((r) => [r.id, r.done, r.text]), x.seo ? x.seo.at : 0, x.changes.map((c) => [c.id, c.text]), x.cl ? x.cl.at : 0]).sort((a, b) => (a[0] < b[0] ? -1 : 1)));

// ---- Xarajatlar va oylik maqsad ----
export function cleanExpense(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !DATE_RE.test(x.d)) return null;
  const a = Number(x.a);
  if (!Number.isFinite(a) || a <= 0) return null;
  return { id: x.id, a: Math.round(a), d: x.d, cat: EXCATS.includes(x.cat) ? x.cat : 'other', note: typeof x.note === 'string' ? x.note.trim() : '', pid: typeof x.pid === 'string' ? x.pid : '', src: typeof x.src === 'string' ? x.src : '', ref: typeof x.ref === 'string' ? x.ref : '', createdAt: Number(x.createdAt) || Date.now(), updatedAt: Number(x.updatedAt) || 0 };
}
export function loadExpenses() {
  try {
    const d = JSON.parse(localStorage.getItem(EKEY) || '[]');
    return Array.isArray(d) ? d.map(cleanExpense).filter(Boolean) : [];
  } catch {
    return [];
  }
}
export function saveExpenses(list) {
  try {
    localStorage.setItem(EKEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
export function loadEDeleted() {
  try {
    const d = JSON.parse(localStorage.getItem(EDEL_KEY) || '[]');
    return Array.isArray(d) ? d.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
export const saveEDeleted = (ids) => {
  try {
    localStorage.setItem(EDEL_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
};
export const expensesSignature = (list) => JSON.stringify(list.map((x) => [x.id, x.updatedAt, x.a, x.d, x.cat, x.note, x.pid]).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
export function loadGoal() {
  try {
    const d = JSON.parse(localStorage.getItem(GOAL_KEY) || '{}');
    return { goal: Number(d.goal) > 0 ? Number(d.goal) : 0, at: Number(d.at) || 0 };
  } catch {
    return { goal: 0, at: 0 };
  }
}
export function saveGoal(goal, at) {
  try {
    localStorage.setItem(GOAL_KEY, JSON.stringify({ goal, at }));
  } catch {
    /* ignore */
  }
}

// ---- Oylik toʻlovlar (obunalar) ----
export function cleanSub(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || typeof x.name !== 'string' || !x.name.trim()) return null;
  const amount = Number(x.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    id: x.id,
    name: x.name.trim(),
    client: typeof x.client === 'string' ? x.client.trim() : '',
    amount: Math.round(amount),
    day: Math.min(28, Math.max(1, Math.round(Number(x.day) || 1))),
    active: x.active !== false,
    last: YM_RE.test(x.last) ? x.last : '',
    pays: Array.isArray(x.pays) ? x.pays.filter((y) => y && Number(y.a) > 0 && DATE_RE.test(y.d)).slice(-60).map((y) => ({ a: Math.round(Number(y.a)), d: y.d })) : [],
    createdAt: Number(x.createdAt) || Date.now(),
    updatedAt: Number(x.updatedAt) || 0,
  };
}
export function loadSubs() {
  try {
    const d = JSON.parse(localStorage.getItem(SKEY) || '[]');
    return Array.isArray(d) ? d.map(cleanSub).filter(Boolean) : [];
  } catch {
    return [];
  }
}
export function saveSubs(list) {
  try {
    localStorage.setItem(SKEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
export function loadSDeleted() {
  try {
    const d = JSON.parse(localStorage.getItem(SDEL_KEY) || '[]');
    return Array.isArray(d) ? d.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
export const saveSDeleted = (ids) => {
  try {
    localStorage.setItem(SDEL_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
};
export const subsSignature = (list) => JSON.stringify(list.map((x) => [x.id, x.updatedAt, x.name, x.client, x.amount, x.day, x.active, x.last, (x.pays || []).length]).sort((a, b) => (a[0] < b[0] ? -1 : 1)));

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
  JSON.stringify(list.map((p) => [p.id, p.updatedAt, p.name, p.status, p.date, p.time, p.price, p.paid, (p.pays || []).length, p.url, p.domExp, p.mon ? [p.mon.ok, p.mon.at] : 0, p.tasks.map((t) => [t.id, t.done, t.text, t.due])]).sort((a, b) => (a[0] < b[0] ? -1 : 1)));

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
export async function syncRemote({ meetings, deleted, lang, places, placesAt, projects, pdeleted, subs, sdeleted, expenses, edeleted, services, svdeleted, payables, pvdeleted, goal, goalAt }) {
  if (!isTelegram) return null;
  const res = await fetch('/api/meetings', {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ meetings, deleted, lang, places, placesAt, projects, pdeleted, subs, sdeleted, expenses, edeleted, services, svdeleted, payables, pvdeleted, goal, goalAt, tz: -new Date().getTimezoneOffset() }),
  });
  if (!res.ok) throw new Error(`sync ${res.status}`);
  const data = await res.json();
  return {
    meetings: Array.isArray(data.meetings) ? data.meetings.map(clean).filter(Boolean) : [],
    projects: Array.isArray(data.projects) ? data.projects.map(cleanProject).filter(Boolean) : [],
    subs: Array.isArray(data.subs) ? data.subs.map(cleanSub).filter(Boolean) : [],
    expenses: Array.isArray(data.expenses) ? data.expenses.map(cleanExpense).filter(Boolean) : [],
    services: Array.isArray(data.services) ? data.services.map(cleanService).filter(Boolean) : [],
    payables: Array.isArray(data.payables) ? data.payables.map(cleanPayable).filter(Boolean) : [],
    goal: Number(data.goal) || 0,
    goalAt: Number(data.goalAt) || 0,
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

// Mijozga ochiq hisobot havolasi (loyiha serverda bo'lishi kerak)
export async function createReport(id) {
  const res = await fetch('/api/meetings', { method: 'PUT', headers: headers(), body: JSON.stringify({ action: 'report', id }) });
  if (!res.ok) throw new Error(`report ${res.status}`);
  return (await res.json()).link;
}

// Instagram lidlar (faqat admin; boshqalarga 403)
export async function fetchLeads() {
  const res = await fetch('/api/meetings', { method: 'PUT', headers: headers(), body: JSON.stringify({ action: 'leads' }) });
  if (!res.ok) throw new Error(`leads ${res.status}`);
  return (await res.json()).leads || [];
}

// Sayt SEO tekshiruvi va mijoz soʻrovi uchun Claude topshirigʻi (server bajaradi)
export async function runSeo(id) {
  const res = await fetch('/api/meetings', { method: 'PUT', headers: headers(), body: JSON.stringify({ action: 'seo', id }) });
  if (!res.ok) throw new Error(`seo ${res.status}`);
  return res.json();
}
export async function requestPrompt(id, rid) {
  const res = await fetch('/api/meetings', { method: 'PUT', headers: headers(), body: JSON.stringify({ action: 'sprompt', id, rid }) });
  if (!res.ok) throw new Error(`prompt ${res.status}`);
  return res.json();
}

// Mijozga tayyor xabar (server shablon va rekvizitni birlashtiradi)
export async function buildMessage(id, kind, lang) {
  const res = await fetch('/api/meetings', { method: 'PUT', headers: headers(), body: JSON.stringify({ action: 'tpl', id, kind, lang }) });
  if (!res.ok) throw new Error(`tpl ${res.status}`);
  return res.json();
}
export async function checkClaudeLink(id) {
  const res = await fetch('/api/meetings', { method: 'PUT', headers: headers(), body: JSON.stringify({ action: 'linkcheck', id }) });
  if (!res.ok) throw new Error(`linkcheck ${res.status}`);
  return res.json();
}

// Kalendar obuna havolasi uchun maxfiy kalit (server yaratadi)
export async function getCalendarToken() {
  const res = await fetch('/api/meetings', { method: 'PUT', headers: headers(), body: JSON.stringify({ action: 'cal' }) });
  if (!res.ok) throw new Error(`cal ${res.status}`);
  return (await res.json()).token;
}
