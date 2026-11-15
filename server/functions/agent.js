'use strict';
// Agent: /video (ssenariy + render), /sayt (Cloudflare'ga joylash), /mening. Oʻzgartirish cheksiz (himoya: kuniga 60 ta tahrir).
// Ogʻir ish GitHub Actions'da (bepul) bajariladi. Sirlar: GH_DISPATCH_TOKEN, ixtiyoriy GH_REPO, AGENT_REF, GEMINI_API_KEY.
const S = require('./_shared');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text: String(text).slice(0, 3900), parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const LIMIT = { video: 5, site: 5 }, GLOBAL = 120, EDIT_CAP = 60; // kuniga: yangi ishlar (har kimga) / umumiy / tahrirlar
const REPO = () => process.env.GH_REPO || 'mustafomakhsudov1595-dotcom/uchrashuvlar-miniapp';
const SITE = () => String(process.env.SITE_URL || '').replace(/\/$/, '');
const store = () => S.openStore({});
const tr = (u, o) => o[u.lang] || o.uz;
// workers.dev quyi domeni SITE_URL'dan: https://impro-notes.<sub>.workers.dev -> https://<name>.<sub>.workers.dev
const siteUrl = (name) => SITE().replace(/^(https:\/\/)[^.]+\./, `$1${name}.`);

const limMsg = (u, n) => tr(u, { uz: `⏳ Bugungi limit tugadi (kuniga ${n} ta yangi). Mavjudlarini /mening orqali xohlagancha oʻzgartirishingiz mumkin.`, ru: `⏳ Лимит на сегодня исчерпан (${n} новых в день). Существующие можно менять через /mening без ограничений.`, en: `⏳ Daily limit reached (${n} new per day). You can edit existing ones via /mening freely.` });
const T = {
  wait: { video: { uz: '🎬 Render boshlandi. Video 4-10 daqiqada shu yerga keladi.', ru: '🎬 Рендер начался. Видео придёт сюда через 4-10 минут.', en: '🎬 Rendering started. Your video will arrive in 4-10 minutes.' },
    site: { uz: '🌐 Buyurtma qabul qilindi. Sayt 2-5 daqiqada tayyor boʻladi, link shu yerga keladi.', ru: '🌐 Заказ принят. Сайт будет готов через 2-5 минут, ссылка придёт сюда.', en: '🌐 Order received. Your site will be ready in 2-5 minutes; the link will arrive here.' },
    edit: { uz: '✏️ Oʻzgartirish qabul qilindi. 2-5 daqiqada yangilanadi (link oʻzgarmaydi).', ru: '✏️ Правка принята. Обновится через 2-5 минут (ссылка прежняя).', en: '✏️ Edit received. It updates in 2-5 minutes (same link).' } },
  busy: { uz: '⏳ Bugun juda koʻp buyurtma boʻldi. Ertaga qayta urinib koʻring.', ru: '⏳ Сегодня слишком много заказов. Попробуйте завтра.', en: '⏳ Too many orders today. Try again tomorrow.' },
  editcap: { uz: '⏳ Bugungi tahrirlar juda koʻp boʻldi, ertaga davom eting.', ru: '⏳ Сегодня слишком много правок, продолжите завтра.', en: '⏳ Too many edits today, continue tomorrow.' },
  na: { uz: '⚙️ Bu funksiya hozircha sozlanmoqda. Birozdan keyin urinib koʻring.', ru: '⚙️ Функция пока настраивается. Попробуйте позже.', en: '⚙️ This feature is being set up. Try again later.' },
  fail: { uz: '❌ Hozir bajarib boʻlmadi. Birozdan keyin urinib koʻring.', ru: '❌ Сейчас не получилось. Попробуйте позже.', en: '❌ Could not do it right now. Try again later.' },
  editAsk: { uz: '✏️ Nimani oʻzgartiray? Xohlagan narsani yozing (matn, rang, dizayn, boʻlim qoʻshish/olib tashlash, ssenariy…):', ru: '✏️ Что изменить? Пишите что угодно (тексты, цвета, дизайн, разделы, сценарий…):', en: '✏️ What should I change? Anything (texts, colors, design, sections, script…):' },
  none: { uz: 'Hozircha ishlaringiz yoʻq. /video, /sayt yoki /botyasa bilan boshlang.', ru: 'Пока нет работ. Начните с /video, /sayt или /botyasa.', en: 'Nothing yet. Start with /video, /sayt or /botyasa.' },
};
const HELP = (u) => tr(u, {
  uz: '🤖 <b>Yaratish markazi</b>\n\nHar kuni 5 ta video, 5 ta sayt, 5 ta Telegram bot. Hammasini xohlagancha oʻzgartirasiz.\n\n🎬 <code>/video mavzu</code>\n🌐 <code>/sayt tavsif</code>\n🤖 <code>/botyasa tavsif</code>\n📋 /mening — mening ishlarim\n\nMasalan:\n<code>/video Toshkentdagi stomatologiya klinikasi reklamasi</code>\n<code>/sayt Anvar avto-ustaxonasi, Chilonzor, 9-18</code>',
  ru: '🤖 <b>Центр создания</b>\n\nВ день: 5 видео, 5 сайтов, 5 Telegram-ботов. Править можно сколько угодно.\n\n🎬 <code>/video тема</code>\n🌐 <code>/sayt описание</code>\n🤖 <code>/botyasa описание</code>\n📋 /mening — мои работы',
  en: '🤖 <b>Creation hub</b>\n\nPer day: 5 videos, 5 sites, 5 Telegram bots. Edit them as much as you like.\n\n🎬 <code>/video topic</code>\n🌐 <code>/sayt description</code>\n🤖 <code>/botyasa description</code>\n📋 /mening — my creations' });
