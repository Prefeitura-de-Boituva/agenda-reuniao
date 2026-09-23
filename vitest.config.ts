import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // Resolve o alias "@/" usado pela aplicação (tsconfig paths) também nos testes.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Use the built‑in esbuild transformer (default) to handle TypeScript.
    // No additional setup required.
  },

});