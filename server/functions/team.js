'use strict';
// Jamoa: bot faqat admin va taklif qilingan a'zolar uchun (/jamoa)
const S = require('./_shared');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text, parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));

const L = {
  uz: {
    closed: (id) => `🔒 <b>Bu bot yopiq.</b>\nU faqat jamoa aʻzolari uchun. Qoʻshilish uchun administratorga yozing va shu ID raqamni yuboring:\n<code>${id}</code>`,
    only: '🔒 Bu buyruq faqat administrator uchun.', title: (n) => `👥 <b>Jamoa</b> (${n})`, admin: 'administrator', add: '➕ Aʻzo taklif qilish', rm: '🗑', back: '⬅️ Orqaga',
    inv: (l) => `🔗 Taklif havolasi (7 kun, bir martalik):\n${l}\n\nUni jamoa aʻzosiga yuboring. Havolani bosganda u botga qoʻshiladi.`,
    joined: '✅ Jamoaga qoʻshildingiz! Boshlaymiz.', badInv: '⚠️ Taklif havolasi eskirgan yoki ishlatilgan. Administratordan yangisini soʻrang.', notify: (n, id) => `✅ <b>${n}</b> jamoaga qoʻshildi (ID ${id}).`,
    rmAsk: (n) => `🗑 <b>${n}</b> ni jamoadan chiqarasizmi? Uning botga kirishi yopiladi, maʼlumotlari saqlanadi.`, yes: 'Ha, chiqarish', no: 'Yoʻq', rmDone: 'Chiqarildi.',
    none: 'Hozircha faqat siz. “Aʻzo taklif qilish” ni bosing.', open: 'Bot hammaga ochiq: havolani bossa, kira oladi. Chiqarilgan odamning kirishi yopiladi.',
  },
  ru: {
    closed: (id) => `🔒 <b>Этот бот закрытый.</b>\nОн только для членов команды. Чтобы присоединиться, напишите администратору и отправьте этот ID:\n<code>${id}</code>`,
    only: '🔒 Эта команда только для администратора.', title: (n) => `👥 <b>Команда</b> (${n})`, admin: 'администратор', add: '➕ Пригласить участника', rm: '🗑', back: '⬅️ Назад',
    inv: (l) => `🔗 Ссылка-приглашение (7 дней, одноразовая):\n${l}\n\nОтправьте её участнику команды. По ссылке он подключится к боту.`,
    joined: '✅ Вы в команде! Начинаем.', badInv: '⚠️ Ссылка устарела или уже использована. Попросите новую у администратора.', notify: (n, id) => `✅ <b>${n}</b> присоединился к команде (ID ${id}).`,
    rmAsk: (n) => `🗑 Убрать <b>${n}</b> из команды? Доступ к боту закроется, данные сохранятся.`, yes: 'Да, убрать', no: 'Нет', rmDone: 'Убран.',
    none: 'Пока только вы. Нажмите «Пригласить участника».', open: 'Бот открыт для всех: по ссылке на бота можно войти. Убранному участнику доступ закрывается.',
  },
  en: {
    closed: (id) => `🔒 <b>This bot is private.</b>\nIt is for team members only. To join, message the administrator and send this ID:\n<code>${id}</code>`,
    only: '🔒 This command is for the administrator only.', title: (n) => `👥 <b>Team</b> (${n})`, admin: 'administrator', add: '➕ Invite a member', rm: '🗑', back: '⬅️ Back',
    inv: (l) => `🔗 Invite link (7 days, single use):\n${l}\n\nSend it to a team member. Opening it connects them to the bot.`,
    joined: '✅ You joined the team! Let’s start.', badInv: '⚠️ This invite expired or was already used. Ask the administrator for a new one.', notify: (n, id) => `✅ <b>${n}</b> joined the team (ID ${id}).`,
    rmAsk: (n) => `🗑 Remove <b>${n}</b> from the team? Their bot access is closed, data is kept.`, yes: 'Yes, remove', no: 'No', rmDone: 'Removed.',
    none: 'Just you for now. Tap “Invite a member”.', open: 'The bot is open to everyone: anyone with the bot link can enter. A removed member loses access.',
  },
};
const tr = (code) => L[['ru', 'en'].includes(String(code || '').slice(0, 2)) ? String(code).slice(0, 2) : 'uz'];
const langOf = (u) => (u && u.lang) || 'uz';

