import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { reglas } from './test/css';

/**
 * LAS DURACIONES DE MOVIMIENTO SALEN DE LOS TOKENS (2026-11-09, Tarea 7).
 *
 * `global.css` tenía 26 duraciones escritas a mano en 6 valores distintos (150, 180, 200,
 * 300, 350 y 380 ms) y solo 8 usos de los tokens. Un número suelto no falla por ninguna
 * parte: se salta el techo de movimiento del plan (`--dur-lenta`), no se puede revisar de
 * un vistazo y cada pantalla nueva copia el de al lado. Acá se amarra que no vuelvan.
 *
 * Se mide el **TEXTO** de `global.css` y no el CSSOM: estos guardianes corren en
 * `environment: node`, y aunque corrieran en jsdom, jsdom **no aplica CSS** — un
 * `getComputedStyle` daría verde con el archivo entero escrito a mano.
 *
 * ⚠️ **TRES COSAS QUEDAN EXENTAS A PROPÓSITO, Y NO SON LA MISMA.** Un guardián escrito
 * como «ningún número con `s`/`ms` en `global.css`» marcaría las tres y habría que
 * desactivarlo el primer día:
 *
 * 1. **Los RETRASOS.** `animation-delay`/`transition-delay`, y también el segundo valor de
 *    tiempo de un atajo (`transition: visibility 0s var(--dur-panel)`): en un atajo el
 *    PRIMER tiempo es la duración y el resto son retrasos. El escalonado de entrada son
 *    once `animation-delay` de 60 a 450 ms: una SECUENCIA, no duraciones. Meterla en
 *    tokens destruye el efecto, así que queda exenta… y por eso existe el segundo test de
 *    este archivo: exenta no puede significar «sin vigilar».
 * 2. **Las duraciones de valor cero** (`0s`, `0.01ms`). Ahí no hay movimiento que
 *    tokenizar: son la **guardia de `prefers-reduced-motion`** (`0.01ms` es un valor
 *    mágico deliberado) y el `visibility 0s` del panel de filtros, que cambia de golpe a
 *    propósito. ⚠️ Se eximen **por su valor y no por dónde viven**: un guardián que
 *    eximiera «el bloque de la guardia» tendría que saber ubicarlo, y el día que la
 *    guardia se mueva o se duplique empezaría a mentir.
 * 3. **`src/components/ui/dialog.tsx`**, que trae una utilidad `duration-200` de Tailwind.
 *    Es un componente de shadcn y este guardián lee `global.css`: queda fuera de alcance a
 *    propósito (ver el reporte de la Tarea 7).
 *
 * Y dos cosas que este archivo cuida porque las introdujo esta migración:
 * - **Un `var(--dur-…)` mal escrito no es un error de CSS: es una declaración que se
 *   descarta entera.** `transition: color var(--dur-rapido)` (sin la `a`) deja al elemento
 *   SIN transición, con el build verde y sin un solo aviso en consola. Por eso se exige
 *   que cada token usado esté definido en `lib/tokens.css`.
 * - **El techo de movimiento del plan ahora vive en los tokens.** Si las duraciones salen
 *   de ahí, alcanza con revisar ahí que ninguna pase de `--dur-lenta` (420 ms).
 */

const RUTA_CSS = join(__dirname, 'styles', 'global.css');
const RUTA_TOKENS = join(__dirname, 'lib', 'tokens.css');

const FUENTE = readFileSync(RUTA_CSS, 'utf8');
const TOKENS = readFileSync(RUTA_TOKENS, 'utf8');

/**
 * El CSS con los comentarios EN BLANCO, conservando sus saltos de línea.
 *
 * ⚠️ No es una segunda copia de `sinComentarios()` de `test/css.ts`: ésa reemplaza el
 * comentario entero por **un espacio**, así que un comentario de 20 líneas corre 19 líneas
 * todo lo que viene después y este guardián —que reporta LÍNEAS— señalaría la equivocada.
 * Si a un segundo guardián le hace falta la misma cosa, se muda a `test/css.ts`.
 */
const enBlanco = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

const CSS = enBlanco(FUENTE);

/** La línea (1-based) donde cae un índice del texto. */
const lineaDe = (texto: string, i: number) => texto.slice(0, i).split('\n').length;

/** Un tiempo de CSS a milisegundos. `0.2s` → 200, `0.01ms` → 0.01. */
const aMs = (valor: string) => {
  const n = Number.parseFloat(valor);
  return /ms$/.test(valor) ? n : n * 1000;
};

