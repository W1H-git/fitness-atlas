/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { basePath, cachePrefix, imageCacheName } from './cache-config'
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[]
}
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(
  new NavigationRoute(createHandlerBoundToURL(basePath + 'index.html'), {
    denylist: [
      new RegExp(
        '^' + basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:assets|exercises|icons)/',
      ),
    ],
  }),
)
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    url.pathname.startsWith(basePath + 'exercises/') &&
    url.pathname.endsWith('.png'),
  new CacheFirst({
    cacheName: imageCacheName,
    plugins: [
      {
        cacheWillUpdate: async ({ response }) =>
          response.status === 200 && response.headers.get('content-type')?.includes('image/png')
            ? response
            : null,
      },
    ],
  }),
)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
  if (event.data?.type === 'COUNT_CLIENTS') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        event.ports[0]?.postMessage(
          clients.filter((client) => client.url.startsWith(self.registration.scope)).length,
        )
      }),
    )
  }
})
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith(cachePrefix) && key !== imageCacheName)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})
