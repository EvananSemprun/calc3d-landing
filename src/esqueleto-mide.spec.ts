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
 * ⚠️ **Y que declaren un alto tampoco alcanza: el alto tiene que ser el de la ficha.**
 * Los altos del esqueleto están escritos como la expresión que los produce
 * (`calc(13px * 1.55)`), pero esa expresión estaba **copiada a mano** de la regla que
 * imita, no derivada: el día que `.pdp-facts` dejara de ser de 13 px, el esqueleto quedaba
 * desalineado y no fallaba nada. Por eso el segundo bloque de abajo **lee las dos reglas
 * de `global.css`** —la barra y la pieza de la ficha que imita— y las compara. Si cambia
 * la ficha, se pone rojo el esqueleto.
 */

const CSS = sinComentarios(readFileSync(join(__dirname, 'styles', 'global.css'), 'utf8'));
const TODAS = reglas(CSS);

const FUENTE = readFileSync(
  join(__dirname, 'components', 'ficha', 'EsqueletoFicha.tsx'),
  'utf8',
);

/** Las clases `esq-*` que el componente pinta de verdad. */
const BARRAS = [...new Set([...FUENTE.matchAll(/\besq-[a-záéíóúñ-]+/g)].map((m) => m[0]))].sort();

/**
 * El valor de una propiedad dentro de un cuerpo de declaraciones, la ÚLTIMA que se declare
 * (que es la que gana en la cascada).
 *
 * ⚠️ El `(?:^|[;\s])` del principio no es adorno: sin él, pedir `height` encuentra el
 * `line-height` de la misma regla y el guardián compara contra el número equivocado.
 */
const valorDe = (cuerpo: string, prop: string): string | null => {
  const todos = [...cuerpo.matchAll(new RegExp(`(?:^|[;\\s])${prop}:\\s*([^;]+)`, 'g'))];
  return todos.length ? todos[todos.length - 1][1].trim() : null;
};

/** Para comparar dos expresiones escritas con distinto aire (`13px*1.55` ≡ `13px * 1.55`). */
const aplanar = (v: string) => v.trim().replace(/\s+/g, ' ').replace(/\s*([,*])\s*/g, '$1');

/**
 * Barras cuyo alto es UNA LÍNEA de un texto de la ficha: su tamaño de letra por su
 * interlínea. Las tres columnas se leen de `global.css`, ninguna se escribe acá.
 */
const COPIADAS_DE_TEXTO = [
  { barra: '.esq-titulo', imita: '.h2', interlinea: 'h1' },
  { barra: '.esq-hechos', imita: '.pdp-facts', interlinea: 'body' },
  { barra: '.esq-precio', imita: '.pdp-price', interlinea: '.pdp-price' },
  { barra: '.esq-unidad', imita: '.pdp-unit', interlinea: 'body' },
  { barra: '.esq-renglon', imita: '.pdp-lead', interlinea: 'body' },
] as const;

