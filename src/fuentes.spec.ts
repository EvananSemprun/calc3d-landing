import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { bloques, bloquesAt, sinComentarios } from './test/css';

/**
 * POPPINS ES NUESTRA: NI UN PEDIDO A GOOGLE, NI UN SALTO AL LLEGAR (2026-11-09).
 *
 * La tienda pedía Poppins a `fonts.googleapis.com` con un `<link rel="stylesheet">`.
 * Eso costaba **5 peticiones a otro dominio** en una carga de portada (1 de CSS + 4
 * woff2, medido ese día) **en el camino crítico del LCP**: el elemento del LCP de la
 * portada y del listado es el **`h1` — texto, no una foto** (9 de 10 corridas de
 * escritorio), así que lo primero que se ve esperaba un CSS y una fuente de un tercero.
 *
 * Y mientras la fuente viajaba, el texto se pintaba con el respaldo del sistema y
 * **saltaba** al llegar Poppins: el `h1` de la portada medía 111,2 px de alto con el
 * respaldo y 148,3 px con Poppins a 390 px de ancho — **+37,1 px (33 %)**, que es
 * exactamente una línea más de texto (`line-height: 1.03` × 36 px), porque Poppins es
 * más ancha y el título envuelve en una línea más.
 *
 * Lo que sostiene el arreglo, y que no falla por ninguna otra parte:
 *
 * 1. **Ninguna referencia a Google.** Volver a pegar el `<link>` del CSS de Google es un
 *    copiar y pegar de cualquier tutorial, y el sitio sigue funcionando igual de bien:
 *    nada se rompe, solo vuelven las 5 peticiones a otro dominio.
 * 2. **UNA sola precarga.** Precargar los seis pesos es pelearse por el ancho de banda
 *    justo en el instante que define el LCP, y encima dos de los seis (500 y 800) la
 *    portada **no los descarga**: quedan `unloaded` en `document.fonts`.
 * 3. **La precarga sale de un `import … ?url`, no de una ruta escrita a mano.** Vite
 *    emite UN activo con hash por archivo: con el `import`, la precarga y el `url()` del
 *    `@font-face` apuntan al mismo, y con una ruta a mano serían **dos descargas** del
 *    mismo woff2 — más tráfico que antes, sin un solo error.
 * 4. **Ningún `@font-face` con `font-display: block`.** Es un modo de falla propio y
 *    PEOR que el salto: deja el texto **invisible** hasta que llega la fuente, y el que
 *    define el LCP es texto.
 * 5. **La familia de respaldo con overrides de métrica, y METIDA EN LA PILA.** Declarar
 *    el `@font-face` ajustado y olvidarse de nombrarlo en `--font-sans`/`--font-display`
 *    es un no-op perfectamente silencioso: el salto vuelve entero.
 *
 * ⚠️ Los números de los overrides NO se tocan sin volver a medirlos: de dónde salen está
 * escrito en el comentario de `global.css`, junto al bloque.
 */

const RAIZ = join(__dirname, '..');
const leer = (...partes: string[]) => readFileSync(join(RAIZ, ...partes), 'utf8');

const LAYOUT = leer('src', 'layouts', 'Base.astro');
const CSS = leer('src', 'styles', 'global.css');
const BLOQUES = bloques(sinComentarios(CSS));

/** Los 6 pesos que el sitio declara (`global.css` + `font-medium`/`font-semibold`). */
const PESOS = [400, 500, 600, 700, 800, 900];

/**
 * Los pesos que la portada DESCARGA de verdad, medidos con `document.fonts` el
 * 2026-11-09. ⚠️ 500 y 800 están declarados pero quedan `unloaded`: una precarga
 * apuntando a uno de esos dos gasta ancho de banda en algo que la primera pantalla no
 * pinta.
 */
const PESOS_DE_LA_PRIMERA_PANTALLA = [400, 600, 700, 900];

/** El dominio del que no tiene que quedar ni rastro. Partido para que no se encuentre a sí mismo. */
const GOOGLE = new RegExp(['fonts', '\\.', '(googleapis|gstatic)', '\\.', 'com'].join(''));

/** Los archivos de texto de `src/`, menos este (que nombra lo que prohíbe). */
function fuentesDeSrc(dir = join(RAIZ, 'src')): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return fuentesDeSrc(ruta);
    if (!/\.(astro|ts|tsx|css|json)$/.test(nombre)) return [];
    if (ruta === __filename) return [];
    return [ruta];
  });
}

