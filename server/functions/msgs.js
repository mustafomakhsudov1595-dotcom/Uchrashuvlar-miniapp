'use strict';
// Mijozga yuboriladigan tayyor xabarlar (qarz eslatmasi, ish tayyor, servisni uzaytirish ...). Til mijoz tiliga qarab tanlanadi.
const S = require('./_shared');
const { tg, esc } = S;

const UNIT = { uz: 'soʻm', ru: 'сум', en: 'UZS' };
const T = {
  uz: {
    hi: (c) => `Assalomu alaykum${c ? `, ${c}` : ''}!`,
    pay: (n, a, u) => `«${n}» loyihasi boʻyicha qolgan toʻlov — ${a} ${u}. Qulay vaqtda toʻlab bersangiz, rahmat.`,
    done: (n, url) => `«${n}» tayyor ✅${url ? `\nKoʻrish: ${url}` : ''}\nIltimos, koʻrib chiqing va fikringizni yozing. Rahmat!`,
    delay: (n, d) => `«${n}» loyihasining topshirish muddati ${d} ga koʻchdi. Noqulaylik uchun uzr, ish davom etmoqda. Savollaringiz boʻlsa, yozing.`,
    renew: (n, d) => `«${n}» saytingizning 1 yillik bepul servisi ${d} da tugaydi. Davom ettirish uchun oylik xizmat taklif qilaman: sayt kuzatuvi, kichik oʻzgartirishlar, zaxira nusxa va yangilanishlar. Shartlarni kelishib olamiz — qulay vaqtingizda yozing.`,
    upd: (n, what, url) => `«${n}» saytida soʻrovingiz bajarildi${what ? `: ${what}` : ''}.${url ? `\nTekshirib koʻring: ${url}` : ''}\nBoshqa oʻzgartirish kerak boʻlsa, yozing.`,
    pay2: 'Toʻlov uchun:',
  },
  ru: {
    hi: (c) => `Здравствуйте${c ? `, ${c}` : ''}!`,
    pay: (n, a, u) => `Остаток оплаты по проекту «${n}» — ${a} ${u}. Буду благодарен, если оплатите в удобное время.`,
    done: (n, url) => `«${n}» готов ✅${url ? `\nПосмотреть: ${url}` : ''}\nПожалуйста, посмотрите и напишите, что думаете. Спасибо!`,
    delay: (n, d) => `Срок сдачи проекта «${n}» сдвинулся на ${d}. Приношу извинения за неудобства, работа продолжается. Если есть вопросы — пишите.`,
    renew: (n, d) => `Годовой бесплатный сервис вашего сайта «${n}» заканчивается ${d}. Предлагаю продолжить на ежемесячной основе: мониторинг сайта, мелкие правки, резервные копии и обновления. Условия обсудим — напишите, когда удобно.`,
    upd: (n, what, url) => `На сайте «${n}» ваш запрос выполнен${what ? `: ${what}` : ''}.${url ? `\nПроверьте, пожалуйста: ${url}` : ''}\nЕсли нужны другие правки — пишите.`,
    pay2: 'Для оплаты:',
  },
  en: {
    hi: (c) => `Hello${c ? `, ${c}` : ''}!`,
    pay: (n, a, u) => `The remaining payment for “${n}” is ${a} ${u}. I would appreciate it if you could settle it at your convenience.`,
    done: (n, url) => `“${n}” is ready ✅${url ? `\nView it: ${url}` : ''}\nPlease take a look and share your feedback. Thank you!`,
    delay: (n, d) => `The delivery date for “${n}” has moved to ${d}. Apologies for the inconvenience — work is ongoing. Let me know if you have any questions.`,
    renew: (n, d) => `The 1-year free service for your site “${n}” ends on ${d}. I can continue on a monthly plan: site monitoring, small changes, backups and updates. Let’s agree on the terms — message me when convenient.`,
    upd: (n, what, url) => `Your request on “${n}” is done${what ? `: ${what}` : ''}.${url ? `\nPlease check: ${url}` : ''}\nLet me know if you need any other changes.`,
    pay2: 'To pay:',
  },
};
const fmtDate = (iso) => `${iso.slice(8)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
const lastChange = (x) => { const c = (x.changes || [])[x.changes.length - 1]; return c ? c.text : ''; };
const phoneLink = (phone) => (S.digitsOf(phone).length >= 9 ? `https://t.me/+${S.digitsOf(phone)}` : '');

