// Dr. Avazxon uchun Telegram ariza boti (Cloudflare Worker)
// Kerakli sozlamalar (Settings -> Variables and Secrets):
//   BOT_TOKEN        (Secret)  BotFather bergan token
//   WEBHOOK_SECRET   (Secret)  o'zingiz o'ylab topgan uzun tasodifiy matn
//   DOCTOR_CHAT_IDS  (Text)    ariza boradigan chat ID, bir nechta bo'lsa vergul bilan
//   PUBLIC_URL       (Text, ixtiyoriy) hisobot ilovasi manzili, standart: shu Worker manzili
//   ADMIN_CODE       (Secret, ixtiyoriy) botga /admin KOD yozgan odam admin bo'ladi
//   PRICES_TEXT      (Text, ixtiyoriy) «Narxlar» tugmasida chiqadigan matn (HTML: <b>, <i>)
//   SLOTS            (Text, ixtiyoriy) qabul soatlari, vergul bilan. Standart: 09:00,10:00,...,18:00
//   ALLOWED_ORIGIN   (Text, ixtiyoriy) sayt manzili, bir nechta bo'lsa vergul bilan: https://dravaz.uz,https://www.dravaz.uz
// KV Namespace binding nomi: STATE

const TOPICS = {
  p: 'Prostata (prostatit, adenoma)',
  t: 'Buyrak / siydik toshi',
  i: 'Siydik yo‘llari yallig‘lanishi',
  s: 'Tez-tez yoki qiyin siyish',
  v: 'Varikosele',
  b: 'Bepushtlik (erkaklar)',
  z: 'Jinsiy zaiflik',
  j: 'Jinsiy yo‘l infeksiyalari',
  f: 'Fimoz / sunnat',
  u: 'Tekshiruv (ultratovush, tahlillar)',
  o: 'Boshqa savol',
};

const esc = (s = '') => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

const say = (env, chat_id, text, extra = {}) =>
  tg(env, 'sendMessage', { chat_id, text, parse_mode: 'HTML', ...extra });

const getState = async (env, id) => JSON.parse((await env.STATE.get(`s:${id}`)) || 'null');
const setState = (env, id, st) => env.STATE.put(`s:${id}`, JSON.stringify(st), { expirationTtl: 3600 });
const clearState = (env, id) => env.STATE.delete(`s:${id}`);

function normPhone(raw = '') {
  let d = String(raw).replace(/\D/g, '');
  if (d.length === 9) d = '998' + d;
  if (d.length === 12 && d.startsWith('998')) return '+' + d;
  if (d.length >= 10 && d.length <= 15) return '+' + d;
  return null;
}

