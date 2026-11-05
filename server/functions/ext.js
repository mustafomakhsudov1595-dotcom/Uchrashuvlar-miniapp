'use strict';
// Xarajatlar va sof foyda, oylik maqsad, sayt kuzatuvi, zaxira/tiklash, AI yordamchi
const S = require('./_shared');
const proj = require('./proj');
const fin = require('./fin');
const { getAI } = require('../kv');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text, parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));
const find = (u, id) => u.projects.find((p) => p.id === id);
const cancelRow = (P) => [{ text: P.cancel, callback_data: 'pno' }];
const host = (url) => url.replace(/^https?:\/\//, '');
const slotOf = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 60; };

/* ================= xarajatlar ================= */
const CATRE = [
  ['ads', /reklam|реклам|\bads?\b|target|таргет|boost|promo/i],
  ['team', /hamkor|montaj|dizayn|freelanc|ishchi|yordamchi|партн|монтаж|дизайнер|\bteam\b|editor/i],
  ['host', /hosting|domen|domain|server|хостинг|домен|vps/i],
  ['tools', /dastur|programma|obuna|subscription|\bapp\b|софт|canva|capcut|chatgpt|figma/i],
];
const catGuess = (note) => (CATRE.find(([, re]) => re.test(note)) || ['other'])[0];
function parseExpense(text, u, presetPid) {
  const m = text.trim().match(/^(\d{1,3}(?:[\s.,]\d{3})+|\d+(?:[.,]\d+)?)(\s*(?:mln|млн|million|ming|тыс|k|m))?(?=\s|$)\s*(.*)$/is);
  if (!m) return null;
  const a = !m[2] && /^\d{1,3}(?:[\s.,]\d{3})+$/.test(m[1]) ? Number(m[1].replace(/[\s.,]/g, '')) : proj.payAmount(`${m[1]}${m[2] || ''}`.trim());
  if (!a) return null;
  const note = (m[3] || '').trim().slice(0, 100);
  let pid = presetPid || '';
  if (!pid && note) {
    const low = note.toLowerCase(), hit = [...u.projects].sort((x, y) => y.name.length - x.name.length).find((p) => low.includes(p.name.toLowerCase()));
    if (hit) pid = hit.id;
  }
  return S.cleanExpense({ id: S.newId(), a, d: S.todayISO(u.tz), cat: catGuess(note), note, pid, createdAt: Date.now(), updatedAt: Date.now() });
}
async function showExpenses(ctx, u) {
  const T = S.Tof(u), P = T.p, today = S.todayISO(u.tz), ym = today.slice(0, 7), [f, t] = S.monthRange(ym);
  const list = S.expensesIn(u, f, t).sort((a, b) => (a.d < b.d ? 1 : -1)), total = S.expenseSum(list), mname = T.months[Number(ym.slice(5)) - 1];
  let text = P.exTitle(mname, S.money(total));
  if (!list.length) text += `\n\n${P.exNone}`;
  else {
    const byCat = {};
    for (const x of list) byCat[x.cat] = (byCat[x.cat] || 0) + x.a;
    text += '\n\n' + Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${P.exCats[k]}: ${S.money(v)}`).join('\n');
    text += '\n\n' + list.slice(0, 8).map((x) => `• ${x.d.slice(5).replace('-', '.')} · ${S.money(x.a)}${x.note ? ' · ' + esc(x.note) : ''}`).join('\n');
  }
  const rows = list.slice(0, 6).map((x) => [{ text: `🗑 ${x.d.slice(5).replace('-', '.')} · ${S.money(x.a)}${x.note ? ' · ' + x.note : ''}`.slice(0, 60), callback_data: `xd:${x.id}` }]);
  rows.push([{ text: P.exAdd, callback_data: 'xa' }, { text: P.bIncome, callback_data: 'in:0' }]);
  return show(ctx, text, { inline_keyboard: rows });
}
async function saveExpense(chat, u, e) {
  const P = S.Tof(u).p, p = e.pid ? find(u, e.pid) : null;
  u.expenses.unshift(e);
  await send(chat, P.exSaved(S.money(e.a), P.exCats[e.cat], esc(e.note), p ? esc(p.name) : ''), { inline_keyboard: [[{ text: P.bExpenses, callback_data: 'xl:0' }]] });
}

/* ================= maqsad ================= */
async function showGoal(ctx, u) {
  const P = S.Tof(u).p, today = S.todayISO(u.tz), line = S.goalLine(u, today);
  const text = `${P.goTitle}\n\n${line || P.goNone}\n\n${P.goOwn}`;
  const mk = (n) => ({ text: `${Number(u.goal) === n * 1e6 ? '✔️ ' : ''}${n} mln`, callback_data: `gs:${n * 1e6}` });
  return show(ctx, text, { inline_keyboard: [[5, 10, 15].map(mk), [20, 30, 50].map(mk), [{ text: P.goOff, callback_data: 'gs:0' }, { text: P.bIncome, callback_data: 'in:0' }]] });
}
const setGoal = (u, n) => { u.goal = Math.max(0, Math.round(n)); u.goalAt = Date.now(); };

/* ================= sayt kuzatuvi ================= */
async function checkUrl(url) {
  const t0 = Date.now(), c = new AbortController(), to = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow', signal: c.signal, headers: { 'user-agent': 'ImproNotesMonitor/1.0' } });
    try { r.body && r.body.cancel(); } catch { /* ignore */ }
    return { ok: r.status < 500, code: r.status, ms: Date.now() - t0 };
  } catch (e) { return { ok: false, code: e && e.name === 'AbortError' ? 'timeout' : 'xato', ms: Date.now() - t0 }; } finally { clearTimeout(to); }
}
const RDAP_OK = /\.(com|net|org|io|dev|app|xyz|co|info|me|ai|site|online|store|tech)$/i;
async function lookupExpiry(url) {
  try {
    const h = new URL(url).hostname.toLowerCase().split('.').slice(-2).join('.');
    if (!RDAP_OK.test(h)) return '';
    const r = await fetch(`https://rdap.org/domain/${h}`, { redirect: 'follow', headers: { accept: 'application/rdap+json' } });
    if (!r.ok) return '';
    const j = await r.json();
    const ev = (j.events || []).find((e) => /expiration/i.test(e.eventAction));
    return ev && /^\d{4}-\d{2}-\d{2}/.test(ev.eventDate) ? ev.eventDate.slice(0, 10) : '';
  } catch { return ''; }
}
const sitesOf = (u) => u.projects.filter((p) => p.url);
const mins = (ms) => (ms >= 3600000 ? `${Math.round(ms / 360000) / 10} soat` : `${Math.max(1, Math.round(ms / 60000))} daqiqa`);
async function showSites(ctx, u) {
  const T = S.Tof(u), P = T.p, today = S.todayISO(u.tz), list = sitesOf(u);
  let text = P.monTitle(list.length);
  if (!list.length) text += `\n\n${P.monNone}`;
  else text += '\n\n' + list.map((p) => {
    const m = p.mon, dd = p.domExp ? S.daysBetween(today, p.domExp) : null;
    return P.monLine(m ? m.ok : null, esc(host(p.url)), [m && !m.ok ? `${m.code}` : '', dd !== null ? P.domLine(dd, p.domExp) : ''].filter(Boolean).join(' · '));
  }).join('\n');
  const rows = list.slice(0, 10).map((p) => [{ text: `🔄 ${host(p.url)}`.slice(0, 60), callback_data: `mc:${p.id}` }]);
  rows.push([{ text: P.backList, callback_data: 'pl:0' }]);
  return show(ctx, text, { inline_keyboard: rows });
}
async function setUrl(chat, u, p, raw) {
  const P = S.Tof(u).p, url = S.cleanUrl(raw);
  if (!url) return send(chat, P.urlBad, { inline_keyboard: [cancelRow(P)] });
  p.url = url; p.mon = undefined; p.updatedAt = Date.now(); u.state = null;
  const exp = await lookupExpiry(url);
  if (exp && !p.domExp) p.domExp = exp;
  const res = await checkUrl(url);
  await applyCheck(u, p, res, Date.now(), false);
  await send(chat, `${P.urlSaved(esc(host(url)))}\n${P.monChecking(esc(host(url)), res.ok, res.code, res.ms)}`, { inline_keyboard: [[{ text: `📂 ${p.name}`.slice(0, 60), callback_data: `pj:${p.id}` }]] });
}
// Tekshiruv natijasini yozadi. alert=true boʻlsa xabar yuboradi (cron), aks holda faqat holatni yangilaydi.
async function applyCheck(u, p, res, now, alert) {
  const P = S.Tof(u).p, m = p.mon || (p.mon = {}), was = m.ok;
  let sent = 0;
  m.ok = res.ok; m.code = res.code; m.at = now; m.ms = res.ms;
  const quiet = S.inQuiet(u, S.hhmmOfLocal(S.localNow(u.tz, now)));
  if (res.ok) {
    if (m.alerted && alert) { const r = await tg('sendMessage', { chat_id: u.chat, text: P.monUp(esc(host(p.url)), mins(now - (m.downSince || now))), parse_mode: 'HTML' }); if (r.ok) sent += 1; }
    m.alerted = false; m.downSince = 0; m.alertN = 0; m.alertAt = 0;
  } else {
    if (was !== false || !m.downSince) m.downSince = m.downSince || now;
    const due = !m.alerted || (m.alertN < 4 && now - (m.alertAt || 0) > 6 * 3600000);
    if (alert && due) {
      const r = await tg('sendMessage', { chat_id: u.chat, text: P.monDown(esc(host(p.url)), res.code), parse_mode: 'HTML', disable_notification: quiet, reply_markup: { inline_keyboard: [[{ text: P.bCheck, callback_data: `mc:${p.id}` }]] } });
      if (r.ok) sent += 1;
      m.alerted = true; m.alertN = (m.alertN || 0) + 1; m.alertAt = now;
    }
  }
  return sent;
}
async function monitor(u, now) {
  const P = S.Tof(u).p, loc = S.localNow(u.tz, now), minute = loc.getUTCMinutes(), today = S.isoOfLocal(loc), hour = loc.getUTCHours();
  let dirty = false, sent = 0, slow = false;
  for (const p of sitesOf(u).slice(0, 20)) {
    if (p.status === 'paused') continue;
    const slot = slotOf(p.id), m = p.mon || {};
    if (minute === slot && (!m.at || now - m.at > 45 * 60000)) {
      slow = true;
      let res = await checkUrl(p.url);
      if (!res.ok) res = await checkUrl(p.url); // tasodifiy uzilishni inkor qilish
      sent += await applyCheck(u, p, res, now, true); dirty = true;
    }
    // domen muddati: kuniga bir marta (06:xx), eslatma 30/7/1 kun
    const mm = p.mon || (p.mon = {});
    if (hour === 6 && minute === slot && mm.dAt !== today) {
      mm.dAt = today; dirty = true;
      slow = true;
      if (!p.domExp || mm.domAuto) { const e = await lookupExpiry(p.url); if (e) { p.domExp = e; mm.domAuto = true; } }
    }
    if (p.domExp && hour >= 9 && !S.inQuiet(u, S.hhmmOfLocal(loc))) {
      if (mm.dnFor !== p.domExp) { mm.dnFor = p.domExp; mm.dn = []; dirty = true; }
      const days = S.daysBetween(today, p.domExp), th = [1, 7, 30].find((x) => days <= x);
      if (th && days >= -3 && !(mm.dn || []).includes(th)) {
        mm.dn = [...(mm.dn || []), ...[1, 7, 30].filter((x) => x >= th)]; dirty = true;
        const r = await send(u.chat, P.domWarn(esc(host(p.url)), days, p.domExp)); if (r.ok) sent += 1;
      }
    }
  }
  return { dirty, sent, slow };
}

