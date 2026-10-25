'use strict';
const S = require('./_shared');
const { tg, esc } = S;

const KB = {
  keyboard: [
    [{ text: '📱 Ilova', web_app: { url: `${process.env.SITE_URL || 'https://impro-it-notes.netlify.app'}/` } }],
    [{ text: '➕ Yangi' }, { text: '📅 Kelgusi' }],
    [{ text: '🗓 Taqvim' }, { text: '📋 Roʻyxat' }],
    [{ text: '⏰ Eslatma' }, { text: 'ℹ️ Yordam' }],
  ],
  resize_keyboard: true, is_persistent: true,
};
const BTN_CMD = { '➕ Yangi': '/yangi', '📅 Kelgusi': '/kelgusi', '🗓 Taqvim': '/taqvim', '📋 Roʻyxat': '/royxat', '⏰ Eslatma': '/eslatma', 'ℹ️ Yordam': '/yordam' };

const HELP = `ℹ️ <b>Uchrashuvlar — yordam</b>

Mini ilovadagi hamma narsani shu yerda ham qilish mumkin:

➕ /yangi — yangi uchrashuv qoʻshish
📅 /kelgusi — yaqin uchrashuvlar
☀️ /bugun — bugungi uchrashuvlar
🌙 /ertaga — ertangi uchrashuvlar
🗓 /taqvim — oylik taqvim
📋 /royxat — barcha kelgusi uchrashuvlar
🗑 /ochirish — uchrashuvni oʻchirish
⏰ /eslatma — eslatma sozlamalari
📱 /ilova — mini ilovani ochish
✖️ /bekor — joriy amalni bekor qilish

Uchrashuvni bossangiz: tafsilot, <b>olib borish/berish roʻyxatini</b> belgilash, tahrirlash va oʻchirish tugmalari chiqadi.

⏰ Har bir uchrashuvdan <b>1 soat oldin</b> eslatma yuboraman (/eslatma orqali vaqtini oʻzgartirish mumkin).`;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text, parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));

/* ---------- ro'yxatlar ---------- */
function listMarkup(items, u, extra = []) {
  const today = S.todayISO(u.tz);
  const rows = items.map((m) => [{ text: `${S.dayLabel(m.date, today)} · ${m.time} · ${m.name}`.slice(0, 60), callback_data: `d:${m.id}` }]);
  return { inline_keyboard: [...rows, ...extra] };
}
function listText(title, items, u, now = Date.now(), heads = true) {
  if (!items.length) return `${title}\n\nUchrashuvlar yoʻq.`;
  const today = S.todayISO(u.tz, now);
  let out = `${title}\n`, last = '';
  for (const m of items) {
    if (heads && m.date !== last) { out += `\n<b>${esc(S.dayLabel(m.date, today))}</b>\n`; last = m.date; } else if (!heads && !last) { out += '\n'; last = 1; }
    out += `▫️ ${m.time} — ${esc(m.name)}${m.location ? ' · 📍 ' + esc(m.location) : ''}\n`;
  }
  return out;
}
const NEW_ROW = [{ text: '➕ Yangi uchrashuv', callback_data: 'new' }];

