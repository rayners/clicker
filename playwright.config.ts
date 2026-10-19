import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5199' },
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // WebKit needs host libs (`sudo npx playwright install-deps webkit`); set E2E_WEBKIT=1 once installed.
    // Otherwise emulate the iPhone viewport/touch/UA on Chromium.
    {
      name: 'iphone',
      use: { ...devices['iPhone 13'], defaultBrowserType: process.env.E2E_WEBKIT ? 'webkit' : 'chromium' },
    },
  ],
});