/* ================= zaxira ================= */
function buildBackup(u) {
  const strip = ({ r, sn, mon, ...x }) => x;
  return {
    app: 'impro-notes', v: 1, at: new Date().toISOString(), meetings: u.meetings.map(strip), projects: u.projects.map(strip), subs: u.subs.map(strip), services: u.services.map(strip), expenses: u.expenses,
    places: u.places || [], goal: u.goal || 0, lang: u.lang, tz: u.tz, remind: u.remind, lead: u.lead, quiet: u.quiet, digest: u.digest,
  };
}
async function sendBackup(chat, u) {
  const P = S.Tof(u).p, d = S.todayISO(u.tz);
  return fin.sendDoc(chat, `impro-zaxira-${d}.json`, JSON.stringify(buildBackup(u)), P.bkCaption(d), 'application/json');
}
async function restore(chat, u, doc) {
  const P = S.Tof(u).p;
  if (!doc || (doc.file_size || 0) > 2e6) return send(chat, P.bkBad);
  try {
    const f = await tg('getFile', { file_id: doc.file_id });
    if (!f.ok) return send(chat, P.bkBad);
    const r = await fetch(`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${f.result.file_path}`);
    const j = JSON.parse(await r.text());
    if (!j || j.app !== 'impro-notes' || !Array.isArray(j.meetings)) return send(chat, P.bkBad);
    const before = [u.meetings.length, u.projects.length, u.subs.length, u.expenses.length];
    S.mergeMeetings(u, j.meetings.slice(0, 1000), []);
    S.mergeProjects(u, (j.projects || []).slice(0, 300), []);
    S.mergeSubs(u, (j.subs || []).slice(0, 200), []);
    S.mergeExpenses(u, (j.expenses || []).slice(0, 1500), []);
    S.mergeServices(u, (j.services || []).slice(0, 500), []);
    if (!u.goal && Number(j.goal) > 0) setGoal(u, Number(j.goal));
    if (Array.isArray(j.places)) u.places = [...new Set([...(u.places || []), ...j.places.filter((x) => typeof x === 'string')])].slice(0, 50);
    const d = (a, b) => Math.max(0, b - a);
    await send(chat, P.bkRestored(d(before[0], u.meetings.length), d(before[1], u.projects.length), d(before[2], u.subs.length), d(before[3], u.expenses.length)));
  } catch { await send(chat, P.bkBad); }
}

