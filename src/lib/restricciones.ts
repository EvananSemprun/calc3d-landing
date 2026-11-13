// Opciones que EXIGEN una medida mínima de otro grupo.
//
// El catálogo no sabe expresar «esta opción necesita esta otra»: los grupos de opciones
// son independientes y se suman sin mirarse (`precioBaseConOpciones`). Por eso el árbol de
// Navidad se podía pedir en **12 cm con 7 nombres**, que no entran, y se cobraba $9,50
// cuando con los 18 cm que hacen falta son $16,50 — **$7 regalados por pedido**.
//
// ⚠️ **LA REGLA LA ESCRIBE EL DUEÑO EN LA ETIQUETA DE LA OPCIÓN**, y de ahí se lee:
// «7 nombres · desde 18 cm». Es una convención suya que ya existía en el catálogo y que
// nadie leía. Decisión del dueño (2026-11-11) frente a las otras dos salidas: un mecanismo
// de dependencias en el modelo (correcto, pero es migración + contrato + pantalla de panel)
// o partir el producto en dos (sin código, pero le cambia el catálogo y las URLs).
//
// ⚠️ **EL LÍMITE, DICHO: esto depende de un TEXTO.** Si algún día la etiqueta se escribe de
// otra forma —«7 nombres (18 cm o más)»— la regla deja de aplicar **y nada falla**: vuelve
// el comportamiento de hoy, que es el bug. No se rompe nada, se deja de proteger. Por eso
// `restriccion-del-texto.spec.ts` fija las formas exactas que se reconocen, y por eso acá
// no hay ningún `slug` ni nombre de grupo escrito a mano: lo único que se nombra es el
// patrón que el dueño ya usa.

import type { GrupoOpcionesApi } from './producto';

/** Las formas de «desde N cm» que se reconocen. Ampliar acá, con su test. */
const EXIGE = /\bdesde\s+(\d+(?:[.,]\d+)?)\s*cm\b/i;

/** Una etiqueta que ES una medida: «18 cm». Tiene que ser TODA la etiqueta. */
const ES_MEDIDA = /^\s*(\d+(?:[.,]\d+)?)\s*cm\s*$/i;

const aNumero = (s: string) => Number(s.replace(',', '.'));

/** «7 nombres · desde 18 cm» → 18. Sin la marca, `null`. */
export function medidaExigida(etiqueta: string): number | null {
  const m = EXIGE.exec(etiqueta);
  return m ? aNumero(m[1]) : null;
}

/** «18 cm» → 18. Cualquier otra cosa, `null`. */
export function medidaDeOpcion(etiqueta: string): number | null {
  const m = ES_MEDIDA.exec(etiqueta);
  return m ? aNumero(m[1]) : null;
}

/**
 * El grupo cuyas opciones son TODAS medidas. Se deriva de los datos: no se busca un grupo
 * llamado «Tamaño», porque el dueño puede llamarlo «Medida» o «Alto» y la regla tiene que
 * seguir valiendo. Con dos grupos así —que hoy no existe— manda el primero, y está dicho
 * acá en vez de elegirlo en silencio.
 */
export function grupoDeMedidas(grupos: GrupoOpcionesApi[]): GrupoOpcionesApi | null {
  return (
    grupos.find((g) => g.options.length > 0 && g.options.every((o) => medidaDeOpcion(o.value) !== null)) ??
    null
  );
}

export interface Restriccion {
  /** El grupo de medidas cuyas opciones se bloquean. */
  grupo: string;
  /** La medida mínima que exige lo elegido. */
  minimo: number;
  /** Los valores de ese grupo que NO alcanzan. */
  bloqueadas: string[];
  /** Quién la exige, para poder explicarlo: «7 nombres · desde 18 cm». */
  porque: string;
}

/**
 * Qué opciones de medida quedan prohibidas por lo que ya está elegido en los otros grupos.
 *
 * Toma el máximo de todos los mínimos exigidos: si dos opciones elegidas piden 18 y 26,
 * manda 26. Devuelve `null` cuando no hay nada que bloquear — que es el caso de **todos**
 * los demás productos del catálogo, y por eso esto no tiene costo para ellos.
 */
export function restriccionDeMedida(
  grupos: GrupoOpcionesApi[],
  elegido: Record<string, string | undefined>,
): Restriccion | null {
  const medidas = grupoDeMedidas(grupos);
  if (!medidas) return null;

  let minimo = 0;
  let porque = '';
  for (const g of grupos) {
    // El propio grupo de medidas no se restringe a sí mismo.
    if (g.name === medidas.name) continue;
    const valor = elegido[g.name];
    if (!valor) continue;
    const exige = medidaExigida(valor);
    if (exige !== null && exige > minimo) {
      minimo = exige;
      porque = valor;
    }
  }
  if (minimo <= 0) return null;

  const bloqueadas = medidas.options
    .filter((o) => {
      const m = medidaDeOpcion(o.value);
      return m !== null && m < minimo;
    })
    .map((o) => o.value);

  // Nada que bloquear (la etiqueta pide un mínimo que todas cumplen) no es una
  // restricción: devolverla haría que la pantalla explicara algo que no está pasando.
  return bloqueadas.length ? { grupo: medidas.name, minimo, bloqueadas, porque } : null;
}

