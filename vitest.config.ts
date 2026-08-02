import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@shared': path.resolve(import.meta.dirname, 'shared'),
          },
        },
        test: {
          name: 'unit',
          include: ['tests/**/*.test.ts'],
          testTimeout: 120000,
          hookTimeout: 120000,
          environment: 'node',
          setupFiles: ['tests/setup-env.ts'],
          // These tests share one live dev server with one in-memory adminGoalSettings object
          // (not per-request state). Files that PUT/reset admin settings (goal-calculation-mode,
          // promoted-team-admin-settings) can transiently flip that shared state mid-test; running
          // files in parallel let other files' "cached vs live" comparisons observe that transient
          // state and fail non-deterministically. Sequential execution removes the race entirely.
          fileParallelism: false,
        },
      },
      {
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
          name: 'component',
          include: ['tests/**/*.component.test.tsx', 'tests/**/*.component.test.ts'],
          environment: 'happy-dom',
          globals: true,
          setupFiles: ['tests/setup-component.ts'],
          testTimeout: 30000,
        },
      },
    ],
  },
});