/* ================= AI yordamchi ================= */
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const LANGNAME = { uz: 'Uzbek (Latin script, simple natural words)', ru: 'Russian', en: 'English' };
function aiPrompt(kind, p, extra, u) {
  const typeName = S.Tof(u).p.types[p.type];
  const ctx = `Project: "${p.name}". Client/business: ${p.client || 'unknown'}. Project type: ${typeName}.${extra ? ` Extra details: ${extra}.` : ''}`;
  if (kind === 'v') return `${ctx}\nWrite a 30-45 second Instagram Reels video script: numbered scenes with what is on screen and the voice-over line. Strong hook in the first 3 seconds, a clear call to action at the end. Add 3 caption/hashtag lines.`;
  if (kind === 's') return `${ctx}\nWrite website copy: SEO title (max 60 chars), meta description (max 155 chars), hero headline and subheadline, 3 benefit bullets, a short About paragraph, and the CTA button text.`;
  return `${ctx}\nWrite an Instagram post caption: a strong first-line hook, 3-5 short lines, a call to action, and 8 relevant hashtags.`;
}
async function aiRun(chat, u, system, prompt) {
  const P = S.Tof(u).p, today = S.todayISO(u.tz), AI = getAI();
  if (!AI) { await send(chat, P.aiFail); return null; }
  u.ai = u.ai && u.ai.d === today ? u.ai : { d: today, n: 0 };
  if (u.ai.n >= 30) { await send(chat, P.aiLimit); return null; }
  tg('sendChatAction', { chat_id: chat, action: 'typing' });
  try {
    const out = await AI.run(MODEL, { messages: [{ role: 'system', content: `${system} Reply in ${LANGNAME[u.lang] || LANGNAME.uz}. Be concise and practical, no preface, no markdown symbols like ** or ##.` }, { role: 'user', content: prompt }], max_tokens: 900 });
    u.ai.n += 1;
    const text = String((out && (out.response || out.result || '')) || '').trim();
    if (!text) { await send(chat, P.aiFail); return null; }
    console.log('ai ok', text.length);
    return text.slice(0, 3800);
  } catch (e) { console.error('ai', e.message); await send(chat, P.aiFail); return null; }
}
const SYS = 'You are a marketing and copywriting assistant for a freelancer in Uzbekistan who builds websites visible on Google, Telegram bots, and Instagram promo videos.';
async function genForProject(chat, u, kind, pid, extra) {
  const P = S.Tof(u).p, p = find(u, pid);
  if (!p) return send(chat, P.aiNone);
  const text = await aiRun(chat, u, SYS, aiPrompt(kind, p, extra, u));
  if (!text) return null;
  u.aiLast = { kind, pid, extra: extra || '' };
  return send(chat, esc(text), { inline_keyboard: [[{ text: P.aiAgain, callback_data: 'air:0' }, { text: `📂 ${p.name}`.slice(0, 40), callback_data: `pj:${p.id}` }]] });
}
const aiButtons = (p, P) => (p.type === 'video' ? [['v', P.aiBtnScript], ['i', P.aiBtnInsta]] : p.type === 'site' ? [['s', P.aiBtnSite], ['i', P.aiBtnInsta]] : [['i', P.aiBtnInsta]]);

