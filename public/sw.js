const CACHE = 'esfuerzo-v2'
const ASSETS = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
  // No skipWaiting aquí — esperamos que el usuario confirme la actualización
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  // No interceptar requests a Google (Apps Script, OAuth, etc.)
  if (e.request.url.includes('google') || e.request.url.includes('googleapis')) return
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request).then(cached => cached || Response.error()))
  )
})

// El Navbar envía este mensaje cuando el usuario presiona "Actualizar"
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
