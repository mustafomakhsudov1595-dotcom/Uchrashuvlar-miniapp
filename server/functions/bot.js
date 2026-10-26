'use strict';
const S = require('./_shared');
const { STR } = require('./i18n');
const { tg, esc } = S;

const plain = (h) => h.replace(/<[^>]+>/g, '').trim();
const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text, parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));
const guess = (from) => { const c = (from && from.language_code) || ''; return c.startsWith('ru') ? 'ru' : c.startsWith('en') ? 'en' : 'uz'; };

/* ---------- doimiy klaviatura ---------- */
const kbFor = (T) => ({
  keyboard: [
    [{ text: T.kb.app, web_app: { url: `${S.SITE()}/` } }],
    [{ text: T.kb.add }, { text: T.kb.next }],
    [{ text: T.kb.cal }, { text: T.kb.list }],
    [{ text: T.kb.rem }, { text: T.kb.more }],
    [{ text: T.kb.help }],
  ],
  resize_keyboard: true, is_persistent: true,
});
const KEY2CMD = { add: '/yangi', next: '/kelgusi', cal: '/taqvim', list: '/royxat', rem: '/eslatma', help: '/yordam', more: '/sozlamalar' };
const BTN = {};
for (const l of S.LANGS) for (const [k, cmd] of Object.entries(KEY2CMD)) BTN[STR[l].kb[k]] = cmd;

const langKb = { inline_keyboard: [[{ text: "🇺🇿 O'zbekcha", callback_data: 'lg:uz' }, { text: '🇷🇺 Русский', callback_data: 'lg:ru' }, { text: '🇬🇧 English', callback_data: 'lg:en' }]] };

/* ---------- ro'yxatlar ---------- */
function listMarkup(items, u, extra = []) {
  const T = S.Tof(u), today = S.todayISO(u.tz);
  const rows = items.map((m) => [{ text: `${m.cat ? S.CAT_DOT[m.cat] + ' ' : ''}${S.dayLabel(m.date, today, T)} · ${m.time} · ${m.name}`.slice(0, 60), callback_data: `d:${m.id}` }]);
  return { inline_keyboard: [...rows, ...extra] };
}
const newRow = (T) => [{ text: T.addNew, callback_data: 'new' }];

async function showUpcoming(ctx, u, page = 0) {
  const T = S.Tof(u), all = S.upcoming(u), per = 8, pages = Math.max(1, Math.ceil(all.length / per));
  page = Math.min(Math.max(page, 0), pages - 1);
  const items = all.slice(page * per, page * per + per);
  const nav = [];
  if (page > 0) nav.push({ text: '◀️', callback_data: `l:${page - 1}` });
  if (pages > 1) nav.push({ text: `${page + 1}/${pages}`, callback_data: 'noop' });
  if (page < pages - 1) nav.push({ text: '▶️', callback_data: `l:${page + 1}` });
  return show(ctx, S.listText(T.upTitle(all.length), items, u), listMarkup(items, u, [...(nav.length ? [nav] : []), newRow(T), [S.appBtn(T.openAppShort)]]));
}
async function showDay(ctx, u, iso, back) {
  const T = S.Tof(u), today = S.todayISO(u.tz);
  const items = u.meetings.filter((m) => m.date === iso && S.active(m)).sort(S.byStart(u.tz));
  const title = `${iso === today ? '☀️' : '🗓'} <b>${esc(S.dayLabel(iso, today, T))}</b>`;
  return show(ctx, S.listText(title, items, u, Date.now(), false), listMarkup(items, u, [[{ text: T.addToDay, callback_data: `newd:${iso}` }], ...(back ? [[{ text: T.backCal, callback_data: back }]] : [])]));
}
async function showCalendar(ctx, u, ym) {
  const T = S.Tof(u), today = S.todayISO(u.tz);
  const [y, mo] = (ym || today.slice(0, 7)).split('-').map(Number);
  const first = `${y}-${S.pad(mo)}-01`, off = S.weekdayIdx(first), dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const has = new Set(u.meetings.filter(S.active).map((m) => m.date));
  let grid = T.wd.map((d) => d.padEnd(3)).join('') + '\n';
  const days = [], cells = [...Array(off).fill('   ')];
  for (let d = 1; d <= dim; d += 1) {
    const iso = `${y}-${S.pad(mo)}-${S.pad(d)}`;
    cells.push(`${String(d).padStart(2)}${has.has(iso) ? '•' : iso === today ? '·' : ' '}`);
    if (has.has(iso)) days.push({ text: `${d}`, callback_data: `day:${iso}` });
  }
  for (let i = 0; i < cells.length; i += 7) grid += cells.slice(i, i + 7).join('') + '\n';
  const prev = mo === 1 ? `${y - 1}-12` : `${y}-${S.pad(mo - 1)}`, next = mo === 12 ? `${y + 1}-01` : `${y}-${S.pad(mo + 1)}`;
  const rows = [[{ text: '◀️', callback_data: `cal:${prev}` }, { text: `${T.months[mo - 1]} ${y}`, callback_data: `cal:${today.slice(0, 7)}` }, { text: '▶️', callback_data: `cal:${next}` }]];
  for (let i = 0; i < days.length; i += 6) rows.push(days.slice(i, i + 6));
  rows.push(newRow(T));
  const n = u.meetings.filter((m) => S.active(m) && m.date.startsWith(`${y}-${S.pad(mo)}`)).length;
  return show(ctx, `${T.calHead(T.months[mo - 1], y, n)}\n<pre>${grid}</pre>${T.calNote}`, { inline_keyboard: rows });
}