// { text, phone } yoki null
function build(u, kind, id, lang) {
  const L = T[lang] ? lang : 'uz', X = T[L], today = S.todayISO(u.tz);
  const p = u.projects.find((x) => x.id === id), sv = u.services.find((x) => x.id === id);
  let body = '', client = '', phone = '';
  if (p) {
    client = p.client; phone = p.contact;
    if (kind === 'pay') { const o = S.owed(p); if (o <= 0) return { empty: true }; body = X.pay(p.name, S.money(o), UNIT[L]); if (u.payInfo) body += `\n\n${X.pay2} ${u.payInfo}`; }
    else if (kind === 'done') body = X.done(p.name, p.url);
    else if (kind === 'delay') body = X.delay(p.name, fmtDate(p.date));
    else return null;
  } else if (sv) {
    client = sv.client; phone = sv.phone;
    if (kind === 'renew') body = X.renew(sv.name, fmtDate(S.serviceEnd(sv)));
    else if (kind === 'upd') body = X.upd(sv.name, lastChange(sv), sv.url);
    else return null;
  } else return null;
  void today;
  return { text: `${X.hi(client)} ${body}`, phone: phoneLink(phone), lang: L };
}
const kindsFor = (u, id) => (u.projects.some((x) => x.id === id) ? ['pay', 'done', 'delay'] : u.services.some((x) => x.id === id) ? ['renew', 'upd'] : []);
const nameOf = (u, id) => (u.projects.find((x) => x.id === id) || u.services.find((x) => x.id === id) || {}).name || '';

/* ---------- bot ---------- */
const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text, parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true }) : send(ctx.chat, text, markup));

async function showMenu(ctx, u, id) {
  const P = S.Tof(u).p, ks = kindsFor(u, id);
  const rows = ks.map((k) => [{ text: P.msgKinds[k], callback_data: `mt:${k}:${id}:${u.lang || 'uz'}` }]);
  rows.push([{ text: P.back, callback_data: u.projects.some((x) => x.id === id) ? `pj:${id}` : `vj:${id}` }]);
  return show(ctx, P.msgTitle(esc(nameOf(u, id))), { inline_keyboard: rows });
}
async function showText(ctx, u, kind, id, lang) {
  const P = S.Tof(u).p, r = build(u, kind, id, lang);
  if (!r) return show(ctx, P.aiNone);
  if (r.empty) return show(ctx, P.msgNoOwed, { inline_keyboard: [[{ text: P.back, callback_data: `mg:${id}` }]] });
  const rows = [['uz', 'ru', 'en'].map((l) => ({ text: `${l === r.lang ? '✔️ ' : ''}${{ uz: '🇺🇿', ru: '🇷🇺', en: '🇬🇧' }[l]}`, callback_data: `mt:${kind}:${id}:${l}` }))];
  rows.push([{ text: P.msgSend, url: `https://t.me/share/url?url=%20&text=${encodeURIComponent(r.text)}` }]);
  if (r.phone) rows.push([{ text: P.msgWrite, url: r.phone }]);
  rows.push([{ text: P.back, callback_data: `mg:${id}` }]);
  return show(ctx, `${P.msgCopy}\n\n<pre>${esc(r.text)}</pre>`, { inline_keyboard: rows });
}
async function onMessage(chat, u, cmd, args) {
  if (cmd !== '/rekvizit') return false;
  const P = S.Tof(u).p;
  if (args === 'off') { u.payInfo = ''; await send(chat, P.rekvOff); return true; }
  if (args) { u.payInfo = args.slice(0, 200); await send(chat, P.rekvSaved); return true; }
  await send(chat, u.payInfo ? P.rekvNow(esc(u.payInfo)) : P.rekvAsk); return true;
}
async function onCallback(ctx, u, act, a, b, c) {
  if (act === 'mg') await showMenu(ctx, u, a);
  else if (act === 'mt') await showText(ctx, u, a, b, c || u.lang);
  return '';
}

module.exports = { build, onMessage, onCallback, kindsFor, ACTS: ['mg', 'mt'] };
