'use strict';
const $ = id => document.getElementById(id);
const store = {
  get: (k, d = '') => { try { return localStorage.getItem('jv_' + k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('jv_' + k, v); } catch {} },
};
const getJSON = (k, d) => { try { return JSON.parse(store.get(k) || 'null') ?? d; } catch { return d; } };
const setJSON = (k, v) => store.set(k, JSON.stringify(v));
const q = encodeURIComponent;

/* ---------- UI ---------- */
function say(text, who = 'j', img) {
  const d = document.createElement('div');
  d.className = 'm ' + who;
  if (img) { const i = document.createElement('img'); i.src = img; d.append(i); }
  d.append(document.createTextNode(text));
  $('log').append(d);
  $('log').scrollTop = 1e9;
  if (who === 'j' && store.get('speak', '1') === '1') speak(text);
}
const setStatus = t => ($('status').textContent = t);

/* O'zbekcha ovoz bo'lmasa — turkcha ovoz lotin o'zbekchasini eng yaxshi o'qiydi */
function pickVoice(lang) {
  const vs = speechSynthesis.getVoices();
  const base = lang.slice(0, 2);
  let v = vs.find(x => x.lang.replace('_', '-').startsWith(base));
  let l = lang;
  if (!v && base === 'uz') { v = vs.find(x => x.lang.startsWith('tr')); l = 'tr-TR'; }
  return { v, l };
}
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const clean = text.replace(/[*#_`>]|https?:\/\/\S+/g, '').trim();
  if (!clean) return;
  const { v, l } = pickVoice(store.get('lang', 'uz-UZ'));
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = l; if (v) u.voice = v;
  u.onstart = () => rec && always && stopRec();
  u.onend = () => always && startRec();
  speechSynthesis.speak(u);
}

/* ---------- Eslatmalar (doimiy) ---------- */
async function notify(title, body) {
  navigator.vibrate?.([300, 150, 300, 150, 300]);
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && Notification.permission === 'granted') await reg.showNotification(title, { body, icon: 'icon.svg', tag: body });
  } catch {}
  say(`${title}: ${body}`);
}
function addReminder(seconds, text) {
  const l = getJSON('rem', []); l.push({ due: Date.now() + seconds * 1000, text }); setJSON('rem', l);
}
function tickReminders() {
  const now = Date.now(), l = getJSON('rem', []);
  const due = l.filter(r => r.due <= now);
  if (!due.length) return;
  setJSON('rem', l.filter(r => r.due > now));
  due.forEach(r => notify('Jarvis', r.text));
}
const dur = s => (s >= 3600 ? `${Math.round(s / 360) / 10} soat` : s >= 60 ? `${Math.round(s / 60)} daqiqa` : `${s} soniya`);

/* ---------- Yordamchi funksiyalar ---------- */
const contacts = () =>
  Object.fromEntries(store.get('contacts').split('\n').map(l => l.split('=').map(s => s.trim())).filter(p => p[0] && p[1]));
const resolveNumber = who => {
  const c = contacts();
  const key = Object.keys(c).find(n => who.toLowerCase().startsWith(n.toLowerCase()));
  return key ? c[key] : who.replace(/[^\d+]/g, '');
};
const go = url => { location.href = url; };
const openTab = url => { window.open(url, '_blank') || go(url); };
const intent = (action, extra = '') => `intent://#Intent;action=${action};${extra}end`;

async function camStream(facing) {
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
}
async function takePhoto(facing = 'environment') {
  const s = await camStream(facing);
  const v = $('cam'); v.srcObject = s; await v.play();
  await new Promise(r => setTimeout(r, 700));
  const k = Math.min(1, 1024 / v.videoWidth);
  const c = document.createElement('canvas'); c.width = v.videoWidth * k; c.height = v.videoHeight * k;
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  s.getTracks().forEach(t => t.stop());
  return c.toDataURL('image/jpeg', 0.7);
}
const imgBlock = dataUrl => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: dataUrl.split(',')[1] } });

