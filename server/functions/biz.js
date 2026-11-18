'use strict';
// Telegram Business (Chat Automation / Secretary mode): akkauntingizga yozgan odamlarga AI sizning nomingizdan javob beradi.
// BotFather → Bot Settings → Business Mode yoqilgan boʻlishi kerak. Lidlar Instagram bilan bir xil bazada (ig.js) saqlanadi.
const S = require('./_shared');
const { tg } = S;

const store = () => S.openStore({});
const send = (chat, text) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true });

async function onConnection(st, bc) {
  // Faqat adminlar va hisobga kirgan jamoa aʼzolari botni oʻz akkauntiga ulay oladi (aks holda boshqa odamlar ham ulab oladi)
  const uid = String(bc.user && bc.user.id), raw = await st.get(`user/${uid}`, { type: 'json' }).catch(() => null);
  if (!S.isAdmin(uid) && !(raw && raw.ws)) {
    await st.setJSON(`bc/${bc.id}`, { id: String(bc.id), user: uid, name: (bc.user && bc.user.first_name) || '', chat: String(bc.user_chat_id || uid), can: false, on: false, at: Date.now(), denied: true });
    await send(String(bc.user_chat_id || uid), '🔒 Bu bot faqat jamoa aʼzolari uchun. Avval <code>/kirish</code> orqali hisobga kiring, keyin qayta ulang.');
    return;
  }
  const id = String(bc.id), rights = bc.rights || {}, can = bc.can_reply !== undefined ? Boolean(bc.can_reply) : Boolean(rights.can_reply);
  const rec = { id, user: String(bc.user && bc.user.id), name: (bc.user && (bc.user.first_name || bc.user.username)) || '', chat: String(bc.user_chat_id || (bc.user && bc.user.id)), can, on: bc.is_enabled !== false, at: Date.now() };
  await st.setJSON(`bc/${id}`, rec);
  const idx = (await st.get('bc/idx', { type: 'json' })) || [];
  if (!idx.includes(id)) { idx.push(id); await st.setJSON('bc/idx', idx.slice(-20)); }
  await send(rec.chat, !rec.on
    ? '⚠️ <b>Telegram Business</b>: bot akkauntingizdan uzildi.'
    : `✅ <b>Telegram Business ulandi!</b>\n\nEndi akkauntingizga yozgan odamlarga AI sizning nomingizdan javob beradi.${can ? '' : '\n\n⚠️ Javob berish huquqi yoqilmagan: Sozlamalar → Biznes → Chat avtomatlashtirish → botni tanlang → "Xabarlarga javob berish" ni yoqing.'}\n\n<code>/ig</code> — boshqaruv, lidlar va "Biznes haqida" matni.`);
}
async function connections(st) {
  const out = [];
  for (const id of (await st.get('bc/idx', { type: 'json' })) || []) { const r = await st.get(`bc/${id}`, { type: 'json' }); if (r && r.on) out.push(r); }
  return out;
}
const sendAs = (connId, chat, text) => tg('sendMessage', { business_connection_id: connId, chat_id: chat, text: String(text).slice(0, 4000) });

// Ovoz va rasmni matnga aylantiradi: { text } | { fail: true }
async function mediaText(c, m) {
  const ext = require('./ext'), voice = require('./voice');
  const src = m.voice || m.audio || m.video_note;
  if (src) {
    const tr = await voice.transcribe(src, 'uz');
    return tr.text ? { text: `[ovozli xabar] ${tr.text.slice(0, 900)}` } : { fail: true };
  }
  const isImgDoc = m.document && /^image\//i.test(m.document.mime_type || '');
  if (!m.photo && !isImgDoc) return { fail: true };
  const sizes = Array.isArray(m.photo) ? [...m.photo].reverse() : [];
  const ph = sizes.find((x) => !x.file_size || x.file_size <= 3.5e6);
  const fileId = ph ? ph.file_id : isImgDoc ? m.document.file_id : '';
  if (!fileId) return { fail: true };
  const f = await S.tgFile(fileId, 5e6);
  if (f.error) return { fail: true };
  const mime = ph ? 'image/jpeg' : (m.document.mime_type || 'image/jpeg');
  const owner = { tz: 300, lang: 'uz', ai: c.ai };
  const r = await ext.aiCall(owner, 'Describe this picture factually in 1-3 short sentences in Uzbek (Latin). Read any visible text, names, amounts and dates exactly as printed. If it is a receipt, screenshot, document or design, say what it is. Do not guess or invent.', 'Rasmda nima bor?', { auto: true, image: `data:${mime};base64,${voice.b64(f.bytes)}`, limit: 300 });
  c.ai = owner.ai;
  return r.text ? { text: `[rasm: ${r.text.slice(0, 600)}]` } : { fail: true };
}

