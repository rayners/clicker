import { test, expect } from '@playwright/test';

test('late fees: rent penultimate destination, write a policy and see who is next on the list', async ({ page }) => {
  await page.goto('/late-fees/');
  await page.evaluate(() => localStorage.removeItem('latefees.save'));
  await page.reload();
  await page.getByRole('button', { name: /rent penultimate destination/i }).click();
  const sell = page.getByRole('button', { name: /sell a policy/i });
  for (let i = 0; i < 30; i++) await sell.click();
  await page.getByRole('tab', { name: /office/i }).click();
  await page.getByRole('button', { name: /write term life policy/i }).click();
  await expect(page.getByLabel('TERM LIFE POLICY owned')).toHaveText('1');
  const main = page.getByRole('tab', { name: /main/i });
  if (await main.isVisible()) await main.click();
  await expect(page.getByRole('region', { name: /the list/i })).toContainText('NEXT: TOD');
});
