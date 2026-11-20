const CACHE_NAME = 'oas-v9-next';
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];
const CORE_EXT = ['.html', '.js', '.css', '.json'];

function noStoreReq(url) {
  return new Request(url, { cache: 'no-store' });
}

function offlineFallback() {
  return new Response(
    '<h1>OAS — Offline</h1><p>Buka kembali saat ada koneksi internet.</p>',
    { headers: { 'Content-Type': 'text/html' }, status: 503 }
  );
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        CORE_ASSETS.map(asset =>
          fetch(noStoreReq(asset))
            .then(res => { if (res && res.ok) return cache.put(asset, res); })
            .catch(() => {})
        )
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const reqUrl = event.request.url;
  if (!reqUrl.startsWith('http')) return;

  const url = new URL(reqUrl);
  // Never intercept Next.js internal dev/build bundles, HMR, or dev preview hosts
  if (url.pathname.startsWith('/_next/') || url.hostname.startsWith('ais-dev-') || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  const path = url.pathname;
  const isCore = reqUrl.startsWith(self.location.origin) &&
    (path.endsWith('/') || CORE_EXT.some(ext => path.endsWith(ext)));

  if (isCore) {
    event.respondWith(
      fetch(noStoreReq(reqUrl))
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || offlineFallback()))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || offlineFallback()))
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
