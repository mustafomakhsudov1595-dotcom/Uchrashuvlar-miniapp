// Oddiy xizmat ishchisi: ilovani "o'rnatish" imkonini beradi. API va video keshlanmaydi (ma'lumotlar doim yangi bo'lishi kerak).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