async function showUpcoming(ctx, u, page = 0) {
  const all = S.upcoming(u), per = 8, pages = Math.max(1, Math.ceil(all.length / per));
  page = Math.min(Math.max(page, 0), pages - 1);
  const items = all.slice(page * per, page * per + per);
  const nav = [];
  if (page > 0) nav.push({ text: '◀️', callback_data: `l:${page - 1}` });
  if (pages > 1) nav.push({ text: `${page + 1}/${pages}`, callback_data: 'noop' });
  if (page < pages - 1) nav.push({ text: '▶️', callback_data: `l:${page + 1}` });
  return show(ctx, listText(`📅 <b>Kelgusi uchrashuvlar</b> (${all.length})`, items, u), listMarkup(items, u, [...(nav.length ? [nav] : []), NEW_ROW, [S.appBtn('📱 Ilovada ochish')]]));
}
async function showDay(ctx, u, iso, back) {
  const items = u.meetings.filter((m) => m.date === iso).sort(S.byStart(u.tz));
  const title = `${iso === S.todayISO(u.tz) ? '☀️' : '🗓'} <b>${esc(S.dayLabel(iso, S.todayISO(u.tz)))}</b>`;
  return show(ctx, listText(title, items, u, Date.now(), false), listMarkup(items, u, [[{ text: '➕ Shu kunga qoʻshish', callback_data: `newd:${iso}` }], ...(back ? [[{ text: '⬅️ Taqvim', callback_data: back }]] : [])]));
}
async function showCalendar(ctx, u, ym) {
  const today = S.todayISO(u.tz);
  const [y, mo] = (ym || today.slice(0, 7)).split('-').map(Number);
  const first = `${y}-${S.pad(mo)}-01`, off = S.weekdayIdx(first), dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const has = new Set(u.meetings.map((m) => m.date));
  let grid = S.WD_SHORT.map((d) => d.padEnd(3)).join('') + '\n', days = [];
  const cells = [...Array(off).fill('   ')];
  for (let d = 1; d <= dim; d += 1) {
    const iso = `${y}-${S.pad(mo)}-${S.pad(d)}`;
    cells.push(`${String(d).padStart(2)}${has.has(iso) ? '•' : iso === today ? '·' : ' '}`);
    if (has.has(iso)) days.push({ text: `${d}`, callback_data: `day:${iso}` });
  }
  for (let i = 0; i < cells.length; i += 7) grid += cells.slice(i, i + 7).join('') + '\n';
  const prev = mo === 1 ? `${y - 1}-12` : `${y}-${S.pad(mo - 1)}`, next = mo === 12 ? `${y + 1}-01` : `${y}-${S.pad(mo + 1)}`;
  const rows = [[{ text: '◀️', callback_data: `cal:${prev}` }, { text: `${S.MONTHS[mo - 1]} ${y}`, callback_data: `cal:${today.slice(0, 7)}` }, { text: '▶️', callback_data: `cal:${next}` }]];
  for (let i = 0; i < days.length; i += 6) rows.push(days.slice(i, i + 6));
  rows.push(NEW_ROW);
  const n = u.meetings.filter((m) => m.date.startsWith(`${y}-${S.pad(mo)}`)).length;
  return show(ctx, `🗓 <b>${S.MONTHS[mo - 1]} ${y}</b> — ${n} ta uchrashuv\n<pre>${grid}</pre>• — uchrashuv bor kun. Kunni bossangiz, tafsilot chiqadi.`, { inline_keyboard: rows });
}

/* ---------- uchrashuv kartasi ---------- */
function cardMarkup(m, back = 'l:0') {
  const rows = m.checklist.slice(0, 12).map((it, i) => [{ text: `${it.done ? '✅' : '⬜️'} ${it.text}`.slice(0, 60), callback_data: `ck:${m.id}:${i}` }]);
  rows.push([S.appBtn('✏️ Tahrirlash', `?edit=${m.id}`), { text: '🗑 Oʻchirish', callback_data: `del:${m.id}` }]);
  rows.push([{ text: '⬅️ Roʻyxat', callback_data: back }]);
  return { inline_keyboard: rows };
}
async function showCard(ctx, u, id, back) {
  const m = u.meetings.find((x) => x.id === id);
  if (!m) return show(ctx, 'Bu uchrashuv topilmadi (oʻchirilgan boʻlishi mumkin).', { inline_keyboard: [[{ text: '⬅️ Roʻyxat', callback_data: 'l:0' }]] });
  return show(ctx, S.meetingText(m, u), cardMarkup(m, back));
}

