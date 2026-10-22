import { test, expect } from '@playwright/test';

test('the game page loads with its title', async ({ page }) => {
  await page.goto('/contract/');
  await expect(page).toHaveTitle(/DEEP CONTRACT/);
});

test('a brand-new player sees WARDEN boot up once, and can skip it', async ({ page }) => {
  // Each test runs in a fresh browser, so this is a first visit.
  await page.goto('/contract/');
  const boot = page.getByRole('dialog', { name: /warden is starting/i });
  await expect(boot).toBeVisible();
  await page.getByRole('button', { name: /skip the boot sequence/i }).click();
  await expect(boot).toBeHidden();
  await page.getByRole('dialog', { name: /contract assignment/i }).getByRole('button', { name: /accept extraction contract/i }).click();
  await page.reload();
  await expect(boot).toBeHidden();
});