/* ---------- uchrashuv kartasi ---------- */
function cardMarkup(m, u, back = 'l:0') {
  const T = S.Tof(u);
  const rows = m.checklist.slice(0, 12).map((it, i) => [{ text: `${it.done ? '✅' : '⬜️'} ${it.text}`.slice(0, 60), callback_data: `ck:${m.id}:${i}` }]);
  const act = [];
  if (m.phone) act.push({ text: T.bCall, callback_data: `ph:${m.id}` });
  if (m.lat !== null && m.lat !== undefined) act.push({ text: T.bLoc, callback_data: `lc:${m.id}` });
  if (act.length) rows.push(act);
  const map = S.mapLinks(m);
  if (map) rows.push([{ text: T.bGoogle, url: map.google }, { text: T.bYandex, url: map.yandex }]);
  rows.push([S.appBtn(T.bEdit, `?edit=${m.id}`), { text: T.bInvite, callback_data: `inv:${m.id}` }, { text: T.bDel, callback_data: `del:${m.id}` }]);
  rows.push([{ text: T.backList, callback_data: back }]);
  return { inline_keyboard: rows };
}
async function showCard(ctx, u, id, back) {
  const T = S.Tof(u), m = u.meetings.find((x) => x.id === id);
  if (!m) return show(ctx, T.notFound, { inline_keyboard: [[{ text: T.backList, callback_data: 'l:0' }]] });
  return show(ctx, S.meetingText(m, u), cardMarkup(m, u, back));
}

/* ---------- yangi uchrashuv ---------- */
const ORDER = ['name', 'date', 'time', 'loc', 'phone', 'cat', 'notes', 'items'];
const OPTIONAL = ['loc', 'phone', 'cat', 'notes', 'items'];
const filled = (d, s) => (s === 'loc' ? Boolean(d.location) : s === 'phone' ? Boolean(d.phone) : s === 'cat' ? Boolean(d.cat) : s === 'notes' ? Boolean(d.notes) : s === 'items' ? Boolean(d.items && d.items.length) : Boolean(d[s]));
const cancelRow = (T) => [{ text: T.cancel, callback_data: 'no' }];
const skipRows = (T) => [[{ text: T.skip, callback_data: 'sk' }], cancelRow(T)];

function dateButtons(u) {
  const T = S.Tof(u), today = S.todayISO(u.tz), btns = [];
  for (let i = 0; i < 7; i += 1) {
    const iso = S.addDaysISO(today, i);
    btns.push({ text: i === 0 ? T.today : i === 1 ? T.tomorrow : `${T.wd[S.weekdayIdx(iso)]} ${S.parseISO(iso).getUTCDate()}`, callback_data: `nd:${iso}` });
  }
  const rows = [];
  for (let i = 0; i < btns.length; i += 3) rows.push(btns.slice(i, i + 3));
  rows.push(cancelRow(T));
  return { inline_keyboard: rows };
}
function timeButtons(T) {
  const t = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'], rows = [];
  for (let i = 0; i < t.length; i += 4) rows.push(t.slice(i, i + 4).map((x) => ({ text: x, callback_data: `nt:${x.replace(':', '')}` })));
  rows.push(cancelRow(T));
  return { inline_keyboard: rows };
}
async function askStep(chat, u, step) {
  const T = S.Tof(u);
  u.state.step = step;
  if (step === 'date') return send(chat, T.s.date, dateButtons(u));
  if (step === 'time') return send(chat, T.s.time, timeButtons(T));
  if (step === 'name') return send(chat, T.s.name, { inline_keyboard: [cancelRow(T)] });
  if (step === 'cat') return send(chat, T.s.cat, { inline_keyboard: [S.CATS.map((c) => ({ text: `${S.CAT_DOT[c]} ${T.cats[c]}`, callback_data: `ct:${c}` })), [{ text: T.skip, callback_data: 'sk' }], cancelRow(T)] });
  return send(chat, T.s[step], { inline_keyboard: skipRows(T) });
}
const startFlow = (chat, u, draft = {}, quick = false) => { u.state = { step: 'name', draft, quick, asked: [] }; return proceed(chat, u); };