/* ---------- yangi uchrashuv (bosqichma-bosqich) ---------- */
const STEP_TEXT = {
  name: '➕ <b>Yangi uchrashuv</b>\n\n1/6 · Kim bilan (yoki nima) uchrashasiz? Ismni yozing:',
  date: '2/6 · <b>Qaysi kuni?</b> Tugmani bosing yoki sanani yozing (masalan: <code>28.10</code>):',
  time: '3/6 · <b>Soat nechada?</b> Tugmani bosing yoki yozing (masalan: <code>15:30</code>):',
  loc: '4/6 · <b>Qayerda?</b> Joyni yozing yoki oʻtkazib yuboring:',
  notes: '5/6 · <b>Izoh</b> yozing yoki oʻtkazib yuboring:',
  items: '6/6 · <b>Olib borish / berish kerak narsalar.</b> Har bir narsani <b>alohida qatordan</b> yozing (yoki oʻtkazib yuboring):',
};
const SKIP = [[{ text: '⏭ Oʻtkazib yuborish', callback_data: 'sk' }], [{ text: '✖️ Bekor qilish', callback_data: 'no' }]];
function dateButtons(u) {
  const today = S.todayISO(u.tz), rows = [];
  const btns = [];
  for (let i = 0; i < 7; i += 1) {
    const iso = S.addDaysISO(today, i);
    btns.push({ text: i === 0 ? 'Bugun' : i === 1 ? 'Ertaga' : `${S.WD_SHORT[S.weekdayIdx(iso)]} ${S.parseISO(iso).getUTCDate()}`, callback_data: `nd:${iso}` });
  }
  for (let i = 0; i < btns.length; i += 3) rows.push(btns.slice(i, i + 3));
  rows.push([{ text: '✖️ Bekor qilish', callback_data: 'no' }]);
  return { inline_keyboard: rows };
}
function timeButtons() {
  const t = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
  const rows = [];
  for (let i = 0; i < t.length; i += 4) rows.push(t.slice(i, i + 4).map((x) => ({ text: x, callback_data: `nt:${x.replace(':', '')}` })));
  rows.push([{ text: '✖️ Bekor qilish', callback_data: 'no' }]);
  return { inline_keyboard: rows };
}
async function askStep(chat, u, step) {
  u.state = { ...(u.state || { draft: {} }), step };
  if (step === 'date') return send(chat, STEP_TEXT.date, dateButtons(u));
  if (step === 'time') return send(chat, STEP_TEXT.time, timeButtons());
  if (step === 'name') return send(chat, STEP_TEXT.name, { inline_keyboard: [[{ text: '✖️ Bekor qilish', callback_data: 'no' }]] });
  return send(chat, STEP_TEXT[step], { inline_keyboard: SKIP });
}
const startFlow = (chat, u, date) => { u.state = { step: 'name', draft: date ? { date } : {} }; return askStep(chat, u, 'name'); };

function parseDate(text, u) {
  const t = text.trim().toLowerCase(), today = S.todayISO(u.tz);
  if (t === 'bugun') return today;
  if (t === 'ertaga') return S.addDaysISO(today, 1);
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
  if (!m) return null;
  let [, d, mo, y] = m; d = +d; mo = +mo;
  const cy = +today.slice(0, 4);
  y = y ? (+y < 100 ? 2000 + +y : +y) : cy;
  let iso = `${y}-${S.pad(mo)}-${S.pad(d)}`;
  const chk = S.parseISO(iso);
  if (mo < 1 || mo > 12 || d < 1 || chk.getUTCMonth() + 1 !== mo || chk.getUTCDate() !== d) return null;
  if (!m[3] && iso < today) iso = `${cy + 1}-${S.pad(mo)}-${S.pad(d)}`;
  return iso;
}
function parseTime(text) {
  const m = text.trim().match(/^(\d{1,2})(?:[:.\s]?(\d{2}))?$/);
  if (!m) return null;
  const h = +m[1], mi = m[2] ? +m[2] : 0;
  return h > 23 || mi > 59 ? null : `${S.pad(h)}:${S.pad(mi)}`;
}
function summary(d, u) {
  const m = { ...d, checklist: (d.items || []).map((t) => ({ text: t, done: false })), notes: d.notes || '', location: d.location || '' };
  return `📝 <b>Tekshiring:</b>\n\n${S.meetingText(m, u).replace(/\n\n🧾.*$/s, '')}${m.checklist.length ? '\n\n🧾 ' + m.checklist.map((i) => '⬜️ ' + esc(i.text)).join('\n') : ''}`;
}
async function afterStep(chat, u, step) {
  const order = ['name', 'date', 'time', 'loc', 'notes', 'items'];
  const next = order[order.indexOf(step) + 1];
  if (next) return askStep(chat, u, next);
  u.state.step = 'confirm';
  return send(chat, summary(u.state.draft, u), { inline_keyboard: [[{ text: '✅ Saqlash', callback_data: 'ok' }, { text: '✖️ Bekor qilish', callback_data: 'no' }]] });
}
async function saveDraft(chat, u) {
  const d = u.state.draft;
  const m = S.cleanMeeting({ id: S.newId(), name: d.name, date: d.date, time: d.time, location: d.location || '', notes: d.notes || '', checklist: (d.items || []).map((t) => ({ id: S.newId(), text: t, done: false })), createdAt: Date.now(), updatedAt: Date.now() });
  u.meetings.push(m); u.state = null;
  return send(chat, `✅ <b>Saqlandi!</b>\n\n${S.meetingText(m, u)}\n\n⏰ Uchrashuvdan ${S.leadText(u.lead)} oldin eslatib qoʻyaman.`, cardMarkup(m, 'l:0'));
}
async function handleFlowText(chat, u, text) {
  const st = u.state, d = st.draft;
  if (st.step === 'name') { d.name = text.slice(0, 120); return afterStep(chat, u, 'name'); }
  if (st.step === 'date') { const iso = parseDate(text, u); if (!iso) return send(chat, 'Sanani tushunmadim. Masalan: <code>28.10</code> yoki <code>28.10.2026</code>', dateButtons(u)); d.date = iso; return afterStep(chat, u, 'date'); }
  if (st.step === 'time') { const t = parseTime(text); if (!t) return send(chat, 'Vaqtni tushunmadim. Masalan: <code>15:30</code>', timeButtons()); d.time = t; return afterStep(chat, u, 'time'); }
  if (st.step === 'loc') { d.location = text.slice(0, 200); return afterStep(chat, u, 'loc'); }
  if (st.step === 'notes') { d.notes = text.slice(0, 1000); return afterStep(chat, u, 'notes'); }
  if (st.step === 'items') { d.items = text.split('\n').map((x) => x.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean).slice(0, 30).map((x) => x.slice(0, 80)); return afterStep(chat, u, 'items'); }
  return send(chat, 'Pastdagi tugmalardan birini bosing yoki /bekor yozing.');
}

