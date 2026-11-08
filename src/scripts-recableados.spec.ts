import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * TODO `<script>` DE UN `.astro` QUE ENGANCHE UN LISTENER TIENE QUE RECABLEARSE
 * EN `astro:page-load` (2026-11-07).
 *
 * ⚠️ **Nació del fallo que casi se escapó en la Tarea 3.** Desde que `Base.astro`
 * monta `<ClientRouter />`, una navegación de cliente **reemplaza el `<body>` sin
 * recargar la página**. Un script que se engancha una sola vez al evaluarse queda
 * colgado de un elemento que ya no está en el DOM: el menú móvil deja de abrir y el
 * CTA de WhatsApp se queda en `href="#"`.
 *
 * **Y falla en SILENCIO**, que es lo peligroso: no hay excepción en consola, los
 * tipos compilan y el build sale en VERDE. El botón simplemente no hace nada, y en
 * el caso del CTA eso es una **venta perdida** — regla cardinal del proyecto.
 *
 * Un comentario en el código no protege de esto: se lee una vez y se olvida. Lo que
 * protege es esta prueba, que falla cuando alguien agrega un `<script>` nuevo sin el
 * recableado.
 *
 * El recableado va en los DOS momentos (al evaluar el módulo y en `astro:page-load`),
 * porque ese evento lo dispara el router de `astro:transitions` y **no existe si el
 * router no está montado**. Acá se exige el `addEventListener` del evento; el doble
 * cableado se verifica en el navegador.
 *
 * ⚠️ **Lo que se busca es la LLAMADA, no la palabra.** La primera versión de esta prueba
 * se validó rompiéndola —cambiando `astro:page-load` por `astro:after-swap` en
 * `Header.astro`— y **siguió en verde**: los comentarios del propio script nombran el
 * evento, así que un `includes('astro:page-load')` se daba por satisfecho con la
 * documentación. Por eso se descartan los comentarios y se exige el patrón
 * `addEventListener('astro:page-load'`.
 */

const RAIZ = join(__dirname, '..');
const CARPETAS = [join('src', 'components'), join('src', 'layouts')];

/** Los `.astro` de `src/components` y `src/layouts`, recursivo. */
function archivosAstro(dir: string): string[] {
  const encontrados: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) encontrados.push(...archivosAstro(ruta));
    else if (nombre.endsWith('.astro')) encontrados.push(ruta);
  }
  return encontrados;
}

/**
 * El código del script sin sus comentarios: un comentario que nombra el evento NO
 * cuenta como recableado (ver el aviso de arriba).
 */
function sinComentarios(cuerpo: string): string {
  return cuerpo.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/[^\n]*/g, ' ');
}

/** Engancha un listener de cualquier tipo. */
const ENGANCHA = /addEventListener\s*\(/;
/** Lo engancha para `astro:page-load`, que es lo que sobrevive a una navegación. */
const RECABLEA = /addEventListener\s*\(\s*['"`]astro:page-load['"`]/;

/**
 * Los cuerpos de los `<script>` del archivo, sin los de datos (`application/ld+json`),
 * que no son código que corra.
 */
function cuerposDeScript(contenido: string): string[] {
  const cuerpos: string[] = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(contenido)) !== null) {
    const atributos = m[1];
    if (/type\s*=\s*["']?application\/ld\+json/.test(atributos)) continue;
    cuerpos.push(m[2]);
  }
  return cuerpos;
}

describe('los <script> de los .astro sobreviven a una navegación de cliente', () => {
  const archivos = CARPETAS.flatMap((c) => archivosAstro(join(RAIZ, c)));

  it('encuentra archivos para revisar (si no, la prueba no prueba nada)', () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it('todo script que engancha un listener se recablea en astro:page-load', () => {
    const sinRecablear = archivos.filter((ruta) => {
      const contenido = readFileSync(ruta, 'utf8');
      return cuerposDeScript(contenido)
        .map(sinComentarios)
        .some((codigo) => ENGANCHA.test(codigo) && !RECABLEA.test(codigo));
    });

    expect(
      sinRecablear.map((r) => relative(RAIZ, r)),
      'Con <ClientRouter /> montado, el <body> se reemplaza sin recargar: un listener ' +
        'enganchado una sola vez muere en la primera navegación, sin error y con el build ' +
        'en verde. Recableá en astro:page-load (ver Header.astro o WhatsappCotizar.astro).',
    ).toEqual([]);
  });

  it('los dos scripts que ya estaban recableados siguen estándolo', () => {
    // Guardia de la guardia: si alguien renombra el evento o borra el cableado, la prueba
    // de arriba pasaría por vacía. Estos dos son los casos reales que la motivaron.
    for (const nombre of ['Header.astro', 'WhatsappCotizar.astro']) {
      const ruta = join(RAIZ, 'src', 'components', nombre);
      const codigos = cuerposDeScript(readFileSync(ruta, 'utf8')).map(sinComentarios);
      expect(codigos.some((c) => ENGANCHA.test(c)), nombre).toBe(true);
      expect(codigos.some((c) => RECABLEA.test(c)), nombre).toBe(true);
    }
  });
});
