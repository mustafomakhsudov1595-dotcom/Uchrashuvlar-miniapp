'use strict';
// Hisob-kitob: kirim / chiqim / foyda / kassa. /hisob (davr tanlash), /kirim (qoʻlda kirim), amallar daftari.
const S = require('./_shared');
const proj = require('./proj');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text: String(text).slice(0, 3900), parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text: String(text).slice(0, 3900), parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));
const tr = (u, o) => o[u.lang] || o.uz;
const PER = ['today', 'week', 'month', 'year', 'all'];
const PNAME = { today: { uz: 'Bugun', ru: 'Сегодня', en: 'Today' }, week: { uz: '7 kun', ru: '7 дней', en: '7 days' }, month: { uz: 'Oy', ru: 'Месяц', en: 'Month' }, year: { uz: 'Yil', ru: 'Год', en: 'Year' }, all: { uz: 'Hammasi', ru: 'Всё', en: 'All' } };
const KIND = { site: { uz: '🌐 Sayt', ru: '🌐 Сайты', en: '🌐 Sites' }, bot: { uz: '🤖 Bot', ru: '🤖 Боты', en: '🤖 Bots' }, video: { uz: '🎬 Video', ru: '🎬 Видео', en: '🎬 Video' }, sub: { uz: '🔁 Oylik', ru: '🔁 Ежемесячные', en: '🔁 Monthly' }, other: { uz: '📦 Boshqa', ru: '📦 Другое', en: '📦 Other' } };

function range(p, today) {
  if (p === 'today') return [today, today];
  if (p === 'week') return [S.addDaysISO(today, -6), today];
  if (p === 'month') return [`${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`];
  if (p === 'year') return [`${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`];
  return ['0000-01-01', '9999-12-31'];
}
const sum = (l) => l.reduce((n, x) => n + x.a, 0);
const fm = (n) => `${n < 0 ? '−' : ''}${S.money(Math.abs(n))}`;