/** Un valor de tiempo literal, tal cual se escribe en CSS. */
const TIEMPO = /^-?\d*\.?\d+(?:ms|s)$/;

/** Las declaraciones de duración/retraso que hay que mirar, y nada más. */
const DECLARACION = /\b(transition|animation)(-duration|-delay)?\s*:\s*([^;{}]*)/g;

/** Una duración escrita a mano, con dónde está y qué dice. */
interface Hallazgo {
  linea: number;
  valor: string;
  declaracion: string;
}

/**
 * Las «capas» de un atajo: `transition: a 1s, b 2s` son dos. Cuenta paréntesis en vez de
 * partir por coma, o las comas de un `cubic-bezier(.22,.61,.36,1)` inventarían capas.
 */
const capasDe = (valor: string): string[] => {
  const salida: string[] = [];
  let actual = '';
  let nivel = 0;
  for (const ch of valor) {
    if (ch === '(') nivel += 1;
    else if (ch === ')') nivel -= 1;
    if (ch === ',' && nivel === 0) {
      salida.push(actual);
      actual = '';
      continue;
    }
    actual += ch;
  }
  salida.push(actual);
  return salida;
};

/**
 * Los tiempos de una capa, EN ORDEN, con los `var(--dur-…)` marcados como tiempo.
 *
 * Que el token cuente como tiempo es lo que mantiene honesta la cuenta de posiciones: en
 * `transition: color var(--dur-rapida) 100ms` el `100ms` es el RETRASO, y si el token no
 * contara, el retraso pasaría por duración y el guardián marcaría una regla correcta.
 * Límite conocido: no resuelve `var()` anidados (`var(--a, 10ms)`); hoy no hay ninguno.
 */
const tiemposDe = (capa: string): string[] => {
  const plano = capa
    .replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, nombre: string) =>
      nombre.startsWith('--dur-') ? ' @token ' : ' @otro ',
    )
    .replace(/[\w-]+\([^()]*\)/g, ' @otro ');
  return plano.split(/\s+/).filter((t) => t === '@token' || TIEMPO.test(t));
};

/** Todas las duraciones escritas a mano de `global.css`, con su línea. */
const duracionesAMano = (): Hallazgo[] => {
  const salida: Hallazgo[] = [];
  for (const m of CSS.matchAll(DECLARACION)) {
    const [todo, , sufijo, valor] = m;
    if (sufijo === '-delay') continue; // Un retraso no es una duración.

    // En el atajo, el primer tiempo de cada capa es la duración; en el longhand
    // `*-duration` lo son todos.
    const sospechosos =
      sufijo === '-duration'
        ? capasDe(valor).flatMap(tiemposDe)
        : capasDe(valor).map((c) => tiemposDe(c)[0] ?? '');

    for (const t of sospechosos) {
      // Un token está bien, y una duración de cero no es movimiento que tokenizar
      // (la guardia de `reduce` y el `visibility 0s` del panel de filtros).
      if (t === '' || t === '@token' || !TIEMPO.test(t) || aMs(t) < 1) continue;
      salida.push({
        linea: lineaDe(CSS, m.index),
        valor: t,
        declaracion: todo.replace(/\s+/g, ' ').trim(),
      });
    }
  }
  return salida;
};

