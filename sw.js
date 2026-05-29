// ═══════════════════════════════════════════════════════════════════
// SERVICE WORKER — Revíry MRS Brno PWA
// Verze se čte z DATA_VERSION v index.html přes postMessage
// ═══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'reviry-v1';
const DATA_CACHE = 'reviry-data-v1';

// Soubory pro offline shell
const SHELL_FILES = [
  './index.html',
  './manifest.json'
];

// ── Instalace: zakešuj shell ──────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// ── Aktivace: vymaž staré cache ───────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: offline-first pro shell, network-first pro data.json ───
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Data JSON — network first, fallback na cache
  if (url.pathname.endsWith('data.json')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(DATA_CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Shell — cache first, fallback na network
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request).then(res => {
        caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        return res;
      }))
      .catch(() => caches.match('./index.html'))
  );
});

// ── Zprávy z aplikace ─────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'CLEAR_DATA_CACHE') {
    caches.delete(DATA_CACHE).then(() => {
      e.ports[0]?.postMessage({ ok: true });
    });
  }
});