/* ---------- kirish nazorati (bot.js dan chaqiriladi) ---------- */
async function closedMessage(chat, from) { return send(chat, tr(from.language_code).closed(from.id)); }

// /start t_<kalit>: taklif orqali qoʻshilish. true — qayta ishlandi (xabar yuborildi).
async function acceptInvite(st, chat, from, token) {
  const T = tr(from.language_code), inv = await st.get(`tinv/${token}`, { type: 'json' });
  if (!inv || inv.used || inv.exp < Date.now()) { await send(chat, T.badInv); return true; }
  await st.setJSON(`tinv/${token}`, { ...inv, used: from.id, usedAt: Date.now() });
  await st.set(`allow/${from.id}`, '1');
  await st.set(`blocked/${from.id}`, '');
  const name = esc([from.first_name, from.last_name].filter(Boolean).join(' ') || String(from.id));
  for (const a of S.adminIds()) tg('sendMessage', { chat_id: a, text: T.notify(name, from.id), parse_mode: 'HTML' });
  return false; // oddiy /start oqimi davom etadi (til tanlash)
}

/* ---------- /jamoa ---------- */
async function members(st) {
  const idx = (await st.list({ prefix: 'user/' })).blobs.map((b) => b.key.slice(5));
  const out = [];
  for (const id of new Set([...S.adminIds(), ...idx])) {
    if (!S.isAdmin(id) && (await st.get(`blocked/${id}`))) continue;
    const u = await st.get(`user/${id}`, { type: 'json' });
    out.push({ id, name: (u && u.name) || id, admin: S.isAdmin(id) });
  }
  return out;
}
async function showTeam(ctx, st, u) {
  const T = L[langOf(u)], list = await members(st);
  let text = T.title(list.length);
  if (S.accessOpen()) text += `\n${T.open}`;
  text += list.length > 1 ? '\n\n' + list.map((m) => `${m.admin ? '👑' : '👤'} <b>${esc(m.name)}</b>${m.admin ? ` · ${T.admin}` : ''}\n   <code>${m.id}</code>`).join('\n') : (S.accessOpen() ? '' : `\n\n${T.none}`);
  const rows = list.filter((m) => !m.admin).slice(0, 15).map((m) => [{ text: `${T.rm} ${m.name}`.slice(0, 60), callback_data: `tx:${m.id}` }]);
  if (!S.accessOpen()) rows.push([{ text: T.add, callback_data: 'ta:0' }]);
  return show(ctx, text, { inline_keyboard: rows });
}
async function onMessage(chat, u, cmd, st) {
  if (cmd !== '/jamoa' && cmd !== '/team') return false;
  const T = L[langOf(u)];
  if (!S.isAdmin(u.id)) { await send(chat, T.only); return true; }
  await showTeam({ chat }, st, u); return true;
}
async function onCallback(ctx, st, u, act, a) {
  const T = L[langOf(u)];
  if (!S.isAdmin(u.id)) return T.only;
  if (act === 'tm') await showTeam(ctx, st, u);
  else if (act === 'ta') {
    const tok = S.newId().replace(/-/g, '').slice(0, 16);
    await st.setJSON(`tinv/${tok}`, { by: u.id, exp: Date.now() + 7 * 86400000 });
    await send(ctx.chat, T.inv(`https://t.me/${S.BOT_USER()}?start=t_${tok}`), { inline_keyboard: [[{ text: T.back, callback_data: 'tm:0' }]] });
  } else if (act === 'tx') {
    const m = (await members(st)).find((x) => x.id === a);
    if (m && !m.admin) await show(ctx, T.rmAsk(esc(m.name)), { inline_keyboard: [[{ text: T.yes, callback_data: `txy:${a}` }, { text: T.no, callback_data: 'tm:0' }]] });
  } else if (act === 'txy') {
    if (!S.isAdmin(a)) { await st.set(`blocked/${a}`, '1'); await st.set(`allow/${a}`, ''); }
    await showTeam(ctx, st, u); return T.rmDone;
  }
  return '';
}

module.exports = { closedMessage, acceptInvite, onMessage, onCallback, ACTS: ['tm', 'ta', 'tx', 'txy'], tr };
