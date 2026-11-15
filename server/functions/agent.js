'use strict';
// Agent: /video va /sayt buyurtmalari GitHub Actions'ga (bepul) yuboriladi; natija Telegramga oʻzi qaytadi.
// Sirlar: GH_DISPATCH_TOKEN (fine-grained PAT: Actions=Read&Write), ixtiyoriy GH_REPO, AGENT_REF (default main).
const S = require('./_shared');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
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

async function onMessage(chat, u, cmd, args) {
  if (cmd !== '/video' && cmd !== '/sayt' && cmd !== '/agent') return false;
  if (!S.isAdmin(u.id)) return false;
  if (cmd === '/agent' || !args) { await send(chat, HELP); return true; }
  const kind = cmd === '/video' ? 'video' : 'site';
  const r = await dispatch(kind, args, chat, u.lang);
  if (r.ok) await send(chat, kind === 'video' ? '🎬 Buyurtma qabul qilindi. Video 4-10 daqiqada shu yerga keladi.' : '🌐 Buyurtma qabul qilindi. Sayt 2-5 daqiqada tayyor boʻladi, link shu yerga keladi.');
  else if (r.error === 'token') await send(chat, SETUP);
  else await send(chat, `❌ Yuborib boʻlmadi: ${esc(r.error)}\n\n<i>Token huquqi (Actions: Read and write) va workflow main branchda borligini tekshiring.</i>`);
  return true;
}
module.exports = { onMessage, dispatch };
