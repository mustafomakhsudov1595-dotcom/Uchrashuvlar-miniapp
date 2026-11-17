'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const TOKEN_KEY = 'vm_token';
let token = localStorage.getItem(TOKEN_KEY) || '';
let me = null, timer = null, settings = null;

async function api(path, opts = {}) {
  const o = {method: 'GET', headers: {}, ...opts};
  if (token) o.headers.Authorization = 'Bearer ' + token;
  if (o.json) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(o.json); }
  const r = await fetch('/api' + path, o);
  if (r.status === 401 && token && !path.startsWith('/auth/')) { logout(); throw new Error('Qayta kiring'); }
  if (!r.ok) {
    let m = 'Xatolik ' + r.status;
    try { const j = await r.json(); m = typeof j.detail === 'string' ? j.detail : (j.detail?.[0]?.msg || m); } catch {}
    throw new Error(m);
  }
  return (r.headers.get('content-type') || '').includes('json') ? r.json() : r;
}
function toast(msg, bad) {
  const d = document.createElement('div'); d.textContent = msg; if (bad) d.className = 'bad';
  $('#toast').append(d); setTimeout(() => d.remove(), 4200);
}
function logout() { localStorage.removeItem(TOKEN_KEY); token = ''; me = null; clearInterval(timer); render(); }

/* ---------- formatlash ---------- */
const pad = n => String(n).padStart(2, '0');
function dur(sec) {
  sec = Math.round(sec || 0);
  if (sec < 60) return sec + ' son';
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return [h ? h + ' soat' : '', m ? m + ' daq' : '', (!h && s) ? s + ' son' : ''].filter(Boolean).join(' ');
}
const hhmm = s => { s = Math.round(s); return pad(Math.floor(s / 3600) % 24) + ':' + pad(Math.floor(s % 3600 / 60)); };
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const STATUS = {working: 'Ish joyida', phone_call: 'Telefonda gaplashmoqda', phone_use: 'Telefon ishlatmoqda', talking: 'Gaplashmoqda',
  away: 'Tashqarida', absent: 'Kelmagan', present_day: 'Kelgan', online: 'Onlayn', offline: 'Oflayn', error: 'Xatolik', disabled: "O'chirilgan", starting: 'Ulanmoqda'};
const KIND = {phone_call: 'Telefonda gaplashdi', phone_use: 'Telefon ishlatdi', talking: 'Gaplashib turdi'};
const KCOL = {phone_call: 'var(--phone)', phone_use: 'var(--use)', talking: 'var(--talk)'};
const badge = st => `<span class="badge b-${st}"><i></i>${STATUS[st] || st}</span>`;
const initials = n => esc(n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase());

/* ---------- Auth ---------- */
function authView(mode = 'login') {
  const reg = mode === 'register';
  $('#app').innerHTML = `
  <div class="auth">
    <div class="hero">
      <div class="logo"><i></i>VisionMonitor</div>
      <h1>Kamera + sun'iy intellekt: ish vaqti hisobi avtomatik</h1>
      <ul>
        <li>👁️ Xodim ishga qachon kelgani va qachon ketgani</li>
        <li>🚪 Tashqariga necha marta va necha daqiqaga chiqgani</li>
        <li>📱 Telefonda gaplashgan yoki telefon ishlatgan vaqti (rasm bilan isbot)</li>
        <li>💬 Ish joyida gaplashib turgan vaqti</li>
        <li>📊 Kunlik, haftalik hisobotlar va Excel (CSV) eksport</li>
      </ul>
    </div>
    <div class="form"><form class="box" id="af">
      <h1>${reg ? "Ro'yxatdan o'tish" : 'Shaxsiy kabinetga kirish'}</h1>
      ${reg ? '<label>Ismingiz<input name="name" required minlength="2" autocomplete="name"></label><label>Kompaniya<input name="company" autocomplete="organization"></label>' : ''}
      <label>Email<input name="email" type="email" required autocomplete="email"></label>
      <label>Parol${reg ? ' (kamida 8 belgi)' : ''}<input name="password" type="password" required minlength="${reg ? 8 : 1}" autocomplete="${reg ? 'new-password' : 'current-password'}"></label>
      <div class="err" id="aerr"></div>
      <button class="btn" id="abtn">${reg ? 'Hisob yaratish' : 'Kirish'}</button>
      <div class="muted small">${reg ? 'Hisobingiz bormi?' : "Hisobingiz yo'qmi?"} <button type="button" class="link" id="aswitch">${reg ? 'Kirish' : "Ro'yxatdan o'tish"}</button></div>
    </form></div>
  </div>`;
  $('#aswitch').onclick = () => authView(reg ? 'login' : 'register');
  $('#af').onsubmit = async e => {
    e.preventDefault(); const b = $('#abtn'); b.disabled = true; $('#aerr').textContent = '';
    try {
      const d = Object.fromEntries(new FormData(e.target));
      const r = await api(reg ? '/auth/register' : '/auth/login', {method: 'POST', json: d});
      token = r.token; localStorage.setItem(TOKEN_KEY, token);
      if (reg) location.hash = '#/dashboard';
      render();
    } catch (er) { $('#aerr').textContent = er.message; b.disabled = false; }
  };
}

