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
 * EL IMPERATIVO EN `-á`, POR PATRÓN (2026-11-11).
 *
 * ⚠️ **La lista de arriba tenía un agujero estructural, y dejó DOS textos publicados.**
 * Caza lo que alguien pensó en poner; un imperativo de un verbo que no esté enumerado
 * pasa en verde, y el español tiene cientos. Los dos que sobrevivieron hasta hoy:
 * «coordiná» en la franja del encabezado y **«Cotizá» en la meta description**, o sea el
 * texto que Google muestra. La suite estuvo verde con los dos adentro desde el 09/11.
 *
 * El arreglo es el mismo que ya funciona para el presente: un PATRÓN con su lista blanca.
 * Toda palabra terminada en «á» se marca, salvo las contadas que no son verbos.
 *
 * ⚠️ **El primer intento excluía los futuros (`será`, `costará`) dejando fuera lo que
 * termina en `-rá`, y ESTABA MAL**: se comía los imperativos de todos los verbos en
 * `-rar`, que son los más comunes de una tienda — «mirá», «comprá», «esperá», «mostrá».
 * Lo cazó el test de discriminación de abajo. Es el mismo error que ya se había cometido
 * horas antes en el guardián de la API, donde una exención de `-rás` escondía «comprás» y
 * «cobrás»: la regla ortográfica NO separa el imperativo del futuro («mirá» y «vivirá»
 * terminan los dos en «irá»), así que hay que elegir hacia qué lado fallar.
 *
 * **Se eligió fallar hacia el FALSO POSITIVO**, y el costo está medido: en TODO el código
 * fuente hay tres palabras terminadas en «á» —`está` y los dos defectos— y **ni un solo
 * futuro**. Si algún día alguien escribe «el pedido llegará mañana», este test se pone
 * rojo nombrando esa palabra y el arreglo es sumarla a la lista blanca: una línea, y a la
 * vista. Al revés —dejar pasar un «mirá»— el defecto se publica y nadie se entera.
 *
 * ⚠️ **`-é` y `-í` quedan FUERA del patrón a propósito**: chocan con el pretérito de «yo»
 * («compré», «pagué», «escribí», «pedí»), que es legítimo y frecuente, y ahí el falso
 * positivo sí sería constante. Esas formas siguen en la lista explícita de arriba.
 */
const PERMITIDAS_EN_A = ['está', 'acá', 'allá', 'quizá', 'ojalá', 'papá', 'mamá', 'sofá'];
const IMPERATIVO_EN_A = new RegExp(
  // Palabra completa terminada en «á» que no esté en la lista blanca.
  `(?<!${LETRA})(?!(?:${PERMITIDAS_EN_A.join('|')})(?!${LETRA}))${LETRA}*á(?!${LETRA})`,
  'i',
);

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
    // ⚠️ **`.ts` TAMBIÉN** (2026-11-10). Barría solo `.astro` y `.tsx`, así que
    // un `.ts` con texto de cara al usuario quedaba afuera **aunque su forma
    // estuviera en la lista**: `lib/pedido.ts` validaba el formulario de pedido
    // con «Escribí tu nombre» y «Escribí un WhatsApp válido» mientras `shared`
    // ya respondía «Escribe tu nombre» — el cliente podía ver las dos personas
    // en la misma pantalla según quién tirara el error.
    else if (/\.(astro|tsx|ts)$/.test(entrada) && !/\.spec\.tsx?$/.test(entrada))
      acc.push(ruta);
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

  it('ni un imperativo en «-á» que la lista no haya previsto', () => {
    // El que caza lo que nadie pensó en enumerar. Es el que faltaba.
    expect(hallazgos(IMPERATIVO_EN_A, fuentes)).toEqual([]);
  });

  it('el patrón distingue el imperativo del futuro y de lo permitido', () => {
    // Sin esto, un patrón que no encontrara NADA pasaría el test de arriba y el agujero
    // seguiría abierto con la suite en verde — que es exactamente lo que pasó con la
    // lista a mano.
    for (const malo of ['Cotizá por WhatsApp', 'coordiná tu pieza', 'mirá el catálogo'])
      expect(IMPERATIVO_EN_A.test(malo), `debería marcar: ${malo}`).toBe(true);

    // ⚠️ Los FUTUROS no están en esta lista a propósito: el patrón los marca, y eso es
    // una decisión, no un descuido (ver el comentario de arriba). Lo que no puede marcar
    // es lo que no es un verbo.
    for (const bueno of ['ya está listo', 'quizá mañana', 'el sofá azul', 'más de 10'])
      expect(IMPERATIVO_EN_A.test(bueno), `NO debería marcar: ${bueno}`).toBe(false);

    // Y la prueba de que la exclusión de `-rá` habría sido un agujero: estos son los
    // imperativos más comunes de una tienda y todos terminan así.
    for (const rar of ['comprá ahora', 'esperá un momento', 'mostrá el catálogo'])
      expect(IMPERATIVO_EN_A.test(rar), `un verbo en -rar también se marca: ${rar}`).toBe(true);
  });
});
