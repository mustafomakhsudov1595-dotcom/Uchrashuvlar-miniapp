import { newId } from './meetings.js';

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
