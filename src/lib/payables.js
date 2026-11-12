import { newId } from './meetings.js';
import { addMonths } from './services.js';
import { daysBetween, owed } from './projects.js';
import { subsMonthly } from './finance.js';

export const left = (x) => Math.max(0, x.amount - x.paid);
export const byDue = (a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.who < b.who ? -1 : 1);
export const openList = (list) => list.filter((x) => left(x) > 0).sort(byDue);
// over | today | soon (<=3 kun) | ok
export function dueKind(x, today) {
  const n = daysBetween(today, x.due);
  return { kind: n < 0 ? 'over' : n === 0 ? 'today' : n <= 3 ? 'soon' : 'ok', n };
}
export const shiftDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function summary(payables, projects, subs, today) {
  const open = openList(payables), ym = today.slice(0, 7), d7 = shiftDays(today, 7), d30 = shiftDays(today, 30);
  const sum = (arr) => arr.reduce((n, x) => n + left(x), 0);
  const inflow = projects.reduce((n, p) => n + owed(p), 0) + subsMonthly(subs);
  const out30 = sum(open.filter((x) => x.due <= d30));
  const byWho = new Map();
  for (const x of open) byWho.set(x.who, (byWho.get(x.who) || 0) + left(x));
  return {
    open, total: sum(open), overdue: sum(open.filter((x) => x.due < today)), week: sum(open.filter((x) => x.due >= today && x.due <= d7)), month: sum(open.filter((x) => x.due.slice(0, 7) === ym)),
    out30, inflow, balance: inflow - out30, byWho: [...byWho.entries()].sort((a, b) => b[1] - a[1]),
  };
}

// Toʻlov: yozadi, xarajatga avtomatik qoʻshadi, oylik boʻlsa keyingi oyni yaratadi. Sof funksiya: { payables, expenses } qaytaradi.
export function payNow(payables, expenses, id, amount, today, now = Date.now()) {
  const x = payables.find((p) => p.id === id);
  if (!x) return { payables, expenses };
  const a = Math.min(Math.round(amount), left(x));
  if (a <= 0) return { payables, expenses };
  const payId = newId();
  const paid = x.paid + a;
  let next = null;
  const upd = { ...x, paid, pays: [...x.pays, { id: payId, a, d: today }].slice(-60), updatedAt: now };
  if (paid >= x.amount && x.repeat === 'month' && !x.nextId) {
    next = { ...x, id: newId(), due: addMonths(x.due, 1), paid: 0, pays: [], nextId: '', createdAt: now, updatedAt: now };
    upd.nextId = next.id;
  }
  const exp = { id: newId(), a, d: today, cat: x.cat, note: [x.who, x.note].filter(Boolean).join(' · '), pid: x.pid, src: x.id, ref: payId, createdAt: now, updatedAt: now };
  return { payables: [...payables.map((p) => (p.id === id ? upd : p)), ...(next ? [next] : [])], expenses: [exp, ...expenses] };
}
export function undoLast(payables, expenses, id, now = Date.now()) {
  const x = payables.find((p) => p.id === id);
  const last = x && x.pays[x.pays.length - 1];
  if (!last) return { payables, expenses, removed: [] };
  let list = payables.map((p) => (p.id === id ? { ...p, pays: p.pays.slice(0, -1), paid: Math.max(0, p.paid - last.a), nextId: '', updatedAt: now } : p));
  const removed = [];
  if (x.nextId) {
    const nx = list.find((p) => p.id === x.nextId);
    if (nx && nx.paid === 0) { list = list.filter((p) => p.id !== nx.id); removed.push(nx.id); }
  }
  const gone = expenses.filter((e) => e.ref === last.id).map((e) => e.id);
  return { payables: list, expenses: expenses.filter((e) => e.ref !== last.id), removed, goneExpenses: gone };
}
