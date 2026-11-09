import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * NINGUNA FOTO LLEGA ESCONDIDA EN EL HTML HORNEADO (2026-11-09).
 *
 * Es el guardián del modo de falla del fundido de las fotos. El fundido deja la foto en
 * `opacity: 0` hasta que carga, y la marca que lo dispara (`data-cargando`) la pone
 * **solo el JS del cliente, después de montar**. Si alguna vez apareciera en el render
 * que Astro hornea, el HTML servido traería las fotos invisibles para:
 *
 * - **Google** y la previsualización de WhatsApp, que leen el HTML y no corren el JS;
 * - quien tenga el JS roto, bloqueado por una extensión o cortado a mitad de descarga.
 *
 * Y sería un fallo **mudo**: los tipos compilan, el build sale verde y la suite entera
 * también. Por eso esto no mira el código fuente sino el **`dist/` de verdad**, que es lo
 * único que prueba lo que se publica.
 *
 * ⚠️ **VA EN UN SCRIPT APARTE (`pnpm test:dist`), NO en `pnpm test` ni en el gancho de
 * pre-push.** Leer `dist/` exige un `pnpm build`, y el build le pega a la API: atar cada
 * push a tener la API arriba y a un build de minutos —donde hoy la suite tarda segundos—
 * es lo que entrena el `--no-verify`. Se corre a mano, junto con `pnpm check`. Por lo
 * mismo vive en su PROPIO proyecto de `vitest.config.ts` (`dist`), excluido del
 * proyecto `node` —que toma todos los `*.spec.ts` de `src/`— y que `pnpm test` no corre.
 *
 * ⚠️ **SI `dist/` NO EXISTE, FALLA FUERTE.** Nunca se saltea. Un guardián que diga «0
 * verificados» y salga en verde es exactamente el guardián-que-no-guarda que este repo
 * viene cerrando: la próxima vez nadie se enteraría de que no verificó nada.
 */

const DIST = resolve(__dirname, '..', 'dist');

const COMO_CONSTRUIR =
  'Construí el sitio primero (hace falta la API arriba):\n' +
  '  PUBLIC_API_URL=https://calc3d-api-production.up.railway.app/api \\\n' +
  '  PUBLIC_SITE_URL=https://bananolab-3d.com pnpm build\n' +
  'En PowerShell la sintaxis `VAR=valor comando` no funciona: usá Git Bash o `$env:VAR`.';

interface Pagina {
  /** Ruta relativa a `dist/`, para que el mensaje de error sirva para algo. */
  ruta: string;
  html: string;
}

let cache: Pagina[] | null = null;

/**
 * Todos los `.html` de `dist/`, leídos **una sola vez**.
 *
 * ⚠️ La memoria no es microoptimización: con las 1.002 fichas que este repo espera, seis
 * lecturas completas de `dist/` es lo que hace que un guardián que se corre a mano deje
 * de correrse.
 *
 * ⚠️ Si `dist/` no existe, **lanza**: así los seis tests salen en rojo con un mensaje que
 * dice qué hacer, en vez de recibir una lista vacía y pasar sin mirar nada.
 */
function paginas(): Pagina[] {
  if (cache) return cache;
  if (!existsSync(DIST)) throw new Error(`No existe \`${DIST}\`. ${COMO_CONSTRUIR}`);
  cache = readdirSync(DIST, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ ruta: f, html: readFileSync(join(DIST, f), 'utf8') }));
  return cache;
}

/** Una `<img>` que lleva a la vez la clase `clase` y el atributo `attr`, en cualquier orden. */
const imgQue = (clase: string, attr: string) =>
  new RegExp(
    `<img[^>]*\\b${clase}\\b[^>]*\\b${attr}\\b|<img[^>]*\\b${attr}\\b[^>]*\\b${clase}\\b`,
    'g',
  );

/** Las páginas que tienen alguna. */
const conImgQue = (clase: string, attr: string): string[] =>
  paginas().filter((pg) => imgQue(clase, attr).test(pg.html)).map((pg) => pg.ruta);

const cuantas = (html: string, re: RegExp) => html.match(re)?.length ?? 0;

/**
 * Los listados de categoría del build (`/tienda/<cat>/`), que es donde vive la grilla
 * estática con `COLUMNAS_PRIMERA_FILA`. `readdirSync` devuelve `\` en Windows.
 */
const listados = () =>
  paginas().filter((pg) => /^tienda[\\/][^\\/]+[\\/]index\.html$/.test(pg.ruta));

