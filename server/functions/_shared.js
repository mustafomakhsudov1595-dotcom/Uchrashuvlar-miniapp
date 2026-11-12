'use strict';
const crypto = require('crypto');
const { openKV } = require('../kv');
const { getT, LANGS } = require('./i18n');

const TOKEN = () => process.env.BOT_TOKEN;
const SITE = () => (process.env.SITE_URL || 'https://impro-notes.uchrashuvlar-mini-app.workers.dev').replace(/\/$/, '');
const BOT_USER = () => process.env.BOT_USERNAME || 'Improitnotes_bot';
const DEFAULT_TZ = 300; // Toshkent, UTC+5 (daqiqada)
const GRACE_MIN = 60;
const CATS = ['work', 'family', 'personal', 'other'];
const CAT_DOT = { work: '🔵', family: '🟢', personal: '🟣', other: '🟠' };
const TZS = [[0, 'London'], [60, 'Berlin · Paris'], [120, 'Kyiv · Cairo'], [180, 'Moskva · Istanbul'], [240, 'Dubay · Boku'], [300, 'Toshkent · Tashkent'], [360, 'Olmaota · Bishkek'], [420, 'Bangkok'], [480, 'Pekin · Singapur'], [540, 'Tokio · Seul']];
const tzName = (tz) => { const f = TZS.find(([m]) => m === tz); const sign = tz >= 0 ? '+' : '−'; const a = Math.abs(tz); return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''}${f ? ` (${f[1]})` : ''}`; };

/* ---------- Telegram ---------- */
async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN()}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) console.error('telegram', method, j.description);
  return j;
}
// Telegram faylini yuklaydi: { bytes, path } yoki { error: 'big' | 'fail' }
async function tgFile(fileId, maxBytes = 5e6) {
  try {
    const f = await tg('getFile', { file_id: fileId });
    if (!f.ok || !f.result || !f.result.file_path) return { error: 'fail' };
    if (f.result.file_size && f.result.file_size > maxBytes) return { error: 'big' };
    const r = await fetch(`https://api.telegram.org/file/bot${TOKEN()}/${f.result.file_path}`);
    if (!r.ok) return { error: 'fail' };
    const bytes = new Uint8Array(await r.arrayBuffer());
    return bytes.length > maxBytes ? { error: 'big' } : { bytes, path: f.result.file_path };
  } catch { return { error: 'fail' }; }
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function checkInitData(initData, maxAgeSec = 7 * 86400) {
  if (!initData || !TOKEN()) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  if (!hash) return null;
  p.delete('hash');
  const str = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN()).digest();
  const calc = crypto.createHmac('sha256', secret).update(str).digest('hex');
  const a = Buffer.from(calc), b = Buffer.from(hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date') || 0) > maxAgeSec) return null;
  try { return JSON.parse(p.get('user') || 'null'); } catch { return null; }
}

/* ---------- saqlash (Cloudflare KV) ---------- */
const openStore = () => openKV();
const userKey = (id) => `user/${id}`;
const blankUser = (id) => ({
  id: String(id), lang: null, tz: DEFAULT_TZ, tzManual: false, remind: true, lead: 60,
  quiet: { on: false, from: '22:00', to: '07:00' }, digest: { m: null, e: null, p: null, b: '08:00', w: '19:00', k: '10:00' }, dsent: { m: '', e: '', p: '', b: '', w: '', k: '' },
  payInfo: '', meetings: [], deleted: {}, projects: [], pdeleted: {}, subs: [], sdeleted: {}, expenses: [], edeleted: {}, goal: 0, goalAt: 0, services: [], svdeleted: {}, payables: [], pvdeleted: {}, places: [], placesAt: 0, state: null,
});
async function getUser(st, id) {
  const u = await st.get(userKey(id), { type: 'json' });
  if (!u) return blankUser(id);
  const d = blankUser(id);
  return { ...d, ...u, projects: u.projects || [], pdeleted: u.pdeleted || {}, subs: u.subs || [], sdeleted: u.sdeleted || {}, expenses: u.expenses || [], edeleted: u.edeleted || {}, services: u.services || [], svdeleted: u.svdeleted || {}, payables: u.payables || [], pvdeleted: u.pvdeleted || {}, quiet: { ...d.quiet, ...(u.quiet || {}) }, digest: { ...d.digest, ...(u.digest || {}) }, dsent: { ...d.dsent, ...(u.dsent || {}) } };
}
const saveUser = (st, u) => st.setJSON(userKey(u.id), u);
const Tof = (u) => getT(u.lang);

/* ---------- sana va vaqt ---------- */
const pad = (n) => String(n).padStart(2, '0');
const localNow = (tz, now = Date.now()) => new Date(now + tz * 60000); // UTC getter'lar mahalliy vaqtni beradi
const isoOfLocal = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const hhmmOfLocal = (d) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
const todayISO = (tz, now) => isoOfLocal(localNow(tz, now));
const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDaysISO = (iso, n) => isoOfLocal(new Date(parseISO(iso).getTime() + n * 86400000));
const weekdayIdx = (iso) => (parseISO(iso).getUTCDay() + 6) % 7;
const fmtShort = (iso, T) => { const d = parseISO(iso); return T.short(d.getUTCDate(), d.getUTCMonth()); };
const fmtWd = (iso, T) => `${T.weekdays[weekdayIdx(iso)]}, ${fmtShort(iso, T)}`;
const dayLabel = (iso, today, T) => (iso === today ? T.today : iso === addDaysISO(today, 1) ? T.tomorrow : fmtWd(iso, T));
function startUTC(m, tz) {
  const [y, mo, d] = m.date.split('-').map(Number); const [h, mi] = m.time.split(':').map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) - tz * 60000;
}
function countdown(ms, now, T, tz = DEFAULT_TZ) {
  const diff = Math.ceil((ms - now) / 60000);
  if (diff <= 0) return T.started;
  if (diff < 60) return T.inMin(diff);
  if (diff < 1440) return T.inHM(Math.floor(diff / 60), diff % 60);
  const days = Math.round((parseISO(isoOfLocal(localNow(tz, ms))) - parseISO(isoOfLocal(localNow(tz, now)))) / 86400000);
  return days === 1 ? T.tomorrow : T.inDays(days);
}
const leadText = (min, T) => (min >= 1440 ? T.unitDay(min / 1440) : min >= 60 && min % 60 === 0 ? T.unitHour(min / 60) : T.unitMin(min));
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
function inQuiet(u, hhmm) {
  if (!u.quiet || !u.quiet.on) return false;
  const a = toMin(u.quiet.from), b = toMin(u.quiet.to), t = toMin(hhmm);
  return a <= b ? t >= a && t < b : t >= a || t < b;
}

