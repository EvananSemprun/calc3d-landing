/**
 * Guardia: el `<Toaster />` sigue montado en el layout.
 *
 * ⚠️ Éste es el test que atrapa el fallo que NO se ve. `toast()` empuja a un store
 * global que solo se pinta si hay un `<Toaster />` montado en el árbol. Si la isla
 * desaparece de `Base.astro`, cada aviso del sitio se vuelve un no-op silencioso: no
 * hay error en consola, el build no falla, los tipos compilan y los tests de la ficha
 * —que montan su propio Toaster— siguen en verde. Lo único que cambia es que el
 * cliente agrega una pieza y no ve nada.
 *
 * Se lee la FUENTE del layout porque un `.astro` no se puede renderizar desde vitest.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const base = readFileSync(new URL('../../layouts/Base.astro', import.meta.url), 'utf8');

describe('los avisos flotantes', () => {
  it('la isla está montada en el layout de todas las páginas', () => {
    expect(base).toMatch(/<Avisos\s+client:/);
  });

  it('la isla se importa de verdad (no quedó solo la etiqueta)', () => {
    expect(base).toMatch(/import Avisos from ['"]\.\.\/components\/ui\/Avisos['"]/);
  });
});