/* ---------- Shell ---------- */
const NAV = [['dashboard', '🏠', 'Bosh sahifa'], ['cameras', '📹', 'Kameralar'], ['employees', '👥', 'Xodimlar'], ['reports', '📊', 'Hisobotlar'], ['settings', '⚙️', 'Sozlamalar']];
async function render() {
  clearInterval(timer);
  if (!token) return authView();
  try { me = await api('/me'); settings = await api('/settings'); } catch { return authView(); }
  const page = (location.hash.replace('#/', '') || 'dashboard').split('?')[0];
  $('#app').innerHTML = `<div class="shell"><aside class="side"><div class="logo"><i></i>VisionMonitor</div>
    <nav class="nav">${NAV.map(([k, ic, t]) => `<a href="#/${k}" class="${page === k ? 'on' : ''}"><span>${ic}</span>${t}</a>`).join('')}</nav>
    <div class="who"><b>${esc(me.name)}</b><div class="muted">${esc(me.company || me.email)}</div><button class="link" id="lo" style="margin-top:6px;color:#93c5fd">Chiqish</button></div></aside>
    <main class="main" id="main"></main></div>`;
  $('#lo').onclick = logout;
  const pages = {dashboard, cameras, employees, reports, settings: settingsPage};
  try { await (pages[page] || dashboard)($('#main')); } catch (e) { $('#main').innerHTML = `<div class="card empty">${esc(e.message)}</div>`; }
}
window.addEventListener('hashchange', render);

function modal(html, wide) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}">${html}</div>`;
  bg.onclick = e => { if (e.target === bg) close(); };
  const close = () => { bg.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = e => e.key === 'Escape' && close();
  document.addEventListener('keydown', esc_);
  document.body.append(bg); bg.close = close; return bg;
}