/* ---------- uchrashuvlar ---------- */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, TIME_RE = /^\d{2}:\d{2}$/;
const newId = () => crypto.randomUUID();
const num = (v) => (Number.isFinite(Number(v)) && v !== '' && v !== null && v !== undefined ? Number(v) : null);
function cleanMeeting(m) {
  if (!m || typeof m !== 'object') return null;
  if (typeof m.id !== 'string' || m.id.length > 64 || typeof m.name !== 'string' || !m.name.trim()) return null;
  if (!DATE_RE.test(m.date) || !TIME_RE.test(m.time)) return null;
  const lat = num(m.lat), lon = num(m.lon);
  return {
    id: m.id, name: m.name.trim().slice(0, 120), date: m.date, time: m.time,
    location: typeof m.location === 'string' ? m.location.slice(0, 200) : '',
    phone: typeof m.phone === 'string' ? m.phone.slice(0, 30) : '',
    lat: lat !== null && Math.abs(lat) <= 90 ? lat : null, lon: lon !== null && Math.abs(lon) <= 180 ? lon : null,
    cat: CATS.includes(m.cat) ? m.cat : '',
    status: m.status === 'done' || m.status === 'cancelled' ? m.status : '',
    notes: typeof m.notes === 'string' ? m.notes.slice(0, 1000) : '',
    checklist: Array.isArray(m.checklist) ? m.checklist.filter((i) => i && typeof i.text === 'string').slice(0, 50).map((i) => ({ id: String(i.id || newId()).slice(0, 64), text: i.text.slice(0, 80), done: Boolean(i.done) })) : [],
    from: typeof m.from === 'string' ? m.from.slice(0, 80) : '',
    src: typeof m.src === 'string' ? m.src.slice(0, 80) : '',
    createdAt: Number(m.createdAt) || Date.now(),
    updatedAt: Number(m.updatedAt) || 0,
  };
}
const SERVER_ONLY = ['r', 'sn', 'g'];
const byStart = (tz) => (a, b) => startUTC(a, tz) - startUTC(b, tz);
const active = (m) => m.status !== 'cancelled';
function upcoming(u, now = Date.now()) {
  return u.meetings.filter((m) => active(m) && m.status !== 'done' && startUTC(m, u.tz) >= now - GRACE_MIN * 60000).sort(byStart(u.tz));
}

// Ikki tomonlama birlashtirish: telefon va bot bir vaqtda o'zgartirsa ham hech narsa yo'qolmaydi.
function mergeMeetings(u, clientList, clientDeleted) {
  const tomb = u.deleted || {};
  const now = Date.now();
  const byId = new Map(u.meetings.map((m) => [m.id, m]));
  for (const id of clientDeleted) { byId.delete(id); tomb[id] = now; }
  for (const raw of clientList) {
    const c = cleanMeeting(raw);
    if (!c || tomb[c.id]) continue;
    const s = byId.get(c.id);
    if (!s) { byId.set(c.id, c); continue; }
    if (c.updatedAt >= (s.updatedAt || 0)) {
      const keep = {};
      for (const k of SERVER_ONLY) if (s[k] !== undefined) keep[k] = s[k];
      if (s.date !== c.date || s.time !== c.time) { delete keep.r; delete keep.sn; }
      byId.set(c.id, { ...c, ...keep, from: c.from || s.from, src: c.src || s.src });
    }
  }
  for (const [id, t] of Object.entries(tomb)) if (now - t > 60 * 86400000) delete tomb[id];
  u.deleted = tomb;
  u.meetings = [...byId.values()];
  return u;
}

/* ---------- loyihalar ---------- */
const PTYPES = ['site', 'bot', 'video', 'other'];
const PSTATUS = ['new', 'work', 'review', 'done', 'paused'];
const PICON = { site: '🌐', bot: '🤖', video: '🎬', other: '📦' };
const SICON = { new: '🆕', work: '🛠', review: '🔎', done: '✅', paused: '⏸' };
const TEMPLATES = require('../../shared/templates.json');
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);

