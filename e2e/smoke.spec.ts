import { test, expect } from '@playwright/test';

test('the game page loads with its title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/DEEP CONTRACT/);
});
