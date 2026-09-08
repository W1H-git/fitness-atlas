import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function setup(page: Page) {
  await page.clock.setFixedTime(new Date('2026-09-07T10:00:00+08:00'))
  await page.goto('/#/profile')
  await page.getByRole('button', { name: '保存档案并生成计划' }).click()
  await expect(
    page.getByText('档案已更新，本周计划已生成。过去及已完成的日程会保留。'),
  ).toBeVisible()
  await page.getByRole('link', { name: '查看本周日程 →' }).click()
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
}
test('personal schedule, muscle focus, edits, rest and session lifetime', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await setup(page)
  await expect(page.locator('.training-week button')).toHaveCount(7)
  await expect(page.locator('.training-week .is-rest')).toHaveCount(4)
  await expect(page.locator('.prescription-card')).toHaveCount(4)
  await expect(page.locator('.prescription-card').first()).toContainText('2 组')
  const weighted = page
    .locator('.prescription-card')
    .filter({ has: page.locator('a[href$="/machine-row"]') })
  await expect(weighted).toContainText('待试重')
  await page.getByRole('button', { name: '胸部', exact: true }).click()
  const primary = page.locator('.training-focus [data-primary="true"]')
  await expect(primary).toHaveCount(2)
  expect(
    await primary.evaluateAll((nodes) =>
      nodes.every((n) => n.getAttribute('data-region') === 'chest'),
    ),
  ).toBe(true)
  const first = weighted
  await first.getByRole('button', { name: '调整建议' }).click()
  await first.getByLabel('组数', { exact: true }).fill('3')
  await first.getByLabel('计划重量（kg）').fill('8')
  await first.getByRole('button', { name: '保存调整' }).click()
  await expect(first.locator('form')).toHaveCount(0)
  await expect(first).toContainText('3 组')
  await expect(first).toContainText('8 kg')
  await first.getByText('推荐依据', { exact: true }).click()
  await expect(first).toContainText('用户手动调整')
  await noOverflow(page)
  await page.screenshot({
    path: 'work/stage-4/' + testInfo.project.name + '-schedule.png',
    fullPage: true,
  })
  await page.getByRole('link', { name: '今日', exact: true }).click()
  await expect(page.locator('.recommendation-section')).toContainText('8 kg')
  await page.getByRole('link', { name: '日程', exact: true }).click()
  await page.getByRole('button', { name: '2026-09-08 休息' }).click()
  await expect(page.getByRole('heading', { name: '今天，好好恢复' })).toBeVisible()
  await expect(page.locator('.prescription-card')).toHaveCount(0)
  await page.getByRole('button', { name: '2026-09-09 全身 B' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.prescription-card')).toHaveCount(4)
  await page.reload()
  await expect(page.locator('.training-week button')).toHaveCount(7)
  await page.getByRole('button', { name: '2026-09-07 全身 A' }).click()
  await expect(
    page.locator('.prescription-card').filter({ has: page.locator('a[href$="/machine-row"]') }),
  ).toContainText('8 kg')
  expect(errors).toEqual([])
})
test('profile validation, limited equipment and goal/ability changes', async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-09-07T10:00:00+08:00'))
  await page.goto('/#/profile')
  await page.getByRole('checkbox', { name: '周五', exact: true }).uncheck()
  await page.getByRole('checkbox', { name: '周日', exact: true }).check()
  await expect(page.getByText(/周日与下周一也不能相邻/)).toBeVisible()
  await expect(page.getByRole('button', { name: '保存档案并生成计划' })).toBeDisabled()
  await page.getByRole('button', { name: '恢复默认训练日' }).click()
  await page.getByRole('button', { name: '仅自重', exact: true }).click()
  await page.getByRole('button', { name: '保存档案并生成计划' }).click()
  await page.getByRole('link', { name: '查看本周日程 →' }).click()
  await expect(page.getByText('部分动作暂未安排')).toBeVisible()
  await expect(page.locator('.training-notice')).toContainText('拉类')
  await expect(page.locator('.prescription-card')).toHaveCount(3)
  await page.getByRole('link', { name: '我的', exact: true }).click()
  await page.getByLabel('训练目标', { exact: true }).selectOption('fat-loss')
  await page.getByLabel('身体能力', { exact: true }).selectOption('intermediate')
  await page.getByRole('button', { name: '完整健身房', exact: true }).click()
  await noOverflow(page)
  await page.screenshot({
    path: 'work/stage-4/' + testInfo.project.name + '-profile.png',
    fullPage: true,
  })
  await page.getByRole('button', { name: '保存档案并生成计划' }).click()
  await page.getByRole('link', { name: '查看本周日程 →' }).click()
  await expect(page.locator('.training-week .is-rest')).toHaveCount(3)
  await expect(page.locator('.prescription-card')).toHaveCount(4)
  await expect(page.locator('.prescription-card').first()).toContainText('2 组')
  await noOverflow(page)
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 800 })
    await noOverflow(page)
  }
})
test('invalid manual range keeps the editor and original prescription', async ({ page }) => {
  await setup(page)
  const first = page.locator('.prescription-card').first()
  await first.getByRole('button', { name: '调整建议' }).click()
  await first.getByLabel('次数下限').fill('15')
  await first.getByLabel('次数上限').fill('10')
  await first.getByRole('button', { name: '保存调整' }).click()
  await expect(first.getByRole('alert')).toContainText('上限不能小于下限')
  await expect(first.locator('.prescription-numbers')).toContainText('8–12 次')
  await first.getByRole('button', { name: '取消', exact: true }).click()
  await expect(first.locator('form')).toHaveCount(0)
})
