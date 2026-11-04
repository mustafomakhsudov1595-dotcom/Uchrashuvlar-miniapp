// Foydalanuvchining o'z buyurtmalari (Telegram initData tekshiriladi)
import { verifyInitData } from '../../src/lib/tgauth.js';
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequestGet({ request, env }) {
  const user = await verifyInitData(request.headers.get('x-init-data'), env.BOT_TOKEN);
  if (!user) return json({ error: 'auth' }, 401);
  const list = await env.KV.list({ prefix: `u:${user.id}:`, limit: 50 });
  const orders = (await Promise.all(list.keys.map(async (k) => {
    const id = await env.KV.get(k.name);
    return id ? env.KV.get(id, 'json') : null;
  }))).filter(Boolean).map(({ num, ts, items, total, status, address }) => ({ num, ts, items, total, status: status || 'new', address }));
  return json({ orders });
}
