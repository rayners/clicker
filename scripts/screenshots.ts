/**
 * README screenshots, taken from the running dev server (debug jumps only work there):
 *   npm run dev   then   npm run screenshots [base url]
 * Writes docs/screenshots/*.jpg.
 */
import { chromium, devices, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = 'docs/screenshots';
const PHONE = { ...devices['iPhone 13'], deviceScaleFactor: 2 };
const DESKTOP = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };

interface Shot {
  name: string;
  path: string;
  device: typeof PHONE | typeof DESKTOP;
  /** Clicks after load: skip a boot screen, open a tape. */
  then?: (page: Page) => Promise<void>;
}

const skipBoot = async (page: Page) => {
  const skip = page.getByRole('button', { name: /skip the boot sequence/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();
};

const SHOTS: Shot[] = [
  { name: 'picker', path: '/', device: PHONE },
  { name: 'deep-contract-act1', path: '/contract/?debug=overland', device: PHONE, then: skipBoot },
  { name: 'deep-contract-act4', path: '/contract/?debug=act4', device: PHONE, then: async (page) => (await skipBoot(page), page.waitForTimeout(6000)) },
  { name: 'deep-contract-desktop', path: '/contract/?debug=act3', device: DESKTOP, then: skipBoot },
  { name: 'elderdark', path: '/forest/?debug=veteran', device: PHONE },
  { name: 'late-fees', path: '/late-fees/?debug=member', device: PHONE },
  {
    name: 'late-fees-camp',
    path: '/late-fees/?debug=member',
    device: PHONE,
    then: (page) => page.getByRole('button', { name: 'Rent FRIDAY THE 12TH', exact: true }).click(),
  },
  { name: 'down-there', path: '/down-there/?debug=veteran', device: PHONE },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const shot of SHOTS) {
    const context = await browser.newContext(shot.device);
    const page = await context.newPage();
    await page.goto(new URL(shot.path, BASE).href);
    await page.evaluate(() => localStorage.clear());
    await page.goto(new URL(shot.path, BASE).href);
    await page.waitForTimeout(1500);
    await shot.then?.(page);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${shot.name}.jpg`, type: "jpeg", quality: 85 });
    console.log(`${OUT}/${shot.name}.jpg`);
    await context.close();
  }
  await browser.close();
}

main();
