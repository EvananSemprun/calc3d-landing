import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bloques, bloquesAt, sinComentarios } from './test/css';

/**
 * EL CSS DEL CRUCE DEL REFRESCO EN VIVO (2026-11-09).
 *
 * El cruce tiene dos mitades: `useCruce` / `<Cruce>` marcan el elemento cuyo dato cambió
 * (`components/ui/Cruce.tsx`, con sus tests de pantalla) y el CSS convierte esa marca en
 * un fundido. **La mitad de CSS no la cubre ningún test de pantalla**: jsdom no aplica
 * CSS, así que un `getComputedStyle` en un `*.spec.tsx` daría verde con este bloque
 * borrado y el precio seguiría cambiando de golpe. Se mide el TEXTO de `global.css`, como
 * `fotos-funden.spec.ts` y `hover-con-reduce.spec.ts`, con el parser compartido de
 * `test/css.ts`.
 *
 * Lo que se amarra acá, y por qué cada cosa:
 *
 * 1. **Que las reglas existan y vivan FUERA de `@layer`.** Dentro de una capa quedan a
 *    merced del orden de `@layer components`.
 * 2. **Que el movimiento salga de los TOKENS** (`--dur-normal`, `--ease`): el techo del
 *    plan es `--dur-lenta` y un número escrito a mano se lo salta sin que nada falle.
 * 3. **Que sea una `animation` y no una `transition`.** Dos razones, las dos medidas:
 *    una transición de 0 a 1 obliga a declarar la opacidad 0 **en reposo**, y la guardia
 *    de `prefers-reduced-motion` solo mata DURACIONES — quien pidió menos movimiento se
 *    quedaría esperando una transición para ver el dato; y `transition` es un atajo que,
 *    fuera de capa, pisa las transiciones encapadas de sus propios blancos (una insignia
 *    es el `Badge` de shadcn, que trae `transition-[color,box-shadow]`).
 * 4. **Que el `opacity: 0` viva SOLO dentro del keyframe.** Es el corolario del punto
 *    anterior y lo que hace que el peor caso sea «aparece de golpe» y nunca «no se ve».
 * 5. **Que los dos keyframes tengan nombres DISTINTOS.** Una animación no se reinicia si
 *    su `animation-name` no cambia: con un solo nombre, un segundo cambio del mismo dato
 *    no cruzaría.
 * 6. **Que con `prefers-reduced-motion` el cruce no corra en absoluto.** Medido el
 *    2026-11-09: con solo la guardia global (que baja la duración a `0.01ms`) el dato
 *    quedaba invisible 3 cuadros, porque el keyframe arranca en opacidad 0 y el navegador
 *    necesita un cuadro para salir de ahí. Quien pidió no ver movimiento recibía un
 *    destello y ningún cruce a cambio.
 * 7. **Que no haya `!important`**, o la guardia de `reduce` (que vive fuera de capa)
 *    perdería.
 */

const RUTA = join(__dirname, 'styles', 'global.css');
const CSS = sinComentarios(readFileSync(RUTA, 'utf8'));
const TODOS = bloques(CSS);
const TODAS = TODOS.filter((b) => !b.at);

/** Las dos marcas que alterna `useCruce` para que cada cambio estrene `animation-name`. */
const MARCAS = ["[data-cruce='1']", "[data-cruce='2']"] as const;

const reglaDe = (sel: string) => TODAS.filter((r) => r.selectores.includes(sel));

/** El nombre de keyframe que usa la regla de una marca. */
const animacionDe = (sel: string) =>
  /animation:\s*([\w-]+)\s/.exec(reglaDe(sel)[0]?.cuerpo ?? '')?.[1];

