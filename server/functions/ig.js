'use strict';
// Instagram Direct: lidlarga AI javob, lidlar bazasi, adminga bildirishnoma va kunlik hisobot.
// Sirlar (Cloudflare secrets): IG_TOKEN, IG_ACCOUNT_ID, IG_VERIFY_TOKEN, IG_APP_SECRET (ixtiyoriy, imzo tekshiruvi).
const crypto = require('crypto');
const S = require('./_shared');
const ext = require('./ext');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text: text.slice(0, 3900), parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text: text.slice(0, 3900), parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));
const store = () => S.openStore({});
const IG_LIMIT = 300; // kuniga AI javoblar soni

const DEFAULT_ABOUT = `Biz — Impro It jamoasi. Xizmatlarimiz:
1) Google'da koʻrinadigan veb-saytlar (vizitka, landing, doʻkon),
2) Telegram botlar (buyurtma, qabul, avto-javob),
3) Instagram uchun reklama videolari.
Narx loyiha murakkabligiga bogʻliq; aniq narxni menejer suhbatdan keyin aytadi.`;

/* ---------- sozlama va lidlar bazasi ---------- */
async function cfg(st) {
  const c = (await st.get('ig/cfg', { type: 'json' })) || {};
  return { on: c.on !== false, about: c.about || '', hour: c.hour || '20:00', lastReport: c.lastReport || '', owner: c.owner || S.adminIds()[0], ...c };
}
const saveCfg = (st, c) => st.setJSON('ig/cfg', c);
async function getLead(st, id) { return (await st.get(`iglead/${id}`, { type: 'json' })) || null; }
async function saveLead(st, l) {
  await st.setJSON(`iglead/${l.id}`, l);
  const idx = (await st.get('ig/idx', { type: 'json' })) || [];
  if (!idx.includes(l.id)) { idx.unshift(l.id); await st.setJSON('ig/idx', idx.slice(0, 400)); }
}
async function recentLeads(st, n = 30) {
  const idx = (await st.get('ig/idx', { type: 'json' })) || [];
  const out = [];
  for (const id of idx.slice(0, n)) { const l = await getLead(st, id); if (l) out.push(l); }
  return out.sort((a, b) => (b.last || 0) - (a.last || 0));
}

/* ---------- tasniflash (AI xarajatsiz) ---------- */
const PHONE_RE = /(\+?998[\s\-()]*\d{2}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}|\b\d{2}[\s\-]\d{3}[\s\-]\d{2}[\s\-]\d{2}\b|\b9\d{8}\b)/;
function classify(text) {
  const t = String(text || '').toLowerCase();
  if (/сайт|sayt|site|website|veb|web|landing|лендинг|vizitka/.test(t)) return 'site';
  if (/\bbot\b|бот|telegram bot|botcha/.test(t)) return 'bot';
  if (/video|reels|reel|montaj|видео|ролик/.test(t)) return 'video';
  return '';
}
const isPrice = (t) => /narx|qancha|necha pul|necha so|price|cost|сколько|цена|стоим|pul turadi|summa/.test(String(t).toLowerCase());
const wantsHuman = (t) => /operator|menejer|manager|odam bilan|inson|администратор|менеджер|оператор|qoʻngʻiroq|qongiroq|call me|bog.?lan/.test(String(t).toLowerCase());
const isSpam = (t) => /(http|www\.|\.com|\.ru|promo|follow me|obuna bo.?ling|подпишись|ставки|casino|bet)/i.test(String(t));
function normPhone(raw) {
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 9) return `+998${d}`;
  if (d.length === 12 && d.startsWith('998')) return `+${d}`;
  return raw.trim();
}

