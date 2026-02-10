// Minimal service worker for PWA
const CACHE = 'buildcrm-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first for API and navigation
  if (event.request.url.includes('/api') || event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
    return;
  }
  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