/* ---------- eslatma sozlamalari ---------- */
async function showRemind(ctx, u) {
  const leads = [15, 30, 60, 120, 1440];
  const rows = [leads.map((l) => ({ text: `${u.lead === l && u.remind ? '✔️ ' : ''}${S.leadText(l)}`, callback_data: `rm:${l}` }))];
  rows.push([{ text: u.remind ? '🔕 Eslatmani oʻchirish' : '🔔 Eslatmani yoqish', callback_data: u.remind ? 'rm:off' : 'rm:on' }]);
  return show(ctx, `⏰ <b>Eslatmalar</b>\n\nHolati: <b>${u.remind ? `yoqilgan — uchrashuvdan ${S.leadText(u.lead)} oldin` : 'oʻchirilgan'}</b>\n\nQachon eslatay?`, { inline_keyboard: rows });
}

/* ---------- xabarlar ---------- */
async function onMessage(st, m) {
  const chat = m.chat.id, from = m.from || {};
  if (m.chat.type !== 'private') return;
  const u = await S.getUser(st, from.id);
  u.chat = String(chat);
  u.name = [from.first_name, from.last_name].filter(Boolean).join(' ');
  let text = (m.text || '').trim();
  if (BTN_CMD[text]) text = BTN_CMD[text];
  const cmd = text.startsWith('/') ? text.split(/[\s@]/)[0].toLowerCase() : '';
  const ctx = { chat };

  if (cmd === '/bekor') { u.state = null; await S.saveUser(st, u); return send(chat, '✖️ Bekor qilindi.', KB); }
  if (cmd) u.state = cmd === '/yangi' ? u.state : null;

  if (cmd === '/start' || cmd === '/yordam' || cmd === '/help') {
    if (cmd === '/start') await send(chat, `Assalomu alaykum, <b>${esc(from.first_name || '')}</b>! 👋\n\nMen <b>Uchrashuvlar</b> yordamchisiman: uchrashuvlaringizni saqlayman, <b>1 soat oldin eslataman</b> va olib borish kerak narsalar roʻyxatini yuritaman.\n\nIlovani ochish yoki shu yerning oʻzida /yangi bilan uchrashuv qoʻshing.`, KB);
    await send(chat, HELP, { inline_keyboard: [[S.appBtn('📱 Ilovani ochish')], NEW_ROW] });
  } else if (cmd === '/ilova' || cmd === '/app') {
    await send(chat, '📱 Mini ilovani ochish uchun tugmani bosing:', { inline_keyboard: [[S.appBtn('📱 Ilovani ochish')]] });
  } else if (cmd === '/yangi') {
    await startFlow(chat, u);
  } else if (cmd === '/kelgusi') {
    await showUpcoming(ctx, u, 0);
  } else if (cmd === '/royxat') {
    await showUpcoming(ctx, u, 0);
  } else if (cmd === '/bugun') {
    await showDay(ctx, u, S.todayISO(u.tz));
  } else if (cmd === '/ertaga') {
    await showDay(ctx, u, S.addDaysISO(S.todayISO(u.tz), 1));
  } else if (cmd === '/taqvim') {
    await showCalendar(ctx, u);
  } else if (cmd === '/ochirish') {
    const items = S.upcoming(u).slice(0, 10);
    await send(chat, items.length ? '🗑 <b>Qaysi uchrashuvni oʻchiramiz?</b>' : 'Oʻchiriladigan uchrashuv yoʻq.', { inline_keyboard: items.map((x) => [{ text: `🗑 ${S.fmtShort(x.date)} · ${x.time} · ${x.name}`.slice(0, 60), callback_data: `del:${x.id}` }]) });
  } else if (cmd === '/eslatma') {
    await showRemind(ctx, u);
  } else if (cmd) {
    await send(chat, 'Bunday buyruq yoʻq. /yordam ni bosing.', KB);
  } else if (u.state && u.state.step && u.state.step !== 'confirm') {
    if (!text) await send(chat, 'Iltimos, matn yozing.'); else await handleFlowText(chat, u, text);
  } else {
    await send(chat, 'Menyudagi tugmalardan foydalaning yoki /yordam ni bosing.', KB);
  }
  await S.saveUser(st, u);
}

