'use strict';
/* Brauzerda ishlaydigan AI: yuz aniqlash + tanish (face-api), jins/yosh, og'iz harakati (gaplashish), telefon (MediaPipe).
   Video serverga yuborilmaydi — faqat hodisalar. */
const q = new URLSearchParams(location.search), CAM = q.get('c'), KEY = q.get('k');
const CDN_FA = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js';
const MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/';
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const OBJ = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';
const TH = 0.48, MARGIN = 0.06;            // yuz masofasi chegarasi va 1-2 nomzod orasidagi farq
const $ = id => document.getElementById(id);
const st = (t, c) => { $('st').textContent = t; $('st').className = c || ''; };
const prog = p => $('pb').style.width = Math.round(p * 100) + '%';
const SESS = Math.random().toString(36).slice(2, 5);

let cfg = null, FA = null, objDet = null, running = false, wake = null;
const video = $('v'), ov = $('ov'), octx = ov.getContext('2d');

/* ------------------------------------------------------------ yuklash */
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Kutubxona yuklanmadi: ' + src)); document.head.append(s); }); }
async function getConfig() {
  const r = await fetch(`/api/monitor/config?c=${encodeURIComponent(CAM)}&k=${encodeURIComponent(KEY)}`);
  if (!r.ok) throw new Error(r.status === 403 ? "Havola noto'g'ri yoki kamera o'chirilgan. Kabinetdan yangi havola oling." : 'Server xatosi ' + r.status);
  return r.json();
}
async function boot() {
  try {
    if (!CAM || !KEY) throw new Error("Havola noto'g'ri: kabinetdan kamera havolasini oling");
    cfg = await getConfig(); $('camname').textContent = cfg.camera.name; prog(.05);
    await loadScript(CDN_FA); prog(.2);
    FA = window.faceapi;
    const nets = FA.nets;
    await nets.tinyFaceDetector.loadFromUri(MODELS); prog(.35);
    await nets.faceLandmark68TinyNet.loadFromUri(MODELS); prog(.45);
    await nets.faceRecognitionNet.loadFromUri(MODELS); prog(.7);
    await nets.ageGenderNet.loadFromUri(MODELS); prog(.8);
    st('Telefon aniqlash modeli yuklanmoqda...');
    try {
      const { FilesetResolver, ObjectDetector } = await import(MP + '/vision_bundle.mjs');
      const fs = await FilesetResolver.forVisionTasks(MP + '/wasm');
      const mk = d => ObjectDetector.createFromOptions(fs, { baseOptions: { modelAssetPath: OBJ, delegate: d }, scoreThreshold: 0.3, maxResults: 8, runningMode: 'VIDEO', categoryAllowlist: ['cell phone'] });
      try { objDet = await mk('GPU'); } catch { objDet = await mk('CPU'); }
    } catch (e) { console.warn('Telefon modeli yuklanmadi', e); $('sub').textContent = "Diqqat: telefon aniqlash modeli yuklanmadi (yuz va gaplashish ishlaydi)."; }
    prog(1); st("Tayyor. \"Boshlash\"ni bosing", 'ok'); $('go').disabled = false;
  } catch (e) { st(e.message, 'bad'); }
}

