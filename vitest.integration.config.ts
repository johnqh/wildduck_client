import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Integration tests run in Node environment
    include: ['**/*.integration.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
    ],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000,
    // Run integration tests sequentially to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
