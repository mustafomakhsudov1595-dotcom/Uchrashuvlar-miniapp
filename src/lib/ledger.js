import { addDays, toISODate, fromISODate } from './dates.js';
import { WALLETS, rnd, toUzs } from './currency.js';

// Hisob daftari: loyiha va oylik toʻlovlari + qoʻlda kirim + chiqimlar + oʻtkazmalar (mijozda hisoblanadi).
// def — loyiha/oylik toʻlovlari tushadigan hamyon (naqd yoki karta).
export function ledgerOf(projects, subs, expenses, def = 'cash') {
  const out = [];
  for (const p of projects) {
    let sum = 0;
    for (const [i, x] of (p.pays || []).entries()) { out.push({ id: `p${p.id}:${i}`, d: x.d, a: x.a, dir: 'in', label: p.client || p.name, kind: p.type, auto: true, w: def }); sum += x.a; }
    const rest = (p.paid || 0) - sum;
    if (rest > 0) out.push({ id: `p${p.id}rest`, d: toISODate(new Date(p.updatedAt || p.createdAt || Date.now())), a: rest, dir: 'in', label: p.client || p.name, kind: p.type, auto: true, w: def });
  }
  for (const s of subs) for (const [i, y] of (s.pays || []).entries()) out.push({ id: `s${s.id}:${i}`, d: y.d, a: y.a, dir: 'in', label: s.client || s.name, kind: 'sub', auto: true, w: def });
  for (const x of expenses) {
    if (x.k === 'tr') out.push({ id: x.id, d: x.d, a: x.a, dir: 'tr', label: x.note, kind: 'tr', w: x.w, w2: x.w2, a2: x.a2 });
    else out.push(x.k === 'in' ? { id: x.id, d: x.d, a: x.a, dir: 'in', label: x.note, kind: x.ik || 'other', w: x.w || def } : { id: x.id, d: x.d, a: x.a, dir: 'out', label: x.note, kind: x.cat, w: x.w || def });
  }
  return out.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : b.a - a.a));
}
export const eqOf = (e) => toUzs(e.a, e.w); // soʻmdagi qiymati (dollar — kurs boʻyicha)

const effects = (e) => (e.dir === 'tr' ? [[e.w, -e.a], [e.w2, e.a2]] : [[e.w, e.dir === 'in' ? e.a : -e.a]]);
const netFor = (l, w) => l.reduce((n, e) => n + effects(e).filter(([x]) => x === w).reduce((m, [, v]) => m + v, 0), 0);

// Hamyonlar balansi: boshlangʻich summa + shu sanadan bugungacha harakatlar. Jami — soʻmda (dollar kurs bilan).
export function balances(bal, all, today) {
  if (!bal) return null;
  const wallets = {};
  let total = 0;
  for (const w of WALLETS) {
    const y = bal[w];
    if (!y) continue;
    const l = all.filter((e) => e.d >= y.d && e.d <= today);
    const balance = rnd(y.a0 + netFor(l, w), w === 'usd');
    wallets[w] = { balance, since: y.d, inc: l.filter((e) => e.dir === 'in' && e.w === w).reduce((n, e) => n + e.a, 0), out: l.filter((e) => e.dir === 'out' && e.w === w).reduce((n, e) => n + e.a, 0) };
    total += toUzs(balance, w);
  }
  return { wallets, total, def: bal.def || 'cash' };
}
// Hamyondagi hozirgi summa = x boʻlishi uchun boshlangʻich summani moslaydi (bugungi yozuvlar ikki marta hisoblanmasin)
export function withWallet(bal, w, x, all, today) {
  const next = { ...(bal || { def: 'cash' }) };
  next[w] = { a0: rnd(x, w === 'usd') - netFor(all.filter((e) => e.d === today), w), d: today };
  if (!next.def) next.def = 'cash';
  return next;
}

export function rangeOf(p, today) {
  if (p === 'today') return [today, today];
  if (p === 'week') return [toISODate(addDays(fromISODate(today), -6)), today];
  if (p === 'month') return [`${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`];
  if (p === 'year') return [`${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`];
  return ['0000-01-01', '9999-12-31'];
}
const sum = (l) => l.reduce((n, x) => n + eqOf(x), 0);
export function summarize(all, p, today) {
  const [f, t] = rangeOf(p, today), list = all.filter((x) => x.d >= f && x.d <= t);
  const ins = list.filter((x) => x.dir === 'in'), outs = list.filter((x) => x.dir === 'out');
  const by = (l) => { const m = {}; for (const x of l) m[x.kind] = (m[x.kind] || 0) + eqOf(x); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  return { list, income: sum(ins), expense: sum(outs), profit: sum(ins) - sum(outs), kinds: by(ins), cats: by(outs) };
}
// Oxirgi n oy: kirim va chiqim (soʻmda)
export function monthly(all, n, today) {
  let [y, m] = today.split('-').map(Number);
  const list = [];
  for (let i = 0; i < n; i++) { list.unshift({ m: `${y}-${String(m).padStart(2, '0')}`, inc: 0, exp: 0 }); m -= 1; if (m < 1) { m = 12; y -= 1; } }
  const idx = new Map(list.map((e) => [e.m, e]));
  for (const x of all) { if (x.dir === 'tr') continue; const e = idx.get(x.d.slice(0, 7)); if (e) e[x.dir === 'in' ? 'inc' : 'exp'] += eqOf(x); }
  return list;
}