// Sayt manzili: faqat http(s), maxfiy/ichki manzillar yoʻq
function cleanUrl(v) {
  if (typeof v !== 'string') return '';
  let t = v.trim().slice(0, 200);
  if (!t) return '';
  if (!/^https?:\/\//i.test(t)) t = `https://${t}`;
  try {
    const u = new URL(t);
    const h = u.hostname.toLowerCase();
    if (!/^https?:$/.test(u.protocol) || !h.includes('.') || /^(localhost|.*\.local|.*\.internal)$/.test(h) || /^(\d{1,3}\.){3}\d{1,3}$/.test(h) || h.includes(':') || u.username || u.password) return '';
    return u.origin + (u.pathname === '/' ? '' : u.pathname);
  } catch { return ''; }
}
function cleanProject(p) {
  if (!p || typeof p !== 'object') return null;
  if (typeof p.id !== 'string' || p.id.length > 64 || typeof p.name !== 'string' || !p.name.trim()) return null;
  if (!DATE_RE.test(p.date)) return null;
  const price = num(p.price), paid = num(p.paid);
  return {
    id: p.id, name: p.name.trim().slice(0, 120), client: typeof p.client === 'string' ? p.client.trim().slice(0, 100) : '', contact: typeof p.contact === 'string' ? p.contact.slice(0, 60) : '',
    type: PTYPES.includes(p.type) ? p.type : 'other', status: PSTATUS.includes(p.status) ? p.status : 'new', date: p.date, time: TIME_RE.test(p.time) ? p.time : '18:00',
    price: price !== null && price >= 0 ? price : null, paid: paid !== null && paid >= 0 ? paid : null, notes: typeof p.notes === 'string' ? p.notes.slice(0, 1500) : '',
    pays: Array.isArray(p.pays) ? p.pays.filter((x) => x && Number(x.a) > 0 && DATE_RE.test(x.d)).slice(-40).map((x) => ({ a: Math.round(Number(x.a)), d: x.d })) : [],
    url: cleanUrl(p.url), domExp: DATE_RE.test(p.domExp) ? p.domExp : '', mon: p.mon && typeof p.mon === 'object' ? p.mon : undefined,
    tasks: Array.isArray(p.tasks) ? p.tasks.filter((t) => t && typeof t.text === 'string' && t.text.trim()).slice(0, 80).map((t) => ({ id: String(t.id || newId()).slice(0, 64), text: t.text.trim().slice(0, 120), done: Boolean(t.done), due: DATE_RE.test(t.due) ? t.due : '' })) : [],
    createdAt: Number(p.createdAt) || Date.now(), updatedAt: Number(p.updatedAt) || 0, r: p.r,
  };
}
// Shablon vazifalarni bugundan muddatgacha teng taqsimlaydi
function planTasks(type, lang, today, deadline) {
  const days = Math.max(0, daysBetween(today, deadline));
  return (TEMPLATES[type] || TEMPLATES.other).map((t) => ({ id: newId(), text: t.tx[lang] || t.tx.uz, done: false, due: days ? addDaysISO(today, Math.round(t.at * days)) : deadline }));
}
const projProgress = (p) => ({ done: p.tasks.filter((t) => t.done).length, total: p.tasks.length });
const barText = (done, total, len = 10) => { const f = total ? Math.round((done / total) * len) : 0; return '▓'.repeat(f) + '░'.repeat(len - f); };
function deadlineTag(p, today, T) {
  if (p.status === 'done') return T.p.doneTag;
  const d = daysBetween(today, p.date);
  return d < 0 ? T.p.overdue(-d) : d === 0 ? T.p.today : d === 1 ? T.p.tomorrow : T.p.left(d);
}
const owed = (p) => (p.price !== null && p.price !== undefined ? Math.max(0, p.price - (p.paid || 0)) : 0);
// Mijozga ochiq hisobot havolasi (narx koʻrsatilmaydi); /r/<kalit>
async function reportLink(st, u, pid, revoke = false) {
  const p = u.projects.find((x) => x.id === pid);
  if (!p) return null;
  u.reports = u.reports || {};
  if (revoke) { u.reports[pid] = null; return ''; }
  if (!u.reports[pid]) { u.reports[pid] = newId().replace(/-/g, '').slice(0, 20); await st.set(`rep/${u.reports[pid]}`, `${u.id}:${pid}`); }
  return `${SITE()}/r/${u.reports[pid]}`;
}
const money = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function projectText(p, u, now = Date.now()) {
  const T = Tof(u), today = todayISO(u.tz, now), { done, total } = projProgress(p), pc = total ? Math.round((done / total) * 100) : 0;
  let t = `${PICON[p.type]} <b>${esc(p.name)}</b>\n${SICON[p.status]} ${T.p.status[p.status]} · ${T.p.types[p.type]}`;
  if (p.client) t += `\n👤 ${T.p.lblClient}: <b>${esc(p.client)}</b>`;
  if (p.contact) t += `\n📞 ${esc(p.contact)}`;
  t += `\n📅 ${T.p.lblDeadline}: <b>${esc(fmtWd(p.date, T))}</b> · ${deadlineTag(p, today, T)}`;
  if (p.price !== null) t += `\n💰 ${T.p.lblPrice}: <b>${money(p.price)}</b>${p.paid !== null ? ` · ${T.p.lblPaid}: ${money(p.paid)}` : ''}`;
  if (owed(p) > 0) t += `\n🧾 ${T.p.lblOwed}: <b>${money(owed(p))}</b>`;
  else if (p.price !== null && p.price > 0 && owed(p) === 0) t += ` ✅`;
  const pe = projectExpense(u, p.id);
  if (pe > 0) t += `\n💸 ${T.p.lblExpense}: <b>${money(pe)}</b>${p.paid ? ` · ${T.p.lblProfit}: <b>${money((p.paid || 0) - pe)}</b>` : ''}`;
  if (p.url) t += `\n🔗 ${esc(p.url.replace(/^https?:\/\//, ''))}${p.mon && p.mon.at ? (p.mon.ok ? ' 🟢' : ' 🔴') : ''}`;
  if (total) t += `\n\n${barText(done, total)} <b>${done}/${total}</b> (${pc}%)`;
  if (p.notes) t += `\n📝 ${esc(p.notes)}`;
  return t;
}
const activeProjects = (u) => u.projects.filter((p) => p.status !== 'done').sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
function mergeProjects(u, clientList, clientDeleted) {
  const tomb = u.pdeleted || {}, now = Date.now();
  const byId = new Map(u.projects.map((p) => [p.id, p]));
  for (const id of clientDeleted) { byId.delete(id); tomb[id] = now; }
  for (const raw of clientList) {
    const c = cleanProject(raw);
    if (!c || tomb[c.id]) continue;
    const s = byId.get(c.id);
    if (!s) { byId.set(c.id, { ...c, r: undefined, mon: undefined }); continue; }
    if (c.updatedAt >= (s.updatedAt || 0)) byId.set(c.id, { ...c, r: s.date !== c.date ? undefined : s.r, mon: c.url === s.url ? s.mon : undefined });
  }
  for (const [id, t] of Object.entries(tomb)) if (now - t > 60 * 86400000) delete tomb[id];
  u.pdeleted = tomb; u.projects = [...byId.values()];
  return u;
}

/* ---------- oylik toʻlovlar (obunalar), mijozlar, daromad ---------- */
const YM_RE = /^\d{4}-\d{2}$/;
function cleanSub(s) {
  if (!s || typeof s !== 'object' || typeof s.id !== 'string' || s.id.length > 64 || typeof s.name !== 'string' || !s.name.trim()) return null;
  const amount = num(s.amount);
  if (amount === null || amount <= 0) return null;
  return {
    id: s.id, name: s.name.trim().slice(0, 80), client: typeof s.client === 'string' ? s.client.trim().slice(0, 100) : '', amount: Math.round(amount),
    day: Math.min(28, Math.max(1, Math.round(Number(s.day) || 1))), active: s.active !== false, last: YM_RE.test(s.last) ? s.last : '',
    pays: Array.isArray(s.pays) ? s.pays.filter((x) => x && Number(x.a) > 0 && DATE_RE.test(x.d)).slice(-60).map((x) => ({ a: Math.round(Number(x.a)), d: x.d })) : [],
    createdAt: Number(s.createdAt) || Date.now(), updatedAt: Number(s.updatedAt) || 0, r: s.r,
  };
}
function mergeSubs(u, clientList, clientDeleted) {
  const tomb = u.sdeleted || {}, now = Date.now();
  const byId = new Map(u.subs.map((x) => [x.id, x]));
  for (const id of clientDeleted) { byId.delete(id); tomb[id] = now; }
  for (const raw of clientList) {
    const c = cleanSub(raw);
    if (!c || tomb[c.id]) continue;
    const x = byId.get(c.id);
    if (!x) { byId.set(c.id, { ...c, r: undefined }); continue; }
    if (c.updatedAt >= (x.updatedAt || 0)) byId.set(c.id, { ...c, r: x.r });
  }
  for (const [id, t] of Object.entries(tomb)) if (now - t > 60 * 86400000) delete tomb[id];
  u.sdeleted = tomb; u.subs = [...byId.values()];
  return u;
}
const subDue = (x, today) => x.active && x.last !== today.slice(0, 7) && Number(today.slice(8, 10)) >= x.day;
const subsDue = (u, today) => u.subs.filter((x) => subDue(x, today)).sort((a, b) => a.day - b.day);
function paySub(x, today) {
  x.last = today.slice(0, 7); x.pays = [...(x.pays || []), { a: x.amount, d: today }].slice(-60); x.updatedAt = Date.now(); x.r = undefined;
}
const subsMonthly = (u) => u.subs.filter((x) => x.active).reduce((n, x) => n + x.amount, 0);

// barcha tushumlar: { d: sana, a: summa, k: tur }
function paymentsOf(u) {
  const out = [];
  for (const p of u.projects) {
    let sum = 0;
    for (const x of p.pays || []) { out.push({ d: x.d, a: x.a, k: p.type }); sum += x.a; }
    const rest = (p.paid || 0) - sum; // sanasiz eski toʻlov: oxirgi yangilanish oyiga yoziladi
    if (rest > 0) out.push({ d: isoOfLocal(localNow(u.tz, p.updatedAt || p.createdAt || Date.now())), a: rest, k: p.type });
  }
  for (const x of u.subs) for (const y of x.pays || []) out.push({ d: y.d, a: y.a, k: 'sub' });
  return out;
}
const prevYM = (ym, n) => { let [y, m] = ym.split('-').map(Number); m -= n; while (m < 1) { m += 12; y -= 1; } return `${y}-${pad(m)}`; };
function incomeByMonth(u, months, today) {
  const cur = today.slice(0, 7), list = [];
  for (let i = months - 1; i >= 0; i--) list.push({ m: prevYM(cur, i), total: 0, exp: 0, k: { site: 0, bot: 0, video: 0, other: 0, sub: 0 } });
  const idx = new Map(list.map((x) => [x.m, x]));
  for (const x of paymentsOf(u)) { const e = idx.get(x.d.slice(0, 7)); if (e) { e.total += x.a; e.k[x.k in e.k ? x.k : 'other'] += x.a; } }
  for (const x of u.expenses || []) { const e = idx.get(x.d.slice(0, 7)); if (e) e.exp += x.a; }
  return list;
}
function clientsOf(u) {
  const map = new Map();
  const get = (name) => { const key = name.trim().toLowerCase(); if (!map.has(key)) map.set(key, { key, name: name.trim(), contact: '', projects: [], subs: [], price: 0, paid: 0, owed: 0, monthly: 0, active: 0 }); return map.get(key); };
  for (const p of [...u.projects].sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0))) {
    if (!p.client) continue;
    const c = get(p.client);
    if (c.name === c.name.toLowerCase() && p.client !== p.client.toLowerCase()) c.name = p.client;
    if (p.contact) c.contact = p.contact;
    c.projects.push(p); c.price += p.price || 0; c.paid += p.paid || 0; c.owed += owed(p); if (p.status !== 'done') c.active += 1;
  }
  for (const x of u.subs) { if (!x.client) continue; const c = get(x.client); c.subs.push(x); if (x.active) c.monthly += x.amount; }
  return [...map.values()].sort((a, b) => b.owed - a.owed || b.paid - a.paid || (a.name < b.name ? -1 : 1));
}
const activeDebt = (u) => u.projects.reduce((n, p) => n + owed(p), 0);
const clientHash = (key) => { let h = 5381; for (const ch of key) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };

/* ---------- xarajatlar, sof foyda, oylik maqsad ---------- */
const EXCATS = ['ads', 'team', 'host', 'tools', 'other'];
function cleanExpense(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || x.id.length > 64 || !DATE_RE.test(x.d)) return null;
  const a = num(x.a);
  if (a === null || a <= 0) return null;
  return { id: x.id, a: Math.round(a), d: x.d, cat: EXCATS.includes(x.cat) ? x.cat : 'other', note: typeof x.note === 'string' ? x.note.trim().slice(0, 100) : '', pid: typeof x.pid === 'string' ? x.pid.slice(0, 64) : '', src: typeof x.src === 'string' ? x.src.slice(0, 64) : '', ref: typeof x.ref === 'string' ? x.ref.slice(0, 64) : '', createdAt: Number(x.createdAt) || Date.now(), updatedAt: Number(x.updatedAt) || 0 };
}
function mergeExpenses(u, clientList, clientDeleted) {
  const tomb = u.edeleted || {}, now = Date.now();
  const byId = new Map(u.expenses.map((x) => [x.id, x]));
  for (const id of clientDeleted) { byId.delete(id); tomb[id] = now; }
  for (const raw of clientList) {
    const c = cleanExpense(raw);
    if (!c || tomb[c.id]) continue;
    const x = byId.get(c.id);
    if (!x || c.updatedAt >= (x.updatedAt || 0)) byId.set(c.id, c);
  }
  for (const [id, t] of Object.entries(tomb)) if (now - t > 60 * 86400000) delete tomb[id];
  u.edeleted = tomb; u.expenses = [...byId.values()].sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 1500);
  return u;
}
const expensesIn = (u, from, to) => u.expenses.filter((x) => x.d >= from && x.d <= to);
const expenseSum = (list) => list.reduce((n, x) => n + x.a, 0);
const monthRange = (ym) => [`${ym}-01`, `${ym}-31`];
const incomeIn = (u, from, to) => paymentsOf(u).filter((x) => x.d >= from && x.d <= to).reduce((n, x) => n + x.a, 0);
const projectExpense = (u, pid) => expenseSum(u.expenses.filter((x) => x.pid === pid));
// Oylik maqsad: { goal, got, pct, left, days, debt }
function goalInfo(u, today) {
  const goal = Number(u.goal) || 0;
  if (goal <= 0) return null;
  const [f, t] = monthRange(today.slice(0, 7)), got = incomeIn(u, f, t);
  const [y, m] = today.split('-').map(Number), last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { goal, got, pct: Math.min(100, Math.round((got / goal) * 100)), left: Math.max(0, goal - got), days: last - Number(today.slice(8, 10)), debt: activeDebt(u) };
}

