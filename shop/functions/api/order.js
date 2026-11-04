// Buyurtma qabul qilish: narxlar serverda qayta hisoblanadi, KV'ga yoziladi, adminlarga Telegram xabari boradi.
import { PRODUCTS } from '../../src/products.js';
const ADMIN_URL = 'https://chilling-admin.pages.dev/';
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
const esc = (t) => String(t).replace(/[<>&]/g, '');
const fmt = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ') + " so'm";

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || !Array.isArray(b.items) || b.items.length === 0 || b.items.length > 60) return json({ error: 'bad' }, 400);
  const name = String(b.name || '').trim().slice(0, 80), phone = String(b.phone || '').trim().slice(0, 30);
  const address = String(b.address || '').trim().slice(0, 200), note = String(b.note || '').trim().slice(0, 300);
  if (!name || phone.replace(/\D/g, '').length < 9 || !address) return json({ error: 'bad' }, 400);

  const ov = JSON.parse((await env.KV.get('overrides')) || '{}');
  const items = [];
  for (const it of b.items) {
    const p = PRODUCTS.find((x) => x.id === Number(it.id));
    const q = Math.floor(Number(it.q));
    if (!p || !(q > 0) || q > 999 || (ov[p.id]?.hidden ?? p.hidden)) continue;
    items.push({ id: p.id, name: p.name, size: p.size, price: ov[p.id]?.price ?? p.price, q });
  }
  if (!items.length) return json({ error: 'bad' }, 400);
  const total = items.reduce((s, i) => s + i.price * i.q, 0);

  const num = (Number(await env.KV.get('order_counter')) || 0) + 1;
  await env.KV.put('order_counter', String(num));
  const ts = Date.now();
  const id = `order:${String(9e12 - ts).padStart(13, '0')}-${num}`;
  await env.KV.put(id, JSON.stringify({ id, num, ts, name, phone, address, note, items, total, status: 'new', tg: Number(b.tg) || null }));

  const text = `🛒 <b>Yangi buyurtma #${num}</b>\n\n` +
    items.map((i, n) => `${n + 1}. ${esc(i.name)} (${esc(i.size)}) × ${i.q} = ${fmt(i.price * i.q)}`).join('\n') +
    `\n\n💰 <b>Jami: ${fmt(total)}</b>\n\n👤 ${esc(name)}\n📞 ${esc(phone)}\n📍 ${esc(address)}` + (note ? `\n💬 ${esc(note)}` : '');
  const admins = JSON.parse((await env.KV.get('admins')) || '[]');
  await Promise.all(admins.map((chat_id) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🛠️ Admin panel', web_app: { url: ADMIN_URL } }]] } }),
  }).catch(() => {})));
  return json({ ok: true, num });
}