/* ------------------------------------------------------------ shaxs aniqlash qoidalari (python bilan bir xil g'oya) */
const dist = (a, b) => { let s = 0; for (let i = 0; i < 128; i++) { const d = a[i] - b[i]; s += d * d; } return Math.sqrt(s); };
function rank(desc, gender) {
  const res = [];
  for (const e of cfg.employees) {
    let best = 9; for (const d of e.descriptors) best = Math.min(best, dist(desc, d));
    if (e.gender && gender && e.gender !== gender && best > 0.35) continue; // jinsi mos emas
    res.push({ d: best, id: e.id, name: e.name });
  }
  return res.sort((a, b) => a.d - b.d);
}
class Ident {
  constructor() { this.win = []; this.genders = []; this.ages = []; this.n = 0; this.eid = null; this.name = null; this.score = 9; this.nextObs = 0; this.unkSent = false; this.last = null; }
  observe(face) {
    this.n++; this.last = face;
    this.genders.push(face.gender === 'male' ? 'M' : 'F'); this.ages.push(Math.round(face.age)); this.genders = this.genders.slice(-15); this.ages = this.ages.slice(-15);
    const r = rank(Array.from(face.descriptor), face.gender === 'male' ? 'M' : 'F');
    let vote = null;
    if (r.length && r[0].d <= TH && (r.length < 2 || r[1].d - r[0].d >= MARGIN)) vote = r[0];
    this.win.push(vote ? { id: vote.id, name: vote.name, d: vote.d } : null); this.win = this.win.slice(-8);
    const ids = this.win.filter(Boolean).map(w => w.id); this.eid = null; this.name = null; this.score = 9;
    if (ids.length) {
      const top = ids.sort((a, b) => ids.filter(x => x === b).length - ids.filter(x => x === a).length)[0];
      const ws = this.win.filter(w => w && w.id === top);
      const mean = ws.reduce((t, w) => t + w.d, 0) / ws.length;
      if (ws.length >= 3 && ws.length / this.win.length >= 0.6 && mean <= TH) { this.eid = top; this.name = ws[0].name; this.score = mean; }
    }
  }
  get gender() { if (this.genders.length < 2) return null; const m = this.genders.filter(g => g === 'M').length; const g = m >= this.genders.length / 2 ? 'M' : 'F'; const c = g === 'M' ? m : this.genders.length - m; return c / this.genders.length >= 0.7 ? g : null; }
  get age() { if (!this.ages.length) return null; const s = [...this.ages].sort((a, b) => a - b); return s[s.length >> 1]; }
  get unknownReady() { const none = this.win.filter(w => !w).length; return !this.eid && this.n >= 4 && none / Math.max(1, this.win.length) >= 0.7 && !this.unkSent; }
}

/* ------------------------------------------------------------ kuzatuv */
const iou = (a, b) => { const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y), x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h); const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1); const u = a.w * a.h + b.w * b.h - i; return u > 0 ? i / u : 0; };
let tracks = [], nextTid = 1;
function track(boxes, t) {
  const pairs = [];
  boxes.forEach((b, i) => tracks.forEach(tr => { const s = iou(b, tr.box); if (s >= 0.2) pairs.push([s, i, tr]); }));
  pairs.sort((a, b) => b[0] - a[0]);
  const ub = new Set(), ut = new Set(), as = {};
  for (const [, i, tr] of pairs) { if (ub.has(i) || ut.has(tr)) continue; ub.add(i); ut.add(tr); as[i] = tr; }
  const out = boxes.map((b, i) => {
    let tr = as[i];
    if (!tr) { tr = { id: nextTid++, ident: new Ident(), born: t, jaw: [], phoneHist: [], since: {}, snapped: {}, lastActive: {}, mouth: 0 }; tracks.push(tr); }
    tr.box = b; tr.last = t; return tr;
  });
  tracks = tracks.filter(tr => t - tr.last < 2000);
  return out;
}

/* ------------------------------------------------------------ asosiy sikl */
const work = document.createElement('canvas'), snapc = document.createElement('canvas');
function crop(box, m = 0.4, size = 224) {
  const vw = video.videoWidth, vh = video.videoHeight;
  const x = Math.max(0, box.x - box.w * m), y = Math.max(0, box.y - box.h * m), w = Math.min(vw - x, box.w * (1 + 2 * m)), h = Math.min(vh - y, box.h * (1 + 2 * m));
  const sc = Math.min(1, size / Math.max(w, h)); work.width = Math.max(1, Math.round(w * sc)); work.height = Math.max(1, Math.round(h * sc));
  work.getContext('2d').drawImage(video, x, y, w, h, 0, 0, work.width, work.height);
  return work;
}
function snapshot() {
  const w = Math.min(640, video.videoWidth); snapc.width = w; snapc.height = Math.round(video.videoHeight * w / video.videoWidth);
  snapc.getContext('2d').drawImage(video, 0, 0, snapc.width, snapc.height);
  return snapc.toDataURL('image/jpeg', 0.6);
}
function mouthRatio(pos) { // ichki lab nuqtalari 60..67
  const d = (a, b) => Math.hypot(pos[a].x - pos[b].x, pos[a].y - pos[b].y);
  return d(62, 66) / (d(60, 64) + 1e-6);
}
const std = a => { const m = a.reduce((t, x) => t + x, 0) / a.length; return Math.sqrt(a.reduce((t, x) => t + (x - m) ** 2, 0) / a.length); };

