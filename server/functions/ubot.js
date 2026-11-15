'use strict';
// Bot platformasi: foydalanuvchi tavsif beradi → AI bot tavsifini (spec) yozadi → bot bizning Cloudflare'da oʻzi ishlaydi.
// Begona kod ishga tushmaydi: faqat tekshirilgan JSON tavsif ijro etiladi.
const S = require('./_shared');
const ext = require('./ext');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text: String(text).slice(0, 3900), parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const store = () => S.openStore({});
const tr = (u, o) => o[u.lang] || o.uz;
const SITE = () => String(process.env.SITE_URL || '').replace(/\/$/, '');
const BOT_LIMIT = 5, MAX_BOTS = 15, BC_LIMIT = 3, AI_PER_BOT = 150;

/* ---------- token shifrlash (AES-GCM) ---------- */
async function aesKey() {
  const raw = new TextEncoder().encode(`${process.env.UB_KEY || ''}|${process.env.WEBHOOK_SECRET || ''}|ub1`);
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function enc(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), new TextEncoder().encode(text)));
  return Buffer.from([...iv, ...ct]).toString('base64');
}
async function dec(b64) {
  const b = Buffer.from(b64, 'base64');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, await aesKey(), b.subarray(12)));
}
async function utg(token, method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
    return await r.json();
  } catch (e) { return { ok: false, description: e.message }; }
}

/* ---------- tavsif (spec) ---------- */
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
function cleanSpec(x, prev = {}) {
  const s = x && typeof x === 'object' ? x : {};
  const menu = (Array.isArray(s.menu) ? s.menu : []).slice(0, 8).map((m) => ({ label: str(m && m.label, 30), reply: str(m && m.reply, 900), url: /^https:\/\/[^\s]+$/.test(str(m && m.url, 300)) ? str(m.url, 300) : '' })).filter((m) => m.label && (m.reply || m.url));
  const commands = (Array.isArray(s.commands) ? s.commands : []).slice(0, 10).map((c) => ({ cmd: str(c && c.cmd, 24).replace(/^\//, '').toLowerCase().replace(/[^a-z0-9_]/g, ''), reply: str(c && c.reply, 900), desc: str(c && c.desc, 60) })).filter((c) => c.cmd.length >= 2 && c.reply);
  const L = s.leads && typeof s.leads === 'object' ? s.leads : {};
  return {
    name: str(s.name, 60) || prev.name || 'Bot', about: str(s.about, 3000) || prev.about || '', lang: ['uz', 'ru', 'en'].includes(s.lang) ? s.lang : prev.lang || 'uz',
    welcome: str(s.welcome, 900) || prev.welcome || 'Assalomu alaykum! Sizga qanday yordam bera olaman?', menu, commands,
    ai: s.ai === undefined ? prev.ai !== false : s.ai !== false, fallback: str(s.fallback, 400) || prev.fallback || 'Savolingizni tushunmadim. Menyudan tanlang yoki batafsilroq yozing.',
    leads: { on: L.on === undefined ? Boolean(prev.leads && prev.leads.on) : L.on === true, ask: str(L.ask, 200) || (prev.leads && prev.leads.ask) || 'Bogʻlanish uchun telefon raqamingizni yuboring 👇', thanks: str(L.thanks, 200) || (prev.leads && prev.leads.thanks) || 'Rahmat! Tez orada bogʻlanamiz.' },
  };
}
function parseJsonLoose(t) {
  if (t && typeof t === 'object') return t;
  const m = String(t || '').replace(/^```(?:json)?|```$/gm, '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
// JSON olish: Gemini (kalit boʻlsa) → Workers AI
async function genJson(u, system, prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    for (const model of ['gemini-flash-latest', 'gemini-2.5-flash']) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, responseMimeType: 'application/json' } }) });
        if (!r.ok) continue;
        const j = await r.json(), out = parseJsonLoose((j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(''));
        if (out) return out;
      } catch { /* keyingisi */ }
    }
  }
  const r = await ext.aiCall({ ...u, ai: undefined }, `${system}\nReturn ONLY valid JSON, nothing else.`, prompt, { auto: true, limit: 1000 });
  return r.text ? parseJsonLoose(r.text) : null;
}
const SPEC_SYS = `You design Telegram bots for small businesses. Output a JSON bot spec:
{"name": str, "lang": "uz"|"ru"|"en", "about": str (detailed knowledge: services, prices ONLY if given, hours, address ONLY if given, tone rules, FAQ; used by the AI to answer customers),
"welcome": str (friendly premium greeting with 1-2 emoji), "menu": [{"label": str (max 28 chars, emoji first), "reply": str, "url": str|""}] (4-6 useful buttons),
"commands": [{"cmd": "help", "reply": str, "desc": str}], "ai": true, "fallback": str, "leads": {"on": bool, "ask": str, "thanks": str}}
Never invent phone numbers, addresses, prices: use "[telefon]" style placeholders only if the owner gave none. Write natural, polished text in the bot language (Uzbek in Latin script by default).`;

