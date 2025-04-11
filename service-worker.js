const CACHE_NAME = 'lista-compras-v1';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './cadastro.html',
  './style.css',
  './script.js',
  './cadastro.js',
  './icons/icon-152x152.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instala e armazena os arquivos no cache
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Fazendo cache dos arquivos');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Ativando...');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Intercepta requisições e tenta buscar online primeiro
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clona a resposta e armazena no cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Se offline, tenta retornar do cache
        return caches.match(event.request).then(response => {
          return response || new Response('Offline e recurso não encontrado', {
            status: 404,
            statusText: 'Offline e não em cache'
          });
        });
      })
  );
});
