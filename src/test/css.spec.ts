import { describe, expect, it } from 'vitest';
import { bloques, bloquesAt, reglaDe, reglas, reglasCon, sinComentarios } from './css';

/**
 * El parser de CSS que comparten los tres guardianes de `global.css`
 * (`hover-con-reduce`, `fotos-reservan-espacio`, `fotos-funden`).
 *
 * ⚠️ **Tiene test propio porque ahora es carga compartida.** Antes había tres copias y
 * cada una fallaba sola; ahora, una regla que este parser no vea deja a los **tres**
 * guardianes mirando un archivo más chico del que hay, **en verde**. Es el modo de falla
 * clásico del guardián-que-no-guarda, y el único lugar donde se puede atajar es acá.
 */
describe('el parser de global.css', () => {
  it('devuelve selector, cuerpo y los @ que envuelven cada regla', () => {
    const r = reglas('@layer components { @media (hover: hover) { .a:hover { color: red } } }');
    expect(r).toHaveLength(1);
    expect(r[0].selector).toBe('.a:hover');
    expect(r[0].cuerpo).toBe('color: red');
    expect(r[0].envoltorios).toEqual(['@layer components', '@media (hover: hover)']);
  });

  it('parte la lista de selectores y no devuelve los envoltorios como reglas', () => {
    const r = reglas('@layer base { .a, .b > i { color: red } }');
    expect(r.map((x) => x.selectores)).toEqual([['.a', '.b > i']]);
  });

  it('un at-rule SIN bloque no se come la regla siguiente', () => {
    // La regresión del corte en `;`: acumulando la cabecera hasta el `{`, el selector
    // habría salido `@import "x"; .a` y **la regla desaparecía del resultado**. Los tres
    // guardianes dejarían de verla sin que nada falle.
    const r = reglas('@charset "utf-8";\n@import "x";\n.a { color: red }');
    expect(r.map((x) => x.selector)).toEqual(['.a']);
  });

  it('un at-rule SIN bloque DENTRO de un @layer tampoco se come la regla siguiente', () => {
    // ⚠️ La misma trampa que el caso de arriba, un nivel más abajo, y la protección
    // estuvo a punto de quedar valiendo solo en el nivel de arriba (2026-11-09): si el
    // `;` no corta acá, el selector sale `@import "x"; .a` y **`.a` desaparece** de
    // `reglas()`. Los tres guardianes de `global.css` saldrían VERDES sin haber mirado
    // esa regla, que es exactamente el modo de falla que este archivo viene a atajar.
    const r = reglas('@layer components { @import "x"; .a { color: red } }');
    expect(r.map((x) => x.selector)).toEqual(['.a']);
    expect(r[0].cuerpo).toBe('color: red');
    expect(r[0].envoltorios).toEqual(['@layer components']);
  });

  it('los `;` del cuerpo NO cortan: una regla con varias declaraciones llega entera', () => {
    expect(reglas('.a { color: red; opacity: 0 }')[0].cuerpo).toBe('color: red; opacity: 0');
  });

  it('los `;` de un at-rule de DECLARACIONES tampoco cortan: llega entero', () => {
    // La otra mitad del mismo arreglo: `@font-face` y `@theme` contienen declaraciones, no
    // reglas, así que su cuerpo tiene que llegar completo. Es lo que lee el guardián de
    // fuentes (`src/fuentes.spec.ts`); si el `;` cortara acá, solo vería la última
    // declaración y daría por ausentes los overrides de métrica.
    const cara = bloquesAt(bloques("@font-face { font-family: 'X'; size-adjust: 104% }"), '@font-face');
    expect(cara).toHaveLength(1);
    expect(cara[0].cuerpo).toBe("font-family: 'X'; size-adjust: 104%");
    const tema = bloquesAt(bloques('@theme inline { --a: 1; --b: 2 }'), '@theme');
    expect(tema[0].cuerpo).toBe('--a: 1; --b: 2');
  });

  it('`reglaDe` junta los cuerpos de todas las reglas del mismo selector', () => {
    // Pasa de verdad en `global.css`: `.product-photo` declara la transición en una regla
    // y el `aspect-ratio` en otra.
    const css = '.a { transition: opacity 1ms } .b { color: red } .a { opacity: 0 }';
    expect(reglaDe(reglas(css), '.a')).toBe('transition: opacity 1ms;opacity: 0');
    expect(reglasCon(reglas(css), '.a')).toHaveLength(2);
  });

  it('borra los comentarios: uno que nombra una propiedad no es una declaración', () => {
    expect(reglas(sinComentarios('/* .a { opacity: 0 } */ .b { color: red }'))).toHaveLength(1);
  });
});
