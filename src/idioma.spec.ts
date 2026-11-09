/**
 * LA TIENDA HABLA DE TÚ, NO DE VOS (2026-11-09).
 *
 * El sitio nació con voseo argentino («mirá», «tenés», «contanos») y el negocio es
 * venezolano: el cliente leía a alguien de otro país. Se pasó todo a «tú».
 *
 * ⚠️ Esto no prueba la traducción —esa se hizo a mano y se lee—, es el GUARDIÁN: sin
 * él, el próximo texto que alguien escriba de memoria vuelve a entrar en voseo y nadie
 * se entera hasta que lo ve un cliente. Por eso mira el código fuente y no una pantalla
 * renderizada: lo que hay que atajar es el texto recién escrito.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Formas de voseo que de verdad aparecieron en texto de cara al usuario.
 *
 * ⚠️ Es una lista a mano y no un patrón general («cualquier palabra terminada en -ás»)
 * porque ese patrón se come «además», «después», «atrás» y «quizás», y un guardián que
 * grita por todo termina desactivado.
 *
 * ⚠️ **SIN ``, igual que `LUGAR`, y por el mismo motivo.** La primera versión usaba
 * `…` y por eso NO encontraba ninguna forma terminada en vocal acentuada: «mirá»,
 * «probá», «elegí». En JavaScript una vocal acentuada no es carácter de palabra, así
 * que después de la «á» no hay frontera que valer. Quedó «Mirá por categoría» en la
 * portada, publicado, hasta el 2026-11-09. Las que terminan en «s» sí se encontraban,
 * y eso hizo parecer que el guardián funcionaba.
 */
const LETRA = '[a-záéíóúñA-ZÁÉÍÓÚÑ]';
const FORMAS = [
  'vos',
  'mirá',
  'mirálo',
  'tenés',
  'tenelo',
  'elegís',
  'elegí',
  'podés',
  'contanos',
  'contás',
  'contá',
  'encargás',
  'escribinos',
  'escribí',
  'querés',
  'coordinás',
  'pagás',
  'revisás',
  'revisá',
  'aprobás',
  'buscás',
  'encontrás',
  'necesitás',
  'mandanos',
  'mandá',
  'preguntanos',
  'confirmalo',
  'probá',
  'acordate',
  'fijate',
  'sabés',
  'decís',
  'decinos',
  'avisanos',
  'llevate',
  'pedilo',
  'pedí',
  'hacé',
  'armá',
  'cargá',
  'agregá',
  'poné',
  'sumá',
  'usá',
  'andá',
  'guardá',
  'dale',
];
const VOSEO = new RegExp(`(?<!${LETRA})(${FORMAS.join('|')})(?!${LETRA})`, 'i');

/**
 * Argentinismos de lugar.
 *
 * ⚠️ **Sin `\b`, y no es un descuido.** En JavaScript `\b` mira si al lado hay un
 * carácter de palabra, y una vocal acentuada NO lo es: un `/\bacá\b/` no encuentra
 * «desde acá», porque después de la «á» no hay frontera que valer. La primera versión
 * de este test pasó en VERDE con «desde acá» escrito en la portada. Van miradas
 * laterales explícitas en su lugar.
 */
const LUGAR = /(?<![a-záéíóúñ])(acá|allá)(?![a-záéíóúñ])/i;

function archivos(dir: string, acc: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) archivos(ruta, acc);
    else if (/\.(astro|tsx)$/.test(entrada) && !/\.spec\.tsx$/.test(entrada)) acc.push(ruta);
  }
  return acc;
}

/**
 * Deja el archivo sin comentarios, conservando los saltos de línea para que el número
 * que se reporta siga siendo el real.
 *
 * ⚠️ **Los de BLOQUE también.** Saltar solo las líneas que empiezan con `*` o `//` deja
 * adentro el cuerpo de un comentario de varias líneas, y el test marcó una nota del
 * código como si fuera texto de la tienda. El guardián del `//` mira que no venga
 * detrás de dos puntos, o se comería `https://`.
 */
function sinComentarios(fuente: string): string {
  const enBlanco = (m: string) => m.replace(/[^\r\n]/g, ' ');
  return fuente.replace(/\/\*[\s\S]*?\*\//g, enBlanco).replace(/(^|[^:])\/\/.*$/gm, enBlanco);
}

function hallazgos(patron: RegExp, fuentes: string[]): string[] {
  const encontrado: string[] = [];
  for (const ruta of fuentes) {
    sinComentarios(readFileSync(ruta, 'utf8'))
      .split('\n')
      .forEach((linea, i) => {
        const m = linea.match(patron);
        if (m) encontrado.push(`${ruta}:${i + 1} → «${m[0]}»`);
      });
  }
  return encontrado;
}

describe('el texto de la tienda está en español de Venezuela', () => {
  const fuentes = archivos('src');

  it('encuentra archivos que revisar (si no, el test no prueba nada)', () => {
    expect(fuentes.length).toBeGreaterThan(30);
  });

  it('no quedó ni una forma de voseo en texto de cara al usuario', () => {
    expect(hallazgos(VOSEO, fuentes)).toEqual([]);
  });

  it('tampoco «acá» ni «allá»', () => {
    expect(hallazgos(LUGAR, fuentes)).toEqual([]);
  });
});
