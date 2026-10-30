// Birzumda Hotdog — Cloudflare Worker versiyasi (API + Telegram webhook + admin API).
// Statik fayllar ../public dan ASSETS orqali beriladi. Ma'lumotlar KV (DB) da.
import { defaultMenu } from '../menu-default.js';

const enc = new TextEncoder();
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const normCode = (c) => String(c || '').trim().toUpperCase();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(msg));
}
const safeEq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

const json = (code, body) => new Response(JSON.stringify(body), { status: code, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const STATUS = { new: '🆕 Yangi', accepted: '👨‍🍳 Qabul qilindi', delivering: '🛵 Yo\'lda', done: '✅ Yetkazildi', cancelled: '❌ Bekor qilindi' };

// ---- Ma'lumotlar ----
async function loadCfg(env) {
  const c = await env.DB.get('cfg', 'json');
  return c || { menu: defaultMenu, promos: [], adminChats: [], seq: 0, settings: { open: true, minOrder: 0, phone: '90 149 44 45', address: 'Andijon, Gulshan Idora', hours: '09:00 – 00:00' } };
}
const saveCfg = (env, cfg) => env.DB.put('cfg', JSON.stringify(cfg));
const getOrder = (env, id) => env.DB.get('order:' + String(id).padStart(8, '0'), 'json');
const putOrder = (env, o) => env.DB.put('order:' + String(o.id).padStart(8, '0'), JSON.stringify(o));

// ---- Telegram ----
async function tg(env, method, payload) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return await r.json();
  } catch { return null; }
}

async function verifyInitData(env, initData) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const str = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = await hmac('WebAppData', env.BOT_TOKEN);
  if (!safeEq(hex(await hmac(secret, str)), hash)) return null;
  if (Date.now() / 1000 - Number(params.get('auth_date')) > 86400) return null;
  try { return JSON.parse(params.get('user')); } catch { return null; }
}

function orderText(o) {
  const lines = o.items.map((i) => `• ${esc(i.name)} × ${i.qty} = ${fmt(i.price * i.qty)}`);
  return [
    `<b>🍔 Buyurtma #${o.id}</b> — ${STATUS[o.status]}`, '', ...lines, '',
    `Jami: ${fmt(o.subtotal)} so'm`,
    o.promo ? `Promokod <b>${esc(o.promo.code)}</b> (−${o.promo.percent}%): −${fmt(o.discount)} so'm` : null,
    `<b>To'lash: ${fmt(o.total)} so'm</b>`,
    `Yetkazib berish: ${o.type === 'delivery' ? 'Bepul 🛵' : 'Olib ketish 🏃'}`, '',
    `👤 ${esc(o.name)}`, `📞 ${esc(o.phone)}`,
    o.type === 'delivery' ? `📍 ${esc(o.address)}` : null,
    o.comment ? `💬 ${esc(o.comment)}` : null,
  ].filter((x) => x !== null).join('\n');
}

const statusKb = (id) => ({ inline_keyboard: [[
  { text: '👨‍🍳 Qabul', callback_data: `s:${id}:accepted` }, { text: '🛵 Yo\'lda', callback_data: `s:${id}:delivering` },
], [
  { text: '✅ Yetkazildi', callback_data: `s:${id}:done` }, { text: '❌ Bekor', callback_data: `s:${id}:cancelled` },
]] });

async function setStatus(env, cfg, o, status) {
  o.status = status; o.updatedAt = Date.now();
  await putOrder(env, o);
  const msgs = {
    accepted: `Buyurtmangiz #${o.id} qabul qilindi, tayyorlanmoqda 👨‍🍳`,
    delivering: `Buyurtmangiz #${o.id} yo'lda 🛵 Tez orada yetib boradi!`,
    done: `Buyurtmangiz #${o.id} yetkazildi. Yoqimli ishtaha! 🍔`,
    cancelled: `Buyurtmangiz #${o.id} bekor qilindi. Savollar bo'lsa: ${cfg.settings.phone}`,
  };
  if (o.userId && msgs[status]) await tg(env, 'sendMessage', { chat_id: o.userId, text: msgs[status] });
}

