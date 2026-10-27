import TEMPLATES from '../../shared/templates.json';
import { addDays, fromISODate, toISODate } from './dates.js';
import { newId } from './meetings.js';
import { getLang } from './i18n.js';

export const PTYPES = ['site', 'bot', 'video', 'other'];
export const PSTATUS = ['new', 'work', 'review', 'done', 'paused'];

export const daysBetween = (a, b) => Math.round((fromISODate(b) - fromISODate(a)) / 86400000);
export const shiftDate = (iso, n) => toISODate(addDays(fromISODate(iso), n));

// Shablon vazifalarni bugundan muddatgacha teng taqsimlaydi
export function planTasks(type, today, deadline, lang = getLang()) {
  const days = Math.max(0, daysBetween(today, deadline));
  return (TEMPLATES[type] || TEMPLATES.other).map((t) => ({
    id: newId(),
    text: t.tx[lang] || t.tx.uz,
    done: false,
    due: days ? shiftDate(today, Math.round(t.at * days)) : deadline,
  }));
}

export const templateCount = (type) => (TEMPLATES[type] || TEMPLATES.other).length;

export const progress = (p) => {
  const total = p.tasks.length;
  const done = p.tasks.filter((t) => t.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
};

// Muddat holati: over | today | soon | ok | done
export function urgency(p, today) {
  if (p.status === 'done') return { kind: 'done', n: 0 };
  const n = daysBetween(today, p.date);
  if (n < 0) return { kind: 'over', n: -n };
  if (n === 0) return { kind: 'today', n };
  return { kind: n <= 3 ? 'soon' : 'ok', n };
}

export const byDeadline = (a, b) => (a.date + a.time < b.date + b.time ? -1 : 1);
