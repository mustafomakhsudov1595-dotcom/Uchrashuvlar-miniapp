'use strict';
// Har daqiqada ishlaydi: uchrashuvga {lead} daqiqa qolganda eslatma yuboradi.
const S = require('./_shared');

exports.handler = async (event) => {
  const st = S.openStore(event);
  const now = Date.now();
  let sent = 0;
  const { blobs } = await st.list({ prefix: 'user/' });
  for (const { key } of blobs) {
    const u = await st.get(key, { type: 'json' });
    if (!u || !u.remind || !u.chat) continue;
    let dirty = false;
    for (const m of u.meetings) {
      const diff = (S.startUTC(m, u.tz) - now) / 60000;
      if (diff <= 0 || diff > u.lead || m.r === u.lead) continue;
      const text = `⏰ <b>Uchrashuv ${diff < 2 ? 'hozir boshlanadi' : S.countdown(S.startUTC(m, u.tz), now)}!</b>\n\n${S.meetingText(m, u, now)}`;
      const rows = m.checklist.slice(0, 12).map((it, i) => [{ text: `${it.done ? '✅' : '⬜️'} ${it.text}`.slice(0, 60), callback_data: `ck:${m.id}:${i}` }]);
      rows.push([S.appBtn('📱 Ilovada ochish', `?edit=${m.id}`)]);
      const r = await S.tg('sendMessage', { chat_id: u.chat, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: rows }, disable_web_page_preview: true });
      m.r = u.lead; dirty = true; if (r.ok) sent += 1;
    }
    if (dirty) await S.saveUser(st, u);
  }
  console.log('remind sent', sent);
  return { statusCode: 200, body: String(sent) };
};