describe('el HTML horneado no esconde ninguna foto', () => {
  it('hay un `dist/` construido que verificar', () => {
    // Esta comprobación es la que impide el verde vacío: sin ella, un `dist/` ausente
    // dejaría los demás tests con cero casos y el guardián saldría en verde sin mirar nada.
    expect(existsSync(DIST), `No existe \`${DIST}\`. ${COMO_CONSTRUIR}`).toBe(true);
    expect(paginas().length, `\`dist/\` no tiene ni un .html. ${COMO_CONSTRUIR}`).toBeGreaterThan(0);
  });

  it('hay fotos que verificar (si no, no se probó nada)', () => {
    // Un `dist/` sin una sola `<img>` pasaría los tests de abajo sin mirar nada: querría
    // decir que el build salió sin catálogo, no que las fotos estén bien.
    const total = paginas().reduce((n, p) => n + (p.html.match(/<img/g)?.length ?? 0), 0);
    expect(total, 'Ni una `<img>` en todo `dist/`: el build salió sin catálogo.').toBeGreaterThan(0);
  });

  it('ninguna página trae la marca `data-cargando`', () => {
    const culpables = paginas()
      .filter((p) => p.html.includes('data-cargando'))
      .map((p) => p.ruta);
    expect(
      culpables,
      'Estas páginas del build traen la marca de «foto no cargada», o sea las fotos en ' +
        'opacidad 0 para Google y para quien tenga el JS roto. La marca la pone SOLO el ' +
        'efecto de `<Foto>` en el navegador: no puede salir del render que Astro hornea.',
    ).toEqual([]);
  });

  it('ninguna foto trae una opacidad en línea', () => {
    // El otro camino para esconderla, y éste no necesita ninguna clase ni atributo
    // nuestro: un `style="opacity:0"` en el marcado.
    const culpables = paginas()
      .filter((p) => /<img[^>]*style="[^"]*opacity\s*:\s*0(?:\.0*)?\s*[;"]/i.test(p.html))
      .map((p) => p.ruta);
    expect(culpables, 'Estas páginas traen una `<img>` con `opacity: 0` en línea.').toEqual([]);
  });

  it('ninguna foto trae una clase de «no cargada»', () => {
    // Si algún día el mecanismo cambia de atributo a clase, el guardián tiene que seguir
    // viéndolo. La lista es a mano a propósito: un patrón general gritaría por todo.
    const culpables = paginas()
      .filter((p) => /<img[^>]*class="[^"]*\b(?:cargando|no-cargada|sin-cargar|oculta)\b/i.test(p.html))
      .map((p) => p.ruta);
    expect(culpables, 'Estas páginas traen una `<img>` con una clase de «no cargada».').toEqual([]);
  });

  it('las fotos que DEBEN fundirse siguen fundiéndose', () => {
    // ⚠️ **El verde falso SIMÉTRICO al de arriba, y hasta ahora no lo cubría nadie.**
    // Alguien pone `COLUMNAS_PRIMERA_FILA = 999`, o `prioridad` en todas las tarjetas, o
    // escribe un `<img>` crudo para una foto remota nueva, y el fundido **desaparece del
    // sitio entero** con los cuatro comandos en verde: ningún test exige que las fotos
    // que deben fundir sigan fundiendo. Es el mismo patrón que dejó pasar la insignia
    // «Nuevo» y la moneda «USD» en este repo. Si el arreglo depende de que alguien se
    // acuerde, no está arreglado.
    for (const clase of ['product-photo', 'cat-card-foto']) {
      expect(
        conImgQue(clase, 'data-fundir').length,
        `Ni una \`.${clase}\` del build lleva \`data-fundir\`: el fundido se apagó para ` +
          'esa foto en todo el sitio. Revisá `prioridad` (y `COLUMNAS_PRIMERA_FILA` en ' +
          '`Catalogo.tsx`), o que la foto no haya vuelto a ser un `<img>` crudo en vez de ' +
          'un `<Foto>`.',
      ).toBeGreaterThan(0);
    }
  });

  it('en un listado, las fotos de abajo de la primera fila funden', () => {
    // ⚠️ **El test de arriba NO alcanza, y está medido.** Con
    // `COLUMNAS_PRIMERA_FILA = 999` (o sea, el listado entero sin fundido) seguía en
    // VERDE: los «Destacados» de la portada y de `/tienda/` pintan la misma
    // `TarjetaProducto` sin `prioridad`, así que siempre queda alguna `.product-photo`
    // fundiendo en otra página. Lo que hay que mirar es el listado, página por página.
    const culpables = listados()
      .filter((pg) => cuantas(pg.html, imgQue('product-photo', 'class')) > 3)
      .filter((pg) => cuantas(pg.html, imgQue('product-photo', 'data-fundir')) === 0)
      .map((pg) => pg.ruta);

    expect(
      culpables,
      'Estos listados tienen más fotos que una fila y NINGUNA funde: el fundido quedó ' +
        'apagado en el listado. Es `prioridad` de más — mirá `COLUMNAS_PRIMERA_FILA` en ' +
        '`Catalogo.tsx`, que vale lo que una fila (3) y no más.',
    ).toEqual([]);
  });

  it('hay un listado con más de una fila que verificar (si no, lo de arriba no mira nada)', () => {
    // Sin esto, un build donde ninguna categoría pase de 3 productos dejaría el test
    // anterior sin casos y en verde: el guardián-que-no-guarda otra vez.
    expect(
      listados().filter((pg) => cuantas(pg.html, imgQue('product-photo', 'class')) > 3).length,
      'Ningún listado del build tiene más de 3 productos, así que no se pudo verificar ' +
        'que las fotos de abajo de la primera fila fundan.',
    ).toBeGreaterThan(0);
  });

  it('la foto grande de la ficha NO está marcada para fundirse', () => {
    // No es el mismo riesgo que los de arriba (esto no esconde nada), pero es la otra
    // decisión que no se reabre: medido el 2026-11-09, `.pdp-main` ES el elemento del LCP
    // de la ficha y tarda 11,4 s con la red frenada. Una imagen en `opacity: 0` no es
    // candidata a LCP, así que fundirla le sumaría el cruce a un LCP que ya es malo.
    // `data-fundir` es lo que `<Foto>` deja de poner cuando lleva `prioridad`.
    expect(
      conImgQue('pdp-main', 'data-fundir'),
      'En estas fichas `.pdp-main` salió con `data-fundir`: le quitaron `prioridad`. Es ' +
        'el elemento del LCP de la ficha y fundirlo lo retrasa. No se le quita.',
    ).toEqual([]);
  });
});
