// Ommaviy: admin o'zgartirgan narxlar (KV'dan)
export async function onRequestGet({ env }) {
  const data = (await env.KV.get('overrides')) || '{}';
  return new Response(data, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
