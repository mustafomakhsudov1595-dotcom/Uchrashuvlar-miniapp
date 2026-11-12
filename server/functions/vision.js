'use strict';
// Rasm yuborilsa AI tahlil qilib javob beradi (chek, skrinshot, sayt dizayni, hujjat ...)
const S = require('./_shared');
const voice = require('./voice');
const { tg } = S;

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const mimeOf = (path, fallback) => MIME[(String(path).split('.').pop() || '').toLowerCase()] || (MIME[String(fallback || '').split('/')[1]] ? fallback : '');

// m: Telegram xabari. true — qayta ishlandi (javob yuborildi).
async function onPhoto(st, chat, u, m) {
  const P = S.Tof(u).p;
  // Albom (bir nechta rasm): faqat birinchisini tahlil qilamiz, qolganlarini jim oʻtkazamiz
  if (m.media_group_id) {
    const k = `mgrp/${m.media_group_id}`;
    if (await st.get(k)) return true;
    await st.set(k, '1');
  }
  // Eng katta oʻlchamdan boshlab, 3,5 MB dan oshmaydiganini tanlaymiz (juda katta boʻlsa kichigini olamiz)
  const sizes = Array.isArray(m.photo) ? [...m.photo].reverse() : [];
  const photo = sizes.find((x) => !x.file_size || x.file_size <= 3.5e6) || null;
  const fileId = photo ? photo.file_id : !sizes.length && m.document && m.document.file_id;
  if (sizes.length && !photo) { await tg('sendMessage', { chat_id: chat, text: P.photoBig }); return true; }
  if (!fileId) return false;
  tg('sendChatAction', { chat_id: chat, action: 'typing' });
  const f = await S.tgFile(fileId, 5e6);
  if (f.error === 'big') { await tg('sendMessage', { chat_id: chat, text: P.photoBig }); return true; }
  if (f.error) { await tg('sendMessage', { chat_id: chat, text: P.photoFail }); return true; }
  const mime = photo ? 'image/jpeg' : mimeOf(f.path, m.document && m.document.mime_type);
  if (!mime) { await tg('sendMessage', { chat_id: chat, text: P.photoType }); return true; }
  const caption = String(m.caption || '').trim().slice(0, 800);
  const prompt = caption || P.photoDefault;
  await require('./chat').answer(chat, u, prompt, { image: `data:${mime};base64,${voice.b64(f.bytes)}` });
  return true;
}
const isImageDoc = (d) => Boolean(d && /^image\//i.test(d.mime_type || ''));
module.exports = { onPhoto, isImageDoc };