// Maqsad qatori (ertalabki karta, haftalik xulosa, daromad): '' agar maqsad yoʻq
function goalLine(u, today) {
  const i = goalInfo(u, today);
  if (!i) return '';
  const P = Tof(u).p;
  let t = P.goLine(i, money(i.got), money(i.goal), money(i.left));
  if (i.left === 0) t += `\n${P.goDone}`;
  else if (i.debt >= i.left) t += `\n${P.goHint(money(i.debt))}`;
  return t;
}
/* ---------- servis (tayyor saytlar, 1 yillik xizmat) ---------- */
const addMonthsISO = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number), t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(Math.min(d, last))}`;
};
function cleanService(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || x.id.length > 64 || typeof x.name !== 'string' || !x.name.trim() || !DATE_RE.test(x.doneAt)) return null;
  const months = Math.min(60, Math.max(1, Math.round(Number(x.months) || 12)));
  return {
    id: x.id, name: x.name.trim().slice(0, 120), client: typeof x.client === 'string' ? x.client.trim().slice(0, 100) : '', phone: typeof x.phone === 'string' ? x.phone.trim().slice(0, 30) : '',
    url: cleanUrl(x.url), claudeUrl: cleanUrl(x.claudeUrl), doneAt: x.doneAt, months, notes: typeof x.notes === 'string' ? x.notes.slice(0, 1000) : '',
    requests: Array.isArray(x.requests) ? x.requests.filter((r) => r && typeof r.text === 'string' && r.text.trim() && DATE_RE.test(r.d)).slice(-50).map((r) => ({ id: String(r.id || newId()).slice(0, 64), d: r.d, text: r.text.trim().slice(0, 200), done: Boolean(r.done) })) : [],
    changes: Array.isArray(x.changes) ? x.changes.filter((c) => c && typeof c.text === 'string' && c.text.trim() && DATE_RE.test(c.d)).slice(-200).map((c) => ({ id: String(c.id || newId()).slice(0, 64), d: c.d, text: c.text.trim().slice(0, 200), rid: c.rid ? String(c.rid).slice(0, 64) : '' })) : [],
    cl: x.cl && typeof x.cl === 'object' ? { s: ['ok', 'dead', 'error', 'format', 'missing'].includes(x.cl.s) ? x.cl.s : 'ok', at: Number(x.cl.at) || 0 } : undefined,
    seo: x.seo && typeof x.seo === 'object' ? { score: Math.round(Number(x.seo.score)) || 0, at: Number(x.seo.at) || 0, bad: Array.isArray(x.seo.bad) ? x.seo.bad.slice(0, 20).map((b) => ({ k: String(b.k).slice(0, 20), v: b.v ?? null })) : [] } : undefined,
    createdAt: Number(x.createdAt) || Date.now(), updatedAt: Number(x.updatedAt) || 0, r: x.r,
  };
}
function mergeServices(u, clientList, clientDeleted) {
  const tomb = u.svdeleted || {}, now = Date.now();
  const byId = new Map(u.services.map((x) => [x.id, x]));
  for (const id of clientDeleted) { byId.delete(id); tomb[id] = now; }
  for (const raw of clientList) {
    const c = cleanService(raw);
    if (!c || tomb[c.id]) continue;
    const x = byId.get(c.id);
    if (!x) { byId.set(c.id, { ...c, r: undefined }); continue; }
    if (c.updatedAt >= (x.updatedAt || 0)) byId.set(c.id, { ...c, seo: (x.seo && (!c.seo || x.seo.at >= c.seo.at)) ? x.seo : c.seo, cl: (x.cl && (!c.cl || x.cl.at >= c.cl.at)) ? x.cl : c.cl, r: c.doneAt === x.doneAt && c.months === x.months ? x.r : undefined });
  }
  for (const [id, t] of Object.entries(tomb)) if (now - t > 60 * 86400000) delete tomb[id];
  u.svdeleted = tomb; u.services = [...byId.values()];
  return u;
}
const serviceEnd = (x) => addMonthsISO(x.doneAt, x.months);
const serviceDays = (x, today) => daysBetween(today, serviceEnd(x));
const digitsOf = (v) => String(v || '').replace(/\D/g, '');
function findServices(u, q) {
  const low = String(q || '').trim().toLowerCase(), dg = digitsOf(q);
  if (!low) return [...u.services];
  return u.services.filter((x) => [x.name, x.client, x.url].some((v) => v.toLowerCase().includes(low)) || (dg.length >= 3 && digitsOf(x.phone).includes(dg)));
}

/* ---------- kirish: faqat jamoa ---------- */
const adminIds = () => String(process.env.ADMIN_IDS || '1120619241').split(/[\s,]+/).filter(Boolean);
const isAdmin = (id) => adminIds().includes(String(id));
// BOT_ACCESS: 'open' (standart — hamma kira oladi) yoki 'closed' (faqat admin va taklif qilinganlar)
const accessOpen = () => String(process.env.BOT_ACCESS || 'open').toLowerCase() !== 'closed';
// Ruxsat (yopiq rejimda): admin, taklif bilan qoʻshilgan, yoki oldin roʻyxatdan oʻtgan (lang tanlagan) foydalanuvchi. `blocked/` hammasidan ustun.
async function isAllowed(st, id) {
  const sid = String(id);
  if (isAdmin(sid)) return true;
  if (await st.get(`blocked/${sid}`)) return false;
  if (accessOpen()) return true;
  if (await st.get(`allow/${sid}`)) return true;
  const u = await st.get(userKey(sid), { type: 'json' });
  return Boolean(u && u.lang);
}

/* ---------- toʻlash kerak (majburiyatlar): kimga, qachon, qancha ---------- */
// Kredit: cn = jami oy, ci = hozirgi toʻlov raqami
function creditOf(x) {
  const cn = Math.round(Number(x.cn)), ci = Math.round(Number(x.ci));
  return cn >= 2 && cn <= 120 ? { cn, ci: ci >= 1 && ci <= cn ? ci : 1 } : { cn: 0, ci: 0 };
}
function cleanPayable(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || x.id.length > 64 || typeof x.who !== 'string' || !x.who.trim() || !DATE_RE.test(x.due)) return null;
  const amount = num(x.amount);
  if (amount === null || amount <= 0) return null;
  const pays = Array.isArray(x.pays) ? x.pays.filter((y) => y && Number(y.a) > 0 && DATE_RE.test(y.d)).slice(-60).map((y) => ({ id: String(y.id || newId()).slice(0, 64), a: Math.round(Number(y.a)), d: y.d })) : [];
  return {
    id: x.id, who: x.who.trim().slice(0, 80), note: typeof x.note === 'string' ? x.note.trim().slice(0, 120) : '', amount: Math.round(amount), due: x.due,
    paid: Math.min(Math.round(amount), pays.reduce((n, y) => n + y.a, 0)), pays, cat: EXCATS.includes(x.cat) ? x.cat : 'other', repeat: x.repeat === 'month' ? 'month' : '', ...creditOf(x),
    nextId: typeof x.nextId === 'string' ? x.nextId.slice(0, 64) : '', pid: typeof x.pid === 'string' ? x.pid.slice(0, 64) : '',
    createdAt: Number(x.createdAt) || Date.now(), updatedAt: Number(x.updatedAt) || 0, r: x.r,
  };
}
function mergePayables(u, clientList, clientDeleted) {
  const tomb = u.pvdeleted || {}, now = Date.now();
  const byId = new Map(u.payables.map((x) => [x.id, x]));
  for (const id of clientDeleted) { byId.delete(id); tomb[id] = now; }
  for (const raw of clientList) {
    const c = cleanPayable(raw);
    if (!c || tomb[c.id]) continue;
    const x = byId.get(c.id);
    if (!x) { byId.set(c.id, { ...c, r: undefined }); continue; }
    if (c.updatedAt >= (x.updatedAt || 0)) byId.set(c.id, { ...c, r: c.due === x.due ? x.r : undefined });
  }
  for (const [id, t] of Object.entries(tomb)) if (now - t > 60 * 86400000) delete tomb[id];
  u.pvdeleted = tomb; u.payables = [...byId.values()];
  return u;
}
const payLeft = (x) => Math.max(0, x.amount - x.paid);
const payOpen = (u) => u.payables.filter((x) => payLeft(x) > 0).sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.who < b.who ? -1 : 1));
// Hisob: umumiy, muddati oʻtgan, 7 kun, oy, 30 kun; kutilayotgan tushum bilan solishtirish
function paySummary(u, today) {
  const open = payOpen(u), ym = today.slice(0, 7), d7 = addDaysISO(today, 7), d30 = addDaysISO(today, 30);
  const sum = (arr) => arr.reduce((n, x) => n + payLeft(x), 0);
  const byWho = new Map();
  for (const x of open) byWho.set(x.who, (byWho.get(x.who) || 0) + payLeft(x));
  const subsIn = u.subs.filter((x) => x.active).reduce((n, x) => n + x.amount, 0);
  const inflow = activeDebt(u) + subsIn;
  const out30 = sum(open.filter((x) => x.due <= d30));
  return {
    open, total: sum(open), overdue: sum(open.filter((x) => x.due < today)), today: sum(open.filter((x) => x.due === today)), week: sum(open.filter((x) => x.due >= today && x.due <= d7)),
    month: sum(open.filter((x) => x.due.slice(0, 7) === ym)), out30, inflow, balance: inflow - out30, byWho: [...byWho.entries()].sort((a, b) => b[1] - a[1]),
  };
}
// Toʻlov qilish: toʻlovni yozadi, xarajatga avtomatik qoʻshadi, oylik boʻlsa keyingi oyni yaratadi
function applyPayment(u, x, amount, today, now = Date.now()) {
  const a = Math.min(Math.round(amount), payLeft(x));
  if (a <= 0) return 0;
  const payId = newId();
  x.pays = [...x.pays, { id: payId, a, d: today }].slice(-60); x.paid += a; x.updatedAt = now; x.r = undefined;
  u.expenses.unshift(cleanExpense({ id: newId(), a, d: today, cat: x.cat, note: [x.who, x.note].filter(Boolean).join(' · '), pid: x.pid, src: x.id, ref: payId, createdAt: now, updatedAt: now }));
  if (payLeft(x) === 0 && (x.repeat === 'month' || (x.cn && x.ci < x.cn)) && !x.nextId) {
    const nx = cleanPayable({ ...x, ci: x.cn ? x.ci + 1 : 0, id: newId(), due: addMonthsISO(x.due, 1), paid: 0, pays: [], nextId: '', createdAt: now, updatedAt: now, r: undefined });
    if (nx) { x.nextId = nx.id; u.payables.push(nx); }
  }
  return a;
}
function undoPayment(u, x, now = Date.now()) {
  const last = x.pays[x.pays.length - 1];
  if (!last) return false;
  x.pays = x.pays.slice(0, -1); x.paid = Math.max(0, x.paid - last.a); x.updatedAt = now; x.r = undefined;
  u.expenses = u.expenses.filter((e) => e.ref !== last.id);
  if (x.nextId) {
    const nx = u.payables.find((p) => p.id === x.nextId);
    if (nx && nx.paid === 0) u.payables = u.payables.filter((p) => p.id !== nx.id);
    x.nextId = '';
  }
  return true;
}

/* ---------- xarita ---------- */
function mapLinks(m) {
  if (m.lat !== null && m.lat !== undefined && m.lon !== null && m.lon !== undefined) {
    return { google: `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lon}`, yandex: `https://yandex.com/maps/?pt=${m.lon},${m.lat}&z=16&l=map` };
  }
  if (m.location) {
    const q = encodeURIComponent(m.location);
    return { google: `https://www.google.com/maps/search/?api=1&query=${q}`, yandex: `https://yandex.com/maps/?text=${q}` };
  }
  return null;
}