/* ---------- AI javob ---------- */
function systemPrompt(about) {
  return `You are the Instagram Direct assistant of "Impro It", a small team in Uzbekistan that builds websites visible on Google, Telegram bots and Instagram promo videos. You chat with potential customers on behalf of the team.

Business facts (the ONLY facts you may state):
${about || DEFAULT_ABOUT}

Rules:
- Reply in the customer's language (Uzbek in Latin script by default; Russian or English if they write that way). Warm, polite, natural, like a friendly manager. 1-3 short sentences. At most one emoji.
- Understand what they need (website, Telegram bot, video, or something else). Ask ONE helpful question at a time: what is their business, what they want the site/bot to do.
- When the need is clear, politely ask for their name and phone number so a manager can contact them.
- Never invent prices, deadlines, discounts, addresses or phone numbers. If asked about price or deadline and the facts above do not state it, say the manager will give an exact quote after a short chat, and ask for their phone number.
- If asked whether you are a bot/AI, answer honestly that you are the team's virtual assistant and a manager will join if needed.
- If the customer wants a person, complains, or asks something you cannot answer from the facts, reply politely that a manager will contact them soon and add the token [[OPERATOR]] at the very end.
- Do not discuss unrelated topics at length; steer back to how you can help. No markdown, no lists.`;
}
async function aiReply(c, lead, text) {
  const owner = { tz: 300, lang: 'uz', ai: c.ai };
  const history = lead.msgs.slice(-10).map((m) => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t.slice(0, 500) }));
  // oxirgi (hozirgi) xabar historyda takrorlanmasin
  if (history.length && history[history.length - 1].role === 'user') history.pop();
  const r = await ext.aiCall(owner, systemPrompt(c.about), text.slice(0, 800), { auto: true, history, limit: IG_LIMIT });
  c.ai = owner.ai;
  if (!r.text) return { error: r.error || 'fail' };
  const handoff = /\[\[OPERATOR\]\]/i.test(r.text);
  return { text: r.text.replace(/\[\[OPERATOR\]\]/gi, '').trim(), handoff };
}

