'use strict';
// Loyihalar: sayt, bot, Instagram video — muddat, vazifalar, eslatmalar
const S = require('./_shared');
const { tg, esc } = S;
const aiButtons = (p, P) => (p.type === 'video' ? [['v', P.aiBtnScript], ['i', P.aiBtnInsta]] : p.type === 'site' ? [['s', P.aiBtnSite], ['i', P.aiBtnInsta]] : [['i', P.aiBtnInsta]]);

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text, parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));
const find = (u, id) => u.projects.find((p) => p.id === id);
const cancelRow = (P) => [{ text: P.cancel, callback_data: 'pno' }];

/* ---------- ro'yxat va karta ---------- */
async function showList(ctx, u, page = 0) {
  const T = S.Tof(u), P = T.p, today = S.todayISO(u.tz);
  const act = S.activeProjects(u), doneList = u.projects.filter((p) => p.status === 'done').sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 5);
  const all = [...act, ...doneList], per = 8, pages = Math.max(1, Math.ceil(all.length / per));
  page = Math.min(Math.max(page, 0), pages - 1);
  const items = all.slice(page * per, page * per + per);
  let text = P.title(act.length);
  if (!items.length) text += `\n\n${P.none}\n\n${P.quickNote}`;
  else text += '\n\n' + items.map((p) => { const g = S.projProgress(p); return `${S.PICON[p.type]} <b>${esc(p.name)}</b>${p.client ? ' · ' + esc(p.client) : ''}\n   ${S.deadlineTag(p, today, T)} · ${S.barText(g.done, g.total, 6)} ${g.done}/${g.total}`; }).join('\n\n');
  const rows = items.map((p) => [{ text: `${S.PICON[p.type]} ${p.name} · ${S.deadlineTag(p, today, T).replace(/<[^>]+>/g, '')}`.slice(0, 60), callback_data: `pj:${p.id}` }]);
  const nav = [];
  if (page > 0) nav.push({ text: '◀️', callback_data: `pl:${page - 1}` });
  if (pages > 1) nav.push({ text: `${page + 1}/${pages}`, callback_data: 'noop' });
  if (page < pages - 1) nav.push({ text: '▶️', callback_data: `pl:${page + 1}` });
  if (nav.length) rows.push(nav);
  rows.push([{ text: P.addNew, callback_data: 'pn' }, { text: P.bTasksToday, callback_data: 'ptd' }]);
  rows.push([{ text: P.bClients, callback_data: 'cl:0' }, { text: P.bSubs, callback_data: 'sl:0' }, { text: P.bIncome, callback_data: 'in:0' }]);
  rows.push([{ text: P.bDebts, callback_data: 'pq:0' }, S.appBtn(T.openAppShort, '?tab=projects')]);
  return show(ctx, text, { inline_keyboard: rows });
}

function cardMarkup(p, u) {
  const T = S.Tof(u), P = T.p;
  const rows = p.tasks.slice(0, 14).map((t, i) => [{ text: `${t.done ? '✅' : '⬜️'} ${t.text}${t.due && !t.done ? ' · ' + t.due.slice(5).replace('-', '.') : ''}`.slice(0, 60), callback_data: `pt:${p.id}:${i}` }]);
  rows.push(S.PSTATUS.map((s) => ({ text: `${p.status === s ? '✔️' : S.SICON[s]}`, callback_data: `ps:${p.id}:${s}` })));
  rows.push([1, 3, 7].map((n) => ({ text: `🗓 ${P.bPlus(n)}`, callback_data: `pd:${p.id}:${n}` })));
  if (p.price !== null && S.owed(p) > 0) rows.push([{ text: P.bPay, callback_data: `pp:${p.id}` }, { text: P.bPayFull, callback_data: `ppf:${p.id}` }]);
  else if (p.price !== null) rows.push([{ text: P.bPay, callback_data: `pp:${p.id}` }]);
  rows.push([{ text: P.bReport, callback_data: `pr:${p.id}` }, { text: P.bExpenses, callback_data: `xp:${p.id}` }]);
  rows.push([{ text: P.bSite, callback_data: `mu:${p.id}` }, ...(p.url ? [{ text: P.bCheck, callback_data: `mc:${p.id}` }, { text: '🗑', callback_data: `mx:${p.id}` }] : [])]);
  rows.push(aiButtons(p, P).map(([k, label]) => ({ text: label, callback_data: `ai:${k}:${p.id}` })));
  rows.push([{ text: P.bAddTask, callback_data: `pa:${p.id}` }, S.appBtn(P.bApp, `?proj=${p.id}`), { text: P.bDel, callback_data: `px:${p.id}` }]);
  rows.push([{ text: P.backList, callback_data: 'pl:0' }]);
  return { inline_keyboard: rows };
}
async function showCard(ctx, u, id) {
  const P = S.Tof(u).p, p = find(u, id);
  if (!p) return show(ctx, P.notFound, { inline_keyboard: [[{ text: P.backList, callback_data: 'pl:0' }]] });
  return show(ctx, S.projectText(p, u), cardMarkup(p, u));
}

