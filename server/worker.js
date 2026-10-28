// Cloudflare Worker: Netlify Functions (bot, api, cal, remind) uchun adapter.
import { setKV } from './kv.js';
import bot from './functions/bot.js';
import api from './functions/api.js';
import cal from './functions/cal.js';
import remind from './functions/remind.js';

async function toEvent(request) {
  const url = new URL(request.url);
  const headers = {};
  request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  const body = request.method === 'GET' || request.method === 'HEAD' ? null : await request.text();
  return { httpMethod: request.method, headers, body, path: url.pathname, queryStringParameters: Object.fromEntries(url.searchParams) };
}
const toResponse = (r) => new Response(r.body ?? null, { status: r.statusCode || 200, headers: r.headers || {} });

function route(pathname) {
  if (pathname === '/api/tg') return bot.handler;
  if (pathname === '/api/meetings') return api.handler;
  if (pathname.startsWith('/api/cal')) return cal.handler;
  return null;
}

export default {
  async fetch(request, env) {
    setKV(env.KV);
    const handler = route(new URL(request.url).pathname);
    if (!handler) return new Response('not found', { status: 404 });
    return toResponse(await handler(await toEvent(request)));
  },
  async scheduled(controller, env, ctx) {
    setKV(env.KV);
    ctx.waitUntil(remind.handler({}));
  },
};
