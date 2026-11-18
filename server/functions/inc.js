'use strict';
// Kutilayotgan daromad eslatmalari: oylik toʻlov (obuna) kuni va loyiha toʻlov muddati — 7, 3, 1 kun oldin (loyiha uchun muddat kuni ham).
// Bildirishnoma umumiy hisobdagi hamma aʼzoga boradi (cron `__fan` orqali).
const S = require('./_shared');
const { tg, esc } = S;

const tr = (u, o) => o[u.lang] || o.uz;
const WHEN = {
  d7: { uz: '7 kundan keyin', ru: 'Через 7 дней', en: 'In 7 days' }, d3: { uz: '3 kundan keyin', ru: 'Через 3 дня', en: 'In 3 days' }, d1: { uz: 'Ertaga', ru: 'Завтра', en: 'Tomorrow' }, d0: { uz: 'Bugun', ru: 'Сегодня', en: 'Today' },
};
const text = (u, kind, who, amount, over) => {
  const w = kind === 'o' ? tr(u, { uz: `${over} kun kechikdi`, ru: `Просрочено на ${over} дн.`, en: `${over} days overdue` }) : tr(u, WHEN[kind]);
  return tr(u, {
    uz: `${kind === 'o' ? '⚠️' : '💰'} <b>${w}:</b> <b>${who}</b> dan <b>${amount}</b> kirim kutilmoqda.`,
    ru: `${kind === 'o' ? '⚠️' : '💰'} <b>${w}:</b> ожидается приход <b>${amount}</b> от <b>${who}</b>.`,
    en: `${kind === 'o' ? '⚠️' : '💰'} <b>${w}:</b> expecting <b>${amount}</b> from <b>${who}</b>.`,
  });
};
const send = (chat, t, markup) => tg('sendMessage', { chat_id: chat, text: t, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });

// Oylik toʻlovning keyingi kuni: bu oy toʻlanmagan va kun hali kelmagan boʻlsa — shu oy; bu oy toʻlangan boʻlsa — keyingi oy
function nextSubDue(x, today) {
  const ym = today.slice(0, 7);
  const at = (m) => { const [y, mo] = m.split('-').map(Number), last = new Date(Date.UTC(y, mo, 0)).getUTCDate(); return `${m}-${String(Math.min(x.day, last)).padStart(2, '0')}`; };
  if (x.last === ym) return at(S.addMonthsISO(`${ym}-01`, 1).slice(0, 7));
  const c = at(ym);
  return c >= today ? c : null; // muddati oʻtgan — boshqa eslatma (subRem)
}
const clientLinks = async () => (await S.openStore({}).get('ig/clink', { type: 'json' }).catch(() => null)) || {};
async function sendClient(lk, p, kind, over) {
  const amount = S.money(S.owed(p)), nm = String(lk.name || '').split(' ')[0];
  const when = kind === 'd3' ? `3 kundan keyin (${p.pdue})` : kind === 'd1' ? `ertaga (${p.pdue})` : kind === 'd0' ? 'bugun' : `${over} kun oldin edi (${p.pdue})`;
  const t = `Assalomu alaykum${nm ? `, ${nm}` : ''}! ${kind === 'o' ? 'Eslatma: ' : 'Eslatib qoʻyamiz: '}«${p.name}» loyihasi boʻyicha ${amount} soʻm toʻlov muddati ${when}. ${kind === 'o' ? 'Iltimos, imkon qadar tezroq toʻlab yuboring. ' : ''}Savollar boʻlsa yozing. Rahmat! — Impro It`;
  const r = await require('./biz').sendAs(lk.conn, lk.chat, t);
  return { ok: r.ok, error: r.description };
}
const kindOf = (d) => (d === 7 ? 'd7' : d === 3 ? 'd3' : d === 1 ? 'd1' : d === 0 ? 'd0' : '');

async function remind(u, now) {
  const P = S.Tof(u).p, loc = S.localNow(u.tz, now), hhmm = S.hhmmOfLocal(loc), today = S.isoOfLocal(loc);
  let dirty = false, sent = 0;
  if (!u.remind || S.inQuiet(u, hhmm) || hhmm < '09:00') return { dirty, sent };
  const mark = (item, key, keep) => {
    const r = item.r || (item.r = {}), list = r.ik || [];
    if (list.includes(key)) return false;
    r.ik = [...list.filter((k) => k.startsWith(keep)).slice(-4), key];
    dirty = true;
    return true;
  };
  for (const x of u.subs) {
    if (!x.active) continue;
    const due = nextSubDue(x, today);
    if (!due) continue;
    const d = S.daysBetween(today, due), kind = d === 7 || d === 3 || d === 1 ? kindOf(d) : '';
    if (!kind || !mark(x, `${due}:${kind}`, due)) continue;
    const res = await send(u.chat, text(u, kind, esc([x.client, x.name].filter(Boolean).join(' · ') || '—'), S.money(x.amount)), { inline_keyboard: [[{ text: P.bSubPaid, callback_data: `sp:${x.id}` }]] });
    if (res.ok) sent += 1;
  }
  for (const p of u.projects) {
    if (!p.pdue || S.owed(p) <= 0) continue;
    const d = S.daysBetween(today, p.pdue);
    let kind = kindOf(d), over = 0;
    if (!kind && d < 0 && d >= -14) { kind = 'o'; over = -d; }
    if (!kind) continue;
    const key = kind === 'o' ? `${today}:o` : `${p.pdue}:${kind}`;
    if (kind === 'o' && p.r && p.r.ik && p.r.ik.some((k) => k.endsWith(':o') && S.daysBetween(k.slice(0, 10), today) < 2)) continue; // ogʻir eslatma: har 2 kunda
    if (!mark(p, key, kind === 'o' ? '' : p.pdue)) continue;
    const res = await send(u.chat, `${text(u, kind, esc(p.client || p.name), S.money(S.owed(p)), over)}\n\n<i>${esc(p.name)}</i>`, { inline_keyboard: [[{ text: P.bPay, callback_data: `pp:${p.id}` }, { text: P.bPayFull, callback_data: `ppf:${p.id}` }]] });
    if (res.ok) sent += 1;
    const lk = (await clientLinks())[p.id];
    if (lk && kind !== 'd7') { // mijoz Telegram'ga bogʻlangan: unga ham eslatma
      const cs = await sendClient(lk, p, kind, over);
      await send(u.chat, cs.ok ? `📨 Mijozga ham eslatma yuborildi (${esc(lk.name || '—')}).` : `⚠️ Mijozga eslatma yuborilmadi: ${esc(cs.error || 'xato')}`);
    }
  }
  return { dirty, sent };
}
module.exports = { remind, nextSubDue };