/* ---------- bugungi vazifalar ---------- */
function collectTasks(u, now = Date.now()) {
  const today = S.todayISO(u.tz, now), soonTo = S.addDaysISO(today, 3), g = { over: [], today: [], soon: [] };
  for (const p of S.activeProjects(u)) p.tasks.forEach((t, i) => {
    if (t.done || !t.due) return;
    const e = { p, t, i };
    if (t.due < today) g.over.push(e); else if (t.due === today) g.today.push(e); else if (t.due <= soonTo) g.soon.push(e);
  });
  return g;
}
const line = (e) => `• ${S.PICON[e.p.type]} <b>${esc(e.p.name)}</b> — ${esc(e.t.text)}`;
function tasksView(u, now = Date.now()) {
  const T = S.Tof(u), P = T.p, g = collectTasks(u, now), n = g.over.length + g.today.length;
  let text = P.digestTitle(n);
  if (!g.over.length && !g.today.length && !g.soon.length) text += `\n\n${P.tasksNone}`;
  if (g.over.length) text += `\n\n${P.hOver}\n${g.over.map(line).join('\n')}`;
  if (g.today.length) text += `\n\n${P.hToday}\n${g.today.map(line).join('\n')}`;
  if (g.soon.length) text += `\n\n${P.hSoon}\n${g.soon.slice(0, 8).map((e) => `${line(e)} (${e.t.due.slice(5).replace('-', '.')})`).join('\n')}`;
  const rows = [...g.over, ...g.today].slice(0, 15).map((e) => [{ text: `⬜️ ${e.t.text} · ${e.p.name}`.slice(0, 60), callback_data: `pu:${e.p.id}:${e.i}` }]);
  rows.push([{ text: P.backList, callback_data: 'pl:0' }]);
  return { text, markup: { inline_keyboard: rows }, count: n + g.soon.length };
}
async function showTasks(ctx, u) { const v = tasksView(u); return show(ctx, v.text, v.markup); }


