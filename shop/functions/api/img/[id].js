// Admin yuklagan mahsulot rasmlari (KV'da base64)
export async function onRequestGet({ params, env }) {
  const b64 = await env.KV.get(`img:${params.id}`);
  if (!b64) return new Response('not found', { status: 404 });
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Response(bin, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable', 'access-control-allow-origin': '*' } });
}
