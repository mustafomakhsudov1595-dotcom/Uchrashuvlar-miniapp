'use strict';
// Umumiy ish joyi (hisob): login/parol bilan kirgan hamma bir xil uchrashuv, loyiha, kirim, chiqim va balansni koʻradi.
// /kirish, /chiqish, /hisobim va admin panel (/admin).
const S = require('./_shared');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text: String(text).slice(0, 3900), parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text: String(text).slice(0, 3900), parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));
const store = () => S.openStore({});
const tr = (u, o) => o[u.lang] || o.uz;
const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/, PASS_MIN = 6;

/* ---------- parol (PBKDF2-SHA256) ---------- */
const b64 = (buf) => Buffer.from(buf).toString('base64');
async function derive(pass, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256));
}
async function newCred(pass) { const salt = crypto.getRandomValues(new Uint8Array(16)); return { salt: b64(salt), hash: await derive(pass, salt) }; }
async function checkPass(pass, ws) {
  const a = await derive(pass, Buffer.from(ws.salt, 'base64')), b = ws.hash;
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* ---------- saqlash ---------- */
const getWs = (st, id) => st.get(S.wsKey(id), { type: 'json' });
const saveWs = (st, w) => st.setJSON(S.wsKey(w.id), w);
async function wsList(st) { const ids = (await st.get('ws/idx', { type: 'json' })) || [], out = []; for (const id of ids) { const w = await getWs(st, id); if (w) out.push(w); } return out; }
async function createWs(st, login, pass, owner) {
  if (await st.get(`wslogin/${login}`)) return null;
  const id = S.newId().replace(/-/g, '').slice(0, 10), cred = await newCred(pass);
  const w = { id, login, ...cred, owner: String(owner.id), createdAt: Date.now(), members: [] };
  Object.assign(w, { meetings: [], deleted: {}, projects: [], pdeleted: {}, subs: [], sdeleted: {}, expenses: [], edeleted: {}, services: [], svdeleted: {}, payables: [], pvdeleted: {}, goal: 0, goalAt: 0, bal: null, balAt: 0, places: [], placesAt: 0, payInfo: '' });
  await saveWs(st, w);
  await st.set(`wslogin/${login}`, id);
  const idx = (await st.get('ws/idx', { type: 'json' })) || []; idx.push(id); await st.setJSON('ws/idx', idx);
  return w;
}
// Foydalanuvchini hisobga biriktiradi (u obyektida maʼlumot hisobdan yuklanadi)
async function attach(st, u, w) {
  const members = (w.members || []).filter((m) => m.id !== String(u.id));
  members.push({ id: String(u.id), name: u.name || '', at: Date.now() });
  w.members = members; await saveWs(st, w);
  u.ws = w.id; u.wsLogin = w.login;
  await S.applyWs(st, u);
}
async function detach(st, u) {
  const w = u.ws ? await getWs(st, u.ws) : null;
  if (w) { w.members = (w.members || []).filter((m) => m.id !== String(u.id)); await saveWs(st, w); }
  await S.detachWs(st, u);
}
async function kickRaw(st, uid, wsId) {
  const raw = await st.get(`user/${uid}`, { type: 'json' });
  if (raw && raw.ws === wsId) { delete raw.ws; delete raw.wsLogin; await st.setJSON(`user/${uid}`, raw); }
  const w = await getWs(st, wsId);
  if (w) { w.members = (w.members || []).filter((m) => m.id !== String(uid)); await saveWs(st, w); }
}

/* ---------- kirish urinishlarini cheklash ---------- */
async function locked(st, uid) { const f = await st.get(`ws/fail/${uid}`, { type: 'json' }); return f && f.n >= 5 && Date.now() - f.t < 15 * 60000; }
async function fail(st, uid) { const f = (await st.get(`ws/fail/${uid}`, { type: 'json' })) || { n: 0, t: 0 }; const n = Date.now() - f.t > 15 * 60000 ? 1 : f.n + 1; await st.setJSON(`ws/fail/${uid}`, { n, t: Date.now() }); }

const TX = {
  askLogin: { uz: '🔐 <b>Kirish</b>\n\nLoginni yozing:', ru: '🔐 <b>Вход</b>\n\nНапишите логин:', en: '🔐 <b>Sign in</b>\n\nWrite the login:' },
  askPass: { uz: 'Endi parolni yozing (xabar xavfsizlik uchun oʻchiriladi):', ru: 'Теперь пароль (сообщение будет удалено):', en: 'Now the password (the message will be deleted):' },
  bad: { uz: '❌ Login yoki parol notoʻgʻri.', ru: '❌ Неверный логин или пароль.', en: '❌ Wrong login or password.' },
  lock: { uz: '⏳ Juda koʻp xato urinish. 15 daqiqadan keyin qayta urinib koʻring.', ru: '⏳ Слишком много попыток. Попробуйте через 15 минут.', en: '⏳ Too many attempts. Try again in 15 minutes.' },
  already: { uz: 'Siz allaqachon hisobga kirgansiz. Avval /chiqish.', ru: 'Вы уже вошли. Сначала /chiqish.', en: 'You are already signed in. Use /chiqish first.' },
  ok: { uz: (l, n) => `✅ <b>${l}</b> hisobiga kirdingiz. Endi uchrashuv, loyiha, kirim, chiqim va balans shu hisobdagi hamma bilan umumiy (${n} a'zo). Oʻzgarishlar hammada bir xil koʻrinadi.\n\n<i>Oldingi shaxsiy maʼlumotlaringiz saqlanib turadi — /chiqish qilsangiz qaytadi.</i>`, ru: (l, n) => `✅ Вы вошли в аккаунт <b>${l}</b>. Встречи, проекты, приходы, расходы и баланс теперь общие со всеми участниками (${n}). Изменения видны у всех.\n\n<i>Ваши прежние личные данные сохранены — вернутся после /chiqish.</i>`, en: (l, n) => `✅ Signed in to <b>${l}</b>. Meetings, projects, income, expenses and balance are now shared with everyone in this account (${n} members). Changes appear for all.\n\n<i>Your previous personal data is kept — it returns after /chiqish.</i>` },
  out: { uz: '👋 Hisobdan chiqdingiz. Shaxsiy maʼlumotlaringiz qaytdi.', ru: '👋 Вы вышли. Ваши личные данные вернулись.', en: '👋 Signed out. Your personal data is back.' },
  notIn: { uz: 'Siz hisobga kirmagansiz. /kirish', ru: 'Вы не вошли. /kirish', en: 'You are not signed in. /kirish' },
};

async function doLogin(chat, u, login, pass) {
  const st = store();
  if (u.ws) { await send(chat, tr(u, TX.already)); return; }
  if (await locked(st, u.id)) { await send(chat, tr(u, TX.lock)); return; }
  if (u.lastMsgId) tg('deleteMessage', { chat_id: chat, message_id: u.lastMsgId }); // parol chatda qolmasin
  const id = await st.get(`wslogin/${String(login).toLowerCase()}`), w = id ? await getWs(st, id) : null;
  if (!w || !(await checkPass(pass, w))) { await fail(st, u.id); await send(chat, tr(u, TX.bad)); return; }
  await attach(st, u, w);
  await send(chat, tr(u, TX.ok)(esc(w.login), w.members.length), { inline_keyboard: [[S.appBtn(tr(u, { uz: '📱 Ilovani ochish', ru: '📱 Открыть приложение', en: '📱 Open app' }))]] });
}
async function showMine(chat, u) {
  if (!u.ws) { await send(chat, tr(u, TX.notIn), { inline_keyboard: [[{ text: '🔐', callback_data: 'wlg:0' }]] }); return; }
  const w = await getWs(store(), u.ws);
  await send(chat, `🔐 <b>${esc(u.wsLogin || (w && w.login) || '')}</b>\n${tr(u, { uz: 'A\'zolar', ru: 'Участники', en: 'Members' })}: ${w ? w.members.map((m) => esc(m.name || m.id)).join(', ') : ''}`, { inline_keyboard: [[{ text: tr(u, { uz: '🚪 Chiqish', ru: '🚪 Выйти', en: '🚪 Sign out' }), callback_data: 'wlo:0' }]] });
}

/* ---------- admin panel ---------- */
const BACK = [{ text: '⬅️ Admin panel', callback_data: 'wal:0' }];
async function panel(ctx, u) {
  const st = store(), list = await wsList(st), users = ((await st.get('idx/users', { type: 'json' })) || []).length;
  const text = `🛠 <b>Admin panel</b>\n\n🔐 Hisoblar: <b>${list.length}</b>\n👥 Foydalanuvchilar: <b>${users}</b>\n👑 Adminlar: <b>${S.adminIds().length}</b>\n\n<i>Hisob — bitta login/parol. Unga kirgan hamma bir xil uchrashuv, loyiha, kirim, chiqim va balansni koʻradi.</i>`;
  const rows = list.map((w) => [{ text: `🔐 ${w.login} · ${w.members.length} a'zo`.slice(0, 60), callback_data: `wac:${w.id}` }]);
  rows.push([{ text: '➕ Yangi hisob', callback_data: 'wan:0' }]);
  rows.push([{ text: '👑 Adminlar', callback_data: 'wad:0' }]);
  return show(ctx, text, { inline_keyboard: rows });
}
async function card(ctx, u, id) {
  const st = store(), w = await getWs(st, id);
  if (!w) return panel(ctx, u);
  const adm = new Set(S.adminIds());
  const text = `🔐 <b>${esc(w.login)}</b>\nYaratilgan: ${new Date(w.createdAt + 5 * 3600000).toISOString().slice(0, 10)}\n\n<b>A'zolar (${w.members.length}):</b>\n${w.members.length ? w.members.map((m) => `• ${esc(m.name || m.id)} <code>${m.id}</code>${adm.has(m.id) ? ' 👑' : ''}`).join('\n') : '—'}\n\n📊 Maʼlumot: ${w.projects.length} loyiha · ${w.meetings.length} uchrashuv · ${w.expenses.length} yozuv`;
  const rows = w.members.slice(0, 10).map((m) => {
    const r = [{ text: `🚫 ${(m.name || m.id).slice(0, 14)}`, callback_data: `wak:${w.id}:${m.id}` }];
    if (S.isSuper(u.id) && !S.isSuper(m.id)) r.unshift({ text: adm.has(m.id) ? '👑✖' : '👑', callback_data: `wam:${w.id}:${m.id}` });
    return r;
  });
  rows.push([{ text: '🔑 Parolni almashtirish', callback_data: `wap:${w.id}` }, { text: u.ws === w.id ? '🚪 Men chiqaman' : '➕ Men kiraman', callback_data: u.ws === w.id ? 'wlo:0' : `waj:${w.id}` }]);
  if (S.isSuper(u.id)) rows.push([{ text: '🗑 Hisobni oʻchirish', callback_data: `wax:${w.id}` }]);
  rows.push(BACK);
  return show(ctx, text, { inline_keyboard: rows });
}
async function adminsView(ctx, u) {
  const st = store(), extra = (await st.get('ws/admins', { type: 'json' })) || [];
  const text = `👑 <b>Adminlar</b>\n\nAsosiy admin(lar): ${S.adminIds().filter((x) => S.isSuper(x)).map((x) => `<code>${x}</code>`).join(', ')}\nQoʻshimcha: ${extra.length ? extra.map((x) => `<code>${x}</code>`).join(', ') : '—'}\n\n<i>Admin tayinlash: hisob kartasida a'zo yonidagi 👑 tugmasi (faqat asosiy admin).</i>`;
  return show(ctx, text, { inline_keyboard: [BACK] });
}

async function onMessage(chat, u, cmd, args, text) {
  if (cmd === '/kirish' || cmd === '/login') {
    const a = String(args || '').trim().split(/\s+/);
    if (a.length >= 2 && a[0]) { await doLogin(chat, u, a[0], a.slice(1).join(' ')); return true; }
    if (u.ws) { await send(chat, tr(u, TX.already)); return true; }
    u.state = { kind: 'wslogin', step: 'login' };
    await send(chat, tr(u, TX.askLogin), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] });
    return true;
  }
  if (cmd === '/chiqish' || cmd === '/logout') {
    if (!u.ws) { await send(chat, tr(u, TX.notIn)); return true; }
    await detach(store(), u); await send(chat, tr(u, TX.out)); return true;
  }
  if (cmd === '/hisobim' || cmd === '/account') { await showMine(chat, u); return true; }
  if (cmd === '/admin' && S.isAdmin(u.id)) { await panel({ chat }, u); return true; }
  if (!cmd && u.state && u.state.kind === 'wslogin') {
    const t = String(text || '').trim();
    if (!t) return true;
    if (u.state.step === 'login') { u.state = { kind: 'wslogin', step: 'pass', login: t.toLowerCase() }; await send(chat, tr(u, TX.askPass), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); return true; }
    const login = u.state.login; u.state = null; await doLogin(chat, u, login, t); return true;
  }
  if (!cmd && u.state && u.state.kind === 'wsnew' && S.isAdmin(u.id)) {
    const t = String(text || '').trim();
    if (!t) return true;
    if (u.state.step === 'login') {
      const lg = t.toLowerCase();
      if (!LOGIN_RE.test(lg)) { await send(chat, '❌ Login 3-32 belgi: kichik lotin harflar, raqam, nuqta, chiziq. Qayta yozing:'); return true; }
      if (await store().get(`wslogin/${lg}`)) { await send(chat, '❌ Bu login band. Boshqasini yozing:'); return true; }
      u.state = { kind: 'wsnew', step: 'pass', login: lg };
      await send(chat, `✅ Login: <code>${esc(lg)}</code>\n\nEndi parol (kamida ${PASS_MIN} belgi). Xabar xavfsizlik uchun oʻchiriladi:`, { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] });
      return true;
    }
    if (t.length < PASS_MIN) { await send(chat, `❌ Parol kamida ${PASS_MIN} belgi. Qayta yozing:`); return true; }
    if (u.lastMsgId) tg('deleteMessage', { chat_id: chat, message_id: u.lastMsgId });
    const lg = u.state.login; u.state = null;
    const w = await createWs(store(), lg, t, u);
    if (!w) { await send(chat, '❌ Bu login band.'); return true; }
    await send(chat, `✅ Hisob yaratildi: <b>${esc(lg)}</b>\n\nHodimlarga login va parolni bering — ular botda <code>/kirish</code> yozib kirishadi.\n\nSiz o'zingiz qanday kirasiz?`, { inline_keyboard: [[{ text: '📦 Mening hozirgi maʼlumotlarimni koʻchirib kirish', callback_data: `waq:${w.id}` }], [{ text: '➕ Boʻsh hisobga kirish', callback_data: `waj:${w.id}` }], [{ text: 'Keyin', callback_data: `wac:${w.id}` }]] });
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'wspass' && S.isAdmin(u.id)) {
    const t = String(text || '').trim();
    if (t.length < PASS_MIN) { await send(chat, `❌ Parol kamida ${PASS_MIN} belgi. Qayta yozing:`); return true; }
    if (u.lastMsgId) tg('deleteMessage', { chat_id: chat, message_id: u.lastMsgId });
    const st = store(), w = await getWs(st, u.state.id); u.state = null;
    if (!w) return true;
    Object.assign(w, await newCred(t)); await saveWs(st, w);
    await send(chat, `✅ <b>${esc(w.login)}</b> paroli almashtirildi. Yangi kirishlar yangi parol bilan.`, { inline_keyboard: [[{ text: '⬅️', callback_data: `wac:${w.id}` }]] });
    return true;
  }
  return false;
}

