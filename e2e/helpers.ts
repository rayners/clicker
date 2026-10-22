import type { Page } from '@playwright/test';

/** A fresh game opens on the assignment screen; take the named contract. */
export async function acceptContract(page: Page, kind: 'extraction' | 'terraforming' | 'security' | 'haulage' | 'overland' | 'salvage' = 'extraction') {
  await page.getByRole('dialog', { name: /contract assignment/i }).getByRole('button', { name: new RegExp(`accept ${kind} contract`, 'i') }).click();
}

/** A brand-new player sees WARDEN boot up first; skip it. */
export async function skipBoot(page: Page) {
  const skip = page.getByRole('button', { name: /skip the boot sequence/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

/**
 * A new contract of this kind. New players are offered only the overland haul, so this starts from the dev-only
 * veteran jump (every contract unlocked), then drops the jump so later reloads keep the contract.
 */
export async function freshGame(page: Page, kind: 'extraction' | 'terraforming' | 'security' | 'haulage' | 'overland' | 'salvage' = 'extraction') {
  await page.goto('/contract/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/contract/?debug=veteran');
  await skipBoot(page);
  await acceptContract(page, kind);
  await page.goto('/contract/');
}