/* ---------- ko'rinish ---------- */
function meetingText(m, u, now = Date.now()) {
  const T = Tof(u), s = startUTC(m, u.tz), today = todayISO(u.tz, now);
  const status = m.status === 'done' ? T.statusDone : m.status === 'cancelled' ? T.statusCancelled : s >= now ? countdown(s, now, T, u.tz) : now - s <= GRACE_MIN * 60000 ? T.started : T.past;
  const dot = m.cat ? `${CAT_DOT[m.cat]} ` : '';
  let t = `${dot}<b>${esc(m.name)}</b>\n📅 ${esc(dayLabel(m.date, today, T))}, <b>${m.time}</b>  ·  <i>${status}</i>`;
  if (m.cat) t += `\n🏷 ${T.cats[m.cat]}`;
  if (m.location) t += `\n📍 ${esc(m.location)}`;
  if (m.phone) t += `\n📞 ${esc(m.phone)}`;
  if (m.from) t += `\n${T.fromOwner(esc(m.from))}`;
  if (m.g && m.g.length) t += `\n${T.guests(m.g.length)}`;
  if (m.notes) t += `\n📝 ${esc(m.notes)}`;
  if (m.checklist.length) {
    const done = m.checklist.filter((i) => i.done).length;
    t += `\n\n${T.checklistH(done, m.checklist.length)}\n` + m.checklist.map((i) => `${i.done ? '✅' : '⬜️'} ${esc(i.text)}`).join('\n');
  }
  return t;
}
// Kun bo'yicha guruhlangan ro'yxat matni (bot va kunlik xulosa uchun)
function listText(title, items, u, now = Date.now(), heads = true) {
  const T = Tof(u);
  if (!items.length) return `${title}\n\n${T.noMeetings}`;
  const today = todayISO(u.tz, now);
  let out = `${title}\n`, last = '';
  for (const m of items) {
    if (heads && m.date !== last) { out += `\n<b>${esc(dayLabel(m.date, today, T))}</b>\n`; last = m.date; } else if (!heads && !last) { out += '\n'; last = 1; }
    out += `${m.cat ? CAT_DOT[m.cat] : '▫️'} ${m.time} — ${esc(m.name)}${m.location ? ' · 📍 ' + esc(m.location) : ''}\n`;
  }
  return out;
}
const appBtn = (text, q = '') => ({ text, web_app: { url: `${SITE()}/${q}` } });

