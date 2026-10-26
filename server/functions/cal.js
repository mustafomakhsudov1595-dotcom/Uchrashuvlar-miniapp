'use strict';
// Kalendar obunasi: /api/cal/<kalit>.ics — Apple / Google Calendar'ga ulanadi va o'zi yangilanib turadi.
const S = require('./_shared');

const esc = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function fold(line) {
  const out = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 73) {
    let cut = 73;
    while (Buffer.byteLength(rest.slice(0, cut)) > 73) cut -= 1;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const seg = decodeURIComponent(String(event.path || '').split('/').pop() || '');
  const token = String(q.token || seg || '').replace(/\.ics$/i, '');
  if (!/^[a-z0-9]{10,40}$/i.test(token)) return { statusCode: 404, body: 'not found' };
  const st = S.openStore(event);
  const uid = await st.get(`cal/${token}`);
  if (!uid) return { statusCode: 404, body: 'not found' };
  const u = await S.getUser(st, uid);
  const only = q.m;
  const list = u.meetings.filter((m) => m.status !== 'cancelled' && (!only || m.id === only));
  const now = Date.now();
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Impro It//Uchrashuvlar//UZ', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Uchrashuvlar', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H'];
  for (const m of list) {
    const start = S.startUTC(m, u.tz);
    const desc = [m.notes, m.phone && `Tel: ${m.phone}`, m.checklist.length && m.checklist.map((i) => `${i.done ? '[x]' : '[ ]'} ${i.text}`).join('\n')].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT', `UID:${m.id}@impro-it`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(start + 3600000)}`, `SUMMARY:${esc(m.name)}`);
    if (m.location) lines.push(`LOCATION:${esc(m.location)}`);
    if (m.lat !== null && m.lat !== undefined && m.lon !== null && m.lon !== undefined) lines.push(`GEO:${m.lat};${m.lon}`);
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(m.name)}`, `TRIGGER:-PT${u.lead || 60}M`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="uchrashuvlar.ics"', 'Cache-Control': 'no-cache' },
    body: lines.map(fold).join('\r\n') + '\r\n',
  };
};
