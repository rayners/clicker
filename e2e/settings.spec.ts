import { test, expect } from '@playwright/test';
import { acceptContract, freshGame } from './helpers';

test.beforeEach(async ({ page }) => {
  await freshGame(page);
});

test('export a save, wipe the game, and import it back', async ({ page }) => {
  const drill = page.getByRole('button', { name: /execute drill cycle/i });
  for (let i = 0; i < 30; i++) await drill.click();
  const status = page.getByRole('region', { name: /ship status/i });
  await expect.poll(async () => Number(await status.getByLabel('Credits').textContent())).toBeGreaterThan(0);

  await page.getByRole('button', { name: /system configuration/i }).click();
  const dialog = page.getByRole('dialog', { name: /system configuration/i });
  await dialog.getByRole('button', { name: /export/i }).click();
  const code = await dialog.getByRole('textbox', { name: /save code/i }).inputValue();
  expect(code.length).toBeGreaterThan(100);

  await dialog.getByRole('button', { name: /hard reset/i }).click();
  await dialog.getByRole('button', { name: /confirm/i }).click();
  await acceptContract(page);
  await expect(status.getByLabel('Credits')).toHaveText('0');

  await page.getByRole('button', { name: /system configuration/i }).click();
  await dialog.getByRole('textbox', { name: /save code/i }).fill(code);
  await dialog.getByRole('button', { name: /import/i }).click();
  await expect(dialog.getByRole('status')).toHaveText(/imported/i);
  await expect.poll(async () => Number(await status.getByLabel('Credits').textContent())).toBeGreaterThan(0);
});

test('phone tab bar switches panels and the drill stays reachable', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only');
  await page.getByRole('tab', { name: /systems/i }).click();
  await expect(page.getByRole('heading', { name: /extraction systems/i })).toBeVisible();
  await expect(page.getByRole('log')).toBeHidden();
  await expect(page.getByRole('button', { name: /execute drill cycle/i })).toBeVisible();
  await page.getByRole('tab', { name: /ops/i }).click();
  await expect(page.getByRole('log')).toBeVisible();
});

test('accept Special Order 0-77 and stalk a contract as the creature', async ({ page }) => {
  await page.getByRole('button', { name: /system configuration/i }).click();
  await page.getByRole('button', { name: /accept special order 0-77/i }).click();
  const view = page.getByRole('region', { name: /special order 0-77/i });
  await expect(view).toBeVisible();
  await expect(view.getByRole('group')).toHaveCount(3);
  await view.getByRole('button', { name: /stalk .* harder/i }).first().click();
  await expect(view.getByLabel('Strength free')).toHaveText('2 / 3');
  await view.getByRole('button', { name: /return to the contract/i }).click();
  await expect(view).toBeHidden();
});
