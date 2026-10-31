/* ============================================================================
   Silver Throne — sw.js (service worker)
   Face jocul instalabil (PWA / aplicația din Google Play) și îl lasă să se deschidă și fără semnal.

   Strategia e „întâi rețeaua”: cât timp ai internet, primești MEREU fișierele noi de pe server, deci o
   actualizare urcată pe site ajunge imediat la jucători. Copia din memorie se folosește doar fără internet.
   Cererile către alte site-uri (Supabase, fonturi, CDN) nu trec deloc prin aici.
   Schimbă VERSIUNE doar dacă vrei să golești memoria tuturor (de exemplu după o reorganizare a fișierelor).
   ========================================================================== */
const VERSIUNE = 'st-2026-10-30';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSIUNE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(r);
      if (res.ok && res.type === 'basic') { const c = await caches.open(VERSIUNE); c.put(r, res.clone()); }
      return res;
    } catch (err) {
      const hit = await caches.match(r, { ignoreSearch: r.mode === 'navigate' });
      if (hit) return hit;
      if (r.mode === 'navigate') { const idx = await caches.match('./index.html', { ignoreSearch: true }) || await caches.match('./', { ignoreSearch: true }); if (idx) return idx; }
      return new Response('Ești offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
