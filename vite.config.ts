import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const source = JSON.parse(
  readFileSync(new URL('./src/data/catalog-source.json', import.meta.url), 'utf8'),
) as { assetsSha256: Record<string, string>; totalImageBytes: number }
const version = createHash('sha256')
  .update(JSON.stringify(source.assetsSha256))
  .digest('hex')
  .slice(0, 16)
const base = process.env.VITE_BASE_PATH || '/'
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))
  throw new Error('VITE_BASE_PATH 必须为 / 或 /仓库名/ 形式')
export default defineConfig({
  base,
  define: { __CATALOG_VERSION__: JSON.stringify(version) },
  plugins: [
    vue(),
    {
      name: 'exercise-cache-manifest',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'exercise-cache-manifest.json',
          source: JSON.stringify({
            version,
            bytes: source.totalImageBytes,
            assets: source.assetsSha256,
          }),
        })
      },
    },
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'licenses/workout-guide/*'],
      manifest: {
        id: base,
        name: '健身动作图鉴',
        short_name: '健身图鉴',
        description: '三帧动作图解与个人训练日程',
        lang: 'zh-CN',
        start_url: base + '#/',
        scope: base,
        display: 'standalone',
        theme_color: '#20201e',
        background_color: '#f8f8f5',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,json}', 'icons/*.png', 'licenses/**/*'],
        globIgnores: ['exercises/**'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
})