function stats(u, p, today) {
  const [f, t] = range(p, today), list = S.ledger(u, f, t), all = S.ledger(u);
  const ins = list.filter((x) => x.dir === 'in'), outs = list.filter((x) => x.dir === 'out');
  const by = (l, key) => { const m = {}; for (const x of l) m[x[key]] = (m[x[key]] || 0) + x.a; return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  return { list, income: sum(ins), expense: sum(outs), profit: sum(ins) - sum(outs), cash: sum(all.filter((x) => x.dir === 'in')) - sum(all.filter((x) => x.dir === 'out')), kinds: by(ins, 'kind'), cats: by(outs, 'kind') };
}
function summaryText(u, p, today) {
  const s = stats(u, p, today), P = S.Tof(u).p, debt = S.activeDebt(u), pay = S.paySummary(u, today).total;
  const L = tr(u, { uz: ['Kirim', 'Chiqim', 'Foyda', 'Kassa (barcha vaqt)', 'Mijozlar qarzi', 'Toʻlash kerak', 'Kirim manbalari', 'Chiqim turlari', 'Amal yoʻq'], ru: ['Приход', 'Расход', 'Прибыль', 'Касса (всё время)', 'Долги клиентов', 'К оплате', 'Источники прихода', 'Виды расходов', 'Нет операций'], en: ['Income', 'Expenses', 'Profit', 'Cash (all time)', 'Client debts', 'To pay', 'Income sources', 'Expense types', 'No transactions'] });
  const ec = P.exCats || {};
  let t = `📒 <b>${tr(u, { uz: 'Hisob-kitob', ru: 'Учёт', en: 'Accounts' })}</b> · ${tr(u, PNAME[p])}\n\n💰 ${L[0]}: <b>${fm(s.income)}</b>\n💸 ${L[1]}: <b>${fm(s.expense)}</b>\n${s.profit >= 0 ? '📈' : '📉'} ${L[2]}: <b>${fm(s.profit)}</b>\n\n🏦 ${L[3]}: <b>${fm(s.cash)}</b>`;
  if (debt) t += `\n🧾 ${L[4]}: ${fm(debt)}`;
  if (pay) t += `\n💸 ${L[5]}: ${fm(pay)}`;
  if (s.kinds.length) t += `\n\n<b>${L[6]}:</b>\n${s.kinds.slice(0, 5).map(([k, v]) => `• ${tr(u, KIND[k] || KIND.other)} — ${fm(v)}`).join('\n')}`;
  if (s.cats.length) t += `\n\n<b>${L[7]}:</b>\n${s.cats.slice(0, 5).map(([k, v]) => `• ${ec[k] || k} — ${fm(v)}`).join('\n')}`;
  if (!s.list.length) t += `\n\n<i>${L[8]}</i>`;
  return t;
}
function mainKb(u, p) {
  return { inline_keyboard: [
    PER.map((x) => ({ text: `${x === p ? '● ' : ''}${tr(u, PNAME[x])}`, callback_data: `ahp:${x}` })),
    [{ text: tr(u, { uz: '📜 Amallar', ru: '📜 Операции', en: '📜 Transactions' }), callback_data: `ahl:${p}` }, { text: tr(u, { uz: '➕ Kirim', ru: '➕ Приход', en: '➕ Income' }), callback_data: 'ahi:0' }, { text: tr(u, { uz: '➖ Chiqim', ru: '➖ Расход', en: '➖ Expense' }), callback_data: 'xa:0' }],
    [{ text: '📄 PDF', callback_data: 'rp:1' }, S.appBtn(tr(u, { uz: '📱 Ilovada', ru: '📱 В приложении', en: '📱 In app' }), '?tab=money&view=ledger')],
  ] };
}
async function showMain(ctx, u, p = 'month') { return show(ctx, summaryText(u, p, S.todayISO(u.tz)), mainKb(u, p)); }
async function showLedger(ctx, u, p) {
  const today = S.todayISO(u.tz), [f, t] = range(p, today), list = S.ledger(u, f, t).slice(0, 15), P = S.Tof(u).p, ec = P.exCats || {};
  const body = list.length ? list.map((x) => `${x.dir === 'in' ? '🟢' : '🔴'} ${x.d.slice(8)}.${x.d.slice(5, 7)} · <b>${x.dir === 'in' ? '+' : '−'}${S.money(x.a)}</b> · ${esc(x.label || (x.dir === 'in' ? tr(u, KIND[x.kind] || KIND.other) : ec[x.kind] || x.kind)).slice(0, 40)}`).join('\n') : tr(u, { uz: 'Amal yoʻq', ru: 'Нет операций', en: 'No transactions' });
  return show(ctx, `📜 <b>${tr(u, { uz: 'Amallar', ru: 'Операции', en: 'Transactions' })}</b> · ${tr(u, PNAME[p])}\n\n${body}`, { inline_keyboard: [[{ text: '⬅️', callback_data: `ahp:${p}` }]] });
}

// "500 000 Anvar sayt avans" → { a, label, kind }
function parseIncome(text) {
  const m = String(text || '').trim().match(/^([\d\s.,]+(?:\s*(?:mln|млн|million|ming|тыс|k|к))?)\s*(.*)$/i);
  if (!m) return null;
  const a = proj.payAmount(m[1].trim());
  if (!a) return null;
  const rest = m[2].trim();
  const kind = /sayt|site|сайт|veb|web/i.test(rest) ? 'site' : /\bbot\b|бот/i.test(rest) ? 'bot' : /video|видео|reels|montaj/i.test(rest) ? 'video' : 'other';
  return { a, rest: rest.slice(0, 100), kind };
}
function addIncome(u, x, today) {
  const e = S.cleanExpense({ id: S.newId(), a: x.a, d: today, k: 'in', ik: x.kind, note: x.rest, createdAt: Date.now(), updatedAt: Date.now() });
  if (e) u.expenses.unshift(e);
  return e;
}
async function onMessage(chat, u, cmd, args, text) {
  if (cmd === '/hisob' || cmd === '/accounts') { await showMain({ chat }, u, 'month'); return true; }
  if (cmd === '/kirim' || cmd === '/income_add') {
    const x = args ? parseIncome(args) : null;
    if (x) { addIncome(u, x, S.todayISO(u.tz)); await send(chat, `✅ ${tr(u, { uz: 'Kirim yozildi', ru: 'Приход записан', en: 'Income saved' })}: <b>+${S.money(x.a)}</b>${x.rest ? ` · ${esc(x.rest)}` : ''}`, { inline_keyboard: [[{ text: '📒', callback_data: 'ahp:month' }]] }); return true; }
    u.state = { kind: 'inadd' };
    await send(chat, tr(u, { uz: '➕ <b>Kirim</b>\n\nYozing: <code>summa kim/nima</code>\nMasalan:\n<code>500 000 Anvar sayt avans</code>\n<code>2 mln Dilya bot</code>', ru: '➕ <b>Приход</b>\n\nНапишите: <code>сумма кто/что</code>\nНапример:\n<code>500 000 Анвар сайт аванс</code>', en: '➕ <b>Income</b>\n\nWrite: <code>amount who/what</code>\nExample:\n<code>500 000 Anvar website advance</code>' }), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] });
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'inadd') {
    const x = text ? parseIncome(text) : null;
    if (!x) { await send(chat, tr(u, { uz: 'Summani tushunmadim. Masalan: <code>500 000 Anvar sayt</code>', ru: 'Не понял сумму. Например: <code>500 000 Анвар сайт</code>', en: 'Could not read the amount. Example: <code>500 000 Anvar website</code>' }), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); return true; }
    u.state = null; addIncome(u, x, S.todayISO(u.tz));
    await send(chat, `✅ ${tr(u, { uz: 'Kirim yozildi', ru: 'Приход записан', en: 'Income saved' })}: <b>+${S.money(x.a)}</b>${x.rest ? ` · ${esc(x.rest)}` : ''}`, { inline_keyboard: [[{ text: '📒', callback_data: 'ahp:month' }]] });
    return true;
  }
  return false;
}
async function onCallback(ctx, u, act, a) {
  if (act === 'ahp') await showMain(ctx, u, PER.includes(a) ? a : 'month');
  else if (act === 'ahl') await showLedger(ctx, u, PER.includes(a) ? a : 'month');
  else if (act === 'ahi') { u.state = { kind: 'inadd' }; await onMessage(ctx.chat, u, '/kirim', '', ''); }
  return '';
}
module.exports = { onMessage, onCallback, summaryText, parseIncome, ACTS: ['ahp', 'ahl', 'ahi'] };
