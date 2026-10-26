'use strict';
const S = require('./_shared');

const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });
const view = (u) => ({
  ok: true, meetings: u.meetings.map(({ r, sn, g, ...m }) => ({ ...m, guests: g ? g.length : 0 })),
  lang: u.lang, remind: u.remind, lead: u.lead, places: u.places || [], placesAt: u.placesAt || 0, tz: u.tz,
});

exports.handler = async (event) => {
  const initData = event.headers['x-telegram-init-data'] || '';
  const user = S.checkInitData(initData);
  if (!user) return json(401, { ok: false, error: 'unauthorized' });
  const st = S.openStore(event);
  const u = await S.getUser(st, user.id);
  if (event.httpMethod === 'GET') return json(200, view(u));
  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'POST') return json(405, { ok: false });
  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false }); }

  if (b.action === 'cal') {
    if (!u.calToken) {
      u.calToken = S.newId().replace(/-/g, '').slice(0, 24);
      await st.set(`cal/${u.calToken}`, u.id);
      await S.saveUser(st, u);
    }
    return json(200, { ok: true, token: u.calToken });
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
  S.mergeMeetings(u, Array.isArray(b.meetings) ? b.meetings.slice(0, 500) : [], Array.isArray(b.deleted) ? b.deleted.filter((x) => typeof x === 'string').slice(0, 500) : []);
  await S.saveUser(st, u);
  return json(200, view(u));
};
