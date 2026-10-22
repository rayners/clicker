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

test('elderdark: listen to the wood and lean on a company', async ({ page }) => {
  await page.goto('/forest/');
  await page.evaluate(() => localStorage.removeItem('elderdark.save'));
  await page.reload();
  await page.getByRole('button', { name: /^configuration$/i }).click();
  await page.getByRole('button', { name: /listen to the wood/i }).click();
  const wood = page.getByRole('region', { name: /the wood/i });
  await expect(wood).toBeVisible();
  await wood.getByRole('button', { name: /lean harder on the company of the ashen key/i }).click();
  await expect(wood.getByLabel('Strength free')).toHaveText('2 / 3');
  await wood.getByRole('button', { name: /return to the ledger/i }).click();
  await expect(wood).toBeHidden();
});

test('elderdark: write a charter for Morrowgate Keep, buy oil, send a party in and post a blade', async ({ page, isMobile }) => {
  await page.getByRole('button', { name: /^configuration$/i }).click();
  const dialog = page.getByRole('dialog', { name: /configuration/i });
  await dialog.getByRole('button', { name: /charter for morrowgate keep/i }).click();
  await dialog.getByRole('button', { name: /confirm/i }).click();
  await dialog.getByRole('button', { name: /^close$/i }).click();

  // Debug jump for the rest: hands, silver and floors without the wait.
  await page.goto('/forest/?debug=keep-deep');
  await page.getByRole('tab', { name: /expeditions/i }).click();
  const assault = page.getByRole('article', { name: /assault on the keep/i });
  await expect(assault.getByRole('heading', { name: /the lord's chapel/i })).toBeVisible();
  await assault.getByRole('button', { name: /buy oil for one trip/i }).click();
  await assault.getByRole('button', { name: /send a party into the keep/i }).click();
  if (isMobile) await page.getByRole('tab', { name: /ledger/i }).click();
  await expect(page.getByRole('region', { name: /operations board/i })).toContainText("THE LORD'S CHAPEL");

  await page.getByRole('tab', { name: /expeditions/i }).click();
  const floors = page.getByRole('region', { name: /floors of the keep/i });
  const posted = floors.getByLabel(/blades posted on the gatehouse/i);
  const before = Number(await posted.textContent());
  await floors.getByRole('button', { name: /post a blade on the gatehouse/i }).click();
  await expect(posted).toHaveText(String(before + 1));
  if (isMobile) {
    const box = await floors.getByRole('button', { name: /post a blade on the gatehouse/i }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  }
});

test('elderdark: wake the dragon and circle a company', async ({ page }) => {
  await page.goto('/forest/');
  await page.evaluate(() => localStorage.removeItem('elderdark.save'));
  await page.reload();
  await page.getByRole('button', { name: /^configuration$/i }).click();
  await page.getByRole('button', { name: /wake the dragon/i }).click();
  const hoard = page.getByRole('region', { name: /the hoard/i });
  await expect(hoard).toBeVisible();
  await hoard.getByRole('button', { name: /circle closer over the company of the ashen key/i }).click();
  await expect(hoard.getByLabel('Strength free')).toHaveText('2 / 3');
  await hoard.getByRole('button', { name: /return to the ledger/i }).click();
  await expect(hoard).toBeHidden();
});
