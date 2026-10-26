'use strict';
const $ = id => document.getElementById(id);
const store = {
  get: (k, d = '') => { try { return localStorage.getItem('jv_' + k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('jv_' + k, v); } catch {} },
};

/* ---------- UI ---------- */
function say(text, who = 'j') {
  const d = document.createElement('div');
  d.className = 'm ' + who;
  d.textContent = text;
  $('log').append(d);
  $('log').scrollTop = 1e9;
  if (who === 'j' && store.get('speak', '1') === '1') speak(text);
}
const setStatus = t => ($('status').textContent = t);

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = store.get('lang', 'uz-UZ');
  u.onstart = () => rec && always && stopRec();
  u.onend = () => always && startRec();
  speechSynthesis.speak(u);
}

/* ---------- Actions (telefon bilan ishlash) ---------- */
const contacts = () =>
  Object.fromEntries(store.get('contacts').split('\n').map(l => l.split('=').map(s => s.trim())).filter(p => p[1]));
const resolveNumber = who => {
  const c = contacts();
  const key = Object.keys(c).find(n => who.toLowerCase().startsWith(n.toLowerCase()));
  return key ? c[key] : who.replace(/[^\d+]/g, '');
};
const go = url => { location.href = url; };
const openTab = url => { window.open(url, '_blank') || go(url); };
const q = encodeURIComponent;

let torchTrack = null;
async function torch(on) {
  if (!on) { torchTrack?.stop(); torchTrack = null; return 'Chiroq o\'chirildi.'; }
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const t = s.getVideoTracks()[0];
    await t.applyConstraints({ advanced: [{ torch: true }] });
    torchTrack = t;
    return 'Chiroq yoqildi.';
  } catch { return 'Bu qurilma brauzerida chiroqni boshqarib bo\'lmaydi (Android Chrome kerak).'; }
}

function notify(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
  navigator.vibrate?.([300, 150, 300]);
  say(`${title}: ${body}`);
}