let lastPost = 0, unknownQueue = [], busyObs = false;
async function tick() {
  if (!running) return;
  const t0 = performance.now();
  try {
    if (video.videoWidth) {
      const dets = await FA.detectAllFaces(video, new FA.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })).withFaceLandmarks(true);
      const boxes = dets.map(d => ({ x: d.detection.box.x, y: d.detection.box.y, w: d.detection.box.width, h: d.detection.box.height }));
      const trs = track(boxes, t0);
      let phones = [];
      if (objDet) { try { phones = objDet.detectForVideo(video, t0).detections.map(d => d.boundingBox); } catch {} }
      // --- telefonlarni egasiga biriktirish
      trs.forEach(tr => { tr.phoneNow = null; });
      for (const p of phones) {
        const cx = p.originX + p.width / 2, cy = p.originY + p.height / 2; let best = null, bd = 1e9;
        for (const tr of trs) {
          const b = tr.box, dx = Math.abs(cx - (b.x + b.w / 2)) / b.w, dy = (cy - (b.y + b.h / 2)) / b.h;
          const call = dx < 1.3 && dy > -0.9 && dy < 0.9, use = dx < 2.5 && dy >= 0.9 && dy < 3.5;
          if ((call || use) && dx + Math.abs(dy) < bd) { bd = dx + Math.abs(dy); best = [tr, call ? 'call' : 'use']; }
        }
        if (best && (best[0].phoneNow !== 'call')) best[0].phoneNow = best[1];
      }
      // --- har bir track uchun holat
      trs.forEach((tr, i) => {
        tr.phoneHist.push([t0, tr.phoneNow]); tr.phoneHist = tr.phoneHist.filter(x => t0 - x[0] < 1500);
        const votes = tr.phoneHist.filter(x => x[1]).map(x => x[1]);
        tr.states = [];
        if (votes.length >= Math.max(1, Math.floor(tr.phoneHist.length / 3))) tr.states.push(votes.filter(v => v === 'call').length >= votes.filter(v => v === 'use').length ? 'phone_call' : 'phone_use');
        tr.jaw.push([t0, mouthRatio(dets[i].landmarks.positions)]); tr.jaw = tr.jaw.filter(x => t0 - x[0] < 2500);
        if (!tr.states.includes('phone_call') && tr.jaw.length >= 5) {
          const v = tr.jaw.map(x => x[1]);
          if (std(v) > 0.035 / Math.max(0.3, cfg.settings.talk_sensitivity) && Math.max(...v) > 0.12) tr.states.push('talking');
        }
      });
      // --- shaxsni aniqlash (har tickda bittadan)
      if (!busyObs) {
        const cand = trs.filter(tr => tr.box.w >= 60 && t0 >= tr.ident.nextObs).sort((a, b) => a.ident.nextObs - b.ident.nextObs)[0];
        if (cand) {
          busyObs = true; cand.ident.nextObs = t0 + (cand.ident.eid ? 8000 : 900);
          const c = crop(cand.box);
          FA.detectSingleFace(c, new FA.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })).withFaceLandmarks(true).withFaceDescriptor().withAgeAndGender()
            .then(r => { if (r) { cand.ident.observe(r); cand.ident.photo = c.toDataURL('image/jpeg', 0.8); } }).catch(() => {}).finally(() => { busyObs = false; });
        }
      }
      // --- bir xodim ikki odamga berilmasin
      const seen = {};
      trs.forEach(tr => { if (tr.ident.eid) (seen[tr.ident.eid] ||= []).push(tr); });
      Object.values(seen).forEach(l => { if (l.length > 1) { l.sort((a, b) => a.ident.score - b.ident.score); l.slice(1).forEach(tr => { tr.ident.win = []; tr.ident.eid = null; tr.ident.name = null; }); } });
      draw(trs, phones);
      if (t0 - lastPost >= 1000) { lastPost = t0; post(trs, t0); }
      renderPeople(trs);
    }
  } catch (e) { console.error(e); st('Xatolik: ' + e.message, 'bad'); }
  setTimeout(tick, Math.max(30, 400 - (performance.now() - t0)));
}