/* ---------- Instagram API ---------- */
async function igSend(to, text) {
  const token = process.env.IG_TOKEN, id = process.env.IG_ACCOUNT_ID || 'me';
  if (!token) return { ok: false, error: 'IG_TOKEN yoʻq' };
  try {
    const r = await fetch(`https://graph.instagram.com/v21.0/${id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ recipient: { id: to }, message: { text: text.slice(0, 950) } }) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true } : { ok: false, error: (j.error && j.error.message) || `HTTP ${r.status}` };
  } catch (e) { return { ok: false, error: e.message }; }
}
async function igProfile(id) {
  const token = process.env.IG_TOKEN;
  if (!token) return {};
  try {
    const r = await fetch(`https://graph.instagram.com/v21.0/${id}?fields=name,username`, { headers: { authorization: `Bearer ${token}` } });
    return r.ok ? await r.json() : {};
  } catch { return {}; }
}

/* ---------- xabarni qayta ishlash (webhook ham, sinov ham shu yerdan) ---------- */
async function handleIncoming(st, c, senderId, text, opts = {}) {
  const now = Date.now();
  let lead = await getLead(st, senderId);
  const isNew = !lead;
  if (isNew) {
    const pf = opts.test ? { name: 'Sinov', username: 'test' } : await igProfile(senderId);
    lead = { id: senderId, name: pf.name || '', username: pf.username || '', first: now, last: now, intent: '', phone: '', hot: false, handoff: false, muted: 0, msgs: [], n: 0 };
  }
  lead.last = now; lead.n += 1;
  lead.msgs.push({ r: 'u', t: text.slice(0, 600), ts: now });
  const ph = text.match(PHONE_RE);
  const gotPhone = Boolean(ph && !lead.phone);
  if (gotPhone) lead.phone = normPhone(ph[0]);
  const it = classify(text);
  if (it && !lead.intent) lead.intent = it;
  if (isSpam(text) && lead.n <= 2 && !lead.intent && !lead.phone) lead.spam = true;
  const priceAsk = isPrice(text), human = wantsHuman(text);
  const becameHot = !lead.hot && (Boolean(lead.phone) || priceAsk || human);
  if (becameHot) lead.hot = true;
  if (human) lead.handoff = true;

  let reply = null, ai = null;
  const muted = lead.muted && lead.muted > now;
  if (c.on && !muted && !lead.spam) {
    ai = await aiReply(c, lead, text);
    if (ai.text) {
      reply = ai.text;
      if (ai.handoff) { lead.handoff = true; lead.hot = true; }
    } else if (ai.error === 'limit') reply = null;
  }
  if (reply) lead.msgs.push({ r: 'b', t: reply, ts: Date.now() });
  await saveLead(st, lead);
  await st.setJSON('ig/ai', c.ai || null);
  return { lead, reply, isNew, becameHot, gotPhone, handoff: Boolean(lead.handoff && (human || (ai && ai.handoff))), muted: Boolean(muted) };
}

const INTENT = { site: '🌐 Sayt', bot: '🤖 Bot', video: '🎬 Video', '': '💬 Savol' };
const leadName = (l) => esc(l.name || (l.username ? `@${l.username}` : `ID ${l.id.slice(-5)}`));
function leadCard(l) {
  const last = l.msgs.slice(-6).map((m) => `${m.r === 'u' ? '👤' : m.r === 'b' ? '🤖' : '🧑‍💼'} ${esc(m.t.slice(0, 200))}`).join('\n');
  return `📩 <b>${leadName(l)}</b>${l.username ? ` · @${esc(l.username)}` : ''}\n${INTENT[l.intent] || INTENT['']}${l.phone ? ` · 📞 <b>${esc(l.phone)}</b>` : ''}${l.hot ? ' · 🔥' : ''}${l.handoff ? ' · 🙋 operator kerak' : ''}${l.muted && l.muted > Date.now() ? ' · 🔇 AI toʻxtatilgan' : ''}\n\n${last}`;
}
const leadKb = (l) => ({ inline_keyboard: [[{ text: '✍️ Javob yozish', callback_data: `igo:${l.id}` }, { text: l.muted && l.muted > Date.now() ? '🤖 AI yoqish' : '🔇 AI toʻxtatish', callback_data: `igm:${l.id}` }], [{ text: '👥 Lidlar', callback_data: 'igl:0' }]] });

async function notifyOwner(c, r) {
  if (c.notify === 'report') return; // faqat kunlik hisobot rejimi
  const l = r.lead;
  const title = r.isNew ? '🆕 Yangi lid' : r.gotPhone ? '📞 Telefon qoldirdi' : r.handoff ? '🙋 Operator kerak' : '🔥 Lid qiziqdi';
  const ids = [c.owner, ...S.adminIds()].filter((x, i, a) => x && a.indexOf(x) === i);
  const st = store();
  for (const id of ids) {
    const u = await S.getUser(st, id).catch(() => null);
    if (u && u.chat) await send(u.chat, `${title}\n\n${leadCard(l)}`, leadKb(l));
  }
}

/* ---------- webhook ---------- */
function verifySig(event) {
  const secret = process.env.IG_APP_SECRET;
  if (!secret) return true;
  const sig = String(event.headers['x-hub-signature-256'] || '').replace('sha256=', '');
  const calc = crypto.createHmac('sha256', secret).update(event.body || '').digest('hex');
  return sig.length === calc.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(calc));
}
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  if (event.httpMethod === 'GET') {
    if (q['hub.mode'] === 'subscribe' && process.env.IG_VERIFY_TOKEN && q['hub.verify_token'] === process.env.IG_VERIFY_TOKEN) return { statusCode: 200, body: String(q['hub.challenge'] || '') };
    return { statusCode: 403, body: 'forbidden' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'ok' };
  if (!verifySig(event)) return { statusCode: 401, body: 'bad signature' };
  try {
    const body = JSON.parse(event.body || '{}');
    const st = store();
    const c = await cfg(st);
    c.ai = (await st.get('ig/ai', { type: 'json' })) || null;
    const myId = process.env.IG_ACCOUNT_ID || '';
    for (const en of body.entry || []) {
      for (const ev of en.messaging || []) {
        const m = ev.message;
        if (!m) continue;
        const sender = String(ev.sender && ev.sender.id), rcpt = String(ev.recipient && ev.recipient.id);
        if (m.is_echo) { // jamoa Instagramdan oʻzi javob yozdi: AI 12 soat aralashmaydi
          const lead = await getLead(st, rcpt);
          if (lead && m.text && !lead.msgs.slice(-3).some((x) => x.r === 'b' && x.t.slice(0, 40) === m.text.slice(0, 40))) {
            lead.msgs.push({ r: 'o', t: m.text.slice(0, 600), ts: Date.now() }); lead.muted = Date.now() + 12 * 3600000; await saveLead(st, lead);
          }
          continue;
        }
        if (myId && sender === myId) continue;
        const dup = await getLead(st, sender);
        if (dup && m.mid && dup.mid === m.mid) continue;
        const text = m.text || (m.attachments && m.attachments.length ? '[rasm/ovoz]' : '');
        if (!text) continue;
        const r = await handleIncoming(st, c, sender, text);
        if (m.mid) { r.lead.mid = m.mid; await saveLead(st, r.lead); }
        if (r.reply) {
          const sent = await igSend(sender, r.reply);
          if (!sent.ok) { await require('./alert').notify('Instagram javob', new Error(sent.error)); }
        } else if (text === '[rasm/ovoz]' && c.on && !r.muted) {
          await igSend(sender, 'Rahmat! Iltimos, savolingizni matn bilan yozing, yordam beramiz 🙂');
        }
        if (r.isNew || r.becameHot || r.handoff || r.gotPhone) await notifyOwner(c, r);
      }
    }
  } catch (e) { console.error('ig', e); await require('./alert').notify('Instagram webhook', e); }
  return { statusCode: 200, body: 'ok' };
};

