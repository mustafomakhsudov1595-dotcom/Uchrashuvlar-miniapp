// Ommaviy: admin sozlagan narx/mahsulot/skidkalar
export async function onRequestGet({ env }) {
  const [o, c, s] = await Promise.all([env.KV.get('overrides'), env.KV.get('custom'), env.KV.get('sales')]);
  const body = `{"overrides":${o || '{}'},"custom":${c || '[]'},"sales":${s || '[]'}}`;
  return new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
