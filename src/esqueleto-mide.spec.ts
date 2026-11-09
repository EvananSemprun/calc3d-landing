import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { reglaDe, reglas, sinComentarios } from './test/css';

/**
 * EL ESQUELETO DE LA FICHA TIENE QUE MEDIR LO QUE MIDE LA FICHA (2026-11-09).
 *
 * El esqueleto del rescate (`components/ficha/EsqueletoFicha.tsx`) existe por una sola
 * razón: **reservar el espacio** que va a ocupar la ficha cuando llegue, para que no
 * aparezca de golpe empujando el pie del sitio. Si sus barras no declaran un alto, el
 * esqueleto se encoge a nada y entrega exactamente el defecto que venía a arreglar —
 * **con todo verde**: `FichaEnVivo.spec.tsx` amarra que las piezas ESTÉN (jsdom no hace
 * layout: `getBoundingClientRect()` devuelve ceros y `getComputedStyle` no aplica el CSS),
 * así que una silueta de altura cero pasa sus tests sin pestañear.
 *
 * Por eso se mide el TEXTO de `global.css`, con el parser compartido de `test/css.ts`,
 * igual que `fotos-reservan-espacio.spec.ts` y `cruce-funde.spec.ts`.
 *
 * ⚠️ **La lista de barras se LEE DEL COMPONENTE, no se escribe acá.** Una barra nueva sin
 * su alto en el CSS tiene que dar rojo sola; una lista a mano hay que acordarse de
 * actualizarla, y nadie se acuerda.
 *
 * El hueco de la galería no está en esta lista a propósito: **reusa `.pdp-main`**, cuyo
 * `aspect-ratio` ya vigila `fotos-reservan-espacio.spec.ts`. Un hueco con clase propia
 * sería un segundo alto que mantener de acuerdo con la foto de verdad.
 *
 * Los altos salen de medir la ficha en `astro preview` (2026-11-09, a 1280×800 y 390×844)
 * y están escritos como la MISMA expresión que los produce (`clamp(…) * line-height`), no
 * como el número medido: así siguen al diseño si mañana cambia la escala tipográfica.
 */

const CSS = sinComentarios(readFileSync(join(__dirname, 'styles', 'global.css'), 'utf8'));
const TODAS = reglas(CSS);

const FUENTE = readFileSync(
  join(__dirname, 'components', 'ficha', 'EsqueletoFicha.tsx'),
  'utf8',
);

/** Las clases `esq-*` que el componente pinta de verdad. */
const BARRAS = [...new Set([...FUENTE.matchAll(/\besq-[a-záéíóúñ-]+/g)].map((m) => m[0]))].sort();

describe('el esqueleto de la ficha reserva el espacio de la ficha', () => {
  it('el componente pinta al menos las cuatro piezas de la ficha', () => {
    // Galería (que va con `.pdp-main`), título, precio y botón: es lo que pide el plan.
    expect(
      BARRAS.length,
      'No encontré clases `esq-*` en EsqueletoFicha.tsx. Si se renombraron, hay que ' +
        'renombrar también acá: este guardián saca la lista del componente.',
    ).toBeGreaterThanOrEqual(4);
  });

  it('la barra del esqueleto se ve (tiene fondo)', () => {
    expect(
      reglaDe(TODAS, '.esqueleto-barra'),
      'Falta la regla `.esqueleto-barra` en global.css. Sin fondo, el esqueleto reserva ' +
        'el espacio pero no se ve nada: la pantalla queda en blanco igual que antes.',
    ).toMatch(/background/);
  });

  it.each(BARRAS)('`.%s` declara un alto, y no es cero', (clase) => {
    const cuerpo = reglaDe(TODAS, `.${clase}`);
    expect(
      cuerpo,
      `\`.${clase}\` se pinta en EsqueletoFicha.tsx y no tiene regla en global.css. Una ` +
        'barra sin alto mide 0: el esqueleto deja de reservar espacio y la ficha vuelve a ' +
        'aparecer de golpe, sin que nada falle.',
    ).toMatch(/height:/);
    expect(
      cuerpo,
      `\`.${clase}\` declara \`height: 0\`. El esqueleto existe para reservar el alto de ` +
        'la ficha; con cero, no reserva nada.',
    ).not.toMatch(/height:\s*0(?:px)?\s*(?:;|$)/);
  });

  it('el esqueleto no mueve nada: ni animación ni transición', () => {
    // Decisión del 2026-11-09, y es deliberada: un esqueleto que late lo hace **en
    // bucle**, y el techo de movimiento del plan es `--dur-lenta` (420 ms). Un ciclo de
    // 420 ms son ~2,4 parpadeos por segundo —territorio de destello, no de «está
    // cargando»— y cualquier ciclo más lento se salta el techo o pide un token nuevo, que
    // el plan prohíbe. Además habría que acordarse de apagarlo con
    // `prefers-reduced-motion`. Un esqueleto quieto ya comunica lo que tiene que
    // comunicar: la forma de lo que viene, en el lugar donde va a estar.
    const delEsqueleto = TODAS.filter((r) =>
      r.selectores.some((s) => /\.esqueleto|\.esq-/.test(s)),
    );
    expect(delEsqueleto.length).toBeGreaterThan(0);
    for (const r of delEsqueleto) {
      expect(
        r.cuerpo,
        `\`${r.selector}\` declara movimiento. Si de verdad hace falta un latido, va con ` +
          'su guardia de `prefers-reduced-motion` y con una duración que respete el techo ' +
          'del plan — y entonces hay que cambiar este test a propósito, no de paso.',
      ).not.toMatch(/animation|transition/);
    }
  });
});
