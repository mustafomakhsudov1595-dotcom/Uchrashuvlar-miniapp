'use strict';
// Xato haqida adminga ogohlantirish: bir xil xato 30 daqiqada bir marta, soatiga ko'pi bilan 6 ta.
const S = require('./_shared');

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

async function notify(where, err) {
  try {
    const st = S.openStore({});
    const msg = String((err && err.message) || err || '?').slice(0, 300), now = Date.now();
    const key = `alert/${hash(where + msg)}`, hourKey = `alert/h${Math.floor(now / 3600000)}`;
    const last = Number(await st.get(key)) || 0, cnt = Number(await st.get(hourKey)) || 0;
    if (now - last < 30 * 60000 || cnt >= 6) return;
    await st.set(key, now); await st.set(hourKey, cnt + 1);
    const text = `🚨 <b>Xato</b> · ${S.esc(where)}\n<code>${S.esc(msg)}</code>\n\n<i>${new Date(now + 5 * 3600000).toISOString().slice(0, 16).replace('T', ' ')} (UZ)</i>`;
    for (const id of S.adminIds()) await S.tg('sendMessage', { chat_id: id, text, parse_mode: 'HTML' });
  } catch (e) { console.error('alert', e.message); }
}
module.exports = { notify };
