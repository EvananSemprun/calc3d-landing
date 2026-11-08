import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * TODO `:hover` QUE MUEVA ALGO TIENE QUE ANULARSE EN LA GUARDIA DE `reduce` (2026-11-07).
 *
 * ⚠️ **La guardia de `prefers-reduced-motion` de `global.css` solo mata DURACIONES**
 * (`animation-duration`, `transition-duration`) y retardos. Un `transform` de `:hover` no
 * es una duración: con `reduce` el estado se aplica **entero y de un frame**, o sea el
 * «salto sin interpolación» que es justamente lo que se decidió evitar — los 4px de la
 * tarjeta y el 10% del selector de color existen PARA sentirse suaves.
 *
 * Esto se arregló tres veces a mano (`.product`, `.product-photo`, y después
 * `.color-pick` y `.btn-wa`, que se habían quedado afuera). Tres excepciones escritas a
 * mano no son una política: el cuarto `:hover` que mueva nace descubierto y nadie se
 * enteraría, porque **no falla nada** — compila, el build sale verde y lo único que pasa
 * es que quien pidió menos movimiento recibe un salto.
 *
 * Esta prueba lee `global.css` y exige, para cada selector `:hover` que declare una
 * propiedad que DESPLAZA, una regla que la anule dentro de un
 * `@media (prefers-reduced-motion: reduce)`; y además que viva dentro de
 * `@media (hover: hover)`, porque en un teléfono el `:hover` se queda pegado tras tocar y
 * uno que desplaza deja el elemento movido de forma permanente. Usa la técnica de archivo
 * que ya existe en el repo (`scripts-recableados.spec.ts`): los tests corren en
 * `environment: node`, sin DOM, así que se mide el TEXTO del CSS y no el CSSOM.
 *
 * **Las propiedades vigiladas son CUATRO**, no solo `transform`: las individuales
 * `translate`, `scale` y `rotate` desplazan igual y son fáciles de escribir sin pensar
 * (`translate: 0 -2px` se le escapaba a la primera versión de esta prueba, verificado).
 *
 * **El valor `none` no cuenta como movimiento**: un `:hover { transform: none }` es una
 * ANULACIÓN legítima (apagar un transform heredado), y tratarlo como movimiento daba un
 * falso rojo cuyo mensaje mandaba a hacer algo que ahí no tiene sentido.
 *
 * Lo que NO caza, escrito acá para el próximo:
 *  - `:hover` con movimiento en un `.tsx` (estilos en línea o clases de Tailwind): solo
 *    mira `global.css`.
 *  - ⚠️ **el anidamiento `&:hover`**: la prueba lee selectores planos, así que un
 *    `.algo { &:hover { transform: … } }` le daría un falso rojo (el selector que
 *    extraería es `&:hover`, que no está en la guardia). Hoy `global.css` no usa
 *    anidamiento en ningún lado; si se empieza a usar, hay que resolver el `&` acá.
 *  - que la anulación esté en el MISMO contexto de media que la regla original: se pide
 *    que exista dentro de la guardia, no que los anchos coincidan. Hoy la guardia no
 *    tiene condición de ancho, así que alcanza.
 */

const RUTA = join(__dirname, 'styles', 'global.css');

/** Propiedades que DESPLAZAN el elemento (las que la guardia de duraciones no alcanza). */
const MUEVEN = ['transform', 'translate', 'scale', 'rotate'] as const;

/** El CSS sin comentarios: un comentario que menciona `transform` no es una regla. */
function sinComentarios(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/**
 * Los bloques `@media (prefers-reduced-motion: reduce) { ... }` del archivo, con las
 * llaves balanceadas (un `@media` contiene reglas, así que no sirve una regex simple).
 */
function bloquesBalanceados(css: string, cabecera: RegExp): { texto: string; desde: number; hasta: number }[] {
  const bloques: { texto: string; desde: number; hasta: number }[] = [];
  const re = new RegExp(cabecera.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    let i = m.index + m[0].length;
    let nivel = 1;
    while (i < css.length && nivel > 0) {
      if (css[i] === '{') nivel++;
      else if (css[i] === '}') nivel--;
      i++;
    }
    bloques.push({ texto: css.slice(m.index, i), desde: m.index, hasta: i });
  }
  return bloques;
}

/** Espacios normalizados, para comparar selectores escritos distinto. */
const normalizar = (s: string) => s.trim().replace(/\s+/g, ' ');

/**
 * Las reglas (selector + cuerpo) del CSS, con su posición. La regex se salta sola los
 * envoltorios `@media`/`@layer`: `[^{}]+` no puede contener `{`, así que nunca casa con uno.
 */
function reglas(css: string): { selector: string; cuerpo: string; desde: number }[] {
  const encontradas: { selector: string; cuerpo: string; desde: number }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    encontradas.push({ selector: normalizar(m[1]), cuerpo: m[2], desde: m.index });
  }
  return encontradas;
}

