/* Service worker: cangkang aplikasi tersedia offline. Strategi NETWORK-FIRST (batas 3 dtk) agar pembaruan kode/konfigurasi
   langsung berlaku; cache hanya cadangan saat offline/lambat. Permintaan ke Apps Script TIDAK pernah di-cache. */
const V = 'esurat-v1.0.1';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/config.js', 'js/core.js', 'js/pages1.js', 'js/pages2.js', 'js/main.js', 'manifest.json', 'img/logo-jatim.png', 'img/logo-sman1.png', 'img/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;                // API & font eksternal: langsung jaringan
  e.respondWith((async () => {
    const c = await caches.open(V);
    try {
      const net = await Promise.race([fetch(e.request), new Promise((_, no) => setTimeout(() => no(new Error('lambat')), 3000))]);
      if (net && net.ok) c.put(e.request, net.clone());
      return net;
    } catch (err) { const hit = await c.match(e.request, { ignoreSearch: true }); if (hit) return hit; return fetch(e.request); }
  })());
});
