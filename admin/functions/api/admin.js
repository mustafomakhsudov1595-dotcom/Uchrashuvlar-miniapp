// Admin API. Parol: ADMIN_PASSWORD secret. KV — do'kon bilan umumiy.
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const rd = async (env, k, d) => (await env.KV.get(k, 'json')) ?? d;
const str = (v, n) => String(v ?? '').trim().slice(0, n);
const num = (v) => Math.max(0, Math.round(Number(v)) || 0);
const CATS = ['laundry', 'pipes', 'sponge', 'air', 'duracell', 'raketa', 'soni', 'lamp', 'glue', 'razor', 'other'];

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
      const [overrides, custom, sales, promos] = await Promise.all([rd(env, 'overrides', {}), rd(env, 'custom', []), rd(env, 'sales', []), rd(env, 'promos', [])]);
      const list = await env.KV.list({ prefix: 'order:', limit: 300 });
      const orders = (await Promise.all(list.keys.map((k) => env.KV.get(k.name, 'json')))).filter(Boolean);
      return json({ overrides, custom, sales, promos, orders });
    }

    // tezkor narx tahriri (ro'yxatdan)
    case 'prices': {
      const overrides = await rd(env, 'overrides', {});
      const custom = await rd(env, 'custom', []);
      for (const [id, v] of Object.entries(b.overrides || {})) {
        if (!/^\d+$/.test(id)) continue;
        const price = num(v.price), oldPrice = num(v.oldPrice);
        if (!(price > 0)) continue;
        if (Number(id) >= 1000) {
          const c = custom.find((x) => x.id === Number(id));
          if (c) { c.price = price; c.oldPrice = oldPrice || undefined; c.hidden = !!v.hidden; }
        } else overrides[id] = { ...(overrides[id] || {}), price, oldPrice, hidden: !!v.hidden };
      }
      await Promise.all([env.KV.put('overrides', JSON.stringify(overrides)), env.KV.put('custom', JSON.stringify(custom))]);
      return json({ ok: true });
    }

    // mahsulot qo'shish / tahrirlash (+ rasm)
    case 'product_save': {
      const p = b.product || {};
      const f = {
        name: str(p.name, 120), desc: str(p.desc, 600), size: str(p.size, 40),
        cat: CATS.includes(p.cat) ? p.cat : 'other', price: num(p.price), oldPrice: num(p.oldPrice),
        hit: !!p.hit, isNew: !!p.isNew, hidden: !!p.hidden,
      };
      if (!f.name || !(f.price > 0)) return json({ error: 'Nom va narx kerak' }, 400);
      const overrides = await rd(env, 'overrides', {});
      const custom = await rd(env, 'custom', []);
      let id = Number(p.id) || 0;
      const isNew = !(id > 0);
      if (isNew) id = Math.max(1000, ...custom.map((c) => c.id + 1));
      let imgUrl;
      if (typeof b.image === 'string' && b.image.startsWith('data:image/')) {
        const b64 = b.image.split(',')[1] || '';
        if (b64.length > 1_500_000) return json({ error: 'Rasm juda katta' }, 400);
        await env.KV.put(`img:${id}`, b64);
        imgUrl = `/api/img/${id}?v=${Date.now()}`;
      }
      if (id >= 1000) {
        const i = custom.findIndex((c) => c.id === id);
        const prev = i >= 0 ? custom[i] : {};
        const item = { ...prev, ...f, oldPrice: f.oldPrice || undefined, id, img: imgUrl || prev.img };
        if (i >= 0) custom[i] = item; else custom.push(item);
      } else {
        overrides[id] = { ...(overrides[id] || {}), ...f, ...(imgUrl ? { img: imgUrl } : {}) };
      }
      await Promise.all([env.KV.put('overrides', JSON.stringify(overrides)), env.KV.put('custom', JSON.stringify(custom))]);
      return json({ ok: true, id });
    }

    case 'product_delete': {
      const id = Number(b.id);
      if (!(id >= 1000)) return json({ error: "Faqat qo'shilgan mahsulotni o'chirish mumkin (asosiylarini yashiring)" }, 400);
      const custom = (await rd(env, 'custom', [])).filter((c) => c.id !== id);
      await env.KV.put('custom', JSON.stringify(custom));
      await env.KV.delete(`img:${id}`);
      return json({ ok: true });
    }

    case 'sales_save': {
      const sales = (Array.isArray(b.sales) ? b.sales : []).slice(0, 50).map((s) => ({
        id: str(s.id, 20) || Math.random().toString(36).slice(2, 9), name: str(s.name, 60),
        percent: Math.min(90, num(s.percent)), scope: str(s.scope, 20) || 'all',
        ends: /^\d{4}-\d{2}-\d{2}$/.test(s.ends || '') ? s.ends : '', active: !!s.active,
      })).filter((s) => s.percent > 0);
      await env.KV.put('sales', JSON.stringify(sales));
      return json({ ok: true, sales });
    }

    case 'promos_save': {
      const old = await rd(env, 'promos', []);
      const seen = new Set();
      const promos = [];
      for (const p of (Array.isArray(b.promos) ? b.promos : []).slice(0, 100)) {
        const code = str(p.code, 24).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (!code || seen.has(code) || !(num(p.value) > 0)) continue;
        seen.add(code);
        const type = p.type === 'fixed' ? 'fixed' : 'percent';
        promos.push({
          code, type, value: type === 'percent' ? Math.min(100, num(p.value)) : num(p.value),
          min: num(p.min), maxUses: num(p.maxUses), used: old.find((o) => o.code === code)?.used || 0,
          ends: /^\d{4}-\d{2}-\d{2}$/.test(p.ends || '') ? p.ends : '', active: !!p.active,
        });
      }
      await env.KV.put('promos', JSON.stringify(promos));
      return json({ ok: true, promos });
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
