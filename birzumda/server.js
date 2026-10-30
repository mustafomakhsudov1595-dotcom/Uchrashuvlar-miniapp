// Birzumda Hotdog — Telegram Mini App serveri (bot + API + admin API).
// Tashqi kutubxona kerak emas, faqat Node.js 20+.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defaultMenu } from './menu-default.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// ---- .env (oddiy o'quvchi) ----
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const WEBAPP_URL = process.env.WEBAPP_URL || '';
const PORT = Number(process.env.PORT) || 3000;
const DEV = process.env.DEV_MODE === '1'; // initData tekshiruvini o'chiradi (faqat test uchun)

if (!ADMIN_PASSWORD) {
  console.error('ADMIN_PASSWORD o\'rnatilmagan (.env faylida). Admin panel uchun parol kerak.');
  process.exit(1);
}

// ---- Ma'lumotlar bazasi (JSON fayl) ----
fs.mkdirSync(DATA_DIR, { recursive: true });
let db;
try {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
} catch {
  db = { menu: defaultMenu, promos: [], orders: [], adminChats: [], settings: { open: true, minOrder: 0, phone: '90 149 44 45', address: 'Andijon, Gulshan Idora', hours: '09:00 – 00:00' }, seq: 0 };
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
  }, 100);
}
save();

// ---- Yordamchilar ----
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const normCode = (c) => String(c || '').trim().toUpperCase();

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 100_000) { reject(new Error('big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}

// ---- Telegram ----
async function tg(method, payload) {
  if (!BOT_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!j.ok) console.error('Telegram xato:', method, j.description);
    return j;
  } catch (e) { console.error('Telegram tarmoq xatosi:', e.message); return null; }
}

// Mini App initData imzosini tekshirish (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
function verifyInitData(initData) {
  if (!initData || !BOT_TOKEN) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const str = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calc = crypto.createHmac('sha256', secret).update(str).digest('hex');
  if (calc.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash))) return null;
  if (Date.now() / 1000 - Number(params.get('auth_date')) > 86400) return null;
  try { return JSON.parse(params.get('user')); } catch { return null; }
}

const STATUS = {
  new: '🆕 Yangi', accepted: '👨‍🍳 Qabul qilindi', delivering: '🛵 Yo\'lda', done: '✅ Yetkazildi', cancelled: '❌ Bekor qilindi',
};

function orderText(o) {
  const lines = o.items.map((i) => `• ${esc(i.name)} × ${i.qty} = ${fmt(i.price * i.qty)}`);
  return [
    `<b>🍔 Buyurtma #${o.id}</b> — ${STATUS[o.status]}`,
    '', ...lines, '',
    `Jami: ${fmt(o.subtotal)} so'm`,
    o.promo ? `Promokod <b>${esc(o.promo.code)}</b> (−${o.promo.percent}%): −${fmt(o.discount)} so'm` : null,
    `<b>To'lash: ${fmt(o.total)} so'm</b>`,
    `Yetkazib berish: ${o.type === 'delivery' ? 'Bepul 🛵' : 'Olib ketish 🏃'}`,
    '',
    `👤 ${esc(o.name)}`, `📞 ${esc(o.phone)}`,
    o.type === 'delivery' ? `📍 ${esc(o.address)}` : null,
    o.comment ? `💬 ${esc(o.comment)}` : null,
  ].filter((x) => x !== null).join('\n');
}

async function notifyAdmins(o) {
  const kb = { inline_keyboard: [[
    { text: '👨‍🍳 Qabul', callback_data: `s:${o.id}:accepted` },
    { text: '🛵 Yo\'lda', callback_data: `s:${o.id}:delivering` },
  ], [
    { text: '✅ Yetkazildi', callback_data: `s:${o.id}:done` },
    { text: '❌ Bekor', callback_data: `s:${o.id}:cancelled` },
  ]] };
  for (const chat_id of db.adminChats) {
    await tg('sendMessage', { chat_id, text: orderText(o), parse_mode: 'HTML', reply_markup: kb });
  }
}

