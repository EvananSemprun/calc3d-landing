import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Runner de tests de la tienda.
 *
 * ⚠️ **DOS entornos, elegidos por la EXTENSIÓN del archivo** (2026-11-08), igual que en
 * `calc3d-web`:
 *
 * | Archivo      | Entorno | Para qué |
 * |--------------|---------|----------|
 * | `*.spec.ts`  | `node`  | funciones puras de `lib/` (precios, rutas, filtros) |
 * | `*.spec.tsx` | `jsdom` | componentes renderizados (testing-library) |
 *
 * El patrón es la extensión y no una lista de rutas porque una lista hay que acordarse de
 * actualizarla: un spec de componente nuevo que no estuviera en ella correría en `node` y
 * fallaría con "document is not defined".
 *
 * ⚠️ **Por qué hubo que montar esto** (2026-11-08): hasta ese día el repo solo corría
 * `*.spec.ts` en `node`, así que **ni un solo test tocaba el JSX**. Se podía borrar un
 * botón de una tarjeta y los 170 tests seguían en verde. Es la misma lección que ya
 * estaba escrita para el panel: la función pura no alcanza.
 *
 * El alias `@` tiene que decir lo mismo que `tsconfig.json` (`@/* -> ./src/*`); si
 * divergen, un import que anda en el navegador falla en el test o al revés.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    projects: [
      {
        // `extends: true` hereda el alias de arriba en vez de repetirlo.
        extends: true,
        test: { name: 'node', environment: 'node', include: ['src/**/*.spec.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.spec.tsx'],
          setupFiles: ['./src/test/setup-dom.ts'],
        },
      },
    ],
  },
});
