'use strict';
// Hodimga vazifa berish: kimga, nima, qachongacha. Hodimga xabar boradi ("Bajardim" tugmasi bilan), muddat yaqinlashsa eslatiladi,
// bajarilsa vazifa bergan odamga xabar keladi. Vazifalar umumiy hisobda hamma uchun umumiy (u.tasks, tombstone u.tdeleted).
const S = require('./_shared');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text: String(text).slice(0, 3900), parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text: String(text).slice(0, 3900), parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));
const store = () => S.openStore({});
const tr = (u, o) => o[u.lang] || o.uz;
const fmtD = (iso) => (iso ? `${iso.slice(8)}.${iso.slice(5, 7)}` : '');

/* ---------- maʼlumot ---------- */
function cleanTask(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || x.id.length > 64 || typeof x.text !== 'string' || !x.text.trim()) return null;
  return {
    id: x.id, text: x.text.trim().slice(0, 300), to: String(x.to || ''), toName: String(x.toName || '').slice(0, 60), by: String(x.by || ''), byName: String(x.byName || '').slice(0, 60),
    due: /^\d{4}-\d{2}-\d{2}$/.test(x.due) ? x.due : '', time: /^\d{2}:\d{2}$/.test(x.time) ? x.time : '',
    status: x.status === 'done' ? 'done' : 'open', doneAt: Number(x.doneAt) || 0, doneBy: String(x.doneBy || ''), doneByName: String(x.doneByName || '').slice(0, 60),
    createdAt: Number(x.createdAt) || Date.now(), updatedAt: Number(x.updatedAt) || Date.now(), r: x.r,
  };
}
// Hisob aʼzolari (hisobsiz — faqat oʻzi)
async function members(st, u) {
  if (u.ws) { const w = await st.get(S.wsKey(u.ws), { type: 'json' }); if (w && w.members && w.members.length) return w.members.map((m) => ({ id: String(m.id), name: m.name || String(m.id) })); }
  return [{ id: String(u.id), name: u.name || String(u.id) }];
}
const nameOf = (list, id) => (list.find((m) => m.id === String(id)) || {}).name || String(id);

/* ---------- amallar (bot ham, mini ilova ham) ---------- */
function taskCard(u, t, list) {
  const to = t.toName || nameOf(list || [], t.to);
  return `📋 <b>${esc(t.text)}</b>\n👤 ${tr(u, { uz: 'Kimga', ru: 'Кому', en: 'To' })}: <b>${esc(to)}</b> · ${tr(u, { uz: 'kimdan', ru: 'от', en: 'from' })}: ${esc(t.byName || '—')}${t.due ? `\n⏰ ${tr(u, { uz: 'Muddat', ru: 'Срок', en: 'Due' })}: <b>${fmtD(t.due)}${t.time ? ` ${t.time}` : ''}</b>` : ''}`;
}
async function addTask(st, u, { text, to, due, time }) {
  const list = await members(st, u), target = list.find((m) => m.id === String(to)) || { id: String(u.id), name: u.name || String(u.id) };
  const t = cleanTask({ id: S.newId(), text, to: target.id, toName: target.name, by: String(u.id), byName: u.name || String(u.id), due: due || '', time: time || '', status: 'open', createdAt: Date.now(), updatedAt: Date.now() });
  if (!t) return null;
  u.tasks = [t, ...(u.tasks || [])].slice(0, 500);
  if (t.to !== String(u.id)) { // topshirilgan hodimga xabar
    const lang = await langOf(st, t.to);
    await send(t.to, `🆕 ${tr({ lang }, { uz: 'Yangi vazifa', ru: 'Новая задача', en: 'New task' })}\n\n${taskCard({ lang }, t, list)}`, { inline_keyboard: [[{ text: tr({ lang }, { uz: '✅ Bajardim', ru: '✅ Готово', en: '✅ Done' }), callback_data: `tkd:${t.id}` }, { text: '📋', callback_data: 'tkl:0' }]] });
  }
  return t;
}
async function langOf(st, id) { try { const raw = await st.get(`user/${id}`, { type: 'json' }); return (raw && raw.lang) || 'uz'; } catch { return 'uz'; } }
async function completeTask(st, u, id) {
  const t = (u.tasks || []).find((x) => x.id === id);
  if (!t || t.status === 'done') return null;
  if (String(u.id) !== t.to && String(u.id) !== t.by && !S.isAdmin(u.id)) return 'denied';
  Object.assign(t, { status: 'done', doneAt: Date.now(), doneBy: String(u.id), doneByName: u.name || String(u.id), updatedAt: Date.now() });
  if (t.by && t.by !== String(u.id)) { // vazifa bergan odamga
    const lang = await langOf(st, t.by);
    await send(t.by, `✅ ${tr({ lang }, { uz: `<b>${esc(t.doneByName)}</b> vazifani bajardi`, ru: `<b>${esc(t.doneByName)}</b> выполнил(а) задачу`, en: `<b>${esc(t.doneByName)}</b> completed the task` })}:\n<i>${esc(t.text)}</i>`);
  }
  return t;
}
function removeTask(u, id) {
  const t = (u.tasks || []).find((x) => x.id === id);
  if (!t) return false;
  if (String(u.id) !== t.by && !S.isAdmin(u.id)) return 'denied';
  u.tasks = u.tasks.filter((x) => x.id !== id);
  u.tdeleted = { ...(u.tdeleted || {}), [id]: Date.now() };
  return true;
}

