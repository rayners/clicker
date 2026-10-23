import { test, expect } from '@playwright/test';
import { freshGame, skipBoot, pressMany } from './helpers';

test('haulage: push the tug to the first station on its thrusters and get paid', async ({ page, isMobile }) => {
  await freshGame(page, 'haulage');
  const thrusters = page.getByRole('button', { name: /fire thrusters/i });
  await pressMany(thrusters, 35);
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

test('overland: the short contract is offered first, and the rig rolls on the engine alone', async ({ page }) => {
  await page.goto('/contract/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await skipBoot(page);
  const cards = page.getByRole('dialog', { name: /contract assignment/i }).getByRole('button', { name: /accept .* contract/i });
  await expect(cards.first()).toHaveAccessibleName(/overland/i);
  await cards.first().click();
  const gun = page.getByRole('button', { name: /gun the engine/i });
  await pressMany(gun, 30);
  await expect(page.getByLabel('Legs delivered')).toHaveText('1');
  await expect(page.getByRole('region', { name: /route/i })).toContainText('CAUSEWAY DEPOT');
});
