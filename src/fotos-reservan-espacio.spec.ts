import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { reglaDe as cuerpoDe, reglas, sinComentarios } from './test/css';

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

/**
 * Clases que pintan una foto remota. Si agregas una nueva, SÚMALA aquí.
 *
 * ⚠️ **`.hero-fondo img` NO está, y no es un olvido.** El fondo del hero vive en una capa
 * `position: absolute; inset: 0` y se estira al 100 % de ella: no puede empujar nada al
 * cargar, que es lo único que este guardián vigila. Agregarla lo pondría rojo pidiéndole
 * un `aspect-ratio` que ahí no significa nada.
 */
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

/** El parser vive en `test/css.ts`: una sola definición para los tres guardianes de CSS. */
const TODAS = reglas(sinComentarios(readFileSync(RUTA, 'utf8')));

/** Los cuerpos de todas las reglas cuyo selector (de una lista con comas) es exactamente `sel`. */
const reglaDe = (sel: string) => cuerpoDe(TODAS, sel);

const declara = (cuerpo: string, prop: string, valor = '[^;}]+') =>
  new RegExp(String.raw`(?:^|[;{\s])${prop}\s*:\s*${valor}`).test(cuerpo);

describe('toda foto remota reserva su espacio antes de cargar', () => {
  it.each(CLASES_CON_FOTO_REMOTA)('%s declara aspect-ratio o alto fijo', (sel) => {
    const cuerpo = reglaDe(sel);
    expect(cuerpo, `No encontré la regla \`${sel}\` en global.css`).not.toBe('');
    const reserva =
      // Una proporción REAL: `aspect-ratio: auto` existe pero no reserva nada (alto 0).
      declara(cuerpo, 'aspect-ratio', String.raw`\d+(?:\.\d+)?(?:\s*/\s*\d+(?:\.\d+)?)?\s*(?:;|$)`) ||
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

  it('.banner-cat img reserva 16 / 9', () => {
    // DECISIÓN DEL DUEÑO, no una sugerencia: es la proporción que el panel ya muestra en su
    // vista previa (`aspect-[16/9]` + `object-cover`) y que recomienda al subir el banner.
    // Cambiarla deja a la tienda contradiciendo lo que el panel promete.
    expect(reglaDe('.banner-cat img')).toMatch(/aspect-ratio:\s*16\s*\/\s*9\s*(?:;|$)/);
  });
});
