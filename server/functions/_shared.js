'use strict';
const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');

const TOKEN = () => process.env.BOT_TOKEN;
const SITE = () => (process.env.SITE_URL || 'https://impro-it-notes.netlify.app').replace(/\/$/, '');
const DEFAULT_TZ = 300; // Toshkent, UTC+5 (daqiqada)
const GRACE_MIN = 60;

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const WEEKDAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
const WD_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

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
  try { if (event && event.blobs) connectLambda(event); } catch (e) { console.error('blobs', e.message); }
  return getStore({ name: 'impro', consistency: 'strong' });
}
const userKey = (id) => `user/${id}`;
async function getUser(st, id) {
  const u = await st.get(userKey(id), { type: 'json' });
  return u || { id: String(id), tz: DEFAULT_TZ, remind: true, lead: 60, meetings: [], deleted: {}, state: null };
}
const saveUser = (st, u) => st.setJSON(userKey(u.id), u);

/* ---------- sana va vaqt ---------- */
const pad = (n) => String(n).padStart(2, '0');
const localNow = (tz, now = Date.now()) => new Date(now + tz * 60000); // UTC getter'lar mahalliy vaqtni beradi
const isoOfLocal = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const todayISO = (tz, now) => isoOfLocal(localNow(tz, now));
const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDaysISO = (iso, n) => isoOfLocal(new Date(parseISO(iso).getTime() + n * 86400000));
const weekdayIdx = (iso) => (parseISO(iso).getUTCDay() + 6) % 7;
const fmtShort = (iso) => { const d = parseISO(iso); return `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()].toLowerCase()}`; };
const fmtWd = (iso) => `${WEEKDAYS[weekdayIdx(iso)]}, ${fmtShort(iso)}`;
const dayLabel = (iso, today) => (iso === today ? 'Bugun' : iso === addDaysISO(today, 1) ? 'Ertaga' : fmtWd(iso));
function startUTC(m, tz) {
  const [y, mo, d] = m.date.split('-').map(Number); const [h, mi] = m.time.split(':').map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) - tz * 60000;
}
function countdown(ms, now) {
  const diff = Math.ceil((ms - now) / 60000);
  if (diff <= 0) return 'Hozir boshlandi';
  if (diff < 60) return `${diff} daqiqadan keyin`;
  if (diff < 1440) { const h = Math.floor(diff / 60), m = diff % 60; return m ? `${h} soat ${m} daqiqadan keyin` : `${h} soatdan keyin`; }
  const days = Math.round(diff / 1440);
  return days === 1 ? 'Ertaga' : `${days} kundan keyin`;
}
const leadText = (min) => (min >= 1440 ? `${min / 1440} kun` : min >= 60 && min % 60 === 0 ? `${min / 60} soat` : `${min} daqiqa`);

/* ---------- uchrashuvlar ---------- */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, TIME_RE = /^\d{2}:\d{2}$/;
const newId = () => crypto.randomUUID();
function cleanMeeting(m) {
  if (!m || typeof m !== 'object') return null;
  if (typeof m.id !== 'string' || m.id.length > 64 || typeof m.name !== 'string' || !m.name.trim()) return null;
  if (!DATE_RE.test(m.date) || !TIME_RE.test(m.time)) return null;
  return {
    id: m.id, name: m.name.trim().slice(0, 120), date: m.date, time: m.time,
    location: typeof m.location === 'string' ? m.location.slice(0, 200) : '',
    notes: typeof m.notes === 'string' ? m.notes.slice(0, 1000) : '',
    checklist: Array.isArray(m.checklist) ? m.checklist.filter((i) => i && typeof i.text === 'string').slice(0, 50).map((i) => ({ id: String(i.id || newId()).slice(0, 64), text: i.text.slice(0, 80), done: Boolean(i.done) })) : [],
    createdAt: Number(m.createdAt) || Date.now(),
    updatedAt: Number(m.updatedAt) || 0,
    r: m.r,
  };
}
const byStart = (tz) => (a, b) => startUTC(a, tz) - startUTC(b, tz);
function upcoming(u, now = Date.now()) {
  return u.meetings.filter((m) => startUTC(m, u.tz) >= now - GRACE_MIN * 60000).sort(byStart(u.tz));
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
    if (!s) { byId.set(c.id, { ...c, r: undefined }); continue; }
    if (c.updatedAt >= (s.updatedAt || 0)) {
      const moved = s.date !== c.date || s.time !== c.time;
      byId.set(c.id, { ...c, r: moved ? undefined : s.r });
    }
  }
  for (const [id, t] of Object.entries(tomb)) if (now - t > 60 * 86400000) delete tomb[id];
  u.deleted = tomb;
  u.meetings = [...byId.values()];
  return u;
}

/* ---------- ko'rinish ---------- */
function meetingText(m, u, now = Date.now()) {
  const s = startUTC(m, u.tz), today = todayISO(u.tz, now);
  const status = s >= now ? countdown(s, now) : now - s <= GRACE_MIN * 60000 ? 'Hozir boshlandi' : 'Oʻtgan';
  let t = `👤 <b>${esc(m.name)}</b>\n📅 ${esc(dayLabel(m.date, today))}, <b>${m.time}</b>  ·  <i>${status}</i>`;
  if (m.location) t += `\n📍 ${esc(m.location)}`;
  if (m.notes) t += `\n📝 ${esc(m.notes)}`;
  if (m.checklist.length) {
    const done = m.checklist.filter((i) => i.done).length;
    t += `\n\n🧾 <b>Olib borish / berish</b> (${done}/${m.checklist.length}):\n` + m.checklist.map((i) => `${i.done ? '✅' : '⬜️'} ${esc(i.text)}`).join('\n');
  }
  return t;
}
const appBtn = (text, q = '') => ({ text, web_app: { url: `${SITE()}/${q}` } });

module.exports = {
  TOKEN, SITE, DEFAULT_TZ, GRACE_MIN, MONTHS, WEEKDAYS, WD_SHORT, tg, esc, checkInitData, openStore, getUser, saveUser,
  pad, localNow, todayISO, addDaysISO, parseISO, weekdayIdx, fmtShort, fmtWd, dayLabel, startUTC, countdown, leadText,
  newId, cleanMeeting, byStart, upcoming, mergeMeetings, meetingText, appBtn, isoOfLocal,
};