async function onMessage(st, m) {
  const conn = m.business_connection_id ? await st.get(`bc/${m.business_connection_id}`, { type: 'json' }) : null;
  if (!conn || !conn.on || !m.chat || m.chat.type !== 'private' || !m.from) return;
  const ig = require('./ig'), leadId = `tg${m.chat.id}`;
  if (String(m.from.id) === conn.user) { // akkaunt egasi oʻzi yozdi: AI sozlangan vaqt (standart 1 soat) aralashmaydi
    const c0 = await ig.cfg(st);
    let l = await ig.getLead(st, leadId);
    if (!l && (m.text || m.caption)) { // egasi birinchi yozgan suhbat: mijoz javob bersa AI ham yangi lid deb aralashmasin
      const now = Date.now();
      l = { id: leadId, name: [m.chat.first_name, m.chat.last_name].filter(Boolean).join(' '), username: m.chat.username || '', src: 'tg', conn: conn.id, chatId: String(m.chat.id), first: now, last: now, intent: '', phone: '', hot: false, handoff: false, muted: 0, msgs: [], n: 0, spam: false };
    }
    if (l && (m.text || m.caption)) { l.msgs.push({ r: 'o', t: String(m.text || m.caption).slice(0, 600), ts: Date.now() }); l.muted = c0.muteMin > 0 ? Date.now() + c0.muteMin * 60000 : 0; l.handoff = false; await ig.saveLead(st, l); }
    return;
  }
  if (m.from.is_bot) return;
  const c = await ig.cfg(st);
  c.ai = (await st.get('ig/ai', { type: 'json' })) || null;
  const cap = String(m.text || m.caption || '').trim();
  const hasMedia = Boolean(m.photo || m.voice || m.video_note || m.audio || m.document || m.video);
  let text = cap;
  if (!m.text && hasMedia && c.on && !(m.video || (m.document && !/^image\//i.test(m.document.mime_type || '')))) {
    const md = await mediaText(c, m).catch(() => ({ fail: true }));
    text = md.text ? (cap ? `${md.text} ${cap}` : md.text) : cap || '[rasm/ovoz]';
  } else if (!text && hasMedia) text = '[rasm/ovoz]';
  if (!text) return;
  if (text === '[rasm/ovoz]' && !ig.isVip(c, m.chat.id)) { // ovoz/rasm tushunilmadi: AI'ga yubormay, aniq javob
    const l0 = await ig.getLead(st, leadId);
    if (c.on && conn.can && !(l0 && l0.muted && l0.muted > Date.now())) await sendAs(conn.id, m.chat.id, m.voice || m.audio || m.video_note ? 'Ovozli xabaringizni tushuna olmadim (juda uzun yoki shovqinli boʻlishi mumkin). Iltimos, qisqaroq yuboring yoki matn bilan yozing 🙂' : 'Rahmat! Iltimos, savolingizni matn bilan yozing, yordam beramiz 🙂');
    return;
  }
  if (ig.isVip(c, m.chat.id)) { // muhim odam: AI jim, egasiga darhol xabar
    const now = Date.now();
    let l = await ig.getLead(st, leadId);
    if (!l) l = { id: leadId, name: [m.chat.first_name, m.chat.last_name].filter(Boolean).join(' '), username: m.chat.username || '', src: 'tg', first: now, last: now, intent: '', phone: '', hot: false, handoff: false, muted: 0, msgs: [], n: 0, spam: false };
    l.vip = true; l.last = now; l.n += 1; l.conn = conn.id; l.chatId = String(m.chat.id);
    l.msgs.push({ r: 'u', t: text.slice(0, 600), ts: now });
    const ping = !l.vn || now - l.vn > 10 * 60000;
    if (ping) l.vn = now;
    await ig.saveLead(st, l);
    if (ping) await ig.notifyVip(l, text, conn.chat);
    return;
  }
  const r = await ig.handleIncoming(st, c, leadId, text, { profile: { name: [m.from.first_name, m.from.last_name].filter(Boolean).join(' '), username: m.from.username || '' }, src: 'tg', conn: conn.id, chatId: String(m.chat.id) });
  if (r.reply && conn.can) {
    const sent = await sendAs(conn.id, m.chat.id, r.reply);
    if (!sent.ok) await require('./alert').notify('Telegram Business javob', new Error(sent.description || 'xato'));
  } else if (text === '[rasm/ovoz]' && c.on && !r.muted && conn.can) {
    await sendAs(conn.id, m.chat.id, 'Rahmat! Iltimos, savolingizni matn bilan yozing, yordam beramiz 🙂');
  }
  if (r.isNew || r.becameHot || r.handoff || r.gotPhone) await ig.notifyOwner(c, r, conn.chat);
}
module.exports = { onConnection, onMessage, sendAs, connections };