/* ---------- toʻlovlar va qarzlar ---------- */
const debtors = (u) => u.projects.filter((p) => S.owed(p) > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
const debtSum = (list) => list.reduce((n, p) => n + S.owed(p), 0);
function payAmount(text) {
  const m = parseMoney(text);
  if (m) return m.value;
  const n = text.replace(/\s/g, '');
  return /^\d{1,12}$/.test(n) && Number(n) > 0 ? Number(n) : null;
}
function applyPayment(u, p, amount) {
  p.paid = (p.paid || 0) + amount;
  p.pays = [...(p.pays || []), { a: amount, d: S.todayISO(u.tz) }].slice(-40);
  p.updatedAt = Date.now();
  if (p.r) p.r.pay = undefined;
}
async function showDebts(ctx, u) {
  const T = S.Tof(u), P = T.p, list = debtors(u);
  if (!list.length) return show(ctx, `${P.debtTitle(0, '0')}\n\n${P.debtNone}`, { inline_keyboard: [[{ text: P.backList, callback_data: 'pl:0' }]] });
  const text = `${P.debtTitle(list.length, S.money(debtSum(list)))}\n\n${list.slice(0, 20).map((p) => P.debtLine(S.PICON[p.type], esc(p.name), esc(p.client), S.money(S.owed(p)))).join('\n')}`;
  const rows = list.slice(0, 10).map((p) => [{ text: `${S.PICON[p.type]} ${p.name} · ${S.money(S.owed(p))}`.slice(0, 60), callback_data: `pj:${p.id}` }]);
  rows.push([{ text: P.backList, callback_data: 'pl:0' }]);
  return show(ctx, text, { inline_keyboard: rows });
}

/* ---------- ertalabki karta (har kuni 08:00) ---------- */
function briefMessage(u, now = Date.now()) {
  const T = S.Tof(u), P = T.p, today = S.todayISO(u.tz, now);
  const meets = u.meetings.filter((m) => m.date === today && m.status !== 'cancelled' && m.status !== 'done').sort(S.byStart(u.tz));
  const g = collectTasks(u, now);
  const near = S.activeProjects(u).filter((p) => S.daysBetween(today, p.date) <= 3);
  const dl = debtors(u), sd = S.subsDue(u, today);
  const parts = [P.brTitle(esc(S.fmtWd(today, T)))];
  if (meets.length) parts.push(`${P.brMeet} (${meets.length})\n${meets.slice(0, 8).map((m) => `• <b>${m.time}</b> — ${esc(m.name)}${m.location ? ' 📍' + esc(m.location) : ''}`).join('\n')}`);
  if (g.over.length) parts.push(`${P.hOver} (${g.over.length})\n${g.over.slice(0, 6).map(line).join('\n')}\n<i>${P.brOverTasks}</i>`);
  if (g.today.length) parts.push(`${P.hToday} (${g.today.length})\n${g.today.slice(0, 8).map(line).join('\n')}`);
  if (near.length) parts.push(`${P.brProj}\n${near.slice(0, 6).map((p) => `• ${S.PICON[p.type]} <b>${esc(p.name)}</b> — ${S.deadlineTag(p, today, T)}`).join('\n')}`);
  if (sd.length) parts.push(`${P.brSubs}\n${sd.slice(0, 6).map((x) => `• <b>${esc([x.client, x.name].filter(Boolean).join(' · '))}</b> — ${S.money(x.amount)}`).join('\n')}`);
  if (dl.length) parts.push(P.brDebt(dl.length, S.money(debtSum(dl))));
  const gl = S.goalLine(u, today);
  if (gl) parts.push(gl);
  const empty = !sd.length && !meets.length && !g.over.length && !g.today.length && !near.length && !dl.length;
  if (empty) parts.push(P.brNone);
  const rows = [...g.over, ...g.today].slice(0, 6).map((e) => [{ text: `⬜️ ${e.t.text} · ${e.p.name}`.slice(0, 60), callback_data: `pu:${e.p.id}:${e.i}` }]);
  for (const m of meets.slice(0, 4)) rows.push([{ text: `${m.time} · ${m.name}`.slice(0, 60), callback_data: `d:${m.id}` }]);
  const last = [S.appBtn(T.openAppShort)];
  if (dl.length) last.unshift({ text: P.bDebts, callback_data: 'pq:0' });
  rows.push(last);
  return { text: parts.join('\n\n'), markup: { inline_keyboard: rows } };
}

/* ---------- haftalik xulosa (yakshanba) ---------- */
function weeklyMessage(u, now = Date.now()) {
  const T = S.Tof(u), P = T.p, today = S.todayISO(u.tz, now), from = S.addDaysISO(today, -6), next = S.addDaysISO(today, 7);
  const done = u.projects.filter((p) => p.status === 'done' && p.updatedAt >= now - 7 * 86400000);
  const money = u.projects.reduce((n, p) => n + (p.pays || []).filter((x) => x.d >= from).reduce((m, x) => m + x.a, 0), 0);
  const dl = debtors(u), act = S.activeProjects(u), over = act.filter((p) => S.daysBetween(today, p.date) < 0).length;
  const meets = u.meetings.filter((m) => m.date >= from && m.date <= today && m.status !== 'cancelled').length;
  const upcoming = act.filter((p) => p.date > today && p.date <= next);
  if (!done.length && !money && !dl.length && !act.length && !meets) return null;
  const exp = S.expenseSum(S.expensesIn(u, from, today)), gl = S.goalLine(u, today);
  const parts = [P.wkTitle, [P.wkDone(done.length), P.wkMoney(S.money(money)), exp ? P.inExp(S.money(exp)) : '', exp ? P.inNet(S.money(money - exp)) : '', dl.length ? P.wkDebt(dl.length, S.money(debtSum(dl))) : '', P.wkActive(act.length, over), P.wkMeet(meets)].filter(Boolean).join('\n')];
  if (upcoming.length) parts.push(`${P.wkNext}\n${upcoming.slice(0, 6).map((p) => `• ${S.PICON[p.type]} <b>${esc(p.name)}</b> — ${esc(S.fmtWd(p.date, T))}`).join('\n')}`);
  if (gl) parts.push(gl);
  const rows = [[S.appBtn(T.openAppShort, '?tab=projects')]];
  if (dl.length) rows.unshift([{ text: P.bDebts, callback_data: 'pq:0' }]);
  return { text: parts.join('\n\n'), markup: { inline_keyboard: rows } };
}

/* ---------- yangi loyiha ---------- */
const typeButtons = (P) => ({ inline_keyboard: [S.PTYPES.slice(0, 2).map((t) => ({ text: `${S.PICON[t]} ${P.types[t]}`, callback_data: `pnt:${t}` })), S.PTYPES.slice(2).map((t) => ({ text: `${S.PICON[t]} ${P.types[t]}`, callback_data: `pnt:${t}` })), cancelRow(P)] });
function deadlineButtons(u) {
  const P = S.Tof(u).p;
  const opts = [3, 7, 14, 30];
  return { inline_keyboard: [opts.map((n) => ({ text: `+${n}`, callback_data: `pnd:${n}` })), cancelRow(P)] };
}
function parseMoney(text) {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(mln|million|млн|ming|тыс|k|m)\b/i);
  if (m) { const n = parseFloat(m[1].replace(',', '.')); return { value: Math.round(n * (/ming|тыс|k/i.test(m[2]) ? 1e3 : 1e6)), match: m[0] }; }
  const d = text.match(/(\d[\d\s]{3,})\s*(?:soʻm|so'm|сум|uzs)/i);
  if (d) return { value: parseInt(d[1].replace(/\s/g, ''), 10), match: d[0] };
  const plain = text.replace(/\s/g, '').match(/^\d{4,}$/);
  return plain ? { value: parseInt(plain[0], 10), match: text } : null;
}
function detectType(text) {
  if (/(^|[\s,])(sayt|сайт|site|website|veb|web|landing|lend)(?=[\s,.]|$)/i.test(text)) return 'site';
  if (/(^|[\s,])(bot|бот)(?=[\s,.]|$)/i.test(text)) return 'bot';
  if (/(video|видео|reels|reel|target|таргет|instagram|insta|инстаграм)/i.test(text)) return 'video';
  return null;
}
function parseProjectQuick(text, u) {
  let rest = text;
  const out = {};
  out.type = detectType(rest) || undefined;
  rest = rest.replace(/(?:mijoz|клиент|client|customer)\s*:?\s+([^,;\n]+)/i, (_, c) => { out.client = c.trim(); return ' '; });
  const mm = parseMoney(rest);
  if (mm && mm.match !== rest) { out.price = mm.value; rest = rest.replace(mm.match, ' '); }
  const r = S.parseQuick(rest, u.tz);
  if (r.found.date) out.date = r.date;
  out.name = (r.name || rest).replace(/^(sayt|сайт|site|bot|бот|video|видео|loyiha|проект|project)\s+/i, '').trim().slice(0, 120);
  if (!out.name) out.name = (r.name || '').trim();
  return out;
}
const startFlow = (chat, u, draft = {}) => { u.state = { kind: 'p', step: 'name', draft }; return proceed(chat, u); };
async function ask(chat, u, step) {
  const P = S.Tof(u).p; u.state.step = step;
  if (step === 'name') return send(chat, P.f.name, { inline_keyboard: [cancelRow(P)] });
  if (step === 'type') return send(chat, P.f.type, typeButtons(P));
  if (step === 'client') return send(chat, P.f.client, { inline_keyboard: [[{ text: P.skip, callback_data: 'pk' }], cancelRow(P)] });
  if (step === 'deadline') return send(chat, P.f.deadline, deadlineButtons(u));
  return send(chat, P.f.price, { inline_keyboard: [[{ text: P.skip, callback_data: 'pk' }], cancelRow(P)] });
}
async function proceed(chat, u) {
  const st = u.state, d = st.draft, P = S.Tof(u).p;
  if (!d.name) return ask(chat, u, 'name');
  if (!d.type) return ask(chat, u, 'type');
  if (!st.asked) st.asked = [];
  if (!d.client && !st.asked.includes('client')) return ask(chat, u, 'client');
  if (!d.date) return ask(chat, u, 'deadline');
  if (d.price === undefined && !st.asked.includes('price')) return ask(chat, u, 'price');
  st.step = 'confirm';
  const prev = { ...d, id: 'x', status: 'new', time: '18:00', price: d.price ?? null, paid: null, contact: '', notes: '', tasks: [] };
  const n = S.planTasks(d.type, u.lang || 'uz', S.todayISO(u.tz), d.date).length;
  return send(chat, `${P.check}\n\n${S.projectText(S.cleanProject({ ...prev, tasks: [] }), u)}\n\n📋 ${n}`, { inline_keyboard: [[{ text: P.save, callback_data: 'pok' }, { text: P.cancel, callback_data: 'pno' }]] });
}
const skipStep = async (chat, u, step) => { u.state.asked = [...(u.state.asked || []), step]; if (step === 'price') u.state.draft.price = null; return proceed(chat, u); };
async function create(chat, u) {
  const d = u.state.draft, P = S.Tof(u).p;
  const tasks = S.planTasks(d.type, u.lang || 'uz', S.todayISO(u.tz), d.date);
  const p = S.cleanProject({ id: S.newId(), name: d.name, client: d.client || '', type: d.type, status: 'new', date: d.date, time: '18:00', price: d.price ?? null, paid: null, notes: '', tasks, createdAt: Date.now(), updatedAt: Date.now() });
  u.projects.push(p); u.state = null;
  return send(chat, `${P.created(tasks.length)}\n\n${S.projectText(p, u)}`, cardMarkup(p, u));
}
async function flowText(chat, u, text) {
  const P = S.Tof(u).p, st = u.state, d = st.draft;
  if (st.step === 'name') { d.name = text.slice(0, 120); const t = detectType(text); if (t && !d.type) d.type = t; return proceed(chat, u); }
  if (st.step === 'client') { d.client = text.slice(0, 100); return proceed(chat, u); }
  if (st.step === 'deadline') { const r = S.parseQuick(text, u.tz); if (!r.found.date) return send(chat, P.badDate, deadlineButtons(u)); d.date = r.date; return proceed(chat, u); }
  if (st.step === 'price') { const m = parseMoney(text); if (m) { d.price = m.value; st.asked.push('price'); return proceed(chat, u); } return send(chat, P.f.price, { inline_keyboard: [[{ text: P.skip, callback_data: 'pk' }], cancelRow(P)] }); }
  return send(chat, P.f.name);
}

/* ---------- xabar va tugma yo'naltirgichlari ---------- */
async function onMessage(chat, u, cmd, args, text) {
  const T = S.Tof(u);
  if (cmd === '/loyiha' || cmd === '/project') {
    if (args) { const d = parseProjectQuick(args, u); for (const k of Object.keys(d)) if (d[k] === undefined || d[k] === '') delete d[k]; await startFlow(chat, u, d); }
    else await startFlow(chat, u);
    return true;
  }
  if (cmd === '/loyihalar' || cmd === '/projects') { await showList({ chat }, u, 0); return true; }
  if (cmd === '/vazifalar' || cmd === '/tasks') { await showTasks({ chat }, u); return true; }
  if (cmd === '/qarz' || cmd === '/qarzlar' || cmd === '/debts') { await showDebts({ chat }, u); return true; }
  if (!cmd && u.state && u.state.kind === 'pay') {
    const p = find(u, u.state.pid), amount = text ? payAmount(text) : null;
    if (!p) { u.state = null; await send(chat, T.p.notFound); return true; }
    if (!amount) { await send(chat, T.p.payBad, { inline_keyboard: [cancelRow(T.p)] }); return true; }
    u.state = null; applyPayment(u, p, amount);
    await send(chat, `${T.p.payDone(S.money(amount), S.owed(p))}\n\n${S.projectText(p, u)}`, cardMarkup(p, u));
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'p') {
    if (u.state.step === 'confirm') { await send(chat, T.pressButtons); return true; }
    if (text) await flowText(chat, u, text); else await send(chat, T.pleaseText);
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'ptask') {
    const p = find(u, u.state.pid); u.state = null;
    if (!p || !text) { await send(chat, T.p.notFound); return true; }
    const items = text.split('\n').map((x) => x.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean).slice(0, 30).map((x) => ({ id: S.newId(), text: x.slice(0, 120), done: false, due: '' }));
    p.tasks.push(...items); p.updatedAt = Date.now();
    await send(chat, `${T.p.taskAdded(items.length)}\n\n${S.projectText(p, u)}`, cardMarkup(p, u));
    return true;
  }
  return false;
}

async function onCallback(ctx, u, act, a, b) {
  const T = S.Tof(u), P = T.p, chat = ctx.chat;
  let toast = '';
  if (act === 'pl') await showList(ctx, u, Number(a) || 0);
  else if (act === 'pj') await showCard(ctx, u, a);
  else if (act === 'ptd') await showTasks(ctx, u);
  else if (act === 'pt' || act === 'pu') {
    const p = find(u, a), i = Number(b);
    if (p && p.tasks[i]) { p.tasks[i].done = !p.tasks[i].done; p.updatedAt = Date.now(); if (p.status === 'new') p.status = 'work'; }
    if (act === 'pu') await showTasks(ctx, u); else await showCard(ctx, u, a);
  } else if (act === 'ps') {
    const p = find(u, a);
    if (p && S.PSTATUS.includes(b)) { p.status = b; p.updatedAt = Date.now(); toast = P.statusSet(P.status[b]); }
    await showCard(ctx, u, a);
  } else if (act === 'pd') {
    const p = find(u, a), n = Number(b) || 1;
    if (p) { const today = S.todayISO(u.tz); p.date = S.addDaysISO(p.date < today ? today : p.date, n); p.r = undefined; p.updatedAt = Date.now(); toast = P.deadlineMoved(S.fmtShort(p.date, T)); }
    await showCard(ctx, u, a);
  } else if (act === 'pr' || act === 'prx') {
    const p = find(u, a);
    if (p) {
      const st = S.openStore();
      if (act === 'prx') { await S.reportLink(st, u, a, true); await send(chat, P.reportOff); }
      else { const link = await S.reportLink(st, u, a); await send(chat, P.reportMsg(esc(p.name), link), { inline_keyboard: [[{ text: P.reportRevoke, callback_data: `prx:${a}` }]] }); }
    }
  } else if (act === 'pp') {
    const p = find(u, a);
    if (p) { u.state = { kind: 'pay', pid: a }; await send(chat, P.payAsk(esc(p.name), S.owed(p) > 0 ? S.money(S.owed(p)) : ''), { inline_keyboard: [cancelRow(P)] }); }
  } else if (act === 'ppf') {
    const p = find(u, a), left = p ? S.owed(p) : 0;
    if (p && left > 0) { applyPayment(u, p, left); toast = P.payDone(S.money(left), 0).replace(/<[^>]+>/g, '').split('\n')[0]; }
    await showCard(ctx, u, a);
  } else if (act === 'pq') await showDebts(ctx, u);
  else if (act === 'pa') {
    if (find(u, a)) { u.state = { kind: 'ptask', pid: a }; await send(chat, P.addTaskAsk, { inline_keyboard: [cancelRow(P)] }); }
  } else if (act === 'px') {
    const p = find(u, a);
    if (!p) await show(ctx, P.notFound); else await show(ctx, `${P.delAsk}\n\n${S.PICON[p.type]} <b>${esc(p.name)}</b>\n${P.delWarn}`, { inline_keyboard: [[{ text: P.delYes, callback_data: `pxy:${a}` }, { text: P.no, callback_data: `pj:${a}` }]] });
  } else if (act === 'pxy') {
    u.projects = u.projects.filter((p) => p.id !== a); u.pdeleted[a] = Date.now();
    await show(ctx, P.deleted, { inline_keyboard: [[{ text: P.backList, callback_data: 'pl:0' }]] });
  } else if (act === 'pn') await startFlow(chat, u);
  else if (act === 'pno') { u.state = null; await show(ctx, T.cancelled, { inline_keyboard: [] }); }
  else if (act === 'pnt' && u.state && u.state.kind === 'p') { u.state.draft.type = a; await proceed(chat, u); }
  else if (act === 'pnd' && u.state && u.state.kind === 'p') { u.state.draft.date = S.addDaysISO(S.todayISO(u.tz), Number(a) || 7); await proceed(chat, u); }
  else if (act === 'pk' && u.state && u.state.kind === 'p') { await skipStep(chat, u, u.state.step); }
  else if (act === 'pok' && u.state && u.state.kind === 'p' && u.state.step === 'confirm') { await create(chat, u); toast = T.savedToast; }
  else toast = T.stageDone;
  return toast;
}

/* ---------- eslatmalar (har daqiqa) ---------- */
async function remind(u, now) {
  const T = S.Tof(u), P = T.p, loc = S.localNow(u.tz, now), hhmm = S.hhmmOfLocal(loc), today = S.isoOfLocal(loc);
  let dirty = false, sent = 0;
  if (u.remind && !S.inQuiet(u, hhmm)) {
    for (const p of u.projects) {
      if (p.status === 'done') continue;
      const d = S.daysBetween(today, p.date), r = p.r || (p.r = {});
      let msg = null, mark = null;
      if (d < 0) { if (r.over !== today && hhmm >= '09:00' && d >= -30) { msg = P.remOver(esc(p.name), -d); r.over = today; mark = 'over'; } }
      else if (d === 0) { if (!r.d0 && hhmm >= '08:00') { msg = P.rem0(esc(p.name)); r.d0 = r.d1 = r.d3 = true; } }
      else if (d === 1) { if (!r.d1 && hhmm >= '09:00') { msg = P.rem1(esc(p.name)); r.d1 = r.d3 = true; } }
      else if (d <= 3) { if (!r.d3 && hhmm >= '09:00') { msg = P.rem3(esc(p.name), d); r.d3 = true; } }
      if (!msg) continue;
      const rows = [[{ text: '📂', callback_data: `pj:${p.id}` }, { text: P.bPlus(1), callback_data: `pd:${p.id}:1` }, { text: `${S.SICON.done} ${P.status.done}`, callback_data: `ps:${p.id}:done` }]];
      const res = await S.tg('sendMessage', { chat_id: u.chat, text: `${msg}\n\n${S.projectText(p, u, now)}`, parse_mode: 'HTML', reply_markup: { inline_keyboard: rows }, disable_web_page_preview: true });
      dirty = true; if (res.ok) sent += 1;
    }
  }
  // To'lov qoldig'i: tayyor yoki muddati o'tgan loyiha bo'yicha har 3 kunda, ko'pi bilan 6 marta
  if (u.remind && !S.inQuiet(u, hhmm) && hhmm >= '10:00') {
    for (const p of u.projects) {
      if (S.owed(p) <= 0 || !(p.status === 'done' || p.date < today)) continue;
      const r = p.r || (p.r = {});
      if ((r.payN || 0) >= 6 || (r.pay && S.daysBetween(r.pay, today) < 3)) continue;
      r.pay = today; r.payN = (r.payN || 0) + 1; dirty = true;
      const rows = [[{ text: P.bPay, callback_data: `pp:${p.id}` }, { text: P.bPayFull, callback_data: `ppf:${p.id}` }]];
      const res = await S.tg('sendMessage', { chat_id: u.chat, text: `${P.payRem(esc(p.name), S.money(S.owed(p)))}\n\n${S.projectText(p, u, now)}`, parse_mode: 'HTML', reply_markup: { inline_keyboard: rows }, disable_web_page_preview: true });
      if (res.ok) sent += 1;
    }
  }
  // Ertalabki karta: tanlangan vaqtdan keyingi 2 soat ichida bir marta (har kuni)
  for (const [kind, build, onlyDay] of [['b', briefMessage, null], ['w', weeklyMessage, 6]]) {
    const at = u.digest && u.digest[kind];
    if (!at || u.dsent[kind] === today) continue;
    if (onlyDay !== null && S.weekdayIdx(today) !== onlyDay) continue;
    const since = S.toMin(hhmm) - S.toMin(at);
    if (since < 0 || since > 120) continue;
    u.dsent[kind] = today; dirty = true;
    const v = build(u, now);
    if (!v) continue;
    const res = await S.tg('sendMessage', { chat_id: u.chat, text: v.text, parse_mode: 'HTML', reply_markup: v.markup, disable_web_page_preview: true });
    if (res.ok) sent += 1;
  }
  return { dirty, sent };
}

module.exports = { onMessage, onCallback, remind, showList, showTasks, tasksView, showDebts, briefMessage, weeklyMessage, applyPayment, payAmount, ACTS: ['pl', 'pj', 'pt', 'pu', 'ps', 'pd', 'pa', 'px', 'pxy', 'pn', 'pno', 'pnt', 'pnd', 'pk', 'pok', 'ptd', 'pp', 'ppf', 'pq', 'pr', 'prx'] };
