// Dr. Avazxon uchun Telegram zayafka boti (Cloudflare Worker)
// Kerakli sozlamalar (Settings -> Variables and Secrets):
//   BOT_TOKEN        (Secret)  BotFather bergan token
//   WEBHOOK_SECRET   (Secret)  o'zingiz o'ylab topgan uzun tasodifiy matn
//   DOCTOR_CHAT_IDS  (Text)    zayafka boradigan chat ID, bir nechta bo'lsa vergul bilan
//   ALLOWED_ORIGIN   (Text, ixtiyoriy) sayt manzili, masalan https://avazxon.uz (saytni ulashda kerak)
// KV Namespace binding nomi: STATE

const TOPICS = {
  p: 'Prostata',
  t: 'Buyrak / siydik toshi',
  v: 'Varikosele / bepushtlik',
  z: 'Jinsiy zaiflik',
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

const topicKb = {
  inline_keyboard: [
    [{ text: TOPICS.p, callback_data: 't:p' }, { text: TOPICS.t, callback_data: 't:t' }],
    [{ text: TOPICS.v, callback_data: 't:v' }, { text: TOPICS.z, callback_data: 't:z' }],
    [{ text: TOPICS.o, callback_data: 't:o' }],
  ],
};
const phoneKb = {
  keyboard: [[{ text: '📱 Raqamimni yuborish', request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};
const mainKb = {
  inline_keyboard: [
    [{ text: '📝 Qabulga yozilish', callback_data: 'm:apply' }],
    [{ text: '🩺 Qaysi masalalar bo‘yicha yozilish mumkin', callback_data: 'm:services' }],
    [{ text: '📞 Aloqa va manzil', callback_data: 'm:contact' }],
  ],
};
const servicesKb = {
  inline_keyboard: [
    ...Object.entries(TOPICS).map(([k, v]) => [{ text: v, callback_data: 'a:' + k }]),
    [{ text: '⬅️ Menyu', callback_data: 'm:menu' }],
  ],
};
const MENU_TEXT =
  '👋 Assalomu alaykum! Bu <b>Dr. Avazxon</b> (urolog-androlog, Qo‘qon, VitaMed klinikasi) qabuliga yozilish boti.\n\nQuyidagi menyudan tanlang:';
const SERVICES_TEXT =
  '🩺 <b>Quyidagi masalalar bo‘yicha zayafka qoldirishingiz mumkin:</b>\n\n' +
  Object.values(TOPICS).map((t) => `• ${t}`).join('\n') +
  '\n\nMasalani tanlang, zayafka shu mavzu bilan boshlanadi.';
const CONTACT_TEXT =
  '📞 <b>Aloqa</b>\nTelefon: +998 91 151 55 88\nKlinika: VitaMed, Qo‘qon\n\nZayafka qoldirish uchun menyudan «Qabulga yozilish» ni bosing.';
const skipKb = { inline_keyboard: [[{ text: 'O‘tkazib yuborish', callback_data: 'skip' }]] };
const none = { remove_keyboard: true };

function tashkentNow() {
  return new Date(Date.now() + 5 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 16);
}

async function notifyDoctors(env, a, from) {
  const ids = String(env.DOCTOR_CHAT_IDS || '').split(',').map((x) => x.trim()).filter(Boolean);
  const who = from
    ? from.username ? `@${esc(from.username)}` : `<a href="tg://user?id=${from.id}">profil</a>`
    : 'sayt orqali';
  const text =
    `🆕 <b>Yangi zayafka</b>\n\n` +
    `👤 ${esc(a.name)}\n📞 ${esc(a.phone)}\n🩺 ${esc(a.topic)}\n` +
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
      ? '✅ <b>Zayafkangiz qabul qilindi.</b>\nShifokor yoki administrator tez orada siz bilan bog‘lanadi.\n\nShoshilinch bo‘lsa: +998 91 151 55 88\nMa’lumotlaringiz maxfiy saqlanadi.'
      : '⚠️ Zayafka qabul qilindi, lekin shifokorga yuborishda sozlama xatosi bor. Iltimos, +998 91 151 55 88 raqamiga qo‘ng‘iroq qiling.',
    { reply_markup: none }
  );
}

async function beginApply(env, chat, topicKey) {
  if (await env.STATE.get(`c:${chat}`)) {
    return say(env, chat, 'Zayafkangiz hozirgina yuborilgan. Bir daqiqadan keyin qayta urinib ko‘ring.');
  }
  const st = { step: 'name' };
  if (topicKey && TOPICS[topicKey]) st.topic = TOPICS[topicKey];
  await setState(env, chat, st);
  return say(
    env, chat,
    (st.topic ? `Tanlangan masala: <b>${esc(st.topic)}</b>\n\n` : '') + 'Zayafka qoldirish uchun <b>ismingizni</b> yozing.\n\nBekor qilish: /cancel',
    { reply_markup: none }
  );
}

async function onMessage(env, m) {
  const chat = m.chat.id;
  const text = (m.text || '').trim();

  if (text === '/id') return say(env, chat, `Sizning chat ID: <code>${chat}</code>`);
  if (text === '/cancel') {
    await clearState(env, chat);
    return say(env, chat, 'Bekor qilindi. Qayta boshlash uchun /start bosing.', { reply_markup: none });
  }
  if (text === '/start' || text === '/help' || text === '/menu') return say(env, chat, MENU_TEXT, { reply_markup: mainKb });
  if (text === '/xizmatlar') return say(env, chat, SERVICES_TEXT, { reply_markup: servicesKb });
  if (text === '/zayafka') return beginApply(env, chat);

  const st = await getState(env, chat);
  if (!st) return say(env, chat, 'Qabulga yozilish uchun /start bosing.');

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
    st.step = st.topic ? 'comment' : 'topic';
    await setState(env, chat, st);
    await say(env, chat, 'Qabul uchun raqam olindi ✅', { reply_markup: none });
    if (st.topic) return say(env, chat, '💬 Qisqacha izoh yozing (ixtiyoriy). Yoki o‘tkazib yuboring.', { reply_markup: skipKb });
    return say(env, chat, '🩺 Qaysi masala bo‘yicha murojaat qilyapsiz?', { reply_markup: topicKb });
  }

  if (st.step === 'topic') return say(env, chat, 'Iltimos, quyidagi tugmalardan birini tanlang.', { reply_markup: topicKb });

  if (st.step === 'comment') {
    st.comment = text.slice(0, 500);
    return finish(env, chat, st, m.from);
  }
}

async function onCallback(env, q) {
  const chat = q.message.chat.id;
  await tg(env, 'answerCallbackQuery', { callback_query_id: q.id });
  if (q.data === 'm:menu') return say(env, chat, MENU_TEXT, { reply_markup: mainKb });
  if (q.data === 'm:services') return say(env, chat, SERVICES_TEXT, { reply_markup: servicesKb });
  if (q.data === 'm:contact') return say(env, chat, CONTACT_TEXT, { reply_markup: mainKb });
  if (q.data === 'm:apply') return beginApply(env, chat);
  if (q.data.startsWith('a:')) return beginApply(env, chat, q.data.slice(2));

  const st = await getState(env, chat);
  if (!st) return say(env, chat, 'Qabulga yozilish uchun /start bosing.');

  if (q.data.startsWith('t:') && st.step === 'topic') {
    st.topic = TOPICS[q.data.slice(2)] || TOPICS.o;
    st.step = 'comment';
    await setState(env, chat, st);
    return say(env, chat, '💬 Qisqacha izoh yozing (ixtiyoriy). Yoki o‘tkazib yuboring.', { reply_markup: skipKb });
  }
  if (q.data === 'skip' && st.step === 'comment') return finish(env, chat, st, q.from);
}

// Saytdan zayafka olish (keyinchalik saytni ulash uchun)
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
          { command: 'menu', description: 'Menyu' },
          { command: 'xizmatlar', description: 'Qaysi masalalar bo‘yicha yozilish mumkin' },
          { command: 'zayafka', description: 'Qabulga yozilish' },
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