function previewMeeting(d) {
  return { id: 'x', name: d.name || '—', date: d.date, time: d.time, location: d.location || '', phone: d.phone || '', lat: d.lat ?? null, lon: d.lon ?? null, cat: d.cat || '', notes: d.notes || '', checklist: (d.items || []).map((t) => ({ text: t, done: false })), from: '', status: '' };
}
async function confirmStep(chat, u) {
  const T = S.Tof(u), st = u.state;
  st.step = 'confirm';
  const rows = [[{ text: T.save, callback_data: 'ok' }]];
  if (st.quick && !st.more) rows[0].push({ text: '➕', callback_data: 'more' });
  rows[0].push({ text: T.cancel, callback_data: 'no' });
  return send(chat, `${T.check}\n\n${S.meetingText(previewMeeting(st.draft), u)}`, { inline_keyboard: rows });
}
async function proceed(chat, u) {
  const st = u.state, d = st.draft;
  for (const s of ['name', 'date', 'time']) if (!d[s]) return askStep(chat, u, s);
  if (!(st.quick && !st.more)) for (const s of OPTIONAL) if (!st.asked.includes(s) && !filled(d, s)) return askStep(chat, u, s);
  return confirmStep(chat, u);
}
async function done(chat, u, step) { if (!u.state.asked.includes(step)) u.state.asked.push(step); return proceed(chat, u); }

async function saveDraft(chat, u) {
  const T = S.Tof(u), d = u.state.draft;
  const m = S.cleanMeeting({ id: S.newId(), name: d.name, date: d.date, time: d.time, location: d.location || '', phone: d.phone || '', lat: d.lat, lon: d.lon, cat: d.cat || '', notes: d.notes || '', checklist: (d.items || []).map((t) => ({ id: S.newId(), text: t, done: false })), createdAt: Date.now(), updatedAt: Date.now() });
  u.meetings.push(m); u.state = null;
  return send(chat, `${T.saved}\n\n${S.meetingText(m, u)}\n\n${T.willRemind(S.leadText(u.lead, T))}`, cardMarkup(m, u, 'l:0'));
}
function parseDate(text, u) { const r = S.parseQuick(text, u.tz); return r.found.date ? r.date : null; }
function parseTime(text) {
  const m = text.trim().match(/^(\d{1,2})(?:[:.\s]?(\d{2}))?$/);
  if (!m) return null;
  const h = +m[1], mi = m[2] ? +m[2] : 0;
  return h > 23 || mi > 59 ? null : `${S.pad(h)}:${S.pad(mi)}`;
}
async function handleFlowText(chat, u, text) {
  const T = S.Tof(u), st = u.state, d = st.draft;
  if (st.step === 'name') { d.name = text.slice(0, 120); return proceed(chat, u); }
  if (st.step === 'date') { const iso = parseDate(text, u); if (!iso) return send(chat, T.badDate, dateButtons(u)); d.date = iso; return proceed(chat, u); }
  if (st.step === 'time') { const t = parseTime(text); if (!t) return send(chat, T.badTime, timeButtons(T)); d.time = t; return proceed(chat, u); }
  if (st.step === 'loc') { d.location = text.slice(0, 200); d.lat = null; d.lon = null; return done(chat, u, 'loc'); }
  if (st.step === 'phone') { const dg = text.replace(/\D/g, ''); if (dg.length < 7) return send(chat, T.s.phone, { inline_keyboard: skipRows(T) }); d.phone = text.slice(0, 30); return done(chat, u, 'phone'); }
  if (st.step === 'notes') { d.notes = text.slice(0, 1000); return done(chat, u, 'notes'); }
  if (st.step === 'items') { d.items = text.split('\n').map((x) => x.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean).slice(0, 30).map((x) => x.slice(0, 80)); return done(chat, u, 'items'); }
  return send(chat, T.pressButtons);
}
// Erkin matn: "ertaga 15:00 Anvar bilan, ofis" — o'zi tushunadi
async function quickAdd(chat, u, text) {
  const T = S.Tof(u), r = S.parseQuick(text, u.tz);
  if (!r.found.date && !r.found.time) return false;
  const draft = { name: r.name, date: r.date, time: r.time, location: r.location, phone: r.phone, cat: r.cat, notes: r.notes };
  for (const k of Object.keys(draft)) if (!draft[k]) delete draft[k];
  u.state = { step: 'name', draft, quick: true, asked: [] };
  const miss = ['name', 'date', 'time'].some((k) => !draft[k]);
  if (miss) await send(chat, `${T.quickUnderstood}\n${T.quickMissing}`);
  await proceed(chat, u);
  return true;
}

