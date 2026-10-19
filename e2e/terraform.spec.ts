import { test, expect } from '@playwright/test';
import { freshGame } from './helpers';

test.beforeEach(async ({ page }) => {
  await freshGame(page, 'terraforming');
});

test('terraform: surge, build a processor, move power, and keep the contract across a reload', async ({ page, isMobile }) => {
  const surge = page.getByRole('button', { name: /fire processor surge/i });
  for (let i = 0; i < 20; i++) await surge.click();
  const status = page.getByRole('region', { name: /ship status/i });
  await expect.poll(async () => Number(await status.getByLabel('Credits').textContent())).toBeGreaterThanOrEqual(15);

  if (isMobile) await page.getByRole('tab', { name: /systems/i }).click();
  await page.getByRole('button', { name: /build regolith cracker/i }).click();
  await expect(page.getByLabel('REGOLITH CRACKER owned')).toHaveText('1');

  if (isMobile) await page.getByRole('tab', { name: /ops/i }).click();
  const allocation = page.getByRole('region', { name: /power allocation/i });
  await allocation.getByRole('button', { name: /more power to heat/i }).click();
  await expect(allocation.getByLabel('Heat share')).toHaveText('40%');

  await page.reload();
  await expect(page.getByRole('button', { name: /fire processor surge/i })).toBeVisible();
  await expect(page.getByRole('region', { name: /power allocation/i }).getByLabel('Heat share')).toHaveText('40%');
});

test('terraform: the allocation buttons are thumb-sized on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only');
  const box = await page.getByRole('button', { name: /more power to heat/i }).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