let torchTrack = null;
async function torch(on) {
  if (!on) { torchTrack?.stop(); torchTrack = null; return 'Chiroq o\'chirildi.'; }
  try {
    const t = (await camStream('environment')).getVideoTracks()[0];
    await t.applyConstraints({ advanced: [{ torch: true }] });
    torchTrack = t;
    return 'Chiroq yoqildi.';
  } catch { return 'Bu brauzerda chiroqni boshqarib bo\'lmaydi (Android Chrome kerak).'; }
}

const getPos = () => new Promise((res, rej) => navigator.geolocation
  ? navigator.geolocation.getCurrentPosition(p => res(p.coords), rej, { timeout: 8000 }) : rej(new Error('yo\'q')));
const WX = c => c === 0 ? 'ochiq' : c < 4 ? 'qisman bulutli' : c < 50 ? 'tuman' : c < 70 ? 'yomg\'ir' : c < 80 ? 'qor' : c < 90 ? 'jala' : 'momaqaldiroq';

async function weather({ city }) {
  let lat, lon, name = city;
  if (city) {
    const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q(city)}&count=1`)).json();
    if (!g.results?.[0]) return `"${city}" topilmadi.`;
    ({ latitude: lat, longitude: lon, name } = g.results[0]);
  } else {
    try { ({ latitude: lat, longitude: lon } = await getPos()); name = 'Sizning joyingiz'; }
    catch { lat = 41.31; lon = 69.28; name = 'Toshkent'; }
  }
  const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=3`)).json();
  const c = w.current, d = w.daily;
  const days = ['Bugun', 'Ertaga', 'Indinga'].map((n, i) =>
    `${n}: ${Math.round(d.temperature_2m_min[i])}…${Math.round(d.temperature_2m_max[i])}°, ${WX(d.weather_code[i])}, yog'in ehtimoli ${d.precipitation_probability_max[i]}%`);
  return `${name}: hozir ${Math.round(c.temperature_2m)}° (his qilinishi ${Math.round(c.apparent_temperature)}°), ${WX(c.weather_code)}, shamol ${Math.round(c.wind_speed_10m)} km/soat.\n${days.join('\n')}`;
}

async function currency({ amount = 1, from, to }) {
  const f = from.toUpperCase(), t = to.toUpperCase();
  const r = await (await fetch('https://open.er-api.com/v6/latest/' + f)).json();
  if (r.result !== 'success' || !r.rates[t]) return 'Valyuta kursini olib bo\'lmadi.';
  return `${amount} ${f} = ${(amount * r.rates[t]).toLocaleString('en', { maximumFractionDigits: 2 })} ${t} (kurs ${r.rates[t].toFixed(4)})`;
}

const APPS = {
  whatsapp: 'whatsapp://send', telegram: 'tg://', instagram: 'instagram://', youtube: 'vnd.youtube://', spotify: 'spotify:',
  gmail: 'googlegmail://', facebook: 'fb://', tiktok: 'snssdk1128://', twitter: 'twitter://',
  camera: intent('android.media.action.IMAGE_CAPTURE'),
  settings: intent('android.settings.SETTINGS'), wifi: intent('android.settings.WIFI_SETTINGS'),
  bluetooth: intent('android.settings.BLUETOOTH_SETTINGS'), display: intent('android.settings.DISPLAY_SETTINGS'),
  sound: intent('android.settings.SOUND_SETTINGS'), battery: intent('android.intent.action.POWER_USAGE_SUMMARY'),
  clock: intent('android.intent.action.SHOW_ALARMS'), dialer: 'tel:', airplane: intent('android.settings.AIRPLANE_MODE_SETTINGS'),
  location: intent('android.settings.LOCATION_SOURCE_SETTINGS'), storage: intent('android.settings.INTERNAL_STORAGE_SETTINGS'),
};

function calc({ expression }) {
  const e = expression.replace(/[x×]/gi, '*').replace(/÷/g, '/').replace(/\^/g, '**').replace(/,/g, '.');
  if (!/^[\d+\-*/().%\s]+$/.test(e)) return 'Faqat arifmetik ifodalar.';
  return `${expression} = ${Function(`"use strict";return (${e})`)()}`;
}

