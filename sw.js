const CACHE_NAME = 'moneybook-v3';

// Only precache CDN resources (rarely change). HTML is network-first so it's always fresh.
const PRECACHE = [
  'https://cdn.tailwindcss.com/',
  'https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('api.deepseek.com')) return;

  const isHTML = e.request.mode === 'navigate';

  e.respondWith(
    isHTML
      // HTML: network-first (always get latest code, fallback to cache if offline)
      ? fetch(e.request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        }).catch(() => caches.match(e.request))
      // CDN assets: cache-first (they rarely change)
      : caches.match(e.request).then((cached) => {
          const fetched = fetch(e.request).then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
            }
            return response;
          }).catch(() => cached);
          return cached || fetched;
        })
  );
});
