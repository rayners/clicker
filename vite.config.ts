/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      // The picker at the root, DEEP CONTRACT under /contract/, CHARTER OF THE ELDERDARK under /forest/.
      input: { picker: 'index.html', contract: 'contract/index.html', forest: 'forest/index.html' },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // Each game's entry registers the shared service worker itself (see src/main.ts, src/forest-main.ts).
      injectRegister: false,
      // Each game ships its own manifest from public/ (contract/, forest/), so it installs as its own app.
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff,woff2,webmanifest}'],
        // We register sw.js by hand, so nothing would send SKIP_WAITING: a new build activates by itself instead.
        skipWaiting: true,
        clientsClaim: true,
        // Each game has its own page; never answer its navigations with the picker.
        navigateFallbackDenylist: [/\/contract\//, /\/forest\//],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
});
