import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/spotifun/',
  plugins: [
    solidPlugin(),
    VitePWA({
      manifest: {
        theme_color: '#061b0e',
        background_color: '#061b0e',
        display: 'standalone',
        scope: '/',
        start_url: 'https://lukaszczernal.github.io/spotifun/',
        name: 'Spotifun.live',
        description: 'Guess cover albums of your favorite songs',
        short_name: 'Spotifun',
        icons: [
          {
            src: '/spotifun/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/spotifun/android-chrome-256x256.png',
            sizes: '256x256',
            type: 'image/png',
          },
          {
            src: '/spotifun/android-chrome-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/spotifun/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  build: {
    target: 'esnext',
    polyfillDynamicImport: false,
  },
});