const SETUP = `⚙️ <b>Agent hali sozlanmagan.</b>\n\nKerak (hammasi bepul):\n1) GitHub fine-grained token (faqat shu repo, <i>Actions: Read and write</i>) → Cloudflare secret <code>GH_DISPATCH_TOKEN</code>\n2) GitHub repo → Settings → Secrets → Actions: <code>BOT_TOKEN</code>, <code>GEMINI_API_KEY</code>, <code>PEXELS_API_KEY</code>, <code>CLOUDFLARE_API_TOKEN</code>, <code>CLOUDFLARE_ACCOUNT_ID</code>\n\nBatafsil: <code>agent/README.md</code>`;

async function dispatch(inputs) {
  const tok = process.env.GH_DISPATCH_TOKEN;
  if (!tok) return { ok: false, error: 'token' };
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO()}/actions/workflows/agent.yml/dispatches`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tok}`, accept: 'application/vnd.github+json', 'user-agent': 'impro-notes', 'x-github-api-version': '2022-11-28', 'content-type': 'application/json' },
      body: JSON.stringify({ ref: process.env.AGENT_REF || 'bot-eslatma', inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, String(v == null ? '' : v).slice(0, 30000)])) }),
    });
    if (r.status === 204) return { ok: true };
    const j = await r.json().catch(() => ({}));
    return { ok: false, error: `${r.status} ${j.message || ''}`.trim() };
  } catch (e) { return { ok: false, error: e.message }; }
}

/* ---------- hisob: yangi ishlar va tahrirlar ---------- */
async function quota(u, kind) {
  const st = store(), day = S.todayISO(u.tz), k = (x) => `agent/${day}/${x}`;
  const get = async (x) => Number(await st.get(k(x))) || 0;
  return { mine: await get(`${kind}/${u.id}`), all: await get('all'), edits: await get(`edit/${u.id}`),
    bump: async (what, n) => st.set(k(what), n), key: k };
}
async function remember(uid, item) {
  const st = store(), list = (await st.get(`agent/own/${uid}`, { type: 'json' })) || [];
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = { ...list[i], ...item }; else list.unshift(item);
  await st.setJSON(`agent/own/${uid}`, list.slice(0, 40));
}

/* ---------- video: ssenariy (Worker) → render (Actions) ---------- */
const VID_SYS = `You write short vertical video scripts (Instagram Reels / TikTok / Telegram). Output JSON only:
{"title": str, "scenes": [{"voice": str (max 22 words, natural spoken), "caption": str (max 7 words, punchy), "query": str (2-3 English words for a stock photo)}], "hashtags": [str]}
5-7 scenes, 30-45 seconds total. Scene 1 = a strong hook. Last scene = clear call to action. Never invent phone numbers, prices or addresses.`;
function cleanVideo(x, prev = {}) {
  const sc = (Array.isArray(x && x.scenes) ? x.scenes : []).slice(0, 8).map((s) => ({ voice: String((s && s.voice) || '').trim().slice(0, 300), caption: String((s && s.caption) || '').trim().slice(0, 80), query: String((s && s.query) || 'business').trim().slice(0, 40) })).filter((s) => s.voice);
  if (sc.length < 2) return null;
  return { title: String((x && x.title) || prev.title || '').slice(0, 100), scenes: sc, tags: (Array.isArray(x && x.hashtags) ? x.hashtags : prev.tags || []).map((t) => String(t).replace(/[^\w]/g, '')).filter(Boolean).slice(0, 8) };
}
const scriptText = (u, d) => `🎬 <b>${esc(d.title || 'Video')}</b>\n\n${d.scenes.map((s, i) => `${i + 1}. ${esc(s.voice)}\n   <i>«${esc(s.caption)}»</i>`).join('\n')}`;
const videoKb = (u, id) => ({ inline_keyboard: [[{ text: tr(u, { uz: '🎬 Video yasash', ru: '🎬 Сделать видео', en: '🎬 Render video' }), callback_data: `agm:vr:${id}` }, { text: tr(u, { uz: '✏️ Oʻzgartirish', ru: '✏️ Изменить', en: '✏️ Edit' }), callback_data: `agm:ve:${id}` }]] });