describe('el esqueleto de la ficha reserva el espacio de la ficha', () => {
  it('la lista de barras no salió vacía: el `it.each` de abajo tiene algo que mirar', () => {
    // ⚠️ Esto NO dice que estén el título, el precio y el botón —cuenta clases `esq-*`
    // distintas y pasaría con cuatro renglones de descripción—. Que estén las piezas
    // concretas lo amarra `FichaEnVivo.spec.tsx`, que mira el DOM renderizado. Lo único
    // que evita esto es un `it.each` sobre una lista vacía: cero casos, todo verde.
    expect(
      BARRAS.length,
      'No encontré clases `esq-*` en EsqueletoFicha.tsx. Si se renombraron, hay que ' +
        'renombrar también acá: este guardián saca la lista del componente.',
    ).toBeGreaterThan(0);
  });

  it('la barra del esqueleto se ve (tiene fondo)', () => {
    expect(
      reglaDe(TODAS, '.esqueleto-barra'),
      'Falta la regla `.esqueleto-barra` en global.css. Sin fondo, el esqueleto reserva ' +
        'el espacio pero no se ve nada: la pantalla queda en blanco igual que antes.',
    ).toMatch(/background/);
  });

  it.each(BARRAS)('`.%s` declara un alto que de verdad ocupa lugar', (clase) => {
    const cuerpo = reglaDe(TODAS, `.${clase}`);
    expect(
      cuerpo,
      `\`.${clase}\` se pinta en EsqueletoFicha.tsx y no tiene regla en global.css. Una ` +
        'barra sin alto mide 0: el esqueleto deja de reservar espacio y la ficha vuelve a ' +
        'aparecer de golpe, sin que nada falle.',
    ).toMatch(/(?:^|[;\s])height:/);

    // ⚠️ **Negar solo `height: 0` NO alcanza, y la primera versión de este guardián se
    // quedaba ahí.** Las barras son `<div>` VACÍOS, así que `auto`, `fit-content`,
    // `min-content` y `max-content` miden todos **0 px** — o sea que el esqueleto se podía
    // encoger a nada con la suite en verde, que es justo la clase de fallo silencioso que
    // este guardián existe para atajar. Y el cero tampoco viene con una sola unidad:
    // `0rem`, `0%` y `0em` son el mismo cero.
    const alto = valorDe(cuerpo, 'height') ?? '';
    expect(
      alto,
      `\`.${clase}\` declara \`height: ${alto}\`, que en un <div> vacío mide 0 px. El ` +
        'esqueleto existe para reservar el alto de la ficha; con cero, no reserva nada.',
    ).not.toMatch(/^(?:0(?:[a-z%]+)?|auto|fit-content|min-content|max-content)$/i);
  });

  /**
   * ⚠️ **Lo de arriba cuida que la barra ocupe lugar; esto cuida que ocupe EL lugar.**
   * El alto de cada barra de texto es «una línea de lo que imita», o sea su tamaño de
   * letra por su interlínea, y las dos cosas se leen de `global.css`. Antes estaban
   * copiadas a mano: `.pdp-facts` pasaba de 13 px a 15 px y el esqueleto seguía diciendo
   * 13 px, con todo verde y la ficha saltando al llegar.
   */
  it.each(COPIADAS_DE_TEXTO)(
    '`$barra` mide una línea de `$imita`, leído de la ficha y no copiado',
    ({ barra, imita, interlinea }) => {
      const tam = valorDe(reglaDe(TODAS, imita), 'font-size');
      const lh = valorDe(reglaDe(TODAS, interlinea), 'line-height');
      expect(tam, `No pude leer el \`font-size\` de \`${imita}\` en global.css`).toBeTruthy();
      expect(lh, `No pude leer el \`line-height\` de \`${interlinea}\``).toBeTruthy();

      // Con interlínea 1 el alto de la línea ES el tamaño de letra: un `calc(… * 1)`
      // sobraría y se leería como si hubiera una cuenta que hacer.
      const esperado = lh === '1' ? tam! : `calc(${tam} * ${lh})`;
      expect(
        aplanar(valorDe(reglaDe(TODAS, barra), 'height') ?? ''),
        `\`${barra}\` ya no mide una línea de \`${imita}\`. Hoy \`${imita}\` es ` +
          `\`${tam}\` con interlínea \`${lh}\` (de \`${interlinea}\`), así que la barra ` +
          `tiene que decir \`${esperado}\`. Si cambió la ficha a propósito, el esqueleto ` +
          'va detrás; si no, el que cambió es el esqueleto.',
      ).toBe(aplanar(esperado));
    },
  );

  it('`.esq-cantidad` mide lo que mide el botón del contador', () => {
    const real = valorDe(reglaDe(TODAS, '.qty button'), 'height');
    expect(real, 'No pude leer el alto de `.qty button`').toBeTruthy();
    expect(
      aplanar(valorDe(reglaDe(TODAS, '.esq-cantidad'), 'height') ?? ''),
      `El contador de la ficha mide \`${real}\` de alto y el hueco del esqueleto, no.`,
    ).toBe(aplanar(real!));
  });

  it('`.esq-boton` mide lo que emite la clase `h-N` del botón de la ficha', () => {
    // `h-11` no está en `global.css` (lo genera Tailwind), así que el número se lee del
    // componente y la expresión es la MISMA que emite Tailwind:
    // `.h-11{height:calc(var(--spacing) * 11)}`. Escrito así, cambiar `h-11` por `h-12`
    // —o cambiar `--spacing`— no deja el esqueleto diciendo 44 px en silencio.
        //
    // ⚠️ **Límite conocido de este guardián, dicho para que nadie lo crea hermético:**
    // compara TEXTO, y `--spacing` la define Tailwind, no `global.css`. Si algún día esa
    // variable dejara de resolver, el `calc` sería inválido, el alto caería a `auto` y la
    // barra mediría 0 px — con este test en verde. Se verificó a mano (2026-11-09):
    // `--spacing` = `0.25rem`, `.esq-boton` = 44 px, y el control positivo
    // `calc(var(--no-existe) * 11)` da **0**, o sea que el fallo es real pero no silencioso
    // por otro lado: el botón de verdad usa la MISMA variable (`Ficha.tsx`, `h-11`), así
    // que se rompería a la vista en la misma pantalla. Cerrarlo con un test exigiría un
    // navegador para una sola medida; se decidió que no vale.
    const ficha = readFileSync(join(__dirname, 'components', 'ficha', 'Ficha.tsx'), 'utf8');
    const n = /className="h-(\d+) /.exec(ficha)?.[1];
    expect(n, 'No encontré la clase `h-N` del botón en Ficha.tsx').toBeTruthy();
    expect(
      aplanar(valorDe(reglaDe(TODAS, '.esq-boton'), 'height') ?? ''),
      `El botón de la ficha es \`h-${n}\` y el del esqueleto no lo sigue.`,
    ).toBe(aplanar(`calc(var(--spacing) * ${n})`));
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
