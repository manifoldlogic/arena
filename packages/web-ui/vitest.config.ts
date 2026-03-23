import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@arena/schemas': path.resolve(__dirname, '../schemas/src'),
    },
  },
  test: {
    environment: 'node',
  },
});
