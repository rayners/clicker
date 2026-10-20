/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      // Two games, one repo: DEEP CONTRACT at the root, CHARTER OF THE ELDERDARK under /forest/.
      input: { main: 'index.html', forest: 'forest/index.html' },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // Each game's entry registers the shared service worker itself (see src/main.ts, src/forest-main.ts).
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'DEEP CONTRACT',
        short_name: 'DEEP CONTRACT',
        description: 'Kessler-Amari Combine extraction operations terminal.',
        theme_color: '#020804',
        background_color: '#020804',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff,woff2,webmanifest}'],
        // The forest has its own page; never answer its navigations with DEEP CONTRACT's.
        navigateFallbackDenylist: [/\/forest\//],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
});
