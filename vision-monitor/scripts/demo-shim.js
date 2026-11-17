/* Statik DEMO: backend o'rniga oldindan yozilgan demo ma'lumotlardan javob beradi (Cloudflare Pages uchun). */
(() => {
  const realFetch = window.fetch.bind(window);
  let D = null;
  const load = async () => D || (D = await (await realFetch('demo-data.json')).json());
  const J = (o, st = 200) => new Response(JSON.stringify(o), {status: st, headers: {'content-type': 'application/json'}});
  const NO = () => J({detail: "Demo rejimida o'zgartirish mumkin emas. To'liq tizim o'z serveringizda ishlaydi."}, 403);
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => new Date(s + 'T12:00:00');
  const days = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };

  function dayFor(req) {
    const offset = days(iso(new Date()), D.today);
    let rec = addDays(req, -offset);
    const keys = Object.keys(D.days).sort();
    if (rec > keys[keys.length - 1]) rec = keys[keys.length - 1];
    if (rec < keys[0]) rec = keys[0];
    const d = JSON.parse(JSON.stringify(D.days[rec]));
    d.date = req; if (rec !== D.today) d.is_today = false;
    return d;
  }
  function range(start, end) {
    const agg = {}, per = [];
    for (let d = start; d <= end && per.length < 92; d = addDays(d, 1)) {
      const day = dayFor(d), s = day.summary;
      per.push({date: d, came: s.came, late: s.late, phone_sec: s.phone_sec, talk_sec: s.talk_sec, away_sec: s.away_sec, worked_sec: s.worked_sec});
      for (const p of day.people) {
        const k = p.employee_id ?? p.name;
        const a = agg[k] ??= {employee_id: p.employee_id, name: p.name, position: p.position, unknown: p.unknown, days_came: 0, late_days: 0, late_min: 0, worked_sec: 0, away_sec: 0, away_count: 0, phone_call_sec: 0, phone_call_count: 0, phone_use_sec: 0, phone_use_count: 0, talking_sec: 0, talking_count: 0};
        if (p.came) { a.days_came++; if (p.late_min > 0) { a.late_days++; a.late_min += p.late_min; } }
        a.worked_sec += p.worked_sec; a.away_sec += p.away_sec; a.away_count += p.away_count;
        for (const q of ['phone_call', 'phone_use', 'talking']) { a[q + '_sec'] += p[q].sec; a[q + '_count'] += p[q].count; }
      }
    }
    return {start, end, people: Object.values(agg).sort((x, y) => x.name.localeCompare(y.name)), days: per};
  }
  const dur = s => { s = Math.round(s); return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60); };
  function csv(start, end) {
    let out = '﻿Sana;Xodim;Lavozim;Kelgan vaqti;Kechikish (daq);Ketgan vaqti;Ishxonada;Tashqarida;Chiqishlar soni;Telefonda gaplashgan;Qo\'ng\'iroqlar;Telefon ishlatgan;Telefon holatlari;Gaplashgan;Gaplashuvlar\n';
    for (let d = start; d <= end; d = addDays(d, 1)) for (const p of dayFor(d).people) if (p.came)
      out += [d, p.name, p.position, p.arrival, p.late_min, p.departure || '', dur(p.worked_sec), dur(p.away_sec), p.away_count, dur(p.phone_call.sec), p.phone_call.count, dur(p.phone_use.sec), p.phone_use.count, dur(p.talking.sec), p.talking.count].join(';') + '\n';
    return new Response(out, {headers: {'content-type': 'text/csv; charset=utf-8'}});
  }

  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (!url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/snap/') || url.pathname.endsWith('/stream')) return realFetch(input, init);
    await load();
    const p = url.pathname.slice(4), q = url.searchParams, m = (init.method || 'GET').toUpperCase();
    if (p.startsWith('/auth/')) return J({token: 'demo'});
    if (p === '/me') return J({id: 1, email: 'demo@demo.uz', name: 'Demo foydalanuvchi', company: 'Demo kompaniya'});
    if (p === '/settings') return m === 'GET' ? J(D.settings) : (D.settings = {...D.settings, ...JSON.parse(init.body)}, J(D.settings));
    if (p === '/cameras' && m === 'GET') return J([{id: 1, user_id: 1, name: "Demo kamera (sun'iy)", source: 'demo', role: 'office', enabled: 1, status: 'online', error: '', fps: 4, people: 6}]);
    if (p === '/cameras/brands') return J([]);
    if (p === '/system') return J({yolo: true, mediapipe: true, insightface: true, cameras_running: 1});
    if (p === '/employees' && m === 'GET') return J(D.employees);
    if (p === '/events') return J(D.events);
    if (p === '/unknown') return J([]);
    if (p === '/reports/day') return J(dayFor(q.get('date') || iso(new Date())));
    if (p === '/reports/range') { const e = q.get('end') || iso(new Date()); return J(range(q.get('start') || addDays(e, -6), e)); }
    if (p === '/reports/csv') { const e = q.get('end') || iso(new Date()); return csv(q.get('start') || e, e); }
    return NO();
  };
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('div');
    b.style.cssText = 'background:#f59e0b;color:#111;font:600 13px system-ui;text-align:center;padding:6px 10px';
    b.textContent = "DEMO: ma'lumotlar namunaviy, istalgan email/parol bilan kiring. Kamera va AI bu versiyada ishlamaydi.";
    document.body.prepend(b);
  });
})();
