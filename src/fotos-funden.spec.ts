import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
 * Y una cuarta, para la Tarea 7: **las duraciones salen de los tokens**
 * (`--dur-normal`, `--dur-lenta`), nunca escritas a mano.
 */

const RUTA = join(__dirname, 'styles', 'global.css');

/** El CSS sin comentarios: un comentario que menciona la regla no es la regla. */
const css = readFileSync(RUTA, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

const normalizar = (s: string) => s.trim().replace(/\s+/g, ' ');

interface Regla {
  selector: string;
  cuerpo: string;
  /** Los `@…` que la envuelven, de afuera hacia adentro (`@layer components`, `@media …`). */
  envoltorios: string[];
}

/**
 * Las reglas del archivo con el contexto que las envuelve.
 *
 * Hace falta recorrer con una pila y no con una regex porque lo que se quiere saber es si
 * la regla está DENTRO de un `@layer`, y eso solo se sabe contando llaves: un `@layer`
 * contiene reglas, y una regex de `([^{}]+)\{([^{}]*)\}` encuentra la regla pero pierde
 * quién la envuelve.
 */
function reglas(): Regla[] {
  const salida: Regla[] = [];
  const pila: string[] = [];
  let cabeza = '';
  for (const ch of css) {
    if (ch === '{') {
      const sel = normalizar(cabeza);
      cabeza = '';
      if (sel.startsWith('@')) {
        pila.push(sel);
      } else {
        // Una regla normal: lo que sigue hasta su `}` es su cuerpo. Se marca con `null`
        // en la pila para no confundirla con un envoltorio.
        pila.push(`\u0000${sel}`);
      }
    } else if (ch === '}') {
      const abierto = pila.pop();
      if (abierto?.startsWith('\u0000')) {
        salida.push({
          selector: abierto.slice(1),
          cuerpo: normalizar(cabeza),
          envoltorios: pila.filter((p) => !p.startsWith('\u0000')),
        });
      }
      cabeza = '';
    } else {
      cabeza += ch;
    }
  }
  return salida;
}

const todas = reglas();

/** Las reglas cuyo selector es exactamente `sel` (hay una sola de cada una acá). */
const reglaDe = (sel: string) => todas.filter((r) => r.selector === sel);

const SEL_TRANSICION = 'img[data-fundir]';
const SEL_ESCONDIDA = 'img[data-fundir][data-cargando]';

describe('el CSS del fundido de las fotos', () => {
  it.each([SEL_TRANSICION, SEL_ESCONDIDA])('existe la regla `%s`', (sel) => {
    expect(
      reglaDe(sel).length,
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
    expect(reglaDe(SEL_ESCONDIDA)[0]?.cuerpo).toMatch(/opacity:\s*0\s*(?:;|$)/);
  });

  it('la transición funde la OPACIDAD con los tokens de movimiento', () => {
    const cuerpo = reglaDe(SEL_TRANSICION)[0]?.cuerpo ?? '';
    expect(cuerpo).toMatch(/transition:[^;]*\bopacity\s+var\(--dur-normal\)\s+var\(--ease\)/);
  });

  it('la transición NO se come la de `transform`, que es el zoom del hover', () => {
    // `.product-photo` declara `transition: transform …` en `@layer components`, y
    // `transition` es un atajo: una lista sin `transform` acá la PISA (este bloque está
    // fuera de capa) y el zoom del hover muere sin que nada falle.
    const cuerpo = reglaDe(SEL_TRANSICION)[0]?.cuerpo ?? '';
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
