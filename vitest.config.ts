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
 * ⚠️ **Y un TERCER proyecto, `dist`, que `pnpm test` NO corre** (2026-11-09):
 * `src/dist-sin-js.spec.ts` lee el `dist/` construido, así que exige un `pnpm build`
 * previo **y el build le pega a la API**. Atar `pnpm test` —y con él el gancho de
 * pre-push, que hoy tarda segundos— a tener la API arriba y a un build de minutos es lo
 * que entrena el `--no-verify`. Se corre a mano con `pnpm test:dist`, junto con
 * `pnpm check`.
 *
 * Por eso los scripts filtran por proyecto en vez de por ruta:
 * `pnpm test` = `vitest run --project=!dist` y `pnpm test:dist` = `--project=dist`.
 * ⚠️ Excluir el archivo del proyecto `node` **y nada más** no alcanza: entonces ningún
 * proyecto lo incluye y `vitest run <ruta>` responde «No test files found» y sale en
 * **rojo** sin haber mirado nada (probado el 2026-11-09). Un proyecto propio es lo que
 * lo hace ejecutable a demanda.
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
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.spec.ts'],
          // ⚠️ `dist-sin-js.spec.ts` lee `dist/`, así que exige un `pnpm build` previo —
          // y el build le pega a la API. Atar `pnpm test` (y con él el gancho de
          // pre-push, que hoy tarda segundos) a tener la API arriba y a un build de
          // minutos es lo que entrena el `--no-verify`. Se corre aparte con
          // `pnpm test:dist`, a mano, junto con `pnpm check`.
          // No hace falta repetir los `exclude` por defecto (node_modules y compañía):
          // el `include` de arriba solo mira dentro de `src/`.
          exclude: ['src/dist-sin-js.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dist',
          environment: 'node',
          include: ['src/dist-sin-js.spec.ts'],
        },
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
