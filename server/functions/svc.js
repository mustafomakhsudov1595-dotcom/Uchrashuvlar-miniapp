'use strict';
// Servis: tayyor saytlar — egasining raqami, sayt va Claude sessiyasi havolasi, 1 yillik xizmat muddati
const S = require('./_shared');
const seo = require('./seo');
const ext = require('./ext');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const show = (ctx, text, markup) => (ctx.mid
  ? tg('editMessageText', { chat_id: ctx.chat, message_id: ctx.mid, text, parse_mode: 'HTML', reply_markup: markup || { inline_keyboard: [] }, disable_web_page_preview: true })
  : send(ctx.chat, text, markup));
const find = (u, id) => u.services.find((x) => x.id === id);
const cancelRow = (P) => [{ text: P.cancel, callback_data: 'pno' }];
const host = (url) => url.replace(/^https?:\/\//, '');
const fmtDate = (iso) => `${iso.slice(8)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

/* ---------- Claude havolasi nazorati ---------- */
const CLAUDE_RE = /^https:\/\/(?:[\w-]+\.)?claude\.(?:ai|com)\/\S+/i;
async function checkClaude(url) {
  if (!url) return 'missing';
  if (!CLAUDE_RE.test(url)) return 'format';
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; ImproNotesLinks/1.0)' }, signal: AbortSignal.timeout(6000) });
    try { r.body && r.body.cancel(); } catch { /* ignore */ }
    return r.status === 404 || r.status === 410 ? 'dead' : r.status >= 500 ? 'error' : 'ok';
  } catch { return 'error'; }
}
const CLKEY = { ok: 'clOk', missing: 'clMissing', format: 'clBad', dead: 'clDead', error: 'clErr' };
async function checkAll(u) {
  const list = u.services.slice(0, 25), now = Date.now();
  const res = await Promise.all(list.map((x) => checkClaude(x.claudeUrl)));
  list.forEach((x, i) => { x.cl = { s: res[i], at: now }; });
  return list.map((x, i) => ({ x, s: res[i] }));
}
const hasLinkProblem = (x) => !x.claudeUrl || !CLAUDE_RE.test(x.claudeUrl) || (x.cl && (x.cl.s === 'dead' || x.cl.s === 'error'));

/* ---------- matn va tugmalar ---------- */
function cardText(x, u, now = Date.now()) {
  const P = S.Tof(u).p, today = S.todayISO(u.tz, now), d = S.serviceDays(x, today);
  let t = `🛠 <b>${esc(x.name)}</b>`;
  if (x.client) t += `\n👤 ${esc(x.client)}`;
  if (x.phone) t += `${x.client ? ' · ' : '\n'}📞 ${esc(x.phone)}`;
  if (x.url) t += `\n🌐 ${esc(host(x.url))}`;
  t += `\n✅ ${P.svDoneLbl}: ${fmtDate(x.doneAt)}\n${d < 0 ? '🔴' : d <= 30 ? '🟠' : '🟢'} ${P.svSvcLbl}: <b>${P.svLeft(d)}</b> (${P.svEndLbl} ${fmtDate(S.serviceEnd(x))})`;
  t += `\n🤖 Claude: ${!x.claudeUrl ? P.clMissing : !CLAUDE_RE.test(x.claudeUrl) ? P.clBad : x.cl ? P[CLKEY[x.cl.s]] : P.clNone}`;
  if (x.seo) t += `\n🔎 SEO: <b>${x.seo.score}/100</b> · ${P.seoAgo(S.daysBetween(S.isoOfLocal(S.localNow(u.tz, x.seo.at)), today))}`;
  if (x.notes) t += `\n📝 ${esc(x.notes)}`;
  const chg = (x.changes || []).slice(-3);
  if (chg.length) t += `\n\n${P.chgLast}\n` + chg.map((c) => `• ${esc(c.text)} <i>(${c.d.slice(5).replace('-', '.')})</i>`).join('\n');
  const reqs = x.requests.slice(-6);
  if (reqs.length) t += `\n\n${P.svReqLbl}\n` + reqs.map((r) => `${r.done ? '✅' : '⬜️'} ${esc(r.text)} <i>(${r.d.slice(5).replace('-', '.')})</i>`).join('\n');
  return t;
}
function cardMarkup(x, u) {
  const P = S.Tof(u).p, rows = [];
  const links = [];
  if (x.url) links.push({ text: P.bSvSite, url: x.url });
  if (x.claudeUrl) links.push({ text: P.bSvClaude, url: x.claudeUrl });
  if (links.length) rows.push(links);
  const setRow = [];
  if (!x.claudeUrl) setRow.push({ text: P.bSvSetClaude, callback_data: `vk:${x.id}:c` });
  if (!x.url) setRow.push({ text: P.bSvSetSite, callback_data: `vk:${x.id}:s` });
  if (setRow.length) rows.push(setRow);
  const openReqs = x.requests.map((r, i) => ({ r, i })).filter((e) => !e.r.done).slice(0, 5);
  for (const e of openReqs) rows.push([{ text: `⬜️ ${e.r.text}`.slice(0, 50), callback_data: `vr:${x.id}:${e.i}` }, { text: P.bSvPrompt, callback_data: `vg:${x.id}:${e.i}` }]);
  if (x.url) rows.push([{ text: P.bSvSeo, callback_data: `vs:${x.id}` }]);
  rows.push([{ text: P.bSvHist, callback_data: `vh:${x.id}` }, { text: P.bSvChg, callback_data: `vn:${x.id}` }, { text: P.bMsg, callback_data: `mg:${x.id}` }]);
  rows.push([...(x.phone ? [{ text: P.bSvPhone, callback_data: `vc:${x.id}` }] : []), { text: P.bSvReq, callback_data: `vq:${x.id}` }, { text: P.bSvDel, callback_data: `vx:${x.id}` }]);
  rows.push([{ text: P.back, callback_data: 'vl:0' }, S.appBtn(S.Tof(u).openAppShort, '?tab=projects&view=service')]);
  return { inline_keyboard: rows };
}
async function showCard(ctx, u, id) {
  const x = find(u, id);
  if (!x) return showList(ctx, u, '');
  return show(ctx, cardText(x, u), cardMarkup(x, u));
}
async function showList(ctx, u, q) {
  const P = S.Tof(u).p, today = S.todayISO(u.tz), list = S.findServices(u, q).sort((a, b) => S.serviceDays(a, today) - S.serviceDays(b, today));
  if (q && list.length === 1) return showCard(ctx, u, list[0].id);
  const active = u.services.filter((x) => S.serviceDays(x, today) >= 0).length;
  let text = P.svTitle(u.services.length, active);
  if (q && !list.length) text += `\n\n${P.svSearchNone(esc(q))}`;
  else if (!list.length) text += `\n\n${P.svNone}`;
  else text += '\n\n' + list.slice(0, 15).map((x) => { const d = S.serviceDays(x, today); return `${d < 0 ? '🔴' : d <= 30 ? '🟠' : '🟢'} <b>${esc(x.name)}</b>${x.client ? ' · ' + esc(x.client) : ''}${hasLinkProblem(x) ? ` ${P.svNoLinkTag}` : ''}\n   ${P.svLeft(d)}`; }).join('\n');
  const rows = list.slice(0, 12).map((x) => [{ text: `🛠 ${x.name}${x.client ? ' · ' + x.client : ''}`.slice(0, 60), callback_data: `vj:${x.id}` }]);
  if (u.services.length) rows.push([{ text: P.bSvLinks, callback_data: 'vz:0' }]);
  rows.push([{ text: P.subAdd, callback_data: 'va:0' }, { text: P.backList, callback_data: 'pl:0' }]);
  return show(ctx, text, { inline_keyboard: rows });
}

/* ---------- erkin matndan servis ajratish ---------- */
const DATE_TOK = /^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/;
const isPhone = (p) => /^\+?[\d\s()-]{9,20}$/.test(p) && S.digitsOf(p).length >= 9 && S.digitsOf(p).length <= 14;
const isUrlLike = (p) => /^https?:\/\/\S+$/i.test(p) || /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?$/i.test(p);
function parseService(text, u) {
  let parts = text.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
  if (parts.length < 3 && /\s/.test(text.trim())) parts = text.split(/[\s,;\n]+/).filter(Boolean);
  const out = { phone: '', url: '', claudeUrl: '', doneAt: S.todayISO(u.tz) }, free = [];
  for (const p of parts) {
    const dm = p.match(DATE_TOK);
    if (/^https?:\/\/\S*claude\.ai\S*$/i.test(p) || /claude\.ai\//i.test(p)) out.claudeUrl = p;
    else if (dm && +dm[1] >= 1 && +dm[1] <= 31 && +dm[2] >= 1 && +dm[2] <= 12) {
      const today = S.todayISO(u.tz); let y = dm[3] ? +dm[3] : +today.slice(0, 4); if (y < 100) y += 2000;
      let iso = `${y}-${String(dm[2]).padStart(2, '0')}-${String(dm[1]).padStart(2, '0')}`;
      if (!dm[3] && iso > today) iso = `${y - 1}-${iso.slice(5)}`; // kiritilmagan yil: kelajak sana boʻlmasin
      out.doneAt = iso;
    } else if (isPhone(p)) out.phone = p.replace(/\s+/g, ' ');
    else if (isUrlLike(p)) out.url = p;
    else free.push(p);
  }
  if (!free.length) return null;
  return S.cleanService({ id: S.newId(), name: free[0], client: free[1] || '', phone: out.phone, url: out.url, claudeUrl: out.claudeUrl, doneAt: out.doneAt, months: 12, notes: free.slice(2).join(', '), createdAt: Date.now(), updatedAt: Date.now() });
}

/* ---------- yoʻnaltirgichlar ---------- */
async function onMessage(chat, u, cmd, args, text) {
  const P = S.Tof(u).p;
  if (cmd === '/servis' || cmd === '/service' || cmd === '/saytim') {
    if (/^(qosh|qoʻsh|qo'sh|add|new|yangi)$/i.test(args)) { u.state = { kind: 'svc' }; await send(chat, P.svAsk, { inline_keyboard: [cancelRow(P)] }); return true; }
    if (args && /[,\n]/.test(args)) {
      const x = parseService(args, u);
      if (!x) { await send(chat, P.svBad); return true; }
      u.services.push(x); await send(chat, P.svSaved); await showCard({ chat }, u, x.id); return true;
    }
    await showList({ chat }, u, args); return true;
  }
  if (!cmd && u.state && u.state.kind === 'svc') {
    const x = text ? parseService(text, u) : null;
    if (!x) { await send(chat, P.svBad, { inline_keyboard: [cancelRow(P)] }); return true; }
    u.state = null; u.services.push(x); await send(chat, P.svSaved); await showCard({ chat }, u, x.id); return true;
  }
  if (!cmd && u.state && u.state.kind === 'svreq') {
    const x = find(u, u.state.id); u.state = null;
    if (!x || !text) { await send(chat, P.svBad); return true; }
    x.requests.push({ id: S.newId(), d: S.todayISO(u.tz), text: text.slice(0, 200), done: false }); x.updatedAt = Date.now();
    await send(chat, P.svReqSaved); await showCard({ chat }, u, x.id); return true;
  }
  if (!cmd && u.state && u.state.kind === 'svchg') {
    const x = find(u, u.state.id); u.state = null;
    if (!x || !text) { await send(chat, P.svBad); return true; }
    x.changes.push({ id: S.newId(), d: S.todayISO(u.tz), text: text.slice(0, 200), rid: '' }); x.updatedAt = Date.now();
    await send(chat, P.chgSaved); await showCard({ chat }, u, x.id); return true;
  }
  if (!cmd && u.state && u.state.kind === 'svlink') {
    const x = find(u, u.state.id), f = u.state.field, url = S.cleanUrl(text || '');
    if (!x) { u.state = null; return true; }
    if (!url) { await send(chat, P.svLinkBad, { inline_keyboard: [cancelRow(P)] }); return true; }
    u.state = null; x[f] = url; x.updatedAt = Date.now();
    await send(chat, P.svLinkSaved); await showCard({ chat }, u, x.id); return true;
  }
  return false;
}
async function onCallback(ctx, u, act, a, b) {
  const P = S.Tof(u).p, chat = ctx.chat;
  if (act === 'vl') await showList(ctx, u, '');
  else if (act === 'vj') await showCard(ctx, u, a);
  else if (act === 'va') { u.state = { kind: 'svc' }; await send(chat, P.svAsk, { inline_keyboard: [cancelRow(P)] }); }
  else if (act === 'vc') { const x = find(u, a); if (x && x.phone) await tg('sendContact', { chat_id: chat, phone_number: `+${S.digitsOf(x.phone)}`, first_name: x.client || x.name }); }
  else if (act === 'vq') { if (find(u, a)) { u.state = { kind: 'svreq', id: a }; await send(chat, P.svReqAsk, { inline_keyboard: [cancelRow(P)] }); } }
  else if (act === 'vk') { const x = find(u, a); if (x) { const field = b === 's' ? 'url' : 'claudeUrl'; u.state = { kind: 'svlink', id: a, field }; await send(chat, P.svLinkAsk(b === 's' ? P.bSvSite.replace(/^\S+\s/, '') : 'Claude'), { inline_keyboard: [cancelRow(P)] }); } }
  else if (act === 'vs') {
    const x = find(u, a);
    if (!x || !x.url) { await send(chat, P.seoNeedUrl); return ''; }
    tg('sendChatAction', { chat_id: chat, action: 'typing' });
    const res = await seo.audit(x.url);
    if (!res) { await send(chat, P.seoFail); return ''; }
    const bad = seo.badList(res.items);
    x.seo = { score: res.score, at: Date.now(), bad };
    const lines = res.items.length === 1 && !res.items[0].ok ? [] : seo.lines(u.lang || 'uz', res.items);
    let text = P.seoTitle(esc(host(x.url)), res.score);
    text += lines.length ? '\n\n' + lines.map((l) => `${l.ok ? '✅' : '⚠️'} ${esc(l.text)}`).join('\n') : `\n\n${P.seoFail}`;
    if (lines.length && !bad.length) text += `\n\n${P.seoOk}`;
    const rows = [];
    if (bad.length && lines.length) rows.push([{ text: P.bSeoFix, callback_data: `vf:${x.id}` }]);
    rows.push([{ text: P.bSeoAgain, callback_data: `vs:${x.id}` }, { text: P.back, callback_data: `vj:${x.id}` }]);
    await send(chat, text, { inline_keyboard: rows });
  } else if (act === 'vf') {
    const x = find(u, a);
    if (!x || !x.seo || !x.seo.bad.length) { await send(chat, P.seoOk); return ''; }
    const rows = x.claudeUrl ? [[{ text: P.bSvClaude, url: x.claudeUrl }]] : [];
    await send(chat, `${P.promptReady}\n\n<pre>${esc(seo.fixPrompt(u.lang || 'uz', x.url, x.seo.bad))}</pre>`, rows.length ? { inline_keyboard: rows } : undefined);
  } else if (act === 'vg') {
    const x = find(u, a), r = x && x.requests[Number(b)];
    if (!r) return '';
    tg('sendChatAction', { chat_id: chat, action: 'typing' });
    const ai = await ext.aiCall(u, seo.REQ_SYSTEM, `Site: ${x.name}${x.url ? ` (${x.url})` : ''}. ${x.notes ? `Notes: ${x.notes}. ` : ''}Client request: ${r.text}`);
    const body = ai.text || seo.requestPrompt(u.lang || 'uz', x, r.text);
    const rows = x.claudeUrl ? [[{ text: P.bSvClaude, url: x.claudeUrl }]] : [];
    await send(chat, `${P.promptReady} ${ai.text ? P.promptAi : P.promptTpl}\n\n<pre>${esc(body)}</pre>`, rows.length ? { inline_keyboard: rows } : undefined);
  } else if (act === 'vr') {
    const x = find(u, a), r = x && x.requests[Number(b)];
    if (r && !r.done) { r.done = true; x.changes.push({ id: S.newId(), d: S.todayISO(u.tz), text: r.text, rid: r.id }); x.updatedAt = Date.now(); }
    await showCard(ctx, u, a);
  } else if (act === 'vn') { if (find(u, a)) { u.state = { kind: 'svchg', id: a }; await send(chat, P.chgAsk, { inline_keyboard: [cancelRow(P)] }); } }
  else if (act === 'vh') {
    const x = find(u, a);
    if (!x) return '';
    const list = [...x.changes].reverse();
    let text = P.histTitle(esc(x.name), list.length);
    text += list.length ? '\n\n' + list.slice(0, 25).map((c) => `• <b>${fmtDate(c.d)}</b> — ${esc(c.text)}`).join('\n') : `\n\n${P.histNone}`;
    const rows = [];
    if (list.length) rows.push([{ text: P.bHistReport, callback_data: `vhr:${x.id}` }]);
    rows.push([{ text: P.bSvChg, callback_data: `vn:${x.id}` }, { text: P.back, callback_data: `vj:${x.id}` }]);
    await show(ctx, text, { inline_keyboard: rows });
  } else if (act === 'vhr') {
    const x = find(u, a);
    if (!x) return '';
    const from = S.addDaysISO(S.todayISO(u.tz), -90), list = x.changes.filter((c) => c.d >= from);
    const body = list.length ? P.histReport(x.name, list.map((c, i) => `${i + 1}. ${fmtDate(c.d)} — ${c.text}`).join('\n'), 90) : P.histReportNone;
    await send(chat, `${P.msgCopy}\n\n<pre>${esc(body)}</pre>`, { inline_keyboard: [[{ text: P.back, callback_data: `vh:${x.id}` }]] });
  } else if (act === 'vz') {
    tg('sendChatAction', { chat_id: chat, action: 'typing' });
    const res = await checkAll(u);
    const bad = res.filter((r) => r.s !== 'ok');
    let text = `${P.linksTitle(res.length)}\n\n` + res.map(({ x, s }) => `${esc(x.name)} — ${P[CLKEY[s]]}`).join('\n');
    text += bad.length ? `\n\n<i>${P.linksNote}</i>` : `\n\n${P.linksAllOk}\n<i>${P.linksNote}</i>`;
    const rows = bad.slice(0, 10).map(({ x }) => [{ text: `🛠 ${x.name}`.slice(0, 60), callback_data: `vj:${x.id}` }]);
    rows.push([{ text: P.back, callback_data: 'vl:0' }]);
    await send(chat, text, { inline_keyboard: rows });
  }
  else if (act === 'vx') { const x = find(u, a); if (x) await show(ctx, `${P.svDelAsk}\n\n<b>${esc(x.name)}</b>`, { inline_keyboard: [[{ text: P.delYes, callback_data: `vxy:${a}` }, { text: P.no, callback_data: `vj:${a}` }]] }); }
  else if (act === 'vxy') { u.services = u.services.filter((x) => x.id !== a); u.svdeleted[a] = Date.now(); await show(ctx, P.svDeleted, { inline_keyboard: [[{ text: P.back, callback_data: 'vl:0' }]] }); }
  else if (act === 'vp') {
    const p = u.projects.find((x) => x.id === a);
    if (p) {
      const x = S.cleanService({ id: S.newId(), name: p.name, client: p.client, phone: p.contact, url: p.url, claudeUrl: '', doneAt: S.todayISO(u.tz), months: 12, createdAt: Date.now(), updatedAt: Date.now() });
      if (x) { u.services.push(x); await send(chat, P.svFromProjDone); await showCard({ chat }, u, x.id); }
    }
  }
  return '';
}

/* ---------- eslatma: servis tugashiga 30 / 7 / 0 kun ---------- */
async function remind(u, now) {
  const P = S.Tof(u).p, loc = S.localNow(u.tz, now), hhmm = S.hhmmOfLocal(loc), today = S.isoOfLocal(loc);
  let dirty = false, sent = 0;
  if (u.services.length && S.weekdayIdx(today) === 0 && hhmm >= '11:00' && !S.inQuiet(u, hhmm) && u.dsent.cl !== today) {
    u.dsent.cl = today; dirty = true;
    const bad = (await checkAll(u)).filter((r) => r.s !== 'ok');
    if (bad.length) {
      const res = await send(u.chat, `${P.linksWeekly(bad.length)}\n\n${bad.map(({ x, s }) => `${esc(x.name)} — ${P[CLKEY[s]]}`).join('\n')}`, { inline_keyboard: bad.slice(0, 8).map(({ x }) => [{ text: `🛠 ${x.name}`.slice(0, 60), callback_data: `vj:${x.id}` }]) });
      if (res.ok) sent += 1;
    }
  }
  if (!u.remind || S.inQuiet(u, hhmm) || hhmm < '10:00') return { dirty, sent };
  for (const x of u.services) {
    const d = S.serviceDays(x, today), th = [0, 7, 30].find((v) => d <= v);
    if (th === undefined || d < -3) continue;
    const r = x.r || (x.r = {}), key = `${S.serviceEnd(x)}:${th}`;
    if ((r.done || []).includes(key)) continue;
    r.done = [...(r.done || []).filter((k) => k.startsWith(S.serviceEnd(x))), key]; dirty = true;
    const res = await send(u.chat, P.svRem(esc(x.name), esc(x.client), d, fmtDate(S.serviceEnd(x))), cardMarkup(x, u));
    if (res.ok) sent += 1;
  }
  return { dirty, sent };
}

module.exports = { onMessage, onCallback, remind, parseService, cardText, checkClaude, CLAUDE_RE, ACTS: ['vl', 'vj', 'va', 'vc', 'vq', 'vk', 'vr', 'vx', 'vxy', 'vp', 'vs', 'vf', 'vg', 'vh', 'vhr', 'vn', 'vz'] };
