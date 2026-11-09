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

/** Todos los `.html` de `dist/`, con su ruta relativa para que el mensaje sirva. */
function paginas(): { ruta: string; html: string }[] {
  return readdirSync(DIST, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ ruta: f, html: readFileSync(join(DIST, f), 'utf8') }));
}

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

  it('la foto grande de la ficha NO está marcada para fundirse', () => {
    // No es el mismo riesgo que los de arriba (esto no esconde nada), pero es la otra
    // decisión que no se reabre: medido el 2026-11-09, `.pdp-main` ES el elemento del LCP
    // de la ficha y tarda 11,4 s con la red frenada. Una imagen en `opacity: 0` no es
    // candidata a LCP, así que fundirla le sumaría el cruce a un LCP que ya es malo.
    // `data-fundir` es lo que `<Foto>` deja de poner cuando lleva `prioridad`.
    const culpables = paginas()
      .filter((p) => /<img[^>]*\bpdp-main\b[^>]*data-fundir|<img[^>]*data-fundir[^>]*\bpdp-main\b/.test(p.html))
      .map((p) => p.ruta);
    expect(
      culpables,
      'En estas fichas `.pdp-main` salió con `data-fundir`: le quitaron `prioridad`. Es ' +
        'el elemento del LCP de la ficha y fundirlo lo retrasa. No se le quita.',
    ).toEqual([]);
  });
});
