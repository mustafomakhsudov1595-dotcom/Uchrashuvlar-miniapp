'use strict';
const S = require('./_shared');
const seo = require('./seo');
const ext = require('./ext');
const msgs = require('./msgs');
const svc = require('./svc');

const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });
const view = (u) => ({
  ok: true, meetings: u.meetings.map(({ r, sn, g, ...m }) => ({ ...m, guests: g ? g.length : 0 })),
  projects: (u.projects || []).map(({ r, ...p }) => p), subs: (u.subs || []).map(({ r, ...x }) => x), expenses: u.expenses || [], services: (u.services || []).map(({ r, ...x }) => x), payables: (u.payables || []).map(({ r, ...x }) => x), ws: u.ws ? { login: u.wsLogin || '' } : null, goal: u.goal || 0, goalAt: u.goalAt || 0, bal: u.bal || null, balAt: u.balAt || 0, lang: u.lang, remind: u.remind, lead: u.lead, places: u.places || [], placesAt: u.placesAt || 0, tz: u.tz,
});

exports.handler = async (event) => {
  const initData = event.headers['x-telegram-init-data'] || '';
  const user = S.checkInitData(initData);
  if (!user) return json(401, { ok: false, error: 'unauthorized' });
  const st = S.openStore(event);
  if (!(await S.isAllowed(st, user.id))) return json(403, { ok: false, error: 'closed' });
  await S.loadAdmins(st);
  const u = await S.getUser(st, user.id);
  const fx = await S.getRate();
  if (event.httpMethod === 'GET') return S.needLogin(u) ? json(401, { ok: false, error: 'login' }) : json(200, { ...view(u), fx });
  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'POST') return json(405, { ok: false });
  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false }); }

  if (b.action === 'login') { // mini ilovada login/parol bilan kirish
    const r = await require('./ws').tryLogin(st, u, String(b.login || '').slice(0, 40), String(b.pass || '').slice(0, 100));
    if (!r.ok) return json(r.error === 'lock' ? 429 : 401, { ok: false, error: r.error === 'already' ? 'already' : r.error });
    await S.saveUser(st, u);
    return json(200, { ok: true, login: r.w.login });
  }
  if (b.action === 'logout') {
    if (u.ws) { await require('./ws').detach(st, u); await S.saveUser(st, u); }
    return json(200, { ok: true });
  }
  if (S.needLogin(u)) return json(401, { ok: false, error: 'login' });

  if (b.action === 'cal') {
    if (!u.calToken) {
      u.calToken = S.newId().replace(/-/g, '').slice(0, 24);
      await st.set(`cal/${u.calToken}`, u.id);
      await S.saveUser(st, u);
    }
    return json(200, { ok: true, token: u.calToken });
  }

  if (b.action === 'tpl') {
    const r = msgs.build(u, String(b.kind || ''), String(b.id || ''), String(b.lang || u.lang || 'uz'));
    if (!r) return json(404, { ok: false, error: 'not found' });
    return json(200, r.empty ? { ok: true, empty: true } : { ok: true, text: r.text, phone: r.phone, lang: r.lang });
  }
  if (b.action === 'linkcheck') {
    const x = u.services.find((k) => k.id === String(b.id || ''));
    if (!x) return json(404, { ok: false, error: 'not found' });
    const st2 = await svc.checkClaude(x.claudeUrl);
    x.cl = { s: st2, at: Date.now() };
    await S.saveUser(st, u);
    return json(200, { ok: true, status: st2 });
  }
  if (b.action === 'seo') {
    const x = u.services.find((k) => k.id === String(b.id || ''));
    if (!x || !x.url) return json(404, { ok: false, error: 'no url' });
    const res = await seo.audit(x.url);
    if (!res) return json(400, { ok: false, error: 'bad url' });
    const bad = seo.badList(res.items);
    x.seo = { score: res.score, at: Date.now(), bad };
    await S.saveUser(st, u);
    const down = res.items.length === 1 && !res.items[0].ok;
    return json(200, { ok: true, down, score: res.score, at: x.seo.at, lines: down ? [] : seo.lines(u.lang || 'uz', res.items), prompt: bad.length && !down ? seo.fixPrompt(u.lang || 'uz', x.url, bad) : '' });
  }
  if (b.action === 'sprompt') {
    const x = u.services.find((k) => k.id === String(b.id || '')), r = x && x.requests.find((q) => q.id === String(b.rid || ''));
    if (!r) return json(404, { ok: false, error: 'not found' });
    const ai = await ext.aiCall(u, seo.REQ_SYSTEM, `Site: ${x.name}${x.url ? ` (${x.url})` : ''}. ${x.notes ? `Notes: ${x.notes}. ` : ''}Client request: ${r.text}`);
    await S.saveUser(st, u);
    return json(200, { ok: true, ai: Boolean(ai.text), text: ai.text || seo.requestPrompt(u.lang || 'uz', x, r.text) });
  }

  if (b.action === 'tasks' || b.action === 'taskadd' || b.action === 'taskdone' || b.action === 'taskdel') {
    const T = require('./tasks');
    let err = '';
    if (b.action === 'taskadd') {
      const text = String(b.text || '').trim().slice(0, 300);
      if (!text) return json(400, { ok: false, error: 'text' });
      await T.addTask(st, u, { text, to: String(b.to || u.id), due: /^\d{4}-\d{2}-\d{2}$/.test(b.due) ? b.due : '', time: /^\d{2}:\d{2}$/.test(b.time) ? b.time : '' });
    } else if (b.action === 'taskdone') { const r = await T.completeTask(st, u, String(b.id || '')); if (r === 'denied') err = 'denied'; }
    else if (b.action === 'taskdel') { if (T.removeTask(u, String(b.id || '')) === 'denied') err = 'denied'; }
    if (err) return json(403, { ok: false, error: err });
    if (b.action !== 'tasks') await S.saveUser(st, u);
    return json(200, { ok: true, me: String(u.id), members: await T.members(st, u), tasks: (u.tasks || []).slice(0, 200).map(({ r, ...x }) => x) });
  }

  if (b.action === 'leads') {
    if (!S.isAdmin(user.id)) return json(403, { ok: false, error: 'admin' });
    const leads = await require('./ig').recentLeads(st, 60);
    return json(200, { ok: true, leads: leads.filter((l) => !l.spam).map((l) => ({ id: l.id, name: l.name, username: l.username, intent: l.intent, phone: l.phone, hot: l.hot, handoff: l.handoff, last: l.last, first: l.first, n: l.n, msgs: l.msgs.slice(-8) })) });
  }

  if (b.action === 'report') {
    const link = await S.reportLink(st, u, String(b.id || ''), b.revoke === true);
    if (link === null) return json(404, { ok: false, error: 'not found' });
    await S.saveUser(st, u);
    return json(200, { ok: true, link });
  }

  if (b.action === 'invite') {
    const m = u.meetings.find((x) => x.id === b.id);
    if (!m) return json(404, { ok: false, error: 'not found' });
    const tok = S.newId().replace(/-/g, '').slice(0, 14);
    await st.setJSON(`invite/${tok}`, { owner: u.id, mid: m.id, exp: Date.now() + 30 * 86400000 });
    return json(200, { ok: true, link: `https://t.me/${S.BOT_USER()}?start=j_${tok}`, text: m.name });
  }

  if (Number.isFinite(b.tz) && Math.abs(b.tz) <= 14 * 60) { u.tzApp = Math.round(b.tz); if (!u.tzManual) u.tz = u.tzApp; }
  if (S.LANGS.includes(b.lang)) u.lang = b.lang;
  u.name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  u.chat = String(user.id);
  if (Array.isArray(b.places) && Number(b.placesAt) > (u.placesAt || 0)) {
    u.places = b.places.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim().slice(0, 120)).slice(0, 50);
    u.placesAt = Number(b.placesAt);
  }
  S.mergeProjects(u, Array.isArray(b.projects) ? b.projects.slice(0, 300) : [], Array.isArray(b.pdeleted) ? b.pdeleted.filter((x) => typeof x === 'string').slice(0, 300) : []);
  S.mergeSubs(u, Array.isArray(b.subs) ? b.subs.slice(0, 200) : [], Array.isArray(b.sdeleted) ? b.sdeleted.filter((x) => typeof x === 'string').slice(0, 200) : []);
  S.mergeExpenses(u, Array.isArray(b.expenses) ? b.expenses.slice(0, 1500) : [], Array.isArray(b.edeleted) ? b.edeleted.filter((x) => typeof x === 'string').slice(0, 500) : []);
  if (Number.isFinite(b.balAt) && b.balAt > (u.balAt || 0)) { u.bal = S.cleanBal(b.bal); u.balAt = b.balAt; }
  if (Number.isFinite(b.goalAt) && b.goalAt > (u.goalAt || 0) && Number.isFinite(b.goal) && b.goal >= 0) { u.goal = Math.round(b.goal); u.goalAt = b.goalAt; }
  S.mergeServices(u, Array.isArray(b.services) ? b.services.slice(0, 500) : [], Array.isArray(b.svdeleted) ? b.svdeleted.filter((x) => typeof x === 'string').slice(0, 500) : []);
  S.mergePayables(u, Array.isArray(b.payables) ? b.payables.slice(0, 500) : [], Array.isArray(b.pvdeleted) ? b.pvdeleted.filter((x) => typeof x === 'string').slice(0, 500) : []);
  S.mergeMeetings(u, Array.isArray(b.meetings) ? b.meetings.slice(0, 500) : [], Array.isArray(b.deleted) ? b.deleted.filter((x) => typeof x === 'string').slice(0, 500) : []);
  await S.saveUser(st, u);
  return json(200, { ...view(u), fx });
};
