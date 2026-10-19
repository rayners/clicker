import { test, expect } from '@playwright/test';
import { freshGame } from './helpers';

test.beforeEach(async ({ page }) => {
  await freshGame(page);
});

test('drill, earn credits, buy a drone, and keep progress across a reload', async ({ page, isMobile }) => {
  const drill = page.getByRole('button', { name: /execute drill cycle/i });
  for (let i = 0; i < 20; i++) await drill.click();

  const status = page.getByRole('region', { name: /ship status/i });
  // Refinery converts 5 ore/s; wait until 15 credits are banked.
  await expect
    .poll(async () => Number(await status.getByLabel('Credits').textContent()), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(15);

  if (isMobile) await page.getByRole('tab', { name: /systems/i }).click();
  await page.getByRole('button', { name: /acquire survey drone/i }).click();
  await expect(page.getByLabel('SURVEY DRONE owned')).toHaveText('1');

  // Saving happens on pagehide/visibilitychange; reload triggers it.
  await page.reload();
  if (isMobile) await page.getByRole('tab', { name: /systems/i }).click();
  await expect(page.getByLabel('SURVEY DRONE owned')).toHaveText('1');
});

test('the layout fits the viewport with no horizontal scroll', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