/* ---------- bot: roʻyxat va yaratish ---------- */
const dueText = (t, today) => {
  if (!t.due) return '';
  const d = S.daysBetween(today, t.due);
  return d < 0 ? ` · ⚠️ ${-d}${'d'}` : d === 0 ? ' · 📌' : ` · ${fmtD(t.due)}`;
};
async function showList(ctx, u, kind = 'open') {
  const st = store(), today = S.todayISO(u.tz), list = await members(st, u), me = String(u.id);
  const all = (u.tasks || []).filter((x) => (kind === 'done' ? x.status === 'done' : x.status === 'open'));
  const mine = all.filter((x) => x.to === me), given = all.filter((x) => x.by === me && x.to !== me), others = all.filter((x) => x.to !== me && x.by !== me);
  const line = (x, who) => `• <b>${esc(x.text)}</b> — ${esc(who)}${dueText(x, today)}`;
  let text = `📋 <b>${kind === 'done' ? tr(u, { uz: 'Bajarilgan vazifalar', ru: 'Выполненные задачи', en: 'Completed tasks' }) : tr(u, { uz: 'Vazifalar', ru: 'Задачи', en: 'Tasks' })}</b>`;
  if (!all.length) text += `\n\n<i>${tr(u, { uz: 'Hozircha vazifa yoʻq', ru: 'Задач пока нет', en: 'No tasks yet' })}</i>`;
  if (mine.length) text += `\n\n👤 <b>${tr(u, { uz: 'Menga', ru: 'Мне', en: 'Mine' })}</b>\n${mine.slice(0, 10).map((x) => line(x, x.byName || nameOf(list, x.by))).join('\n')}`;
  if (given.length) text += `\n\n📤 <b>${tr(u, { uz: 'Men berganlar', ru: 'Поручил(а) я', en: 'Assigned by me' })}</b>\n${given.slice(0, 10).map((x) => line(x, x.toName || nameOf(list, x.to))).join('\n')}`;
  if (others.length) text += `\n\n👥 <b>${tr(u, { uz: 'Boshqalar', ru: 'Остальные', en: 'Others' })}</b>\n${others.slice(0, 8).map((x) => line(x, x.toName || nameOf(list, x.to))).join('\n')}`;
  const rows = kind === 'done' ? [] : all.filter((x) => x.to === me || x.by === me || S.isAdmin(u.id)).slice(0, 8).map((x) => [{ text: `✅ ${x.text}`.slice(0, 44), callback_data: `tkd:${x.id}` }, { text: '🗑', callback_data: `tkx:${x.id}` }]);
  rows.push([{ text: tr(u, { uz: '➕ Yangi vazifa', ru: '➕ Новая задача', en: '➕ New task' }), callback_data: 'tka:0' }, { text: kind === 'done' ? tr(u, { uz: '📋 Ochiq', ru: '📋 Открытые', en: '📋 Open' }) : tr(u, { uz: '✅ Bajarilgan', ru: '✅ Выполненные', en: '✅ Completed' }), callback_data: kind === 'done' ? 'tkl:0' : 'tkv:0' }]);
  return show(ctx, text, { inline_keyboard: rows });
}
const DUES = [['0', { uz: 'Bugun', ru: 'Сегодня', en: 'Today' }], ['1', { uz: 'Ertaga', ru: 'Завтра', en: 'Tomorrow' }], ['3', { uz: '3 kun', ru: '3 дня', en: '3 days' }], ['7', { uz: '7 kun', ru: '7 дней', en: '7 days' }], ['n', { uz: 'Muddatsiz', ru: 'Без срока', en: 'No due date' }]];
async function askAssignee(chat, u, text, pre = {}) {
  const st = store(), list = await members(st, u);
  u.state = { kind: 'tkdraft', text: text.slice(0, 300), ...pre };
  const rows = list.map((m) => [{ text: `${m.id === String(u.id) ? '🙋 ' : '👤 '}${m.name}${m.id === String(u.id) ? ` (${tr(u, { uz: 'men', ru: 'я', en: 'me' })})` : ''}`.slice(0, 50), callback_data: `tkw:${m.id}` }]);
  rows.push([{ text: '❌', callback_data: 'pno' }]);
  await send(chat, `📋 <b>${esc(text)}</b>\n\n${tr(u, { uz: 'Kimga beramiz?', ru: 'Кому поручаем?', en: 'Who gets this task?' })}`, { inline_keyboard: rows });
}
async function askDue(chat, u) {
  await send(chat, tr(u, { uz: '⏰ Qachongacha?', ru: '⏰ До какого срока?', en: '⏰ Due when?' }), { inline_keyboard: [DUES.map(([k, l]) => ({ text: tr(u, l), callback_data: `tkp:${k}` })), [{ text: '❌', callback_data: 'pno' }]] });
}
async function create(chat, u, d) {
  const st = store(), t = await addTask(st, u, { text: d.text, to: d.to, due: d.due, time: d.time });
  if (!t) return;
  await send(chat, `✅ ${tr(u, { uz: 'Vazifa berildi', ru: 'Задача поставлена', en: 'Task assigned' })}\n\n${taskCard(u, t, await members(st, u))}`, { inline_keyboard: [[{ text: '📋', callback_data: 'tkl:0' }]] });
}
async function onMessage(chat, u, cmd, args, text) {
  if (cmd === '/vazifa' || cmd === '/vazifalar' || cmd === '/tasks') {
    if (!args) { await showList({ chat }, u); return true; }
    const st = store(), list = await members(st, u);
    // "Sardor: banner tayyorlash, ertaga 18:00"
    const m = args.match(/^([^:]{2,40}):\s*(.+)$/s), hit = m ? list.find((x) => x.name.toLowerCase().startsWith(m[1].trim().toLowerCase()) || m[1].trim().toLowerCase() === x.id) : null;
    const body = hit ? m[2] : args, pq = S.parseQuick(body, u.tz), due = pq.found && pq.found.date ? pq.date : '', time = pq.found && pq.found.time ? pq.time : '';
    const clean = ((due || time) && pq.name ? pq.name : body).trim() || body;
    if (hit) { await create(chat, u, { text: clean, to: hit.id, due, time }); return true; }
    await askAssignee(chat, u, clean, { due, time });
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'tknew') {
    if (!text) return true;
    const pq = S.parseQuick(text, u.tz), due = pq.found && pq.found.date ? pq.date : '', time = pq.found && pq.found.time ? pq.time : '';
    await askAssignee(chat, u, ((due || time) && pq.name ? pq.name : text).trim() || text, { due, time });
    return true;
  }
  return false;
}
async function onCallback(ctx, u, act, a) {
  const st = store(), chat = ctx.chat;
  if (act === 'tkl') { await showList(ctx, u, 'open'); return ''; }
  if (act === 'tkv') { await showList(ctx, u, 'done'); return ''; }
  if (act === 'tka') { u.state = { kind: 'tknew' }; await send(chat, tr(u, { uz: '📋 Vazifa matnini yozing.\nMasalan: <i>banner tayyorlash, ertaga 18:00</i>', ru: '📋 Напишите текст задачи.\nНапример: <i>подготовить баннер, завтра 18:00</i>', en: '📋 Write the task.\nExample: <i>prepare a banner, tomorrow 18:00</i>' }), { inline_keyboard: [[{ text: '❌', callback_data: 'pno' }]] }); return ''; }
  if (act === 'tkw') {
    if (!u.state || u.state.kind !== 'tkdraft') return '';
    u.state = { ...u.state, kind: 'tkdraft', to: a };
    if (u.state.due || u.state.time) { const d = u.state; u.state = null; await create(chat, u, d); } else await askDue(chat, u);
    return '';
  }
  if (act === 'tkp') {
    if (!u.state || u.state.kind !== 'tkdraft') return '';
    const d = u.state; u.state = null;
    await create(chat, u, { ...d, due: a === 'n' ? '' : S.addDaysISO(S.todayISO(u.tz), Number(a)) });
    return '';
  }
  if (act === 'tkd') {
    const r = await completeTask(st, u, a);
    if (r === 'denied') return '🔒';
    if (r) { await show(ctx, `✅ <s>${esc(r.text)}</s>\n${tr(u, { uz: 'Bajarildi', ru: 'Выполнено', en: 'Done' })}`, { inline_keyboard: [[{ text: '📋', callback_data: 'tkl:0' }]] }); return '✅'; }
    return '';
  }
  if (act === 'tkx') { const r = removeTask(u, a); if (r === 'denied') return '🔒'; await showList(ctx, u); return r ? '🗑' : ''; }
  return '';
}