/* ================= yoʻnaltirgichlar ================= */
async function onMessage(chat, u, cmd, args, text) {
  const P = S.Tof(u).p;
  if (cmd === '/xarajat' || cmd === '/expense') {
    if (!args) { u.state = { kind: 'exp' }; await send(chat, P.exPrompt, { inline_keyboard: [cancelRow(P)] }); return true; }
    const e = parseExpense(args, u);
    if (!e) { await send(chat, P.exBad); return true; }
    await saveExpense(chat, u, e); return true;
  }
  if (cmd === '/xarajatlar') { await showExpenses({ chat }, u); return true; }
  if (!cmd && u.state && u.state.kind === 'exp') {
    const e = text ? parseExpense(text, u, u.state.pid) : null;
    if (!e) { await send(chat, P.exBad, { inline_keyboard: [cancelRow(P)] }); return true; }
    u.state = null; await saveExpense(chat, u, e); return true;
  }
  if (cmd === '/maqsad' || cmd === '/goal') {
    if (args) { const a = proj.payAmount(args); if (a) { setGoal(u, a); await send(chat, P.goSetMsg(S.money(a))); } }
    await showGoal({ chat }, u); return true;
  }
  if (cmd === '/saytlar' || cmd === '/sayt' || cmd === '/sites') { await showSites({ chat }, u); return true; }
  if (!cmd && u.state && u.state.kind === 'purl') {
    const p = find(u, u.state.pid);
    if (!p) { u.state = null; await send(chat, P.aiNone); return true; }
    if (!text) { await send(chat, P.urlBad, { inline_keyboard: [cancelRow(P)] }); return true; }
    await setUrl(chat, u, p, text); return true;
  }
  if (cmd === '/zaxira' || cmd === '/backup') { await sendBackup(chat, u); return true; }
  if (cmd === '/ai') {
    if (!args) { await send(chat, P.aiFree); return true; }
    const out = await aiRun(chat, u, SYS, args);
    if (out) await send(chat, esc(out));
    return true;
  }
  if (!cmd && u.state && u.state.kind === 'ai') {
    const st = u.state; u.state = null;
    await genForProject(chat, u, st.k, st.pid, (text || '').slice(0, 300)); return true;
  }
  return false;
}
async function onCallback(ctx, u, act, a, b) {
  const P = S.Tof(u).p, chat = ctx.chat;
  if (act === 'xl') await showExpenses(ctx, u);
  else if (act === 'xa') { u.state = { kind: 'exp' }; await send(chat, P.exPrompt, { inline_keyboard: [cancelRow(P)] }); }
  else if (act === 'xp') { if (find(u, a)) { u.state = { kind: 'exp', pid: a }; await send(chat, P.exPrompt, { inline_keyboard: [cancelRow(P)] }); } }
  else if (act === 'xd') { u.expenses = u.expenses.filter((x) => x.id !== a); u.edeleted[a] = Date.now(); await showExpenses(ctx, u); return P.exDel; }
  else if (act === 'gl') await showGoal(ctx, u);
  else if (act === 'gs') { setGoal(u, Number(a) || 0); await showGoal(ctx, u); }
  else if (act === 'ml') await showSites(ctx, u);
  else if (act === 'mu') { if (find(u, a)) { u.state = { kind: 'purl', pid: a }; await send(chat, P.urlAsk, { inline_keyboard: [cancelRow(P)] }); } }
  else if (act === 'mx') { const p = find(u, a); if (p) { p.url = ''; p.mon = undefined; p.updatedAt = Date.now(); await send(chat, P.urlRemoved); } }
  else if (act === 'mc') {
    const p = find(u, a);
    if (p && p.url) { const res = await checkUrl(p.url); await applyCheck(u, p, res, Date.now(), false); await send(chat, P.monChecking(esc(host(p.url)), res.ok, res.code, res.ms)); }
  } else if (act === 'ai') { const p = find(u, b); if (p) { u.state = { kind: 'ai', k: a, pid: b }; await send(chat, P.aiAsk(esc(p.name)), { inline_keyboard: [[{ text: P.aiSkip, callback_data: 'ais:0' }], cancelRow(P)] }); } }
  else if (act === 'ais') { const st = u.state; if (st && st.kind === 'ai') { u.state = null; await genForProject(chat, u, st.k, st.pid, ''); } }
  else if (act === 'air') { const l = u.aiLast; if (l) await genForProject(chat, u, l.kind, l.pid, l.extra); }
  return '';
}
async function onDocument(chat, u, doc) {
  if (!doc || !/\.json$/i.test(doc.file_name || '')) return false;
  await restore(chat, u, doc); return true;
}

