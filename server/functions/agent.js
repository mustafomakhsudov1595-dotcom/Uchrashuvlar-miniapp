'use strict';
// Agent: /video va /sayt buyurtmalari GitHub Actions'ga (bepul) yuboriladi; natija Telegramga oʻzi qaytadi.
// Sirlar: GH_DISPATCH_TOKEN (fine-grained PAT: Actions=Read&Write), ixtiyoriy GH_REPO, AGENT_REF (default main).
const S = require('./_shared');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const LIMIT = { video: 3, site: 3 }, GLOBAL = 40; // kuniga: foydalanuvchiga va umumiy (adminlar cheklanmaydi)
const L = {
  uz: { wait: { video: '🎬 Buyurtma qabul qilindi. Video 4-10 daqiqada shu yerga keladi.', site: '🌐 Buyurtma qabul qilindi. Sayt 2-5 daqiqada tayyor boʻladi, link shu yerga keladi.' }, limit: (n) => `⏳ Bugungi limit tugadi (kuniga ${n} ta). Ertaga qayta urinib koʻring.`, busy: '⏳ Bugun juda koʻp buyurtma boʻldi. Ertaga qayta urinib koʻring.', na: '⚙️ Bu funksiya hozircha sozlanmoqda. Birozdan keyin urinib koʻring.', fail: '❌ Hozir yuborib boʻlmadi. Birozdan keyin urinib koʻring.' },
  ru: { wait: { video: '🎬 Заказ принят. Видео придёт сюда через 4-10 минут.', site: '🌐 Заказ принят. Сайт будет готов через 2-5 минут, ссылка придёт сюда.' }, limit: (n) => `⏳ Лимит на сегодня исчерпан (${n} в день). Попробуйте завтра.`, busy: '⏳ Сегодня слишком много заказов. Попробуйте завтра.', na: '⚙️ Функция пока настраивается. Попробуйте позже.', fail: '❌ Сейчас не удалось отправить. Попробуйте позже.' },
  en: { wait: { video: '🎬 Order received. Your video will arrive here in 4-10 minutes.', site: '🌐 Order received. Your site will be ready in 2-5 minutes; the link will arrive here.' }, limit: (n) => `⏳ Daily limit reached (${n} per day). Try again tomorrow.`, busy: '⏳ Too many orders today. Try again tomorrow.', na: '⚙️ This feature is being set up. Try again later.', fail: '❌ Could not send right now. Try again later.' },
};
const REPO = () => process.env.GH_REPO || 'mustafomakhsudov1595-dotcom/uchrashuvlar-miniapp';

async function dispatch(kind, prompt, chat, lang) {
  const tok = process.env.GH_DISPATCH_TOKEN;
  if (!tok) return { ok: false, error: 'token' };
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO()}/actions/workflows/agent.yml/dispatches`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tok}`, accept: 'application/vnd.github+json', 'user-agent': 'impro-notes', 'x-github-api-version': '2022-11-28', 'content-type': 'application/json' },
      body: JSON.stringify({ ref: process.env.AGENT_REF || 'main', inputs: { kind, prompt: prompt.slice(0, 3000), chat: String(chat), lang: lang || 'uz' } }),
    });
    if (r.status === 204) return { ok: true };
    const j = await r.json().catch(() => ({}));
    return { ok: false, error: `${r.status} ${j.message || ''}`.trim() };
  } catch (e) { return { ok: false, error: e.message }; }
}

const SETUP = `⚙️ <b>Agent hali sozlanmagan.</b>\n\nKerak (hammasi bepul):\n1) GitHub'da fine-grained token (faqat shu repo, <i>Actions: Read and write</i>) → Cloudflare secret <code>GH_DISPATCH_TOKEN</code>\n2) GitHub repo → Settings → Secrets → Actions: <code>BOT_TOKEN</code>, <code>GEMINI_API_KEY</code>, <code>PEXELS_API_KEY</code>, <code>CLOUDFLARE_API_TOKEN</code>, <code>CLOUDFLARE_ACCOUNT_ID</code>\n\nBatafsil: <code>agent/README.md</code>`;

const HELP = '🤖 <b>Agent</b>\n\n🎬 <code>/video mavzu</code> — Reels video (ssenariy, ovoz, rasm)\n🌐 <code>/sayt tavsif</code> — tayyor sayt Cloudflare\'da\n\nMasalan:\n<code>/video Toshkentdagi stomatologiya klinikasi uchun reklama</code>\n<code>/sayt Anvar avto-ustaxonasi, Chilonzor, ish vaqti 9-18</code>';

async function usage(u, kind) {
  const st = S.openStore({}), day = S.todayISO(u.tz);
  const mine = Number(await st.get(`agent/${day}/${kind}/${u.id}`)) || 0, all = Number(await st.get(`agent/${day}/all`)) || 0;
  return { st, day, mine, all };
}
async function onMessage(chat, u, cmd, args) {
  if (cmd !== '/video' && cmd !== '/sayt' && cmd !== '/agent') return false;
  const T = L[u.lang] || L.uz, admin = S.isAdmin(u.id);
  if (cmd === '/agent' || !args) { await send(chat, HELP); return true; }
  const kind = cmd === '/video' ? 'video' : 'site';
  const us = await usage(u, kind);
  if (!admin && us.mine >= LIMIT[kind]) { await send(chat, T.limit(LIMIT[kind])); return true; }
  if (!admin && us.all >= GLOBAL) { await send(chat, T.busy); return true; }
  const r = await dispatch(kind, args, chat, u.lang);
  if (r.ok) {
    await us.st.set(`agent/${us.day}/${kind}/${u.id}`, us.mine + 1); await us.st.set(`agent/${us.day}/all`, us.all + 1);
    await send(chat, T.wait[kind]);
  } else if (r.error === 'token') await send(chat, admin ? SETUP : T.na);
  else await send(chat, admin ? `❌ Yuborib boʻlmadi: ${esc(r.error)}\n\n<i>Token huquqi (Actions: Read and write) va workflow main branchda borligini tekshiring.</i>` : T.fail);
  return true;
}
module.exports = { onMessage, dispatch };