async function newVideo(chat, u, prompt) {
  const q = await quota(u, 'video');
  if (!S.isAdmin(u.id) && q.mine >= LIMIT.video) return send(chat, limMsg(u, LIMIT.video));
  tg('sendChatAction', { chat_id: chat, action: 'typing' });
  const raw = await require('./ubot').genJson(u, VID_SYS, `Language for voice-over and captions: ${u.lang === 'ru' ? 'Russian' : u.lang === 'en' ? 'English' : 'Uzbek (Latin script)'}.\nTopic:\n${prompt}`);
  const d = cleanVideo(raw);
  if (!d) return send(chat, tr(u, T.fail));
  const id = S.newId().replace(/-/g, '').slice(0, 8);
  await store().setJSON(`agent/v/${id}`, { id, owner: String(u.id), lang: u.lang, prompt: prompt.slice(0, 500), ...d, rendered: false, ts: Date.now() });
  await remember(u.id, { t: 'v', id, title: d.title || prompt.slice(0, 40), ts: Date.now() });
  return send(chat, scriptText(u, d), videoKb(u, id));
}
async function renderVideo(ctx, u, id) {
  const st = store(), d = await st.get(`agent/v/${id}`, { type: 'json' });
  if (!d || d.owner !== String(u.id)) return '';
  const q = await quota(u, 'video'), admin = S.isAdmin(u.id);
  if (!d.rendered) {
    if (!admin && q.mine >= LIMIT.video) { await send(ctx.chat, limMsg(u, LIMIT.video)); return ''; }
    if (!admin && q.all >= GLOBAL) { await send(ctx.chat, tr(u, T.busy)); return ''; }
  } else if (!admin && q.edits >= EDIT_CAP) { await send(ctx.chat, tr(u, T.editcap)); return ''; }
  const r = await dispatch({ kind: 'video', prompt: d.prompt, chat: ctx.chat, lang: d.lang, id, scenes: JSON.stringify({ title: d.title, scenes: d.scenes, hashtags: d.tags }) });
  if (!r.ok) { await send(ctx.chat, r.error === 'token' ? (admin ? SETUP : tr(u, T.na)) : (admin ? `❌ ${esc(r.error)}` : tr(u, T.fail))); return ''; }
  if (!d.rendered) { d.rendered = true; await st.setJSON(`agent/v/${id}`, d); await q.bump(`video/${u.id}`, q.mine + 1); await q.bump('all', q.all + 1); } else await q.bump(`edit/${u.id}`, q.edits + 1);
  await send(ctx.chat, tr(u, T.wait.video));
  return '🎬';
}

/* ---------- sayt ---------- */
async function newSite(chat, u, prompt) {
  const q = await quota(u, 'site'), admin = S.isAdmin(u.id);
  if (!admin && q.mine >= LIMIT.site) return send(chat, limMsg(u, LIMIT.site));
  if (!admin && q.all >= GLOBAL) return send(chat, tr(u, T.busy));
  const id = S.newId().replace(/-/g, '').slice(0, 8), name = `site-${id}`, url = siteUrl(name);
  const r = await dispatch({ kind: 'site', prompt, chat, lang: u.lang, id, name });
  if (!r.ok) return send(chat, r.error === 'token' ? (admin ? SETUP : tr(u, T.na)) : (admin ? `❌ ${esc(r.error)}\n\n<i>Token huquqi va workflow main branchda ekanini tekshiring.</i>` : tr(u, T.fail)));
  await store().setJSON(`agent/s/${id}`, { id, owner: String(u.id), name, url, prompt: prompt.slice(0, 500), lang: u.lang, ts: Date.now() });
  await remember(u.id, { t: 's', id, title: prompt.slice(0, 40), url, ts: Date.now() });
  await q.bump(`site/${u.id}`, q.mine + 1); await q.bump('all', q.all + 1);
  return send(chat, `${tr(u, T.wait.site)}\n\n🔗 ${esc(url)}`);
}
async function editSite(chat, u, id, instruction) {
  const st = store(), s = await st.get(`agent/s/${id}`, { type: 'json' });
  if (!s || s.owner !== String(u.id)) return;
  const q = await quota(u, 'site'), admin = S.isAdmin(u.id);
  if (!admin && q.edits >= EDIT_CAP) return send(chat, tr(u, T.editcap));
  const r = await dispatch({ kind: 'site-edit', prompt: instruction, chat, lang: s.lang || u.lang, id, name: s.name, url: s.url });
  if (!r.ok) return send(chat, r.error === 'token' ? (admin ? SETUP : tr(u, T.na)) : tr(u, T.fail));
  await q.bump(`edit/${u.id}`, q.edits + 1);
  return send(chat, `${tr(u, T.wait.edit)}\n\n🔗 ${esc(s.url)}`);
}

