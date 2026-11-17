'use strict';
// Bot salomatligi: ish urishi (heartbeat), webhook nazorati va avto-tuzatish, /holat buyrugʻi.
const S = require('./_shared');
const { tg, esc } = S;

const SITE = () => String(process.env.SITE_URL || '').replace(/\/$/, '');

async function webhookInfo() {
  const r = await tg('getWebhookInfo', {});
  return r && r.ok ? r.result : null;
}
async function repairWebhook() {
  const body = { url: `${SITE()}/api/tg`, allowed_updates: ['message', 'callback_query'], max_connections: 20 };
  if (process.env.WEBHOOK_SECRET) body.secret_token = process.env.WEBHOOK_SECRET;
  return tg('setWebhook', body);
}

// Cron har daqiqada chaqiradi; ogʻir ishlar kamdan-kam.
async function tick(now = Date.now()) {
  const st = S.openStore({});
  const min = Math.floor(now / 60000);
  const alert = require('./alert');
  try {
    if (min % 5 === 0) await st.set('health/cron', now);
    if (min % 30 === 7) {
      const w = await webhookInfo();
      if (w) {
        const want = `${SITE()}/api/tg`;
        if (!w.url || w.url !== want) {
          const r = await repairWebhook();
          await alert.notify('webhook', new Error(`Webhook manzili noto'g'ri edi (${w.url || 'yo\'q'}). Avtomatik tiklandi: ${r && r.ok ? 'ok' : 'XATO'}`));
        } else if (w.last_error_date && now / 1000 - w.last_error_date < 35 * 60) {
          await alert.notify('webhook', new Error(`Telegram yetkazib berishda xato: ${w.last_error_message}`));
        }
        if (w.pending_update_count > 25) await alert.notify('webhook', new Error(`Navbatda ${w.pending_update_count} ta xabar to'planib qoldi`));
        await st.set('health/webhook', JSON.stringify({ at: now, pending: w.pending_update_count || 0, err: w.last_error_message || '' }));
      }
    }
  } catch (e) { console.error('health', e.message); }
}

const ago = (t, now) => (t ? `${Math.max(0, Math.round((now - t) / 60000))} daq oldin` : 'yoʻq');
async function onMessage(chat, u, cmd) {
  if (cmd !== '/holat' && cmd !== '/status') return false;
  if (!S.isAdmin(u.id)) return false;
  const st = S.openStore({}), now = Date.now();
  const cron = Number(await st.get('health/cron')) || 0;
  const w = await webhookInfo().catch(() => null);
  const hw = await st.get('health/webhook', { type: 'json' }).catch(() => null);
  const cronOk = cron && now - cron < 12 * 60000, whOk = w && w.url === `${SITE()}/api/tg` && !(w.last_error_date && now / 1000 - w.last_error_date < 3600);
  const lines = [
    '🩺 <b>Bot holati</b>',
    '',
    `${cronOk ? '🟢' : '🔴'} Avto-vazifalar (cron): ${ago(cron, now)}`,
    `${whOk ? '🟢' : '🔴'} Telegram ulanishi: ${w ? (w.url === `${SITE()}/api/tg` ? 'toʻgʻri' : 'MANZIL NOTOʻGʻRI') : 'tekshirib boʻlmadi'}`,
    `📬 Navbatdagi xabarlar: ${w ? w.pending_update_count || 0 : '?'}`,
  ];
  if (w && w.last_error_message) lines.push(`⚠️ Oxirgi Telegram xatosi: ${esc(w.last_error_message)} (${ago((w.last_error_date || 0) * 1000, now)})`);
  lines.push(`🤖 AI: ${u.ai && u.ai.d === S.todayISO(u.tz) ? `bugun ${u.ai.n}/80` : 'bugun 0/80'}`);
  lines.push('', '<i>Xato boʻlsa, sizga avtomatik 🚨 xabar keladi.</i>');
  await tg('sendMessage', { chat_id: chat, text: lines.join('\n'), parse_mode: 'HTML', reply_markup: !whOk ? { inline_keyboard: [[{ text: '🔧 Ulanishni tiklash', callback_data: 'hfx:0' }]] } : undefined });
  return true;
}
async function onCallback(ctx, u, act) {
  if (act === 'hfx' && S.isAdmin(u.id)) { const r = await repairWebhook(); await tg('sendMessage', { chat_id: ctx.chat, text: r && r.ok ? '✅ Telegram ulanishi tiklandi.' : '❌ Tiklab boʻlmadi.' }); return '🔧'; }
  return '';
}
module.exports = { tick, onMessage, onCallback, ACTS: ['hfx'] };
