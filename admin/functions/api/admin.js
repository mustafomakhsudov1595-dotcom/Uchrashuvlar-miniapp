// Admin API. Parol Cloudflare'dagi ADMIN_PASSWORD secret'ida. KV — do'kon bilan umumiy.
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad' }, 400); }
  if (!env.ADMIN_PASSWORD || !same(String(b.password || ''), env.ADMIN_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: "Parol noto'g'ri" }, 401);
  }
  switch (b.action) {
    case 'check': return json({ ok: true });
    case 'get': {
      const overrides = JSON.parse((await env.KV.get('overrides')) || '{}');
      const list = await env.KV.list({ prefix: 'order:', limit: 200 });
      const orders = (await Promise.all(list.keys.map((k) => env.KV.get(k.name, 'json')))).filter(Boolean);
      return json({ overrides, orders });
    }
    case 'prices': {
      const clean = {};
      for (const [id, v] of Object.entries(b.overrides || {})) {
        if (!/^\d+$/.test(id)) continue;
        const price = Math.round(Number(v.price)), oldPrice = Math.round(Number(v.oldPrice)) || 0;
        if (price > 0) clean[id] = { price, oldPrice, hidden: !!v.hidden };
      }
      await env.KV.put('overrides', JSON.stringify(clean));
      return json({ ok: true });
    }
    case 'status': {
      const key = String(b.id || '');
      if (!key.startsWith('order:')) return json({ error: 'bad' }, 400);
      const o = await env.KV.get(key, 'json');
      if (!o) return json({ error: 'yoq' }, 404);
      o.status = b.status === 'done' ? 'done' : b.status === 'cancel' ? 'cancel' : 'new';
      await env.KV.put(key, JSON.stringify(o));
      return json({ ok: true });
    }
    default: return json({ error: 'bad action' }, 400);
  }
}
