import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
async function setup(page: Page) {
  await page.clock.setFixedTime(new Date('2026-09-07T10:00:00+08:00'))
  await page.goto('/#/profile')
  await page.getByRole('button', { name: '保存档案并生成计划' }).click()
  await page.getByRole('link', { name: '查看本周日程 →' }).click()
}
const rowCard = (page: Page) =>
  page.locator('.prescription-card').filter({ has: page.locator('a[href$="/machine-row"]') })
test('draft, actual training, reload and backup restore', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await setup(page)
  const card = rowCard(page)
  await card.getByRole('button', { name: '记录本次训练' }).click()
  await card.getByLabel('第1组实际次数', { exact: true }).fill('12')
  await card.getByLabel('第1组实际重量', { exact: true }).fill('10')
  await card.getByLabel('第1组剩余能力', { exact: true }).fill('2')
  await card.getByLabel('第1组已完成', { exact: true }).check()
  await card.getByLabel('可用重量档位（kg）', { exact: true }).fill('10, 11, 12')
  await expect(card.getByRole('status')).toHaveText('草稿已保存到本机')
  await page.reload()
  await card.getByRole('button', { name: '继续记录' }).click()
  await expect(card.getByLabel('第1组实际次数', { exact: true })).toHaveValue('12')
  await expect(card.getByLabel('第1组已完成', { exact: true })).toBeChecked()
  await card.getByRole('button', { name: '完成并保存训练' }).click()
  await expect(card.locator('.record-success')).toBeVisible()
  await page.reload()
  await expect(card.locator('.record-success')).toBeVisible()
  await page.getByRole('link', { name: '查看训练历史与草稿 →', exact: true }).click()
  await expect(page.locator('.history-record')).toHaveCount(1)
  await expect(page.locator('.history-record')).toContainText('12 次')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 JSON 备份' }).click()
  const path = 'work/stage-5/' + info.project.name + '-backup.json'
  await (await downloadPromise).saveAs(path)
  await page.getByLabel('选择备份文件', { exact: true }).setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  })
  await expect(page.getByRole('alert')).toContainText('不是有效的 JSON')
  await expect(page.locator('.history-record')).toHaveCount(1)
  await page.getByLabel('选择备份文件', { exact: true }).setInputFiles(path)
  await expect(page.getByRole('heading', { name: '恢复预览' })).toBeVisible()
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: '确认替换本机数据' }).click(),
  ])
  await expect(page.locator('.history-record')).toHaveCount(1)
  await expect(page.locator('.history-record')).toContainText('10 kg')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({
    path: 'work/stage-5/' + info.project.name + '-history.png',
    fullPage: true,
  })
  expect(errors).toEqual([])
})
test('write failure retains input and retry saves it', async ({ page }) => {
  await setup(page)
  const card = rowCard(page)
  await card.getByRole('button', { name: '记录本次训练' }).click()
  await expect(card.getByRole('status')).toHaveText('草稿已保存到本机')
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    Object.assign(window, {
      restorePut: () => {
        IDBObjectStore.prototype.put = original
      },
    })
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('Test quota', 'QuotaExceededError')
    }
  })
  await card.getByLabel('第1组实际次数', { exact: true }).fill('9')
  await expect(card.getByRole('alert')).toContainText('草稿保存失败')
  await expect(card.getByLabel('第1组实际次数', { exact: true })).toHaveValue('9')
  await page.evaluate(() => {
    ;(window as unknown as { restorePut: () => void }).restorePut()
  })
  await card.getByRole('button', { name: '重试保存草稿' }).click()
  await expect(card.getByRole('status')).toHaveText('草稿已保存到本机')
  await page.reload()
  await card.getByRole('button', { name: '继续记录' }).click()
  await expect(card.getByLabel('第1组实际次数', { exact: true })).toHaveValue('9')
})
test('unreadable profile cannot be overwritten with defaults', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('fitness-atlas:profile:initial', '{"version":99,"profile":{}}'),
  )
  await page.goto('/#/profile')
  await expect(page.getByRole('alert')).toContainText('档案加载失败')
  await expect(page.getByRole('button', { name: '保存档案并生成计划' })).toBeDisabled()
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('fitness-atlas:profile:initial')!).version,
    ),
  ).toBe(99)
})
