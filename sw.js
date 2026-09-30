// CONTENT SỔ ĐỎ - Service Worker (PWA 2026)
// Tương thích 100% với Vercel & GitHub Actions
const CACHE_NAME = 'content-so-do-v1.0.1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './script.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

// 1. Cài đặt Service Worker và lưu bộ nhớ đệm Offline Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline shell assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Precache warning:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Kích hoạt và dọn dẹp các cache phiên bản cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Chiến lược Fetch: Network-First cho HTML/JS (luôn mới nhất), Cache-First cho Assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // Đối với điều hướng trang web hoặc file code cốt lõi: Ưu tiên mạng, mất mạng dùng cache
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('script.js')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Đối với font chữ, icon, ảnh: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // network failure, safely ignore
      });
      return cachedResponse || fetchPromise;
    })
  );
});
