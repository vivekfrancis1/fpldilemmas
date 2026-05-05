import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@assets': path.resolve(import.meta.dirname, 'attached_assets'),
    },
  },
  define: {
    'process.env.NODE_ENV': '"development"',
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.component.test.tsx', 'tests/**/*.component.test.ts'],
    globals: true,
    setupFiles: ['tests/setup-component.ts'],
    testTimeout: 30000,
  },
});
