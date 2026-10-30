// Dr. Avazxon uchun Telegram ariza boti (Cloudflare Worker)
// Kerakli sozlamalar (Settings -> Variables and Secrets):
//   BOT_TOKEN        (Secret)  BotFather bergan token
//   WEBHOOK_SECRET   (Secret)  o'zingiz o'ylab topgan uzun tasodifiy matn
//   DOCTOR_CHAT_IDS  (Text)    ariza boradigan chat ID, bir nechta bo'lsa vergul bilan
//   PRICES_TEXT      (Text, ixtiyoriy) «Narxlar» tugmasida chiqadigan matn (HTML: <b>, <i>)
//   SLOTS            (Text, ixtiyoriy) qabul soatlari, vergul bilan. Standart: 09:00,10:00,...,18:00
//   ALLOWED_ORIGIN   (Text, ixtiyoriy) sayt manzili, masalan https://avazxon.uz (saytni ulashda kerak)
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
  about: '👨‍⚕️ Shifokor haqida',
  myid: '🆔 Mening ID',
};
const mainKb = {
  keyboard: [
    [{ text: BTN.apply }],
    [{ text: BTN.prices }, { text: BTN.services }],
    [{ text: BTN.ask }, { text: BTN.contact }],
    [{ text: BTN.more }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};
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

const doctorIds = (env) => String(env.DOCTOR_CHAT_IDS || '').split(',').map((x) => x.trim()).filter(Boolean);
const isDoctor = (env, chat) => doctorIds(env).includes(String(chat));

async function askDoctors(env, chat, text, from) {
  const who = from && from.username ? `@${esc(from.username)}` : `<a href="tg://user?id=${chat}">profil</a>`;
  const body = `❓ <b>Bemor savoli</b>\n\n${esc(text)}\n\n👤 ${who} · ${tashkentNow()}\n↩️ Javob berish uchun shu xabarga reply qiling.`;
  const ids = doctorIds(env);
  await Promise.all(ids.map(async (id) => {
    const r = await say(env, id, body);
    if (r.ok) await env.STATE.put(`q:${id}:${r.result.message_id}`, String(chat), { expirationTtl: 7 * 86400 });
  }));
  return ids.length;
}

async function notifyDoctors(env, a, from) {
  const ids = doctorIds(env);
  const who = from
    ? from.username ? `@${esc(from.username)}` : `<a href="tg://user?id=${from.id}">profil</a>`
    : 'veb-sayt orqali';
  const text =
    `🆕 <b>Yangi ariza</b>\n\n` +
    `👤 ${esc(a.name)}\n📞 ${esc(a.phone)}\n🩺 ${esc(a.topic)}\n` +
    (a.when ? `📅 <b>${esc(a.when)}</b>\n` : '') +
    (a.comment ? `💬 ${esc(a.comment)}\n` : '') +
    `\n🕒 ${tashkentNow()} · ${who}`;
  await Promise.all(ids.map((id) => say(env, id, text)));
  return ids.length;
}

async function finish(env, chat, st, from) {
  const n = await notifyDoctors(env, st, from);
  await clearState(env, chat);
  await env.STATE.put(`c:${chat}`, '1', { expirationTtl: 60 });
  await say(
    env, chat,
    n
      ? `✅ <b>Arizangiz qabul qilindi.</b>\n${st.when ? `📅 Tanlangan vaqt: <b>${esc(st.when)}</b>\n` : ''}Shifokor yoki administrator vaqtni tasdiqlash uchun siz bilan bog‘lanadi.\n\nShoshilinch bo‘lsa: +998 91 151 55 88\nMa’lumotlaringiz maxfiy saqlanadi.`
      : '⚠️ Ariza qabul qilindi, lekin shifokorga yuborishda sozlama xatosi bor. Iltimos, +998 91 151 55 88 raqamiga qo‘ng‘iroq qiling.',
    { reply_markup: mainKb }
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
    return say(env, chat, 'Bekor qilindi.', { reply_markup: mainKb });
  }
  if (text === '/start' || text === '/help' || text === '/menu' || text === BTN.back) {
    await clearState(env, chat);
    return say(env, chat, text === BTN.back ? 'Asosiy menyu 👇' : MENU_TEXT, { reply_markup: mainKb });
  }
  if (text === '/xizmatlar') return say(env, chat, SERVICES_TEXT, { reply_markup: servicesKb });
  if (text === '/ariza') return applyMenu(env, chat);

  // shifokor savolga reply qilsa, javob bemorga boradi
  if (m.reply_to_message && isDoctor(env, chat) && text) {
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
    case BTN.about: return say(env, chat, ABOUT_TEXT);
    case BTN.myid: return say(env, chat, `Sizning chat ID: <code>${chat}</code>`);
  }

  const st = await getState(env, chat);
  if (!st) return say(env, chat, 'Qabulga yozilish uchun /start bosing.');

  if (st.step === 'date') {
    const d = nextDays().find((x) => x.label === text);
    if (!d) return say(env, chat, 'Iltimos, kunni pastdagi tugmalardan tanlang.', { reply_markup: dateKb() });
    st.date = d.label;
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
    return say(env, chat, n ? '✅ Savolingiz shifokorga yuborildi. Javob shu yerga keladi.' : '⚠️ Yuborishda xato. +998 91 151 55 88 raqamiga qo‘ng‘iroq qiling.', { reply_markup: mainKb });
  }

  if (st.step === 'comment') {
    st.comment = text.slice(0, 500);
    return finish(env, chat, st, m.from);
  }
}

async function onCallback(env, q) {
  const chat = q.message.chat.id;
  await tg(env, 'answerCallbackQuery', { callback_query_id: q.id });

  const st = await getState(env, chat);
  if (!st) return say(env, chat, 'Qabulga yozilish uchun /start bosing.');

  if (q.data === 'skip' && st.step === 'comment') return finish(env, chat, st, q.from);
}

// Saytdan ariza olish (keyinchalik saytni ulash uchun)
async function apply(env, request) {
  const origin = env.ALLOWED_ORIGIN || '*';
  const cors = {
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/apply') return apply(env, request);

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
