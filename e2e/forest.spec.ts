import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/forest/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('elderdark: forage, hire hands, send a party and keep it across a reload', async ({ page, isMobile }) => {
  await expect(page).toHaveTitle(/ELDERDARK/);
  const forage = page.getByRole('button', { name: /forage the eaves/i });
  for (let i = 0; i < 60; i++) await forage.click();
  const standing = page.getByRole('region', { name: /company standing/i });
  await expect.poll(async () => Number(await standing.getByLabel('Thalers', { exact: true }).textContent()), { timeout: 15_000 }).toBeGreaterThanOrEqual(70);

  await page.getByRole('tab', { name: /roster/i }).click();
  await page.getByRole('button', { name: /hire a blade/i }).click();
  await page.getByRole('button', { name: /hire a blade/i }).click();
  await page.getByRole('button', { name: /hire a scout/i }).click();

  await page.getByRole('tab', { name: /expeditions/i }).click();
  await page.getByRole('button', { name: /send a party to the eaves/i }).click();
  // On desktop the ledger column is always visible and has no tab.
  if (isMobile) await page.getByRole('tab', { name: /ledger/i }).click();
  await expect(page.getByRole('region', { name: /operations board/i })).toContainText('THE EAVES');

  await page.reload();
  await expect(page.getByRole('region', { name: /operations board/i })).toContainText('THE EAVES');
});

test('elderdark: fits the viewport with thumb-sized order buttons', async ({ page, isMobile }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  if (!isMobile) return;
  await page.getByRole('tab', { name: /expeditions/i }).click();
  const box = await page.getByRole('button', { name: /one more blade for the eaves/i }).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test('elderdark: keeps its own save, apart from DEEP CONTRACT', async ({ page }) => {
  await page.getByRole('button', { name: /forage the eaves/i }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toContain('elderdark.save');
  expect(keys).not.toContain('deep-contract.save');
});
