import { basePath, imageCacheName } from '../pwa/cache-config'
export interface CacheManifest {
  version: string
  bytes: number
  assets: Record<string, string>
}
export interface CacheProgress {
  cached: number
  total: number
  failed: number
}
export function createOfflineCacheService() {
  let manifest: CacheManifest | undefined
  let running: Promise<void> | undefined
  let controller: AbortController | undefined
  async function catalog() {
    if (manifest) return manifest
    const response = await fetch(basePath + 'exercise-cache-manifest.json')
    if (!response.ok) throw new Error('离线清单无法读取，请联网重试')
    const value = (await response.json()) as CacheManifest
    if (value.version !== __CATALOG_VERSION__ || !value.assets || !Object.keys(value.assets).length)
      throw new Error('离线清单版本不匹配，请更新应用后重试')
    if (Object.keys(value.assets).some((path) => !/^exercises\/[a-z0-9-]+\/[123]\.png$/.test(path)))
      throw new Error('图解路径无效')
    manifest = value
    return value
  }
  async function status(): Promise<CacheProgress> {
    const value = await catalog()
    const cache = await caches.open(imageCacheName)
    const stored = new Set((await cache.keys()).map((request) => request.url))
    const paths = Object.keys(value.assets)
    const cached = paths.filter((path) =>
      stored.has(new URL(basePath + path, location.origin).href),
    ).length
    return { cached, total: paths.length, failed: 0 }
  }
  function download(progress: (value: CacheProgress) => void) {
    if (running) return running
    controller = new AbortController()
    const signal = controller.signal
    running = (async () => {
      const manifest = await catalog(),
        cache = await caches.open(imageCacheName)
      const paths = Object.keys(manifest.assets)
      const stored = new Set((await cache.keys()).map((request) => request.url))
      const missing = paths.filter(
        (path) => !stored.has(new URL(basePath + path, location.origin).href),
      )
      let cached = paths.length - missing.length,
        failed = 0,
        index = 0
      progress({ cached, total: paths.length, failed })
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          while (index < missing.length && !signal.aborted) {
            const path = missing[index++]!
            try {
              const response = await fetch(basePath + path, { signal, cache: 'reload' })
              if (!response.ok || !response.headers.get('content-type')?.includes('image/png'))
                throw new Error('图解请求失败')
              const bytes = await response.clone().arrayBuffer()
              const digest = await crypto.subtle.digest('SHA-256', bytes)
              const hash = Array.from(new Uint8Array(digest), (byte) =>
                byte.toString(16).padStart(2, '0'),
              ).join('')
              if (hash !== manifest.assets[path]) throw new Error('图解完整性校验失败')
              await cache.put(basePath + path, response)
              cached++
            } catch {
              if (!signal.aborted) failed++
            }
            progress({ cached, total: paths.length, failed })
          }
        }),
      )
      if (!signal.aborted && cached !== paths.length)
        throw new Error('部分图解未下载，可重试补齐；已完成内容会保留')
    })().finally(() => {
      running = undefined
      controller = undefined
    })
    return running
  }
  return { status, download, cancel: () => controller?.abort() }
}
