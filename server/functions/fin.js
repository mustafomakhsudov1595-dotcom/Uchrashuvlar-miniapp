'use strict';
// Oylik toʻlovlar (obunalar), mijozlar bazasi, daromad hisoboti va CSV eksport
const S = require('./_shared');
const proj = require('./proj');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text, parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));
const findSub = (u, id) => u.subs.find((x) => x.id === id);
const who = (x) => esc([x.client, x.name].filter(Boolean).join(' · '));
const cancelRow = (P) => [{ text: P.cancel, callback_data: 'sno' }];

/* ---------- oylik toʻlovlar ---------- */
function subStatus(x, today, P) {
  if (!x.active) return P.stPause;
  return x.last === today.slice(0, 7) ? P.stPaid : S.subDue(x, today) ? P.stDue : P.stWait(x.day);
}
async function showSubs(ctx, u) {
  const T = S.Tof(u), P = T.p, today = S.todayISO(u.tz);
  const list = [...u.subs].sort((a, b) => a.day - b.day);
  let text = P.subTitle(list.filter((x) => x.active).length, S.money(S.subsMonthly(u)));
  if (!list.length) text += `\n\n${P.subNone}`;
  else text += '\n\n' + list.map((x) => P.subLine(subStatus(x, today, P), who(x), S.money(x.amount))).join('\n');
  const rows = list.slice(0, 12).map((x) => [{ text: `${S.subDue(x, today) ? '⏳' : x.active && x.last === today.slice(0, 7) ? '✅' : '🔁'} ${[x.client, x.name].filter(Boolean).join(' · ')} · ${S.money(x.amount)}`.slice(0, 60), callback_data: `sj:${x.id}` }]);
  rows.push([{ text: P.subAdd, callback_data: 'sa' }, { text: P.backList, callback_data: 'pl:0' }]);
  return show(ctx, text, { inline_keyboard: rows });
}
async function showSub(ctx, u, id) {
  const T = S.Tof(u), P = T.p, x = findSub(u, id), today = S.todayISO(u.tz);
  if (!x) return showSubs(ctx, u);
  const total = (x.pays || []).reduce((n, y) => n + y.a, 0);
  const rows = [];
  if (x.active && x.last !== today.slice(0, 7)) rows.push([{ text: P.bSubPaid, callback_data: `sp:${x.id}` }]);
  rows.push([{ text: x.active ? P.bSubPause : P.bSubResume, callback_data: `sg:${x.id}` }, { text: P.bSubDel, callback_data: `sx:${x.id}` }]);
  rows.push([{ text: P.back, callback_data: 'sl:0' }]);
  return show(ctx, P.subCard({ ...x, name: esc(x.name), client: esc(x.client) }, subStatus(x, today, P), total), { inline_keyboard: rows });
}
function parseSub(text) {
  const parts = text.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
  let client = '', name, amount, day;
  if (parts.length >= 4) [client, name, amount, day] = parts;
  else if (parts.length === 3) [name, amount, day] = parts;
  else return null;
  const a = proj.payAmount(amount), d = parseInt(day, 10);
  if (!name || !a || !(d >= 1 && d <= 31)) return null;
  return S.cleanSub({ id: S.newId(), name, client, amount: a, day: Math.min(d, 28), active: true, createdAt: Date.now(), updatedAt: Date.now() });
}

