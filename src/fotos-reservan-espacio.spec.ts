import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * TODA FOTO REMOTA RESERVA SU ESPACIO ANTES DE CARGAR (2026-11-09).
 *
 * Las fotos de productos y banners vienen de R2 y sus medidas no se conocen en el build.
 * Una `<img>` con `height: auto` mide 0 hasta que baja la foto, y entonces EMPUJA todo lo
 * que tiene debajo: no falla nada, compila y el build sale verde. Pasó con
 * `.banner-cat img`, que quedó latente porque aún no hay ningún banner cargado.
 *
 * Esta prueba lee el TEXTO de `global.css` (los tests corren en `environment: node`, sin
 * DOM, y jsdom no aplica CSS: un `getComputedStyle` daría verde con el CSS roto) y exige,
 * para cada clase de la lista, `aspect-ratio` o `width` y `height` concretos.
 *
 * ⚠️ La lista es A MANO a propósito: un patrón sobre «todo `img`» se comería los logos
 * locales, que ya traen sus atributos `width`/`height`.
 */

const RUTA = join(__dirname, 'styles', 'global.css');

/** Clases que pintan una foto remota. Si agregas una nueva, SÚMALA aquí. */
const CLASES_CON_FOTO_REMOTA = [
  '.banner-cat img',
  '.hero-art--banner',
  '.product-photo',
  '.cat-card-foto',
  '.pdp-main',
  '.pdp-thumb',
  '.cart-thumb',
  '.pdp-custom-chip img',
] as const;

const normalizar = (s: string) => s.trim().replace(/\s+/g, ' ');

const css = readFileSync(RUTA, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

/** Los cuerpos de todas las reglas cuyo selector (de una lista con comas) es exactamente `sel`. */
function reglaDe(sel: string): string {
  const cuerpos: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    if (m[1].split(',').map(normalizar).includes(sel)) cuerpos.push(m[2]);
  }
  return cuerpos.join(';');
}

const declara = (cuerpo: string, prop: string, valor = '[^;}]+') =>
  new RegExp(String.raw`(?:^|[;{\s])${prop}\s*:\s*${valor}`).test(cuerpo);

describe('toda foto remota reserva su espacio antes de cargar', () => {
  it.each(CLASES_CON_FOTO_REMOTA)('%s declara aspect-ratio o alto fijo', (sel) => {
    const cuerpo = reglaDe(sel);
    expect(cuerpo, `No encontré la regla \`${sel}\` en global.css`).not.toBe('');
    const reserva =
      declara(cuerpo, 'aspect-ratio') ||
      (declara(cuerpo, 'width', String.raw`\d+px`) && declara(cuerpo, 'height', String.raw`\d+px`));
    expect(
      reserva,
      `\`${sel}\` no reserva su espacio: con \`height: auto\` mide 0 hasta que la foto baja y ` +
        'empuja lo de abajo. Dale `aspect-ratio` (o `width` y `height` en px). Si sumaste ' +
        'una clase nueva con foto remota, agrégala a CLASES_CON_FOTO_REMOTA.',
    ).toBe(true);
  });

  it('.banner-cat img recorta, no deforma', () => {
    // Sin `object-fit` el valor por defecto (`fill`) ESTIRA el banner en vez de recortarlo.
    expect(reglaDe('.banner-cat img')).toMatch(/object-fit:\s*cover/);
  });
});
