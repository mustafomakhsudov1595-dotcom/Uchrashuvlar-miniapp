'use strict';
const S = require('./_shared');

const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });
const view = (u) => ({ ok: true, meetings: u.meetings.map(({ r, ...m }) => m), remind: u.remind, lead: u.lead });

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
  if (Number.isFinite(b.tz) && Math.abs(b.tz) <= 14 * 60) u.tz = Math.round(b.tz);
  u.name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  u.chat = String(user.id);
  S.mergeMeetings(u, Array.isArray(b.meetings) ? b.meetings.slice(0, 500) : [], Array.isArray(b.deleted) ? b.deleted.filter((x) => typeof x === 'string').slice(0, 500) : []);
  await S.saveUser(st, u);
  return json(200, view(u));
};