/**
 * La selección corregida: si lo elegido en el grupo de medidas quedó prohibido, pasa a la
 * medida permitida MÁS CHICA (la más barata). Si no hay nada que corregir devuelve el
 * MISMO objeto, para que la pantalla pueda comparar por identidad y no avisar de más.
 *
 * ⚠️ Corrige hacia arriba y eso SUBE el precio, así que quien la use tiene que decirlo.
 * Un precio que cambia solo y sin explicación es peor que el bug que esto arregla.
 */
export function corregirSeleccion(
  grupos: GrupoOpcionesApi[],
  elegido: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const r = restriccionDeMedida(grupos, elegido);
  if (!r) return elegido;
  const actual = elegido[r.grupo];
  if (!actual || !r.bloqueadas.includes(actual)) return elegido;

  const permitidas = (grupos.find((g) => g.name === r.grupo)?.options ?? [])
    .map((o) => ({ valor: o.value, medida: medidaDeOpcion(o.value) }))
    .filter((o): o is { valor: string; medida: number } => o.medida !== null && o.medida >= r.minimo)
    .sort((a, b) => a.medida - b.medida);

  // Sin ninguna permitida no se inventa una: se deja lo elegido y la pantalla avisa. Es
  // un producto mal configurado, no algo que la tienda pueda resolver sola.
  if (!permitidas.length) return elegido;
  return { ...elegido, [r.grupo]: permitidas[0].valor };
}

// ───────────────────────── Cuántos nombres hay que escribir ─────────────────────────
//
// Misma idea que arriba: el dato ya está en la etiqueta que escribe el dueño («Hasta 6
// nombres», «7 nombres · desde 18 cm»), y de ahí se lee cuántos se pagaron. Con eso el
// campo de personalización deja de ser «(opcional)» y pasa a pedir los nombres de verdad,
// que es lo que el cliente tiene que mandar para que la pieza se pueda hacer.

/** Pide un número SEGUIDO de «nombre/s». «Más de 10 · lo coordinamos» no declara cuántos. */
const CUANTOS = /(\d+)\s+nombres?\b/i;

/** «Hasta 6 nombres» → 6 · «7 nombres · desde 18 cm» → 7 · «Más de 10 · …» → null */
export function cantidadDeNombres(etiqueta: string): number | null {
  const m = CUANTOS.exec(etiqueta);
  return m ? Number(m[1]) : null;
}

/**
 * Cuántos nombres pide lo que está elegido, mirando TODOS los grupos. `null` = este
 * producto no pide nombres (todo el resto del catálogo) o la opción no declara cuántos
 * («lo coordinamos»), que es distinto de pedir cero.
 */
export function nombresPedidos(
  grupos: GrupoOpcionesApi[],
  elegido: Record<string, string | undefined>,
): number | null {
  for (const g of grupos) {
    const valor = elegido[g.name];
    if (!valor) continue;
    const n = cantidadDeNombres(valor);
    if (n !== null) return n;
  }
  return null;
}

/** ¿Alguna de las opciones elegidas (las del renglón del carrito) pide nombres? */
export function pideNombresLaSeleccion(opts: Record<string, string> | undefined): boolean {
  return Object.values(opts ?? {}).some((v) => cantidadDeNombres(v) !== null);
}

/** Los renglones con texto de verdad. Se ignoran los vacíos y los espacios sueltos. */
export function lineasDeNombres(texto: string): string[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Qué le falta al campo de nombres, o `null` si está bien.
 *
 * ⚠️ `maximo` es un TOPE, no una cantidad exacta: «Hasta 6 nombres» admite 1, y quien
 * eligió 7 puede querer poner 5. Lo que no se puede es pasarse de lo que pagó — ahí el
 * precio ya no alcanza y conviene decirlo antes del pedido y no después.
 */
export function problemaDeNombres(texto: string, maximo: number | null): string | null {
  const lineas = lineasDeNombres(texto);
  if (!lineas.length) return 'Escribe los nombres, uno por línea.';
  if (maximo !== null && lineas.length > maximo) {
    return `Escribiste ${lineas.length} y elegiste ${maximo}. Quita ${lineas.length - maximo} o elige una opción con más nombres.`;
  }
  return null;
}