/** Los `@import` de `@fontsource` de `global.css`, con la ruta real del archivo. */
function importesDeFontsource() {
  return [...CSS.matchAll(/@import\s+["'](@fontsource\/[^"']+)["']/g)].map((m) => ({
    especificador: m[1],
    ruta: join(RAIZ, 'node_modules', m[1]),
  }));
}

/** Los `<link rel="preload">` del layout. */
const precargas = () => [...LAYOUT.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)].map((m) => m[0]);

/** Los `import … from '…woff2?url'` del layout: `{ nombre, especificador, peso }`. */
function importesDeWoff2() {
  const re = /import\s+(\w+)\s+from\s+["']([^"']+\.woff2\?url)["']/g;
  return [...LAYOUT.matchAll(re)].map((m) => ({
    nombre: m[1],
    especificador: m[2],
    peso: Number(/-(\d{3})-/.exec(m[2])?.[1] ?? NaN),
  }));
}

/** Los `@font-face` de `global.css`. */
const caras = () => bloquesAt(BLOQUES, '@font-face');

/** El valor de una propiedad dentro de un cuerpo de declaraciones. */
const valor = (cuerpo: string, prop: string) =>
  new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i').exec(cuerpo)?.[1]?.trim() ?? null;

/** El porcentaje de una declaración (`size-adjust: 93.5%` → 93.5). */
const porcentaje = (cuerpo: string, prop: string) => {
  const v = valor(cuerpo, prop);
  const n = v && /^(-?[\d.]+)%$/.exec(v);
  return n ? Number(n[1]) : null;
};

/** Las caras de respaldo: las que llevan `size-adjust` (las de `@fontsource` no). */
const carasDeRespaldo = () => caras().filter((c) => valor(c.cuerpo, 'size-adjust') !== null);

/** El rango de `font-weight` de una cara (`100 600` → `[100, 600]`; `700` → `[700, 700]`). */
const rangoDePeso = (cuerpo: string): [number, number] | null => {
  const v = valor(cuerpo, 'font-weight');
  if (!v) return null;
  const n = v.split(/\s+/).map(Number);
  if (n.some(Number.isNaN)) return null;
  return [n[0], n.length > 1 ? n[1] : n[0]];
};

/**
 * Las métricas verticales de un `.woff` de `@fontsource`, leídas del ARCHIVO.
 *
 * ⚠️ Lee el `.woff` y no el `.woff2` porque el segundo va comprimido con Brotli y
 * descomprimirlo pediría una dependencia; el `.woff` usa zlib, que trae Node. Los dos los
 * genera `@fontsource` del mismo original, así que las métricas son las mismas (se
 * comprobó con `fontTools` sobre el `.woff2` el 2026-11-09: upem 1000, ascender 1050,
 * descender −350, lineGap 100).
 *
 * Existe para que los números del CSS no puedan quedar VIEJOS en silencio: si una versión
 * nueva de Poppins cambia una métrica, los overrides escritos a mano dejan de describir la
 * fuente y vuelven a agregar salto, sin que falle nada más.
 */
function metricasDelWoff(ruta: string) {
  const buf = readFileSync(ruta);
  expect(buf.toString('latin1', 0, 4), `${ruta} no es un WOFF`).toBe('wOFF');
  const numTables = buf.readUInt16BE(12);
  const tablas: Record<string, Buffer> = {};
  for (let i = 0; i < numTables; i++) {
    const d = 44 + i * 20;
    const tag = buf.toString('latin1', d, d + 4);
    const off = buf.readUInt32BE(d + 4);
    const comp = buf.readUInt32BE(d + 8);
    const orig = buf.readUInt32BE(d + 12);
    if (tag !== 'head' && tag !== 'hhea') continue;
    const crudo = buf.subarray(off, off + comp);
    tablas[tag] = comp < orig ? inflateSync(crudo) : crudo;
  }
  const head = tablas.head;
  const hhea = tablas.hhea;
  expect(head && hhea, `${ruta} no trae head/hhea`).toBeTruthy();
  return {
    unitsPerEm: head.readUInt16BE(18),
    ascender: hhea.readInt16BE(4),
    descender: hhea.readInt16BE(6),
    lineGap: hhea.readInt16BE(8),
  };
}

const archivoWoff = (peso: number) =>
  join(RAIZ, 'node_modules', '@fontsource', 'poppins', 'files', `poppins-latin-${peso}-normal.woff`);

