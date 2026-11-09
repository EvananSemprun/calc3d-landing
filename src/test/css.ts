/**
 * El parser de `global.css` que usan los guardianes de CSS. **UNA sola definición.**
 *
 * ⚠️ **Por qué existe este archivo** (2026-11-09): había **tres** implementaciones de
 * `reglas()`/`reglaDe()` sobre el mismo `global.css`, con los mismos nombres y tres
 * semánticas distintas (`hover-con-reduce.spec.ts`, `fotos-reservan-espacio.spec.ts` y
 * `fotos-funden.spec.ts`), y la línea que borra comentarios estaba copiada textual en las
 * tres. El `CLAUDE.md` ya avisa que el día que `global.css` use anidamiento `&:hover` hay
 * que arreglar el parser — con tres, hay que arreglar tres y averiguar cuál miente. Es la
 * misma lección que `textoDeEntrega`/`textoDeMinimo` en `lib/producto.ts`: si hace falta
 * un tercer consumidor, sale de acá.
 *
 * Se mide el **TEXTO** del CSS y no el CSSOM porque los guardianes corren en
 * `environment: node`, sin DOM — y porque jsdom no aplica CSS, así que un
 * `getComputedStyle` daría verde con el CSS roto.
 *
 * Límites conocidos, escritos para el próximo:
 * - ⚠️ **No resuelve el anidamiento** (`.a { &:hover { … } }`): una regla dentro de otra
 *   regla no se devuelve como regla propia. Hoy `global.css` no lo usa; si se empieza a
 *   usar, se arregla **acá** y valen los tres guardianes a la vez.
 * - No entiende cadenas ni `url()`: una llave o un `;` dentro de un `content: "}"` lo
 *   confundiría. Hoy no hay ninguno.
 */

