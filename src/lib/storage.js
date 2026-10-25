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
      .map((m) => [m.id, m.updatedAt, m.name, m.date, m.time, m.location, m.notes, m.checklist.map((i) => [i.id, i.text, i.done])])
      .sort((a, b) => (a[0] < b[0] ? -1 : 1)),
  );

export async function syncRemote(meetings, deleted) {
  if (!isTelegram) return null;
  const res = await fetch('/api/meetings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
    body: JSON.stringify({ meetings, deleted, tz: -new Date().getTimezoneOffset() }),
  });
  if (!res.ok) throw new Error(`sync ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.meetings) ? data.meetings.map(clean).filter(Boolean) : null;
}