describe('el CSS del cruce del refresco en vivo', () => {
  it.each(MARCAS)('existe la regla `%s`', (sel) => {
    expect(
      reglaDe(sel).length,
      `No encontré la regla \`${sel}\` en global.css. Sin ella el cruce no existe y nada ` +
        'más falla: el precio corregido vuelve a aparecer de golpe con toda la suite en verde.',
    ).toBe(1);
  });

  it.each(MARCAS)('`%s` vive FUERA de `@layer`', (sel) => {
    const capas = reglaDe(sel).flatMap((r) => r.envoltorios.filter((e) => e.startsWith('@layer')));
    expect(
      capas,
      `\`${sel}\` quedó dentro de ${capas.join(' > ')}. Este bloque va al final de ` +
        'global.css y fuera de capa, como la guardia de movimiento, los estilos de sonner ' +
        'y el fundido de las fotos: lo que no está en una capa le gana a las capas.',
    ).toEqual([]);
  });

  it.each(MARCAS)('`%s` saca la duración y la curva de los tokens', (sel) => {
    expect(
      reglaDe(sel)[0]?.cuerpo ?? '',
      'El movimiento del cruce tiene que salir de `--dur-normal` y `--ease`. Un número ' +
        'escrito a mano se salta el techo del plan (`--dur-lenta`) sin que nada falle.',
    ).toMatch(/animation:\s*[\w-]+\s+var\(--dur-normal\)\s+var\(--ease\)/);
  });

  it('el cruce es una `animation`, NO una `transition`', () => {
    // Dos razones medidas, y la primera es la que importa:
    // - una transición de 0 a 1 exige declarar `opacity: 0` en reposo, y la guardia de
    //   `prefers-reduced-motion` solo mata DURACIONES: quien pidió menos movimiento
    //   quedaría esperando una transición para ver el dato;
    // - `transition` es un atajo y este bloque está FUERA de capa, así que pisaría las
    //   transiciones encapadas de sus blancos (el `Badge` de shadcn trae
    //   `transition-[color,box-shadow]` para su anillo de foco). La lista a mantener no
    //   tendría fin, porque los blancos del cruce son elementos cualesquiera.
    for (const sel of MARCAS) {
      expect(reglaDe(sel)[0]?.cuerpo ?? '', `\`${sel}\` declara una transición`).not.toMatch(
        /transition/,
      );
    }
  });

  it('ninguna regla del cruce deja el dato en opacidad 0 EN REPOSO', () => {
    // El `opacity: 0` vive solo dentro del keyframe. Así, con `reduce` (donde la
    // animación dura 0.01ms) o con este bloque borrado, el peor caso es «aparece de
    // golpe» y nunca «no se ve»: es el agujero que en las fotos hubo que tapar con un
    // techo por tiempo y una regla aparte para `reduce`.
    const enReposo = TODAS.filter((r) => r.selector.includes('data-cruce'));
    expect(enReposo.length).toBeGreaterThan(0);
    for (const r of enReposo) {
      expect(
        r.cuerpo,
        `\`${r.selector}\` declara opacidad 0 en reposo. La guardia de ` +
          '`prefers-reduced-motion` no toca los valores iniciales, así que quien pidió ' +
          'menos movimiento se queda sin ver el dato.',
      ).not.toMatch(/opacity:\s*0\s*(?:;|$)/);
    }
  });

  it('cada marca tiene su PROPIO keyframe, y arranca en opacidad 0', () => {
    const nombres = MARCAS.map(animacionDe);
    expect(nombres.every(Boolean), 'Alguna marca no nombra ninguna animación').toBe(true);
    expect(
      new Set(nombres).size,
      'Las dos marcas usan el mismo `animation-name`. Una animación de CSS no se ' +
        'reinicia si el nombre no cambia: el segundo cambio del mismo dato no cruzaría, ' +
        'y el defecto es invisible (`useEnVivo` pide una sola vez, así que casi nunca se ' +
        'notaría).',
    ).toBe(MARCAS.length);

    const declarados = bloquesAt(TODOS, '@keyframes').map((b) => b.selector);
    for (const nombre of nombres) {
      expect(declarados, `No hay @keyframes para \`${nombre}\``).toContain(`@keyframes ${nombre}`);
      const inicio = TODAS.find(
        (r) => r.envoltorios.includes(`@keyframes ${nombre}`) && r.selector === 'from',
      );
      expect(
        inicio?.cuerpo ?? '',
        `\`@keyframes ${nombre}\` no arranca en opacidad 0: sin eso no hay cruce, y nada ` +
          'más falla.',
      ).toMatch(/opacity:\s*0\s*(?:;|$)/);
    }
  });

  it('con `prefers-reduced-motion` el cruce NO corre', () => {
    // Medido el 2026-11-09: sin esta regla, con `reduce` el dato quedaba invisible 3
    // cuadros (~50 ms). La guardia global baja la duración a `0.01ms` pero el keyframe
    // igual arranca en opacidad 0, y el navegador necesita un cuadro para salir de ahí:
    // quien pidió no ver movimiento recibía un destello y ningún cruce a cambio.
    const conReduce = TODAS.filter(
      (r) =>
        r.selector.includes('data-cruce') &&
        r.envoltorios.some((e) => /prefers-reduced-motion/.test(e)),
    );
    expect(
      conReduce.length,
      'Falta la regla de `[data-cruce]` dentro de ' +
        '`@media (prefers-reduced-motion: reduce)`. Sin ella, quien pidió no ver ' +
        'movimiento ve el dato desaparecer unos cuadros: pierde sin ganar.',
    ).toBe(1);
    expect(conReduce[0]?.cuerpo).toMatch(/animation:\s*none/);

    // ⚠️ **Y que exista no alcanza: esta guardia gana SOLO POR ORDEN.** Las tres reglas
    // pesan lo mismo (`[data-cruce]` y `[data-cruce='1']` son 0,1,0 las dos: una clase y
    // un atributo suman en la misma columna), así que lo único que la pone por encima es
    // estar fuera de capa y venir DESPUÉS. Moverla a un `@layer`, o unas líneas más
    // arriba, devuelve el destello de 3 cuadros **sin que nada falle**.
    expect(
      conReduce[0]?.envoltorios.filter((e) => e.startsWith('@layer')),
      'La guardia de `reduce` del cruce quedó dentro de un `@layer`. Las reglas del ' +
        'cruce están fuera de capa, y lo que no está en una capa le gana a las capas: ' +
        'encapada, la guardia pierde y el destello vuelve.',
    ).toEqual([]);

    const guardia = conReduce[0]?.desde ?? -1;
    for (const sel of MARCAS) {
      expect(
        guardia,
        `La guardia de \`reduce\` está ANTES de \`${sel}\` en el archivo. Con la misma ` +
          'especificidad gana la última: así escrita, la marca le pisa la guardia y, con ' +
          '`reduce`, el dato vuelve a desaparecer unos cuadros.',
      ).toBeGreaterThan(reglaDe(sel)[0]?.desde ?? Infinity);
    }
  });

  it('no usa `!important`, o la guardia de `reduce` perdería', () => {
    // Para los `!important` el orden de las capas se INVIERTE: lo que está fuera de capa
    // queda ÚLTIMO, así que uno acá le ganaría a la guardia de `prefers-reduced-motion`,
    // que también vive fuera de capa.
    for (const sel of MARCAS) {
      expect(reglaDe(sel)[0]?.cuerpo ?? '', `\`${sel}\` usa !important`).not.toMatch(/!important/);
    }
  });
});
