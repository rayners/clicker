import { test, expect } from '@playwright/test';

test('down there: sell passes, put umbrellas on the beach and open more of it, and keep it across a reload', async ({ page, isMobile }) => {
  await page.goto('/down-there/');
  await page.evaluate(() => localStorage.removeItem('fathom.save'));
  await page.reload();
  await expect(page).toHaveTitle(/DOWN THERE/);
  const pass = page.getByRole('button', { name: /sell a beach pass/i });
  for (let i = 0; i < 20; i++) await pass.click();
  await page.getByRole('tab', { name: /beach/i }).click();
  const beach = page.getByRole('tabpanel', { name: /beach/i });
  await beach.getByRole('button', { name: /buy beach umbrellas/i }).click();
  await expect(beach.getByLabel('BEACH UMBRELLAS owned')).toHaveText('1');
  await beach.getByRole('button', { name: /open more beach/i }).click();
  await expect(beach.getByLabel('Beach open', { exact: true })).toHaveText('60%');
  if (isMobile) {
    const box = await beach.getByRole('button', { name: /open more beach/i }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  }
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.reload();
  await page.getByRole('tab', { name: /beach/i }).click();
  await expect(page.getByRole('tabpanel', { name: /beach/i }).getByLabel('BEACH UMBRELLAS owned')).toHaveText('1');
});

test('down there: answer the Source from the configuration and rise under a town', async ({ page }) => {
  await page.goto('/down-there/');
  await page.evaluate(() => localStorage.removeItem('fathom.save'));
  // The Source opens after two seasons; the veteran jump opens it for the test.
  await page.goto('/down-there/?debug=veteran');
  await page.goto('/down-there/');
  await page.getByRole('button', { name: /^configuration$/i }).click();
  await page.getByRole('button', { name: /answer the source/i }).click();
  const source = page.getByRole('region', { name: /the source/i });
  await expect(source).toBeVisible();
  await source.getByRole('button', { name: /rise under harrow point/i }).click();
  await expect(source.getByLabel('Strength free')).toHaveText('2 / 3');
  await source.getByRole('button', { name: /return to the surface/i }).click();
  await expect(source).toBeHidden();
});
