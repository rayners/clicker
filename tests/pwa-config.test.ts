import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const config = readFileSync(resolve(__dirname, '../vite.config.ts'), 'utf8');

describe('the service worker', () => {
  // Both entries register sw.js by hand, so nothing sends the SKIP_WAITING message vite-plugin-pwa's helper would.
  // Without these, a new build waits until every tab (or the home-screen app) is closed, which on iOS can be never.
  it('takes over from the previous build on the next load, without waiting for every tab to close', () => {
    expect(config).toMatch(/skipWaiting:\s*true/);
    expect(config).toMatch(/clientsClaim:\s*true/);
  });
});
