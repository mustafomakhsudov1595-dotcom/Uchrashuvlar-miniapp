import { MONTHS, WEEKDAYS } from './uz.js';

const pad = (n) => String(n).padStart(2, '0');

// Sanalar "YYYY-MM-DD" ko'rinishida saqlanadi (vaqt mintaqasi bilan muammo bo'lmasligi uchun).
export const toISODate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISODate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayISO = () => toISODate(new Date());

export const meetingStart = (meeting) => {
  const [y, mo, d] = meeting.date.split('-').map(Number);
  const [h, mi] = meeting.time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi);
};

export const addDays = (date, n) => {
  const x = new Date(date);
  x.setDate(x.getDate() + n);
  return x;
};

// JS'da yakshanba = 0. Bizda dushanba = 0.
export const weekdayIndex = (date) => (date.getDay() + 6) % 7;

// Yangi uchrashuv uchun odatiy vaqt: keyingi butun soat.
export function defaultTime() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return `${pad(d.getHours())}:00`;
}

// "25-oktabr"
export function formatShort(iso) {
  const d = fromISODate(iso);
  return `${d.getDate()}-${MONTHS[d.getMonth()].toLowerCase()}`;
}

// "Yakshanba, 25-oktabr"
export function formatWithWeekday(iso) {
  return `${WEEKDAYS[weekdayIndex(fromISODate(iso))]}, ${formatShort(iso)}`;
}

// "Yakshanba, 25-oktabr 2026"
export function formatFull(iso) {
  return `${formatWithWeekday(iso)} ${fromISODate(iso).getFullYear()}`;
}

// "Bugun" | "Ertaga" | "Juma, 30-oktabr"
export function dayLabel(iso, now) {
  if (iso === toISODate(now)) return 'Bugun';
  if (iso === toISODate(addDays(now, 1))) return 'Ertaga';
  return formatWithWeekday(iso);
}

export function monthTitle(year, month) {
  return `${MONTHS[month]} ${year}`;
}

// Kalendar katakchalari: oyning to'liq haftalari (oldingi/keyingi oy kunlari bilan).
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = weekdayIndex(first);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const cells = [];
  for (let i = 0; i < weeks * 7; i += 1) {
    const d = new Date(year, month, 1 - offset + i);
    cells.push({ iso: toISODate(d), day: d.getDate(), inMonth: d.getMonth() === month });
  }
  return cells;
}