/* ---------- tez qo'shish: erkin matndan tahlil ---------- */
const WD_WORDS = [
  ['dushanba', 'понедельник', 'monday', 'mon', 'пн'], ['seshanba', 'вторник', 'tuesday', 'tue', 'вт'], ['chorshanba', 'среда', 'среду', 'wednesday', 'wed', 'ср'],
  ['payshanba', 'четверг', 'thursday', 'thu', 'чт'], ['juma', 'пятница', 'пятницу', 'friday', 'fri', 'пт'], ['shanba', 'суббота', 'субботу', 'saturday', 'sat', 'сб'], ['yakshanba', 'воскресенье', 'sunday', 'sun', 'вс'],
];
const MONTH_STEMS = [['yan', 'янв', 'jan'], ['fev', 'фев', 'feb'], ['mar', 'мар'], ['apr', 'апр'], ['may', 'мая', 'май'], ['iyun', 'июн', 'jun'], ['iyul', 'июл', 'jul'], ['avg', 'авг', 'aug'], ['sen', 'сен', 'sep'], ['okt', 'окт', 'oct'], ['noy', 'ноя', 'nov'], ['dek', 'дек', 'dec']];
const monthIdx = (w) => MONTH_STEMS.findIndex((st) => st.some((s) => w.startsWith(s)));
const HASH_CAT = { ish: 'work', work: 'work', работа: 'work', oila: 'family', family: 'family', семья: 'family', shaxsiy: 'personal', personal: 'personal', личное: 'personal', boshqa: 'other', other: 'other', другое: 'other' };