/* ---------- Amallar ---------- */
const A = {
  call: ({ who }) => { go('tel:' + resolveNumber(who)); return `${who}ga qo'ng'iroq qilyapman.`; },
  sms: ({ who, text = '' }) => { go(`sms:${resolveNumber(who)}?body=${q(text)}`); return `${who}ga SMS tayyor, yuborishni tasdiqlang.`; },
  whatsapp: ({ who, text = '' }) => { openTab(`https://wa.me/${resolveNumber(who).replace('+', '')}?text=${q(text)}`); return 'WhatsApp ochilmoqda.'; },
  telegram: ({ who }) => { openTab(`https://t.me/${who.replace('@', '')}`); return 'Telegram ochilmoqda.'; },
  email: ({ to = '', subject = '', text = '' }) => { go(`mailto:${to}?subject=${q(subject)}&body=${q(text)}`); return 'Xat tayyor.'; },
  open_app: ({ app }) => { const u = APPS[app]; if (!u) return `Noma'lum ilova: ${app}`; go(u); return `${app} ochilmoqda.`; },
  search: ({ query }) => { openTab('https://www.google.com/search?q=' + q(query)); return `"${query}" qidirilmoqda.`; },
  youtube: ({ query }) => { openTab('https://www.youtube.com/results?search_query=' + q(query)); return `YouTube: ${query}.`; },
  music: ({ query }) => { openTab('https://open.spotify.com/search/' + q(query)); return `Musiqa: ${query}.`; },
  maps: ({ query }) => { openTab('https://www.google.com/maps/search/?api=1&query=' + q(query)); return `Xaritada: ${query}.`; },
  navigate: ({ query }) => { openTab('https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + q(query)); return `Yo'l: ${query}.`; },
  open_url: ({ url }) => { openTab(/^https?:/.test(url) ? url : 'https://' + url); return 'Ochilmoqda.'; },
  alarm: ({ hour, minutes = 0, label = 'Jarvis' }) => {
    go(intent('android.intent.action.SET_ALARM', `i.android.intent.extra.alarm.HOUR=${hour};i.android.intent.extra.alarm.MINUTES=${minutes};S.android.intent.extra.alarm.MESSAGE=${q(label)};`));
    return `Budilnik ${hour}:${String(minutes).padStart(2, '0')} ga qo'yilmoqda (Android).`;
  },
  timer: ({ seconds, label = 'Taymer tugadi!' }) => { addReminder(seconds, label); return `Taymer: ${dur(seconds)}.`; },
  remind: ({ minutes, text }) => { addReminder(minutes * 60, text); return `${dur(minutes * 60)}dan keyin eslataman: ${text}`; },
  list_reminders: () => {
    const l = getJSON('rem', []);
    return l.length ? l.map(r => `• ${new Date(r.due).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} — ${r.text}`).join('\n') : 'Faol eslatma yo\'q.';
  },
  cancel_reminders: () => { setJSON('rem', []); return 'Barcha eslatmalar bekor qilindi.'; },
  torch: ({ on = true }) => torch(on),
  note: ({ text }) => { const n = getJSON('notes', []); n.push(text); setJSON('notes', n); return 'Yozib qo\'ydim.'; },
  read_notes: () => { const n = getJSON('notes', []); return n.length ? n.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'Eslatmalar yo\'q.'; },
  add_task: ({ text }) => { const t = getJSON('tasks', []); t.push({ text, done: false }); setJSON('tasks', t); return `Vazifa qo'shildi: ${text}`; },
  list_tasks: () => {
    const t = getJSON('tasks', []);
    return t.length ? t.map((x, i) => `${i + 1}. [${x.done ? 'x' : ' '}] ${x.text}`).join('\n') : 'Vazifalar yo\'q.';
  },
  done_task: ({ number }) => {
    const t = getJSON('tasks', []); if (!t[number - 1]) return 'Bunday raqamli vazifa yo\'q.';
    t[number - 1].done = true; setJSON('tasks', t); return `Bajarildi: ${t[number - 1].text}`;
  },
  clear_tasks: () => { setJSON('tasks', getJSON('tasks', []).filter(x => !x.done)); return 'Bajarilganlar o\'chirildi.'; },
  remember: ({ fact }) => { const m = getJSON('mem', []); m.push(fact); setJSON('mem', m); return `Esimda: ${fact}`; },
  forget: ({ fact }) => {
    const m = getJSON('mem', []), r = m.filter(x => !x.toLowerCase().includes(fact.toLowerCase()));
    setJSON('mem', r); return `${m.length - r.length} ta yozuv o'chirildi.`;
  },
  save_routine: ({ name, steps }) => {
    const r = getJSON('routines', {}); r[name.toLowerCase()] = steps; setJSON('routines', r);
    return `"${name}" rejimi saqlandi (${steps.length} qadam).`;
  },
  run_routine: async ({ name }) => {
    const steps = getJSON('routines', {})[name.toLowerCase()];
    if (!steps) return `"${name}" rejimi yo'q. Mavjud: ${Object.keys(getJSON('routines', {})).join(', ') || 'hech narsa'}`;
    const out = [];
    for (const s of steps) { out.push(await runAction(s.tool, s.args)); await new Promise(r => setTimeout(r, 600)); }
    return out.join('\n');
  },
  weather, currency, calc,
  look: async ({ camera = 'back' }) => {
    const url = await takePhoto(camera === 'front' ? 'user' : 'environment');
    say('📷', 'j', url);
    return { content: [imgBlock(url), { type: 'text', text: 'Kameradan olingan rasm.' }] };
  },
  time: () => new Date().toLocaleString('uz-UZ', { dateStyle: 'full', timeStyle: 'short' }),
  battery: async () => {
    if (!navigator.getBattery) return 'Batareya ma\'lumoti mavjud emas.';
    const b = await navigator.getBattery();
    return `Batareya ${Math.round(b.level * 100)}%${b.charging ? ', zaryadlanyapti' : ''}.`;
  },
  location: async () => {
    try { const c = await getPos(); return `Koordinata: ${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)} (aniqlik ${Math.round(c.accuracy)} m)`; }
    catch { return 'Joylashuvga ruxsat berilmadi.'; }
  },
  copy: async ({ text }) => { await navigator.clipboard.writeText(text); return 'Nusxalandi.'; },
  paste: async () => navigator.clipboard.readText(),
  share: async ({ text }) => { await navigator.share?.({ text }); return 'Ulashish oynasi ochildi.'; },
  vibrate: () => { navigator.vibrate?.(500); return 'Bzzz.'; },
};

async function runAction(name, args) {
  const f = A[name];
  if (!f) return `Noma'lum amal: ${name}`;
  try { return await f(args || {}); } catch (e) { return 'Xatolik: ' + e.message; }
}

/* ---------- Oddiy (offlayn) buyruq tahlilchisi: uz / ru / en ---------- */
const LOCAL = [
  [/(\d+)\s*(daqiqa|soat)dan keyin\s+(.+?)\s*(deb\s+)?eslat/i, m => ['remind', { minutes: +m[1] * (/soat/i.test(m[2]) ? 60 : 1), text: m[3] }]],
  [/^(.+?)(ga|ni|\s+ga)?\s+(qo'?ng'?iroq|qongiroq|zvonok|call|позвони|звонок)/i, m => ['call', { who: m[1].trim() }]],
  [/^(call|позвони|qo'?ng'?iroq qil)\s+(.+)/i, m => ['call', { who: m[2].trim() }]],
  [/^(.+?)(ga)?\s+(sms|смс)\s*(.*)/i, m => ['sms', { who: m[1].trim(), text: m[4] }]],
  [/(wi-?fi|bluetooth|ekran|tovush|samolyot)\s+sozlama/i, m => ['open_app', { app: { wifi: 'wifi', bluetooth: 'bluetooth', ekran: 'display', tovush: 'sound', samolyot: 'airplane' }[m[1].toLowerCase().replace('-', '')] }]],
  [/(whatsapp|telegram|instagram|youtube|spotify|gmail|facebook|tiktok|kamera|camera)\s*(ni|ni\s+och|och|open|ochib)/i,
    m => ['open_app', { app: m[1].toLowerCase().replace('kamera', 'camera') }]],
  [/(youtube|ютуб)\s+(.+)/i, m => ['youtube', { query: m[2] }]],
  [/(musiqa|music|музыка|spotify)\s+(.+)/i, m => ['music', { query: m[2] }]],
  [/(yo'?l|navigat|маршрут|route to)\s+(.+)/i, m => ['navigate', { query: m[2] }]],
  [/(xarita|map|карта)\s+(.+)/i, m => ['maps', { query: m[2] }]],
  [/(ob-?havo|weather|погода)\s*(.*)/i, m => ['weather', { city: m[2].trim() }]],
  [/(\d+)\s*(daqiqa|minut|min|минут)\w*.*(taymer|timer|таймер)|(taymer|timer|таймер).*?(\d+)\s*(daqiqa|minut|min|минут)/i,
    m => ['timer', { seconds: 60 * +(m[1] || m[5]) }]],
  [/(budilnik|alarm|будильник).*?(\d{1,2})[:.\s](\d{2})/i, m => ['alarm', { hour: +m[2], minutes: +m[3] }]],
  [/(chiroq|fonar|flashlight|фонарик).*(o'?ch|off|выкл)/i, () => ['torch', { on: false }]],
  [/(chiroq|fonar|flashlight|фонарик)/i, () => ['torch', { on: true }]],
  [/(vazifalar|tasks|задачи)/i, () => ['list_tasks', {}]],
  [/(vazifa|task|задача)\s+(.+)/i, m => ['add_task', { text: m[2] }]],
  [/(eslatmalarni|notes|заметки).*(o'?qi|read|покажи)|^eslatmalar$/i, () => ['read_notes', {}]],
  [/(yoz|note|запиши|eslatma)\s+(.+)/i, m => ['note', { text: m[2] }]],
  [/^(hisobla|calc)\s+(.+)/i, m => ['calc', { expression: m[2] }]],
  [/(batareya|battery|заряд)/i, () => ['battery', {}]],
  [/(soat|vaqt|time|который час|sana)/i, () => ['time', {}]],
  [/(joylashuv|location|где я)/i, () => ['location', {}]],
];
async function localBrain(text) {
  for (const [re, fn] of LOCAL) {
    const m = text.match(re);
    if (m) { const [n, a] = fn(m); return runAction(n, a); }
  }
  return 'Tushunmadim. Sozlamalarga Claude API kalitini kiriting — shunda har qanday buyruqni tushunaman, rasmni ko\'raman va internetdan qidiraman.';
}

/* ---------- Claude miyasi ---------- */
const S = { type: 'string' }, N = { type: 'number' }, B = { type: 'boolean' };
const tool = (name, description, props = {}, required = Object.keys(props)) =>
  ({ name, description, input_schema: { type: 'object', properties: props, required } });
const TOOLS = [
  tool('call', 'Telefon qo\'ng\'irog\'i. who — kontakt nomi yoki raqam', { who: S }),
  tool('sms', 'SMS tayyorlash', { who: S, text: S }, ['who']),
  tool('whatsapp', 'WhatsApp xabari', { who: S, text: S }, ['who']),
  tool('telegram', 'Telegram chat ochish (username)', { who: S }),
  tool('email', 'Email yozish', { to: S, subject: S, text: S }, []),
  tool('open_app', 'Ilova yoki telefon sozlamasini ochish', { app: { type: 'string', enum: Object.keys(APPS) } }),
  tool('search', 'Brauzerda Google qidiruvini ochish (javob uchun emas, foydalanuvchi o\'zi ko\'rishi uchun)', { query: S }),
  tool('youtube', 'YouTube\'da qidirish', { query: S }),
  tool('music', 'Spotify\'da musiqa qidirish', { query: S }),
  tool('maps', 'Xaritada joy qidirish', { query: S }),
  tool('navigate', 'Manzilga yo\'l ko\'rsatish', { query: S }),
  tool('open_url', 'Saytni ochish', { url: S }),
  tool('alarm', 'Budilnik qo\'yish (soat 0-23)', { hour: N, minutes: N, label: S }, ['hour']),
  tool('timer', 'Taymer (soniyalarda)', { seconds: N, label: S }, ['seconds']),
  tool('remind', 'N daqiqadan keyin eslatish', { minutes: N, text: S }),
  tool('list_reminders', 'Faol eslatma/taymerlar ro\'yxati'),
  tool('cancel_reminders', 'Barcha eslatmalarni bekor qilish'),
  tool('torch', 'Chiroqni yoqish/o\'chirish', { on: B }, []),
  tool('note', 'Eslatma daftariga yozish', { text: S }),
  tool('read_notes', 'Daftarni o\'qish'),
  tool('add_task', 'Vazifalar ro\'yxatiga qo\'shish', { text: S }),
  tool('list_tasks', 'Vazifalar ro\'yxati'),
  tool('done_task', 'Vazifani bajarilgan deb belgilash (raqam bo\'yicha)', { number: N }),
  tool('clear_tasks', 'Bajarilgan vazifalarni tozalash'),
  tool('remember', 'Foydalanuvchi haqidagi muhim, doimiy faktni xotiraga saqlash (ism, odatlar, oila, afzalliklar)', { fact: S }),
  tool('forget', 'Xotiradan faktni o\'chirish (kalit so\'z bo\'yicha)', { fact: S }),
  tool('save_routine', 'Ko\'p qadamli rejimni saqlash (masalan "ertalab"). steps — [{tool, args}]', {
    name: S, steps: { type: 'array', items: { type: 'object', properties: { tool: S, args: { type: 'object' } }, required: ['tool'] } },
  }),
  tool('run_routine', 'Saqlangan rejimni ishga tushirish', { name: S }),
  tool('weather', 'Ob-havo (shahar bo\'sh bo\'lsa — joriy joylashuv)', { city: S }, []),
  tool('currency', 'Valyuta konvertatsiyasi (USD, UZS, EUR, RUB…)', { amount: N, from: S, to: S }, ['from', 'to']),
  tool('calc', 'Arifmetik hisob', { expression: S }),
  tool('look', 'Telefon kamerasi bilan suratga olib, nimani ko\'rayotganingni tahlil qilish', { camera: { type: 'string', enum: ['back', 'front'] } }, []),
  tool('time', 'Hozirgi sana va vaqt'),
  tool('battery', 'Batareya holati'),
  tool('location', 'Joriy koordinata'),
  tool('copy', 'Matnni buferga nusxalash', { text: S }),
  tool('paste', 'Buferdagi matnni o\'qish'),
  tool('share', 'Ulashish oynasi', { text: S }),
];

const systemPrompt = () => `Sen Jarvis — foydalanuvchining shaxsiy AI yordamchisisan (Tony Stark'dagi Jarvis kabi): aqlli, tezkor, ozgina quruq hazilli, doim "ser" deb hurmat bilan murojaat qilasan. Javoblar OVOZDA o'qiladi: foydalanuvchi tilida (asosan o'zbek lotin), qisqa, oddiy matn, markdown yo'q, ro'yxat/yulduzcha yo'q. Telefonni boshqarish uchun vositalardan foydalan — so'ramasdan, darrov bajar; bir nechta ish so'ralsa, hammasini bajar. Faktlar, yangiliklar, narxlar uchun internetdan qidir (vosita bor bo'lsa). Foydalanuvchi haqida doimiy foydali narsani bilsang, remember bilan saqla. Rasm so'ralsa yoki "nima ko'ryapsan" desa, look vositasini ishlat. Xavfli/qaytarib bo'lmas amalda (qo'ng'iroq, SMS yuborish) kontakt noaniq bo'lsa, qisqa aniqlashtir.
Hozir: ${new Date().toLocaleString('uz-UZ', { dateStyle: 'full', timeStyle: 'short' })}.
Kontaktlar: ${Object.keys(contacts()).join(', ') || 'yo\'q'}.
Saqlangan rejimlar: ${Object.keys(getJSON('routines', {})).join(', ') || 'yo\'q'}.
Xotira: ${getJSON('mem', []).concat(store.get('memory').split('\n').filter(Boolean)).join('; ') || 'bo\'sh'}.`;

const history = [];
const isRealUser = m => m.role === 'user' && (typeof m.content === 'string' || !m.content.some(b => b.type === 'tool_result'));
function trimHistory() {
  while (history.length && (history.length > 24 || !isRealUser(history[0]))) history.shift();
}
function stripImages() {
  const fix = b => (b.type === 'image' ? { type: 'text', text: '[rasm]' } : b);
  history.forEach(m => {
    if (typeof m.content === 'string') return;
    m.content = m.content.map(b => (b.type === 'tool_result' && Array.isArray(b.content) ? { ...b, content: b.content.map(fix) } : fix(b)));
  });
}

async function callApi(key, body) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = ''; try { msg = (await r.json()).error?.message || ''; } catch {}
    const e = new Error(`API ${r.status}${r.status === 401 ? ' (kalit noto\'g\'ri)' : ''} ${msg}`.trim()); e.status = r.status; throw e;
  }
  return r.json();
}

async function claudeBrain(text, key, image) {
  const mark = history.length;
  const content = image ? [imgBlock(image), { type: 'text', text: text || 'Bu nima?' }] : text;
  history.push({ role: 'user', content });
  trimHistory();
  let web = store.get('web', '1') === '1';
  try {
    for (let i = 0; i < 8; i++) {
      const body = {
        model: store.get('model', 'claude-sonnet-5-5'), max_tokens: 1024, system: systemPrompt(), messages: history,
        tools: web ? [...TOOLS, { type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] : TOOLS,
      };
      let data;
      try { data = await callApi(key, body); }
      catch (e) { if (web && e.status === 400) { web = false; i--; continue; } throw e; }
      history.push({ role: 'assistant', content: data.content });
      const reply = data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
      const uses = data.content.filter(b => b.type === 'tool_use');
      if (data.stop_reason === 'pause_turn') { continue; }
      if (!uses.length) return reply || 'Bajarildi, ser.';
      if (reply) say(reply, 'j');
      const results = [];
      for (const u of uses) {
        setStatus('Bajaryapman: ' + u.name);
        const out = await runAction(u.name, u.input);
        results.push({ type: 'tool_result', tool_use_id: u.id, content: out?.content ?? String(out) });
      }
      history.push({ role: 'user', content: results });
    }
    return 'Bajarildi.';
  } catch (e) { history.length = mark; throw e; }
  finally { stripImages(); }
}

async function handle(text, image) {
  text = (text || '').trim();
  if (!text && !image) return;
  say(text || 'Rasm yubordim', 'u', image);
  $('core').classList.add('think');
  setStatus('O\'ylayapman…');
  let out;
  const key = store.get('key');
  try {
    out = key ? await claudeBrain(text, key, image) : image ? 'Rasmni tahlil qilish uchun Claude API kaliti kerak.' : await localBrain(text);
  } catch (e) {
    out = (key && !image ? (await localBrain(text)) + '\n' : '') + `(AI xatosi: ${e.message})`;
  }
  $('core').classList.remove('think');
  setStatus('Tayyor');
  say(out);
}

/* ---------- Ovoz bilan tinglash ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, always = false, oneShot = false, wakeLock = null;
const wakeWord = () => (store.get('wake', 'jarvis') || 'jarvis').toLowerCase();

async function holdScreen(on) {
  try {
    if (on) wakeLock = await navigator.wakeLock?.request('screen');
    else { await wakeLock?.release(); wakeLock = null; }
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (always && document.visibilityState === 'visible') holdScreen(true); });

function startRec() {
  if (!SR) { setStatus('Bu brauzer ovozni tanimaydi (Chrome ishlating). Yozib buyruq bering.'); return; }
  if (rec) return;
  rec = new SR();
  rec.lang = store.get('lang', 'uz-UZ');
  rec.interimResults = false;
  rec.onstart = () => { $('core').classList.add('listen'); setStatus(always ? `Tinglayapman… ("${wakeWord()}" deng)` : 'Gapiring…'); };
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

/* ---------- Ulash ---------- */
$('core').onclick = () => {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
  if (rec) { stopRec(); setStatus('To\'xtadi'); } else startRec();
};
$('form').onsubmit = e => { e.preventDefault(); const v = $('input').value; $('input').value = ''; handle(v); };

$('attach').onclick = () => $('file').click();
$('file').onchange = async () => {
  const f = $('file').files[0]; $('file').value = '';
  if (!f) return;
  const bmp = await createImageBitmap(f);
  const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = bmp.width * k; c.height = bmp.height * k;
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const v = $('input').value; $('input').value = '';
  handle(v, c.toDataURL('image/jpeg', 0.75));
};

[['📞 Qo\'ng\'iroq', 'Alisherga qo\'ng\'iroq qil'], ['🌤 Ob-havo', 'ob-havo'], ['👁 Nima ko\'ryapsan?', 'Kamerada nima ko\'ryapsan?'],
 ['🔦 Chiroq', 'chiroqni yoq'], ['⏱ 5 daq taymer', '5 daqiqa taymer'], ['📋 Vazifalar', 'vazifalar'], ['💵 Dollar kursi', '1 dollar necha so\'m'],
 ['🔋 Batareya', 'batareya'], ['🗺 Xarita', 'xarita kafe'], ['🎵 Musiqa', 'musiqa Shahzoda']]
  .forEach(([label, cmd]) => {
    const b = document.createElement('button'); b.textContent = label; b.onclick = () => handle(cmd); $('chips').append(b);
  });

const cfg = $('cfg');
$('cfgBtn').onclick = () => {
  $('lang').value = store.get('lang', 'uz-UZ'); $('key').value = store.get('key'); $('wake').value = store.get('wake', 'jarvis');
  $('model').value = store.get('model', 'claude-sonnet-5-5'); $('web').checked = store.get('web', '1') === '1';
  $('always').checked = always; $('speak').checked = store.get('speak', '1') === '1';
  $('contacts').value = store.get('contacts');
  $('memory').value = getJSON('mem', []).concat(store.get('memory').split('\n').filter(Boolean)).join('\n');
  cfg.showModal();
};
$('pick').onclick = async () => {
  if (!navigator.contacts?.select) { alert('Kontakt tanlash faqat Android Chrome\'da ishlaydi.'); return; }
  try {
    const list = await navigator.contacts.select(['name', 'tel'], { multiple: true });
    const lines = list.filter(c => c.name?.[0] && c.tel?.[0]).map(c => `${c.name[0]}=${c.tel[0].replace(/\s/g, '')}`);
    $('contacts').value = [$('contacts').value, ...lines].filter(Boolean).join('\n');
  } catch {}
};
cfg.onclose = () => {
  store.set('lang', $('lang').value); store.set('key', $('key').value.trim()); store.set('wake', $('wake').value.trim());
  store.set('model', $('model').value); store.set('web', $('web').checked ? '1' : '0');
  store.set('speak', $('speak').checked ? '1' : '0'); store.set('contacts', $('contacts').value);
  setJSON('mem', $('memory').value.split('\n').map(s => s.trim()).filter(Boolean)); store.set('memory', '');
  always = $('always').checked;
  stopRec(); holdScreen(always);
  if (always) startRec();
};

setInterval(() => { $('clock').textContent = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }); tickReminders(); }, 1000);
navigator.getBattery?.().then(b => { const u = () => ($('batt').textContent = '🔋' + Math.round(b.level * 100) + '%'); u(); b.onlevelchange = u; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
speechSynthesis?.getVoices();
tickReminders();
say(store.get('key') ? 'Salom, ser. Jarvis xizmatingizda. Hamma tizimlar ishlayapti.' : 'Salom! Men Jarvisman. To\'liq aqlli rejim uchun sozlamalarga Claude API kalitini kiriting.');
