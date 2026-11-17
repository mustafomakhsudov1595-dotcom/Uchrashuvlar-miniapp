'use strict';
// Hisob-kitob: hamyonlar (naqd, karta, dollar), kunlik kurs, kirim / chiqim / foyda, oʻtkazma va almashtirish.
// /hisob, /kirim, /balans, /otkazma, /kurs
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
const WNAME = { cash: { uz: 'Naqd', ru: 'Наличные', en: 'Cash' }, card: { uz: 'Karta', ru: 'Карта', en: 'Card' }, usd: { uz: 'Dollar', ru: 'Доллары', en: 'Dollars' } };
const WICON = { cash: '💵', card: '💳', usd: '💲' };
const wn = (u, w) => `${WICON[w]} ${tr(u, WNAME[w])}`;
const wfmt = (w, n) => (w === 'usd' ? S.fmtUsd(n) : S.money(n));
const WALIAS = [['usd', /^(\$|usd|dollar\w*|доллар\w*|dol+ar\w*)$/i], ['card', /^(karta\w*|карта\w*|card\w*|plastik\w*|uzcard|humo)$/i], ['cash', /^(naqd\w*|нал\w*|cash\w*)$/i]];
const walletWord = (t) => { const x = WALIAS.find(([, re]) => re.test(t)); return x ? x[0] : ''; };

function range(p, today) {
  if (p === 'today') return [today, today];
  if (p === 'week') return [S.addDaysISO(today, -6), today];
  if (p === 'month') return [`${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`];
  if (p === 'year') return [`${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`];
  return ['0000-01-01', '9999-12-31'];
}
const eq = (x) => S.toUzs(x.a, x.w); // soʻmdagi qiymati (dollar — kurs boʻyicha)
const sum = (l) => l.reduce((n, x) => n + eq(x), 0);
const fm = (n) => `${n < 0 ? '−' : ''}${S.money(Math.abs(n))}`;

