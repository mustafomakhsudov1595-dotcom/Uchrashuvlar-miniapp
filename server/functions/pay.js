'use strict';
// Toʻlash kerak: kimga, qachon, qancha — roʻyxat, hisob-kitob, eslatmalar, oylik takrorlanish
const S = require('./_shared');
const proj = require('./proj');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text, parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));
const find = (u, id) => u.payables.find((x) => x.id === id);
const cancelRow = (P) => [{ text: P.cancel, callback_data: 'pno' }];
const fmtD = (iso) => `${iso.slice(8)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

function tag(x, today, P) {
  const d = S.daysBetween(today, x.due);
  return d < 0 ? P.pvOverdue(-d) : d === 0 ? P.pvToday : d === 1 ? P.pvTomorrow : P.pvIn(d);
}

/* ---------- roʻyxat va hisob ---------- */
async function showList(ctx, u) {
  const P = S.Tof(u).p, today = S.todayISO(u.tz), sm = S.paySummary(u, today), d7 = S.addDaysISO(today, 7);
  let text = P.pvTitle(sm.open.length, sm.total);
  if (!sm.open.length) text += `\n\n${P.pvNone}`;
  else {
    const groups = [['over', sm.open.filter((x) => x.due < today)], ['today', sm.open.filter((x) => x.due === today)], ['week', sm.open.filter((x) => x.due > today && x.due <= d7)], ['later', sm.open.filter((x) => x.due > d7)]];
    for (const [k, list] of groups) {
      if (!list.length) continue;
      text += `\n\n${P.pvGroups[k]}\n${list.slice(0, 8).map((x) => P.pvLine(esc(x.who), esc(x.note), S.payLeft(x), tag(x, today, P))).join('\n')}`;
    }
  }
  const rows = sm.open.slice(0, 8).map((x) => [{ text: `${x.due < today ? '⚠️' : x.due === today ? '📌' : '💸'} ${x.who} · ${S.money(S.payLeft(x))} · ${tag(x, today, P)}`.slice(0, 60), callback_data: `zj:${x.id}` }]);
  rows.push([{ text: P.bPvAdd, callback_data: 'za:0' }, { text: P.bPvSum, callback_data: 'zh:0' }]);
  rows.push([{ text: P.backList, callback_data: 'pl:0' }]);
  return show(ctx, text.slice(0, 3900), { inline_keyboard: rows });
}
async function showSummary(ctx, u) {
  const P = S.Tof(u).p, today = S.todayISO(u.tz), s = S.paySummary(u, today), m = S.money;
  let text = `${P.pvSumTitle}\n\n${P.pvSumTotal}: <b>${m(s.total)}</b>`;
  if (s.overdue) text += `\n⚠️ ${P.pvSumOver}: <b>${m(s.overdue)}</b>`;
  text += `\n📌 ${P.pvSumToday}: ${m(s.today)} · 🗓 ${P.pvSumWeek}: ${m(s.week)}\n📅 ${P.pvSumMonth}: ${m(s.month)}`;
  if (s.byWho.length) text += `\n\n<b>${P.pvSumWho}:</b>\n${s.byWho.slice(0, 10).map(([w, a]) => `• ${esc(w)} — ${m(a)}`).join('\n')}`;
  text += `\n\n${P.pvForecast}\n${P.pvInflow}: <b>${m(s.inflow)}</b>\n${P.pvOut30}: <b>${m(s.out30)}</b>\n${P.pvBalance}: <b>${s.balance < 0 ? '−' : ''}${m(Math.abs(s.balance))}</b> ${s.balance >= 0 ? P.pvEnough : P.pvShort}`;
  return show(ctx, text, { inline_keyboard: [[{ text: P.bPvList, callback_data: 'zl:0' }, { text: P.bPvAdd, callback_data: 'za:0' }]] });
}

/* ---------- karta ---------- */
function cardText(x, u) {
  const P = S.Tof(u).p, today = S.todayISO(u.tz);
  let t = P.pvCard({ ...x, who: esc(x.who), note: esc(x.note) }, S.payLeft(x), S.payLeft(x) ? tag(x, today, P) : '✅');
  if (x.pays.length) t += `\n\n${P.pvHist}\n${x.pays.slice(-5).map((y) => `• ${fmtD(y.d)} — ${S.money(y.a)}`).join('\n')}`;
  return t;
}
function cardMarkup(x, u) {
  const P = S.Tof(u).p, left = S.payLeft(x), rows = [];
  if (left > 0) rows.push([{ text: P.bPvPaid(left), callback_data: `zp:${x.id}` }, { text: P.bPvPart, callback_data: `zq:${x.id}` }]);
  if (left > 0) rows.push([{ text: P.bPvSnooze, callback_data: `zs:${x.id}` }]);
  rows.push([{ text: x.repeat ? P.bPvRepOff : P.bPvRepOn, callback_data: `zm:${x.id}` }]);
  if (x.pays.length) rows.push([{ text: P.bPvUndo, callback_data: `zu:${x.id}` }]);
  rows.push([{ text: P.bPvDel, callback_data: `zx:${x.id}` }, { text: P.bPvList, callback_data: 'zl:0' }]);
  return { inline_keyboard: rows };
}
async function showCard(ctx, u, id) {
  const x = find(u, id);
  if (!x) return showList(ctx, u);
  return show(ctx, cardText(x, u), cardMarkup(x, u));
}

/* ---------- yozuvdan ajratish ---------- */
const REPEAT_RE = /^(oylik|har\s*oy|har oyning|monthly|every month|ежемесячно|каждый месяц)/i;
function parsePayable(text, u) {
  const today = S.todayISO(u.tz), parts = text.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
  let amount = null, due = '', repeat = '', free = [];
  for (const p of parts) {
    if (REPEAT_RE.test(p)) { repeat = 'month'; continue; }
    const dm = p.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/);
    if (dm && +dm[1] >= 1 && +dm[1] <= 31 && +dm[2] >= 1 && +dm[2] <= 12) {
      let y = dm[3] ? +dm[3] : +today.slice(0, 4); if (y < 100) y += 2000;
      let iso = `${y}-${String(dm[2]).padStart(2, '0')}-${String(dm[1]).padStart(2, '0')}`;
      if (!dm[3] && S.daysBetween(iso, today) > 60) iso = `${y + 1}-${iso.slice(5)}`; // yil yozilmagan va 2 oydan koʻp oʻtgan boʻlsa — kelasi yil
      due = iso; continue;
    }
    const day = p.match(/^(\d{1,2})(?:-?(?:sana|si|chi|kuni|число|th|st|nd|rd))?$/i);
    if (day && +day[1] >= 1 && +day[1] <= 31) {
      const dd = String(+day[1]).padStart(2, '0'); let iso = `${today.slice(0, 8)}${dd}`;
      if (iso < today) iso = S.addMonthsISO(`${today.slice(0, 8)}01`, 1).slice(0, 8) + dd;
      due = iso; continue;
    }
    const pq = S.parseQuick(p, u.tz);
    if (pq.found && pq.found.date && !/\d{4,}/.test(p) && p.length < 25) { due = pq.date; continue; }
    if (amount === null && /\d/.test(p) && !/[a-zа-яё]{4,}/i.test(p.replace(/mln|million|ming|тыс|млн|so.?m|сум|uzs/gi, ''))) { const a = proj.payAmount(p); if (a) { amount = a; continue; } }
    free.push(p);
  }
  if (!free.length || !amount) return null;
  const now = Date.now();
  return S.cleanPayable({ id: S.newId(), who: free[0], note: free.slice(1).join(', '), amount, due: due || today, repeat, createdAt: now, updatedAt: now });
}

/* ---------- yoʻnaltirgichlar ---------- */
async function onMessage(chat, u, cmd, args, text) {
  const P = S.Tof(u).p;
  if (cmd === '/tolash' || cmd === '/tolovlar' || cmd === '/majburiyat' || cmd === '/payables') {
    if (args) {
      const x = parsePayable(args, u);
      if (!x) { await send(chat, P.pvBad); return true; }
      u.payables.push(x); await send(chat, P.pvSaved); await showCard({ chat }, u, x.id); return true;
    }
    await showList({ chat }, u); return true;
  }
  if (!cmd && u.state && u.state.kind === 'padd') {
    const x = text ? parsePayable(text, u) : null;
    if (!x) { await send(chat, P.pvBad, { inline_keyboard: [cancelRow(P)] }); return true; }
    u.state = null; u.payables.push(x); await send(chat, P.pvSaved); await showCard({ chat }, u, x.id); return true;
  }
  if (!cmd && u.state && u.state.kind === 'ppart') {
    const x = find(u, u.state.id), a = text ? proj.payAmount(text) : null;
    if (!x) { u.state = null; return true; }
    if (!a) { await send(chat, P.pvPartBad, { inline_keyboard: [cancelRow(P)] }); return true; }
    u.state = null; await doPay(chat, u, x, a); return true;
  }
  return false;
}
async function doPay(chat, u, x, amount) {
  const P = S.Tof(u).p, got = S.applyPayment(u, x, amount, S.todayISO(u.tz));
  let t = P.pvPaidMsg(got, S.payLeft(x));
  const nx = x.nextId && find(u, x.nextId);
  if (nx) t += `\n${P.pvNext(fmtD(nx.due))}`;
  await send(chat, t, { inline_keyboard: [[{ text: P.bPvOpen, callback_data: `zj:${x.id}` }, { text: P.bPvList, callback_data: 'zl:0' }]] });
}
async function onCallback(ctx, u, act, a) {
  const P = S.Tof(u).p, chat = ctx.chat, x = find(u, a);
  if (act === 'zl') await showList(ctx, u);
  else if (act === 'zh') await showSummary(ctx, u);
  else if (act === 'zj') await showCard(ctx, u, a);
  else if (act === 'za') { u.state = { kind: 'padd' }; await send(chat, P.pvAsk, { inline_keyboard: [cancelRow(P)] }); }
  else if (act === 'zp') { if (x && S.payLeft(x) > 0) { await doPay(chat, u, x, S.payLeft(x)); return '✅'; } }
  else if (act === 'zq') { if (x) { u.state = { kind: 'ppart', id: a }; await send(chat, P.pvPartAsk(esc(x.who), S.payLeft(x)), { inline_keyboard: [cancelRow(P)] }); } }
  else if (act === 'zs') { if (x) { x.due = S.addDaysISO(x.due < S.todayISO(u.tz) ? S.todayISO(u.tz) : x.due, 3); x.updatedAt = Date.now(); x.r = undefined; await showCard(ctx, u, a); return P.pvSnoozed(fmtD(x.due)); } }
  else if (act === 'zu') { if (x && S.undoPayment(u, x)) { await showCard(ctx, u, a); return P.pvUndone; } }
  else if (act === 'zm') { if (x) { x.repeat = x.repeat ? '' : 'month'; x.updatedAt = Date.now(); await showCard(ctx, u, a); } }
  else if (act === 'zx') { if (x) await show(ctx, `${P.pvDelAsk}\n\n<b>${esc(x.who)}</b> — ${S.money(S.payLeft(x))}`, { inline_keyboard: [[{ text: P.delYes, callback_data: `zxy:${a}` }, { text: P.no, callback_data: `zj:${a}` }]] }); }
  else if (act === 'zxy') { u.payables = u.payables.filter((p) => p.id !== a); u.pvdeleted[a] = Date.now(); await show(ctx, P.pvDeleted, { inline_keyboard: [[{ text: P.bPvList, callback_data: 'zl:0' }]] }); }
  return '';
}

/* ---------- ertalabki karta va haftalik xulosa uchun ---------- */
function briefBlock(u, today) {
  const P = S.Tof(u).p, tomorrow = S.addDaysISO(today, 1);
  const list = S.payOpen(u).filter((x) => x.due <= tomorrow).slice(0, 6);
  if (!list.length) return '';
  return `${P.brPay}\n${list.map((x) => `• <b>${esc(x.who)}</b> — ${S.money(S.payLeft(x))} · ${tag(x, today, P)}`).join('\n')}`;
}
function weekBlock(u, today) {
  const P = S.Tof(u).p, d7 = S.addDaysISO(today, 7), list = S.payOpen(u).filter((x) => x.due <= d7);
  return list.length ? P.wkPay(list.reduce((n, x) => n + S.payLeft(x), 0), list.length) : '';
}

/* ---------- eslatma: 3 kun oldin, 1 kun oldin, kuni, keyin har kuni (cron) ---------- */
async function remind(u, now) {
  const P = S.Tof(u).p, loc = S.localNow(u.tz, now), hhmm = S.hhmmOfLocal(loc), today = S.isoOfLocal(loc);
  let dirty = false, sent = 0;
  if (!u.remind || S.inQuiet(u, hhmm) || hhmm < '09:00') return { dirty, sent };
  for (const x of S.payOpen(u)) {
    const d = S.daysBetween(today, x.due), kind = d === 3 ? 'd3' : d === 1 ? 'd1' : d === 0 ? 'd0' : d < 0 && d >= -14 ? 'o' : '';
    if (!kind) continue;
    const r = x.r || (x.r = {}), key = kind === 'o' ? `${today}:o` : `${x.due}:${kind}`;
    if ((r.k || []).includes(key)) continue;
    r.k = [...(r.k || []).filter((k) => k.startsWith(x.due) || k.endsWith(':o')).slice(-6), key]; dirty = true;
    const left = S.payLeft(x);
    const res = await send(u.chat, P.pvRem(kind, esc(x.who), esc(x.note), left, -d), { inline_keyboard: [[{ text: P.bPvPaid(left), callback_data: `zp:${x.id}` }, { text: P.bPvPart, callback_data: `zq:${x.id}` }], [{ text: P.bPvSnooze, callback_data: `zs:${x.id}` }, { text: P.bPvOpen, callback_data: `zj:${x.id}` }]] });
    if (res.ok) sent += 1;
  }
  return { dirty, sent };
}

module.exports = { onMessage, onCallback, remind, briefBlock, weekBlock, parsePayable, showList, ACTS: ['zl', 'zh', 'zj', 'za', 'zp', 'zq', 'zs', 'zu', 'zm', 'zx', 'zxy'] };