async function setStatus(o, status) {
  o.status = status;
  o.updatedAt = Date.now();
  save();
  if (o.userId) {
    const msgs = {
      accepted: `Buyurtmangiz #${o.id} qabul qilindi, tayyorlanmoqda 👨‍🍳`,
      delivering: `Buyurtmangiz #${o.id} yo'lda 🛵 Tez orada yetib boradi!`,
      done: `Buyurtmangiz #${o.id} yetkazildi. Yoqimli ishtaha! 🍔`,
      cancelled: `Buyurtmangiz #${o.id} bekor qilindi. Savollar bo'lsa: ${db.settings.phone}`,
    };
    if (msgs[status]) await tg('sendMessage', { chat_id: o.userId, text: msgs[status] });
  }
}

// ---- Bot (long polling) ----
async function pollBot() {
  if (!BOT_TOKEN) { console.warn('BOT_TOKEN yo\'q — bot ishlamaydi, faqat API.'); return; }
  const me = await tg('getMe', {});
  if (!me?.ok) { console.error('BOT_TOKEN noto\'g\'ri yoki Telegram\'ga ulanib bo\'lmadi.'); }
  else console.log(`Bot: @${me.result.username}`);
  if (WEBAPP_URL) await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Buyurtma 🍔', web_app: { url: WEBAPP_URL } } });
  let offset = 0;
  for (;;) {
    const r = await tg('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] });
    if (!r?.ok) { await new Promise((s) => setTimeout(s, 5000)); continue; }
    for (const u of r.result) {
      offset = u.update_id + 1;
      try { await handleUpdate(u); } catch (e) { console.error(e); }
    }
  }
}

async function handleUpdate(u) {
  if (u.message?.text) {
    const chat = u.message.chat.id;
    const text = u.message.text.trim();
    if (text.startsWith('/start')) {
      const markup = WEBAPP_URL ? { inline_keyboard: [[{ text: '🍔 Buyurtma berish', web_app: { url: WEBAPP_URL } }]] } : undefined;
      await tg('sendMessage', {
        chat_id: chat, reply_markup: markup,
        text: `Assalomu alaykum! 👋\n<b>Birzumda Hotdog</b> — mazali fast food.\nBuyurtma berish uchun pastdagi tugmani bosing. Yetkazib berish bepul! 🛵\n📞 ${db.settings.phone}`,
        parse_mode: 'HTML',
      });
    } else if (text.startsWith('/admin')) {
      // /admin <parol> — shu chatni buyurtma xabarlari oluvchisi qiladi
      const pass = text.split(/\s+/)[1] || '';
      const ok = pass.length === ADMIN_PASSWORD.length && crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(ADMIN_PASSWORD));
      if (ok) {
        if (!db.adminChats.includes(chat)) { db.adminChats.push(chat); save(); }
        await tg('sendMessage', { chat_id: chat, text: '✅ Siz admin sifatida ulandingiz. Yangi buyurtmalar shu yerga keladi.\nChiqish: /adminoff' });
      } else await tg('sendMessage', { chat_id: chat, text: 'Parol noto\'g\'ri.' });
    } else if (text === '/adminoff') {
      db.adminChats = db.adminChats.filter((c) => c !== chat); save();
      await tg('sendMessage', { chat_id: chat, text: 'Endi buyurtma xabarlari kelmaydi.' });
    }
  }
  if (u.callback_query) {
    const cq = u.callback_query;
    const [, id, status] = (cq.data || '').split(':');
    if (!db.adminChats.includes(cq.message?.chat?.id) || !STATUS[status]) { await tg('answerCallbackQuery', { callback_query_id: cq.id }); return; }
    const o = db.orders.find((x) => x.id === Number(id));
    if (o) {
      await setStatus(o, status);
      await tg('editMessageText', { chat_id: cq.message.chat.id, message_id: cq.message.message_id, text: orderText(o), parse_mode: 'HTML', reply_markup: cq.message.reply_markup });
    }
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: STATUS[status] });
  }
}

