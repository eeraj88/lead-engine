import { expect, test } from '@playwright/test'

test('dashboard renders the v2 cockpit without layout overflow', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('HOT-Leads', { exact: true })).toBeVisible()
  await expect(page.getByText('OPENER', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Pipeline starten|Pipeline laeuft/ })).toBeVisible()

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(horizontalOverflow).toBe(false)
})

test('leads page renders lanes and filters without layout overflow', async ({ page }) => {
  await page.goto('/leads')

  await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible()
  await expect(page.getByText('Filter', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'HOT' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'WARM' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'COLD' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'NOT' })).toBeVisible()

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(horizontalOverflow).toBe(false)
})