const A = {
  call: ({ who }) => { go('tel:' + resolveNumber(who)); return `${who}ga qo'ng'iroq qilyapman.`; },
  sms: ({ who, text = '' }) => { go(`sms:${resolveNumber(who)}?body=${q(text)}`); return `${who}ga SMS tayyor, yuborishni tasdiqlang.`; },
  whatsapp: ({ who, text = '' }) => { openTab(`https://wa.me/${resolveNumber(who).replace('+', '')}?text=${q(text)}`); return 'WhatsApp ochilmoqda.'; },
  telegram: ({ who }) => { openTab(`https://t.me/${who.replace('@', '')}`); return 'Telegram ochilmoqda.'; },
  email: ({ to = '', subject = '', text = '' }) => { go(`mailto:${to}?subject=${q(subject)}&body=${q(text)}`); return 'Xat tayyor.'; },
  search: ({ query }) => { openTab('https://www.google.com/search?q=' + q(query)); return `"${query}" qidirilmoqda.`; },
  youtube: ({ query }) => { openTab('https://www.youtube.com/results?search_query=' + q(query)); return `YouTube: ${query}.`; },
  music: ({ query }) => { openTab('https://open.spotify.com/search/' + q(query)); return `Musiqa: ${query}.`; },
  maps: ({ query }) => { openTab('https://www.google.com/maps/search/?api=1&query=' + q(query)); return `Xaritada: ${query}.`; },
  navigate: ({ query }) => { openTab('https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + q(query)); return `Yo'l: ${query}.`; },
  open_url: ({ url }) => { openTab(/^https?:/.test(url) ? url : 'https://' + url); return 'Ochilmoqda.'; },
  alarm: ({ hour, minutes = 0, label = 'Jarvis' }) => {
    go(`intent://#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${hour};i.android.intent.extra.alarm.MINUTES=${minutes};S.android.intent.extra.alarm.MESSAGE=${q(label)};B.android.intent.extra.alarm.SKIP_UI=false;end`);
    return `Budilnik ${hour}:${String(minutes).padStart(2, '0')} ga qo'yilmoqda (Android).`;
  },
  timer: ({ seconds, label = 'Taymer' }) => {
    setTimeout(() => notify(label, 'Vaqt tugadi!'), seconds * 1000);
    return `${label}: ${seconds >= 60 ? Math.round(seconds / 60) + ' daqiqa' : seconds + ' soniya'} (ilova ochiq turishi kerak).`;
  },
  remind: ({ minutes, text }) => A.timer({ seconds: minutes * 60, label: 'Eslatma: ' + text }),
  torch: ({ on = true }) => torch(on),
  note: ({ text }) => {
    const n = JSON.parse(store.get('notes', '[]')); n.push(text); store.set('notes', JSON.stringify(n));
    return 'Yozib qo\'ydim.';
  },
  read_notes: () => {
    const n = JSON.parse(store.get('notes', '[]'));
    return n.length ? n.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'Eslatmalar yo\'q.';
  },
  time: () => new Date().toLocaleString('uz-UZ', { dateStyle: 'full', timeStyle: 'short' }),
  battery: async () => {
    if (!navigator.getBattery) return 'Batareya ma\'lumoti mavjud emas.';
    const b = await navigator.getBattery();
    return `Batareya ${Math.round(b.level * 100)}%${b.charging ? ', zaryadlanyapti' : ''}.`;
  },
  location: () => new Promise(r => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(
        p => r(`Koordinata: ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`),
        () => r('Joylashuvga ruxsat berilmadi.'))
    : r('Joylashuv mavjud emas.')),
  copy: async ({ text }) => { await navigator.clipboard.writeText(text); return 'Nusxalandi.'; },
  share: async ({ text }) => { await navigator.share?.({ text }); return 'Ulashish oynasi ochildi.'; },
  vibrate: () => { navigator.vibrate?.(500); return 'Bzzz.'; },
};

/* ---------- Oddiy (offlayn) buyruq tahlilchisi: uz / ru / en ---------- */
const LOCAL = [
  [/^(.+?)(ga|ni|\s+ga)?\s+(qo'?ng'?iroq|qongiroq|zvonok|call|позвони|звонок)/i, m => ['call', { who: m[1].trim() }]],
  [/^(call|позвони|qo'?ng'?iroq qil)\s+(.+)/i, m => ['call', { who: m[2].trim() }]],
  [/^(.+?)(ga)?\s+(sms|смс)\s*(.*)/i, m => ['sms', { who: m[1].trim(), text: m[4] }]],
  [/(youtube|ютуб)\s+(.+)/i, m => ['youtube', { query: m[2] }]],
  [/(musiqa|music|музыка|spotify)\s+(.+)/i, m => ['music', { query: m[2] }]],
  [/(yo'?l|navigat|маршрут|route to)\s+(.+)/i, m => ['navigate', { query: m[2] }]],
  [/(xarita|map|карта)\s+(.+)/i, m => ['maps', { query: m[2] }]],
  [/(qidir|search|найди|google)\s+(.+)/i, m => ['search', { query: m[2] }]],
  [/(\d+)\s*(daqiqa|minut|min|минут)\w*.*(taymer|timer|таймер)|(taymer|timer|таймер).*?(\d+)\s*(daqiqa|minut|min|минут)/i,
    m => ['timer', { seconds: 60 * +(m[1] || m[5]) }]],
  [/(budilnik|alarm|будильник).*?(\d{1,2})[:.\s](\d{2})/i, m => ['alarm', { hour: +m[2], minutes: +m[3] }]],
  [/(chiroq|fonar|flashlight|фонарик).*(o'?ch|off|выкл)/i, () => ['torch', { on: false }]],
  [/(chiroq|fonar|flashlight|фонарик)/i, () => ['torch', { on: true }]],
  [/(eslatmalarni|notes|заметки).*(o'?qi|read|покажи)|^eslatmalar$/i, () => ['read_notes', {}]],
  [/(yoz|note|запиши|eslatma)\s+(.+)/i, m => ['note', { text: m[2] }]],
  [/(batareya|battery|заряд)/i, () => ['battery', {}]],
  [/(soat|vaqt|time|который час|sana)/i, () => ['time', {}]],
  [/(joylashuv|location|где я)/i, () => ['location', {}]],
];

async function runAction(name, args) {
  const f = A[name];
  if (!f) return `Noma'lum amal: ${name}`;
  try { return await f(args || {}); } catch (e) { return 'Xatolik: ' + e.message; }
}

async function localBrain(text) {
  for (const [re, fn] of LOCAL) {
    const m = text.match(re);
    if (m) { const [n, a] = fn(m); return runAction(n, a); }
  }
  return 'Tushunmadim. Sozlamalardan Claude API kalitini kiriting — shunda har qanday buyruqni tushunaman.';
}

/* ---------- Claude miyasi (ixtiyoriy) ---------- */
const TOOLS = [
  ['call', 'Telefon qo\'ng\'irog\'i', { who: 's' }],
  ['sms', 'SMS yozish', { who: 's', text: 's' }],
  ['whatsapp', 'WhatsApp xabar', { who: 's', text: 's' }],
  ['telegram', 'Telegram chat ochish', { who: 's' }],
  ['email', 'Email yozish', { to: 's', subject: 's', text: 's' }],
  ['search', 'Google qidiruv', { query: 's' }],
  ['youtube', 'YouTube qidiruv', { query: 's' }],
  ['music', 'Musiqa qidirish (Spotify)', { query: 's' }],
  ['maps', 'Xaritada joy qidirish', { query: 's' }],
  ['navigate', 'Yo\'l ko\'rsatish', { query: 's' }],
  ['open_url', 'Sayt ochish', { url: 's' }],
  ['alarm', 'Budilnik (soat 0-23, daqiqa)', { hour: 'n', minutes: 'n' }],
  ['timer', 'Taymer (soniyalarda)', { seconds: 'n' }],
  ['remind', 'Eslatma N daqiqadan keyin', { minutes: 'n', text: 's' }],
  ['torch', 'Chiroqni yoqish/o\'chirish', { on: 'b' }],
  ['note', 'Eslatma yozib qo\'yish', { text: 's' }],
  ['read_notes', 'Eslatmalarni o\'qish', {}],
  ['battery', 'Batareya holati', {}],
  ['location', 'Joylashuv', {}],
  ['copy', 'Buferga nusxalash', { text: 's' }],
].map(([name, description, props]) => ({
  name, description,
  input_schema: {
    type: 'object',
    properties: Object.fromEntries(Object.entries(props).map(([k, t]) => [k, { type: { s: 'string', n: 'number', b: 'boolean' }[t] }])),
    required: Object.keys(props).filter(k => k !== 'on'),
  },
}));

const history = [];
async function claudeBrain(text, key) {
  history.push({ role: 'user', content: text });
  const system = `Sen Jarvis — foydalanuvchining shaxsiy AI yordamchisisan (Tony Stark Jarvis kabi). Foydalanuvchi tilida (asosan o'zbekcha) qisqa, aniq, xushmuomala javob ber. Telefonni boshqarish uchun vositalardan foydalan. Hozir: ${new Date().toLocaleString('uz-UZ')}. Kontaktlar: ${Object.keys(contacts()).join(', ') || 'yo\'q'}.`;
  for (let i = 0; i < 4; i++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 600, system, tools: TOOLS, messages: history.slice(-20) }),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    const data = await r.json();
    history.push({ role: 'assistant', content: data.content });
    const uses = data.content.filter(b => b.type === 'tool_use');
    const reply = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    if (!uses.length) return reply;
    const results = [];
    for (const u of uses) results.push({ type: 'tool_result', tool_use_id: u.id, content: String(await runAction(u.name, u.input)) });
    history.push({ role: 'user', content: results });
    if (reply && i === 0) say(reply);
  }
  return 'Bajarildi.';
}

async function handle(text) {
  text = text.trim();
  if (!text) return;
  say(text, 'u');
  $('core').classList.add('think');
  setStatus('O\'ylayapman…');
  let out;
  try {
    const key = store.get('key');
    out = key ? await claudeBrain(text, key) : await localBrain(text);
  } catch (e) {
    out = (await localBrain(text)) + ` (AI ulanmadi: ${e.message})`;
  }
  $('core').classList.remove('think');
  setStatus('Tayyor');
  say(out);
}

/* ---------- Ovoz bilan tinglash ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, always = false, oneShot = false;

function startRec() {
  if (!SR) { setStatus('Bu brauzer ovozni tanimaydi (Chrome ishlating). Yozib buyruq bering.'); return; }
  if (rec) return;
  rec = new SR();
  rec.lang = store.get('lang', 'uz-UZ');
  rec.interimResults = false;
  rec.onstart = () => { $('core').classList.add('listen'); setStatus(always ? 'Tinglayapman… (chaqiruv so\'zi: ' + wakeWord() + ')' : 'Gapiring…'); };
  rec.onresult = e => {
    let t = e.results[e.results.length - 1][0].transcript.trim();
    if (always && !oneShot) {
      const i = t.toLowerCase().indexOf(wakeWord());
      if (i < 0) return;
      t = t.slice(i + wakeWord().length).replace(/^[,\s]+/, '');
      if (!t) { oneShot = true; say('Eshitaman, ser.'); return; }
    }
    oneShot = false;
    handle(t);
  };
  rec.onerror = e => { if (e.error === 'not-allowed') { always = false; setStatus('Mikrofonga ruxsat bering.'); } };
  rec.onend = () => {
    rec = null;
    $('core').classList.remove('listen');
    if (always && !speechSynthesis.speaking) setTimeout(startRec, 300);
  };
  try { rec.start(); } catch { rec = null; }
}
function stopRec() { const r = rec; rec = null; try { r?.abort(); } catch {} $('core').classList.remove('listen'); }
const wakeWord = () => (store.get('wake', 'jarvis') || 'jarvis').toLowerCase();

/* ---------- Ulash ---------- */
$('core').onclick = () => {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  if (rec) { stopRec(); setStatus('To\'xtadi'); } else startRec();
};
$('form').onsubmit = e => { e.preventDefault(); const v = $('input').value; $('input').value = ''; handle(v); };

[['📞 Qo\'ng\'iroq', 'Alisherga qo\'ng\'iroq qil'], ['🔦 Chiroq', 'chiroqni yoq'], ['🔋 Batareya', 'batareya'],
 ['⏱ 5 daq taymer', '5 daqiqa taymer'], ['🗺 Xarita', 'xarita kafe'], ['🎵 Musiqa', 'musiqa Shahzoda'], ['🕒 Vaqt', 'soat necha']]
  .forEach(([label, cmd]) => {
    const b = document.createElement('button'); b.textContent = label; b.onclick = () => handle(cmd); $('chips').append(b);
  });

const cfg = $('cfg');
$('cfgBtn').onclick = () => {
  $('lang').value = store.get('lang', 'uz-UZ'); $('key').value = store.get('key'); $('wake').value = store.get('wake', 'jarvis');
  $('always').checked = always; $('speak').checked = store.get('speak', '1') === '1'; $('contacts').value = store.get('contacts');
  cfg.showModal();
};
cfg.onclose = () => {
  store.set('lang', $('lang').value); store.set('key', $('key').value.trim()); store.set('wake', $('wake').value.trim());
  store.set('speak', $('speak').checked ? '1' : '0'); store.set('contacts', $('contacts').value);
  always = $('always').checked;
  stopRec();
  if (always) startRec();
};

setInterval(() => { $('clock').textContent = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }); }, 1000);
navigator.getBattery?.().then(b => { const u = () => ($('batt').textContent = '🔋' + Math.round(b.level * 100) + '%'); u(); b.onlevelchange = u; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
say('Salom! Men Jarvisman. Qanday yordam beray?');
