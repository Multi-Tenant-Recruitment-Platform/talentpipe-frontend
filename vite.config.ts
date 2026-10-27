/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy API calls to the Spring Boot backend so the SPA and API are
    // same-origin during development (no CORS friction in the browser).
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Form suites type into pages with dozens of antd icons; each icon mount scans
    // jsdom's style tags, so these run ~2x the 5s default under a full parallel run.
    testTimeout: 15000,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/data/**', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts', '**/*.test.*'],
    },
  },
});
