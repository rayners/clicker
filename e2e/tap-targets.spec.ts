import { test, expect } from '@playwright/test';
import { freshGame } from './helpers';

/** Requirement: every tap target is at least 44px tall on a phone. Checked on each game's opening screen. */
const PAGES: [string, (page: import('@playwright/test').Page) => Promise<void>][] = [
  ['DEEP CONTRACT', (page) => freshGame(page, 'extraction')],
  ['Elderdark', async (page) => void (await page.goto('/forest/'))],
  ['LATE FEES', async (page) => {
    await page.goto('/late-fees/');
    await page.getByRole('button', { name: /rent friday/i }).click();
  }],
  ['DOWN THERE', async (page) => void (await page.goto('/down-there/'))],
];

for (const [name, open] of PAGES) {
  test(`${name}: every visible button is at least 44px tall on a phone`, async ({ page }, info) => {
    test.skip(info.project.name !== 'iphone', 'phone layout only');
    await open(page);
    await page.waitForTimeout(300);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter((b) => b.offsetParent !== null && !b.closest('[hidden]'))
        .map((b) => ({ label: b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '', h: Math.round(b.getBoundingClientRect().height) }))
        .filter((b) => b.h > 0 && b.h < 44),
    );
    expect(small).toEqual([]);
  });
}
