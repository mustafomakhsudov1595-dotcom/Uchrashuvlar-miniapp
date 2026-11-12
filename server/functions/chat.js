'use strict';
// Suhbatdosh AI: buyruq boʻlmagan har qanday matnga javob beradi, maʼlumotlaringizni koʻrib turadi
const S = require('./_shared');
const { tg, esc } = S;

const SYSTEM = `You are the built-in assistant of "Impro Notes", a Telegram bot and mini app used by a small team in Uzbekistan that builds websites, Telegram bots and Instagram videos for clients. The app tracks meetings, projects, clients, payments, expenses, monthly payments and the service (1-year support) of finished sites.
You can see a snapshot of the user's data below. Answer questions about their data precisely and only from that data; if the data does not contain the answer, say so plainly. You can also help write client messages, Instagram captions and scripts, plan the day or week, and give practical advice.
You CANNOT change any data yourself. When the user wants to add or change something, tell them the exact command or button: /yangi (a meeting; or just write "ertaga 15:00 Anvar bilan"), /loyiha, /xarajat 150000 reklama, /obuna, /servis, /qarz, /daromad, /maqsad, /mijozlar, /saytlar, /zaxira, /tahlil.
Keep answers short (up to about 8 lines), warm and concrete. Reply in the language the user writes in (Uzbek in Latin script, Russian or English); default to Uzbek. Never use markdown symbols.`;

const HIST_MAX = 8, HIST_TTL = 8 * 3600000;

/* ---------- savol yoki oddiy matnmi? ---------- */
const STRONG = /(^|[^\p{L}])(nima|nimani|nimalar|nega|qancha|necha|qachon|kim|kimga|kimda|qayer|qayerda|qaysi|qanday|menga|ayt|aytib|yozib|yoz|tushuntir|maslahat|hisobla|ko[ʻ'’‘`]rsat|что|сколько|когда|как|кто|где|какой|почему|покажи|напиши|помоги|how|what|when|who|where|why|which|show|write|help|explain)(?=[^\p{L}]|$)/iu;
const HELLO = /^\s*(salom|assalomu\s+alaykum|assalom|hayrli|rahmat|raxmat|ok|okey|привет|здравствуйте|спасибо|hello|hi|hey|thanks|thank you)(?=[^\p{L}]|$)/iu;
// Aniq soat bor boʻlsa (15:00) — bu uchrashuv; savol belgisi yoki soʻroq soʻzi boʻlsa — AI
function looksLikeQuestion(text) {
  if (/\?\s*$/.test(text)) return true;
  if (HELLO.test(text)) return true;
  if (/\d{1,2}[:.]\d{2}/.test(text)) return false;
  return STRONG.test(text);
}

/* ---------- kontekst ---------- */
function context(u, now = Date.now()) {
  const today = S.todayISO(u.tz, now), hhmm = S.hhmmOfLocal(S.localNow(u.tz, now));
  const L = [`Now: ${today} ${hhmm} (weekday ${S.weekdayIdx(today) + 1} of 7, Monday=1)`];
  const up = S.upcoming(u).slice(0, 6);
  L.push(up.length ? `Upcoming meetings: ${up.map((m) => `${m.name} — ${m.date} ${m.time}${m.location ? `, ${m.location}` : ''}`).join('; ')}` : 'Upcoming meetings: none');
  const snap = require('./insight').snapshot(u, now);
  if (snap) L.push(snap);
  const act = S.activeProjects(u);
  if (act.length) L.push(`Project details: ${act.slice(0, 10).map((p) => `${p.name}${p.client ? ` (${p.client})` : ''}, type ${p.type}, status ${p.status}, deadline ${p.date}${S.owed(p) ? `, owed ${S.money(S.owed(p))}` : ''}`).join(' | ')}`);
  const open = [];
  for (const p of act) for (const t of p.tasks) if (!t.done && t.due && t.due <= S.addDaysISO(today, 2)) open.push(`${p.name}: ${t.text} (${t.due})`);
  if (open.length) L.push(`Tasks due soon: ${open.slice(0, 10).join('; ')}`);
  if (u.services.length) L.push(`Services: ${u.services.slice(0, 12).map((x) => `${x.name}${x.client ? ` (${x.client})` : ''}, ${S.serviceDays(x, today)} days left, ${x.requests.filter((r) => !r.done).length} open requests`).join(' | ')}`);
  if (u.subs.length) L.push(`Monthly payments: ${u.subs.filter((x) => x.active).slice(0, 10).map((x) => `${x.client || x.name} ${S.money(x.amount)} on day ${x.day}`).join('; ')}`);
  return L.join('\n').slice(0, 5000);
}

/* ---------- javob ---------- */
async function answer(chat, u, text) {
  const P = S.Tof(u).p, now = Date.now();
  tg('sendChatAction', { chat_id: chat, action: 'typing' });
  let hist = Array.isArray(u.chatH) ? u.chatH : [];
  if (hist.length && now - (hist[hist.length - 1].at || 0) > HIST_TTL) hist = [];
  const ext = require('./ext');
  const r = await ext.aiCall(u, `${SYSTEM}\n\nUSER DATA SNAPSHOT:\n${context(u, now)}`, text.slice(0, 1500), { history: hist.map((h) => ({ role: h.r === 'u' ? 'user' : 'assistant', content: h.t })), auto: true });
  if (!r.text) { await send(chat, r.error === 'limit' ? P.aiLimit : P.aiFail); return true; }
  u.chatH = [...hist, { r: 'u', t: text.slice(0, 600), at: now }, { r: 'a', t: r.text.slice(0, 900), at: now }].slice(-HIST_MAX);
  await send(chat, esc(r.text), { inline_keyboard: [[{ text: P.bChatNew, callback_data: 'ch:new' }]] });
  return true;
}
const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });

async function onCallback(ctx, u, act, a) {
  const P = S.Tof(u).p;
  if (act === 'ch' && a === 'new') { u.chatH = []; await send(ctx.chat, P.chatCleared); }
  return '';
}
async function onMessage(chat, u, cmd) {
  if (cmd !== '/tozala' && cmd !== '/reset') return false;
  u.chatH = []; await send(chat, S.Tof(u).p.chatCleared); return true;
}

module.exports = { looksLikeQuestion, answer, context, onCallback, onMessage, ACTS: ['ch'] };
