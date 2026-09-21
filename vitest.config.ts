import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Use the built‑in esbuild transformer (default) to handle TypeScript.
    // No additional setup required.
  },

});