/**
 * El valor declarado de una propiedad, o null si no está. Pide `prop:` como PROPIEDAD,
 * así que descarta `text-transform` (lleva `-` antes) y `transition: transform …` (lleva
 * un espacio después, no `:`).
 */
function valorDe(cuerpo: string, prop: string): string | null {
  const m = new RegExp(`(?:^|[;{\\s])${prop}\\s*:([^;}]*)`).exec(cuerpo);
  return m ? m[1].replace(/!important/g, '').trim() : null;
}

/** Las propiedades que esta regla usa para MOVER (un valor `none` no mueve: anula). */
function propiedadesQueMueven(cuerpo: string): string[] {
  return MUEVEN.filter((p) => {
    const v = valorDe(cuerpo, p);
    return v !== null && v !== '' && v !== 'none';
  });
}

/** Las propiedades que esta regla ANULA. */
function propiedadesQueAnulan(cuerpo: string): string[] {
  return MUEVEN.filter((p) => valorDe(cuerpo, p) === 'none');
}

const css = sinComentarios(readFileSync(RUTA, 'utf8'));
const guardias = bloquesBalanceados(css, /@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/);
/** El archivo SIN los bloques de la guardia: ahí viven los `:hover` que hay que cubrir. */
const fueraDeLaGuardia = guardias
  .slice()
  .reverse()
  .reduce((texto, b) => texto.slice(0, b.desde) + texto.slice(b.hasta), css);

/** Los `:hover` que mueven, fuera de la guardia: `[selector, propiedad, posición]`. */
const queMueven = reglas(fueraDeLaGuardia).flatMap(({ selector, cuerpo, desde }) =>
  propiedadesQueMueven(cuerpo).flatMap((prop) =>
    selector
      .split(',')
      .map(normalizar)
      .filter((uno) => uno.includes(':hover'))
      .map((uno) => ({ selector: uno, prop, desde })),
  ),
);

describe('política: un :hover que mueve se anula con prefers-reduced-motion', () => {
  it('encuentra la guardia, reglas y casos reales (si no, la prueba no prueba nada)', () => {
    expect(guardias.length).toBeGreaterThan(0);
    expect(reglas(fueraDeLaGuardia).length).toBeGreaterThan(50);
    expect(queMueven.length).toBeGreaterThan(0);
  });

  it('cada :hover que mueve tiene su anulación dentro de la guardia', () => {
    const anulados = new Set<string>();
    for (const { selector, cuerpo } of reglas(guardias.map((b) => b.texto).join('\n'))) {
      for (const prop of propiedadesQueAnulan(cuerpo)) {
        for (const uno of selector.split(',')) anulados.add(`${normalizar(uno)}|${prop}`);
      }
    }

    const descubiertos = queMueven
      .filter(({ selector, prop }) => !anulados.has(`${selector}|${prop}`))
      .map(({ selector, prop }) => `${selector} (${prop})`);

    expect(
      descubiertos,
      'La guardia de `reduce` solo mata DURACIONES: una propiedad que desplaza se aplica ' +
        'igual, entera y de un frame — el salto sin interpolación que se decidió evitar. ' +
        'Agregá el selector al bloque `@media (prefers-reduced-motion: reduce)` con ' +
        '`<propiedad>: none` (ver `.product:hover` en global.css).',
    ).toEqual([]);
  });

  it('los :hover que mueven viven dentro de @media (hover: hover)', () => {
    // Hermano del anterior y del mismo defecto: en un teléfono, un :hover que desplaza
    // queda PEGADO tras tocar. Es el caso que se escapó en `.color-pick` y `.btn-wa`.
    const conPuntero = bloquesBalanceados(
      fueraDeLaGuardia,
      /@media[^{]*\(\s*hover\s*:\s*hover\s*\)[^{]*\{/,
    );
    expect(conPuntero.length, 'tiene que haber al menos un @media (hover: hover)').toBeGreaterThan(0);

    const fuera = queMueven
      .filter(({ desde }) => !conPuntero.some((b) => desde > b.desde && desde < b.hasta))
      .map(({ selector, prop }) => `${selector} (${prop})`);

    expect(
      fuera,
      'En un teléfono el :hover se queda pegado tras tocar, y un :hover que DESPLAZA ' +
        'deja el elemento movido de forma permanente. Metelo en @media (hover: hover) ' +
        '(ver `.product:hover` en global.css).',
    ).toEqual([]);
  });
});