/* ---------- /mening ---------- */
async function showMine(chat, u) {
  const list = (await store().get(`agent/own/${u.id}`, { type: 'json' })) || [];
  if (!list.length) return send(chat, tr(u, T.none), { inline_keyboard: [[{ text: '🤖 /botlarim', callback_data: 'ubm:L:0' }]] });
  const rows = list.slice(0, 12).map((x) => [{ text: `${x.t === 'v' ? '🎬' : '🌐'} ${x.title}`.slice(0, 58), callback_data: `agm:c:${x.t}:${x.id}` }]);
  rows.push([{ text: '🤖 ' + tr(u, { uz: 'Botlarim', ru: 'Мои боты', en: 'My bots' }), callback_data: 'ubm:L:0' }]);
  return send(chat, `📋 <b>${tr(u, { uz: 'Mening ishlarim', ru: 'Мои работы', en: 'My creations' })}</b>`, { inline_keyboard: rows });
}

async function onMessage(chat, u, cmd, args, text) {
  if (!cmd && u.state && u.state.kind === 'agedit') {
    if (!text) return true;
    const { t, id } = u.state; u.state = null;
    if (t === 's') { await editSite(chat, u, id, text); return true; }
    const st = store(), d = await st.get(`agent/v/${id}`, { type: 'json' });
    if (!d || d.owner !== String(u.id)) return true;
    const q = await quota(u, 'video');
    if (!S.isAdmin(u.id) && q.edits >= EDIT_CAP) { await send(chat, tr(u, T.editcap)); return true; }
    tg('sendChatAction', { chat_id: chat, action: 'typing' });
    const raw = await require('./ubot').genJson(u, `${VID_SYS}\nYou are EDITING an existing script. Apply the owner's instruction (any change: tone, length, scenes, language, wording) and return the FULL updated JSON in the same format. Keep what was not asked to change.`, `Current script:\n${JSON.stringify({ title: d.title, scenes: d.scenes, hashtags: d.tags })}\n\nInstruction:\n${text.slice(0, 1500)}`);
    const nd = cleanVideo(raw, d);
    if (!nd) { await send(chat, tr(u, T.fail)); return true; }
    Object.assign(d, nd); await st.setJSON(`agent/v/${id}`, d); await q.bump(`edit/${u.id}`, q.edits + 1);
    await send(chat, scriptText(u, d), videoKb(u, id));
    return true;
  }
  if (cmd !== '/video' && cmd !== '/sayt' && cmd !== '/agent' && cmd !== '/mening') return false;
  if (cmd === '/mening') { await showMine(chat, u); return true; }
  if (cmd === '/agent' || !args) { await send(chat, HELP(u)); return true; }
  if (cmd === '/video') await newVideo(chat, u, args); else await newSite(chat, u, args);
  return true;
}
async function onCallback(ctx, u, act, a, b, c) {
  if (act !== 'agm') return '';
  if (a === 'vr') return renderVideo(ctx, u, b);
  if (a === 've' || a === 'se') { u.state = { kind: 'agedit', t: a === 've' ? 'v' : 's', id: b }; await send(ctx.chat, tr(u, T.editAsk), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); return ''; }
  if (a === 'c') {
    const st = store();
    if (b === 'v') { const d = await st.get(`agent/v/${c}`, { type: 'json' }); if (d && d.owner === String(u.id)) await send(ctx.chat, scriptText(u, d), videoKb(u, c)); }
    else { const s = await st.get(`agent/s/${c}`, { type: 'json' }); if (s && s.owner === String(u.id)) await send(ctx.chat, `🌐 <b>${esc(s.prompt.slice(0, 80))}</b>\n\n🔗 ${esc(s.url)}`, { inline_keyboard: [[{ text: tr(u, { uz: '✏️ Oʻzgartirish', ru: '✏️ Изменить', en: '✏️ Edit' }), callback_data: `agm:se:${c}` }]] }); }
  }
  return '';
}
module.exports = { onMessage, onCallback, dispatch, ACTS: ['agm'] };
