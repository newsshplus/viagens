// Service worker mínimo - existe principalmente pra habilitar a instalação
// do app (critério exigido pelos navegadores). Faz cache leve do "shell"
// (HTML/JS/CSS) pra abrir mais rápido, mas nunca serve dado de busca de voo
// do cache - preços sempre vêm da rede, nunca de uma cópia antiga.
const CACHE_NAME = 'viagens-smart-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear chamadas de API - preços de voo têm que ser sempre em
  // tempo real, nunca uma resposta antiga guardada no navegador.
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
