import { defineConfig } from 'vitest/config';

const fromEnv = process.env.BLASTER_MASTER_BASE?.trim();
const base =
  fromEnv && fromEnv.length > 0
    ? fromEnv.endsWith('/')
      ? fromEnv
      : `${fromEnv}/`
    : '/';

export default defineConfig({
  root: '.',
  base,
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: false,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
