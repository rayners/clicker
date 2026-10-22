import { test, expect } from '@playwright/test';
import { skipBoot } from './helpers';

/** A phone on its side is short and wide: every game must still show its tabs and fit the width. */
for (const path of ['/contract/', '/forest/', '/late-fees/', '/down-there/']) {
  test(`${path} on a phone held sideways keeps its tabs on screen`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(path);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  await skipBoot(page);
    const assign = page.getByRole('dialog', { name: /contract assignment/i });
    if (await assign.isVisible().catch(() => false)) await assign.getByRole('button', { name: /accept overland contract/i }).click();
    await expect(page.getByRole('tab').first()).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}
