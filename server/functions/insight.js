'use strict';
// Haftalik AI tahlil: ma'lumotlar xulosasi asosida aniq tavsiyalar
const S = require('./_shared');
const { tg, esc } = S;

function snapshot(u, now = Date.now()) {
  const today = S.todayISO(u.tz, now), ym = today.slice(0, 7), [mf, mt] = S.monthRange(ym), wk = S.addDaysISO(today, -6);
  const act = S.activeProjects(u), L = [`Date: ${today}`];
  if (act.length) L.push(`Active projects (${act.length}): ` + act.slice(0, 8).map((p) => { const g = S.projProgress(p); return `${p.name}${p.client ? ` (${p.client})` : ''} — due in ${S.daysBetween(today, p.date)} days, ${g.done}/${g.total} tasks done`; }).join('; '));
  let overdue = 0;
  for (const p of act) for (const t of p.tasks) if (!t.done && t.due && t.due < today) overdue += 1;
  if (overdue) L.push(`Overdue tasks: ${overdue}`);
  const debtors = S.clientsOf(u).filter((c) => c.owed > 0).slice(0, 4);
  if (debtors.length) L.push(`Unpaid balances: ${debtors.map((c) => `${c.name} ${S.money(c.owed)}`).join('; ')} (total ${S.money(S.activeDebt(u))} UZS)`);
  const wkIn = S.incomeIn(u, wk, today), moIn = S.incomeIn(u, mf, mt), wkEx = S.expenseSum(S.expensesIn(u, wk, today)), moEx = S.expenseSum(S.expensesIn(u, mf, mt));
  L.push(`Income: this week ${S.money(wkIn)}, this month ${S.money(moIn)}; expenses: this week ${S.money(wkEx)}, this month ${S.money(moEx)} (UZS)`);
  const g = S.goalInfo(u, today);
  if (g) L.push(`Monthly goal: ${S.money(g.goal)}, reached ${g.pct}%, ${g.days} days left in the month`);
  const ending = u.services.map((x) => ({ x, d: S.serviceDays(x, today) })).filter((e) => e.d <= 45).sort((a, b) => a.d - b.d).slice(0, 5);
  if (ending.length) L.push(`Service ending soon: ${ending.map((e) => `${e.x.name}${e.x.client ? ` (${e.x.client})` : ''} ${e.d < 0 ? `ended ${-e.d} days ago` : `in ${e.d} days`}`).join('; ')}`);
  const openReq = u.services.reduce((n, x) => n + x.requests.filter((r) => !r.done).length, 0);
  if (openReq) L.push(`Open client change requests: ${openReq}`);
  const down = u.projects.filter((p) => p.url && p.mon && p.mon.ok === false);
  if (down.length) L.push(`Sites currently down: ${down.map((p) => p.name).join(', ')}`);
  const noClaude = u.services.filter((x) => !x.claudeUrl).length;
  if (noClaude) L.push(`Services without a Claude link: ${noClaude}`);
  const due = S.subsDue(u, today);
  if (due.length) L.push(`Monthly payments due: ${due.map((x) => `${x.client || x.name} ${S.money(x.amount)}`).join('; ')}`);
  return L.length > 2 ? L.join('\n') : '';
}
const SYSTEM = 'You are a sharp business advisor for a small team that builds websites, Telegram bots and Instagram videos for clients in Uzbekistan.';
async function generate(u, now = Date.now()) {
  const snap = snapshot(u, now);
  if (!snap) return null;
  const ext = require('./ext'); // sikl bo'lmasligi uchun kechroq
  const r = await ext.aiCall(u, SYSTEM, `Business data snapshot:\n${snap}\n\nWrite a short weekly insight (4-6 short lines): what is going well, what needs attention first and why, and up to 3 concrete next actions for this week. Use only real names and numbers from the data; do not invent anything.`);
  return r.text ? r.text.slice(0, 1400) : null;
}
async function onMessage(chat, u, cmd) {
  if (cmd !== '/tahlil' && cmd !== '/insight') return false;
  const P = S.Tof(u).p;
  tg('sendChatAction', { chat_id: chat, action: 'typing' });
  const t = await generate(u);
  await tg('sendMessage', { chat_id: chat, text: t ? `${P.insTitle}\n\n${esc(t)}` : P.insFail, parse_mode: 'HTML' });
  return true;
}
module.exports = { snapshot, generate, onMessage };