function parseQuick(input, tz, now = Date.now()) {
  let rest = ' ' + String(input || '').replace(/ /g, ' ') + ' ';
  const today = todayISO(tz, now), out = { found: { date: false, time: false } };
  const take = (re, fn) => { const m = rest.match(re); if (!m) return false; const r = fn(m); if (r === false) return false; rest = rest.replace(m[0], ' '); return true; };

  take(/#([\p{L}]+)/iu, (m) => { const c = HASH_CAT[m[1].toLowerCase()]; if (!c) return false; out.cat = c; });
  take(/(\+?\d[\d\s\-()]{7,}\d)/, (m) => { const digits = m[1].replace(/\D/g, ''); if (digits.length < 9 || digits.length > 15 || /^\d{1,2}[.:]\d/.test(m[1])) return false; out.phone = m[1].trim(); });
  take(/(?:^|[\s,;])(?:joy|manzil|место|адрес|place|at):\s*([^,;\n]+)/i, (m) => { out.location = m[1].trim(); });

  // sana
  const wdays = [];
  WD_WORDS.forEach((ws, i) => ws.forEach((w) => wdays.push([w, i])));
  if (take(/(?:^|[\s,;])(poslezavtra|после\s*завтра|послезавтра|indinga|day after tomorrow)(?=[\s,;.]|$)/i, () => { out.date = addDaysISO(today, 2); })) out.found.date = true;
  else if (take(/(?:^|[\s,;])(bugun|сегодня|today)(?=[\s,;.]|$)/i, () => { out.date = today; })) out.found.date = true;
  else if (take(/(?:^|[\s,;])(ertaga|завтра|tomorrow)(?=[\s,;.]|$)/i, () => { out.date = addDaysISO(today, 1); })) out.found.date = true;
  else if (take(/(?:^|[\s,;])(\d+)\s*(?:kundan keyin|дн(?:я|ей|ь)\s*спустя)/i, (m) => { out.date = addDaysISO(today, +m[1]); })
    || take(/(?:^|[\s,;])(?:через|in)\s+(\d+)\s*(?:дн\p{L}*|день|days?)/iu, (m) => { out.date = addDaysISO(today, +m[1]); })) out.found.date = true;
  else if (take(/(?:^|[\s,;])(\d{1,2})[\s-]*([\p{L}]{3,})(?:\s+(\d{4}))?(?=[\s,;.]|$)/iu, (m) => {
    const mo = monthIdx(m[2].toLowerCase()); const d = +m[1]; if (mo < 0 || d < 1 || d > 31) return false;
    const cy = +today.slice(0, 4); const y = m[3] ? +m[3] : cy; let iso = `${y}-${pad(mo + 1)}-${pad(d)}`; if (parseISO(iso).getUTCDate() !== d) return false; if (!m[3] && iso < today) iso = `${cy + 1}-${pad(mo + 1)}-${pad(d)}`; out.date = iso;
  })) out.found.date = true;
  else if (take(/(?:^|[\s,;])(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?=[\s,;]|$)/, (m) => {
    const d = +m[1], mo = +m[2]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    const cy = +today.slice(0, 4); const y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : cy; let iso = `${y}-${pad(mo)}-${pad(d)}`; if (parseISO(iso).getUTCDate() !== d) return false; if (!m[3] && iso < today) iso = `${cy + 1}-${pad(mo)}-${pad(d)}`; out.date = iso;
  })) out.found.date = true;
  else {
    const re = new RegExp(`(?:^|[\\s,;])(?:keyingi|следующ\\p{L}*|next)?\\s*(${wdays.map(([w]) => w).sort((a, b) => b.length - a.length).join('|')})(?=[\\s,;.]|$)`, 'iu');
    if (take(re, (m) => { const w = m[1].toLowerCase(); const idx = wdays.find(([x]) => x === w)[1]; const diff = ((idx - weekdayIdx(today) + 7) % 7) || 7; out.date = addDaysISO(today, diff); })) out.found.date = true;
  }

  // vaqt
  const period = (hh, ctxText) => { if (/(kech|вечер|evening|night|ночи)/i.test(ctxText) && hh < 12) return hh + 12; if (/(tushdan keyin|днём|днем|afternoon)/i.test(ctxText) && hh < 7) return hh + 12; return hh; };
  const ctx = rest;
  let tm = rest.match(/(\d{1,2})\s*[:]\s*(\d{2})\s*(am|pm)?/i);
  if (!tm) tm = rest.match(/(?:^|[\s,;])(\d{1,2})\.(\d{2})(?=[\s,;]|$)/);
  if (tm) {
    let hh = +tm[1]; const mi = +tm[2];
    if (tm[3]) { if (/pm/i.test(tm[3]) && hh < 12) hh += 12; if (/am/i.test(tm[3]) && hh === 12) hh = 0; } else hh = period(hh, ctx);
    if (hh <= 23 && mi <= 59) { out.time = `${pad(hh)}:${pad(mi)}`; rest = rest.replace(tm[0], ' '); out.found.time = true; }
  }
  if (!out.found.time) {
    const pw = rest.match(/(kechqurun|kech|ertalab|tushdan keyin|утром|вечером|днём|днем|morning|evening|afternoon)\s*(?:soat\s*|в\s*|at\s*)?(\d{1,2})(?=[\s,;.]|$)/i);
    if (pw && +pw[2] <= 23) { out.time = `${pad(period(+pw[2], pw[1]))}:00`; rest = rest.replace(pw[0], ' '); out.found.time = true; }
  }
  if (!out.found.time) {
    const h = rest.match(/(?:soat|в|к|at)\s*(\d{1,2})\s*(am|pm)?(?:\s*da)?(?=[\s,;.]|$)/i) || rest.match(/(?:^|[\s,;])(\d{1,2})\s*(am|pm)(?=[\s,;.]|$)/i);
    if (h) {
      let hh = +h[1]; if (h[2]) { if (/pm/i.test(h[2]) && hh < 12) hh += 12; if (/am/i.test(h[2]) && hh === 12) hh = 0; } else hh = period(hh, ctx);
      if (hh <= 23) { out.time = `${pad(hh)}:00`; rest = rest.replace(h[0], ' '); out.found.time = true; }
    }
  }
  rest = rest.replace(/(?:^|[\s,;])(ertalab|kechqurun|kech|tushdan keyin|утром|вечером|днём|днем|ночью|morning|evening|afternoon|tonight)(?=[\s,;.]|$)/gi, ' ');

  if (out.found.time) rest = rest.replace(/(?:^|[\s,;])(?:soat|час(?:ов|а)?)(?=[\s,;.]|$)/gi, ' ');
  // qolgani: nom, joy, izoh (vergul bilan ajratilgan)
  const parts = rest.split(/[,;\n]/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let name = (parts[0] || '').replace(/\s+(bilan|с|with)$/i, '').replace(/^da\s+/i, '').replace(/^(uchrashuv|meeting|встреча)\s*[:\-—]?\s*/i, '').trim();
  out.name = name.slice(0, 120);
  if (!out.location && parts[1]) out.location = parts[1].slice(0, 200);
  if (parts[2]) out.notes = parts.slice(2).join(', ').slice(0, 1000);
  return out;
}

module.exports = {
  TOKEN, SITE, BOT_USER, DEFAULT_TZ, GRACE_MIN, CATS, CAT_DOT, TZS, tzName, LANGS, getT, Tof,
  tg, esc, checkInitData, openStore, getUser, saveUser, blankUser,
  pad, localNow, isoOfLocal, hhmmOfLocal, todayISO, addDaysISO, parseISO, weekdayIdx, fmtShort, fmtWd, dayLabel, startUTC, countdown, leadText, toMin, inQuiet,
  tgFile, newId, cleanMeeting, PTYPES, PSTATUS, PICON, SICON, daysBetween, cleanProject, planTasks, projProgress, barText, deadlineTag, projectText, activeProjects, mergeProjects, money, owed, reportLink, cleanSub, mergeSubs, subDue, subsDue, paySub, subsMonthly, paymentsOf, incomeByMonth, clientsOf, clientHash, activeDebt, EXCATS, cleanExpense, mergeExpenses, expensesIn, expenseSum, monthRange, incomeIn, adminIds, isAdmin, accessOpen, isAllowed, cleanPayable, mergePayables, payLeft, payOpen, paySummary, applyPayment, undoPayment, projectExpense, goalInfo, goalLine, cleanUrl, addMonthsISO, cleanService, mergeServices, serviceEnd, serviceDays, digitsOf, findServices, prevYM, byStart, upcoming, active, mergeMeetings, mapLinks, meetingText, listText, appBtn, parseQuick,
};
