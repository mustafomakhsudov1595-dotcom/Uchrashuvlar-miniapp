// Telegram webhook: /start va boshqa xabarlarga chiroyli javob + do'kon tugmasi
const APP_URL = 'https://chilling-shop.pages.dev/';
const ADMIN_URL = 'https://chilling-admin.pages.dev/';
const adminKb = { inline_keyboard: [[{ text: '🛠️ Admin panelni ochish', web_app: { url: ADMIN_URL } }]] };

const WELCOME = (name) =>
  `👋 Assalomu alaykum${name ? ', <b>' + name.replace(/[<>&]/g, '') + '</b>' : ''}!\n\n` +
  `🛒 <b>Chilling Bet do'koniga xush kelibsiz!</b>\n\n` +
  `Bizda sizni kutayotganlar:\n` +
  `🧺 Kir yuvish vositalari — Ariel, Kopum, Yumsa\n` +
  `🧽 Uy tozaligi — BioTaf, Ecotab, Viva, Air Smart\n` +
  `🔋 Batareykalar — Duracell, Raketa, Soni\n` +
  `🛠 Boshqa foydali mahsulotlar\n\n` +
  `✅ Qulay narxlar · 🚚 Tez yetkazib berish\n\n` +
  `Xarid qilish uchun pastdagi tugmani bosing 👇`;

async function tg(env, method, body) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
  const update = await request.json().catch(() => ({}));
  const m = update.message;
  if (m?.chat?.type === 'private' && /^\/admin(@\w+)?(\s|$)/.test(m.text || '')) {
    const pw = (m.text || '').split(/\s+/)[1] || '';
    const admins = JSON.parse((await env.KV.get('admins')) || '[]');
    if (pw) await tg(env, 'deleteMessage', { chat_id: m.chat.id, message_id: m.message_id }); // parolni chatdan o'chiramiz
    if (pw && env.ADMIN_PASSWORD && pw === env.ADMIN_PASSWORD) {
      if (!admins.includes(m.chat.id)) await env.KV.put('admins', JSON.stringify([...admins, m.chat.id]));
      await tg(env, 'sendMessage', { chat_id: m.chat.id, parse_mode: 'HTML', reply_markup: adminKb,
        text: "✅ <b>Admin sifatida tasdiqlandingiz!</b>\n\nEndi yangi buyurtmalar shu yerga keladi.\nBuyurtmalar va narxlarni boshqarish uchun pastdagi tugmani bosing 👇" });
    } else if (admins.includes(m.chat.id)) {
      await tg(env, 'sendMessage', { chat_id: m.chat.id, text: '🛠️ Admin panel', reply_markup: adminKb });
    } else {
      await tg(env, 'sendMessage', { chat_id: m.chat.id, text: "🔒 Admin uchun parol kerak:\n<code>/admin parol</code>", parse_mode: 'HTML' });
    }
    return new Response('ok');
  }
  if (m?.chat?.type === 'private') {
    const isStart = (m.text || '').startsWith('/start');
    const text = isStart ? WELCOME(m.from?.first_name)
      : `Do'konni ochish uchun pastdagi tugmani bosing 👇\n\n📞 Savol bo'lsa, shu yerga yozing — javob beramiz.`;
    await tg(env, 'sendMessage', {
      chat_id: m.chat.id, text, parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: "🛒 Do'konni ochish", web_app: { url: APP_URL } }]] },
    });
  }
  return new Response('ok');
}
