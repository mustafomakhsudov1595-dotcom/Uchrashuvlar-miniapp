'use strict';
const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');
const { getT, LANGS } = require('./i18n');

const TOKEN = () => process.env.BOT_TOKEN;
const SITE = () => (process.env.SITE_URL || 'https://impro-it-notes.netlify.app').replace(/\/$/, '');
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

/* ---------- saqlash (Netlify Blobs) ---------- */
function openStore(event) {
  let uncached;
  try {
    if (event && event.blobs) {
      connectLambda(event);
      uncached = JSON.parse(Buffer.from(event.blobs, 'base64').toString()).url_uncached;
    }
  } catch (e) { console.error('blobs', e.message); }
  return getStore(uncached ? { name: 'impro', consistency: 'strong', uncachedEdgeURL: uncached } : { name: 'impro' });
}
const userKey = (id) => `user/${id}`;
const blankUser = (id) => ({
  id: String(id), lang: null, tz: DEFAULT_TZ, tzManual: false, remind: true, lead: 60,
  quiet: { on: false, from: '22:00', to: '07:00' }, digest: { m: null, e: null }, dsent: { m: '', e: '' },
  meetings: [], deleted: {}, places: [], placesAt: 0, state: null,
});
async function getUser(st, id) {
  const u = await st.get(userKey(id), { type: 'json' });
  if (!u) return blankUser(id);
  const d = blankUser(id);
  return { ...d, ...u, quiet: { ...d.quiet, ...(u.quiet || {}) }, digest: { ...d.digest, ...(u.digest || {}) }, dsent: { ...d.dsent, ...(u.dsent || {}) } };
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
  newId, cleanMeeting, byStart, upcoming, active, mergeMeetings, mapLinks, meetingText, listText, appBtn, parseQuick,
};