/* ---------- Telegram: /ig boshqaruv ---------- */
const isOwner = (u) => S.isAdmin(u.id);
async function dayStats(st, today, tz) {
  const leads = await recentLeads(st, 400), t0 = S.startUTC({ date: today, time: '00:00' }, tz), t1 = t0 + 86400000;
  const day = leads.filter((l) => (l.last || 0) >= t0 && l.last < t1);
  const by = { site: 0, bot: 0, video: 0, other: 0, spam: 0 };
  for (const l of day) by[l.spam ? 'spam' : l.intent || 'other'] += 1;
  return { day, by, hot: day.filter((l) => l.hot && !l.spam), phones: day.filter((l) => l.phone), fresh: day.filter((l) => (l.first || 0) >= t0) };
}
function reportText(s, today) {
  if (!s.day.length) return `📊 <b>Instagram · ${today.slice(8)}.${today.slice(5, 7)}</b>\n\nBugun yangi xabar boʻlmadi.`;
  let t = `📊 <b>Instagram · bugungi hisobot</b>\n\nJami yozganlar: <b>${s.day.length}</b> (yangi: ${s.fresh.length})\n🌐 Sayt: <b>${s.by.site}</b> · 🤖 Bot: <b>${s.by.bot}</b> · 🎬 Video: <b>${s.by.video}</b>\n💬 Boshqa savol: ${s.by.other} · 🚫 Spam: ${s.by.spam}\n🔥 Qiziqqan: <b>${s.hot.length}</b> · 📞 Telefon qoldirgan: <b>${s.phones.length}</b>`;
  if (s.phones.length) t += `\n\n<b>Aloqa uchun:</b>\n${s.phones.slice(0, 10).map((l) => `• ${leadName(l)} — ${esc(l.phone)} (${(INTENT[l.intent] || INTENT['']).replace(/^\S+ /, '')})`).join('\n')}`;
  const wait = s.day.filter((l) => l.handoff && !l.spam).slice(0, 6);
  if (wait.length) t += `\n\n🙋 <b>Operator kutayotganlar:</b>\n${wait.map((l) => `• ${leadName(l)}${l.username ? ` @${esc(l.username)}` : ''}`).join('\n')}`;
  return t;
}
async function showMain(ctx, u) {
  const st = store(), c = await cfg(st), today = S.todayISO(u.tz), s = await dayStats(st, today, u.tz);
  const conn = process.env.IG_TOKEN && process.env.IG_ACCOUNT_ID ? '✅ ulangan' : '⏳ ulanmagan (Meta kalitlari kerak)';
  const text = `📸 <b>Instagram lidlar</b>\n\nMeta ulanishi: ${conn}\nAI javob: ${c.on ? '🟢 yoqilgan' : '⏸ oʻchirilgan'}\nKunlik hisobot: ${c.hour}\nBildirishnoma: ${c.notify === 'report' ? '📊 faqat hisobot' : '🔔 muhim lidlar + hisobot'}\n\nBugun: <b>${s.day.length}</b> ta yozgan · 🔥 ${s.hot.length} · 📞 ${s.phones.length}\n\n<i>Biznes haqida matn: ${c.about ? 'oʻrnatilgan ✅' : 'standart (oʻzgartirish tavsiya)'}</i>`;
  return show(ctx, text, { inline_keyboard: [[{ text: c.on ? '⏸ AI oʻchirish' : '🟢 AI yoqish', callback_data: 'igt:0' }, { text: '✍️ Biznes haqida', callback_data: 'iga:0' }], [{ text: '🧪 Sinab koʻrish', callback_data: 'igx:0' }, { text: '👥 Lidlar', callback_data: 'igl:0' }], [{ text: c.notify === 'report' ? '🔔 Muhim lidlarni ham yuborish' : '🔕 Faqat hisobot', callback_data: 'ign:0' }, { text: '📊 Hisobot hozir', callback_data: 'igr:0' }]] });
}
async function showLeads(ctx, u) {
  const st = store(), leads = (await recentLeads(st, 20)).filter((l) => !l.spam);
  if (!leads.length) return show(ctx, '👥 Hozircha lid yoʻq.', { inline_keyboard: [[{ text: '⬅️', callback_data: 'igs:0' }]] });
  const rows = leads.slice(0, 12).map((l) => [{ text: `${l.hot ? '🔥' : '💬'} ${(l.name || (l.username ? '@' + l.username : 'ID ' + l.id.slice(-5)))} · ${(INTENT[l.intent] || INTENT['']).replace(/^\S+ /, '')}${l.phone ? ' 📞' : ''}`.slice(0, 60), callback_data: `igj:${l.id}` }]);
  rows.push([{ text: '⬅️', callback_data: 'igs:0' }]);
  return show(ctx, `👥 <b>Oxirgi lidlar</b> (${leads.length})`, { inline_keyboard: rows });
}
async function onMessage(chat, u, cmd, args, text) {
  if (!isOwner(u)) return false;
  if (cmd === '/ig' || cmd === '/instagram') { await showMain({ chat }, u); return true; }
  if (cmd === '/igtest') { u.state = { kind: 'igtest' }; await send(chat, '🧪 Sinov rejimi. Mijoz kabi yozing, AI qanday javob berishini koʻrasiz. Chiqish: /bekor'); if (args) return runTest(chat, u, args); return true; }
  if (!cmd && u.state && u.state.kind === 'igtest') { if (!text) return true; return runTest(chat, u, text); }
  if (!cmd && u.state && u.state.kind === 'igabout') {
    if (!text) return true;
    const st = store(), c = await cfg(st); c.about = text.slice(0, 1800); delete c.ai; await saveCfg(st, c); u.state = null;
    await send(chat, '✅ Biznes haqida matn saqlandi. AI endi shu maʼlumot asosida javob beradi.', { inline_keyboard: [[{ text: '🧪 Sinab koʻrish', callback_data: 'igx:0' }]] });
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'igreply') {
    if (!text) return true;
    const st = store(), l = await getLead(st, u.state.id); u.state = null;
    if (!l) { await send(chat, 'Lid topilmadi.'); return true; }
    const r = await igSend(l.id, text);
    if (r.ok) { l.msgs.push({ r: 'o', t: text.slice(0, 600), ts: Date.now() }); l.muted = Date.now() + 12 * 3600000; l.handoff = false; await saveLead(st, l); await send(chat, '✅ Instagramga yuborildi. AI 12 soat aralashmaydi.', leadKb(l)); }
    else await send(chat, `❌ Yuborilmadi: ${esc(r.error)}\n\n<i>Instagram faqat mijoz yozgandan keyin 24 soat ichida javob berishga ruxsat beradi.</i>`);
    return true;
  }
  return false;
}
async function runTest(chat, u, text) {
  const st = store(), c = await cfg(st);
  c.ai = (await st.get('ig/ai', { type: 'json' })) || null;
  tg('sendChatAction', { chat_id: chat, action: 'typing' });
  const cc = { ...c, on: true };
  const r = await handleIncoming(st, cc, `test${u.id}`, text, { test: true });
  const tags = [INTENT[r.lead.intent] || INTENT[''], r.lead.phone ? `📞 ${esc(r.lead.phone)}` : '', r.lead.hot ? '🔥' : '', r.lead.handoff ? '🙋 operator' : ''].filter(Boolean).join(' · ');
  await send(chat, `${r.reply ? `🤖 ${esc(r.reply)}` : '⚠️ AI javob bera olmadi (limit yoki xato)'}\n\n<i>${tags}</i>`);
  return true;
}
async function onCallback(ctx, u, act, a) {
  if (!isOwner(u)) return '🔒';
  const st = store();
  if (act === 'igs') await showMain(ctx, u);
  else if (act === 'igt') { const c = await cfg(st); c.on = !c.on; await saveCfg(st, c); await showMain(ctx, u); return c.on ? '🟢' : '⏸'; }
  else if (act === 'ign') { const c = await cfg(st); c.notify = c.notify === 'report' ? 'hot' : 'report'; await saveCfg(st, c); await showMain(ctx, u); return c.notify === 'report' ? '🔕' : '🔔'; }
  else if (act === 'iga') { u.state = { kind: 'igabout' }; await send(ctx.chat, '✍️ <b>Biznesingiz haqida</b> yozing: xizmatlar, narxlar (agar aytsa boʻladigan boʻlsa), muddatlar, ish vaqti, qanday gaplashish kerak.\n\nAI faqat shu maʼlumotdan foydalanadi, oʻzidan narx oʻylab topmaydi.\n\nHozirgi matn:\n' + esc((await cfg(st)).about || DEFAULT_ABOUT), { inline_keyboard: [[{ text: '❌ Bekor', callback_data: 'pno' }]] }); }
  else if (act === 'igx') { u.state = { kind: 'igtest' }; await send(ctx.chat, '🧪 Sinov rejimi. Mijoz kabi yozing (masalan: <i>Assalomu alaykum, sayt kerak edi</i>). Chiqish: /bekor'); }
  else if (act === 'igl') await showLeads(ctx, u);
  else if (act === 'igr') { const s = await dayStats(st, S.todayISO(u.tz), u.tz); await send(ctx.chat, reportText(s, S.todayISO(u.tz))); }
  else if (act === 'igj') { const l = await getLead(st, a); if (l) await show(ctx, leadCard(l), leadKb(l)); }
  else if (act === 'igo') { const l = await getLead(st, a); if (l) { u.state = { kind: 'igreply', id: l.id }; await send(ctx.chat, `✍️ <b>${leadName(l)}</b> ga javobingizni yozing (Instagramga yuboriladi):`, { inline_keyboard: [[{ text: '❌ Bekor', callback_data: 'pno' }]] }); } }
  else if (act === 'igm') { const l = await getLead(st, a); if (l) { l.muted = l.muted && l.muted > Date.now() ? 0 : Date.now() + 7 * 86400000; await saveLead(st, l); await show(ctx, leadCard(l), leadKb(l)); return l.muted ? '🔇' : '🤖'; } }
  return '';
}