function stats(u, p, today) {
  const [f, t] = range(p, today), list = S.ledger(u, f, t);
  const ins = list.filter((x) => x.dir === 'in'), outs = list.filter((x) => x.dir === 'out');
  const by = (l) => { const m = {}; for (const x of l) m[x.kind] = (m[x.kind] || 0) + eq(x); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  return { list, income: sum(ins), expense: sum(outs), profit: sum(ins) - sum(outs), kinds: by(ins), cats: by(outs) };
}
// Balans qatorlari: jami (soʻmda), hamyonlar, dollar qarzlar, toʻlovlardan keyin
function balLines(u, today) {
  const b = S.balanceInfo(u, today);
  if (!b) return '';
  const fx = S.fxNow().usd, ws = Object.entries(b.wallets);
  const out = S.paySummary(u, today).out30, after = b.total - out;
  const usdDebt = S.payOpen(u).filter((x) => x.cu === 'USD').reduce((n, x) => n + S.payLeft(x), 0);
  let t = `💵 ${tr(u, { uz: 'Balans', ru: 'Баланс', en: 'Balance' })}: <b>${fm(b.total)}</b>`;
  if (ws.length > 1 || (ws[0] && ws[0][0] !== 'cash')) t += `\n   ${ws.map(([w, y]) => `${WICON[w]} ${tr(u, WNAME[w])}: ${w === 'usd' ? `${S.fmtUsd(y.balance)}${fx ? ` ≈ ${S.money(y.balance * fx)}` : ''}` : fm(y.balance)}`).join('\n   ')}`;
  if (usdDebt > 0) t += `\n   🧾 ${tr(u, { uz: 'Dollardagi qarz', ru: 'Долг в долларах', en: 'Debt in dollars' })}: ${S.fmtUsd(usdDebt)}${fx ? ` ≈ ${S.money(usdDebt * fx)}` : ''}`;
  if (out) t += `\n   ${tr(u, { uz: '30 kunda toʻlash kerak', ru: 'К оплате за 30 дней', en: 'Due in 30 days' })}: −${S.money(out)} → <b>${fm(after)}</b>`;
  return t;
}
function summaryText(u, p, today) {
  const s = stats(u, p, today), P = S.Tof(u).p, debt = S.activeDebt(u), pay = S.paySummary(u, today).total;
  const L = tr(u, { uz: ['Kirim', 'Chiqim', 'Foyda', 'Mijozlar qarzi', 'Toʻlash kerak', 'Kirim manbalari', 'Chiqim turlari', 'Amal yoʻq'], ru: ['Приход', 'Расход', 'Прибыль', 'Долги клиентов', 'К оплате', 'Источники прихода', 'Виды расходов', 'Нет операций'], en: ['Income', 'Expenses', 'Profit', 'Client debts', 'To pay', 'Income sources', 'Expense types', 'No transactions'] });
  const ec = P.exCats || {}, fx = S.fxNow();
  let t = `📒 <b>${tr(u, { uz: 'Hisob-kitob', ru: 'Учёт', en: 'Accounts' })}</b> · ${tr(u, PNAME[p])}\n\n💰 ${L[0]}: <b>${fm(s.income)}</b>\n💸 ${L[1]}: <b>${fm(s.expense)}</b>\n${s.profit >= 0 ? '📈' : '📉'} ${L[2]}: <b>${fm(s.profit)}</b>`;
  const bl = balLines(u, today);
  if (bl) t += `\n\n${bl}`;
  if (debt) t += `\n🧾 ${L[3]}: ${fm(debt)}`;
  if (pay) t += `\n💸 ${L[4]}: ${fm(pay)}`;
  if (s.kinds.length) t += `\n\n<b>${L[5]}:</b>\n${s.kinds.slice(0, 5).map(([k, v]) => `• ${tr(u, KIND[k] || KIND.other)} — ${fm(v)}`).join('\n')}`;
  if (s.cats.length) t += `\n\n<b>${L[6]}:</b>\n${s.cats.slice(0, 5).map(([k, v]) => `• ${ec[k] || k} — ${fm(v)}`).join('\n')}`;
  if (!s.list.length) t += `\n\n<i>${L[7]}</i>`;
  if (fx.usd) t += `\n\n<i>$1 = ${S.money(fx.usd)} ${tr(u, { uz: 'soʻm (MB kursi)', ru: 'сум (курс ЦБ)', en: 'UZS (CBU rate)' })}</i>`;
  return t;
}
function mainKb(u, p) {
  return { inline_keyboard: [
    PER.map((x) => ({ text: `${x === p ? '● ' : ''}${tr(u, PNAME[x])}`, callback_data: `ahp:${x}` })),
    [{ text: tr(u, { uz: '📜 Amallar', ru: '📜 Операции', en: '📜 Transactions' }), callback_data: `ahl:${p}` }, { text: tr(u, { uz: '➕ Kirim', ru: '➕ Приход', en: '➕ Income' }), callback_data: 'ahi:0' }, { text: tr(u, { uz: '➖ Chiqim', ru: '➖ Расход', en: '➖ Expense' }), callback_data: 'xa:0' }],
    [{ text: tr(u, { uz: '💵 Balans', ru: '💵 Баланс', en: '💵 Balance' }), callback_data: 'abw:0' }, { text: tr(u, { uz: '🔄 Oʻtkazma', ru: '🔄 Перевод', en: '🔄 Transfer' }), callback_data: 'atr:0' }, { text: '📄 PDF', callback_data: 'rp:1' }],
    [S.appBtn(tr(u, { uz: '📱 Ilovada ochish', ru: '📱 Открыть в приложении', en: '📱 Open in app' }), '?tab=money&view=ledger')],
  ] };
}
async function showMain(ctx, u, p = 'month') { return show(ctx, summaryText(u, p, S.todayISO(u.tz)), mainKb(u, p)); }
async function showLedger(ctx, u, p) {
  const today = S.todayISO(u.tz), [f, t] = range(p, today), list = S.ledger(u, f, t).slice(0, 15), P = S.Tof(u).p, ec = P.exCats || {};
  const line = (x) => {
    const d = `${x.d.slice(8)}.${x.d.slice(5, 7)}`;
    if (x.dir === 'tr') return `🔄 ${d} · <b>${wfmt(x.w, x.a)}</b> → ${wfmt(x.w2, x.a2)} · ${tr(u, WNAME[x.w])} → ${tr(u, WNAME[x.w2])}`;
    return `${x.dir === 'in' ? '🟢' : '🔴'} ${d} · <b>${x.dir === 'in' ? '+' : '−'}${wfmt(x.w, x.a)}</b> · ${esc(x.label || (x.dir === 'in' ? tr(u, KIND[x.kind] || KIND.other) : ec[x.kind] || x.kind)).slice(0, 36)}${x.w !== 'cash' ? ` · ${WICON[x.w]}` : ''}`;
  };
  const body = list.length ? list.map(line).join('\n') : tr(u, { uz: 'Amal yoʻq', ru: 'Нет операций', en: 'No transactions' });
  return show(ctx, `📜 <b>${tr(u, { uz: 'Amallar', ru: 'Операции', en: 'Transactions' })}</b> · ${tr(u, PNAME[p])}\n\n${body}`, { inline_keyboard: [[{ text: '⬅️', callback_data: `ahp:${p}` }]] });
}

/* ---------- summa va hamyonni matndan ajratish ---------- */
const NUM = String.raw`\d[\d\s]*(?:[.,]\d{1,2})?`;
const USD_PRE = new RegExp(String.raw`^\s*\$\s*(${NUM})\s*(.*)$`, 'is');
const USD_POST = new RegExp(String.raw`^\s*(${NUM})\s*(?:\$|usd\b|dollar\w*|доллар\w*)\s*(.*)$`, 'is');
// "$100 Anvar", "100$ Anvar", "500 000 Anvar sayt karta" → { a, w, rest }
function parseMoney(text) {
  const t = String(text || '').trim();
  let m = t.match(USD_PRE) || t.match(USD_POST), a, rest, w = '';
  if (m) { a = parseFloat(m[1].replace(/\s/g, '').replace(',', '.')); rest = m[2]; w = 'usd'; }
  else {
    m = t.match(/^([\d\s.,]+(?:\s*(?:mln|млн|million|ming|тыс|k|к))?)\s*(.*)$/i);
    if (!m) return null;
    a = proj.payAmount(m[1].trim()); rest = m[2];
  }
  if (!(a > 0)) return null;
  // hamyon soʻzi (karta / naqd / dollar) matn ichida
  const words = rest.split(/\s+/).filter(Boolean), kept = [];
  for (const wd of words) { const ww = walletWord(wd); if (ww && ww !== 'usd' && w !== 'usd') w = ww; else kept.push(wd); }
  return { a: S.rnd(a, w === 'usd'), w: w || '', rest: kept.join(' ').slice(0, 100) };
}
function parseIncome(text) {
  const x = parseMoney(text);
  if (!x) return null;
  const kind = /sayt|site|сайт|veb|web/i.test(x.rest) ? 'site' : /\bbot\b|бот/i.test(x.rest) ? 'bot' : /video|видео|reels|montaj/i.test(x.rest) ? 'video' : 'other';
  return { ...x, kind };
}
function addIncome(u, x, today) {
  const e = S.cleanExpense({ id: S.newId(), a: x.a, d: today, k: 'in', ik: x.kind, ...(x.w ? { w: x.w } : {}), note: x.rest, createdAt: Date.now(), updatedAt: Date.now() });
  if (e) u.expenses.unshift(e);
  return e;
}

/* ---------- balans, oʻtkazma, kurs ---------- */
const BAL_ASK = (u, w) => tr(u, {
  uz: `💵 <b>${WNAME[w].uz} hamyonida hozir qancha pul bor?</b>\n\nSummani yozing${w === 'usd' ? ', masalan: <code>1200</code> yoki <code>350.50</code>' : ', masalan: <code>5 000 000</code>'}.\n\nShundan keyin har bir kirim qoʻshiladi, chiqim va toʻlovlar avtomatik ayiriladi.`,
  ru: `💵 <b>Сколько сейчас в кошельке «${WNAME[w].ru}»?</b>\n\nНапишите сумму${w === 'usd' ? ', например: <code>1200</code> или <code>350.50</code>' : ', например: <code>5 000 000</code>'}.\n\nДальше приходы прибавляются, а расходы и платежи вычитаются автоматически.`,
  en: `💵 <b>How much is in the "${WNAME[w].en}" wallet now?</b>\n\nWrite the amount${w === 'usd' ? ', e.g. <code>1200</code> or <code>350.50</code>' : ', e.g. <code>5 000 000</code>'}.\n\nFrom then on incomes are added and expenses and payments are subtracted automatically.` });
function walletKb(u, p) {
  return { inline_keyboard: [WALIAS.map(([w]) => w).reverse().map((w) => ({ text: `✏️ ${wn(u, w)}`, callback_data: `abs:${w}` })), [{ text: tr(u, { uz: '🔄 Oʻtkazma / almashtirish', ru: '🔄 Перевод / обмен', en: '🔄 Transfer / exchange' }), callback_data: 'atr:0' }, { text: '📒', callback_data: `ahp:${p || 'month'}` }]] };
}
async function showBalance(chat, u) {
  const today = S.todayISO(u.tz), b = S.balanceInfo(u, today);
  if (!b) { u.state = { kind: 'balset', w: 'cash' }; await send(chat, BAL_ASK(u, 'cash'), { inline_keyboard: [[...['cash', 'card', 'usd'].map((w) => ({ text: wn(u, w), callback_data: `abs:${w}` }))], [{ text: '❌', callback_data: 'pno' }]] }); return; }
  await send(chat, `${balLines(u, today)}\n\n<i>${tr(u, { uz: 'Qaysi hamyonni tuzatamiz?', ru: 'Какой кошелёк исправить?', en: 'Which wallet to adjust?' })}</i>`, walletKb(u));
}
const TR_HELP = (u) => tr(u, {
  uz: '🔄 <b>Oʻtkazma / almashtirish</b>\n\nYozing: <code>dan ga summa [olingan summa]</code>\n\n• <code>naqd karta 2 000 000</code>\n• <code>naqd dollar 6 000 000 500</code> — 6 mln soʻmga $500 oldim\n• <code>dollar naqd 300</code> — $300 ni soʻmga almashtirdim (kurs boʻyicha)\n\nHamyonlar: naqd, karta, dollar.',
  ru: '🔄 <b>Перевод / обмен</b>\n\nНапишите: <code>откуда куда сумма [полученная сумма]</code>\n\n• <code>naqd karta 2 000 000</code>\n• <code>naqd dollar 6 000 000 500</code> — купил $500 за 6 млн\n• <code>dollar naqd 300</code> — обменял $300 в сумы (по курсу)\n\nКошельки: naqd (наличные), karta, dollar.',
  en: '🔄 <b>Transfer / exchange</b>\n\nWrite: <code>from to amount [received amount]</code>\n\n• <code>naqd karta 2 000 000</code>\n• <code>naqd dollar 6 000 000 500</code> — bought $500 for 6M\n• <code>dollar naqd 300</code> — exchanged $300 to UZS (at the rate)\n\nWallets: naqd (cash), karta, dollar.' });
function parseTransfer(text) {
  const t = String(text || '').trim().split(/\s+/);
  if (t.length < 3) return null;
  const w1 = walletWord(t[0]), w2 = walletWord(t[1]);
  if (!w1 || !w2 || w1 === w2) return null;
  const num = (s, w) => { const v = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return w === 'usd' ? S.rnd(v, true) : (proj.payAmount(String(s)) || Math.round(v)); };
  const rest = t.slice(2).join(' ').replace(/\$/g, ' ');
  const nums = rest.match(/\d[\d.,]*(?:\s\d{3})*/g) || [];
  const a = nums[0] ? num(nums[0].replace(/\s/g, ''), w1) : 0;
  if (!(a > 0)) return null;
  let a2 = nums[1] ? num(nums[1].replace(/\s/g, ''), w2) : 0;
  const fx = S.fxNow().usd;
  if (!a2) {
    if (w1 === w2 || (w1 !== 'usd' && w2 !== 'usd')) a2 = a;
    else if (!fx) return { error: 'fx' };
    else a2 = w1 === 'usd' ? S.rnd(a * fx, false) : S.rnd(a / fx, true);
  }
  return { w: w1, w2, a, a2 };
}
function addTransfer(u, x, today) {
  const e = S.cleanExpense({ id: S.newId(), k: 'tr', a: x.a, a2: x.a2, w: x.w, w2: x.w2, d: today, createdAt: Date.now(), updatedAt: Date.now() });
  if (e) u.expenses.unshift(e);
  return e;
}
async function showRate(chat, u) {
  const fx = await S.getRate();
  if (!fx.usd) return send(chat, tr(u, { uz: 'Kursni olib boʻlmadi, birozdan keyin urinib koʻring.', ru: 'Не удалось получить курс, попробуйте позже.', en: 'Could not get the rate, try again later.' }));
  const b = S.balanceInfo(u, S.todayISO(u.tz)), usd = b && b.wallets.usd ? b.wallets.usd.balance : 0;
  const debt = S.payOpen(u).filter((x) => x.cu === 'USD').reduce((n, x) => n + S.payLeft(x), 0);
  let t = `💱 <b>${tr(u, { uz: 'Dollar kursi', ru: 'Курс доллара', en: 'Dollar rate' })}</b>\n\n$1 = <b>${S.money(fx.usd)}</b> ${tr(u, { uz: 'soʻm', ru: 'сум', en: 'UZS' })}\n<i>${tr(u, { uz: 'Markaziy bank', ru: 'ЦБ Узбекистана', en: 'Central Bank of Uzbekistan' })} · ${fx.d}</i>`;
  t += `\n\n$100 = ${S.money(fx.usd * 100)}\n1 000 000 ${tr(u, { uz: 'soʻm', ru: 'сум', en: 'UZS' })} = ${S.fmtUsd(1000000 / fx.usd)}`;
  if (usd) t += `\n\n💲 ${tr(u, { uz: 'Dollar hamyoningiz', ru: 'Ваш долларовый кошелёк', en: 'Your dollar wallet' })}: <b>${S.fmtUsd(usd)}</b> ≈ ${S.money(usd * fx.usd)}`;
  if (debt) t += `\n🧾 ${tr(u, { uz: 'Dollardagi qarz', ru: 'Долг в долларах', en: 'Debt in dollars' })}: <b>${S.fmtUsd(debt)}</b> ≈ ${S.money(debt * fx.usd)}`;
  return send(chat, t);
}

async function onMessage(chat, u, cmd, args, text) {
  if (cmd === '/kurs' || cmd === '/rate') { await showRate(chat, u); return true; }
  if (cmd === '/balans' || cmd === '/balance') {
    const t = String(args || '').trim().split(/\s+/);
    let w = walletWord(t[0] || ''), numTxt = w ? t.slice(1).join(' ') : t.join(' ');
    if (!w && numTxt && /(\$|usd|dollar)/i.test(numTxt)) w = 'usd';
    if (!w) w = 'cash';
    const neg = /^[-−]/.test(numTxt.trim()), mm = numTxt ? parseMoney(numTxt.replace(/^[-−]/, '').replace(/\$|usd|dollar\w*/gi, w === 'usd' ? '$' : '')) : null;
    if (numTxt && (mm || /^0+$/.test(numTxt.trim()))) { const v = mm ? mm.a : 0; S.setWallet(u, w, neg ? -v : v, S.todayISO(u.tz)); }
    await showBalance(chat, u);
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'balset') {
    const w = u.state.w || 'cash', neg = /^[-−]/.test((text || '').trim());
    const raw = (text || '').replace(/^[-−]/, '');
    const mm = raw ? parseMoney(w === 'usd' && !/[$a-zA-Z]/.test(raw) ? `$${raw}` : raw) : null;
    if (!mm && !(text && /^0+$/.test(text.trim()))) { await send(chat, tr(u, { uz: 'Summani tushunmadim. Masalan: <code>5 000 000</code>', ru: 'Не понял сумму. Например: <code>5 000 000</code>', en: 'Could not read the amount. Example: <code>5 000 000</code>' }), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); return true; }
    u.state = null; const v = mm ? mm.a : 0; S.setWallet(u, w, neg ? -v : v, S.todayISO(u.tz));
    await showBalance(chat, u);
    return true;
  }
  if (cmd === '/otkazma' || cmd === '/transfer') {
    const x = args ? parseTransfer(args) : null;
    if (x && !x.error) { addTransfer(u, x, S.todayISO(u.tz)); await send(chat, `✅ ${tr(u, { uz: 'Oʻtkazma yozildi', ru: 'Перевод записан', en: 'Transfer saved' })}: ${wfmt(x.w, x.a)} (${tr(u, WNAME[x.w])}) → ${wfmt(x.w2, x.a2)} (${tr(u, WNAME[x.w2])})`, { inline_keyboard: [[{ text: '💵', callback_data: 'abw:0' }]] }); return true; }
    u.state = { kind: 'trset' };
    await send(chat, `${x && x.error ? `⚠️ ${tr(u, { uz: 'Kurs hozircha yoʻq — almashtirilgan summani oʻzingiz yozing.', ru: 'Курса пока нет — укажите полученную сумму.', en: 'Rate unavailable — please write the received amount.' })}\n\n` : ''}${TR_HELP(u)}`, { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] });
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'trset') {
    const x = text ? parseTransfer(text) : null;
    if (!x || x.error) { await send(chat, TR_HELP(u), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); return true; }
    u.state = null; addTransfer(u, x, S.todayISO(u.tz));
    await send(chat, `✅ ${tr(u, { uz: 'Oʻtkazma yozildi', ru: 'Перевод записан', en: 'Transfer saved' })}: ${wfmt(x.w, x.a)} → ${wfmt(x.w2, x.a2)}`, { inline_keyboard: [[{ text: '💵', callback_data: 'abw:0' }]] });
    return true;
  }
  if (cmd === '/hisob' || cmd === '/accounts') { await S.getRate(); await showMain({ chat }, u, 'month'); return true; }
  if (cmd === '/kirim' || cmd === '/income_add') {
    const x = args ? parseIncome(args) : null;
    if (x) { addIncome(u, x, S.todayISO(u.tz)); await send(chat, `✅ ${tr(u, { uz: 'Kirim yozildi', ru: 'Приход записан', en: 'Income saved' })}: <b>+${wfmt(x.w || 'cash', x.a)}</b>${x.rest ? ` · ${esc(x.rest)}` : ''}${x.w && x.w !== 'cash' ? ` · ${wn(u, x.w)}` : ''}`, { inline_keyboard: [[{ text: '📒', callback_data: 'ahp:month' }]] }); return true; }
    u.state = { kind: 'inadd' };
    await send(chat, tr(u, { uz: '➕ <b>Kirim</b>\n\nYozing: <code>summa kim/nima</code>\nMasalan:\n<code>500 000 Anvar sayt avans</code>\n<code>2 mln Dilya bot karta</code> — kartaga tushdi\n<code>$300 Ali video</code> — dollarda', ru: '➕ <b>Приход</b>\n\nНапишите: <code>сумма кто/что</code>\nНапример:\n<code>500 000 Анвар сайт аванс</code>\n<code>2 mln Диля бот karta</code> — на карту\n<code>$300 Али видео</code> — в долларах', en: '➕ <b>Income</b>\n\nWrite: <code>amount who/what</code>\nExample:\n<code>500 000 Anvar website advance</code>\n<code>2 mln Dilya bot karta</code> — to card\n<code>$300 Ali video</code> — in dollars' }), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] });
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'inadd') {
    const x = text ? parseIncome(text) : null;
    if (!x) { await send(chat, tr(u, { uz: 'Summani tushunmadim. Masalan: <code>500 000 Anvar sayt</code>', ru: 'Не понял сумму. Например: <code>500 000 Анвар сайт</code>', en: 'Could not read the amount. Example: <code>500 000 Anvar website</code>' }), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); return true; }
    u.state = null; addIncome(u, x, S.todayISO(u.tz));
    await send(chat, `✅ ${tr(u, { uz: 'Kirim yozildi', ru: 'Приход записан', en: 'Income saved' })}: <b>+${wfmt(x.w || 'cash', x.a)}</b>${x.rest ? ` · ${esc(x.rest)}` : ''}${x.w && x.w !== 'cash' ? ` · ${wn(u, x.w)}` : ''}`, { inline_keyboard: [[{ text: '📒', callback_data: 'ahp:month' }]] });
    return true;
  }
  return false;
}
async function onCallback(ctx, u, act, a) {
  await S.getRate();
  if (act === 'ahp') await showMain(ctx, u, PER.includes(a) ? a : 'month');
  else if (act === 'ahl') await showLedger(ctx, u, PER.includes(a) ? a : 'month');
  else if (act === 'abw') await showBalance(ctx.chat, u);
  else if (act === 'abs') { const w = S.WALLETS.includes(a) ? a : 'cash'; u.state = { kind: 'balset', w }; await send(ctx.chat, BAL_ASK(u, w), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); }
  else if (act === 'atr') { u.state = { kind: 'trset' }; await send(ctx.chat, TR_HELP(u), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); }
  else if (act === 'ahi') { u.state = { kind: 'inadd' }; await onMessage(ctx.chat, u, '/kirim', '', ''); }
  return '';
}
module.exports = { onMessage, onCallback, summaryText, parseIncome, parseMoney, parseTransfer, balLines, ACTS: ['ahp', 'ahl', 'ahi', 'abs', 'abw', 'atr'] };