/** El valor de un token del `@theme inline`. */
const token = (nombre: string) => {
  const temas = bloquesAt(BLOQUES, '@theme');
  for (const t of temas) {
    const v = valor(t.cuerpo, `--${nombre}`);
    if (v) return v;
  }
  return null;
};

/** Las familias de una pila de fuentes, sin comillas. */
const pila = (valorDelToken: string) =>
  valorDelToken.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, ''));

describe('Poppins no viene de Google', () => {
  it('el layout no nombra ningún dominio de Google Fonts', () => {
    expect(GOOGLE.test(LAYOUT), 'Base.astro sigue pidiéndole la fuente a Google').toBe(false);
  });

  it('ningún archivo de `src/` nombra un dominio de Google Fonts', () => {
    const culpables = fuentesDeSrc().filter((ruta) => GOOGLE.test(readFileSync(ruta, 'utf8')));
    expect(culpables.map((r) => r.slice(RAIZ.length + 1))).toEqual([]);
  });

  it('los 6 pesos del subconjunto `latin` se importan de `@fontsource`', () => {
    const importes = importesDeFontsource();
    const pesos = importes
      .map((i) => Number(/latin-(\d{3})\.css$/.exec(i.especificador)?.[1] ?? NaN))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
    expect(pesos).toEqual(PESOS);
  });

  it('cada archivo importado de `@fontsource` existe', () => {
    const faltan = importesDeFontsource().filter((i) => !existsSync(i.ruta));
    expect(faltan.map((i) => i.especificador)).toEqual([]);
  });
});

describe('la precarga de la fuente', () => {
  it('es EXACTAMENTE una', () => {
    const deFuente = precargas().filter((p) => /as="font"/.test(p));
    expect(deFuente).toHaveLength(1);
  });

  it('no hay otra precarga que no sea la de la fuente', () => {
    expect(precargas().filter((p) => !/as="font"/.test(p))).toEqual([]);
  });

  it('lleva `type="font/woff2"` y `crossorigin`', () => {
    const [p] = precargas().filter((e) => /as="font"/.test(e));
    expect(p, 'no hay precarga de fuente').toBeTruthy();
    // Sin `crossorigin` el navegador DESCARTA la precarga y vuelve a pedir el archivo:
    // una fuente se pide siempre en modo CORS anónimo.
    expect(p).toMatch(/crossorigin/);
    expect(p).toMatch(/type="font\/woff2"/);
  });

  it('apunta a un peso que la primera pantalla pinta de verdad', () => {
    const [imp] = importesDeWoff2();
    expect(imp, 'no hay ningún `import … .woff2?url`').toBeTruthy();
    expect(PESOS_DE_LA_PRIMERA_PANTALLA).toContain(imp.peso);
  });

  it('usa el `import … ?url` y no una ruta escrita a mano', () => {
    const importes = importesDeWoff2();
    expect(importes).toHaveLength(1);
    const [p] = precargas().filter((e) => /as="font"/.test(e));
    // `href={nombreDelImport}`: una cadena a mano haría que Vite emita el activo con
    // hash para el CSS y la precarga pida OTRA URL = el mismo woff2 dos veces.
    expect(p).toContain(`href={${importes[0].nombre}}`);
  });

  it('el woff2 que precarga existe en `node_modules`', () => {
    const [imp] = importesDeWoff2();
    const ruta = join(RAIZ, 'node_modules', imp.especificador.replace(/\?url$/, ''));
    expect(existsSync(ruta), `no existe ${imp.especificador}`).toBe(true);
  });
});

describe('ningún `@font-face` deja el texto invisible', () => {
  it('`global.css` no usa `font-display: block`', () => {
    const malas = caras().filter((c) => /font-display\s*:\s*block/i.test(c.cuerpo));
    expect(malas.map((c) => c.cuerpo)).toEqual([]);
  });

  it('los `@font-face` de `@fontsource` declaran `font-display: swap`', () => {
    const problemas = importesDeFontsource()
      .filter((i) => existsSync(i.ruta))
      .flatMap((i) => {
        const texto = readFileSync(i.ruta, 'utf8');
        const propias = bloquesAt(bloques(sinComentarios(texto)), '@font-face');
        return propias
          .filter((c) => valor(c.cuerpo, 'font-display') !== 'swap')
          .map((c) => `${i.especificador}: ${valor(c.cuerpo, 'font-display')}`);
      });
    expect(problemas).toEqual([]);
  });
});