// ---- Bot (webhook) ----
async function handleUpdate(env, u, origin) {
  const cfg = await loadCfg(env);
  if (u.message?.text) {
    const chat = u.message.chat.id; const text = u.message.text.trim();
    if (text.startsWith('/start')) {
      const url = env.WEBAPP_URL || origin;
      await tg(env, 'sendMessage', {
        chat_id: chat, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🍔 Buyurtma berish', web_app: { url } }]] },
        text: `Assalomu alaykum! 👋\n<b>Birzumda Hotdog</b> — mazali fast food.\nBuyurtma berish uchun pastdagi tugmani bosing. Yetkazib berish bepul! 🛵\n📞 ${cfg.settings.phone}`,
      });
    } else if (text.startsWith('/adminoff')) {
      cfg.adminChats = cfg.adminChats.filter((c) => c !== chat); await saveCfg(env, cfg);
      await tg(env, 'sendMessage', { chat_id: chat, text: 'Endi buyurtma xabarlari kelmaydi.' });
    } else if (text.startsWith('/admin')) {
      if (safeEq(text.split(/\s+/)[1] || '', env.ADMIN_PASSWORD)) {
        if (!cfg.adminChats.includes(chat)) { cfg.adminChats.push(chat); await saveCfg(env, cfg); }
        await tg(env, 'sendMessage', { chat_id: chat, text: '✅ Siz admin sifatida ulandingiz. Yangi buyurtmalar shu yerga keladi.\nChiqish: /adminoff' });
      } else await tg(env, 'sendMessage', { chat_id: chat, text: 'Parol noto\'g\'ri.' });
    }
  }
  if (u.callback_query) {
    const cq = u.callback_query; const [, id, status] = (cq.data || '').split(':');
    if (cfg.adminChats.includes(cq.message?.chat?.id) && STATUS[status]) {
      const o = await getOrder(env, id);
      if (o) {
        await setStatus(env, cfg, o, status);
        await tg(env, 'editMessageText', { chat_id: cq.message.chat.id, message_id: cq.message.message_id, text: orderText(o), parse_mode: 'HTML', reply_markup: statusKb(o.id) });
      }
      await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id, text: STATUS[status] });
    } else await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id });
  }
}

// ---- Savat / promokod ----
const findPromo = (cfg, code) => { const c = normCode(code); return c ? cfg.promos.find((p) => p.code === c && p.active) : null; };
function priceCart(cfg, raw) {
  const byId = new Map(); for (const cat of cfg.menu) for (const it of cat.items) byId.set(it.id, it);
  const items = [];
  for (const r of Array.isArray(raw) ? raw : []) {
    const it = byId.get(String(r.id)); const qty = Math.floor(Number(r.qty));
    if (!it || !it.available || !(qty > 0) || qty > 50) continue;
    items.push({ id: it.id, name: it.name, price: it.price, qty });
  }
  return { items, subtotal: items.reduce((s, i) => s + i.price * i.qty, 0) };
}

// ---- Admin sessiya: imzolangan token ----
async function makeToken(env) { const exp = Date.now() + 12 * 3600_000; return `${exp}.${hex(await hmac(env.ADMIN_PASSWORD, 'admin:' + exp))}`; }
async function isAdmin(env, req) {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
  const [exp, sig] = t.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEq(sig, hex(await hmac(env.ADMIN_PASSWORD, 'admin:' + exp)));
}

async function body(req) { try { return JSON.parse((await req.text()).slice(0, 100_000) || '{}'); } catch { return {}; } }

