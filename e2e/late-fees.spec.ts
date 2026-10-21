import { test, expect } from '@playwright/test';

test('late fees: rent the tape, open the camp with the whistle, and keep it across a reload', async ({ page }) => {
  await page.goto('/late-fees/');
  await page.evaluate(() => localStorage.removeItem('latefees.save'));
  await page.reload();
  await page.getByRole('button', { name: /^rent friday the 12th$/i }).click();
  const whistle = page.getByRole('button', { name: /blow the whistle/i });
  for (let i = 0; i < 70; i++) await whistle.click();
  const gate = page.getByRole('region', { name: /camp zones/i }).getByRole('listitem').first();
  await expect(gate).toHaveAttribute('data-state', /open|slipping/);
  await expect(page.getByLabel('Cash')).not.toHaveText('$0');
  // Autosave runs on pagehide; reloading must bring the camp back, not the shelf.
  await page.reload();
  await expect(page.getByRole('dialog', { name: /horror/i })).toBeHidden();
  await expect(page.getByRole('region', { name: /camp zones/i }).getByRole('listitem').first()).toHaveAttribute('data-state', /open|slipping|frontier/);
});

test('late fees: a crossover puts one killer in another place', async ({ page }) => {
  await page.goto('/late-fees/');
  await page.evaluate(() => localStorage.removeItem('latefees.save'));
  await page.reload();
  await page.getByRole('button', { name: /^rent a nightmare at camp blackwater$/i }).click();
  await expect(page.getByRole('banner')).toContainText('A NIGHTMARE AT CAMP BLACKWATER');
  await expect(page.getByRole('button', { name: /blow the whistle/i })).toBeVisible();
});