describe('la familia de respaldo con las métricas de Poppins', () => {
  it('hay caras de respaldo (las que llevan `size-adjust`)', () => {
    expect(carasDeRespaldo().length).toBeGreaterThan(0);
  });

  it('todas son de la MISMA familia', () => {
    const familias = new Set(
      carasDeRespaldo().map((c) => valor(c.cuerpo, 'font-family')?.replace(/^['"]|['"]$/g, '')),
    );
    // Dos nombres distintos piden dos entradas en la pila de fuentes, y olvidarse de una
    // deja ese rango de pesos sin ajustar sin que nada falle.
    expect([...familias]).toHaveLength(1);
  });

  it('los rangos de peso cubren 100–1000 sin huecos', () => {
    const rangos = carasDeRespaldo()
      .map((c) => rangoDePeso(c.cuerpo))
      .filter((r): r is [number, number] => r !== null)
      .sort((a, b) => a[0] - b[0]);
    expect(rangos.length, 'alguna cara de respaldo no declara `font-weight`').toBe(
      carasDeRespaldo().length,
    );
    // Un peso fuera de todo rango cae a `system-ui` SIN ajustar: el salto vuelve justo
    // para ese texto, y nada lo delata.
    expect(rangos[0][0]).toBeLessThanOrEqual(100);
    expect(rangos[rangos.length - 1][1]).toBeGreaterThanOrEqual(1000);
    for (let i = 1; i < rangos.length; i++) {
      expect(rangos[i][0], `hueco entre ${rangos[i - 1][1]} y ${rangos[i][0]}`).toBe(
        rangos[i - 1][1] + 100,
      );
    }
  });

  it.each([400, 500, 600, 700, 800, 900])(
    'las métricas del woff2 del peso %i son las que dice el comentario',
    (peso) => {
      const m = metricasDelWoff(archivoWoff(peso));
      // Si una versión nueva de Poppins cambia esto, los overrides de abajo quedan viejos.
      expect(m).toEqual({ unitsPerEm: 1000, ascender: 1050, descender: -350, lineGap: 100 });
    },
  );

  it('cada cara declara los overrides = métrica ÷ size-adjust', () => {
    const m = metricasDelWoff(archivoWoff(900));
    for (const cara of carasDeRespaldo()) {
      const s = porcentaje(cara.cuerpo, 'size-adjust');
      expect(s, `${cara.selector} sin size-adjust`).not.toBeNull();
      expect(s!).toBeGreaterThan(50);
      expect(s!).toBeLessThan(200);
      const factor = s! / 100;
      const esperado = (unidades: number) => (Math.abs(unidades) / m.unitsPerEm / factor) * 100;
      // ⚠️ DIVIDIDOS por el `size-adjust`, porque escala también las métricas
      // sobreescritas. Medido el 2026-11-09: crudos dan 154 px donde Poppins da 150.
      // Escribirlos crudos AGREGA salto en vez de quitarlo.
      expect(porcentaje(cara.cuerpo, 'ascent-override')).toBeCloseTo(esperado(m.ascender), 2);
      expect(porcentaje(cara.cuerpo, 'descent-override')).toBeCloseTo(esperado(m.descender), 2);
      expect(porcentaje(cara.cuerpo, 'line-gap-override')).toBeCloseTo(esperado(m.lineGap), 2);
    }
  });

  it('ninguna descarga nada: su `src` es solo `local()`', () => {
    for (const cara of carasDeRespaldo()) {
      const src = valor(cara.cuerpo, 'src') ?? '';
      expect(src).toMatch(/local\(/);
      expect(src, 'una cara de respaldo con `url()` es una descarga más').not.toMatch(/url\(/);
    }
  });

  it.each(['font-sans', 'font-display'])(
    '`--%s` nombra la cara de respaldo entre Poppins y el respaldo del sistema',
    (nombre) => {
      const v = token(nombre);
      expect(v, `no existe --${nombre}`).toBeTruthy();
      const familias = pila(v!);
      const respaldo = valor(carasDeRespaldo()[0]?.cuerpo ?? '', 'font-family')?.replace(
        /^['"]|['"]$/g,
        '',
      );
      expect(respaldo, 'la cara de respaldo no declara `font-family`').toBeTruthy();
      // Declarar la cara y no nombrarla acá es un no-op silencioso: el salto vuelve entero.
      expect(familias).toContain(respaldo);
      expect(familias.indexOf('Poppins')).toBe(0);
      expect(familias.indexOf(respaldo!)).toBe(1);
      expect(familias.indexOf(respaldo!)).toBeLessThan(familias.indexOf('system-ui'));
    },
  );
});
