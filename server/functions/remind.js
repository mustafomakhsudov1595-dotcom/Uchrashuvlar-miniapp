'use strict';
// Har daqiqada ishlaydi: eslatma, takroriy eslatma (snooze) va kunlik xulosalarni yuboradi.
const S = require('./_shared');
const { reminderRows } = require('./bot');
const proj = require('./proj');

async function processUser(u, now) {
  const T = S.Tof(u);
  let dirty = false, sent = 0;
  const loc = S.localNow(u.tz, now), hhmm = S.hhmmOfLocal(loc), today = S.isoOfLocal(loc);
  const quiet = S.inQuiet(u, hhmm);

  if (u.remind) {
    for (const m of u.meetings) {
      if (m.status === 'cancelled' || m.status === 'done') continue;
      const start = S.startUTC(m, u.tz), diff = (start - now) / 60000;
      let kind = null;
      if (m.sn) {
        if (diff <= 0) { m.sn = undefined; dirty = true; } else if (now >= m.sn && !quiet) kind = 'snooze';
      } else if (diff > 0 && diff <= u.lead && m.r !== u.lead && !quiet) kind = 'first';
      if (!kind) continue;
      const when = diff < 2 ? T.startsNow : S.countdown(start, now, T, u.tz);
      const head = kind === 'snooze' ? T.snoozeMsg(when) : T.remMsg(when);
      const r = await S.tg('sendMessage', { chat_id: u.chat, text: `${head}\n\n${S.meetingText(m, u, now)}`, parse_mode: 'HTML', reply_markup: { inline_keyboard: reminderRows(m, u) }, disable_web_page_preview: true });
      // Foydalanuvchi botni bloklagan bo'lsa (403/400) qayta-qayta urinmaymiz.
      if (r.ok || r.error_code === 403 || r.error_code === 400) { if (kind === 'snooze') m.sn = undefined; else m.r = u.lead; dirty = true; }
      if (r.ok) sent += 1;
    }
  }

  // Kunlik xulosa: tanlangan vaqtdan keyingi 2 soat ichida bir marta
  for (const [kind, day] of [['m', today], ['e', S.addDaysISO(today, 1)]]) {
    const at = u.digest[kind];
    if (!at || u.dsent[kind] === today) continue;
    const since = S.toMin(hhmm) - S.toMin(at);
    if (since < 0 || since > 120) continue;
    u.dsent[kind] = today; dirty = true;
    const items = u.meetings.filter((m) => m.date === day && m.status !== 'cancelled').sort(S.byStart(u.tz));
    if (!items.length) continue;
    const title = kind === 'm' ? T.digMorningMsg(items.length) : T.digEveningMsg(items.length);
    const rows = items.slice(0, 10).map((m) => [{ text: `${m.cat ? S.CAT_DOT[m.cat] + ' ' : ''}${m.time} · ${m.name}`.slice(0, 60), callback_data: `d:${m.id}` }]);
    const r = await S.tg('sendMessage', { chat_id: u.chat, text: S.listText(title, items, u, now, false), parse_mode: 'HTML', reply_markup: { inline_keyboard: [...rows, [S.appBtn(T.openAppShort)]] }, disable_web_page_preview: true });
    if (r.ok) sent += 1;
  }
  const pr = await proj.remind(u, now);
  return { dirty: dirty || pr.dirty, sent: sent + pr.sent };
}

exports.handler = async (event) => {
  const st = S.openStore(event);
  const now = Date.now();
  let sent = 0;
  const { blobs } = await st.list({ prefix: 'user/' });
  for (const { key } of blobs) {
    try {
      const u = await st.get(key, { type: 'json' });
      if (!u || !u.chat || !u.lang) continue;
      const full = await S.getUser(st, u.id);
      const r = await processUser(full, now);
      sent += r.sent;
      if (r.dirty) await S.saveUser(st, full);
    } catch (e) { console.error('remind', key, e.message); }
  }
  console.log('remind sent', sent);
  return { statusCode: 200, body: String(sent) };
};