// ---- Savat / promokod hisobi (server tomonda, mijozga ishonilmaydi) ----
function findPromo(code) {
  const c = normCode(code);
  return c ? db.promos.find((p) => p.code === c && p.active) : null;
}
function priceCart(rawItems) {
  const byId = new Map();
  for (const cat of db.menu) for (const it of cat.items) byId.set(it.id, it);
  const items = [];
  for (const r of Array.isArray(rawItems) ? rawItems : []) {
    const it = byId.get(String(r.id));
    const qty = Math.floor(Number(r.qty));
    if (!it || !it.available || !(qty > 0) || qty > 50) continue;
    items.push({ id: it.id, name: it.name, price: it.price, qty });
  }
  return { items, subtotal: items.reduce((s, i) => s + i.price * i.qty, 0) };
}
function applyPromo(subtotal, promo) {
  const discount = promo ? Math.round((subtotal * promo.percent) / 100 / 100) * 100 : 0;
  return { discount, total: subtotal - discount };
}

// ---- Admin autentifikatsiya ----
const sessions = new Map(); // token -> expiry
const attempts = new Map(); // ip -> [count, resetAt]
function isAdmin(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  const exp = sessions.get(t);
  if (!exp || exp < Date.now()) { sessions.delete(t); return false; }
  return true;
}

// ---- Marshrutlar ----
const publicMenu = () => ({ menu: db.menu, settings: db.settings });

