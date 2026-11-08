import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `history.replaceState` / `pushState` NUNCA CON `null` COMO PRIMER ARGUMENTO (2026-11-07).
 *
 * ⚠️ **Es el Critical de la Tarea 3, y se arreglo sin red.** `Catalogo.tsx` hacia
 * `window.history.replaceState(null, '', nueva)` para reflejar los filtros en la URL. En
 * esa entrada de historia vive el estado del router de `astro:transitions`
 * (`{index, scrollX, scrollY}`), y su `onPopState` arranca con
 * `if (ev.state === null) return`: pisarlo con `null` deja la entrada **muda**, asi que
 * el boton ATRAS cambia la barra de direcciones y **NO cambia la pantalla**.
 *
 * Y es invisible: compila, el build sale verde y la URL se sigue actualizando bien. Lo
 * unico que se rompe es ATRAS, que nadie prueba al escribir un filtro. Lo correcto es
 * **reusar** el estado que ya hay: `window.history.replaceState(window.history.state, …)`.
 *
 * Esta prueba usa la tecnica de archivo que ya existe en el repo
 * (`scripts-recableados.spec.ts`), y caza el 100 % de las reincidencias de esta forma:
 * un `null` literal en el primer argumento. No caza pasar una variable que valga `null`
 * en tiempo de ejecucion — para eso hace falta ejecutar, y aca los tests corren en
 * `environment: node`.
 */

const RAIZ = join(__dirname, '..');
const EXTENSIONES = ['.ts', '.tsx', '.astro', '.js', '.jsx', '.mjs'];

/** Todos los archivos de codigo de `src/`, recursivo. */
function archivos(dir: string): string[] {
  const encontrados: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) encontrados.push(...archivos(ruta));
    else if (EXTENSIONES.some((e) => nombre.endsWith(e))) encontrados.push(ruta);
  }
  return encontrados;
}

/** `replaceState(null` / `pushState(null`, con el espaciado que sea. */
const CON_NULL = /\b(?:replaceState|pushState)\s*\(\s*null\b/;

describe('history.replaceState / pushState nunca con null', () => {
  const todos = archivos(join(RAIZ, 'src')).filter((r) => !r.endsWith('estado-de-historia.spec.ts'));

  it('encuentra archivos para revisar (si no, la prueba no prueba nada)', () => {
    expect(todos.length).toBeGreaterThan(20);
  });

  it('ningun archivo de src/ pisa el estado de historia con null', () => {
    const culpables = todos.filter((ruta) => CON_NULL.test(readFileSync(ruta, 'utf8')));
    expect(
      culpables.map((r) => relative(RAIZ, r)),
      'En el estado de historia vive el del router de astro:transitions ' +
        '({index, scrollX, scrollY}) y su onPopState ignora las entradas con estado null: ' +
        'el boton ATRAS cambia la URL y NO la pantalla. Reusalo: ' +
        'window.history.replaceState(window.history.state, "", nueva).',
    ).toEqual([]);
  });
});
