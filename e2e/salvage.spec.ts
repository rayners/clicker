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
