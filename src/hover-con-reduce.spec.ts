import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * TODO `:hover` QUE MUEVA ALGO TIENE QUE ANULARSE EN LA GUARDIA DE `reduce` (2026-11-07).
 *
 * ⚠️ **La guardia de `prefers-reduced-motion` de `global.css` solo mata DURACIONES**
 * (`animation-duration`, `transition-duration`). Un `transform` de `:hover` no es una
 * duración: con `reduce` el estado se aplica **entero y de un frame**, o sea el «salto
 * sin interpolación» que es justamente lo que se decidió evitar — los 4px de la tarjeta
 * y el 10% del selector de color existen PARA sentirse suaves.
 *
 * Esto se arregló tres veces a mano (`.product`, `.product-photo`, y después
 * `.color-pick` y `.btn-wa`, que se habían quedado afuera). Tres excepciones escritas a
 * mano no son una política: el cuarto `:hover` con `transform` nace descubierto y nadie
 * se enteraría, porque **no falla nada** — compila, el build sale verde y lo único que
 * pasa es que quien pidió menos movimiento recibe un salto.
 *
 * Esta prueba lee `global.css` y exige, para cada selector `:hover` que declare
 * `transform`, una regla que lo anule dentro de un
 * `@media (prefers-reduced-motion: reduce)`. Usa la técnica de archivo que ya existe en
 * el repo (`scripts-recableados.spec.ts`): los tests corren en `environment: node`, sin
 * DOM, así que se mide el TEXTO del CSS y no el CSSOM.
 *
 * Lo que NO caza, escrito acá para el próximo:
 *  - `:hover` con `transform` en un `.tsx` (estilos en línea o clases de Tailwind):
 *    solo mira `global.css`.
 *  - otras propiedades que mueven sin ser `transform` (`top`, `left`, `translate`,
 *    `margin`): se agregan a `MUEVEN` si alguna vez se usan.
 *  - que la anulación esté en el MISMO contexto de media que la regla original: se pide
 *    que exista dentro de la guardia, no que los anchos coincidan. Hoy la guardia no
 *    tiene condición de ancho, así que alcanza.
 */

const RUTA = join(__dirname, 'styles', 'global.css');

/** Propiedades que DESPLAZAN el elemento (las que la guardia de duraciones no alcanza). */
const MUEVEN = ['transform'];

/** El CSS sin comentarios: un comentario que menciona `transform` no es una regla. */
function sinComentarios(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/**
 * Los bloques `@media (prefers-reduced-motion: reduce) { ... }` del archivo, con las
 * llaves balanceadas (un `@media` contiene reglas, así que no sirve una regex simple).
 */
function bloquesDeLaGuardia(css: string): { texto: string; desde: number; hasta: number }[] {
  const bloques: { texto: string; desde: number; hasta: number }[] = [];
  const re = /@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/g;
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
 * Las reglas (selector + cuerpo) del CSS. La regex se salta sola los envoltorios
 * `@media`/`@layer`: `[^{}]+` no puede contener `{`, así que nunca casa con uno.
 */
function reglas(css: string): { selector: string; cuerpo: string }[] {
  const encontradas: { selector: string; cuerpo: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    encontradas.push({ selector: normalizar(m[1]), cuerpo: m[2] });
  }
  return encontradas;
}

/** `transform: ...` como PROPIEDAD. Descarta `text-transform` y `transition: transform …`. */
const declara = (cuerpo: string, prop: string) =>
  new RegExp(`(^|[;{\\s])${prop}\\s*:`).test(cuerpo);

const css = sinComentarios(readFileSync(RUTA, 'utf8'));
const guardias = bloquesDeLaGuardia(css);
/** El archivo SIN los bloques de la guardia: ahí viven los `:hover` que hay que cubrir. */
const fueraDeLaGuardia = guardias
  .slice()
  .reverse()
  .reduce((texto, b) => texto.slice(0, b.desde) + texto.slice(b.hasta), css);

describe('política: un :hover que mueve se anula con prefers-reduced-motion', () => {
  it('encuentra la guardia y reglas para revisar (si no, la prueba no prueba nada)', () => {
    expect(guardias.length).toBeGreaterThan(0);
    expect(reglas(fueraDeLaGuardia).length).toBeGreaterThan(50);
  });

  it('cada :hover que declara transform tiene su anulación dentro de la guardia', () => {
    const textoDeLaGuardia = guardias.map((b) => b.texto).join('\n');
    const anulados = new Set<string>();
    for (const { selector, cuerpo } of reglas(textoDeLaGuardia)) {
      for (const prop of MUEVEN) {
        if (!new RegExp(`${prop}\\s*:\\s*none`).test(cuerpo)) continue;
        for (const uno of selector.split(',')) anulados.add(normalizar(uno));
      }
    }

    const descubiertos: string[] = [];
    for (const { selector, cuerpo } of reglas(fueraDeLaGuardia)) {
      if (!MUEVEN.some((p) => declara(cuerpo, p))) continue;
      for (const uno of selector.split(',').map(normalizar)) {
        if (!uno.includes(':hover')) continue;
        if (!anulados.has(uno)) descubiertos.push(uno);
      }
    }

    expect(
      descubiertos,
      'La guardia de `reduce` solo mata DURACIONES: un `transform` de :hover se aplica ' +
        'igual, entero y de un frame — el salto sin interpolación que se decidió evitar. ' +
        'Agregá el selector al bloque `@media (prefers-reduced-motion: reduce)` con ' +
        '`transform: none` (ver `.product:hover` en global.css).',
    ).toEqual([]);
  });

  it('los :hover que mueven viven dentro de @media (hover: hover)', () => {
    // Hermano del anterior y del mismo defecto: en un teléfono, un :hover que desplaza
    // queda PEGADO tras tocar. Es el caso que se escapó en `.color-pick` y `.btn-wa`.
    const fuera: string[] = [];
    const re = /@media[^{]*\(\s*hover\s*:\s*hover\s*\)[^{]*\{/g;
    const rangos: [number, number][] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(fueraDeLaGuardia)) !== null) {
      let i = m.index + m[0].length;
      let nivel = 1;
      while (i < fueraDeLaGuardia.length && nivel > 0) {
        if (fueraDeLaGuardia[i] === '{') nivel++;
        else if (fueraDeLaGuardia[i] === '}') nivel--;
        i++;
      }
      rangos.push([m.index, i]);
    }
    expect(rangos.length, 'tiene que haber al menos un @media (hover: hover)').toBeGreaterThan(0);

    const re2 = /([^{}]+)\{([^{}]*)\}/g;
    let r: RegExpExecArray | null;
    while ((r = re2.exec(fueraDeLaGuardia)) !== null) {
      if (!MUEVEN.some((p) => declara(r![2], p))) continue;
      const selectores = normalizar(r[1]).split(',').map(normalizar).filter((s) => s.includes(':hover'));
      if (selectores.length === 0) continue;
      const dentro = rangos.some(([a, b]) => r!.index > a && r!.index < b);
      if (!dentro) fuera.push(...selectores);
    }

    expect(
      fuera,
      'En un teléfono el :hover se queda pegado tras tocar, y un :hover que DESPLAZA ' +
        'deja el elemento movido de forma permanente. Metelo en @media (hover: hover) ' +
        '(ver `.product:hover` en global.css).',
    ).toEqual([]);
  });
});