/* ================= cron ================= */
async function remind(u, now) {
  const P = S.Tof(u).p, loc = S.localNow(u.tz, now), hhmm = S.hhmmOfLocal(loc), today = S.isoOfLocal(loc);
  let dirty = false, sent = 0;
  // sayt kuzatuvi va domen muddati
  const mr = await monitor(u, now); dirty = dirty || mr.dirty; sent += mr.sent;
  const slow = mr.slow;
  // haftalik zaxira: dushanba, tanlangan vaqtdan keyingi 2 soat ichida
  const at = u.digest && u.digest.k;
  if (at && u.dsent.k !== today && S.weekdayIdx(today) === 0) {
    const since = S.toMin(hhmm) - S.toMin(at);
    if (since >= 0 && since <= 120) {
      u.dsent.k = today; dirty = true;
      if (u.meetings.length || u.projects.length || u.subs.length || u.expenses.length || u.services.length) { const r = await sendBackup(u.chat, u); if (r && r.ok) sent += 1; }
    }
  }
  return { dirty, sent, slow };
}

module.exports = { onMessage, onCallback, onDocument, remind, aiButtons, parseExpense, checkUrl, showExpenses, showGoal, buildBackup, ACTS: ['xl', 'xa', 'xp', 'xd', 'gl', 'gs', 'ml', 'mu', 'mx', 'mc', 'ai', 'ais', 'air'] };