/* ---------- Dashboard ---------- */
async function dashboard(el) {
  el.innerHTML = '<div class="top"><div><h1>Bosh sahifa</h1><div class="muted" id="sub"></div></div></div><div id="dash"></div>';
  async function load() {
    const [day, evs, cams] = await Promise.all([api('/reports/day'), api('/events?limit=12'), api('/cameras')]);
    const s = day.summary, emps = day.people.filter(p => !p.unknown);
    $('#sub').textContent = `Bugun, ${day.date} · Ish vaqti ${day.work_start}–${day.work_end}`;
    if (!emps.length && !cams.length) {
      $('#dash').innerHTML = `<div class="card empty"><h2>Boshlaymiz!</h2><p>1) <b>Kameralar</b> bo'limida kamera qo'shing<br>2) <b>Xodimlar</b> bo'limida xodimlarni yuz rasmi bilan kiriting<br>3) Hisobotlar avtomatik shakllanadi</p>
      <p class="muted">Tizimni avval sinab ko'rmoqchimisiz?</p><button class="btn" id="seed">Demo ma'lumot yuklash</button></div>`;
      $('#seed').onclick = async e => { e.target.disabled = true; await api('/demo/seed', {method: 'POST'}); toast("Demo ma'lumot yuklandi"); render(); };
      return;
    }
    $('#dash').innerHTML = `
    <div class="grid g4">
      <div class="card kpi"><div class="l">Hozir ishxonada</div><div class="v">${s.now_present}<span class="muted" style="font-size:18px"> / ${s.total}</span></div><div class="s">Bugun kelgan: ${s.came} · Kelmagan: ${s.absent}</div></div>
      <div class="card kpi"><div class="l">Kechikkanlar</div><div class="v" style="color:${s.late ? 'var(--bad)' : 'inherit'}">${s.late}</div><div class="s">Ish boshlanishi ${day.work_start}</div></div>
      <div class="card kpi"><div class="l">Hozir telefonda</div><div class="v" style="color:${s.on_phone ? 'var(--phone)' : 'inherit'}">${s.on_phone}</div><div class="s">Bugun jami: ${dur(s.phone_sec)}</div></div>
      <div class="card kpi"><div class="l">Hozir gaplashmoqda</div><div class="v">${s.talking}</div><div class="s">Bugun jami: ${dur(s.talk_sec)}</div></div>
    </div>
    <div class="grid g2" style="margin-top:16px;grid-template-columns:minmax(0,1fr) 340px">
      <div class="card"><h2 style="margin-bottom:10px">Xodimlar holati (jonli)</h2><div class="scroll"><table class="compact">
        <tr><th>Xodim</th><th>Holat</th><th>Kelgan</th><th>Tashqarida</th><th>📱 / 💬</th></tr>
        ${emps.map(p => `<tr class="click" data-e="${p.employee_id}"><td><b>${esc(p.name)}</b><div class="muted small">${esc(p.position)}</div></td><td>${badge(p.status)}</td>
          <td>${p.arrival ? esc(p.arrival.slice(0, 5)) + (p.late_min ? ` <span class="pill-late">(+${p.late_min} daq)</span>` : ' <span class="pill-ok">✓</span>') : '—'}</td>
          <td>${p.away_count ? dur(p.away_sec) + ` <span class="muted small">(${p.away_count}×)</span>` : '—'}</td>
          <td>📱 ${dur(p.phone_call.sec + p.phone_use.sec)}<div class="muted small">💬 ${dur(p.talking.sec)}</div></td></tr>`).join('') || '<tr><td colspan=5 class="empty">Xodimlar yo\'q</td></tr>'}
      </table></div></div>
      <div class="card"><h2 style="margin-bottom:10px">So'nggi holatlar</h2><div class="feed">${feed(evs)}</div></div>
    </div>
    <div class="card" style="margin-top:16px"><h2>Kameralar</h2><div class="row" style="margin-top:10px">${cams.map(c => `<span class="badge b-${c.status}"><i></i>${esc(c.name)} · ${STATUS[c.status]}${c.status === 'online' ? ` · ${c.people} kishi` : ''}</span>`).join('') || '<span class="muted">Kamera yo\'q</span>'}</div></div>`;
    document.querySelectorAll('tr[data-e]').forEach(tr => tr.onclick = () => location.hash = '#/reports?e=' + tr.dataset.e);
    document.querySelectorAll('.ev img').forEach(i => i.onclick = () => zoomSnap(i.dataset.src));
  }
  await load(); timer = setInterval(() => load().catch(() => {}), 5000);
}
function feed(evs) {
  if (!evs.length) return '<div class="empty">Hali holatlar qayd etilmagan</div>';
  return evs.map(e => `<div class="ev">${e.snapshot ? `<img data-src="${esc(e.snapshot)}" src="/api/snap/${esc(e.snapshot)}?token=${token}" loading="lazy" alt="">` : '<div class="ph">📷</div>'}
    <div><b>${esc(e.name)}</b> <span class="dot" style="display:inline-block;background:${KCOL[e.kind]}"></span><div class="muted small">${KIND[e.kind]} · ${dur(e.dur)}</div></div>
    <div class="right muted small">${esc(e.time.slice(0, 5))}<br>${esc(e.date)}</div></div>`).join('');
}
function zoomSnap(name) { modal(`<img src="/api/snap/${esc(name)}?token=${token}" style="width:100%;border-radius:10px"><button class="btn ghost" onclick="this.closest('.modal-bg').remove()">Yopish</button>`, true); }

