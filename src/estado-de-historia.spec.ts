import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `history.replaceState` / `pushState` TIENEN QUE PRESERVAR EL ESTADO DEL ROUTER
 * (2026-11-07).
 *
 * ⚠️ **Es el Critical de la Tarea 3, y se arregló sin red.** `Catalogo.tsx` hacía
 * `window.history.replaceState(null, '', nueva)` para reflejar los filtros en la URL. En
 * esa entrada de historia vive el estado del router de `astro:transitions`
 * (`{index, scrollX, scrollY}`), y su `onPopState` arranca con
 * `if (ev.state === null) return`: pisarlo con `null` deja la entrada **muda**, así que
 * el botón ATRÁS cambia la barra de direcciones y **NO cambia la pantalla**.
 *
 * Y es invisible: compila, el build sale verde y la URL se sigue actualizando bien. Lo
 * único que se rompe es ATRÁS, que nadie prueba al escribir un filtro.
 *
 * ⚠️ **PROHIBIR SOLO `null` NO ALCANZA, y las otras formas rompen PEOR.** Medido:
 *  - `replaceState(undefined, …)` deja `history.state` en `undefined`. El
 *    `if (ev.state === null)` del router **no corta** (`undefined !== null`), sigue
 *    adelante y revienta con `TypeError: Cannot read properties of undefined (reading
 *    'index')`. O sea: de fallo silencioso pasa a excepción en cada ATRÁS.
 *  - `replaceState({}, …)`, o cualquier objeto sin las claves del router, pasa el
 *    `=== null`, llega a `state.index` → `undefined`, y la dirección y el índice de
 *    historia quedan basura.
 *
 * Por eso lo que se exige acá no es «que no sea `null`» sino el invariante real:
 * **el primer argumento tiene que SER el estado que ya hay**, o un objeto que lo
 * extienda. Formas aceptadas:
 *   `replaceState(window.history.state, …)` · `replaceState(history.state, …)`
 *   `replaceState({ ...window.history.state, foo }, …)` · `{ ...history.state }`
 *
 * No caza pasar una variable que en tiempo de ejecución valga `null` (haría falta
 * ejecutar, y acá los tests corren en `environment: node`, sin DOM). A cambio, esa forma
 * tampoco se escribe por descuido: el descuido es el literal.
 */

const RAIZ = join(__dirname, '..');
const EXTENSIONES = ['.ts', '.tsx', '.astro', '.js', '.jsx', '.mjs'];

/** Todos los archivos de código de `src/`, recursivo. */
function archivos(dir: string): string[] {
  const encontrados: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) encontrados.push(...archivos(ruta));
    else if (EXTENSIONES.some((e) => nombre.endsWith(e))) encontrados.push(ruta);
  }
  return encontrados;
}

/** Cada llamada a `replaceState(` / `pushState(`, con el espaciado que sea. */
const LLAMADA = /\b(?:replaceState|pushState)\s*\(\s*/g;
/** Su primer argumento preserva el estado del router: lo es, o lo extiende con spread. */
const PRESERVA = /^(?:\{\s*\.{3}\s*)?(?:window\s*\.\s*)?history\s*\.\s*state\b/;

/** Los primeros argumentos que NO preservan el estado, tal como están escritos. */
export function primerosArgumentosSospechosos(codigo: string): string[] {
  const malos: string[] = [];
  for (const m of codigo.matchAll(LLAMADA)) {
    const resto = codigo.slice(m.index + m[0].length);
    if (!PRESERVA.test(resto)) malos.push(resto.slice(0, 24).split('\n')[0].trim());
  }
  return malos;
}

describe('history.replaceState / pushState preservan el estado del router', () => {
  const todos = archivos(join(RAIZ, 'src')).filter((r) => !r.endsWith('estado-de-historia.spec.ts'));

  it('encuentra archivos para revisar (si no, la prueba no prueba nada)', () => {
    expect(todos.length).toBeGreaterThan(20);
  });

  // Guardia de la guardia: que el matcher acepte las formas buenas y rechace las malas.
  // Sin esto, un matcher roto (demasiado permisivo) dejaría la prueba en verde por vacía.
  it('el matcher acepta las formas que preservan y rechaza las que no', () => {
    const buenas = [
      "history.replaceState(window.history.state, '', u)",
      "history.replaceState(history.state, '', u)",
      "window.history.pushState({ ...window.history.state, p: 1 }, '', u)",
      'history.replaceState({ ...history.state }, "", u)',
      'history.replaceState(\n  window.history.state,\n  "",\n  u,\n)',
    ];
    const malas = [
      "history.replaceState(null, '', u)",
      "history.replaceState(undefined, '', u)",
      "history.replaceState({}, '', u)",
      "history.replaceState({ p: 1 }, '', u)",
      "history.pushState(null, '', u)",
      "history.replaceState(estadoPropio, '', u)",
    ];
    expect(buenas.filter((c) => primerosArgumentosSospechosos(c).length > 0)).toEqual([]);
    expect(malas.filter((c) => primerosArgumentosSospechosos(c).length === 0)).toEqual([]);
  });

  it('ningún archivo de src/ pisa el estado de historia', () => {
    const culpables = todos
      .map((ruta) => ({ ruta, malos: primerosArgumentosSospechosos(readFileSync(ruta, 'utf8')) }))
      .filter(({ malos }) => malos.length > 0);

    expect(
      culpables.map(({ ruta, malos }) => `${relative(RAIZ, ruta)}: ${malos.join(' | ')}`),
      'En el estado de historia vive el del router de astro:transitions ' +
        '({index, scrollX, scrollY}). Con `null` su onPopState ignora la entrada y el ' +
        'botón ATRÁS cambia la URL sin cambiar la pantalla; con `undefined` o un objeto ' +
        'ajeno NO la ignora y revienta leyendo `state.index`. Preservalo: ' +
        'window.history.replaceState(window.history.state, "", nueva), o ' +
        '{ ...window.history.state, … } si hace falta agregarle algo.',
    ).toEqual([]);
  });
});