describe('las duraciones de movimiento de global.css', () => {
  it('ninguna DURACIÓN está escrita a mano', () => {
    const hallazgos = duracionesAMano();
    const detalle = hallazgos
      .map((h) => `  global.css:${h.linea} → \`${h.valor}\` en \`${h.declaracion}\``)
      .join('\n');
    expect(
      hallazgos,
      `Hay ${hallazgos.length} duración(es) escrita(s) a mano en global.css:\n${detalle}\n` +
        'Las duraciones salen de los tokens de `lib/tokens.css` (`--dur-rapida`, ' +
        '`--dur-normal`, `--dur-panel`, `--dur-lenta`). Un número suelto se salta el techo ' +
        'de movimiento del plan (`--dur-lenta`, 420 ms) sin que nada falle. Los RETRASOS ' +
        '(el escalonado de entrada) y las duraciones de valor cero (la guardia de ' +
        '`prefers-reduced-motion`) no cuentan: ésas son otra cosa.',
    ).toEqual([]);
  });

  it('cada `var(--dur-…)` que usa global.css está definido en los tokens', () => {
    // Un nombre mal escrito NO es un error de CSS: el navegador descarta la declaración
    // entera y el elemento se queda sin transición, con el build verde y sin un aviso.
    const usados = [...CSS.matchAll(/var\(\s*(--dur-[\w-]+)\s*\)/g)].map((m) => m[1]);
    const definidos = [...enBlanco(TOKENS).matchAll(/(--dur-[\w-]+)\s*:/g)].map((m) => m[1]);
    const huérfanos = [...new Set(usados)].filter((u) => !definidos.includes(u));
    expect(
      huérfanos,
      `global.css usa ${huérfanos.join(', ')}, que no está definido en lib/tokens.css. ` +
        'Un `var()` que no resuelve descarta la declaración entera: el elemento queda SIN ' +
        'transición, sin error en consola y con el build en verde.',
    ).toEqual([]);
  });

  it('ningún token de duración pasa del techo de movimiento (`--dur-lenta`)', () => {
    const definidos = [...enBlanco(TOKENS).matchAll(/(--dur-[\w-]+)\s*:\s*([^;}]+)/g)].map(
      (m) => [m[1], m[2].trim()] as const,
    );
    expect(definidos.length, 'No encontré ningún token `--dur-…` en lib/tokens.css').toBeGreaterThan(1);

    const techo = definidos.find(([n]) => n === '--dur-lenta');
    expect(techo, 'Falta `--dur-lenta`, que ES el techo de movimiento del plan').toBeDefined();
    const maximo = aMs(techo![1]);

    // El techo del plan son 420 ms. Ahora que TODA duración sale de acá, revisarlo acá
    // alcanza: no hace falta perseguir número por número por el CSS.
    const pasados = definidos.filter(([, v]) => aMs(v) > maximo);
    expect(
      pasados.map(([n, v]) => `${n}: ${v}`),
      `Esos tokens pasan el techo de movimiento del plan (\`--dur-lenta\`, ${maximo} ms).`,
    ).toEqual([]);
  });
});

/**
 * El escalonado de entrada queda EXENTO del test de arriba (son `animation-delay`, una
 * secuencia). Sin este test, exento pasaría a significar «sin vigilar»: el día que alguien
 * desordene los retrasos, las tarjetas entrarían de atrás para adelante y no fallaría nada.
 *
 * Lo que se exige es la propiedad que hace al efecto, no los once números: que un hijo más
 * tardío NUNCA entre antes que uno anterior.
 */
describe('el escalonado de entrada', () => {
  /** `.entrada-grid > :nth-child(3)` → base `.entrada-grid >`, paso 3. `> *` → paso 1. */
  const PASO = /^(?<base>.*>)\s*(?:\*|:nth-child\(\s*(?:n\+)?(?<i>\d+)\s*\))$/;

  const pasos = () => {
    const grupos = new Map<string, { paso: number; retraso: number }[]>();
    for (const r of reglas(CSS)) {
      const ms = /animation-delay\s*:\s*([^;}]+)/.exec(r.cuerpo);
      if (!ms) continue;
      for (const sel of r.selectores) {
        const m = PASO.exec(sel);
        if (!m?.groups) continue;
        const lista = grupos.get(m.groups.base) ?? [];
        lista.push({ paso: Number(m.groups.i ?? 1), retraso: aMs(ms[1].trim()) });
        grupos.set(m.groups.base, lista);
      }
    }
    return grupos;
  };

  const ESPERADOS = ['.shop-head .container >', '.entrada-grid >'] as const;

  it.each(ESPERADOS)('`%s *` escalona al menos 3 pasos', (base) => {
    const lista = pasos().get(base) ?? [];
    expect(
      lista.length,
      `El escalonado de \`${base} *\` desapareció o quedó en ${lista.length} paso(s). ` +
        'Es la entrada escalonada de la cabecera de categoría y de las primeras tarjetas: ' +
        'sin ella todo entra junto y ningún otro test lo nota.',
    ).toBeGreaterThanOrEqual(3);
  });

  it.each(ESPERADOS)('`%s *` crece: un hijo posterior nunca entra antes', (base) => {
    const lista = [...(pasos().get(base) ?? [])].sort((a, b) => a.paso - b.paso);
    const fuera = lista.filter((p, i) => i > 0 && p.retraso <= lista[i - 1].retraso);
    expect(
      fuera.map((p) => `hijo ${p.paso} a ${p.retraso} ms`),
      `En \`${base}\` el escalonado dejó de crecer: ` +
        lista.map((p) => `${p.paso}→${p.retraso}ms`).join(', ') +
        '. Un hijo más tardío con un retraso menor o igual que el anterior hace que las ' +
        'tarjetas entren desordenadas, y eso no lo ve ningún otro test.',
    ).toEqual([]);
  });
});
