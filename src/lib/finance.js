import { toISODate } from './dates.js';
import { owed } from './projects.js';

export const ym = (iso) => iso.slice(0, 7);
export const subDue = (x, today) => x.active && x.last !== ym(today) && Number(today.slice(8, 10)) >= x.day;
export const subPaidNow = (x, today) => x.last === ym(today);
export const subsMonthly = (subs) => subs.filter((x) => x.active).reduce((n, x) => n + x.amount, 0);
export const totalDebt = (projects) => projects.reduce((n, p) => n + owed(p), 0);

// Mijozlar: loyiha va oylik toʻlovlardagi ism boʻyicha (katta-kichik harf farqsiz) birlashtiriladi
export function clientsOf(projects, subs) {
  const map = new Map();
  const get = (name) => {
    const key = name.trim().toLowerCase();
    if (!map.has(key)) map.set(key, { key, name: name.trim(), contact: '', projects: [], subs: [], price: 0, paid: 0, owed: 0, monthly: 0, active: 0 });
    return map.get(key);
  };
  for (const p of [...projects].sort((a, b) => a.updatedAt - b.updatedAt)) {
    if (!p.client) continue;
    const c = get(p.client);
    if (c.name === c.name.toLowerCase() && p.client !== p.client.toLowerCase()) c.name = p.client;
    if (p.contact) c.contact = p.contact;
    c.projects.push(p);
    c.price += p.price || 0;
    c.paid += p.paid || 0;
    c.owed += owed(p);
    if (p.status !== 'done') c.active += 1;
  }
  for (const x of subs) {
    if (!x.client) continue;
    const c = get(x.client);
    c.subs.push(x);
    if (x.active) c.monthly += x.amount;
  }
  return [...map.values()].sort((a, b) => b.owed - a.owed || b.paid - a.paid || (a.name < b.name ? -1 : 1));
}

// Oxirgi n oy daromadi (toʻlov sanasi boʻyicha). Sanasiz eski toʻlov — oxirgi yangilangan oyga.
export function incomeByMonth(projects, subs, months, today) {
  let [y, m] = today.split('-').map(Number);
  const list = [];
  for (let i = 0; i < months; i++) {
    list.unshift({ m: `${y}-${String(m).padStart(2, '0')}`, total: 0, k: { site: 0, bot: 0, video: 0, other: 0, sub: 0 } });
    m -= 1;
    if (m < 1) { m = 12; y -= 1; }
  }
  const idx = new Map(list.map((e) => [e.m, e]));
  const add = (d, a, k) => {
    const e = idx.get(d.slice(0, 7));
    if (e) { e.total += a; e.k[k in e.k ? k : 'other'] += a; }
  };
  for (const p of projects) {
    let sum = 0;
    for (const x of p.pays || []) { add(x.d, x.a, p.type); sum += x.a; }
    const rest = (p.paid || 0) - sum;
    if (rest > 0) add(toISODate(new Date(p.updatedAt || p.createdAt || Date.now())), rest, p.type);
  }
  for (const x of subs) for (const y of x.pays || []) add(y.d, y.a, 'sub');
  return list;
}