/* ---------- sozlamalar ---------- */
const settingsMenu = (ctx, u) => {
  const T = S.Tof(u);
  return show(ctx, `⚙️ <b>${plain(T.kb.more).replace('⚙️', '').trim()}</b>`, { inline_keyboard: [
    [{ text: `⏰ ${plain(T.remTitle)}`, callback_data: 'set:rem' }, { text: `🌅 ${plain(T.digTitle)}`, callback_data: 'set:dig' }],
    [{ text: `🌙 ${plain(T.quietTitle)}`, callback_data: 'set:quiet' }, { text: `🕒 ${plain(T.tzTitle)}`, callback_data: 'set:tz' }],
    [{ text: '🌐 Til · Язык · Language', callback_data: 'set:lang' }, { text: `📊 ${{ uz: 'Statistika', ru: 'Статистика', en: 'Statistics' }[u.lang]}`, callback_data: 'st:' + S.todayISO(u.tz).slice(0, 7) }],
  ] });
};
async function showRemind(ctx, u) {
  const T = S.Tof(u), leads = [15, 30, 60, 120, 1440];
  const rows = [leads.map((l) => ({ text: `${u.lead === l && u.remind ? '✔️ ' : ''}${S.leadText(l, T)}`, callback_data: `rm:${l}` }))];
  rows.push([{ text: u.remind ? T.remOff : T.remOn, callback_data: u.remind ? 'rm:off' : 'rm:on' }]);
  return show(ctx, `${T.remTitle}\n\n${T.remState(u.remind, S.leadText(u.lead, T))}`, { inline_keyboard: rows });
}
async function showDigest(ctx, u) {
  const T = S.Tof(u), mk = (kind, vals) => vals.map((v) => ({ text: `${u.digest[kind] === v ? '✔️ ' : ''}${v}`, callback_data: `dg:${kind}:${v.replace(':', '')}` }));
  return show(ctx, `${T.digTitle}\n\n${T.digState(u.digest.m, u.digest.e)}`, { inline_keyboard: [
    [{ text: T.digMorning, callback_data: 'noop' }, ...mk('m', ['07:00', '08:00', '09:00'])], [{ text: T.digEvening, callback_data: 'noop' }, ...mk('e', ['19:00', '20:00', '21:00'])],
    [{ text: `🔕 ${T.digMorning} ${T.off}`, callback_data: 'dg:m:off' }, { text: `🔕 ${T.digEvening} ${T.off}`, callback_data: 'dg:e:off' }],
  ] });
}
const QUIET = [['22:00', '07:00'], ['23:00', '07:00'], ['21:00', '08:00'], ['00:00', '09:00']];
async function showQuiet(ctx, u) {
  const T = S.Tof(u), q = u.quiet;
  const rows = QUIET.map(([a, b], i) => [{ text: `${q.on && q.from === a && q.to === b ? '✔️ ' : ''}${a} – ${b}`, callback_data: `qh:${i}` }]);
  rows.push([{ text: T.quietOff, callback_data: 'qh:off' }]);
  return show(ctx, `${T.quietTitle}\n\n${T.quietState(q.on, q.from, q.to)}`, { inline_keyboard: rows });
}
async function showTz(ctx, u) {
  const T = S.Tof(u), now = S.localNow(u.tz);
  const rows = [];
  for (let i = 0; i < S.TZS.length; i += 2) rows.push(S.TZS.slice(i, i + 2).map(([m]) => ({ text: `${u.tz === m ? '✔️ ' : ''}${S.tzName(m).replace(/ \(.*/, '')} ${S.TZS.find((z) => z[0] === m)[1].split(' · ')[0]}`, callback_data: `tz:${m}` })));
  rows.push([{ text: `${!u.tzManual ? '✔️ ' : ''}${T.tzAuto}`, callback_data: 'tz:auto' }]);
  return show(ctx, `${T.tzTitle}\n\n${T.tzNow(S.tzName(u.tz), S.hhmmOfLocal(now), !u.tzManual)}`, { inline_keyboard: rows });
}