/* ---------- Kameralar ---------- */
async function cameras(el) {
  async function load() {
    const [cams, sys] = await Promise.all([api('/cameras'), api('/system')]);
    el.innerHTML = `<div class="top"><div><h1>Kameralar</h1><div class="muted">Kamera qo'shing — sun'iy intellekt avtomatik tahlil qiladi</div></div><button class="btn right" id="add">+ Kamera qo'shish</button></div>
    ${!sys.yolo ? `<div class="card" style="border-color:var(--warn);margin-bottom:16px"><b>⚠️ AI kutubxonalari o'rnatilmagan.</b> Haqiqiy kamera tahlili uchun serverda <code>pip install ultralytics mediapipe</code> ni ishga tushiring. "demo" manba bunsiz ishlaydi.</div>` : ''}
    <div class="grid g2" style="grid-template-columns:repeat(auto-fill,minmax(360px,1fr))">${cams.map(c => `
      <div class="card cam"><div class="view">${c.status === 'online' ? `<img src="/api/cameras/${c.id}/stream?token=${token}" alt="">` : `<div style="padding:20px;text-align:center">${c.status === 'disabled' ? "O'chirilgan" : esc(c.error || 'Ulanmoqda...')}</div>`}</div>
      <div class="body"><div class="row"><h3>${esc(c.name)}</h3>${badge(c.status)}<span class="right muted small">${c.role === 'entrance' ? '🚪 Kirish' : '🏢 Ofis'}</span></div>
      <div class="muted small" style="word-break:break-all">${esc(c.source)}${c.status === 'online' ? ` · ${c.fps} kadr/s · ${c.people} kishi` : ''}</div>
      <div class="row"><button class="btn ghost sm" data-edit="${c.id}">Tahrirlash</button><button class="btn ghost sm" data-del="${c.id}">O'chirish</button></div></div></div>`).join('') ||
      '<div class="card empty" style="grid-column:1/-1"><h3>Kamera yo\'q</h3><p class="muted">"+ Kamera qo\'shish" tugmasini bosing.</p></div>'}</div>`;
    $('#add').onclick = () => camForm();
    el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => camForm(cams.find(c => c.id == b.dataset.edit)));
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm("Kamerani o'chirasizmi? Hisobotlar saqlanib qoladi.")) return;
      await api('/cameras/' + b.dataset.del, {method: 'DELETE'}); load();
    });
  }
  function camForm(c) {
    const m = modal(`<h2>${c ? 'Kamerani tahrirlash' : "Kamera qo'shish"}</h2>
      <form id="cf" style="display:flex;flex-direction:column;gap:12px">
      <label>Nomi<input name="name" required value="${esc(c?.name || '')}" placeholder="Masalan: Ofis asosiy zal"></label>
      <label>Kamera manzili<input name="source" required value="${esc(c?.source || '')}" placeholder="rtsp://admin:parol@192.168.1.64:554/stream1"></label>
      <div class="help">Qo'llab-quvvatlanadi: <br>• IP kamera: <code>rtsp://login:parol@IP:554/stream1</code> (Hikvision, Dahua, TP-Link Tapo va b.)<br>• HTTP oqim: <code>http://IP:8080/video</code><br>• Serverga ulangan USB kamera: <code>0</code><br>• Sinash uchun: <code>demo</code></div>
      <label>Joylashuvi<select name="role"><option value="office">🏢 Ofis ichida (ish joyi)</option><option value="entrance">🚪 Kirish/chiqish eshigi</option></select></label>
      <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${c && !c.enabled ? '' : 'checked'}> Yoqilgan</label>
      <div class="err" id="cerr"></div><div class="row"><button type="button" class="btn ghost" id="ct">Ulanishni tekshirish</button><button class="btn right">Saqlash</button></div></form>`);
    if (c) m.querySelector('[name=role]').value = c.role;
    const data = () => { const f = new FormData(m.querySelector('#cf')); return {name: f.get('name'), source: f.get('source'), role: f.get('role'), enabled: !!f.get('enabled')}; };
    m.querySelector('#ct').onclick = async e => {
      e.target.disabled = true; m.querySelector('#cerr').style.color = 'var(--mute)'; m.querySelector('#cerr').textContent = 'Tekshirilmoqda...';
      try { const r = await api('/cameras/test', {method: 'POST', json: {source: data().source}}); m.querySelector('#cerr').style.color = r.ok ? 'var(--ok)' : 'var(--bad)'; m.querySelector('#cerr').textContent = r.message; }
      catch (er) { m.querySelector('#cerr').style.color = 'var(--bad)'; m.querySelector('#cerr').textContent = er.message; }
      e.target.disabled = false;
    };
    m.querySelector('#cf').onsubmit = async e => {
      e.preventDefault();
      try { await api(c ? '/cameras/' + c.id : '/cameras', {method: c ? 'PUT' : 'POST', json: data()}); m.close(); toast('Saqlandi'); load(); }
      catch (er) { m.querySelector('#cerr').style.color = 'var(--bad)'; m.querySelector('#cerr').textContent = er.message; }
    };
  }
  await load(); timer = setInterval(() => { if (!document.querySelector('.modal-bg') && !document.hidden) load().catch(() => {}); }, 15000);
}

/* ---------- Xodimlar ---------- */
async function employees(el) {
  async function load() {
    const list = await api('/employees');
    el.innerHTML = `<div class="top"><div><h1>Xodimlar</h1><div class="muted">Yuz rasmi qo'shilsa, kamera xodimni ismi bilan taniydi</div></div><button class="btn right" id="add">+ Xodim qo'shish</button></div>
    <div class="card scroll"><table><tr><th>Xodim</th><th>Lavozim</th><th>Yuz namunalari</th><th></th></tr>
    ${list.map(e => `<tr><td><b>${esc(e.name)}</b></td><td>${esc(e.position) || '—'}</td>
      <td>${e.faces ? `<span class="pill-ok">✓ ${e.faces} ta rasm</span>` : '<span class="pill-late">Rasm yo\'q — tanib bo\'lmaydi</span>'}</td>
      <td style="text-align:right"><button class="btn ghost sm" data-f="${e.id}">📷 Yuz rasmi</button> <button class="btn ghost sm" data-e="${e.id}">Tahrirlash</button> <button class="btn ghost sm" data-d="${e.id}">O'chirish</button></td></tr>`).join('') || '<tr><td colspan=4 class="empty">Hali xodim qo\'shilmagan</td></tr>'}</table></div>
    <div class="help" style="margin-top:14px">💡 Eng yaxshi natija uchun xodimning 3–5 ta rasmini yuklang: yuz aniq, oldindan, yaxshi yoritilgan, ko'zoynak/niqobsiz.</div>`;
    $('#add').onclick = () => empForm();
    el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => empForm(list.find(x => x.id == b.dataset.e)));
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm("Xodimni o'chirasizmi? Eski hisobotlar saqlanadi.")) { await api('/employees/' + b.dataset.d, {method: 'DELETE'}); load(); } });
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => faceForm(list.find(x => x.id == b.dataset.f)));
  }
  function empForm(e) {
    const m = modal(`<h2>${e ? 'Xodimni tahrirlash' : "Xodim qo'shish"}</h2><form id="ef" style="display:flex;flex-direction:column;gap:12px">
      <label>Ism-familiya<input name="name" required minlength="2" value="${esc(e?.name || '')}"></label>
      <label>Lavozim<input name="position" value="${esc(e?.position || '')}"></label><div class="err" id="eerr"></div><button class="btn">Saqlash</button></form>`);
    m.querySelector('#ef').onsubmit = async ev => {
      ev.preventDefault();
      try { await api(e ? '/employees/' + e.id : '/employees', {method: e ? 'PUT' : 'POST', json: Object.fromEntries(new FormData(ev.target))}); m.close(); load(); }
      catch (er) { m.querySelector('#eerr').textContent = er.message; }
    };
  }
  function faceForm(e) {
    const m = modal(`<h2>${esc(e.name)} — yuz rasmlari</h2><p class="muted small">Hozirgi namunalar: <b>${e.faces}</b> ta</p>
      <input type="file" id="ff" accept="image/*" multiple><div class="err" id="ferr"></div>
      <div class="row"><button class="btn" id="fu">Yuklash</button>${e.faces ? '<button class="btn ghost" id="fc">Hammasini o\'chirish</button>' : ''}</div>`);
    m.querySelector('#fu').onclick = async ev => {
      const fs = m.querySelector('#ff').files; if (!fs.length) return;
      ev.target.disabled = true; m.querySelector('#ferr').style.color = 'var(--mute)'; m.querySelector('#ferr').textContent = 'Yuklanmoqda (birinchi marta model yuklanishi mumkin)...';
      const fd = new FormData(); [...fs].forEach(f => fd.append('files', f));
      try { const r = await api(`/employees/${e.id}/faces`, {method: 'POST', body: fd}); toast(`${r.added} ta rasm qo'shildi` + (r.failed ? `, ${r.failed} tasida yuz topilmadi` : '')); m.close(); load(); }
      catch (er) { m.querySelector('#ferr').style.color = 'var(--bad)'; m.querySelector('#ferr').textContent = er.message; ev.target.disabled = false; }
    };
    const fc = m.querySelector('#fc'); if (fc) fc.onclick = async () => { await api(`/employees/${e.id}/faces`, {method: 'DELETE'}); m.close(); load(); };
  }
  await load();
}

