/* Oflayn rejim: ilova qobigʻi va shriftlar keshlanadi. API (/api, /r) hech qachon keshlanmaydi. */
const CACHE = 'impro-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/']).catch(() => {}))); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/r/')) return;
  if (req.mode === 'navigate') {
    // Sahifa: avval tarmoq, bo'lmasa kesh
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); return res; }).catch(() => caches.match('/').then((r) => r || Response.error())));
    return;
  }
  // Resurslar (hash'li fayllar, shrift, rasm): avval kesh, yo'q bo'lsa tarmoqdan olib saqlaymiz
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && (url.pathname.startsWith('/assets/') || /\.(woff2?|jpg|png|svg|webp)$/.test(url.pathname))) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
