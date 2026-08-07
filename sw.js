// OAS Service Worker v5 — Network-first untuk file inti app.
// File html/js/css/json SELALU diambil fresh dari server (no-store) —
// jadi setiap kamu update kode, user otomatis dapat versi terbaru
// TANPA perlu ganti query version manual di index.html.
// Cache di sini murni untuk fallback saat offline, bukan sumber utama.
const CACHE_NAME = 'oas-v5';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
// Ekstensi file "inti" yang wajib selalu fresh dari network
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

// Install: simpan aset inti awal (untuk fallback offline), lalu langsung aktif
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

// Activate: buang cache lama, ambil alih semua tab yang terbuka
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

// Fetch: file inti (html/js/css/json) -> network no-store dulu, fallback cache kalau offline.
// Aset lain (font, library CDN, gambar) -> network-first biasa (boleh manfaatkan cache browser).
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const reqUrl = event.request.url;
  if (!reqUrl.startsWith('http')) return;

  const path = reqUrl.split('?')[0];
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

// Handle skip waiting message
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
