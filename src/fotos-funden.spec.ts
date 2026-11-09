import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { reglas, reglasCon, sinComentarios } from './test/css';

/**
 * EL CSS DEL FUNDIDO DE LAS FOTOS (2026-11-09).
 *
 * El fundido tiene dos mitades: el JS pone `data-cargando` (`lib/foto.ts`, con sus tests)
 * y el CSS lo convierte en una opacidad que cruza. **La mitad de CSS no la cubre ningún
 * test de pantalla**: jsdom no aplica CSS, así que un `getComputedStyle` en un
 * `*.spec.tsx` daría verde con este bloque borrado. Se mide el TEXTO de `global.css`,
 * como `hover-con-reduce.spec.ts` y `fotos-reservan-espacio.spec.ts`.
 *
 * Tres cosas que, si se tocan, no fallan por ninguna otra parte:
 *
 * 1. **`opacity: 0` en `[data-fundir][data-cargando]`.** Sin eso el fundido simplemente
 *    no existe: las fotos aparecen de golpe, nada se rompe y toda la suite sigue verde.
 * 2. **`transform` en la lista de la transición.** `.product-photo` declara
 *    `transition: transform …` dentro de `@layer components`, y este bloque está FUERA de
 *    capa: `transition` es un atajo, así que una lista con solo `opacity` pisa la de
 *    `transform` y **mata el zoom del hover de la tarjeta en silencio**.
 * 3. **Que el bloque viva FUERA de `@layer`.** Es la regla de este archivo (la guardia de
 *    movimiento y los estilos de sonner están afuera por lo mismo) y lo que evita quedar
 *    a merced del orden de las capas.
 *
 * 4. **La guardia de `prefers-reduced-motion`**, que deja la foto marcada en opacidad 1.
 *    Sin ella, quien pidió no ver movimiento paga la ventana invisible (hasta el `load`,
 *    el `error` o el techo) y **no recibe el cruce a cambio**: pierde sin ganar.
 *
 * Y una quinta, para la Tarea 7: **las duraciones salen de los tokens**
 * (`--dur-normal`, `--dur-lenta`), nunca escritas a mano.
 */

const RUTA = join(__dirname, 'styles', 'global.css');

/** El parser vive en `test/css.ts`: una sola definición para los tres guardianes de CSS. */
const TODAS = reglas(sinComentarios(readFileSync(RUTA, 'utf8')));

const SEL_TRANSICION = 'img[data-fundir]';
const SEL_ESCONDIDA = 'img[data-fundir][data-cargando]';

/** Todas las reglas que apuntan a `sel`, esté donde esté. */
const reglaDe = (sel: string) => reglasCon(TODAS, sel);

/**
 * Las que están sueltas, sin ningún `@media` encima: el comportamiento por defecto.
 * ⚠️ Hace falta distinguirlas porque `SEL_ESCONDIDA` se declara DOS veces (opacidad 0 por
 * defecto, opacidad 1 con `reduce`) y confundirlas dejaría pasar que falte cualquiera.
 */
const sueltas = (sel: string) => reglaDe(sel).filter((r) => r.envoltorios.length === 0);

/** Las que viven dentro de la guardia de `prefers-reduced-motion`. */
const conReduce = (sel: string) =>
  reglaDe(sel).filter((r) => r.envoltorios.some((e) => /prefers-reduced-motion/.test(e)));

describe('el CSS del fundido de las fotos', () => {
  it.each([SEL_TRANSICION, SEL_ESCONDIDA])('existe la regla `%s`', (sel) => {
    expect(
      sueltas(sel).length,
      `No encontré la regla \`${sel}\` en global.css. Sin ella el fundido no existe y ` +
        'nada más falla: las fotos aparecen de golpe con toda la suite en verde.',
    ).toBe(1);
  });

  it.each([SEL_TRANSICION, SEL_ESCONDIDA])('`%s` vive FUERA de `@layer`', (sel) => {
    const capas = reglaDe(sel).flatMap((r) => r.envoltorios.filter((e) => e.startsWith('@layer')));
    expect(
      capas,
      `\`${sel}\` quedó dentro de ${capas.join(' > ')}. Este bloque va al final de ` +
        'global.css y fuera de capa, como la guardia de movimiento y los estilos de ' +
        'sonner: lo que no está en una capa le gana a las capas.',
    ).toEqual([]);
  });

  it('la foto marcada como «no cargada» queda en opacidad 0', () => {
    expect(sueltas(SEL_ESCONDIDA)[0]?.cuerpo).toMatch(/opacity:\s*0\s*(?:;|$)/);
  });

  it('con `prefers-reduced-motion` la foto marcada queda VISIBLE', () => {
    // Quien pide menos movimiento no pierde nada: sin esta regla paga la ventana
    // invisible (la guardia de movimiento solo baja la DURACIÓN, no el valor inicial) y
    // no recibe el cruce a cambio.
    const r = conReduce(SEL_ESCONDIDA);
    expect(
      r.length,
      'Falta la regla de `img[data-fundir][data-cargando]` dentro de ' +
        '`@media (prefers-reduced-motion: reduce)`: con `reduce`, la foto se esconde ' +
        'igual y el cruce no se ve, así que quien pidió no ver movimiento pierde sin ganar.',
    ).toBe(1);
    expect(r[0]?.cuerpo).toMatch(/opacity:\s*1\s*(?:;|$)/);
  });

  it('la transición funde la OPACIDAD con los tokens de movimiento', () => {
    const cuerpo = sueltas(SEL_TRANSICION)[0]?.cuerpo ?? '';
    expect(cuerpo).toMatch(/transition:[^;]*\bopacity\s+var\(--dur-normal\)\s+var\(--ease\)/);
  });

  it('la transición NO se come la de `transform`, que es el zoom del hover', () => {
    // `.product-photo` declara `transition: transform …` en `@layer components`, y
    // `transition` es un atajo: una lista sin `transform` acá la PISA (este bloque está
    // fuera de capa) y el zoom del hover muere sin que nada falle.
    const cuerpo = sueltas(SEL_TRANSICION)[0]?.cuerpo ?? '';
    expect(
      /transition:[^;]*\btransform\s+var\(--dur-lenta\)\s+var\(--ease\)/.test(cuerpo),
      'La transición de `img[data-fundir]` no lista `transform`. Al estar fuera de ' +
        '`@layer`, pisa la de `.product-photo` (`@layer components`) y el zoom del hover ' +
        'de la tarjeta deja de animarse en silencio.',
    ).toBe(true);
  });

  it('no usa `!important`, o la guardia de `reduce` perdería', () => {
    // Para los `!important` el orden de las capas se INVIERTE: lo que está fuera de capa
    // queda ÚLTIMO, así que un `!important` acá le ganaría a la guardia de
    // `prefers-reduced-motion`, que también vive fuera de capa.
    for (const sel of [SEL_TRANSICION, SEL_ESCONDIDA]) {
      expect(reglaDe(sel)[0]?.cuerpo ?? '', `\`${sel}\` usa !important`).not.toMatch(/!important/);
    }
  });
});
