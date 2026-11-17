'use strict';
// Telegram Business (Chat Automation / Secretary mode): akkauntingizga yozgan odamlarga AI sizning nomingizdan javob beradi.
// BotFather → Bot Settings → Business Mode yoqilgan boʻlishi kerak. Lidlar Instagram bilan bir xil bazada (ig.js) saqlanadi.
const S = require('./_shared');
const { tg } = S;

const store = () => S.openStore({});
const send = (chat, text) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true });

async function onConnection(st, bc) {
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

async function onMessage(st, m) {
  const conn = m.business_connection_id ? await st.get(`bc/${m.business_connection_id}`, { type: 'json' }) : null;
  if (!conn || !conn.on || !m.chat || m.chat.type !== 'private' || !m.from) return;
  const ig = require('./ig'), leadId = `tg${m.chat.id}`;
  if (String(m.from.id) === conn.user) { // akkaunt egasi oʻzi yozdi: AI 12 soat aralashmaydi
    const l = await ig.getLead(st, leadId);
    if (l && (m.text || m.caption)) { l.msgs.push({ r: 'o', t: String(m.text || m.caption).slice(0, 600), ts: Date.now() }); l.muted = Date.now() + 12 * 3600000; l.handoff = false; await ig.saveLead(st, l); }
    return;
  }
  if (m.from.is_bot) return;
  const text = String(m.text || m.caption || '').trim() || ((m.photo || m.voice || m.video_note || m.audio || m.document || m.video) ? '[rasm/ovoz]' : '');
  if (!text) return;
  const c = await ig.cfg(st);
  c.ai = (await st.get('ig/ai', { type: 'json' })) || null;
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