/* ---------- eslatma (cron) ---------- */
async function remind(u, now) {
  const loc = S.localNow(u.tz, now), hhmm = S.hhmmOfLocal(loc), today = S.isoOfLocal(loc);
  let dirty = false, sent = 0;
  if (!u.remind || S.inQuiet(u, hhmm) || hhmm < '09:00') return { dirty, sent };
  const fan = globalThis.__fan; globalThis.__fan = null; // vazifa eslatmasi faqat egasiga
  try {
    const st = store(), list = await members(st, u);
    for (const t of u.tasks || []) {
      if (t.status !== 'open' || !t.due || !t.to) continue;
      const d = S.daysBetween(today, t.due), kind = d === 1 ? 'd1' : d === 0 ? 'd0' : d < 0 && d >= -7 ? 'o' : '';
      if (!kind) continue;
      const key = kind === 'o' ? `${today}:o` : `${t.due}:${kind}`, r = t.r || (t.r = {});
      if ((r.k || []).includes(key)) continue;
      r.k = [...(r.k || []).slice(-8), key]; dirty = true;
      const lang = await langOf(st, t.to), L = { lang };
      const when = kind === 'o' ? tr(L, { uz: `${-d} kun kechikdi`, ru: `Просрочено на ${-d} дн.`, en: `${-d} days overdue` }) : kind === 'd0' ? tr(L, { uz: 'Bugun muddat', ru: 'Срок сегодня', en: 'Due today' }) : tr(L, { uz: 'Ertaga muddat', ru: 'Срок завтра', en: 'Due tomorrow' });
      const res = await send(t.to, `${kind === 'o' ? '⚠️' : '⏰'} <b>${when}</b>\n\n${taskCard(L, t, list)}`, { inline_keyboard: [[{ text: tr(L, { uz: '✅ Bajardim', ru: '✅ Готово', en: '✅ Done' }), callback_data: `tkd:${t.id}` }]] });
      if (res.ok) sent += 1;
      if (kind === 'o' && !r.over && t.by && t.by !== t.to) { // vazifa bergan odamga bir marta
        r.over = true;
        await send(t.by, `⚠️ ${tr({ lang: await langOf(st, t.by) }, { uz: `<b>${esc(t.toName)}</b> muddatni oʻtkazdi`, ru: `<b>${esc(t.toName)}</b> просрочил(а) срок`, en: `<b>${esc(t.toName)}</b> missed the deadline` })}:\n<i>${esc(t.text)}</i>`);
      }
    }
  } finally { globalThis.__fan = fan; }
  return { dirty, sent };
}
module.exports = { onMessage, onCallback, remind, addTask, completeTask, removeTask, members, cleanTask, ACTS: ['tkl', 'tkv', 'tka', 'tkw', 'tkp', 'tkd', 'tkx'] };