async function api(req, env, ctx, url) {
  const p = url.pathname; const m = req.method;

  if (p === '/api/menu' && m === 'GET') { const c = await loadCfg(env); return json(200, { menu: c.menu, settings: c.settings }); }

  if (p === '/api/promo' && m === 'POST') {
    const promo = findPromo(await loadCfg(env), (await body(req)).code);
    return promo ? json(200, { code: promo.code, percent: promo.percent }) : json(404, { error: 'Promokod topilmadi yoki faol emas' });
  }

  if (p === '/api/order' && m === 'POST') {
    const b = await body(req); const cfg = await loadCfg(env);
    if (!cfg.settings.open) return json(400, { error: 'Hozir buyurtma qabul qilinmayapti' });
    const user = await verifyInitData(env, b.initData);
    if (!user) return json(401, { error: 'Telegram orqali oching (imzo tekshiruvi o\'tmadi)' });
    const { items, subtotal } = priceCart(cfg, b.items);
    if (!items.length) return json(400, { error: 'Savat bo\'sh' });
    if (subtotal < cfg.settings.minOrder) return json(400, { error: `Minimal buyurtma: ${fmt(cfg.settings.minOrder)} so'm` });
    const name = String(b.name || '').trim().slice(0, 60); const phone = String(b.phone || '').trim().slice(0, 25);
    const type = b.type === 'pickup' ? 'pickup' : 'delivery'; const address = String(b.address || '').trim().slice(0, 200);
    if (!name || phone.replace(/\D/g, '').length < 9) return json(400, { error: 'Ism va telefon raqamni to\'g\'ri kiriting' });
    if (type === 'delivery' && address.length < 3) return json(400, { error: 'Manzilni kiriting' });
    let promo = null;
    if (b.promo) { promo = findPromo(cfg, b.promo); if (!promo) return json(400, { error: 'Promokod faol emas' }); }
    const discount = promo ? Math.round((subtotal * promo.percent) / 100 / 100) * 100 : 0; const total = subtotal - discount;
    const o = { id: ++cfg.seq, userId: user.id || null, username: user.username || null, status: 'new', createdAt: Date.now(), items, subtotal, promo: promo ? { code: promo.code, percent: promo.percent } : null, discount, total, name, phone, type, address, comment: String(b.comment || '').trim().slice(0, 300) };
    if (promo) promo.used = (promo.used || 0) + 1;
    await saveCfg(env, cfg); await putOrder(env, o);
    ctx.waitUntil((async () => {
      for (const chat_id of cfg.adminChats) await tg(env, 'sendMessage', { chat_id, text: orderText(o), parse_mode: 'HTML', reply_markup: statusKb(o.id) });
      if (o.userId) await tg(env, 'sendMessage', { chat_id: o.userId, parse_mode: 'HTML', text: `✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n${orderText(o).split('\n').slice(1).join('\n')}\n\nTez orada bog'lanamiz.` });
    })());
    return json(200, { id: o.id, total });
  }

  if (p === '/api/admin/login' && m === 'POST') {
    const ip = req.headers.get('CF-Connecting-IP') || 'x'; const key = 'att:' + ip;
    const n = Number(await env.DB.get(key)) || 0;
    if (n >= 8) return json(429, { error: 'Juda ko\'p urinish. 15 daqiqadan keyin qayta urinib ko\'ring' });
    if (!safeEq(String((await body(req)).password || ''), env.ADMIN_PASSWORD)) { await env.DB.put(key, String(n + 1), { expirationTtl: 900 }); return json(401, { error: 'Parol noto\'g\'ri' }); }
    return json(200, { token: await makeToken(env) });
  }

  if (p.startsWith('/api/admin/')) {
    if (!(await isAdmin(env, req))) return json(401, { error: 'Kirish kerak' });
    const b = m === 'GET' ? {} : await body(req); const cfg = await loadCfg(env);

    if (p === '/api/admin/state') {
      const list = await env.DB.list({ prefix: 'order:' });
      const keys = list.keys.map((k) => k.name).sort().reverse().slice(0, 200);
      const orders = (await Promise.all(keys.map((k) => env.DB.get(k, 'json')))).filter(Boolean);
      return json(200, { menu: cfg.menu, promos: cfg.promos, orders, settings: cfg.settings, adminChats: cfg.adminChats.length });
    }
    if (p === '/api/admin/promos' && m === 'POST') {
      const code = normCode(b.code); const percent = Math.round(Number(b.percent));
      if (!/^[A-Z0-9_-]{2,20}$/.test(code)) return json(400, { error: 'Kod 2–20 ta lotin harf/raqam bo\'lsin' });
      if (!(percent >= 1 && percent <= 100)) return json(400, { error: 'Foiz 1 dan 100 gacha' });
      const ex = cfg.promos.find((x) => x.code === code);
      if (ex) { ex.percent = percent; ex.active = true; } else cfg.promos.push({ code, percent, active: true, used: 0 });
      await saveCfg(env, cfg); return json(200, { promos: cfg.promos });
    }
    if (p === '/api/admin/promos/toggle') { const x = cfg.promos.find((q) => q.code === normCode(b.code)); if (x) { x.active = !x.active; await saveCfg(env, cfg); } return json(200, { promos: cfg.promos }); }
    if (p === '/api/admin/promos/delete') { cfg.promos = cfg.promos.filter((q) => q.code !== normCode(b.code)); await saveCfg(env, cfg); return json(200, { promos: cfg.promos }); }
    if (p === '/api/admin/item') {
      for (const cat of cfg.menu) {
        const it = cat.items.find((i) => i.id === b.id); if (!it) continue;
        if (b.price !== undefined) { const n = Math.round(Number(b.price)); if (n > 0 && n < 10_000_000) it.price = n; }
        if (typeof b.name === 'string' && b.name.trim()) it.name = b.name.trim().slice(0, 60);
        if (typeof b.available === 'boolean') it.available = b.available;
      }
      await saveCfg(env, cfg); return json(200, { menu: cfg.menu });
    }
    if (p === '/api/admin/settings') {
      const s = cfg.settings;
      if (typeof b.open === 'boolean') s.open = b.open;
      if (b.minOrder !== undefined) s.minOrder = Math.max(0, Math.round(Number(b.minOrder)) || 0);
      for (const k of ['phone', 'address', 'hours']) if (typeof b[k] === 'string') s[k] = b[k].slice(0, 100);
      await saveCfg(env, cfg); return json(200, { settings: s });
    }
    if (p === '/api/admin/order-status') {
      const o = await getOrder(env, b.id);
      if (!o || !STATUS[b.status]) return json(400, { error: 'Noto\'g\'ri so\'rov' });
      await setStatus(env, cfg, o, b.status); return json(200, { ok: true });
    }
  }
  return json(404, { error: 'Topilmadi' });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/webhook' && req.method === 'POST') {
        if (!safeEq(req.headers.get('X-Telegram-Bot-Api-Secret-Token') || '', hex(await hmac(env.BOT_TOKEN, 'webhook')).slice(0, 32))) return new Response('forbidden', { status: 403 });
        const u = await req.json();
        ctx.waitUntil(handleUpdate(env, u, url.origin).catch((e) => console.error(e)));
        return new Response('ok');
      }
      if (url.pathname.startsWith('/api/')) return await api(req, env, ctx, url);
    } catch (e) { console.error(e); return json(500, { error: 'Server xatosi' }); }
    return env.ASSETS.fetch(req);
  },
};
