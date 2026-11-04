// Telegram webhook: /start va boshqa xabarlarga chiroyli javob + do'kon tugmasi
const APP_URL = 'https://chilling-shop.pages.dev/';

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