/* ---------- Hisobotlar ---------- */
const ROUTE_Q = () => new URLSearchParams(location.hash.split('?')[1] || '');
async function reports(el) {
  let mode = 'day', date = todayStr(), start = addDays(todayStr(), -6), end = todayStr(), openE = ROUTE_Q().get('e');
  async function load() {
    el.innerHTML = `<div class="top"><div><h1>Hisobotlar</h1><div class="muted">Ishga kelish, chiqish, telefon va gaplashuv</div></div>
      <div class="tabs right"><button data-m="day" class="${mode === 'day' ? 'on' : ''}">Kunlik</button><button data-m="range" class="${mode === 'range' ? 'on' : ''}">Davr</button></div></div>
      <div class="row" style="margin-bottom:16px">${mode === 'day'
        ? `<button class="btn ghost sm" id="pv">‹</button><input type="date" id="d" value="${date}" max="${todayStr()}"><button class="btn ghost sm" id="nx">›</button>`
        : `<input type="date" id="s" value="${start}"> — <input type="date" id="e" value="${end}" max="${todayStr()}">`}
        <button class="btn ghost sm right" id="csv">⬇ Excel (CSV)</button></div><div id="rep"><div class="empty">Yuklanmoqda...</div></div>`;
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; load(); });
    if (mode === 'day') { $('#d').onchange = e => { date = e.target.value || date; load(); }; $('#pv').onclick = () => { date = addDays(date, -1); load(); }; $('#nx').onclick = () => { if (date < todayStr()) { date = addDays(date, 1); load(); } }; }
    else { $('#s').onchange = e => { start = e.target.value; load(); }; $('#e').onchange = e => { end = e.target.value; load(); }; }
    $('#csv').onclick = async () => {
      const q = mode === 'day' ? `start=${date}&end=${date}` : `start=${start}&end=${end}`;
      const r = await api('/reports/csv?' + q); const b = await r.blob(); const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = `hisobot_${mode === 'day' ? date : start + '_' + end}.csv`; a.click();
    };
    try { mode === 'day' ? await dayView() : await rangeView(); } catch (e) { $('#rep').innerHTML = `<div class="card empty">${esc(e.message)}</div>`; }
  }
  async function dayView() {
    const d = await api('/reports/day?date=' + date), s = d.summary, ppl = d.people;
    const pt = n => n === 0 ? 'text-muted' : '';
    $('#rep').innerHTML = `<div class="grid g4" style="margin-bottom:16px">
      <div class="card kpi"><div class="l">Kelgan / jami</div><div class="v">${s.came} / ${s.total}</div><div class="s">Kechikkan: ${s.late}</div></div>
      <div class="card kpi"><div class="l">Telefonda (jami)</div><div class="v">${dur(s.phone_sec)}</div></div>
      <div class="card kpi"><div class="l">Gaplashgan (jami)</div><div class="v">${dur(s.talk_sec)}</div></div>
      <div class="card kpi"><div class="l">Tashqarida (jami)</div><div class="v">${dur(s.away_sec)}</div></div></div>
      <div class="legend" style="margin-bottom:10px"><span><i class="s-present"></i>Ishxonada</span><span><i class="s-away"></i>Tashqarida</span><span><i class="s-phone_call"></i>Telefonda gaplashgan</span><span><i class="s-phone_use"></i>Telefon ishlatgan</span><span><i class="s-talking"></i>Gaplashgan</span></div>
      <div class="grid">${ppl.filter(p => p.came || !p.unknown).map(p => personCard(p, d)).join('') || '<div class="card empty">Bu kunda ma\'lumot yo\'q</div>'}</div>`;
    el.querySelectorAll('.card[data-p] .toggle').forEach(b => b.onclick = () => b.closest('.card').querySelector('.detail').hidden ^= 1);
    el.querySelectorAll('.ev img').forEach(i => i.onclick = () => zoomSnap(i.dataset.src));
    if (openE) { const c = el.querySelector(`.card[data-p="${openE}"]`); if (c) { c.querySelector('.detail').hidden = false; c.scrollIntoView({block: 'center'}); } openE = null; }
  }
  function personCard(p, d) {
    if (!p.came) return `<div class="card" data-p="${p.employee_id}"><div class="row"><b>${esc(p.name)}</b><span class="muted small">${esc(p.position)}</span>${badge('absent')}</div></div>`;
    return `<div class="card" data-p="${p.employee_id ?? ''}">
      <div class="row"><div class="badge" style="width:36px;height:36px;justify-content:center;border-radius:50%;background:var(--brand);color:#fff">${initials(p.name)}</div>
        <div><h3>${esc(p.name)}</h3><div class="muted small">${esc(p.position)}</div></div>${d.is_today ? badge(p.status) : ''}
        <button class="btn ghost sm right toggle">Batafsil ▾</button></div>
      <div class="grid g4" style="margin:12px 0;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        ${stat('Kelgan vaqti', esc(p.arrival.slice(0, 5)), p.late_min ? `<span class="pill-late">${p.late_min} daq kechikdi</span>` : '<span class="pill-ok">Vaqtida</span>')}
        ${stat('Ketgan vaqti', p.departure ? esc(p.departure.slice(0, 5)) : (d.is_today ? 'Hali ishda' : '—'), '')}
        ${stat('Ishxonada bo\'lgan', dur(p.worked_sec), '')}
        ${stat('Tashqarida', dur(p.away_sec), `${p.away_count} marta chiqdi`)}
        ${stat('📱 Telefonda gaplashgan', dur(p.phone_call.sec), `${p.phone_call.count} marta`)}
        ${stat('📲 Telefon ishlatgan', dur(p.phone_use.sec), `${p.phone_use.count} marta`)}
        ${stat('💬 Gaplashib turgan', dur(p.talking.sec), `${p.talking.count} marta`)}</div>
      ${timeline(p, d)}
      <div class="detail" hidden>
        <h3 style="margin:14px 0 6px">Tashqariga chiqishlar</h3>
        ${p.away.length ? `<table><tr><th>Chiqdi</th><th>Qaytdi</th><th>Davomiyligi</th></tr>${p.away.map(a => `<tr><td>${esc(a.start_s.slice(0, 8))}</td><td>${a.ongoing ? '<span class="pill-late">hali qaytmadi</span>' : esc(a.end_s.slice(0, 8))}</td><td><b>${dur(a.dur)}</b></td></tr>`).join('')}</table>` : '<div class="muted small">Chiqmagan</div>'}
        <h3 style="margin:14px 0 6px">Telefon va gaplashuvlar (aniq vaqt bilan)</h3>
        ${p.events.length ? `<div class="feed" style="max-height:340px">${p.events.map(e => `<div class="ev">${e.snapshot ? `<img data-src="${esc(e.snapshot)}" src="/api/snap/${esc(e.snapshot)}?token=${token}" loading="lazy" alt="">` : '<div class="ph">—</div>'}
          <div><span class="dot" style="display:inline-block;background:${KCOL[e.kind]}"></span> <b>${KIND[e.kind]}</b><div class="muted small">${esc(e.start)} → ${esc(e.end)}</div></div><div class="right"><b>${dur(e.dur)}</b></div></div>`).join('')}</div>` : '<div class="muted small">Qayd etilmagan</div>'}
      </div></div>`;
  }
  const stat = (l, v, s) => `<div style="padding:10px 12px;border:1px solid var(--line);border-radius:10px"><div class="muted small">${l}</div><div style="font-size:19px;font-weight:700">${v}</div><div class="small muted">${s}</div></div>`;
  function timeline(p, d) {
    const tl = p.timeline; let lo = 6 * 3600, hi = 22 * 3600;
    const all = Object.values(tl).flat(); if (all.length) { lo = Math.min(lo, Math.floor(Math.min(...all.map(x => x[0])) / 3600) * 3600); hi = Math.max(hi, Math.ceil(Math.max(...all.map(x => x[1])) / 3600) * 3600); }
    const pos = x => ((x - lo) / (hi - lo) * 100).toFixed(3);
    const lane = (name, key, cls) => `<div class="lane"><span>${name}</span><div class="bar">${tl[key].map(([a, b]) => `<div class="seg ${cls}" style="left:${pos(a)}%;width:${Math.max(0.15, pos(b) - pos(a))}%" title="${hhmm(a)}–${hhmm(b)} (${dur(b - a)})"></div>`).join('')}</div></div>`;
    const ticks = []; for (let t = lo; t <= hi; t += (hi - lo) > 14 * 3600 ? 2 * 3600 : 3600) ticks.push(`<span style="left:${pos(t)}%">${pad(t / 3600)}</span>`);
    return `<div class="tl">${lane('Ishxonada', 'present', 's-present')}${lane('Tashqarida', 'away', 's-away')}${lane('Telefon (qo\'ng\'iroq)', 'phone_call', 's-phone_call')}${lane('Telefon (ishlatish)', 'phone_use', 's-phone_use')}${lane('Gaplashgan', 'talking', 's-talking')}
      <div class="axis"><span></span><div class="ticks">${ticks.join('')}</div></div></div>`;
  }
  async function rangeView() {
    const r = await api(`/reports/range?start=${start}&end=${end}`);
    const mx = Math.max(1, ...r.days.map(x => x.phone_sec + x.talk_sec + x.away_sec));
    $('#rep').innerHTML = `<div class="card" style="margin-bottom:16px"><h2>Kunlar bo'yicha (telefon · gaplashuv · tashqarida)</h2>
      <div class="bars">${r.days.map(x => `<div class="col" title="${x.date}: telefon ${dur(x.phone_sec)}, gaplashuv ${dur(x.talk_sec)}, tashqarida ${dur(x.away_sec)}"><div class="stk" style="height:${Math.round((x.phone_sec + x.talk_sec + x.away_sec) / mx * 80)}px">
        <div class="s-phone_call" style="flex:${x.phone_sec}"></div><div class="s-talking" style="flex:${x.talk_sec}"></div><div class="s-away" style="flex:${x.away_sec}"></div></div>${x.date.slice(5)}</div>`).join('')}</div></div>
      <div class="card scroll"><table><tr><th>Xodim</th><th>Kelgan kun</th><th>Kechikish</th><th>Ishxonada</th><th>Tashqarida</th><th>Telefonda</th><th>Telefon ishl.</th><th>Gaplashgan</th></tr>
      ${r.people.map(p => `<tr><td><b>${esc(p.name)}</b></td><td>${p.days_came}</td><td>${p.late_days ? `<span class="pill-late">${p.late_days} kun · ${p.late_min} daq</span>` : '<span class="pill-ok">—</span>'}</td>
        <td>${dur(p.worked_sec)}</td><td>${dur(p.away_sec)} <span class="muted small">(${p.away_count}×)</span></td><td>${dur(p.phone_call_sec)} <span class="muted small">(${p.phone_call_count}×)</span></td>
        <td>${dur(p.phone_use_sec)} <span class="muted small">(${p.phone_use_count}×)</span></td><td>${dur(p.talking_sec)} <span class="muted small">(${p.talking_count}×)</span></td></tr>`).join('') || '<tr><td colspan=8 class="empty">Ma\'lumot yo\'q</td></tr>'}</table></div>`;
  }
  await load();
  if (mode === 'day') timer = setInterval(() => { if (date === todayStr() && !document.hidden && !document.querySelector('.detail:not([hidden])')) dayView().catch(() => {}); }, 10000);
}

