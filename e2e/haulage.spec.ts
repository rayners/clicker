import { test, expect } from '@playwright/test';
import { freshGame } from './helpers';

test('haulage: push the tug to the first station on its thrusters and get paid', async ({ page, isMobile }) => {
  await freshGame(page, 'haulage');
  const thrusters = page.getByRole('button', { name: /fire thrusters/i });
  for (let i = 0; i < 35; i++) await thrusters.click();
  await expect(page.getByLabel('Legs delivered')).toHaveText('1');
  await expect(page.getByRole('region', { name: /route/i })).toContainText('ANVIL TRANSFER');
  const helm = page.getByRole('region', { name: /helm/i });
  await helm.getByRole('button', { name: /burn hotter/i }).click();
  await expect(helm.getByLabel('Burn', { exact: true })).toHaveText('6');
  if (isMobile) {
    const box = await helm.getByRole('button', { name: /burn hotter/i }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  }
});