/* ---------- statistika ---------- */
const BARS = '▁▂▃▄▅▆▇█';
async function showStats(ctx, u, ym) {
  const T = S.Tof(u), now = Date.now(), today = S.todayISO(u.tz);
  const [y, mo] = ym.split('-').map(Number), pre = `${y}-${S.pad(mo)}`;
  const month = u.meetings.filter((m) => m.date.startsWith(pre));
  const nav = (d) => { const t = mo + d; return t < 1 ? `${y - 1}-12` : t > 12 ? `${y + 1}-01` : `${y}-${S.pad(t)}`; };
  const rows = [[{ text: '◀️', callback_data: `st:${nav(-1)}` }, { text: `${T.months[mo - 1]} ${y}`, callback_data: `st:${today.slice(0, 7)}` }, { text: '▶️', callback_data: `st:${nav(1)}` }]];
  let text = `${T.stTitle(T.months[mo - 1], y)}\n\n`;
  if (!month.length) text += T.stEmpty;
  else {
    const cancelled = month.filter((m) => m.status === 'cancelled').length;
    const live = month.filter((m) => m.status !== 'cancelled');
    const up = live.filter((m) => m.status !== 'done' && S.startUTC(m, u.tz) >= now).length;
    const attended = live.length - up;
    const wd = Array(7).fill(0); live.forEach((m) => { wd[S.weekdayIdx(m.date)] += 1; });
    const mx = Math.max(...wd), best = wd.indexOf(mx);
    const places = {}; live.forEach((m) => { const k = m.location.trim().toLowerCase(); if (k) places[k] = { n: (places[k] ? places[k].n : 0) + 1, t: m.location.trim() }; });
    const top = Object.values(places).sort((a, b) => b.n - a.n).slice(0, 3);
    text += `📌 ${T.stTotal}: <b>${month.length}</b>\n✅ ${T.stDone}: <b>${attended}</b>\n⏳ ${T.stUpcoming}: <b>${up}</b>\n❌ ${T.stCancelled}: <b>${cancelled}</b>\n\n`;
    text += `📈 ${T.stBusiest}: <b>${mx ? T.weekdays[best] : T.stNoData}</b>${mx ? ` (${mx})` : ''}\n<pre>${T.wd.join(' ')}\n${wd.map((n) => (mx ? BARS[Math.min(7, Math.round((n / mx) * 7))] : BARS[0]).padEnd(2)).join(' ')}</pre>`;
    if (top.length) text += `\n📍 ${T.stPlaces}:\n${top.map((p) => `• ${esc(p.t)} — ${p.n}`).join('\n')}\n`;
  }
  const week = S.upcoming(u, now).filter((m) => S.startUTC(m, u.tz) <= now + 7 * 86400000).length;
  text += `\n🗓 ${T.stWeek}: <b>${week}</b>\n🧮 ${T.stAll}: <b>${u.meetings.length}</b>`;
  return show(ctx, text, { inline_keyboard: rows });
}

