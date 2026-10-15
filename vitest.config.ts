import { defineConfig } from 'vitest/config';

// Toda la lógica de src/lib es pura (sin DOM): alcanza con el entorno node.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