function draw(trs, phones) {
  ov.width = video.videoWidth; ov.height = video.videoHeight; octx.clearRect(0, 0, ov.width, ov.height); octx.lineWidth = Math.max(2, ov.width / 300); octx.font = `${Math.max(14, ov.width / 40)}px system-ui`;
  for (const p of phones) { octx.strokeStyle = '#d946ef'; octx.strokeRect(p.originX, p.originY, p.width, p.height); }
  for (const tr of trs) {
    const s = tr.states || [], col = s.includes('phone_call') ? '#ef4444' : s.includes('phone_use') ? '#f97316' : s.includes('talking') ? '#0ea5e9' : tr.ident.eid ? '#22c55e' : '#9ca3af';
    octx.strokeStyle = col; octx.strokeRect(tr.box.x, tr.box.y, tr.box.w, tr.box.h);
    const g = tr.ident.gender; const label = (tr.ident.name || `Noma'lum${g ? (g === 'M' ? ' erkak' : ' ayol') : ''}`) + (s.length ? ' · ' + s.map(x => ({ phone_call: 'telefonda', phone_use: 'telefon', talking: 'gaplashmoqda' })[x]).join(', ') : '');
    const tw = octx.measureText(label).width + 10; octx.fillStyle = col; octx.fillRect(tr.box.x, Math.max(0, tr.box.y - 24), tw, 22); octx.fillStyle = '#fff'; octx.fillText(label, tr.box.x + 5, Math.max(16, tr.box.y - 7));
  }
}
function renderPeople(trs) {
  const el = $('people');
  if (!trs.length) { el.innerHTML = '<span class="mute">Hozircha hech kim ko\'rinmayapti</span>'; return; }
  const names = { phone_call: '📱 telefonda gaplashmoqda', phone_use: '📲 telefon ishlatmoqda', talking: '💬 gaplashmoqda' };
  el.innerHTML = trs.map(tr => { const g = tr.ident.gender; return `<div><b>${esc(tr.ident.name || "Noma'lum")}</b><span class="mute">${g ? (g === 'M' ? '♂' : '♀') : ''} ${tr.ident.age ? '~' + tr.ident.age : ''} ${(tr.states || []).map(s => names[s]).join(' ') || '✅ ish joyida'}</span></div>`; }).join('');
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function post(trs, t) {
  const minMs = (cfg.settings.min_event_sec || 3) * 1000, people = [], unknown = [];
  for (const tr of trs) {
    const id = tr.ident, label = `Noma'lum (${cfg.camera.name} #${tr.id}-${SESS})`;
    if (!id.eid && t - tr.born < 4000) continue; // qisqa vaqtli shovqinni yubormaymiz
    const snaps = {};
    for (const k of ['phone_call', 'phone_use', 'talking']) {
      if ((tr.states || []).includes(k)) { tr.lastActive[k] = t; tr.since[k] ??= t; if (!tr.snapped[k] && t - tr.since[k] >= minMs) { snaps[k] = snapshot(); tr.snapped[k] = true; } }
      else if (tr.lastActive[k] && t - tr.lastActive[k] > 3000) { delete tr.since[k]; delete tr.snapped[k]; delete tr.lastActive[k]; }
    }
    people.push({ eid: id.eid, label: id.eid ? '' : label, kinds: tr.states || [], snaps });
    if (id.unknownReady && id.last) {
      id.unkSent = true;
      unknown.push({ label, gender: id.gender || (id.last.gender === 'male' ? 'M' : 'F'), age: id.age, descriptor: Array.from(id.last.descriptor), photo: id.photo || '' });
    }
  }
  try {
    const r = await fetch('/api/monitor/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ c: CAM, k: KEY, people, unknown }) });
    if (r.status === 403) { running = false; st("Kalit noto'g'ri: kabinetdan yangi havola oling", 'bad'); return; }
    st(`✅ Ishlayapti · ko'rinayotganlar: ${trs.length}`, 'ok');
  } catch { st('Aloqa uzildi, qayta urinilmoqda...', 'bad'); }
  if (Date.now() - (cfgAt ||= Date.now()) > 60000) { cfgAt = Date.now(); getConfig().then(c => cfg = c).catch(() => {}); }
}
let cfgAt = 0;

$('go').onclick = async () => {
  try {
    if (!navigator.mediaDevices) throw new Error('Kameraga ruxsat berilmadi: sahifa HTTPS orqali ochilishi kerak');
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: $('facing').value, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = s; await video.play(); $('go').disabled = true; running = true;
    try { wake = await navigator.wakeLock.request('screen'); } catch {}
    document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible' && running) { try { wake = await navigator.wakeLock.request('screen'); } catch {} } });
    tick();
  } catch (e) { st('Kamerani yoqib bo\'lmadi: ' + e.message, 'bad'); }
};
boot();
