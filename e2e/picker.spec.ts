import { test, expect } from '@playwright/test';

test('the front page lets a player choose either game', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /deep contract/i }).click();
  await expect(page).toHaveURL(/\/contract\/$/);
  await expect(page).toHaveTitle('DEEP CONTRACT');

  await page.goto('/');
  await page.getByRole('link', { name: /elderdark/i }).click();
  await expect(page).toHaveURL(/\/forest\/$/);
  await expect(page).toHaveTitle('CHARTER OF THE ELDERDARK');

  await page.goto('/');
  await page.getByRole('link', { name: /late fees/i }).click();
  await expect(page).toHaveURL(/\/late-fees\/$/);
  await expect(page).toHaveTitle('LATE FEES');
});
