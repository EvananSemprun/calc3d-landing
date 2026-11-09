import type { GrupoOpcionesApi } from './producto';

/**
 * Los días de entrega de lo que el visitante eligió.
 *
 * Hasta el 2026-11-09 el plazo era del producto entero, así que el dueño lo escribía a
 * mano DENTRO del nombre de la opción («20 cm · 3 días»): texto suelto, que la ficha no
 * podía comparar y que el carrito no podía sumar. Ahora cada opción puede traer los
 * suyos y esto resuelve cuál vale.
 *
 * Reglas, en orden:
 * 1. Si alguna opción ELEGIDA trae días propios, manda **la más lenta**: nada sale antes
 *    de que esté lo que más tarda. No se suman (son procesos en paralelo, no en fila) ni
 *    se promedian.
 * 2. Si ninguna trae, manda el del producto.
 * 3. Si no hay ninguno, `null` — la ficha no muestra plazo en vez de inventar uno.
 *
 * ⚠️ **`0` es un valor, no un hueco.** Una opción con 0 días es «sale hoy»; tratarla
 * como ausente mostraría el plazo del producto y el dueño no podría ofrecer entrega el
 * mismo día. Por eso se compara con `!= null` y nunca con un `||`.
 */
export function diasDeEntrega(
  producto: { leadTimeDays?: number | null; optionGroups?: GrupoOpcionesApi[] },
  elegido: Record<string, string>,
): number | null {
  const propios: number[] = [];
  for (const grupo of producto.optionGroups ?? []) {
    const valor = elegido[grupo.name];
    if (valor == null) continue;
    const opcion = grupo.options.find((o) => o.value === valor);
    if (opcion?.leadTimeDays != null) propios.push(opcion.leadTimeDays);
  }
  if (propios.length > 0) return Math.max(...propios);
  return producto.leadTimeDays ?? null;
}

/** «Listo en 3 días» / «Listo en 1 día», o null si no hay plazo que prometer. */
export function textoDeEntregaElegida(dias: number | null): string | null {
  if (dias == null) return null;
  if (dias === 0) return 'Listo hoy';
  return `Listo en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}
