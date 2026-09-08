import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openFilters(page: Page) {
  const toggle = page.getByRole('button', { name: /筛选动作/ })
  if (await toggle.isVisible()) await toggle.click()
}
async function assertNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
}
test('catalog search, filters, clear, pagination and browser history', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/exercises')
  await expect(page.getByText('找到 302 个动作', { exact: true })).toBeVisible()
  await expect(page.locator('.exercise-card')).toHaveCount(12)
  await page.getByRole('button', { name: '加载更多动作' }).click()
  await expect(page.locator('.exercise-card')).toHaveCount(24)
  await page.getByRole('searchbox', { name: '搜索动作' }).fill('卧推')
  await openFilters(page)
  await page.getByLabel('训练器械', { exact: true }).selectOption('Dumbbell')
  await expect(page.locator('.exercise-card')).toHaveCount(3)
  await page.getByRole('link', { name: '查看哑铃卧推', exact: true }).click()
  await expect(page.getByRole('heading', { name: '哑铃卧推', exact: true })).toBeVisible()
  await expect(page.locator('.main-nav .is-current')).toHaveText('动作库')
  await page.goBack()
  await expect(page.getByRole('searchbox')).toHaveValue('卧推')
  await expect(page.locator('.exercise-card')).toHaveCount(3)
  await page.goForward()
  await expect(page.getByRole('heading', { name: '哑铃卧推', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '← 返回动作库' }).click()
  await page.getByRole('searchbox').fill('不存在的动作xyz')
  await expect(page.getByRole('heading', { name: '没有找到匹配的动作' })).toBeVisible()
  await page.getByRole('button', { name: '清空筛选', exact: true }).click()
  await expect(page.getByText('找到 302 个动作', { exact: true })).toBeVisible()
  await assertNoOverflow(page)
  await page.screenshot({
    path: 'work/stage-3/' + testInfo.project.name + '-catalog.png',
    fullPage: true,
  })
  expect(errors).toEqual([])
})
test('detail highlights primary muscles, switches frames and exposes provenance', async ({
  page,
}, testInfo) => {
  await page.goto('/#/exercises/bench-press')
  await expect(page.getByRole('heading', { name: '杠铃卧推', exact: true })).toBeVisible()
  const primary = page.locator('.target-panel [data-primary="true"]')
  await expect(primary).toHaveCount(2)
  expect(
    await primary.evaluateAll((nodes) =>
      nodes.every((node) => node.getAttribute('data-region') === 'chest'),
    ),
  ).toBe(true)
  expect(await primary.first().evaluate((node) => getComputedStyle(node).fill)).toBe(
    'rgb(199, 56, 50)',
  )
  await expect(page.locator('.secondary-muscles')).toContainText('肱三头肌')
  await page.getByRole('button', { name: '查看图 2' }).click()
  await expect(page.getByRole('button', { name: '查看图 2' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: '查看图 2' }).press('ArrowRight')
  await expect(page.getByRole('button', { name: '查看图 3' })).toBeFocused()
  await expect(page.getByRole('button', { name: '查看图 3' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('.frame-panel:visible')).toHaveCount(
    testInfo.project.name === 'mobile' ? 1 : 3,
  )
  await expect(page.locator('.frame-panel.is-selected img')).toHaveJSProperty('naturalWidth', 512)
  await assertNoOverflow(page)
  await page.screenshot({
    path: 'work/stage-3/' + testInfo.project.name + '-detail.png',
    fullPage: true,
  })
  await page.getByText('图解来源与许可', { exact: true }).click()
  await expect(page.getByRole('link', { name: 'Everkinetic 原图' })).toBeVisible()
  await page.goto('/#/exercises/squat')
  await expect(page.getByRole('heading', { name: '杠铃背蹲', exact: true })).toBeVisible()
  expect(
    await page
      .locator('.target-panel [data-primary="true"]')
      .evaluateAll(
        (nodes) =>
          nodes.length === 2 && nodes.every((node) => node.getAttribute('data-region') === 'quads'),
      ),
  ).toBe(true)
})
test('unknown routes, unknown IDs and documented image differences', async ({ page }) => {
  await page.goto('/#/missing')
  await expect(page.getByRole('heading', { name: '这个页面不存在' })).toBeVisible()
  await page.goto('/#/exercises/not-real')
  await expect(page.getByRole('heading', { name: '没有找到这个动作' })).toBeVisible()
  await page.goto('/#/exercises/swimming')
  await expect(page.getByRole('heading', { name: '图解阅读提示' })).toBeVisible()
  await expect(page.locator('.illustration-notes')).toContainText('陆上')
  await assertNoOverflow(page)
})
test('missing image renders a useful placeholder', async ({ page }) => {
  await page.route('**/exercises/bench-press/*.png', (route) => route.abort())
  await page.goto('/#/exercises/bench-press')
  await expect(page.locator('.frame-panel.is-selected .image-fallback')).toContainText(
    '图解暂时无法加载',
  )
  await assertNoOverflow(page)
})
test('home, schedule and profile explain initial setup', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('每一次训练')
  await page.screenshot({
    path: 'work/stage-3/' + testInfo.project.name + '-home.png',
    fullPage: true,
  })
  await page.getByRole('link', { name: '日程', exact: true }).click()
  await expect(page.getByRole('heading', { name: '先设置你的训练档案' })).toBeVisible()
  await page.getByRole('link', { name: '我的', exact: true }).click()
  await expect(page.getByRole('heading', { name: '我的训练档案' })).toBeVisible()
  await expect(page.getByText(/档案、日程与训练记录保存在当前浏览器/)).toBeVisible()
  await assertNoOverflow(page)
})

test('failed catalog request can be retried after connectivity returns', async ({ page }) => {
  await page.route('**/src/services/create-services.ts*', (route) => route.abort())
  await page.goto('/#/exercises')
  await expect(page.getByRole('heading', { name: '暂时无法打开动作库' })).toBeVisible()
  await page.unroute('**/src/services/create-services.ts*')
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await expect(page.getByText('找到 302 个动作', { exact: true })).toBeVisible()
})
