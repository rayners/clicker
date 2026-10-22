import { test, expect } from '@playwright/test';

test('late fees: rent Candy Corn Day, walk the wards, fill a bed and raise the dose', async ({ page, isMobile }) => {
  await page.goto('/late-fees/');
  await page.evaluate(() => localStorage.removeItem('latefees.save'));
  // This tape comes in after a few films; the member jump stocks it for the test.
  await page.goto('/late-fees/?debug=member');
  await page.goto('/late-fees/');
  await page.getByRole('button', { name: /^rent candy corn day$/i }).click();
  await expect(page.getByLabel('Days to Candy Corn Day')).toHaveText(/DAYS/);
  const walk = page.getByRole('button', { name: /walk the wards/i });
  for (let i = 0; i < 20; i++) await walk.click();
  await page.getByRole('tab', { name: /wards/i }).click();
  await page.getByRole('button', { name: /fill open ward bed/i }).click();
  await expect(page.getByLabel('OPEN WARD BED owned')).toHaveText('1');
  const main = page.getByRole('tab', { name: /main/i });
  if (await main.isVisible()) await main.click();
  const dial = page.getByRole('region', { name: /sedation dial/i });
  await dial.getByRole('button', { name: /more sedation/i }).click();
  await expect(dial.getByLabel('Sedation', { exact: true })).toHaveText('30%');
  if (isMobile) expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
