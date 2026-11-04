// Faqat parol bilan: narxlarni saqlash. Parol Cloudflare'dagi ADMIN_PASSWORD secret'ida.
const same = (a, b) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad' }, 400); }
  if (!env.ADMIN_PASSWORD || !same(String(body.password || ''), env.ADMIN_PASSWORD)) return json({ error: 'parol noto\'g\'ri' }, 401);
  if (!body.overrides) return json({ ok: true }); // faqat tekshirish
  const clean = {};
  for (const [id, v] of Object.entries(body.overrides)) {
    if (!/^\d+$/.test(id)) continue;
    const price = Math.round(Number(v.price)), oldPrice = Math.round(Number(v.oldPrice)) || 0;
    if (!(price > 0)) continue;
    clean[id] = { price, oldPrice, hidden: !!v.hidden };
  }
  await env.KV.put('overrides', JSON.stringify(clean));
  return json({ ok: true });
}
