import { meetingStart } from './dates.js';

// Oylik statistika (hammasi qurilmada hisoblanadi).
export function monthStats(meetings, y, m, now = new Date()) {
  const pre = `${y}-${String(m + 1).padStart(2, '0')}`;
  const inMonth = meetings.filter((x) => x.date.startsWith(pre));
  const live = inMonth.filter((x) => x.status !== 'cancelled');
  const cancelled = inMonth.length - live.length;
  const attended = live.filter((x) => x.status === 'done' || (x.status !== 'done' && meetingStart(x) < now)).length;
  const upcoming = live.length - attended;
  const weekday = Array(7).fill(0);
  const hours = Array(24).fill(0);
  const cats = { work: 0, family: 0, personal: 0, other: 0, none: 0 };
  const places = new Map();
  for (const x of live) {
    const d = new Date(+x.date.slice(0, 4), +x.date.slice(5, 7) - 1, +x.date.slice(8, 10));
    weekday[(d.getDay() + 6) % 7] += 1;
    hours[+x.time.slice(0, 2)] += 1;
    cats[x.cat || 'none'] += 1;
    const p = x.location.trim();
    if (p) { const k = p.toLowerCase(); places.set(k, { text: p, n: (places.get(k)?.n || 0) + 1 }); }
  }
  const prevM = m === 0 ? 11 : m - 1;
  const prevY = m === 0 ? y - 1 : y;
  const prevPre = `${prevY}-${String(prevM + 1).padStart(2, '0')}`;
  const prev = meetings.filter((x) => x.date.startsWith(prevPre) && x.status !== 'cancelled').length;
  return {
    total: inMonth.length, live: live.length, attended, upcoming, cancelled, weekday, hours, cats,
    places: [...places.values()].sort((a, b) => b.n - a.n).slice(0, 5), prev,
    checklistDone: live.reduce((a, x) => a + x.checklist.filter((i) => i.done).length, 0),
    checklistAll: live.reduce((a, x) => a + x.checklist.length, 0),
  };
}