/* ---------- Sozlamalar ---------- */
async function settingsPage(el) {
  el.innerHTML = `<div class="top"><h1>Sozlamalar</h1></div><form class="card" id="sf" style="max-width:560px;display:flex;flex-direction:column;gap:14px">
    <div class="row"><label style="flex:1">Ish boshlanishi<input type="time" name="work_start" value="${settings.work_start}" required></label><label style="flex:1">Ish tugashi<input type="time" name="work_end" value="${settings.work_end}" required></label></div>
    <label>Chiqib ketganni hisoblash (soniya)<input type="number" name="grace_sec" min="15" max="1800" value="${settings.grace_sec}"><span class="small" style="font-weight:400">Xodim shuncha soniya kameralarda ko'rinmasa "tashqariga chiqdi" deb hisoblanadi (tavsiya: 60–120).</span></label>
    <label>Hodisaning minimal davomiyligi (soniya)<input type="number" name="min_event_sec" min="1" max="60" value="${settings.min_event_sec}"><span class="small" style="font-weight:400">Shundan qisqa telefon/gaplashuvlar hisobga olinmaydi (tasodifiy aniqlashlarni kamaytiradi).</span></label>
    <label>Gaplashuvni aniqlash sezgirligi: <b id="sv">${settings.talk_sensitivity}</b><input type="range" name="talk_sensitivity" min="0.3" max="3" step="0.1" value="${settings.talk_sensitivity}"></label>
    <label>Vaqt mintaqasi<input name="tz" value="${esc(settings.tz)}"></label>
    <div class="err" id="serr"></div><button class="btn">Saqlash</button>
    <hr style="border:0;border-top:1px solid var(--line);width:100%"><div class="muted small">Tizimni sinab ko'rish uchun namunaviy xodimlar va 7 kunlik tarix yuklash mumkin.</div><button type="button" class="btn ghost" id="seed">Demo ma'lumot yuklash</button></form>`;
  el.querySelector('[name=talk_sensitivity]').oninput = e => $('#sv').textContent = e.target.value;
  $('#seed').onclick = async () => { if (confirm("Demo xodimlar va demo ma'lumot qo'shiladi. Davom etasizmi?")) { await api('/demo/seed', {method: 'POST'}); toast("Demo ma'lumot yuklandi"); } };
  $('#sf').onsubmit = async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    d.grace_sec = +d.grace_sec; d.min_event_sec = +d.min_event_sec; d.talk_sensitivity = +d.talk_sensitivity;
    try { settings = await api('/settings', {method: 'PUT', json: d}); toast('Saqlandi'); $('#serr').textContent = ''; } catch (er) { $('#serr').textContent = er.message; }
  };
}

render();