const phoneKb = {
  keyboard: [[{ text: '📱 Raqamimni yuborish', request_contact: true }], [{ text: '❌ Bekor qilish' }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};
const BTN = {
  apply: '📝 Qabulga yozilish',
  prices: '💰 Narxlar',
  services: '🩺 Xizmatlar',
  ask: '💬 Shifokordan so‘rash',
  contact: '📞 Aloqa',
  more: '➕ Yana',
  back: '⬅️ Orqaga',
  changeDay: '📅 Boshqa kunni tanlash',
  cancel: '❌ Bekor qilish',
  report: '📊 Hisobot',
  about: '👨‍⚕️ Shifokor haqida',
  myid: '🆔 Mening ID',
};
const mainKbFor = (isDoc) => ({
  keyboard: [
    [{ text: BTN.apply }],
    [{ text: BTN.prices }, { text: BTN.services }],
    [{ text: BTN.ask }, { text: BTN.contact }],
    [{ text: BTN.more }],
    ...(isDoc ? [[{ text: BTN.report }]] : []),
  ],
  resize_keyboard: true,
  is_persistent: true,
});
const mainKb = mainKbFor(false);
const applyKb = {
  keyboard: [
    ...Object.values(TOPICS).reduce((rows, t, i) => (i % 2 ? rows[rows.length - 1].push({ text: t }) : rows.push([{ text: t }]), rows), []),
    [{ text: BTN.back }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};
const APPLY_TEXT = '📝 <b>Qabulga yozilish</b>\n\nQaysi masala bo‘yicha murojaat qilyapsiz? Pastdagi tugmalardan birini tanlang.';
const moreKb = {
  keyboard: [[{ text: BTN.about }, { text: BTN.myid }], [{ text: BTN.back }]],
  resize_keyboard: true,
  is_persistent: true,
};
const kbOf = (rows) => ({ keyboard: rows, resize_keyboard: true, is_persistent: true });
const pricesKb = kbOf([[{ text: BTN.apply }], [{ text: BTN.ask }, { text: BTN.contact }], [{ text: BTN.back }]]);
const servicesKb = kbOf([[{ text: BTN.apply }], [{ text: BTN.prices }, { text: BTN.ask }], [{ text: BTN.back }]]);
const contactKb = kbOf([[{ text: BTN.apply }], [{ text: BTN.ask }], [{ text: BTN.back }]]);
const cancelKb = kbOf([[{ text: BTN.cancel }]]);

// ---- kun va soat tanlash ----
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const chunk = (arr, n) => arr.reduce((rows, x, i) => (i % n ? rows[rows.length - 1].push(x) : rows.push([x]), rows), []);

// Toshkent vaqti bilan bugundan keyingi 10 ta ish kuni (yakshanba chiqarilmaydi)
function nextDays() {
  const days = [];
  for (let i = 1; days.length < 10; i++) {
    const d = new Date(Date.now() + 5 * 3600 * 1000 + i * 86400000);
    if (d.getUTCDay() === 0) continue;
    days.push({ iso: d.toISOString().slice(0, 10), label: `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]} (${WEEKDAYS[d.getUTCDay()]})` });
  }
  return days;
}
const slotsOf = (env) =>
  (env.SLOTS ? String(env.SLOTS).split(',').map((x) => x.trim()).filter(Boolean) : Array.from({ length: 10 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`));
const dateKb = () => kbOf([...chunk(nextDays().map((d) => ({ text: d.label })), 2), [{ text: BTN.cancel }]]);
const timeKb = (env) => kbOf([...chunk(slotsOf(env).map((t) => ({ text: t })), 3), [{ text: BTN.changeDay }], [{ text: BTN.cancel }]]);
const MENU_TEXT =
  '👋 Assalomu alaykum! Bu <b>Dr. Avazxon</b> (urolog-androlog, Qo‘qon, VitaMed klinikasi) qabuliga yozilish boti.\n\nPastdagi menyudan tanlang:';
const ABOUT_TEXT =
  '👨‍⚕️ <b>Dr. Avazxon</b>\nUrolog, endourolog\nQo‘qon, VitaMed klinikasi\n\n' +
  '🎓 <b>Ma’lumoti</b>\n• 2020 — Andijon davlat tibbiyot instituti\n• 2022 — Urologiya bo‘yicha mutaxassislik\n• 2025 — Endourolog qayta tayyorlov kursi\n\n' +
  '🏥 <b>Tajriba</b>\n2021-yildan buyon Qo‘qon shahrida urolog vrach. 1000 dan ortiq yuqori texnologik operatsiyalarni muvaffaqiyatli bajargan.\n\n' +
  '🔹 <b>Asosiy yo‘nalishlar</b>\n' +
  '• Prostata bezini lazerli davolash\n' +
  '• Siydik tosh kasalligida toshlarni lazer bilan olib tashlash\n' +
  '• Varikosele (erkaklar bepushtligining eng ko‘p sababi) — zamonaviy mikroxirurgik operatsiyalar\n' +
  '• Jinsiy zaiflikda konservativ davolash, og‘ir turlarida jinsiy olatni protezlash';
const PRICES_DEFAULT =
  '💰 <b>Narxlar</b>\nAniq narx ko‘rik va tekshiruv turiga bog‘liq. Narxni bilish uchun qabulga yoziling yoki +998 91 151 55 88 raqamiga qo‘ng‘iroq qiling.';
const SERVICES_TEXT =
  '🩺 <b>Quyidagi masalalar bo‘yicha ariza qoldirishingiz mumkin:</b>\n\n' +
  Object.values(TOPICS).map((t) => `• ${t}`).join('\n') +
  '\n\nAriza qoldirish uchun «Qabulga yozilish» tugmasini bosing.';
const CONTACT_TEXT =
  '📞 <b>Aloqa</b>\nTelefon: +998 91 151 55 88\nKlinika: VitaMed, Qo‘qon\n\nAriza qoldirish uchun «Qabulga yozilish» tugmasini bosing.';
const skipKb = { inline_keyboard: [[{ text: 'O‘tkazib yuborish', callback_data: 'skip' }]] };

function tashkentNow() {
  return new Date(Date.now() + 5 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 16);
}

// adminlar: DOCTOR_CHAT_IDS (sozlama) + /admin KOD orqali qo'shilganlar (KV)
const envDoctorIds = (env) => String(env.DOCTOR_CHAT_IDS || '').split(',').map((x) => x.trim()).filter(Boolean);
const getAdmins = async (env) => JSON.parse((await env.STATE.get('admins')) || '[]');
const doctorIds = async (env) => [...new Set([...envDoctorIds(env), ...(await getAdmins(env))])];
const isDoctor = async (env, chat) => (await doctorIds(env)).includes(String(chat));

const kb = async (env, chat) => mainKbFor(await isDoctor(env, chat));
const adminUrl = (env) => `${env.PUBLIC_URL || 'https://avazxon-bot.uchrashuvlar-mini-app.workers.dev'}/admin`;
const setMenuButton = (env, chat, on) =>
  tg(env, 'setChatMenuButton', {
    chat_id: chat,
    menu_button: on ? { type: 'web_app', text: '📊 Hisobot', web_app: { url: adminUrl(env) } } : { type: 'default' },
  }).catch(() => {});
const reportMsg = (env, chat) =>
  say(env, chat, '📊 Hisobotni ochish uchun tugmani bosing:', {
    reply_markup: { inline_keyboard: [[{ text: '📊 Hisobotni ochish', web_app: { url: adminUrl(env) } }]] },
  });

function sameText(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

async function adminCommand(env, m, text) {
  const chat = m.chat.id;
  const [cmd, ...rest] = text.split(/\s+/);
  const arg = rest.join(' ').trim();

  if (cmd === '/admin') {
    // koddan iborat xabarni chatdan o'chiramiz
    tg(env, 'deleteMessage', { chat_id: chat, message_id: m.message_id }).catch(() => {});
    if (!env.ADMIN_CODE) return say(env, chat, 'Admin kodi sozlanmagan.');
    if (await isDoctor(env, chat)) return say(env, chat, 'Siz allaqachon adminsiz.', { reply_markup: mainKbFor(true) });
    const tries = Number(await env.STATE.get(`adm:${chat}`)) || 0;
    if (tries >= 5) return say(env, chat, 'Juda ko‘p urinish. Bir soatdan keyin qayta urinib ko‘ring.');
    if (!arg || !sameText(arg, env.ADMIN_CODE)) {
      await env.STATE.put(`adm:${chat}`, String(tries + 1), { expirationTtl: 3600 });
      return say(env, chat, 'Kod noto‘g‘ri.');
    }
    const admins = await getAdmins(env);
    await env.STATE.put('admins', JSON.stringify([...admins, String(chat)]));
    await env.STATE.delete(`adm:${chat}`);
    await setMenuButton(env, chat, true);
    const who = m.from && m.from.username ? `@${esc(m.from.username)}` : `<code>${chat}</code>`;
    await Promise.all((await doctorIds(env)).filter((id) => id !== String(chat)).map((id) => say(env, id, `👤 Yangi admin qo‘shildi: ${who} (<code>${chat}</code>)`)));
    return say(env, chat, '✅ Siz admin bo‘ldingiz. Endi arizalar sizga ham keladi, ✅/❌ tugmalarini bosa olasiz va savollarga javob bera olasiz.\n\nAdminlar ro‘yxati: /adminlar\n📊 Hisobot ilovasi: pastdagi «📊 Hisobot» tugmasi.', { reply_markup: mainKbFor(true) });
  }

  if (!(await isDoctor(env, chat))) return;
  if (cmd === '/adminlar') {
    const fixed = envDoctorIds(env), added = await getAdmins(env);
    return say(env, chat, `👥 <b>Adminlar</b>\n\nAsosiy: ${fixed.map((x) => `<code>${x}</code>`).join(', ') || '—'}\nQo‘shilgan: ${added.map((x) => `<code>${x}</code>`).join(', ') || '—'}\n\nO‘chirish: /adminni_ochir ID`);
  }
  if (cmd === '/adminni_ochir') {
    if (envDoctorIds(env).includes(arg)) return say(env, chat, 'Bu admin sozlamada (DOCTOR_CHAT_IDS), bot orqali o‘chirib bo‘lmaydi.');
    const admins = await getAdmins(env);
    if (!admins.includes(arg)) return say(env, chat, 'Bunday admin topilmadi. Ro‘yxat: /adminlar');
    await env.STATE.put('admins', JSON.stringify(admins.filter((x) => x !== arg)));
    await setMenuButton(env, Number(arg), false);
    return say(env, chat, `✅ <code>${esc(arg)}</code> adminlikdan olindi.`);
  }
}

async function askDoctors(env, chat, text, from) {
  const who = from && from.username ? `@${esc(from.username)}` : `<a href="tg://user?id=${chat}">profil</a>`;
  const body = `❓ <b>Bemor savoli</b>\n\n${esc(text)}\n\n👤 ${who} · ${tashkentNow()}\n↩️ Javob berish uchun shu xabarga reply qiling.`;
  const ids = await doctorIds(env);
  await Promise.all(ids.map(async (id) => {
    const r = await say(env, id, body);
    if (r.ok) await env.STATE.put(`q:${id}:${r.result.message_id}`, String(chat), { expirationTtl: 7 * 86400 });
  }));
  return ids.length;
}

// hisobot uchun arizalar (KV): kalit b:<vaqt>:<id>, qisqa ma'lumot metadata'da (list bitta so'rovda hammasini beradi)
const compact = (b) => ({ n: b.n, p: b.p, t: b.t, d: b.d, h: b.h, s: b.s, src: b.src, c: String(b.c || '').slice(0, 100), at: b.at });
const saveBooking = (env, key, b) =>
  env.STATE.put(key, JSON.stringify(b), { expirationTtl: 400 * 86400, metadata: compact(b) });

async function notifyDoctors(env, a, from, patientChat) {
  const ids = await doctorIds(env);
  const who = from
    ? from.username ? `@${esc(from.username)}` : `<a href="tg://user?id=${from.id}">profil</a>`
    : 'veb-sayt orqali';
  const text =
    `🆕 <b>Yangi ariza</b>\n\n` +
    `👤 ${esc(a.name)}\n📞 ${esc(a.phone)}\n🩺 ${esc(a.topic)}\n` +
    (a.when ? `📅 <b>${esc(a.when)}</b>\n` : '') +
    (a.comment ? `💬 ${esc(a.comment)}\n` : '') +
    `\n🕒 ${tashkentNow()} · ${who}`;
  // bot orqali kelgan arizada tasdiqlash/rad etish tugmalari (bemorga xabar yuborish uchun chat kerak)
  const appId = Math.random().toString(36).slice(2, 10);
  const extra = patientChat
    ? { reply_markup: { inline_keyboard: [[{ text: '✅ Tasdiqlash', callback_data: `ap:ok:${appId}` }, { text: '❌ Rad etish', callback_data: `ap:no:${appId}` }]] } }
    : {};
  const bk = `b:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
  try {
    await saveBooking(env, bk, {
      n: a.name, p: a.phone, t: a.topic, d: a.iso || '', h: a.time || '', s: 'new',
      src: from ? 'bot' : 'sayt', c: a.comment || '', w: a.when || '', chat: patientChat || null, at: Date.now(),
    });
  } catch (e) { console.log('booking', e && e.message); }
  const rec = { chat: patientChat || null, when: a.when || '', text, msgs: [], status: null, bk };
  if (patientChat) await env.STATE.put(`ap:${appId}`, JSON.stringify(rec), { expirationTtl: 14 * 86400 });
  await Promise.all(ids.map(async (id) => {
    const r = await say(env, id, text, extra);
    if (r.ok) rec.msgs.push({ chat: id, id: r.result.message_id });
  }));
  if (patientChat) await env.STATE.put(`ap:${appId}`, JSON.stringify(rec), { expirationTtl: 14 * 86400 });
  return ids.length;
}

async function decide(env, q) {
  const [, act, appId] = q.data.split(':');
  const answer = (text) => tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text, show_alert: false });
  if (!(await isDoctor(env, q.message.chat.id))) return answer('Bu tugma faqat shifokor uchun.');
  const rec = JSON.parse((await env.STATE.get(`ap:${appId}`)) || 'null');
  if (!rec) return answer('Ariza eskirgan.');
  if (rec.status) return answer(`Allaqachon: ${rec.status}`);
  const ok = act === 'ok';
  rec.status = ok ? '✅ Tasdiqlandi' : '❌ Rad etildi';
  await env.STATE.put(`ap:${appId}`, JSON.stringify(rec), { expirationTtl: 14 * 86400 });

  if (rec.bk) {
    try {
      const v = JSON.parse((await env.STATE.get(rec.bk)) || 'null');
      if (v) { v.s = ok ? 'ok' : 'no'; await saveBooking(env, rec.bk, v); }
    } catch (e) { console.log('booking status', e && e.message); }
  }
  const when = rec.when ? ` (${esc(rec.when)})` : '';
  const r = await say(
    env, rec.chat,
    ok
      ? `✅ <b>Qabulingiz tasdiqlandi.</b>${rec.when ? `\n📅 ${esc(rec.when)}` : ''}\n\nVitaMed klinikasi, Qo‘qon. Sizni kutamiz!\nSavollar bo‘lsa: +998 91 151 55 88`
      : `❌ <b>Afsuski, tanlangan vaqt${when} band.</b>\nIltimos, boshqa kun yoki soatni tanlab «Qabulga yozilish» orqali qayta ariza qoldiring yoki +998 91 151 55 88 raqamiga qo‘ng‘iroq qiling.`
  );
  const by = q.from.username ? `@${esc(q.from.username)}` : `id ${q.from.id}`;
  await Promise.all((rec.msgs || []).map((m) =>
    tg(env, 'editMessageText', { chat_id: m.chat, message_id: m.id, parse_mode: 'HTML', text: `${rec.text}\n\n<b>${rec.status}</b> · ${by}` })
  ));
  return answer(r.ok ? rec.status : `${rec.status}. Lekin bemorga xabar yetmadi, o‘zingiz bog‘laning.`);
}

async function finish(env, chat, st, from) {
  const n = await notifyDoctors(env, st, from, chat);
  await clearState(env, chat);
  await env.STATE.put(`c:${chat}`, '1', { expirationTtl: 60 });
  await say(
    env, chat,
    n
      ? `✅ <b>Arizangiz qabul qilindi.</b>\n${st.when ? `📅 Tanlangan vaqt: <b>${esc(st.when)}</b>\n` : ''}Shifokor yoki administrator vaqtni tasdiqlash uchun siz bilan bog‘lanadi.\n\nShoshilinch bo‘lsa: +998 91 151 55 88\nMa’lumotlaringiz maxfiy saqlanadi.`
      : '⚠️ Ariza qabul qilindi, lekin shifokorga yuborishda sozlama xatosi bor. Iltimos, +998 91 151 55 88 raqamiga qo‘ng‘iroq qiling.',
    { reply_markup: await kb(env, chat) }
  );
}

async function beginApply(env, chat, topicKey) {
  if (await env.STATE.get(`c:${chat}`)) {
    return say(env, chat, 'Arizangiz hozirgina yuborilgan. Bir daqiqadan keyin qayta urinib ko‘ring.');
  }
  const st = { step: 'date' };
  if (topicKey && TOPICS[topicKey]) st.topic = TOPICS[topicKey];
  await setState(env, chat, st);
  return say(
    env, chat,
    (st.topic ? `Tanlangan masala: <b>${esc(st.topic)}</b>\n\n` : '') + '📅 Qaysi kunga yozilmoqchisiz? Kunni tanlang.',
    { reply_markup: dateKb() }
  );
}

const applyMenu = (env, chat) => clearState(env, chat).then(() => say(env, chat, APPLY_TEXT, { reply_markup: applyKb }));

async function onMessage(env, m) {
  const chat = m.chat.id;
  // eski klaviaturada qolgan yozuvlar va buyruqlar ham ishlasin
  const LEGACY = {
    '💬 Doktordan so‘rash': BTN.ask,
    '👨‍⚕️ Doktor haqida': BTN.about,
    'Tekshiruv (UZI, analizlar)': TOPICS.u,
    '/zayafka': '/ariza',
  };
  const raw = (m.text || '').trim();
  const text = LEGACY[raw] || raw;

  if (text === '/id') return say(env, chat, `Sizning chat ID: <code>${chat}</code>`);
  if (text === '/cancel' || text === BTN.cancel) {
    await clearState(env, chat);
    return say(env, chat, 'Bekor qilindi.', { reply_markup: await kb(env, chat) });
  }
  if (text === '/start' || text === '/help' || text === '/menu' || text === BTN.back) {
    await clearState(env, chat);
    return say(env, chat, text === BTN.back ? 'Asosiy menyu 👇' : MENU_TEXT, { reply_markup: await kb(env, chat) });
  }
  if (text === '/xizmatlar') return say(env, chat, SERVICES_TEXT, { reply_markup: servicesKb });
  if (text === '/ariza') return applyMenu(env, chat);

  if (/^\/(admin|adminlar|adminni_ochir)(\s|$)/.test(text)) return adminCommand(env, m, text);
  if (text === '/hisobot') {
    if (!(await isDoctor(env, chat))) return say(env, chat, 'Bu bo‘lim faqat adminlar uchun.');
    return reportMsg(env, chat);
  }

  // shifokor savolga reply qilsa, javob bemorga boradi
  if (m.reply_to_message && text && (await isDoctor(env, chat))) {
    const target = await env.STATE.get(`q:${chat}:${m.reply_to_message.message_id}`);
    if (target) {
      await say(env, target, `👨‍⚕️ <b>Shifokor javobi:</b>\n\n${esc(text)}`);
      return say(env, chat, '✅ Javob bemorga yuborildi.');
    }
  }

  // qabulga yozilish menyusidagi masala tugmasi
  const topicKey = Object.keys(TOPICS).find((k) => TOPICS[k] === text);
  if (topicKey) return beginApply(env, chat, topicKey);

  // menyu tugmalari (jarayon o‘rtasida bosilsa ham ishlaydi)
  switch (text) {
    case BTN.apply: return applyMenu(env, chat);
    case BTN.prices: await clearState(env, chat); return say(env, chat, env.PRICES_TEXT || PRICES_DEFAULT, { reply_markup: pricesKb });
    case BTN.services: await clearState(env, chat); return say(env, chat, SERVICES_TEXT, { reply_markup: servicesKb });
    case BTN.ask:
      await setState(env, chat, { step: 'ask' });
      return say(env, chat, '💬 Shifokorga savolingizni yozing. Javob shu yerga keladi.', { reply_markup: cancelKb });
    case BTN.contact: await clearState(env, chat); return say(env, chat, CONTACT_TEXT, { reply_markup: contactKb });
    case BTN.more: await clearState(env, chat); return say(env, chat, 'Qo‘shimcha 👇', { reply_markup: moreKb });
    case BTN.report:
      if (!(await isDoctor(env, chat))) return say(env, chat, 'Bu bo‘lim faqat adminlar uchun.');
      return reportMsg(env, chat);
    case BTN.about: return say(env, chat, ABOUT_TEXT);
    case BTN.myid: return say(env, chat, `Sizning chat ID: <code>${chat}</code>`);
  }

  const st = await getState(env, chat);
  if (!st) return say(env, chat, 'Qabulga yozilish uchun /start bosing.');

  if (st.step === 'date') {
    const d = nextDays().find((x) => x.label === text);
    if (!d) return say(env, chat, 'Iltimos, kunni pastdagi tugmalardan tanlang.', { reply_markup: dateKb() });
    st.date = d.label;
    st.iso = d.iso;
    st.step = 'time';
    await setState(env, chat, st);
    return say(env, chat, `📅 <b>${esc(d.label)}</b>\n\n🕒 Qaysi soatga yozilmoqchisiz?`, { reply_markup: timeKb(env) });
  }

  if (st.step === 'time') {
    if (text === BTN.changeDay) {
      st.step = 'date';
      await setState(env, chat, st);
      return say(env, chat, '📅 Qaysi kunga yozilmoqchisiz? Kunni tanlang.', { reply_markup: dateKb() });
    }
    if (!slotsOf(env).includes(text)) return say(env, chat, 'Iltimos, soatni pastdagi tugmalardan tanlang.', { reply_markup: timeKb(env) });
    st.when = `${st.date}, ${text}`;
    st.time = text;
    st.step = 'name';
    await setState(env, chat, st);
    return say(env, chat, `✅ Tanlandi: <b>${esc(st.when)}</b>\n\nAriza qoldirish uchun <b>ismingizni</b> yozing.`, { reply_markup: cancelKb });
  }

  if (st.step === 'name') {
    if (text.length < 2 || text.length > 60) return say(env, chat, 'Iltimos, ismingizni yozing (2–60 belgi).');
    st.name = text.slice(0, 60);
    st.step = 'phone';
    await setState(env, chat, st);
    return say(env, chat, '📞 Telefon raqamingizni yuboring (tugma orqali yoki yozing, masalan 90 123 45 67).', { reply_markup: phoneKb });
  }

  if (st.step === 'phone') {
    const p = normPhone(m.contact ? m.contact.phone_number : text);
    if (!p) return say(env, chat, 'Raqam noto‘g‘ri ko‘rinadi. Qaytadan yozing, masalan: 90 123 45 67');
    st.phone = p;
    st.step = 'comment';
    await setState(env, chat, st);
    await say(env, chat, 'Raqam qabul qilindi ✅', { reply_markup: cancelKb });
    return say(env, chat, '💬 Qisqacha izoh yozing (ixtiyoriy). Yoki o‘tkazib yuboring.', { reply_markup: skipKb });
  }

  if (st.step === 'ask') {
    if (text.length < 3) return say(env, chat, 'Iltimos, savolingizni yozing.');
    await clearState(env, chat);
    const n = await askDoctors(env, chat, text.slice(0, 1000), m.from);
    return say(env, chat, n ? '✅ Savolingiz shifokorga yuborildi. Javob shu yerga keladi.' : '⚠️ Yuborishda xato. +998 91 151 55 88 raqamiga qo‘ng‘iroq qiling.', { reply_markup: await kb(env, chat) });
  }

  if (st.step === 'comment') {
    st.comment = text.slice(0, 500);
    return finish(env, chat, st, m.from);
  }
}

async function onCallback(env, q) {
  if (q.data && q.data.startsWith('ap:')) return decide(env, q);
  const chat = q.message.chat.id;
  await tg(env, 'answerCallbackQuery', { callback_query_id: q.id });

  const st = await getState(env, chat);
  if (!st) return say(env, chat, 'Qabulga yozilish uchun /start bosing.');

  if (q.data === 'skip' && st.step === 'comment') return finish(env, chat, st, q.from);
}

// ---- hisobot ilovasi (Telegram Mini App) ----
const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hmacSha256(keyBytes, msg) {
  const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
}
// initData Telegram'dan kelganini BOT_TOKEN bilan tekshiramiz; to'g'ri bo'lsa foydalanuvchini qaytaradi
async function verifyInitData(env, initData) {
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  if (!hash) return null;
  p.delete('hash');
  const check = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = await hmacSha256(new TextEncoder().encode('WebAppData'), env.BOT_TOKEN);
  if (!sameText(hex(await hmacSha256(secret, check)), hash)) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > 86400) return null;
  try { return JSON.parse(p.get('user') || 'null'); } catch { return null; }
}

async function adminApi(env, request) {
  const auth = request.headers.get('authorization') || '';
  const user = auth.startsWith('tma ') ? await verifyInitData(env, auth.slice(4)) : null;
  if (!user) return Response.json({ ok: false, error: 'auth' }, { status: 401 });
  if (!(await isDoctor(env, user.id))) return Response.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const bookings = [];
  let cursor;
  do {
    const r = await env.STATE.list({ prefix: 'b:', cursor, limit: 1000 });
    bookings.push(...r.keys.map((k) => ({ k: k.name, ...(k.metadata || {}) })));
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor && bookings.length < 5000);
  return Response.json({ ok: true, now: Date.now(), slots: slotsOf(env), bookings }, { headers: { 'cache-control': 'no-store' } });
}

// Saytdan ariza olish (keyinchalik saytni ulash uchun)
async function apply(env, request) {
  // ALLOWED_ORIGIN: bitta yoki vergul bilan bir nechta sayt manzili
  const allowed = String(env.ALLOWED_ORIGIN || '*').split(',').map((x) => x.trim()).filter(Boolean);
  const reqOrigin = request.headers.get('origin');
  const origin = allowed.includes('*') ? '*' : allowed.includes(reqOrigin) ? reqOrigin : allowed[0];
  const cors = {
    vary: 'Origin',
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
  let b;
  try { b = await request.json(); } catch { return Response.json({ ok: false, error: 'bad json' }, { status: 400, headers: cors }); }
  if (b.website) return Response.json({ ok: true }, { headers: cors }); // honeypot
  const phone = normPhone(b.phone);
  const name = String(b.name || '').trim().slice(0, 60);
  if (!phone || name.length < 2) return Response.json({ ok: false, error: 'name/phone' }, { status: 400, headers: cors });
  const ip = request.headers.get('cf-connecting-ip') || 'x';
  if (await env.STATE.get(`r:${ip}`)) return Response.json({ ok: false, error: 'too many' }, { status: 429, headers: cors });
  await env.STATE.put(`r:${ip}`, '1', { expirationTtl: 60 });
  await notifyDoctors(env, { name, phone, topic: String(b.topic || TOPICS.o).slice(0, 60), comment: String(b.comment || '').slice(0, 500) }, null);
  return Response.json({ ok: true }, { headers: cors });
}

// ---- hisobot sahifasi (bot/admin.html dan joylangan) ----
const ADMIN_HTML = String.raw`<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>Hisobot</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
:root{color-scheme:light;--bg:#f3f3f0;--card:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--ink3:#6b6a65;--line:#e1e0d9;--s1:#2a78d6;--on:#fff;--wash:rgba(42,120,214,.10);--good:#0ca30c;--warn:#fab219;--crit:#d03b3b;--good-bg:rgba(12,163,12,.12);--warn-bg:rgba(250,178,25,.20);--crit-bg:rgba(208,59,59,.11);--shadow:0 1px 2px rgba(16,16,14,.05),0 2px 8px rgba(16,16,14,.04)}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){color-scheme:dark;--bg:#121211;--card:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--ink3:#8d8c84;--line:#2c2c2a;--s1:#3987e5;--on:#0b0b0b;--wash:rgba(57,135,229,.18);--good-bg:rgba(12,163,12,.22);--warn-bg:rgba(250,178,25,.20);--crit-bg:rgba(208,59,59,.26);--shadow:none}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#121211;--card:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--ink3:#8d8c84;--line:#2c2c2a;--s1:#3987e5;--on:#0b0b0b;--wash:rgba(57,135,229,.18);--good-bg:rgba(12,163,12,.22);--warn-bg:rgba(250,178,25,.20);--crit-bg:rgba(208,59,59,.26);--shadow:none}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
button{font:inherit;color:inherit;cursor:pointer;background:none;border:0;padding:0}
button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--s1);outline-offset:2px}
svg{display:block;width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.top{position:sticky;top:0;z-index:5;background:var(--bg);padding:14px 16px 10px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.top h1{font-size:20px;line-height:1.2;margin:0;font-weight:700;letter-spacing:-.01em}
.top .sub{font-size:12px;color:var(--ink3);margin-top:2px}
.rbtn{width:44px;height:44px;border-radius:12px;background:var(--card);border:1px solid var(--line);display:grid;place-items:center;box-shadow:var(--shadow)}
.rbtn.spin svg{animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
main{max-width:640px;margin:0 auto;padding:4px 16px calc(92px + env(safe-area-inset-bottom))}
.tabs{position:fixed;left:0;right:0;bottom:0;z-index:6;background:var(--card);border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(3,1fr);padding:6px 8px calc(6px + env(safe-area-inset-bottom))}
.tab{min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:11px;color:var(--ink3);border-radius:12px}
.tab[aria-selected="true"]{color:var(--s1);font-weight:700}
h2{font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink3);margin:24px 2px 8px;font-weight:700}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}
.pad{padding:14px 16px}
.strip{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x proximity;margin:0 -16px;padding:2px 16px 8px;scrollbar-width:none}
.strip::-webkit-scrollbar{display:none}
.dchip{flex:0 0 auto;scroll-snap-align:start;width:58px;min-height:78px;border-radius:16px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:var(--shadow)}
.dchip .w{font-size:11px;color:var(--ink3);font-weight:600}
.dchip .n{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}
.dchip .c{min-width:20px;height:18px;border-radius:9px;font-size:11px;font-weight:700;display:grid;place-items:center;padding:0 6px;background:var(--wash);color:var(--ink)}
.dchip .c.z{background:transparent;color:var(--ink3);font-weight:500}
.dchip[aria-pressed="true"]{background:var(--s1);border-color:var(--s1)}
.dchip[aria-pressed="true"] .w,.dchip[aria-pressed="true"] .n,.dchip[aria-pressed="true"] .c{color:var(--on)}
.dchip[aria-pressed="true"] .c{background:rgba(255,255,255,.22)}
:root[data-theme="dark"] .dchip[aria-pressed="true"] .c{background:rgba(0,0,0,.16)}
.sum .d{font-size:18px;font-weight:700;letter-spacing:-.01em}
.sum .chip{font-size:11px;padding:2px 8px;border-radius:999px;background:var(--wash);margin-left:8px;font-weight:700;vertical-align:2px}
.sum .m{font-size:13px;color:var(--ink2);margin-top:2px}
.occ{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:12px;color:var(--ink2)}
.track{flex:1;height:8px;border-radius:4px;background:var(--line);overflow:hidden}
.fill{height:100%;background:var(--s1);border-radius:4px}
.slots{margin-top:12px;display:flex;flex-direction:column;gap:6px}
.slot{display:grid;grid-template-columns:50px 1fr;gap:10px;align-items:start}
.slot .t{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--ink2);padding-top:12px}
.free{min-height:40px;border:1px dashed var(--line);border-radius:12px;display:flex;align-items:center;padding:0 12px;font-size:13px;color:var(--ink3)}
.bk{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--s1);border-radius:12px;box-shadow:var(--shadow);margin-bottom:6px;width:100%;text-align:left}
.bk.ok{border-left-color:var(--good)}.bk.new{border-left-color:var(--warn)}.bk.no{border-left-color:var(--crit);opacity:.72}
.bk .main{flex:1;min-width:0;padding:10px 0 10px 12px;min-height:56px}
.bk .nm{font-weight:600;overflow-wrap:anywhere}
.bk .tp{font-size:12px;color:var(--ink2);margin-top:1px;overflow-wrap:anywhere}
.call{flex:0 0 auto;width:44px;height:44px;margin-right:4px;border-radius:12px;display:grid;place-items:center;color:var(--s1);background:var(--wash);text-decoration:none}
.pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;margin-top:5px;color:var(--ink)}
.pill.ok{background:var(--good-bg)}.pill.new{background:var(--warn-bg)}.pill.no{background:var(--crit-bg)}
.warnnote{font-size:12px;color:var(--ink2);margin-top:4px}
.search{position:relative;margin-bottom:10px}
.search svg{position:absolute;left:12px;top:11px;width:20px;height:20px;color:var(--ink3);pointer-events:none}
.search input{width:100%;min-height:44px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);padding:0 12px 0 40px;font:inherit}
.chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -16px 6px;padding:0 16px 4px}
.chips::-webkit-scrollbar{display:none}
.chips button{flex:0 0 auto;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);font-size:14px;white-space:nowrap}
.chips button[aria-pressed="true"]{border-color:var(--s1);background:var(--wash);font-weight:700}
.chips button b{font-variant-numeric:tabular-nums;color:var(--ink2);font-weight:600;margin-left:4px}
.grp{font-size:12px;color:var(--ink3);font-weight:700;margin:16px 4px 6px}
.item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 14px;margin-bottom:8px;min-height:64px}
.av{flex:0 0 auto;width:40px;height:40px;border-radius:20px;background:var(--wash);display:grid;place-items:center;font-weight:700;font-size:14px;color:var(--ink)}
.item .body{flex:1;min-width:0}
.item .nm{font-weight:600;overflow-wrap:anywhere}
.item .sub{font-size:12px;color:var(--ink2);margin-top:1px;overflow-wrap:anywhere}
.item .when{font-size:12px;color:var(--ink);margin-top:3px;font-weight:600}
.item .side{flex:0 0 auto;align-self:flex-start}
.item .side .pill{margin-top:0;white-space:nowrap}
.src{color:var(--ink3);font-weight:500}
.hero{padding:18px 16px;display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.hero b{font-size:48px;line-height:1;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.hero span{display:block;font-size:13px;color:var(--ink2);margin-top:6px}
.hero .today{font-size:13px;color:var(--ink);background:var(--wash);padding:6px 10px;border-radius:999px;font-weight:600;white-space:nowrap}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
.kpi{padding:12px 10px}
.kpi b{display:block;font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}
.kpi span{display:flex;align-items:center;font-size:12px;color:var(--ink2);margin-top:4px;white-space:nowrap}
.kpi i{flex:0 0 auto;width:8px;height:8px;border-radius:4px;margin-right:6px}
.cols{display:flex;align-items:flex-end;gap:4px;height:150px}
.col{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.col .v{font-size:11px;color:var(--ink2);font-variant-numeric:tabular-nums;margin-bottom:3px}
.col .bar{width:100%;max-width:24px;background:var(--s1);border-radius:4px 4px 0 0;min-height:2px}
.col .bar.zero{background:var(--line)}
.col .x{font-size:10px;color:var(--ink3);margin-top:5px;text-align:center;line-height:1.15;white-space:pre-line}
.col.today .x{color:var(--ink);font-weight:700}
.axis{height:1px;background:var(--line);margin-top:-1px}
.bars .r{margin-bottom:12px}.bars .r:last-child{margin-bottom:0}
.bars .l{display:flex;justify-content:space-between;gap:8px;font-size:14px;margin-bottom:5px}
.bars .l span:last-child{font-variant-numeric:tabular-nums;font-weight:700}
.bars .tr{height:10px;background:var(--line);border-radius:5px;overflow:hidden}
.bars .tr i{display:block;height:100%;background:var(--s1);border-radius:0 4px 4px 0}
.empty{padding:36px 20px;text-align:center;color:var(--ink2)}
.empty .ic{width:48px;height:48px;border-radius:24px;background:var(--wash);display:grid;place-items:center;margin:0 auto 10px;color:var(--s1)}
.empty b{display:block;color:var(--ink);font-size:16px;margin-bottom:4px}
.msg{min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;color:var(--ink2)}
.msg h2{font-size:20px;text-transform:none;letter-spacing:0;color:var(--ink);margin:12px 0 6px}
.btn{min-height:46px;padding:0 20px;border-radius:12px;background:var(--s1);color:var(--on);font-weight:700;margin-top:16px}
.sk{height:84px;border-radius:16px;background:var(--card);border:1px solid var(--line);margin-bottom:8px;animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{50%{opacity:.5}}
.scrim{position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.45);display:none}
.scrim.on{display:block}
.sheet{position:fixed;left:0;right:0;bottom:0;z-index:21;max-width:640px;margin:0 auto;background:var(--card);border-radius:20px 20px 0 0;padding:8px 16px calc(20px + env(safe-area-inset-bottom));max-height:86vh;overflow:auto;transform:translateY(105%);visibility:hidden;transition:transform .22s ease,visibility 0s linear .22s}
.sheet.on{transform:none;visibility:visible;transition:transform .22s ease,visibility 0s}
.grab{width:40px;height:4px;border-radius:2px;background:var(--line);margin:4px auto 12px}
.sheet h3{font-size:20px;margin:0;letter-spacing:-.01em;overflow-wrap:anywhere}
.dl{margin:14px 0 0}
.dl div{display:grid;grid-template-columns:96px 1fr;gap:10px;padding:11px 0;border-top:1px solid var(--line)}
.dl dt{font-size:13px;color:var(--ink3)}
.dl dd{margin:0;overflow-wrap:anywhere}
.big{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:50px;border-radius:14px;background:var(--s1);color:var(--on);font-weight:700;text-decoration:none;margin-top:14px}
.big svg{width:20px;height:20px}
.close{width:100%;min-height:46px;margin-top:8px;border-radius:14px;background:var(--wash);font-weight:600}
@media (prefers-reduced-motion:reduce){.sheet,.sheet.on{transition:none}.rbtn.spin svg,.sk{animation:none}}
</style>
</head>
<body>
<header class="top">
  <div><h1>Hisobot</h1><div class="sub" id="sub">Dr. Avazxon</div></div>
  <button class="rbtn" id="refresh" aria-label="Yangilash"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg></button>
</header>
<main id="view"><div class="sk"></div><div class="sk"></div><div class="sk"></div></main>
<nav class="tabs" role="tablist" aria-label="Bo‘limlar" id="tabs"></nav>
<div class="scrim" id="scrim"></div>
<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="Ariza ma’lumoti"></div>
<script>
(function(){
var tg = window.Telegram && window.Telegram.WebApp;
if (tg) { try { tg.ready(); tg.expand(); if (tg.colorScheme) document.documentElement.setAttribute('data-theme', tg.colorScheme); } catch (e) {} }

var MONTHS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
var WD = ['yakshanba','dushanba','seshanba','chorshanba','payshanba','juma','shanba'];
var WDS = ['Ya','Du','Se','Ch','Pa','Ju','Sh'];
var STATUS = { 'new': { i: '⏳', l: 'Kutilmoqda' }, ok: { i: '✅', l: 'Tasdiqlangan' }, no: { i: '❌', l: 'Rad etilgan' } };
var ICON = {
  cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.6" cy="6.5" r="1"/><circle cx="4.6" cy="12" r="1"/><circle cx="4.6" cy="17.5" r="1"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  empty: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15h6"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>'
};
var TABS = [['jadval', 'Jadval', 'cal'], ['arizalar', 'Arizalar', 'list'], ['stat', 'Statistika', 'chart']];
var state = { data: null, tab: 'jadval', day: null, filter: 'all', q: '', at: null };
var view = document.getElementById('view');

function $(id) { return document.getElementById(id); }
function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function add(p) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) p.appendChild(arguments[i]); return p; }
function icon(name, cls) { var s = el('span', cls); s.innerHTML = ICON[name]; return s; }
function two(n) { return n < 10 ? '0' + n : '' + n; }
function tzNow() { return new Date(Date.now() + 5 * 3600000); }
function todayISO() { return tzNow().toISOString().slice(0, 10); }
function addDays(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function dparts(iso) { var d = new Date(iso + 'T00:00:00Z'); return { d: d.getUTCDate(), m: d.getUTCMonth(), w: d.getUTCDay() }; }
function dshort(iso) { var p = dparts(iso); return p.d + '-' + MONTHS[p.m]; }
function dlabel(iso) { var p = dparts(iso); return p.d + '-' + MONTHS[p.m] + ', ' + WD[p.w]; }
function stamp(ms) { var d = new Date(ms + 5 * 3600000); return two(d.getUTCDate()) + '.' + two(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear() + ' ' + two(d.getUTCHours()) + ':' + two(d.getUTCMinutes()); }
function phoneHref(p) { return 'tel:' + String(p || '').replace(/[^+\d]/g, ''); }
function tick() { try { tg.HapticFeedback.selectionChanged(); } catch (e) {} }
function initials(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?').charAt(0) + (p[1] ? p[1].charAt(0) : '')).toUpperCase(); }
function workDays(today, n) { var out = [], cur = today; for (var i = 0; out.length < n && i < 30; i++) { if (dparts(cur).w !== 0) out.push(cur); cur = addDays(cur, 1); } return out; }
function pill(s) { var st = STATUS[s] || STATUS['new']; return el('span', 'pill ' + (STATUS[s] ? s : 'new'), st.i + ' ' + st.l); }

function message(title, text, btn) {
  view.textContent = '';
  var m = el('div', 'msg'); var ic = icon('lock'); ic.firstChild.style.cssText = 'width:44px;height:44px;color:var(--ink3)';
  add(m, ic, el('h2', null, title), el('div', null, text));
  if (btn) { var b = el('button', 'btn', btn); b.onclick = load; m.appendChild(b); }
  view.appendChild(m); $('tabs').style.display = 'none';
}

function load() {
  if (!tg || !tg.initData) { message('Telegram ichida oching', 'Hisobot faqat Telegram botdagi «📊 Hisobot» tugmasi orqali ochiladi.'); return; }
  $('refresh').classList.add('spin');
  fetch('/admin/api/bookings', { headers: { Authorization: 'tma ' + tg.initData }, cache: 'no-store' })
    .then(function (r) {
      if (r.status === 403) { message('Ruxsat yo‘q', 'Bu bo‘lim faqat adminlar uchun.'); return null; }
      if (r.status === 401) { message('Qayta oching', 'Sessiya eskirgan. Hisobotni botdan qaytadan oching.'); return null; }
      if (!r.ok) throw new Error('http');
      return r.json();
    })
    .then(function (j) { if (j) { state.data = j; state.at = Date.now(); $('tabs').style.display = ''; render(); } })
    .catch(function () { if (state.data) { render(); } else { message('Yuklab bo‘lmadi', 'Internetni tekshirib, qayta urinib ko‘ring.', 'Qayta urinish'); } })
    .then(function () { $('refresh').classList.remove('spin'); });
}

function drawTabs() {
  var nav = $('tabs'); nav.textContent = '';
  TABS.forEach(function (t) {
    var b = el('button', 'tab'); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', state.tab === t[0] ? 'true' : 'false');
    add(b, icon(t[2]), el('span', null, t[1]));
    b.onclick = function () { if (state.tab !== t[0]) { state.tab = t[0]; tick(); render(); window.scrollTo(0, 0); } };
    nav.appendChild(b);
  });
}

/* ---------- Jadval ---------- */
function bookingCard(b, clash) {
  var card = el('div', 'bk ' + (STATUS[b.s] ? b.s : 'new'));
  var main = el('button', 'main'); main.style.cssText = 'text-align:left;background:none;border:0;cursor:pointer;color:inherit;font:inherit';
  add(main, el('div', 'nm', b.n || '—'), el('div', 'tp', b.t || ''), pill(b.s));
  if (clash) add(main, el('div', 'warnnote', '⚠️ Shu vaqtga yana bir ariza bor'));
  main.onclick = function () { openSheet(b); };
  var call = el('a', 'call'); call.href = phoneHref(b.p); call.setAttribute('aria-label', 'Qo‘ng‘iroq: ' + (b.p || '')); call.appendChild(icon('phone'));
  return add(card, main, call);
}

function renderSchedule(all, slots, today) {
  var days = workDays(today, 11);
  if (!state.day || days.indexOf(state.day) < 0) state.day = days[0];
  var cnt = {}; all.forEach(function (b) { if (b.d && b.s !== 'no') cnt[b.d] = (cnt[b.d] || 0) + 1; });

  var strip = el('div', 'strip'); strip.setAttribute('role', 'group'); strip.setAttribute('aria-label', 'Kunni tanlang');
  days.forEach(function (iso) {
    var p = dparts(iso), n = cnt[iso] || 0;
    var b = el('button', 'dchip'); b.setAttribute('aria-pressed', iso === state.day ? 'true' : 'false'); b.setAttribute('data-iso', iso);
    b.setAttribute('aria-label', dlabel(iso) + ': ' + n + ' ta ariza');
    add(b, el('span', 'w', iso === today ? 'Bugun' : WDS[p.w]), el('span', 'n', String(p.d)), el('span', 'c' + (n ? '' : ' z'), n ? String(n) : '·'));
    b.onclick = function () { state.day = iso; tick(); render(); };
    strip.appendChild(b);
  });
  view.appendChild(strip);

  var iso = state.day;
  var dayAll = all.filter(function (b) { return b.d === iso; });
  var live = dayAll.filter(function (b) { return b.s !== 'no'; });
  var byTime = {}; dayAll.forEach(function (b) { (byTime[b.h] = byTime[b.h] || []).push(b); });
  var busy = 0; slots.forEach(function (h) { if ((byTime[h] || []).some(function (b) { return b.s !== 'no'; })) busy++; });

  var sum = el('div', 'card pad sum');
  var d = el('div', 'd', dlabel(iso));
  if (iso === today) add(d, el('span', 'chip', 'Bugun')); else if (iso === addDays(today, 1)) add(d, el('span', 'chip', 'Ertaga'));
  add(sum, d, el('div', 'm', live.length ? live.length + ' ta ariza' : 'Bu kunga ariza yo‘q'));
  var occ = el('div', 'occ'), tr = el('div', 'track'), f = el('div', 'fill');
  f.style.width = (slots.length ? Math.min(100, busy / slots.length * 100) : 0) + '%';
  add(tr, f); add(occ, tr, el('span', null, 'Band ' + busy + '/' + slots.length + ' soat')); sum.appendChild(occ);
  view.appendChild(sum);

  var list = el('div', 'slots');
  var known = {};
  slots.forEach(function (h) {
    known[h] = 1;
    var row = el('div', 'slot'); add(row, el('div', 't', h));
    var cell = el('div'); var items = (byTime[h] || []).slice().sort(function (a, b) { return a.at - b.at; });
    var liveN = items.filter(function (b) { return b.s !== 'no'; }).length;
    if (!items.length) add(cell, el('div', 'free', 'Bo‘sh'));
    else items.forEach(function (b) { cell.appendChild(bookingCard(b, b.s !== 'no' && liveN > 1)); });
    row.appendChild(cell); list.appendChild(row);
  });
  var other = dayAll.filter(function (b) { return !known[b.h]; });
  if (other.length) {
    var row = el('div', 'slot'); add(row, el('div', 't', '···')); var cell = el('div');
    other.forEach(function (b) { cell.appendChild(bookingCard(b, false)); }); row.appendChild(cell); list.appendChild(row);
  }
  view.appendChild(list);
  setTimeout(function () { var a = strip.querySelector('[aria-pressed="true"]'); if (a && a.scrollIntoView) { try { a.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {} } }, 0);
}

/* ---------- Arizalar ---------- */
function matches(b) {
  if (state.filter !== 'all' && b.s !== state.filter) return false;
  var q = state.q.trim().toLowerCase();
  return !q || ((b.n || '') + ' ' + (b.p || '') + ' ' + (b.t || '')).toLowerCase().indexOf(q) >= 0;
}
function groupName(ms, today) {
  var iso = new Date(ms + 5 * 3600000).toISOString().slice(0, 10);
  if (iso === today) return 'Bugun'; if (iso === addDays(today, -1)) return 'Kecha'; return dshort(iso);
}
function renderList(all, today) {
  var cnt = { all: all.length, 'new': 0, ok: 0, no: 0 }; all.forEach(function (b) { if (cnt[b.s] != null) cnt[b.s]++; });
  var s = el('div', 'search'); s.appendChild(icon('search'));
  var q = el('input'); q.type = 'search'; q.placeholder = 'Ism, telefon yoki masala'; q.value = state.q; q.setAttribute('aria-label', 'Qidiruv');
  q.oninput = function () { state.q = q.value; renderListBody(all, today, true); };
  s.appendChild(q); view.appendChild(s);
  var chips = el('div', 'chips'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'Holat bo‘yicha filtr');
  [['all', 'Barchasi'], ['new', 'Kutilmoqda'], ['ok', 'Tasdiqlangan'], ['no', 'Rad etilgan']].forEach(function (f) {
    var b = el('button', null, f[1]); add(b, el('b', null, String(cnt[f[0]] || 0))); b.setAttribute('aria-pressed', state.filter === f[0] ? 'true' : 'false');
    b.onclick = function () { state.filter = f[0]; tick(); render(); }; chips.appendChild(b);
  });
  view.appendChild(chips);
  var holder = el('div'); holder.id = 'listbody'; view.appendChild(holder);
  renderListBody(all, today, false);
}
function renderListBody(all, today) {
  var holder = $('listbody'); holder.textContent = '';
  var rows = all.filter(matches).sort(function (a, b) { return b.at - a.at; });
  if (!rows.length) {
    var e = el('div', 'card empty'); var ic = el('div', 'ic'); ic.appendChild(icon('empty'));
    add(e, ic, el('b', null, all.length ? 'Hech narsa topilmadi' : 'Hozircha ariza yo‘q'), el('div', null, all.length ? 'Filtr yoki qidiruvni o‘zgartirib ko‘ring.' : 'Yangi arizalar shu yerda paydo bo‘ladi.'));
    holder.appendChild(e); return;
  }
  var last = null;
  rows.forEach(function (b) {
    var g = groupName(b.at, today);
    if (g !== last) { holder.appendChild(el('div', 'grp', g)); last = g; }
    var it = el('button', 'card item');
    var body = el('div', 'body');
    var when = el('div', 'when', b.d ? '📅 ' + dshort(b.d) + (b.h ? ' · ' + b.h : '') : '📅 Kun tanlanmagan');
    add(when, el('span', 'src', ' · ' + (b.src === 'sayt' ? 'Sayt' : 'Bot')));
    add(body, el('div', 'nm', b.n || '—'), el('div', 'sub', b.t || ''), when);
    var side = el('div', 'side'); add(side, pill(b.s));
    add(it, el('div', 'av', initials(b.n)), body, side);
    it.onclick = function () { openSheet(b); };
    holder.appendChild(it);
  });
}

/* ---------- Statistika ---------- */
function renderStats(all, today) {
  var startDay = Date.parse(today + 'T00:00:00Z') - 5 * 3600000;
  var c = { 'new': 0, ok: 0, no: 0 }; all.forEach(function (b) { if (c[b.s] != null) c[b.s]++; });
  var todayN = all.filter(function (b) { return b.at >= startDay; }).length;
  var hero = el('div', 'card hero'); var l = el('div'); add(l, el('b', null, String(all.length)), el('span', null, 'Jami arizalar'));
  add(hero, l, el('div', 'today', 'Bugun: +' + todayN)); view.appendChild(hero);
  var k = el('div', 'kpis');
  [['new', 'Kutilmoqda', 'var(--warn)'], ['ok', 'Tasdiqlangan', 'var(--good)'], ['no', 'Rad etilgan', 'var(--crit)']].forEach(function (x) {
    var card = el('div', 'card kpi'); var sp = el('span'); var dot = el('i'); dot.style.background = x[2]; add(sp, dot, document.createTextNode(x[1]));
    add(card, el('b', null, String(c[x[0]])), sp); k.appendChild(card);
  });
  view.appendChild(k);

  view.appendChild(el('h2', null, 'Kelgusi 10 ish kuni'));
  var days = workDays(today, 10), cnt = {}; all.forEach(function (b) { if (b.d && b.s !== 'no') cnt[b.d] = (cnt[b.d] || 0) + 1; });
  var max = Math.max(1, Math.max.apply(null, days.map(function (d) { return cnt[d] || 0; })));
  var wrap = el('div', 'card pad'), cols = el('div', 'cols');
  days.forEach(function (d) {
    var n = cnt[d] || 0, p = dparts(d), col = el('div', 'col' + (d === today ? ' today' : '')); col.title = dlabel(d) + ': ' + n + ' ta';
    var bar = el('div', 'bar' + (n ? '' : ' zero')); bar.style.height = n ? Math.max(6, n / max * 100) + 'px' : '2px';
    add(col, el('div', 'v', String(n)), bar, el('div', 'x', p.d + '.' + two(p.m + 1) + '\n' + WDS[p.w])); cols.appendChild(col);
  });
  add(wrap, cols, el('div', 'axis')); view.appendChild(wrap);

  view.appendChild(el('h2', null, 'Manba'));
  var bot = all.filter(function (b) { return b.src === 'bot'; }).length, site = all.length - bot;
  view.appendChild(barList([['Telegram bot', bot], ['Veb-sayt', site]]));

  view.appendChild(el('h2', null, 'Masalalar bo‘yicha'));
  var t = {}; all.forEach(function (b) { if (b.s !== 'no') { var k2 = b.t || 'Boshqa'; t[k2] = (t[k2] || 0) + 1; } });
  var keys = Object.keys(t).sort(function (a, b) { return t[b] - t[a]; });
  view.appendChild(keys.length ? barList(keys.map(function (x) { return [x, t[x]]; })) : (function () { var e = el('div', 'card empty'); e.appendChild(el('div', null, 'Hozircha ma’lumot yo‘q')); return e; })());
}
function barList(pairs) {
  var wrap = el('div', 'card pad bars'), max = Math.max(1, Math.max.apply(null, pairs.map(function (p) { return p[1]; })));
  pairs.forEach(function (p) {
    var r = el('div', 'r'), l = el('div', 'l'), tr = el('div', 'tr'), i = el('i'); i.style.width = (p[1] / max * 100) + '%';
    add(l, el('span', null, p[0]), el('span', null, String(p[1]))); add(tr, i); add(r, l, tr); wrap.appendChild(r);
  });
  return wrap;
}

/* ---------- Batafsil oyna ---------- */
function openSheet(b) {
  var s = $('sheet'); s.textContent = '';
  add(s, el('div', 'grab'), el('h3', null, b.n || '—'), pill(b.s));
  var dl = el('dl', 'dl');
  function row(k, v) { var r = el('div'); add(r, el('dt', null, k), el('dd', null, v)); dl.appendChild(r); }
  row('Telefon', b.p || '—');
  row('Masala', b.t || '—');
  row('Qabul vaqti', b.d ? dlabel(b.d) + (b.h ? ', ' + b.h : '') : 'Kun tanlanmagan');
  row('Izoh', b.c ? b.c + (String(b.c).length >= 100 ? '…' : '') : '—');
  row('Manba', b.src === 'sayt' ? 'Veb-sayt' : 'Telegram bot');
  row('Yuborilgan', b.at ? stamp(b.at) : '—');
  s.appendChild(dl);
  var call = el('a', 'big'); call.href = phoneHref(b.p); add(call, icon('phone'), document.createTextNode('Qo‘ng‘iroq qilish')); s.appendChild(call);
  var cl = el('button', 'close', 'Yopish'); cl.onclick = closeSheet; s.appendChild(cl);
  $('scrim').classList.add('on'); s.classList.add('on'); tick();
  try { tg.BackButton.show(); tg.BackButton.onClick(closeSheet); } catch (e) {}
}
function closeSheet() {
  $('scrim').classList.remove('on'); $('sheet').classList.remove('on');
  try { tg.BackButton.hide(); tg.BackButton.offClick(closeSheet); } catch (e) {}
}
$('scrim').onclick = closeSheet;
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

/* ---------- Asosiy ---------- */
function render() {
  var d = state.data; if (!d) return;
  var all = d.bookings || [], slots = d.slots || [], today = todayISO();
  var keepPos = window.scrollY;
  $('sub').textContent = 'Dr. Avazxon · ' + dlabel(today) + ' · yangilandi ' + two(new Date(state.at + 5 * 3600000).getUTCHours()) + ':' + two(new Date(state.at + 5 * 3600000).getUTCMinutes());
  drawTabs(); view.textContent = '';
  if (state.tab === 'jadval') renderSchedule(all, slots, today);
  else if (state.tab === 'arizalar') renderList(all, today);
  else renderStats(all, today);
  window.scrollTo(0, keepPos);
}

$('refresh').onclick = function () { tick(); load(); };
document.addEventListener('visibilitychange', function () { if (!document.hidden && state.data && Date.now() - state.at > 30000) load(); });
load();
})();
</script>
</body>
</html>
`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/apply') return apply(env, request);
    if (url.pathname === '/admin') {
      return new Response(ADMIN_HTML, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors https://web.telegram.org https://*.telegram.org https://telegram.org",
        },
      });
    }
    if (url.pathname === '/admin/api/bookings') return adminApi(env, request);

    // Webhookni bir marta ulash: brauzerda /setup?key=WEBHOOK_SECRET qiymati
    if (url.pathname === '/setup') {
      if (url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('Forbidden', { status: 403 });
      const r = await tg(env, 'setWebhook', {
        url: `${url.origin}/webhook`,
        secret_token: env.WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query'],
      });
      await tg(env, 'setMyCommands', {
        commands: [
          { command: 'menu', description: 'Asosiy menyu' },
          { command: 'xizmatlar', description: 'Qaysi masalalar bo‘yicha yozilish mumkin' },
          { command: 'ariza', description: 'Qabulga yozilish' },
          { command: 'cancel', description: 'Bekor qilish' },
        ],
      });
      await Promise.all((await doctorIds(env)).map((id) => setMenuButton(env, id, true)));
      return Response.json(r);
    }

    if (url.pathname === '/webhook' && request.method === 'POST') {
      if (request.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) {
        return new Response('Forbidden', { status: 403 });
      }
      const u = await request.json();
      ctx.waitUntil(
        (u.message ? onMessage(env, u.message) : u.callback_query ? onCallback(env, u.callback_query) : Promise.resolve())
          .catch((e) => console.log('error', e && e.message))
      );
      return new Response('ok');
    }

    return new Response('Dr. Avazxon bot ishlayapti.');
  },
};
