// Promokodni tekshirish (savatdagi mahsulotlar bo'yicha server hisoblaydi)
import { PRODUCTS } from '../../src/products.js';
import { buildCatalog, promoCheck } from '../../src/lib/pricing.js';
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || !Array.isArray(b.items)) return json({ ok: false, error: 'bad' }, 400);
  const [o, c, s, p] = await Promise.all(['overrides', 'custom', 'sales', 'promos'].map((k) => env.KV.get(k, 'json')));
  const cat = buildCatalog(PRODUCTS, o || {}, c || [], s || []);
  let subtotal = 0;
  for (const it of b.items) {
    const pr = cat.find((x) => x.id === Number(it.id) && !x.hidden);
    const q = Math.floor(Number(it.q));
    if (pr && q > 0 && q < 1000) subtotal += pr.price * q;
  }
  const r = promoCheck(p || [], b.code, subtotal);
  return json(r.ok ? { ...r, subtotal, total: subtotal - r.discount } : r);
}