/* ---------- qidiruv, taklif, qo'shilish ---------- */
async function doSearch(chat, u, q) {
  const T = S.Tof(u), ql = q.trim().toLowerCase();
  if (!ql) return send(chat, T.searchUsage);
  const items = u.meetings.filter((m) => [m.name, m.location, m.notes, m.phone].some((f) => (f || '').toLowerCase().includes(ql))).sort(S.byStart(u.tz)).slice(0, 15);
  if (!items.length) return send(chat, T.searchNone(esc(q)));
  return send(chat, T.searchRes(esc(q), items.length), listMarkup(items, u));
}
async function makeInvite(ctx, st, u, id) {
  const T = S.Tof(u), m = u.meetings.find((x) => x.id === id);
  if (!m) return send(ctx.chat, T.notFound);
  const tok = S.newId().replace(/-/g, '').slice(0, 14);
  await st.setJSON(`invite/${tok}`, { owner: u.id, mid: id, exp: Date.now() + 30 * 86400000 });
  const link = `https://t.me/${S.BOT_USER()}?start=j_${tok}`;
  return send(ctx.chat, T.inviteMsg(link), { inline_keyboard: [[{ text: T.inviteShare, url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(T.inviteText(m.name))}` }]] });
}
async function joinInvite(chat, st, u, from, tok) {
  const T = S.Tof(u);
  const inv = await st.get(`invite/${tok}`, { type: 'json' });
  if (!inv || inv.exp < Date.now()) return send(chat, T.joinBad);
  if (inv.owner === u.id) return send(chat, T.joinSelf);
  const owner = await S.getUser(st, inv.owner), m = owner.meetings.find((x) => x.id === inv.mid);
  if (!m) return send(chat, T.joinBad);
  const src = `${owner.id}:${m.id}`;
  if (u.meetings.some((x) => x.src === src)) return send(chat, T.joinAlready);
  const start = S.startUTC(m, owner.tz), loc = S.localNow(u.tz, start);
  const copy = S.cleanMeeting({ ...m, id: S.newId(), date: S.isoOfLocal(loc), time: S.hhmmOfLocal(loc), checklist: m.checklist.map((i) => ({ id: S.newId(), text: i.text, done: false })), status: '', from: owner.name || '', src, createdAt: Date.now(), updatedAt: Date.now() });
  u.meetings.push(copy);
  m.g = [...(m.g || []), { id: u.id, name: u.name || '' }];
  await S.saveUser(st, owner);
  await send(chat, `${T.joined}\n\n${S.meetingText(copy, u)}`, cardMarkup(copy, u));
  const OT = S.Tof(owner);
  if (owner.chat) await send(owner.chat, OT.joinedOwner(esc(u.name || from.first_name || ''), esc(m.name)));
  return null;
}
const e164 = (p) => { const d = p.replace(/\D/g, ''); return `+${d.length === 9 ? '998' + d : d}`; };

/* ---------- xabarlar ---------- */
async function sendWelcome(chat, u, from) {
  const T = S.Tof(u);
  await send(chat, T.welcome(esc(from.first_name || '')), kbFor(T));
  return send(chat, T.help, { inline_keyboard: [[S.appBtn(T.openApp)], newRow(T)] });
}

async function onMessage(st, m) {
  const chat = m.chat.id, from = m.from || {};
  if (m.chat.type !== 'private') return;
  const u = await S.getUser(st, from.id);
  u.chat = String(chat);
  u.name = [from.first_name, from.last_name].filter(Boolean).join(' ');
  let text = (m.text || '').trim();
  if (BTN[text]) text = BTN[text];
  const cmd = text.startsWith('/') ? text.split(/[\s@]/)[0].toLowerCase() : '';
  const args = cmd ? text.slice(text.indexOf(cmd) + cmd.length).replace(/^@\S+/, '').trim() : '';
  const ctx = { chat };

  // birinchi marta: til tanlash (taklif havolasi saqlanadi)
  if (!u.lang) {
    if (cmd === '/start' && args.startsWith('j_')) u.pending = args.slice(2);
    await send(chat, STR.uz.chooseLang, langKb);
    return S.saveUser(st, u);
  }
  const T = S.Tof(u);

  // Telegram joylashuvi / venue
  if (m.location || m.venue) {
    const loc = m.venue ? { lat: m.venue.location.latitude, lon: m.venue.location.longitude, text: [m.venue.title, m.venue.address].filter(Boolean).join(', ') } : { lat: m.location.latitude, lon: m.location.longitude, text: `${m.location.latitude.toFixed(5)}, ${m.location.longitude.toFixed(5)}` };
    if (u.state && u.state.step === 'loc') { Object.assign(u.state.draft, { location: loc.text.slice(0, 200), lat: loc.lat, lon: loc.lon }); await done(chat, u, 'loc'); }
    else { await send(chat, T.locStart); await startFlow(chat, u, { location: loc.text.slice(0, 200), lat: loc.lat, lon: loc.lon }); }
    return S.saveUser(st, u);
  }

  if (cmd === '/bekor') { u.state = null; await send(chat, T.cancelled, kbFor(T)); return S.saveUser(st, u); }
  if (cmd && cmd !== '/yangi') u.state = null;

  if (cmd === '/start') {
    if (args.startsWith('j_')) await joinInvite(chat, st, u, from, args.slice(2));
    else await sendWelcome(chat, u, from);
  } else if (cmd === '/yordam' || cmd === '/help') {
    await send(chat, T.help, { inline_keyboard: [[S.appBtn(T.openApp)], newRow(T)] });
  } else if (cmd === '/ilova' || cmd === '/app') {
    await send(chat, T.openApp, { inline_keyboard: [[S.appBtn(T.openApp)]] });
  } else if (cmd === '/yangi') {
    if (args && await quickAdd(chat, u, args)) { /* tez qo'shish */ } else await startFlow(chat, u, args ? { name: args.slice(0, 120) } : {});
  } else if (cmd === '/kelgusi' || cmd === '/royxat') {
    await showUpcoming(ctx, u, 0);
  } else if (cmd === '/bugun') {
    await showDay(ctx, u, S.todayISO(u.tz));
  } else if (cmd === '/ertaga') {
    await showDay(ctx, u, S.addDaysISO(S.todayISO(u.tz), 1));
  } else if (cmd === '/taqvim') {
    await showCalendar(ctx, u);
  } else if (cmd === '/qidir') {
    await doSearch(chat, u, args);
  } else if (cmd === '/ochirish') {
    const items = S.upcoming(u).slice(0, 10);
    await send(chat, items.length ? T.whichDel : T.nothingDel, { inline_keyboard: items.map((x) => [{ text: `🗑 ${S.fmtShort(x.date, T)} · ${x.time} · ${x.name}`.slice(0, 60), callback_data: `del:${x.id}` }]) });
  } else if (cmd === '/eslatma') { await showRemind(ctx, u); }
  else if (cmd === '/xulosa') { await showDigest(ctx, u); }
  else if (cmd === '/jim') { await showQuiet(ctx, u); }
  else if (cmd === '/vaqt') { await showTz(ctx, u); }
  else if (cmd === '/til') { await send(chat, STR.uz.chooseLang, langKb); }
  else if (cmd === '/statistika') { await showStats(ctx, u, S.todayISO(u.tz).slice(0, 7)); }
  else if (cmd === '/sozlamalar') { await settingsMenu(ctx, u); }
  else if (cmd) { await send(chat, T.unknownCmd, kbFor(T)); }
  else if (u.state && u.state.step && u.state.step !== 'confirm') {
    if (!text) await send(chat, T.pleaseText); else await handleFlowText(chat, u, text);
  } else if (text && await quickAdd(chat, u, text)) { /* tez qo'shish */ }
  else { await send(chat, T.useMenu, kbFor(T)); }
  await S.saveUser(st, u);
}

/* ---------- tugmalar ---------- */
async function onCallback(st, q) {
  const chat = q.message && q.message.chat.id, mid = q.message && q.message.message_id;
  if (!chat) return;
  const u = await S.getUser(st, q.from.id);
  u.chat = String(chat);
  u.name = [q.from.first_name, q.from.last_name].filter(Boolean).join(' ');
  const parts = (q.data || '').split(':'), act = parts[0], a = parts[1], b = parts[2];
  const ctx = { chat, mid };
  let toast = '';

  if (act === 'lg') {
    u.lang = S.LANGS.includes(a) ? a : 'uz';
    const T = S.Tof(u);
    await tg('deleteMessage', { chat_id: chat, message_id: mid });
    if (u.pending) { const tok = u.pending; u.pending = undefined; await send(chat, T.langSet, kbFor(T)); await joinInvite(chat, st, u, q.from, tok); }
    else await sendWelcome(chat, u, q.from);
    await tg('answerCallbackQuery', { callback_query_id: q.id });
    return S.saveUser(st, u);
  }
  if (!u.lang) { await tg('answerCallbackQuery', { callback_query_id: q.id }); await send(chat, STR.uz.chooseLang, langKb); return; }
  const T = S.Tof(u);

  if (act === 'noop') { /* sahifa raqami */ }
  else if (act === 'd') await showCard(ctx, u, a);
  else if (act === 'l') await showUpcoming(ctx, u, Number(a) || 0);
  else if (act === 'cal') await showCalendar(ctx, u, a + (b ? `:${b}` : ''));
  else if (act === 'day') await showDay(ctx, u, a, `cal:${a.slice(0, 7)}`);
  else if (act === 'ck') {
    const m = u.meetings.find((x) => x.id === a), i = Number(b);
    if (m && m.checklist[i]) { m.checklist[i].done = !m.checklist[i].done; m.updatedAt = Date.now(); }
    if (q.message.reply_markup && /⏰/.test(q.message.text || '') && m) {
      // eslatma xabarida: faqat belgini yangilaymiz
      await tg('editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: { inline_keyboard: reminderRows(m, u) } });
    } else await showCard(ctx, u, a);
  } else if (act === 'del') {
    const m = u.meetings.find((x) => x.id === a);
    if (!m) await show(ctx, T.notFound, { inline_keyboard: [] });
    else await show(ctx, `${T.delAsk}\n\n${S.meetingText(m, u).split('\n').slice(0, 2).join('\n')}\n\n${T.delWarn}`, { inline_keyboard: [[{ text: T.yesDel, callback_data: `dely:${a}` }, { text: T.no, callback_data: `d:${a}` }]] });
  } else if (act === 'dely') {
    u.meetings = u.meetings.filter((x) => x.id !== a);
    u.deleted[a] = Date.now();
    await show(ctx, T.deleted, { inline_keyboard: [[{ text: T.backList, callback_data: 'l:0' }]] });
  } else if (act === 'sn' || act === 'go' || act === 'cx') {
    const m = u.meetings.find((x) => x.id === a);
    if (m) {
      const base = (q.message.text || '').split('\n\n').slice(0, 2).join('\n\n');
      if (act === 'sn') { const diff = Math.floor((S.startUTC(m, u.tz) - Date.now()) / 60000); const mins = Math.max(1, Math.min(10, Math.floor(diff / 2))); m.sn = Date.now() + mins * 60000; toast = T.snoozed; await show(ctx, `${esc(base)}\n\n${T.snoozed}`, { inline_keyboard: [] }); }
      else { m.status = act === 'go' ? 'done' : 'cancelled'; m.updatedAt = Date.now(); m.sn = undefined; toast = act === 'go' ? T.markedDone : T.markedCancel; await show(ctx, `${esc(base)}\n\n${toast}`, { inline_keyboard: [] }); }
    }
  } else if (act === 'ph') {
    const m = u.meetings.find((x) => x.id === a);
    if (m && m.phone) { await tg('sendContact', { chat_id: chat, phone_number: e164(m.phone), first_name: m.name.slice(0, 60) }); toast = T.contactSent; } else toast = T.noPhone;
  } else if (act === 'lc') {
    const m = u.meetings.find((x) => x.id === a);
    if (m && m.lat !== null && m.lat !== undefined) await tg('sendVenue', { chat_id: chat, latitude: m.lat, longitude: m.lon, title: m.name.slice(0, 60), address: (m.location || '—').slice(0, 100) }); else toast = T.noLoc;
  } else if (act === 'inv') { await makeInvite(ctx, st, u, a); }
  else if (act === 'new') { await startFlow(chat, u); }
  else if (act === 'newd') { await startFlow(chat, u, { date: a }); }
  else if (act === 'no') { u.state = null; await show(ctx, T.cancelled, { inline_keyboard: [] }); }
  else if (act === 'nd' && u.state && u.state.step === 'date') { u.state.draft.date = a; await proceed(chat, u); }
  else if (act === 'nt' && u.state && u.state.step === 'time') { u.state.draft.time = `${a.slice(0, 2)}:${a.slice(2)}`; await proceed(chat, u); }
  else if (act === 'ct' && u.state && u.state.step === 'cat') { u.state.draft.cat = a; await done(chat, u, 'cat'); }
  else if (act === 'sk' && u.state && OPTIONAL.includes(u.state.step)) { await done(chat, u, u.state.step); }
  else if (act === 'more' && u.state) { u.state.more = true; await proceed(chat, u); }
  else if (act === 'ok' && u.state && u.state.step === 'confirm') { await saveDraft(chat, u); toast = T.savedToast; }
  else if (act === 'set') {
    if (a === 'rem') await showRemind(ctx, u); else if (a === 'dig') await showDigest(ctx, u); else if (a === 'quiet') await showQuiet(ctx, u); else if (a === 'tz') await showTz(ctx, u);
    else if (a === 'lang') await show(ctx, STR.uz.chooseLang, langKb);
  } else if (act === 'st') { await showStats(ctx, u, a || S.todayISO(u.tz).slice(0, 7)); }
  else if (act === 'rm') {
    if (a === 'off') u.remind = false; else if (a === 'on') u.remind = true; else { u.lead = Number(a) || 60; u.remind = true; for (const m of u.meetings) m.r = undefined; }
    await showRemind(ctx, u);
  } else if (act === 'dg') {
    const kind = a, v = b === 'off' ? null : `${b.slice(0, 2)}:${b.slice(2)}`;
    u.digest[kind] = v; u.dsent[kind] = '';
    await showDigest(ctx, u);
  } else if (act === 'qh') {
    if (a === 'off') u.quiet.on = false; else { const [f, t] = QUIET[Number(a)] || QUIET[0]; u.quiet = { on: true, from: f, to: t }; }
    await showQuiet(ctx, u);
  } else if (act === 'tz') {
    if (a === 'auto') { u.tzManual = false; u.tz = u.tzApp ?? S.DEFAULT_TZ; } else { u.tz = Number(a); u.tzManual = true; }
    await showTz(ctx, u);
  } else if (['nd', 'nt', 'sk', 'ok', 'ct', 'more'].includes(act)) { toast = T.stageDone; }

  await tg('answerCallbackQuery', { callback_query_id: q.id, text: toast ? plain(toast) : undefined });
  await S.saveUser(st, u);
}

function reminderRows(m, u) {
  const T = S.Tof(u);
  const rows = m.checklist.slice(0, 12).map((it, i) => [{ text: `${it.done ? '✅' : '⬜️'} ${it.text}`.slice(0, 60), callback_data: `ck:${m.id}:${i}` }]);
  rows.push([{ text: T.snooze, callback_data: `sn:${m.id}` }, { text: T.went, callback_data: `go:${m.id}` }, { text: T.cancelMtg, callback_data: `cx:${m.id}` }]);
  const act = [];
  if (m.phone) act.push({ text: T.bCall, callback_data: `ph:${m.id}` });
  const map = S.mapLinks(m);
  if (map) act.push({ text: T.bGoogle, url: map.google });
  act.push(S.appBtn(T.openAppShort, `?edit=${m.id}`));
  rows.push(act);
  return rows;
}

exports.reminderRows = reminderRows;
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
