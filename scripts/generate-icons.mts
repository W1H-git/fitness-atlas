import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  await mkdir('public/icons', { recursive: true })
  for (const [size, name, mask] of [
    [192, 'pwa-192', false],
    [512, 'pwa-512', false],
    [512, 'maskable-512', true],
  ] as const) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    })
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      size +
      '" height="' +
      size +
      '" viewBox="0 0 512 512"><rect width="512" height="512" rx="' +
      (mask ? 0 : 92) +
      '" fill="#20201e"/><g fill="#f8f8f5"><rect x="142" y="184" width="45" height="144" rx="12"/><rect x="325" y="184" width="45" height="144" rx="12"/><rect x="186" y="240" width="140" height="32" rx="6"/><rect x="120" y="223" width="20" height="66" rx="6"/><rect x="372" y="223" width="20" height="66" rx="6"/></g><circle cx="256" cy="345" r="13" fill="#c73832"/></svg>'
    await page.setContent('<style>html,body{margin:0;background:transparent}</style>' + svg)
    await page.screenshot({ path: 'public/icons/' + name + '.png', omitBackground: true })
    await page.close()
  }
} finally {
  await browser.close()
}