/** El CSS sin comentarios: un comentario que menciona una propiedad no es una regla. */
export function sinComentarios(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** Espacios normalizados, para comparar selectores escritos distinto. */
export const normalizar = (s: string) => s.trim().replace(/\s+/g, ' ');

export interface Regla {
  /** El selector tal cual se escribió (puede ser una lista con comas), normalizado.
      En un bloque `@…` es el at-rule con su prelude (`@font-face`, `@theme inline`). */
  selector: string;
  /** Los selectores de esa lista, uno por uno. */
  selectores: string[];
  /** Las declaraciones, normalizadas. */
  cuerpo: string;
  /** Dónde empieza el selector dentro del texto que se pasó (para ubicarla en bloques). */
  desde: number;
  /** Los `@…` que la envuelven, de afuera hacia adentro (`@layer components`, `@media …`). */
  envoltorios: string[];
  /** `true` si la cabecera empieza con `@`: es un bloque at-rule, no una regla. */
  at: boolean;
}

/**
 * TODOS los bloques con llaves del CSS —reglas y at-rules— con el contexto que los
 * envuelve.
 *
 * Recorre con una **pila** y no con una regex porque lo que hace falta saber es si la
 * regla está DENTRO de un `@layer`, y eso solo se sabe contando llaves: un `@layer`
 * contiene reglas, y una regex de `([^{}]+)\{([^{}]*)\}` encuentra la regla pero pierde
 * quién la envuelve.
 *
 * ⚠️ **Corta la cabecera en `;` salvo donde el `;` separa DECLARACIONES**, o sea dentro
 * de una regla y dentro de un at-rule de declaraciones (`@font-face`, `@theme`…). En
 * todos los demás lugares corta, y eso incluye **dentro de un `@layer` o un `@media`**:
 * sin eso, un at-rule sin bloque (`@import "x";`, `@charset`, `@custom-variant …;`) se
 * pega al selector de la regla siguiente, esa regla pasa a contarse como at-rule y
 * **desaparece** de `reglas()` — el guardián dejaría de verla y saldría verde.
 *
 * ⚠️ Esa protección **tiene que valer a cualquier profundidad, no solo en el nivel de
 * arriba**, y el 2026-11-09 estuvo a punto de quedar valiendo solo arriba al generalizar
 * el recorrido para devolver también los bloques `@…`. Lo cuida
 * `css.spec.ts` con los dos casos (suelto y dentro de un `@layer`), y el segundo da ROJO
 * con la versión débil. Hoy en `global.css` sería inerte —los únicos `;` anidados son
 * `@apply` dentro de reglas— pero es una trampa armada en una red de seguridad que usan
 * **tres** guardianes ajenos a quien la tocó.
 *
 * ⚠️ **Límite conocido, y es OTRO:** el `cuerpo` de un at-rule que contiene REGLAS
 * (`@layer`, `@media`) no sirve — se reinicia con el `}` de cada regla de adentro, así que
 * solo recoge lo que haya después de la última. Los que importan (`@font-face`, `@theme`,
 * `@property`) contienen declaraciones y sí quedan completos.
 */
/**
 * Los at-rules cuyo cuerpo son DECLARACIONES y no reglas: ahí el `;` separa declaraciones
 * igual que dentro de una regla, así que no tiene que cortar la cabecera.
 * (`@theme` también atrapa `@theme inline`.)
 */
const AT_DE_DECLARACIONES = /^@(font-face|theme|property|page|counter-style)\b/;

export function bloques(css: string): Regla[] {
  const salida: Regla[] = [];
  /** Lo abierto, de afuera hacia adentro. `at` distingue un envoltorio de una regla. */
  const pila: { at: boolean; sel: string; desde: number }[] = [];
  let cabeza = '';
  let inicio = -1;

  const reiniciar = () => {
    cabeza = '';
    inicio = -1;
  };

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    /** Lo más interno abierto: una regla, o un at-rule de declaraciones → el `;` separa
        declaraciones y no corta. Cualquier otra cosa (nada abierto, `@layer`, `@media`) →
        corta. */
    const dentro = pila[pila.length - 1];
    const enDeclaraciones = dentro !== undefined && (!dentro.at || AT_DE_DECLARACIONES.test(dentro.sel));

    if (ch === '{') {
      const texto = normalizar(cabeza);
      pila.push({ at: texto.startsWith('@'), sel: texto, desde: inicio < 0 ? i : inicio });
      reiniciar();
    } else if (ch === '}') {
      const abierto = pila.pop();
      if (abierto) {
        salida.push({
          selector: abierto.sel,
          selectores: abierto.sel.split(',').map(normalizar).filter(Boolean),
          cuerpo: normalizar(cabeza),
          desde: abierto.desde,
          envoltorios: pila.filter((p) => p.at).map((p) => p.sel),
          at: abierto.at,
        });
      }
      reiniciar();
    } else if (ch === ';' && !enDeclaraciones) {
      reiniciar();
    } else {
      if (inicio < 0 && ch.trim() !== '') inicio = i;
      cabeza += ch;
    }
  }
  return salida;
}

/** Las reglas del CSS: los bloques que NO son at-rules. */
export function reglas(css: string): Regla[] {
  return bloques(css).filter((b) => !b.at);
}

/**
 * Los bloques de un at-rule, por nombre (`'@font-face'`, `'@theme'`).
 *
 * Compara la primera palabra de la cabecera, así que `@theme` también encuentra
 * `@theme inline`.
 */
export function bloquesAt(todos: Regla[], nombre: string): Regla[] {
  return todos.filter((b) => b.at && b.selector.split(' ')[0] === nombre);
}

/** Las reglas que apuntan a `sel` (su lista de selectores lo incluye, exacto). */
export function reglasCon(todas: Regla[], sel: string): Regla[] {
  return todas.filter((r) => r.selectores.includes(sel));
}

/**
 * Las declaraciones de TODAS las reglas que apuntan a `sel`, pegadas con `;`.
 *
 * Pegarlas es a propósito: una misma clase suele declararse en dos reglas separadas
 * (`.product-photo` tiene la transición en una y el `aspect-ratio` en otra), y lo que
 * importa es si la propiedad está declarada en alguna.
 */
export function reglaDe(todas: Regla[], sel: string): string {
  return reglasCon(todas, sel)
    .map((r) => r.cuerpo)
    .join(';');
}
