import { test, expect } from '@playwright/test';

// The page of games made of data: the list, and CLIP WORKS played from its JSON alone.
test('made with the engine: pick CLIP WORKS from the list, make clips, and buy from its buy tab', async ({ page }) => {
  await page.goto('/made/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/made/');
  await page.getByRole('link', { name: /clip works/i }).click();
  const make = page.getByRole('button', { name: 'Make a paperclip' });
  for (let i = 0; i < 30; i++) await make.click();
  await expect(page.getByLabel('MADE')).toHaveText('30');
  const buy = page.getByRole('tab', { name: /^buy$/i });
  if (await buy.isVisible()) await buy.click();
  await expect(page.getByRole('button', { name: /buy autoclipper/i })).toBeVisible();
});
