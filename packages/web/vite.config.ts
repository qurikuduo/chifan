import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/dishes/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-dishes', expiration: { maxEntries: 50, maxAgeSeconds: 3600 } },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/menus/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-menus', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
          },
        ],
      },
      manifest: {
        name: '家庭美食',
        short_name: '家庭美食',
        description: '家庭用餐协作平台',
        theme_color: '#E67E22',
        background_color: '#FFF8F0',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-pinyin': ['pinyin-pro'],
          'vendor-markdown': ['marked', 'dompurify'],
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-i18n': ['vue-i18n'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
