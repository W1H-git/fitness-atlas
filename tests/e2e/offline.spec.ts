import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
const base = process.env.VITE_BASE_PATH || '/'
async function ready(page: Page) {
  await page.goto(base + '#/profile')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
}
test('install prompt received on home remains available after navigating to profile', async ({
  page,
}) => {
  await page.goto(base)
  await expect(page.getByRole('link', { name: '我的', exact: true })).toBeVisible()
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(event, {
      prompt: async () => {
        window.dispatchEvent(new Event('appinstalled'))
      },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })
    window.dispatchEvent(event)
  })
  await page.getByRole('link', { name: '我的', exact: true }).click()
  await page.getByRole('button', { name: '安装健身动作图鉴', exact: true }).click()
  await expect(page.getByRole('heading', { name: '已在独立窗口中使用' })).toBeVisible()
})
test('full catalog download, offline navigation and training persistence', async ({
  page,
  context,
}) => {
  await page.clock.setFixedTime(new Date('2026-09-07T10:00:00+08:00'))
  await ready(page)
  const manifest = await (await page.request.get(base + 'manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ scope: base, start_url: base + '#/', display: 'standalone' })
  expect(manifest.icons).toHaveLength(3)
  await page.getByRole('button', { name: '保存档案并生成计划' }).click()
  await expect(page.getByRole('link', { name: '查看本周日程 →' })).toBeVisible()
  await page.getByRole('button', { name: /下载全部图解|继续下载／重试/ }).click()
  await expect(page.getByText(/完整图鉴已缓存，可离线查看/)).toBeVisible({ timeout: 90000 })
  await page.screenshot({ path: 'work/stage-6/download-complete.png', fullPage: true })
  expect(
    await page.evaluate(async () => {
      const key = (await caches.keys()).find((k) => k.startsWith('fitness-atlas:'))
      return (await (await caches.open(key!)).keys()).length
    }),
  ).toBe(906)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: '我的训练档案' })).toBeVisible()
  await page.getByRole('link', { name: '动作库', exact: true }).click()
  await page.getByRole('searchbox', { name: '搜索动作' }).fill('卧推')
  await page.getByRole('link', { name: '查看杠铃卧推', exact: true }).click()
  for (const n of [1, 2, 3]) {
    await page.getByRole('button', { name: '查看图 ' + n, exact: true }).click()
    await expect(page.locator('.frame-panel.is-selected img')).toHaveJSProperty('naturalWidth', 512)
  }
  await page.getByRole('link', { name: '日程', exact: true }).click()
  const first = page.locator('.prescription-card').first()
  await first.getByRole('button', { name: '记录本次训练' }).click()
  await first.getByLabel('第1组实际次数', { exact: true }).fill('10')
  await first.getByLabel('第1组已完成', { exact: true }).check()
  await first.getByRole('button', { name: '完成并保存训练' }).click()
  await expect(first.locator('.record-success')).toBeVisible()
  await page.getByRole('link', { name: '查看训练历史与草稿 →', exact: true }).click()
  await expect(page).toHaveURL(/#\/history$/)
  await expect(page.locator('.history-record')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.history-record')).toHaveCount(1)
  await page.screenshot({ path: 'work/stage-6/offline-history.png', fullPage: true })
})
test('uncached images fail clearly, interrupted download resumes and deleted cache is detected', async ({
  page,
  context,
}) => {
  await ready(page)
  await context.setOffline(true)
  await page.getByRole('link', { name: '动作库', exact: true }).click()
  await page.getByRole('searchbox', { name: '搜索动作' }).fill('杠铃卧推')
  await page.getByRole('link', { name: '查看杠铃卧推', exact: true }).click()
  await expect(page.locator('.frame-panel.is-selected .image-fallback')).toBeVisible()
  await context.setOffline(false)
  await page.getByRole('link', { name: '我的', exact: true }).click()
  await page.getByRole('button', { name: /下载全部图解|继续下载／重试/ }).click()
  await expect.poll(() => page.getByRole('progressbar').getAttribute('value')).not.toBe('0')
  await page.getByRole('button', { name: '暂停下载' }).click()
  await expect(page.getByRole('button', { name: '继续下载／重试' })).toBeEnabled()
  await page.getByRole('button', { name: '继续下载／重试' }).click()
  await expect(page.getByText(/完整图鉴已缓存，可离线查看/)).toBeVisible({ timeout: 90000 })
  await page.evaluate(async () => {
    for (const key of await caches.keys())
      if (key.startsWith('fitness-atlas:')) await caches.delete(key)
  })
  await page.getByRole('button', { name: '检查缓存', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0')
  await expect(page.getByText(/尚未缓存完整图鉴/)).toBeVisible()
})
test('real worker update saves drafts, refuses failed writes and preserves records', async ({
  page,
}) => {
  const path = 'dist/sw.js',
    original = await readFile(path, 'utf8')
  try {
    await page.clock.setFixedTime(new Date('2026-09-07T10:00:00+08:00'))
    await ready(page)
    await page.getByRole('button', { name: '保存档案并生成计划' }).click()
    await page.getByRole('link', { name: '查看本周日程 →' }).click()
    const first = page.locator('.prescription-card').first()
    const second = page.locator('.prescription-card').nth(1)
    await second.getByRole('button', { name: '记录本次训练' }).click()
    await second.getByLabel('第1组实际次数', { exact: true }).fill('10')
    await second.getByLabel('第1组已完成', { exact: true }).check()
    await second.getByRole('button', { name: '完成并保存训练' }).click()
    await expect(second.locator('.record-success')).toBeVisible()
    await first.getByRole('button', { name: '记录本次训练' }).click()
    await first.getByLabel('第1组实际次数', { exact: true }).fill('11')
    await expect(first.getByRole('status')).toHaveText('草稿已保存到本机')
    await writeFile(path, original + '\n// Update test ' + Date.now())
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update()
    })
    await expect(page.getByRole('button', { name: '保存并更新', exact: true })).toBeVisible()
    const other = await page.context().newPage()
    await other.goto(base)
    await page.getByRole('button', { name: '保存并更新', exact: true }).click()
    await expect(page.locator('.update-prompt [role=alert]')).toContainText('其他标签页')
    await other.close()
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put
      Object.assign(window, {
        restorePut: () => {
          IDBObjectStore.prototype.put = put
        },
      })
      IDBObjectStore.prototype.put = function () {
        throw new DOMException('test quota', 'QuotaExceededError')
      }
    })
    await first.getByLabel('第1组实际次数', { exact: true }).fill('12')
    await expect(first.getByRole('alert')).toContainText('草稿保存失败')
    await page.getByRole('button', { name: '保存并更新', exact: true }).click()
    await expect(page.locator('.update-prompt [role=alert]')).toBeVisible()
    await expect(first.getByLabel('第1组实际次数', { exact: true })).toHaveValue('12')
    await page.evaluate(() => {
      ;(window as unknown as { restorePut: () => void }).restorePut()
    })
    await page.getByRole('button', { name: '保存并更新', exact: true }).click()
    await expect(first.getByRole('button', { name: '继续记录', exact: true })).toBeVisible()
    await first.getByRole('button', { name: '继续记录', exact: true }).click()
    await expect(first.getByLabel('第1组实际次数', { exact: true })).toHaveValue('12')
    await expect(second.locator('.record-success')).toBeVisible()
  } finally {
    await writeFile(path, original)
  }
})