/* ---------- mijozlar ---------- */
async function showClients(ctx, u) {
  const P = S.Tof(u).p, list = S.clientsOf(u);
  let text = P.clTitle(list.length);
  if (!list.length) text += `\n\n${P.clNone}`;
  else text += '\n\n' + list.slice(0, 20).map((c) => `👤 <b>${esc(c.name)}</b> — 📁 ${c.projects.length}${c.owed ? ` · 🧾 ${S.money(c.owed)}` : ''}${c.monthly ? ` · 🔁 ${S.money(c.monthly)}` : ''}`).join('\n');
  const rows = list.slice(0, 12).map((c) => [{ text: `👤 ${c.name}${c.owed ? ' · 🧾 ' + S.money(c.owed) : ''}`.slice(0, 60), callback_data: `cj:${S.clientHash(c.key)}` }]);
  rows.push([{ text: P.backList, callback_data: 'pl:0' }]);
  return show(ctx, text, { inline_keyboard: rows });
}
async function showClient(ctx, u, h) {
  const T = S.Tof(u), P = T.p, today = S.todayISO(u.tz), c = S.clientsOf(u).find((x) => S.clientHash(x.key) === h);
  if (!c) return showClients(ctx, u);
  const text = P.clCard({ ...c, name: esc(c.name), contact: esc(c.contact) });
  const rows = c.projects.slice(-8).reverse().map((p) => [{ text: `${S.PICON[p.type]} ${p.name} · ${S.deadlineTag(p, today, T).replace(/<[^>]+>/g, '')}${S.owed(p) ? ' · 🧾 ' + S.money(S.owed(p)) : ''}`.slice(0, 60), callback_data: `pj:${p.id}` }]);
  for (const x of c.subs.slice(0, 4)) rows.push([{ text: `🔁 ${x.name} · ${S.money(x.amount)}`.slice(0, 60), callback_data: `sj:${x.id}` }]);
  rows.push([{ text: P.back, callback_data: 'cl:0' }]);
  return show(ctx, text, { inline_keyboard: rows });
}

/* ---------- daromad ---------- */
async function showIncome(ctx, u) {
  const T = S.Tof(u), P = T.p, today = S.todayISO(u.tz), months = S.incomeByMonth(u, 6, today), cur = months[months.length - 1];
  const max = Math.max(1, ...months.map((x) => x.total)), name = (ym) => T.months[Number(ym.slice(5)) - 1];
  let text = `${P.inTitle}\n\n`;
  if (!months.some((x) => x.total)) text += P.inNone;
  else {
    text += months.map((x) => `<code>${name(x.m).slice(0, 4).padEnd(4)}</code> ${S.barText(x.total, max, 8)} ${S.money(x.total)}`).join('\n');
    text += `\n\n${P.inMonth(name(cur.m), S.money(cur.total))}`;
    const kinds = Object.entries(cur.k).filter(([, v]) => v > 0);
    if (kinds.length) text += '\n' + kinds.map(([k, v]) => `   ${P.inKinds[k]}: ${S.money(v)}`).join('\n');
    text += `\n${P.inAvg(S.money(months.reduce((n, x) => n + x.total, 0) / 6))}`;
    if (cur.exp) text += `\n${P.inExp(S.money(cur.exp))}\n${P.inNet(S.money(cur.total - cur.exp))}`;
  }
  const debt = S.activeDebt(u);
  if (debt) text += `\n${P.inDebt(S.money(debt))}`;
  if (S.subsMonthly(u)) text += `\n${P.inMonthly(S.money(S.subsMonthly(u)))}`;
  const gl = S.goalLine(u, today);
  if (gl) text += `\n\n${gl}`;
  text += `\n\n<i>${P.inNote}</i>`;
  return show(ctx, text, { inline_keyboard: [[{ text: P.bExport, callback_data: 'ex:0' }, { text: '📄 PDF', callback_data: 'rp:1' }, { text: P.bExpenses, callback_data: 'xl:0' }, { text: '🎯', callback_data: 'gl:0' }], [{ text: P.bDebts, callback_data: 'pq:0' }, { text: P.backList, callback_data: 'pl:0' }]] });
}

