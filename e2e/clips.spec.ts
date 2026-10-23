import { test, expect } from '@playwright/test';

// CLIP WORKS, the example game built from the engine's docs, on a phone and on a desktop.
test('clip works: make clips by hand, sell them, buy an autoclipper, and come back to the same works', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/clips/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/clips/');
  const make = page.getByRole('button', { name: 'Make a paperclip' });
  for (let i = 0; i < 120; i++) await make.click();
  await expect(page.getByLabel('Clips made')).toHaveText('120');
  const works = page.getByRole('tab', { name: /^works$/i });
  if (await works.isVisible()) await works.click();
  const buy = page.getByRole('button', { name: /buy autoclipper/i });
  await expect(buy).toBeEnabled({ timeout: 30_000 });
  await buy.click();
  await page.reload();
  await expect(page.getByLabel('Clips made')).not.toHaveText('0');
});
