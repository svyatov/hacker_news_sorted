import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Pin a non-UTC, no-DST, half-hour zone so any local-time date parsing fails tests (HN times are UTC).
process.env.TZ = 'Asia/Kolkata';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['app/**/*.{ts,tsx}'],
      exclude: ['app/**/*.test.{ts,tsx}', 'app/__fixtures__/**'],
    },
  },
  resolve: {
    alias: {
      '~app': resolve(import.meta.dirname, './app'),
      '~': resolve(import.meta.dirname, './'),
    },
  },
});
