import { addDays, toISODate, fromISODate } from './dates.js';

// Hisob daftari: loyiha va oylik toʻlovlari + qoʻlda kirim + chiqimlar (mijozda hisoblanadi)
export function ledgerOf(projects, subs, expenses) {
  const out = [];
  for (const p of projects) {
    let sum = 0;
    for (const [i, x] of (p.pays || []).entries()) { out.push({ id: `p${p.id}:${i}`, d: x.d, a: x.a, dir: 'in', label: p.client || p.name, kind: p.type, auto: true }); sum += x.a; }
    const rest = (p.paid || 0) - sum;
    if (rest > 0) out.push({ id: `p${p.id}rest`, d: toISODate(new Date(p.updatedAt || p.createdAt || Date.now())), a: rest, dir: 'in', label: p.client || p.name, kind: p.type, auto: true });
  }
  for (const s of subs) for (const [i, y] of (s.pays || []).entries()) out.push({ id: `s${s.id}:${i}`, d: y.d, a: y.a, dir: 'in', label: s.client || s.name, kind: 'sub', auto: true });
  for (const x of expenses) out.push(x.k === 'in' ? { id: x.id, d: x.d, a: x.a, dir: 'in', label: x.note, kind: x.ik || 'other' } : { id: x.id, d: x.d, a: x.a, dir: 'out', label: x.note, kind: x.cat });
  return out.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : b.a - a.a));
}
// Balans = boshlangʻich summa + shu sanadan bugungacha kirim − chiqim
export function balanceNow(bal, all, today) {
  if (!bal) return null;
  const l = all.filter((x) => x.d >= bal.d && x.d <= today);
  const inc = l.filter((x) => x.dir === 'in').reduce((n, x) => n + x.a, 0), out = l.filter((x) => x.dir === 'out').reduce((n, x) => n + x.a, 0);
  return { balance: bal.a0 + inc - out, inc, out, since: bal.d };
}
export function rangeOf(p, today) {
  if (p === 'today') return [today, today];
  if (p === 'week') return [toISODate(addDays(fromISODate(today), -6)), today];
  if (p === 'month') return [`${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`];
  if (p === 'year') return [`${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`];
  return ['0000-01-01', '9999-12-31'];
}
const sum = (l) => l.reduce((n, x) => n + x.a, 0);
export function summarize(all, p, today) {
  const [f, t] = rangeOf(p, today), list = all.filter((x) => x.d >= f && x.d <= t);
  const ins = list.filter((x) => x.dir === 'in'), outs = list.filter((x) => x.dir === 'out');
  const by = (l) => { const m = {}; for (const x of l) m[x.kind] = (m[x.kind] || 0) + x.a; return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  return { list, income: sum(ins), expense: sum(outs), profit: sum(ins) - sum(outs), cash: sum(all.filter((x) => x.dir === 'in')) - sum(all.filter((x) => x.dir === 'out')), kinds: by(ins), cats: by(outs) };
}
// Oxirgi n oy: kirim va chiqim
export function monthly(all, n, today) {
  let [y, m] = today.split('-').map(Number);
  const list = [];
  for (let i = 0; i < n; i++) { list.unshift({ m: `${y}-${String(m).padStart(2, '0')}`, inc: 0, exp: 0 }); m -= 1; if (m < 1) { m = 12; y -= 1; } }
  const idx = new Map(list.map((e) => [e.m, e]));
  for (const x of all) { const e = idx.get(x.d.slice(0, 7)); if (e) e[x.dir === 'in' ? 'inc' : 'exp'] += x.a; }
  return list;
}
