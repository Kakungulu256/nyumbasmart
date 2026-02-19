import { expect, test } from '@playwright/test'

test('auth pages smoke flow', async ({ page }) => {
  await page.goto('/auth/login')

  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()

  await page.getByRole('link', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/auth\/register$/)
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
})
