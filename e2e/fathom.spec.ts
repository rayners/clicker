import { test, expect } from '@playwright/test';

test('fathom: sell passes, put umbrellas on the beach and open more of it, and keep it across a reload', async ({ page, isMobile }) => {
  await page.goto('/fathom/');
  await page.evaluate(() => localStorage.removeItem('fathom.save'));
  await page.reload();
  await expect(page).toHaveTitle(/FATHOM/);
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
