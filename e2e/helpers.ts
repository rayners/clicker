import type { Page } from '@playwright/test';

/** A fresh game opens on the assignment screen; take the named contract. */
export async function acceptContract(page: Page, kind: 'extraction' | 'terraforming' | 'security' = 'extraction') {
  await page.getByRole('dialog', { name: /contract assignment/i }).getByRole('button', { name: new RegExp(`accept ${kind} contract`, 'i') }).click();
}

export async function freshGame(page: Page, kind: 'extraction' | 'terraforming' | 'security' = 'extraction') {
  await page.goto('/contract/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await acceptContract(page, kind);
}