/* ---------- CSV eksport (Excel) ---------- */
const csvCell = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows) => '\uFEFF' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
async function sendDoc(chat, name, content, caption, mime = 'text/csv') {
  const fd = new FormData();
  fd.append('chat_id', String(chat)); if (caption) fd.append('caption', caption);
  fd.append('document', new Blob([content], { type: mime }), name);
  const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendDocument`, { method: 'POST', body: fd });
  return r.json().catch(() => ({}));
}
async function sendReport(chat, u, cur) {
  const today = S.todayISO(u.tz), ym = cur ? today.slice(0, 7) : S.prevYM(today.slice(0, 7), 1);
  const r = require('./pdf').report(u, ym);
  const P = S.Tof(u).p;
  const res = await sendDoc(chat, r.name, r.pdf, P.rpCap(ym, S.money(r.income), S.money(r.expense), S.money(r.income - r.expense)), 'application/pdf');
  if (!res.ok) await send(chat, P.rpFail);
}
async function exportCsv(chat, u) {
  const T = S.Tof(u), P = T.p;
  if (!u.projects.length && !u.subs.length && !u.expenses.length && !u.services.length && !u.payables.length) return send(chat, P.exEmpty);
  const projects = [['Loyiha', 'Mijoz', 'Aloqa', 'Turi', 'Holat', 'Muddat', 'Narx', 'Toʻlandi', 'Qoldiq', 'Vazifalar']];
  for (const p of u.projects) projects.push([p.name, p.client, p.contact, T.p.types[p.type], T.p.status[p.status], p.date, p.price ?? '', p.paid ?? '', S.owed(p), `${p.tasks.filter((t) => t.done).length}/${p.tasks.length}`]);
  const pays = [['Sana', 'Summa', 'Manba', 'Mijoz', 'Tur']];
  for (const p of u.projects) for (const x of p.pays || []) pays.push([x.d, x.a, p.name, p.client, T.p.types[p.type]]);
  for (const s of u.subs) for (const x of s.pays || []) pays.push([x.d, x.a, s.name, s.client, P.inKinds.sub.replace(/^\S+\s/, '')]);
  pays.slice(1).sort((a, b) => (a[0] < b[0] ? 1 : -1)).forEach((r, i) => { pays[i + 1] = r; });
  const subs = [['Mijoz', 'Xizmat', 'Oyiga', 'Kun', 'Holat']];
  for (const s of u.subs) subs.push([s.client, s.name, s.amount, s.day, s.active ? 'faol' : 'toʻxtatilgan']);
  await sendDoc(chat, 'loyihalar.csv', csv(projects), P.exCaption);
  if (pays.length > 1) await sendDoc(chat, 'tolovlar.csv', csv(pays));
  if (subs.length > 1) await sendDoc(chat, 'oylik.csv', csv(subs));
  if (u.payables.length) await sendDoc(chat, 'tolash.csv', csv([['Kimga', 'Nima uchun', 'Summa', 'Toʻlandi', 'Qoldi', 'Muddat', 'Takror'], ...u.payables.map((x) => [x.who, x.note, x.amount, x.paid, S.payLeft(x), x.due, x.repeat ? 'oylik' : ''])]));
  if (u.services.length) await sendDoc(chat, 'servis.csv', csv([['Sayt', 'Mijoz', 'Telefon', 'Sayt havolasi', 'Claude havolasi', 'Topshirilgan', 'Servis tugaydi'], ...u.services.map((x) => [x.name, x.client, x.phone, x.url, x.claudeUrl, x.doneAt, S.serviceEnd(x)])]));
  if (u.expenses.length) await sendDoc(chat, 'xarajatlar.csv', csv([['Sana', 'Summa', 'Tur', 'Izoh', 'Loyiha'], ...u.expenses.map((x) => [x.d, x.a, P.exCats[x.cat].replace(/^\S+\s/, ''), x.note, (u.projects.find((p) => p.id === x.pid) || {}).name || ''])]));
}

/* ---------- yoʻnaltirgichlar ---------- */
async function onMessage(chat, u, cmd, args, text) {
  const P = S.Tof(u).p;
  if (cmd === '/obuna' || cmd === '/obunalar' || cmd === '/oylik') {
    if (args) {
      const x = parseSub(args);
      if (!x) { await send(chat, P.subBad); return true; }
      u.subs.push(x); await send(chat, P.subSaved); await showSubs({ chat }, u);
    } else await showSubs({ chat }, u);
    return true;
  }
  if (cmd === '/mijozlar' || cmd === '/clients') { await showClients({ chat }, u); return true; }
  if (cmd === '/daromad' || cmd === '/income') { await showIncome({ chat }, u); return true; }
  if (cmd === '/hisobot' || cmd === '/report') { await send(chat, P.rpAsk, { inline_keyboard: [[{ text: P.rpPrev, callback_data: 'rp:0' }, { text: P.rpCur, callback_data: 'rp:1' }]] }); return true; }
  if (cmd === '/eksport' || cmd === '/export') { await exportCsv(chat, u); return true; }
  if (!cmd && u.state && u.state.kind === 'sub') {
    const x = text ? parseSub(text) : null;
    if (!x) { await send(chat, P.subBad, { inline_keyboard: [cancelRow(P)] }); return true; }
    u.state = null; u.subs.push(x); await send(chat, P.subSaved); await showSubs({ chat }, u);
    return true;
  }
  return false;
}
async function onCallback(ctx, u, act, a) {
  const P = S.Tof(u).p, today = S.todayISO(u.tz);
  let toast = '';
  if (act === 'sl') await showSubs(ctx, u);
  else if (act === 'sj') await showSub(ctx, u, a);
  else if (act === 'sa') { u.state = { kind: 'sub' }; await send(ctx.chat, P.subAsk, { inline_keyboard: [cancelRow(P)] }); }
  else if (act === 'sno') { u.state = null; await show(ctx, S.Tof(u).cancelled, { inline_keyboard: [] }); }
  else if (act === 'sp') { const x = findSub(u, a); if (x) { S.paySub(x, today); toast = P.subPaidToast; } await showSub(ctx, u, a); }
  else if (act === 'sg') { const x = findSub(u, a); if (x) { x.active = !x.active; x.updatedAt = Date.now(); x.r = undefined; } await showSub(ctx, u, a); }
  else if (act === 'sx') { const x = findSub(u, a); if (x) await show(ctx, `${P.subDelAsk}\n\n<b>${who(x)}</b>`, { inline_keyboard: [[{ text: P.delYes, callback_data: `sxy:${a}` }, { text: P.no, callback_data: `sj:${a}` }]] }); }
  else if (act === 'sxy') { u.subs = u.subs.filter((x) => x.id !== a); u.sdeleted[a] = Date.now(); await show(ctx, P.subDeleted, { inline_keyboard: [[{ text: P.back, callback_data: 'sl:0' }]] }); }
  else if (act === 'cl') await showClients(ctx, u);
  else if (act === 'cj') await showClient(ctx, u, a);
  else if (act === 'in') await showIncome(ctx, u);
  else if (act === 'ex') { await exportCsv(ctx.chat, u); }
  else if (act === 'rp') { await sendReport(ctx.chat, u, a === '1'); return '📄'; }
  return toast;
}

/* ---------- eslatma: oylik toʻlov kuni (har daqiqa chaqiriladi) ---------- */
async function remind(u, now) {
  const P = S.Tof(u).p, loc = S.localNow(u.tz, now), hhmm = S.hhmmOfLocal(loc), today = S.isoOfLocal(loc);
  let dirty = false, sent = 0;
  if (!u.remind || S.inQuiet(u, hhmm) || hhmm < '09:00') return { dirty, sent };
  if (today.slice(8) === '01' && hhmm >= '09:30' && hhmm < '13:00' && u.digest && u.digest.r !== null && u.dsent.r !== today.slice(0, 7) && (u.projects.length || u.subs.length || u.expenses.length)) {
    u.dsent.r = today.slice(0, 7); dirty = true;
    try { await sendReport(u.chat, u, false); sent += 1; } catch (e) { console.error('report', e.message); }
  }
  for (const x of S.subsDue(u, today)) {
    const r = x.r || (x.r = {});
    if (r.ym !== today.slice(0, 7)) { r.ym = today.slice(0, 7); r.n = 0; r.d = ''; }
    if (r.n >= 3 || (r.d && S.daysBetween(r.d, today) < 2)) continue;
    r.n += 1; r.d = today; dirty = true;
    const res = await send(u.chat, P.subRem(who(x), S.money(x.amount), x.day), { inline_keyboard: [[{ text: P.bSubPaid, callback_data: `sp:${x.id}` }, { text: P.bSubPause, callback_data: `sg:${x.id}` }]] });
    if (res.ok) sent += 1;
  }
  return { dirty, sent };
}

module.exports = { sendDoc, csv, onMessage, onCallback, remind, showSubs, showClients, showIncome, exportCsv, parseSub, ACTS: ['sl', 'sj', 'sa', 'sno', 'sp', 'sg', 'sx', 'sxy', 'cl', 'cj', 'in', 'ex', 'rp'] };
