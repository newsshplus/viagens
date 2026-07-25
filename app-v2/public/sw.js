// Service worker mínimo - existe principalmente pra habilitar a instalação
// do app (critério exigido pelos navegadores). Estratégia network-first:
// SEMPRE tenta buscar a versão mais nova primeiro, e só usa uma cópia em
// cache se a rede falhar (modo offline). Isso garante que toda atualização
// publicada apareça imediatamente, sem o usuário ficar preso numa versão
// antiga - preços de voo nunca vêm do cache, sempre da rede.
const CACHE_NAME = 'viagens-smart-shell-v2';

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
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
