const cacheName = 'stall-ledger-app-v2';
const root = new URL('./', self.location.href).href;
const assets = [root, root+'manifest.webmanifest', root+'app-icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('stall-ledger-app-') && key !== cacheName).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(root)) return;
  if (request.mode !== 'navigate' && !assets.includes(request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const key = request.mode === 'navigate' ? root : request.url;
    try {
      const response = await fetch(request, request.mode === 'navigate' ? {cache:'no-cache'} : undefined);
      if (response.ok) {
        try { await cache.put(key, response.clone()); } catch {}
      }
      return response;
    } catch {
      return (await cache.match(key)) || Response.error();
    }
  })());
});