async function onCallback(ctx, u, act, a, b) {
  const st = store();
  if (act === 'wlg') { u.state = { kind: 'wslogin', step: 'login' }; await send(ctx.chat, tr(u, TX.askLogin), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); return ''; }
  if (act === 'wlo') { if (u.ws) { await detach(st, u); await send(ctx.chat, tr(u, TX.out)); } return ''; }
  if (!S.isAdmin(u.id)) return '🔒';
  if (act === 'wal') await panel(ctx, u);
  else if (act === 'wac') await card(ctx, u, a);
  else if (act === 'wad') await adminsView(ctx, u);
  else if (act === 'wan') { u.state = { kind: 'wsnew', step: 'login' }; await send(ctx.chat, '➕ <b>Yangi hisob</b>\n\nLogin yozing (kichik lotin harflar, raqam, nuqta, chiziq; 3-32 belgi):', { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); }
  else if (act === 'wap') { u.state = { kind: 'wspass', id: a }; await send(ctx.chat, `🔑 Yangi parolni yozing (kamida ${PASS_MIN} belgi). Xabar oʻchiriladi:`, { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); }
  else if (act === 'waj') {
    const w = await getWs(st, a);
    if (w && !u.ws) { await attach(st, u, w); await send(ctx.chat, `✅ <b>${esc(w.login)}</b> hisobiga kirdingiz.`, { inline_keyboard: [[{ text: '⬅️', callback_data: `wac:${w.id}` }]] }); }
    else if (u.ws) await send(ctx.chat, tr(u, TX.already));
  } else if (act === 'waq') { // joriy maʼlumotlarni hisobga koʻchirib kirish
    const w = await getWs(st, a);
    if (w && !u.ws) {
      for (const k of S.WS_DATA) w[k] = u[k];
      await saveWs(st, w); await attach(st, u, w);
      await send(ctx.chat, `✅ Maʼlumotlaringiz <b>${esc(w.login)}</b> hisobiga koʻchirildi va siz kirdingiz. Endi hodimlar kirsa, hammasini koʻradi.`, { inline_keyboard: [[{ text: '⬅️', callback_data: `wac:${w.id}` }]] });
    }
  } else if (act === 'wak') {
    const w = await getWs(st, a);
    if (w && String(b) !== String(u.id)) { await kickRaw(st, b, a); await card(ctx, u, a); return '🚫'; }
    if (w && String(b) === String(u.id) && u.ws === a) { await detach(st, u); await card(ctx, u, a); }
  } else if (act === 'wam') {
    if (!S.isSuper(u.id) || S.isSuper(b)) return '🔒';
    const cur = (await st.get('ws/admins', { type: 'json' })) || [], has = cur.includes(String(b));
    const next = has ? cur.filter((x) => x !== String(b)) : [...cur, String(b)];
    await st.setJSON('ws/admins', next); S.setExtraAdmins(next);
    await card(ctx, u, a); return has ? '👑✖' : '👑';
  } else if (act === 'wax') {
    if (!S.isSuper(u.id)) return '🔒';
    const w = await getWs(st, a);
    if (w) await show(ctx, `🗑 <b>${esc(w.login)}</b> hisobini oʻchiramizmi?\n\n⚠️ Hisobdagi hamma maʼlumot (uchrashuv, loyiha, kirim-chiqim, balans) <b>butunlay oʻchadi</b>, ${w.members.length} a'zo hisobdan chiqariladi.`, { inline_keyboard: [[{ text: 'Ha, oʻchirish', callback_data: `waxy:${a}` }, { text: 'Yoʻq', callback_data: `wac:${a}` }]] });
  } else if (act === 'waxy') {
    if (!S.isSuper(u.id)) return '🔒';
    const w = await getWs(st, a);
    if (w) {
      for (const m of w.members) await kickRaw(st, m.id, a);
      if (u.ws === a) { u.ws = undefined; u.wsLogin = undefined; const p = await S.getPersonal(st, u.id); for (const k of S.WS_DATA) u[k] = p[k]; }
      await st.delete(S.wsKey(a)); await st.delete(`wslogin/${w.login}`);
      await st.setJSON('ws/idx', ((await st.get('ws/idx', { type: 'json' })) || []).filter((x) => x !== a));
      await send(ctx.chat, `🗑 <b>${esc(w.login)}</b> hisobi oʻchirildi.`, { inline_keyboard: [BACK] });
    }
  }
  return '';
}
module.exports = { onMessage, onCallback, createWs, attach, detach, checkPass, ACTS: ['wlg', 'wlo', 'wal', 'wac', 'wad', 'wan', 'wap', 'waj', 'waq', 'wak', 'wam', 'wax', 'waxy'] };
