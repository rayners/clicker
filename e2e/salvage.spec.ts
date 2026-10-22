import { test, expect } from '@playwright/test';
import { freshGame } from './helpers';

test('salvage: cut the bow airlock open by hand, then turn the torch up', async ({ page, isMobile }) => {
  await freshGame(page, 'salvage');
  const cut = page.getByRole('button', { name: /^cut$/i });
  for (let i = 0; i < 65; i++) await cut.click();
  await expect(page.getByLabel('Compartments open')).toHaveText(/^1\//);
  const hull = page.getByRole('region', { name: /derelict compartments/i });
  await expect(hull.getByRole('listitem').first()).toHaveAttribute('data-state', /secured|contested/);
  const torch = page.getByRole('region', { name: /cutting torch/i });
  await torch.getByRole('button', { name: /hotter torch/i }).click();
  await expect(torch.getByLabel('Torch notch')).toHaveText('6');
  if (isMobile) {
    const box = await torch.getByRole('button', { name: /hotter torch/i }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  }
});

for (const [name, size] of [
  ['upright', { width: 390, height: 664 }],
  ['on its side', { width: 844, height: 390 }],
] as const) {
  test(`salvage on a phone ${name}: a long compartment column still leaves the tabs readable`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout');
    await page.setViewportSize(size);
    // About the compartment column, not the walkthrough: start with the guide put away, as a player would after a tip.
    await page.goto('/contract/');
    await page.evaluate(() => localStorage.setItem('deep-contract.guide', JSON.stringify({ seen: [], skipped: true })));
    await page.goto('/contract/?debug=sal-act2');
    await page.getByRole('tab', { name: /sys/i }).click();
    await expect(page.getByRole('button', { name: /fit bracing frame/i })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}