/* ---------- ma'lumot ---------- */
const getBot = (st, id) => st.get(`ub/${id}`, { type: 'json' });
const saveBot = (st, b) => st.setJSON(`ub/${b.id}`, b);
const own = async (st, uid) => (await st.get(`ub/own/${uid}`, { type: 'json' })) || [];
async function myBots(st, uid) { const out = []; for (const id of await own(st, uid)) { const b = await getBot(st, id); if (b) out.push(b); } return out; }

/* ---------- ijro: foydalanuvchi boti webhooki ---------- */
exports.handler = async (event) => {
  const id = String(event.path || '').split('/').pop();
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'ok' };
    const st = store(), b = await getBot(st, id);
    if (!b || !b.on) return { statusCode: 200, body: 'ok' };
    if (event.headers['x-telegram-bot-api-secret-token'] !== b.secret) return { statusCode: 401, body: 'unauthorized' };
    const up = JSON.parse(event.body || '{}'), token = await dec(b.tokenEnc), sp = b.spec;
    const say = (chat, text, markup) => utg(token, 'sendMessage', { chat_id: chat, text: String(text).slice(0, 3900), reply_markup: markup, disable_web_page_preview: true });
    const menuKb = () => (sp.menu.length ? { inline_keyboard: sp.menu.map((m, i) => [m.url ? { text: m.label, url: m.url } : { text: m.label, callback_data: `m:${i}` }]) } : undefined);
    const addSub = async (chat) => { const subs = (await st.get(`ub/${id}/subs`, { type: 'json' })) || []; if (!subs.includes(chat)) { subs.push(chat); await st.setJSON(`ub/${id}/subs`, subs.slice(-3000)); } };

    if (up.callback_query) {
      const q = up.callback_query, m = sp.menu[Number((q.data || '').split(':')[1])], chat = q.message && q.message.chat.id;
      await utg(token, 'answerCallbackQuery', { callback_query_id: q.id });
      if (m && chat) await say(chat, m.reply || m.label, m.url ? { inline_keyboard: [[{ text: m.label, url: m.url }]] } : undefined);
      return { statusCode: 200, body: 'ok' };
    }
    const msg = up.message;
    if (!msg || !msg.chat || msg.chat.type !== 'private') return { statusCode: 200, body: 'ok' };
    const chat = msg.chat.id, text = (msg.text || '').trim(), from = msg.from || {};
    await addSub(chat);
    const contact = msg.contact && msg.contact.phone_number;
    const phone = contact || (text.match(/(\+?998[\s\-()]*\d{2}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}|\b9\d{8}\b|\+\d{10,14})/) || [])[0];
    if (sp.leads.on && phone) {
      const lead = { n: [from.first_name, from.last_name].filter(Boolean).join(' '), u: from.username || '', p: phone, t: text.slice(0, 300), at: Date.now() };
      const leads = (await st.get(`ub/${id}/leads`, { type: 'json' })) || []; leads.unshift(lead); await st.setJSON(`ub/${id}/leads`, leads.slice(0, 200));
      await say(chat, sp.leads.thanks, { remove_keyboard: true });
      await send(b.ownerChat, `📩 <b>Yangi lid</b> · @${esc(b.username)}\n\n👤 ${esc(lead.n || '—')}${lead.u ? ` · @${esc(lead.u)}` : ''}\n📞 <b>${esc(lead.p)}</b>${lead.t && !contact ? `\n💬 ${esc(lead.t)}` : ''}`);
      return { statusCode: 200, body: 'ok' };
    }
    if (text === '/start' || text.startsWith('/start ')) {
      await say(chat, sp.welcome, menuKb());
      if (sp.leads.on) await say(chat, sp.leads.ask, { keyboard: [[{ text: '📞', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true });
      return { statusCode: 200, body: 'ok' };
    }
    if (text.startsWith('/')) {
      const c = sp.commands.find((x) => `/${x.cmd}` === text.split(/[\s@]/)[0].toLowerCase());
      await say(chat, c ? c.reply : sp.fallback, menuKb());
      return { statusCode: 200, body: 'ok' };
    }
    if (!text) { await say(chat, sp.fallback, menuKb()); return { statusCode: 200, body: 'ok' }; }
    if (sp.ai) {
      const day = new Date().toISOString().slice(0, 10), ck = `ub/${id}/ai/${day}`, used = Number(await st.get(ck)) || 0;
      if (used < AI_PER_BOT) {
        utg(token, 'sendChatAction', { chat_id: chat, action: 'typing' });
        const hk = `ub/${id}/h/${chat}`, hist = (await st.get(hk, { type: 'json' })) || [];
        const sys = `You are the Telegram assistant of "${sp.name}". Business knowledge (the ONLY facts you may state):\n${sp.about}\n\nRules: reply in the customer's language (default ${sp.lang === 'ru' ? 'Russian' : sp.lang === 'en' ? 'English' : 'Uzbek Latin'}), warm, polite, 1-4 short sentences, never invent prices/addresses/phones/hours not listed above; if unknown say the team will answer soon and ask for a phone number. No markdown.`;
        const r = await ext.aiCall({ tz: 300, lang: sp.lang, ai: undefined }, sys, text.slice(0, 800), { auto: true, limit: 1000, history: hist.slice(-6).map((h) => ({ role: h.r, content: h.t })) });
        if (r.text) {
          await st.set(ck, used + 1); await st.setJSON(hk, [...hist, { r: 'user', t: text.slice(0, 300) }, { r: 'assistant', t: r.text.slice(0, 400) }].slice(-8));
          await say(chat, r.text, menuKb());
          return { statusCode: 200, body: 'ok' };
        }
      }
    }
    await say(chat, sp.fallback, menuKb());
  } catch (e) { console.error('ub', id, e.message); await require('./alert').notify('user-bot', e); }
  return { statusCode: 200, body: 'ok' };
};

/* ---------- boshqaruv (asosiy bot ichida) ---------- */
const TX = {
  help: { uz: '🤖 <b>Bot yasash</b>\n\nHar kuni 5 tagacha yangi bot yasashingiz mumkin, hammasini xohlagancha oʻzgartirasiz.\n\n<code>/botyasa tavsif</code>\nMasalan: <code>/botyasa Stomatologiya klinikasi uchun bot: xizmatlar, narxlar, qabulga yozilish</code>\n\n📋 /botlarim — botlaringiz', ru: '🤖 <b>Создание бота</b>\n\nДо 5 новых ботов в день, менять можно как угодно.\n\n<code>/botyasa описание</code>\nНапример: <code>/botyasa Бот для стоматологии: услуги, цены, запись</code>\n\n📋 /botlarim — ваши боты', en: '🤖 <b>Create a bot</b>\n\nUp to 5 new bots per day, edit them any way you like.\n\n<code>/botyasa description</code>\nExample: <code>/botyasa Bot for a dental clinic: services, prices, booking</code>\n\n📋 /botlarim — your bots' },
  token: { uz: '1️⃣ Telegramda <b>@BotFather</b> ga kiring → <code>/newbot</code> → nom va username tanlang.\n2️⃣ U bergan <b>tokenni</b> shu yerga yuboring (xavfsizlik uchun xabarni oʻchirib tashlayman).', ru: '1️⃣ Откройте <b>@BotFather</b> → <code>/newbot</code> → выберите имя и username.\n2️⃣ Пришлите сюда полученный <b>токен</b> (я удалю сообщение для безопасности).', en: '1️⃣ Open <b>@BotFather</b> → <code>/newbot</code> → choose a name and username.\n2️⃣ Send me the <b>token</b> it gives you (I will delete the message for safety).' },
  badToken: { uz: '❌ Token notoʻgʻri yoki bot topilmadi. @BotFather bergan tokenni qayta yuboring (/bekor — bekor qilish).', ru: '❌ Токен неверный. Пришлите токен от @BotFather ещё раз (/bekor — отмена).', en: '❌ Invalid token. Send the token from @BotFather again (/bekor to cancel).' },
  limit: { uz: `⏳ Bugungi limit tugadi (kuniga ${BOT_LIMIT} ta bot). Mavjud botlarni /botlarim da xohlagancha oʻzgartirishingiz mumkin.`, ru: `⏳ Лимит на сегодня исчерпан (${BOT_LIMIT} бота в день). Существующих можно менять через /botlarim.`, en: `⏳ Daily limit reached (${BOT_LIMIT} bots per day). You can still edit existing bots in /botlarim.` },
  many: { uz: `Sizda ${MAX_BOTS} ta bot bor — yangisi uchun eskisini oʻchiring.`, ru: `У вас уже ${MAX_BOTS} ботов — удалите старый.`, en: `You already have ${MAX_BOTS} bots — delete an old one first.` },
  dup: { uz: 'Bu bot allaqachon ulangan.', ru: 'Этот бот уже подключён.', en: 'This bot is already connected.' },
  working: { uz: '⚙️ Bot yaratilmoqda…', ru: '⚙️ Создаю бота…', en: '⚙️ Creating your bot…' },
  fail: { uz: '❌ Hozir yaratib boʻlmadi. Birozdan keyin qayta urinib koʻring.', ru: '❌ Не получилось. Попробуйте позже.', en: '❌ Could not create it now. Try again later.' },
  none: { uz: 'Hozircha botingiz yoʻq. /botyasa bilan yarating.', ru: 'Пока нет ботов. Создайте через /botyasa.', en: 'No bots yet. Create one with /botyasa.' },
  editAsk: { uz: '✏️ Nimani oʻzgartiray? Xohlagan narsani yozing: matn, tugmalar, narxlar, uslub, til…\n\nMasalan: <i>Menyuga "Aksiyalar" tugmasini qoʻshing</i>', ru: '✏️ Что изменить? Пишите что угодно: тексты, кнопки, цены, стиль, язык…\n\nНапример: <i>Добавь в меню кнопку «Акции»</i>', en: '✏️ What should I change? Anything: texts, buttons, prices, tone, language…\n\nExample: <i>Add an "Offers" button to the menu</i>' },
  edited: { uz: '✅ Oʻzgartirildi', ru: '✅ Изменено', en: '✅ Updated' },
  editFail: { uz: '❌ Tushunmadim yoki oʻzgartirib boʻlmadi. Boshqacha yozib koʻring.', ru: '❌ Не получилось. Сформулируйте иначе.', en: '❌ Could not apply that. Try rephrasing.' },
  bcAsk: { uz: '📣 Botingiz obunachilariga yuboriladigan xabarni yozing:', ru: '📣 Напишите сообщение для подписчиков бота:', en: '📣 Write the message for your bot’s subscribers:' },
};
function botKb(b, u) {
  return { inline_keyboard: [
    [{ text: tr(u, { uz: '✏️ Oʻzgartirish', ru: '✏️ Изменить', en: '✏️ Edit' }), callback_data: `ubm:e:${b.id}` }, { text: tr(u, { uz: '👥 Lidlar', ru: '👥 Лиды', en: '👥 Leads' }), callback_data: `ubm:l:${b.id}` }],
    [{ text: tr(u, { uz: '📣 Xabar yuborish', ru: '📣 Рассылка', en: '📣 Broadcast' }), callback_data: `ubm:b:${b.id}` }, { text: b.on ? tr(u, { uz: '⏸ Toʻxtatish', ru: '⏸ Пауза', en: '⏸ Pause' }) : tr(u, { uz: '▶️ Yoqish', ru: '▶️ Включить', en: '▶️ Resume' }), callback_data: `ubm:t:${b.id}` }],
    [{ text: tr(u, { uz: '🗑 Oʻchirish', ru: '🗑 Удалить', en: '🗑 Delete' }), callback_data: `ubm:x:${b.id}` }, { text: '⬅️', callback_data: 'ubm:L:0' }],
  ] };
}
const card = (b) => `🤖 <b>${esc(b.spec.name)}</b> · <a href="https://t.me/${esc(b.username)}">@${esc(b.username)}</a> ${b.on ? '🟢' : '⏸'}\n\n${esc(b.spec.welcome.slice(0, 220))}\n\n📋 ${b.spec.menu.map((m) => esc(m.label)).join(' · ') || '—'}\n🧠 AI: ${b.spec.ai ? 'ha' : 'yoʻq'} · 📞 lid: ${b.spec.leads.on ? 'ha' : 'yoʻq'} · /komandalar: ${b.spec.commands.length}`;
async function applyProfile(token, spec) {
  if (spec.commands.length) await utg(token, 'setMyCommands', { commands: spec.commands.slice(0, 10).map((c) => ({ command: c.cmd, description: c.desc || c.cmd })) });
  await utg(token, 'setMyDescription', { description: spec.welcome.slice(0, 500) });
  await utg(token, 'setMyShortDescription', { short_description: (spec.about || spec.welcome).slice(0, 120) });
}
async function usageToday(u) { const st = store(), k = `ub/new/${S.todayISO(u.tz)}/${u.id}`; return { st, k, n: Number(await st.get(k)) || 0 }; }

async function showList(ctx, u) {
  const bots = await myBots(store(), u.id);
  if (!bots.length) return send(ctx.chat, tr(u, TX.none));
  return send(ctx.chat, `🤖 <b>${tr(u, { uz: 'Botlarim', ru: 'Мои боты', en: 'My bots' })}</b>`, { inline_keyboard: bots.map((b) => [{ text: `${b.on ? '🟢' : '⏸'} @${b.username} · ${b.spec.name}`.slice(0, 60), callback_data: `ubm:c:${b.id}` }]) });
}
async function onMessage(chat, u, cmd, args, text) {
  if (cmd === '/bot') { await send(chat, tr(u, TX.help)); return true; }
  if (cmd === '/botlarim') { await showList({ chat }, u); return true; }
  if (cmd === '/botyasa') {
    if (!args) { await send(chat, tr(u, TX.help)); return true; }
    const us = await usageToday(u), bots = await own(us.st, u.id);
    if (!S.isAdmin(u.id) && us.n >= BOT_LIMIT) { await send(chat, tr(u, TX.limit)); return true; }
    if (bots.length >= MAX_BOTS) { await send(chat, tr(u, TX.many)); return true; }
    u.state = { kind: 'ubtoken', desc: args.slice(0, 1500) };
    await send(chat, tr(u, TX.token), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] });
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'ubtoken') {
    const m = (text || '').match(/\d{6,12}:[\w-]{30,}/);
    if (!m) { await send(chat, tr(u, TX.badToken)); return true; }
    const token = m[0], st = store();
    if (u.lastMsgId) tg('deleteMessage', { chat_id: chat, message_id: u.lastMsgId }); // token chatda qolmasin
    const me = await utg(token, 'getMe', {});
    if (!me.ok) { await send(chat, tr(u, TX.badToken)); return true; }
    const desc = u.state.desc; u.state = null;
    const exist = await st.get(`ub/by/${me.result.id}`);
    if (exist) { await send(chat, tr(u, TX.dup)); return true; }
    await send(chat, tr(u, TX.working));
    tg('sendChatAction', { chat_id: chat, action: 'typing' });
    const raw = await genJson(u, SPEC_SYS, `Language of the owner: ${u.lang}. Bot description from the owner:\n${desc}`);
    if (!raw) { await send(chat, tr(u, TX.fail)); return true; }
    const spec = cleanSpec(raw, { lang: u.lang }), id = S.newId().replace(/-/g, '').slice(0, 10), secret = S.newId().replace(/-/g, '');
    const b = { id, owner: String(u.id), ownerChat: String(chat), username: me.result.username, botId: me.result.id, tokenEnc: await enc(token), secret, spec, on: true, created: Date.now() };
    const wh = await utg(token, 'setWebhook', { url: `${SITE()}/api/ub/${id}`, secret_token: secret, allowed_updates: ['message', 'callback_query'], max_connections: 20 });
    if (!wh.ok) { await send(chat, `${tr(u, TX.fail)}\n<code>${esc(wh.description || '')}</code>`); return true; }
    await applyProfile(token, spec);
    await saveBot(st, b); await st.set(`ub/by/${me.result.id}`, id);
    const bots = await own(st, u.id); bots.push(id); await st.setJSON(`ub/own/${u.id}`, bots);
    const us = await usageToday(u); await st.set(us.k, us.n + 1);
    await send(chat, `✅ ${tr(u, { uz: 'Bot tayyor va ishlayapti!', ru: 'Бот готов и работает!', en: 'Your bot is live!' })}\n\n${card(b)}`, botKb(b, u));
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'ubedit') {
    if (!text) return true;
    const st = store(), b = await getBot(st, u.state.id); u.state = null;
    if (!b || b.owner !== String(u.id)) return true;
    tg('sendChatAction', { chat_id: chat, action: 'typing' });
    const raw = await genJson(u, `${SPEC_SYS}\nYou are EDITING an existing bot. Apply the owner's instruction to the current spec and return {"spec": <the FULL updated spec>, "summary": "one short sentence of what changed, in the owner's language"}. Keep everything the owner did not ask to change.`, `Current spec:\n${JSON.stringify(b.spec)}\n\nOwner instruction:\n${text.slice(0, 1500)}`);
    const next = raw && (raw.spec || raw);
    if (!next || typeof next !== 'object') { await send(chat, tr(u, TX.editFail)); return true; }
    b.spec = cleanSpec(next, b.spec); await saveBot(st, b);
    await applyProfile(await dec(b.tokenEnc), b.spec);
    await send(chat, `${tr(u, TX.edited)}${raw.summary ? `: ${esc(String(raw.summary).slice(0, 200))}` : ''}\n\n${card(b)}`, botKb(b, u));
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'ubbc') {
    if (!text) return true;
    const st = store(), b = await getBot(st, u.state.id); u.state = null;
    if (!b || b.owner !== String(u.id)) return true;
    const subs = (await st.get(`ub/${b.id}/subs`, { type: 'json' })) || [];
    await send(chat, `📣 ${subs.length} ${tr(u, { uz: 'ta obunachiga yuborilsinmi?', ru: 'подписчикам отправить?', en: 'subscribers — send?' })}\n\n${esc(text.slice(0, 600))}`, { inline_keyboard: [[{ text: '✅', callback_data: `ubm:y:${b.id}` }, { text: '❌', callback_data: 'pno' }]] });
    await st.set(`ub/${b.id}/bctext`, text.slice(0, 3000));
    return true;
  }
  return false;
}
async function onCallback(ctx, u, act, a, b2) {
  const st = store();
  if (act !== 'ubm') return '';
  if (a === 'L') { await showList(ctx, u); return ''; }
  const b = await getBot(st, b2);
  if (a !== 'L' && (!b || b.owner !== String(u.id))) return '';
  if (a === 'c') await send(ctx.chat, card(b), botKb(b, u));
  else if (a === 'e') { u.state = { kind: 'ubedit', id: b.id }; await send(ctx.chat, tr(u, TX.editAsk), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); }
  else if (a === 'l') {
    const leads = (await st.get(`ub/${b.id}/leads`, { type: 'json' })) || [];
    await send(ctx.chat, leads.length ? `👥 <b>${leads.length}</b>\n\n${leads.slice(0, 12).map((l) => `• ${esc(l.n || '—')}${l.u ? ` @${esc(l.u)}` : ''} — <b>${esc(l.p)}</b>`).join('\n')}` : tr(u, { uz: 'Hozircha lid yoʻq.', ru: 'Пока нет лидов.', en: 'No leads yet.' }));
  } else if (a === 'b') {
    const us = await st.get(`ub/${b.id}/bc/${S.todayISO(u.tz)}`);
    if (!S.isAdmin(u.id) && Number(us) >= BC_LIMIT) return tr(u, { uz: 'Bugungi xabar limiti tugadi', ru: 'Лимит рассылок исчерпан', en: 'Broadcast limit reached' });
    u.state = { kind: 'ubbc', id: b.id }; await send(ctx.chat, tr(u, TX.bcAsk), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] });
  } else if (a === 'y') {
    const text = await st.get(`ub/${b.id}/bctext`), subs = (await st.get(`ub/${b.id}/subs`, { type: 'json' })) || [];
    if (!text) return '';
    const q = (await st.get('ub/bcq', { type: 'json' })) || []; q.push({ bot: b.id, text, i: 0, n: subs.length, owner: b.ownerChat });
    await st.setJSON('ub/bcq', q.slice(-20)); await st.set(`ub/${b.id}/bc/${S.todayISO(u.tz)}`, (Number(await st.get(`ub/${b.id}/bc/${S.todayISO(u.tz)}`)) || 0) + 1);
    await send(ctx.chat, tr(u, { uz: '📣 Yuborish boshlandi (daqiqasiga ~25 ta).', ru: '📣 Рассылка запущена (~25 в минуту).', en: '📣 Sending started (~25 per minute).' }));
  } else if (a === 't') {
    b.on = !b.on; await saveBot(st, b); const token = await dec(b.tokenEnc);
    if (b.on) await utg(token, 'setWebhook', { url: `${SITE()}/api/ub/${b.id}`, secret_token: b.secret, allowed_updates: ['message', 'callback_query'] });
    await send(ctx.chat, card(b), botKb(b, u));
  } else if (a === 'x') {
    await send(ctx.chat, `🗑 @${esc(b.username)}?`, { inline_keyboard: [[{ text: tr(u, { uz: 'Ha, oʻchirish', ru: 'Да, удалить', en: 'Yes, delete' }), callback_data: `ubm:z:${b.id}` }, { text: '❌', callback_data: 'pno' }]] });
  } else if (a === 'z') {
    try { await utg(await dec(b.tokenEnc), 'deleteWebhook', {}); } catch { /* ignore */ }
    await st.delete(`ub/${b.id}`).catch(() => st.setJSON(`ub/${b.id}`, null)); await st.set(`ub/by/${b.botId}`, '');
    await st.setJSON(`ub/own/${u.id}`, (await own(st, u.id)).filter((x) => x !== b.id));
    await send(ctx.chat, tr(u, { uz: '🗑 Oʻchirildi.', ru: '🗑 Удалено.', en: '🗑 Deleted.' }));
  }
  return '';
}
// Cron: xabar yuborish navbati (daqiqada 25 ta — Cloudflare subrequest limitidan oshmaslik uchun)
async function tick() {
  const st = store(), q = (await st.get('ub/bcq', { type: 'json' })) || [];
  if (!q.length) return;
  const job = q[0], b = await getBot(st, job.bot);
  if (!b) { q.shift(); await st.setJSON('ub/bcq', q); return; }
  const subs = (await st.get(`ub/${b.id}/subs`, { type: 'json' })) || [], token = await dec(b.tokenEnc);
  const batch = subs.slice(job.i, job.i + 25);
  for (const c of batch) await utg(token, 'sendMessage', { chat_id: c, text: job.text });
  job.i += batch.length;
  if (job.i >= subs.length) { q.shift(); await send(job.owner, `📣 ✅ ${subs.length}`); }
  await st.setJSON('ub/bcq', q);
}
module.exports = { handler: exports.handler, onMessage, onCallback, tick, cleanSpec, genJson, ACTS: ['ubm'] };
