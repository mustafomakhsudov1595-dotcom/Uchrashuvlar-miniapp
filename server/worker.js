// Cloudflare Worker: Netlify Functions (bot, api, cal, remind) uchun adapter.
import { setKV, setAI } from './kv.js';
import bot from './functions/bot.js';
import api from './functions/api.js';
import cal from './functions/cal.js';
import remind from './functions/remind.js';
import report from './functions/report.js';
import alert from './functions/alert.js';
import ig from './functions/ig.js';
import privacyHtml from './privacy.html'; // Meta App Review uchun maxfiylik siyosati (/privacy)

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
  if (pathname === '/api/ig') return ig.handler;
  if (pathname.startsWith('/api/cal')) return cal.handler;
  if (pathname.startsWith('/r/')) return report.handler;
  return null;
}

export default {
  async fetch(request, env, ctx) {
    setKV(env.KV); setAI(env.AI);
    globalThis.__wu = (p) => ctx.waitUntil(p);
    const { pathname } = new URL(request.url);
    if (pathname === '/privacy' || pathname === '/privacy.html') return new Response(privacyHtml, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
    const handler = route(pathname);
    if (!handler) return new Response('not found', { status: 404 });
    try {
      return toResponse(await handler(await toEvent(request)));
    } catch (e) {
      console.error(e);
      await alert.notify(new URL(request.url).pathname, e);
      return new Response('error', { status: 500 });
    }
  },
  async scheduled(controller, env, ctx) {
    setKV(env.KV); setAI(env.AI);
    ctx.waitUntil(remind.handler({}).catch((e) => alert.notify('cron', e)));
  },
};
