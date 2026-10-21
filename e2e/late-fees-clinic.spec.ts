import { test, expect } from '@playwright/test';

test('late fees: rent the nightmare, take readings, fill a bed and turn the dial', async ({ page }) => {
  await page.goto('/late-fees/');
  await page.evaluate(() => localStorage.removeItem('latefees.save'));
  await page.reload();
  await page.getByRole('button', { name: /rent a nightmare on sycamore street/i }).click();
  const reading = page.getByRole('button', { name: /take a reading/i });
  for (let i = 0; i < 30; i++) await reading.click();
  await page.getByRole('tab', { name: /ward/i }).click();
  await page.getByRole('button', { name: /buy ward cot/i }).click();
  await expect(page.getByLabel('WARD COT owned')).toHaveText('1');
  // On desktop the main panel is always shown and its tab is hidden.
  const main = page.getByRole('tab', { name: /main/i });
  if (await main.isVisible()) await main.click();
  const dial = page.getByRole('region', { name: /deep-sleep dial/i });
  await dial.getByRole('button', { name: /more deep sleep/i }).click();
  await expect(dial.getByLabel('Deep sleep share')).toHaveText('40%');
});