/* ---------- kunlik hisobot (cron) ---------- */
async function remind(u, now) {
  if (!S.isAdmin(u.id) || !u.chat) return { dirty: false, sent: 0 };
  const st = store(), c = await cfg(st);
  if (String(c.owner) !== String(u.id)) return { dirty: false, sent: 0 };
  const loc = S.localNow(u.tz, now), hhmm = S.hhmmOfLocal(loc), today = S.isoOfLocal(loc);
  if (c.lastReport === today) return { dirty: false, sent: 0 };
  const since = S.toMin(hhmm) - S.toMin(c.hour);
  if (since < 0 || since > 120) return { dirty: false, sent: 0 };
  if (!(await st.get('ig/idx', { type: 'json' }))) return { dirty: false, sent: 0 };
  c.lastReport = today; await saveCfg(st, c);
  const s = await dayStats(st, today, u.tz);
  if (!s.day.length) return { dirty: false, sent: 0 };
  const r = await send(u.chat, reportText(s, today), { inline_keyboard: [[{ text: '👥 Lidlar', callback_data: 'igl:0' }]] });
  return { dirty: false, sent: r.ok ? 1 : 0 };
}

module.exports = { handler: exports.handler, onMessage, onCallback, remind, handleIncoming, classify, recentLeads, ACTS: ['igs', 'igt', 'iga', 'igx', 'igl', 'igr', 'igj', 'igo', 'igm', 'ign'] };