async function api(req, res, url) {
  const p = url.pathname;
  const m = req.method;

  if (p === '/api/menu' && m === 'GET') return json(res, 200, publicMenu());

  if (p === '/api/promo' && m === 'POST') {
    const b = await readBody(req);
    const promo = findPromo(b.code);
    if (!promo) return json(res, 404, { error: 'Promokod topilmadi yoki faol emas' });
    return json(res, 200, { code: promo.code, percent: promo.percent });
  }

  if (p === '/api/order' && m === 'POST') {
    const b = await readBody(req);
    if (!db.settings.open) return json(res, 400, { error: 'Hozir buyurtma qabul qilinmayapti' });
    const user = DEV ? { id: 0, first_name: 'Test' } : verifyInitData(b.initData);
    if (!user) return json(res, 401, { error: 'Telegram orqali oching (imzo tekshiruvi o\'tmadi)' });
    const { items, subtotal } = priceCart(b.items);
    if (!items.length) return json(res, 400, { error: 'Savat bo\'sh' });
    if (subtotal < db.settings.minOrder) return json(res, 400, { error: `Minimal buyurtma: ${fmt(db.settings.minOrder)} so'm` });
    const name = String(b.name || '').trim().slice(0, 60);
    const phone = String(b.phone || '').trim().slice(0, 25);
    const type = b.type === 'pickup' ? 'pickup' : 'delivery';
    const address = String(b.address || '').trim().slice(0, 200);
    if (!name || phone.replace(/\D/g, '').length < 9) return json(res, 400, { error: 'Ism va telefon raqamni to\'g\'ri kiriting' });
    if (type === 'delivery' && address.length < 3) return json(res, 400, { error: 'Manzilni kiriting' });
    let promo = null;
    if (b.promo) {
      promo = findPromo(b.promo);
      if (!promo) return json(res, 400, { error: 'Promokod faol emas' });
    }
    const { discount, total } = applyPromo(subtotal, promo);
    const o = {
      id: ++db.seq, userId: user.id || null, username: user.username || null, status: 'new', createdAt: Date.now(),
      items, subtotal, promo: promo ? { code: promo.code, percent: promo.percent } : null, discount, total,
      name, phone, type, address, comment: String(b.comment || '').trim().slice(0, 300),
    };
    db.orders.push(o);
    if (promo) promo.used = (promo.used || 0) + 1;
    save();
    notifyAdmins(o);
    if (o.userId) tg('sendMessage', { chat_id: o.userId, parse_mode: 'HTML', text: `✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n${orderText(o).split('\n').slice(1).join('\n')}\n\nTez orada bog'lanamiz.` });
    return json(res, 200, { id: o.id, total });
  }

  // ---- Admin ----
  if (p === '/api/admin/login' && m === 'POST') {
    const ip = req.socket.remoteAddress;
    const a = attempts.get(ip) || [0, Date.now() + 15 * 60_000];
    if (a[1] < Date.now()) { a[0] = 0; a[1] = Date.now() + 15 * 60_000; }
    if (a[0] >= 8) return json(res, 429, { error: 'Juda ko\'p urinish. 15 daqiqadan keyin qayta urinib ko\'ring' });
    const b = await readBody(req);
    const pass = String(b.password || '');
    const ok = pass.length === ADMIN_PASSWORD.length && crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(ADMIN_PASSWORD));
    if (!ok) { a[0]++; attempts.set(ip, a); return json(res, 401, { error: 'Parol noto\'g\'ri' }); }
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, Date.now() + 12 * 3600_000);
    return json(res, 200, { token });
  }

  if (p.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return json(res, 401, { error: 'Kirish kerak' });
    const b = m === 'GET' ? {} : await readBody(req);

    if (p === '/api/admin/state' && m === 'GET') return json(res, 200, { menu: db.menu, promos: db.promos, orders: [...db.orders].reverse().slice(0, 200), settings: db.settings, adminChats: db.adminChats.length });

    if (p === '/api/admin/promos' && m === 'POST') {
      const code = normCode(b.code);
      const percent = Math.round(Number(b.percent));
      if (!/^[A-Z0-9_-]{2,20}$/.test(code)) return json(res, 400, { error: 'Kod 2–20 ta lotin harf/raqam bo\'lsin' });
      if (!(percent >= 1 && percent <= 100)) return json(res, 400, { error: 'Foiz 1 dan 100 gacha' });
      const ex = db.promos.find((x) => x.code === code);
      if (ex) { ex.percent = percent; ex.active = b.active !== false; }
      else db.promos.push({ code, percent, active: true, used: 0 });
      save();
      return json(res, 200, { promos: db.promos });
    }
    if (p === '/api/admin/promos/toggle' && m === 'POST') {
      const x = db.promos.find((q) => q.code === normCode(b.code));
      if (x) { x.active = !x.active; save(); }
      return json(res, 200, { promos: db.promos });
    }
    if (p === '/api/admin/promos/delete' && m === 'POST') {
      db.promos = db.promos.filter((q) => q.code !== normCode(b.code)); save();
      return json(res, 200, { promos: db.promos });
    }

    if (p === '/api/admin/item' && m === 'POST') { // narx/nom/mavjudlik
      for (const cat of db.menu) {
        const it = cat.items.find((i) => i.id === b.id);
        if (!it) continue;
        if (b.price !== undefined) { const n = Math.round(Number(b.price)); if (n > 0 && n < 10_000_000) it.price = n; }
        if (typeof b.name === 'string' && b.name.trim()) it.name = b.name.trim().slice(0, 60);
        if (typeof b.available === 'boolean') it.available = b.available;
      }
      save();
      return json(res, 200, { menu: db.menu });
    }

    if (p === '/api/admin/settings' && m === 'POST') {
      if (typeof b.open === 'boolean') db.settings.open = b.open;
      if (b.minOrder !== undefined) db.settings.minOrder = Math.max(0, Math.round(Number(b.minOrder)) || 0);
      for (const k of ['phone', 'address', 'hours']) if (typeof b[k] === 'string') db.settings[k] = b[k].slice(0, 100);
      save();
      return json(res, 200, { settings: db.settings });
    }

    if (p === '/api/admin/order-status' && m === 'POST') {
      const o = db.orders.find((x) => x.id === Number(b.id));
      if (!o || !STATUS[b.status]) return json(res, 400, { error: 'Noto\'g\'ri so\'rov' });
      await setStatus(o, b.status);
      return json(res, 200, { ok: true });
    }
  }
  return json(res, 404, { error: 'Topilmadi' });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let file = url.pathname === '/' ? '/index.html' : url.pathname === '/admin' ? '/admin.html' : url.pathname;
    const full = path.normalize(path.join(PUBLIC, file));
    if (!full.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(full, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('Topilmadi'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': file.endsWith('.jpg') ? 'public, max-age=86400' : 'no-cache' });
      res.end(buf);
    });
  } catch (e) {
    json(res, 400, { error: 'Noto\'g\'ri so\'rov' });
  }
}).listen(PORT, () => console.log(`Server: http://localhost:${PORT}  (admin: /admin)`));

pollBot();
