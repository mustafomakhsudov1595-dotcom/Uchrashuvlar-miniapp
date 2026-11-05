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

const esc = (t) => String(t).replace(/[<>&]/g, '');
async function tg(env, method, body) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
  const update = await request.json().catch(() => ({}));
  const cq = update.callback_query;
  if (cq?.data?.startsWith('rm:')) {
    const admins = JSON.parse((await env.KV.get('admins')) || '[]');
    const target = Number(cq.data.slice(3));
    let text;
    if (!admins.includes(cq.from.id)) text = 'Ruxsat yo\'q';
    else if (!admins.includes(target)) text = 'Bu foydalanuvchi allaqachon admin emas';
    else if (admins.length <= 1) text = 'Oxirgi adminni olib tashlab bo\'lmaydi';
    else {
      await env.KV.put('admins', JSON.stringify(admins.filter((x) => x !== target)));
      await tg(env, 'sendMessage', { chat_id: target, text: 'Siz admin ro\'yxatidan chiqarildingiz.' });
      text = '✅ Adminlikdan olindi';
      await tg(env, 'editMessageReplyMarkup', { chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] } });
    }
    await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id, text, show_alert: true });
    return new Response('ok');
  }
  const m = update.message;
  if (m?.chat?.type === 'private' && /^\/admin(@\w+)?(\s|$)/.test(m.text || '')) {
    const pw = (m.text || '').split(/\s+/)[1] || '';
    const admins = JSON.parse((await env.KV.get('admins')) || '[]');
    if (pw) await tg(env, 'deleteMessage', { chat_id: m.chat.id, message_id: m.message_id }); // parolni chatdan o'chiramiz
    if (pw && env.ADMIN_PASSWORD && pw === env.ADMIN_PASSWORD) {
      if (!admins.includes(m.chat.id)) {
        await env.KV.put('admins', JSON.stringify([...admins, m.chat.id]));
        // mavjud adminlarga xabar: kim qo'shildi
        const u = m.from || {};
        const who = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Nomaʼlum';
        const note = `🔔 <b>Yangi admin qo'shildi</b>\n\n👤 ${esc(who)}${u.username ? ' (@' + esc(u.username) + ')' : ''}\n🆔 <code>${m.chat.id}</code>\n\nBu siz bo'lmasangiz, pastdagi tugma bilan olib tashlang.`;
        await Promise.all(admins.map((id) => tg(env, 'sendMessage', { chat_id: id, text: note, parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[{ text: '🚫 Adminlikdan olish', callback_data: 'rm:' + m.chat.id }]] } })));
      }
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
