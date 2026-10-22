import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Node's process, typed here so the config needs no extra type package.
declare const process: { env: Record<string, string | undefined> }

// https://vite.dev/config/
export default defineConfig({
  // Shown in Settings so it's easy to tell which version a phone is running.
  // Vercel provides the commit; local builds show "local".
  define: {
    __APP_COMMIT__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'),
    __APP_BUILT_AT__: JSON.stringify(Date.now()),
  },
  plugins: [
    react(),
    // Makes the app installable on a phone's home screen and work offline.
    VitePWA({
      registerType: 'autoUpdate',
      // Registered in src/pwa.ts, which also checks for updates when the app comes back to the front.
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'LivingHUD',
        short_name: 'LivingHUD',
        description: 'Your real life as an RPG: daily quests, levels, stats and real rewards.',
        theme_color: '#050a14',
        background_color: '#050a14',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Take over as soon as a new version is downloaded instead of waiting for every
        // window to close (an installed Android app almost never fully closes).
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [
          {
            // The rep counter's body-tracking engine and model (about 17 MB): downloaded on the first workout, then offline.
            urlPattern: /\/(assets\/[^/]+\.wasm|models\/[^/]+)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'pose-model', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