/* ---------- tugmalar ---------- */
async function onCallback(st, q) {
  const chat = q.message && q.message.chat.id, mid = q.message && q.message.message_id;
  if (!chat) return;
  const u = await S.getUser(st, q.from.id);
  u.chat = String(chat);
  const ctx = { chat, mid };
  const [act, a, b] = (q.data || '').split(':');
  let toast = '';

  if (act === 'noop') { /* sahifa raqami */ }
  else if (act === 'd') await showCard(ctx, u, a);
  else if (act === 'l') await showUpcoming(ctx, u, Number(a) || 0);
  else if (act === 'cal') await showCalendar(ctx, u, a + (b ? `:${b}` : ''));
  else if (act === 'day') await showDay(ctx, u, a, `cal:${a.slice(0, 7)}`);
  else if (act === 'ck') {
    const m = u.meetings.find((x) => x.id === a), i = Number(b);
    if (m && m.checklist[i]) { m.checklist[i].done = !m.checklist[i].done; m.updatedAt = Date.now(); }
    await showCard(ctx, u, a);
  } else if (act === 'del') {
    const m = u.meetings.find((x) => x.id === a);
    if (!m) await show(ctx, 'Bu uchrashuv allaqachon yoʻq.', { inline_keyboard: [] });
    else await show(ctx, `🗑 <b>Oʻchirasizmi?</b>\n\n${S.meetingText(m, u).split('\n').slice(0, 2).join('\n')}\n\nBu amalni qaytarib boʻlmaydi.`, { inline_keyboard: [[{ text: 'Ha, oʻchirish', callback_data: `dely:${a}` }, { text: 'Yoʻq', callback_data: `d:${a}` }]] });
  } else if (act === 'dely') {
    u.meetings = u.meetings.filter((x) => x.id !== a);
    u.deleted[a] = Date.now();
    await show(ctx, '🗑 Uchrashuv oʻchirildi.', { inline_keyboard: [[{ text: '📅 Kelgusi uchrashuvlar', callback_data: 'l:0' }]] });
  } else if (act === 'new') { await startFlow(chat, u); }
  else if (act === 'newd') { await startFlow(chat, u, a); }
  else if (act === 'no') { u.state = null; await show(ctx, '✖️ Bekor qilindi.', { inline_keyboard: [] }); }
  else if (act === 'nd' && u.state && u.state.step === 'date') { u.state.draft.date = a; await afterStep(chat, u, 'date'); }
  else if (act === 'nt' && u.state && u.state.step === 'time') { u.state.draft.time = `${a.slice(0, 2)}:${a.slice(2)}`; await afterStep(chat, u, 'time'); }
  else if (act === 'sk' && u.state && ['loc', 'notes', 'items'].includes(u.state.step)) { await afterStep(chat, u, u.state.step); }
  else if (act === 'ok' && u.state && u.state.step === 'confirm') { await saveDraft(chat, u); toast = 'Saqlandi'; }
  else if (act === 'rm') {
    if (a === 'off') u.remind = false; else if (a === 'on') u.remind = true; else { u.lead = Number(a) || 60; u.remind = true; for (const m of u.meetings) m.r = undefined; }
    await showRemind(ctx, u);
  } else if (['nd', 'nt', 'sk', 'ok'].includes(act)) { toast = 'Bu bosqich tugagan. /yangi ni bosing.'; }

  await tg('answerCallbackQuery', { callback_query_id: q.id, text: toast || undefined });
  await S.saveUser(st, u);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'ok' };
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && event.headers['x-telegram-bot-api-secret-token'] !== secret) return { statusCode: 401, body: 'unauthorized' };
  try {
    const up = JSON.parse(event.body || '{}');
    const st = S.openStore(event);
    if (up.message) await onMessage(st, up.message);
    else if (up.callback_query) await onCallback(st, up.callback_query);
  } catch (e) {
    console.error(e);
  }
  return { statusCode: 200, body: 'ok' };
};
