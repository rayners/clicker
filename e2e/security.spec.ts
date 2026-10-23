import { test, expect } from '@playwright/test';
import { freshGame, pressMany } from './helpers';

test('security: take the landing pad with fire support and see it held', async ({ page }) => {
  await freshGame(page, 'security');
  const support = page.getByRole('button', { name: /call fire support/i });
  await pressMany(support, 70);
  const pad = page.getByRole('region', { name: /colony sectors/i }).getByRole('listitem').first();
  await expect(pad).toHaveAttribute('data-state', /secured|contested/);
  await expect(page.getByLabel('Sectors held')).toHaveText(/^1\//);
});
