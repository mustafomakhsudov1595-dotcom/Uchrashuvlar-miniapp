import { meetingStart } from './dates.js';
import { t } from './i18n.js';

// Uchrashuv boshlangandan keyin shuncha daqiqa u hali "kelgusi" hisoblanadi.
export const GRACE_MIN = 60;

export function newId() {
  // crypto.randomUUID faqat HTTPS yoki localhost'da ishlaydi, shuning uchun zaxira variant bor.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const byStart = (a, b) => meetingStart(a) - meetingStart(b);

export function splitMeetings(list, now) {
  const cutoff = now.getTime() - GRACE_MIN * 60000;
  const upcoming = [];
  const past = [];
  for (const m of [...list].sort(byStart)) {
    (!m.status && meetingStart(m).getTime() >= cutoff ? upcoming : past).push(m);
  }
  past.reverse(); // eng yaqin o'tgani birinchi
  return { upcoming, past };
}

// Bir xil kundagi uchrashuvlarni guruhlaydi (ro'yxat allaqachon vaqt bo'yicha saralangan bo'lishi kerak).
export function groupByDate(list) {
  const groups = [];
  for (const m of list) {
    const last = groups[groups.length - 1];
    if (last && last.iso === m.date) last.items.push(m);
    else groups.push({ iso: m.date, items: [m] });
  }
  return groups;
}

export const meetingsOn = (list, iso) => list.filter((m) => m.date === iso).sort(byStart);

export function countByDate(list) {
  const map = new Map();
  for (const m of list) map.set(m.date, (map.get(m.date) || 0) + 1);
  return map;
}

export function checklistProgress(meeting) {
  const total = meeting.checklist.length;
  const done = meeting.checklist.filter((i) => i.done).length;
  return { done, total };
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// "45 daqiqadan keyin", "2 soat 15 daqiqadan keyin", "Ertaga", "3 kundan keyin"
export function countdownText(start, now) {
  const diffMin = Math.ceil((start - now) / 60000);
  if (diffMin <= 0) return t('cdNow');
  if (diffMin < 60) return t('cdMin', diffMin);
  if (diffMin < 24 * 60) return t('cdHM', Math.floor(diffMin / 60), diffMin % 60);
  const days = Math.round((startOfDay(start) - startOfDay(now)) / 86400000);
  return days === 1 ? t('tomorrow') : t('cdDays', days);
}

export function statusText(meeting, now) {
  if (meeting.status === 'done') return t('dStatusDone');
  if (meeting.status === 'cancelled') return t('dStatusCancelled');
  const start = meetingStart(meeting);
  if (start >= now) return countdownText(start, now);
  return now - start <= GRACE_MIN * 60000 ? t('cdNow') : t('past');
}

export const CATS = ['work', 'family', 'personal', 'other'];
