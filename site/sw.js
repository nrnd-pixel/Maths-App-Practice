// v1
const CACHE_NAME = 'math-practice-pwa-v1';
const PRECACHE_URLS = new Set([
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([...PRECACHE_URLS]))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !PRECACHE_URLS.has(url.pathname)) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
