// v2 — expanded cache-on-first-use strategy
// Changes from v1:
//  - Cache name bumped to v2 (clears old v1 cache on activate)
//  - Strategy: cache-first for all same-origin assets (JS, images, JSON)
//  - Network-first for index.html and config.js (must always be fresh)
//  - Graceful offline fallback for the app shell

const CACHE_NAME  = 'math-practice-pwa-v2';
const SHELL_CACHE = 'math-practice-shell-v2';

// Assets to precache immediately on install (small, essential)
const PRECACHE_URLS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Routes that must always come from the network (never stale)
const NETWORK_FIRST = new Set([
  '/',
  '/index.html',
  '/config.js',
]);

// ── Install: precache the shell assets ───────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clear old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== SHELL_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: tiered strategy ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // Network-first for app shell and config (must always be fresh)
  if (NETWORK_FIRST.has(path)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for all versioned assets (JS files, images, JSON)
  // These are safe to cache indefinitely because filenames are versioned
  if (
    path.endsWith('.js') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.webp') ||
    path.endsWith('.json') ||
    path.endsWith('.css')
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Default: network with cache fallback
  event.respondWith(networkWithCacheFallback(event.request));
});

// ── Strategy implementations ──────────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline — please reconnect to load the app.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Asset unavailable offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function networkWithCacheFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline.', { status: 503 });
  }
}
