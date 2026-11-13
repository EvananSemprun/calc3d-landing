// El tope de unidades por renglón y la única función que acota una cantidad.
//
// ⚠️ **Existe porque NO había tope** (bug en producción, 2026-11-12): escribir o pegar un 1
// y sesenta ceros pasaba el filtro de «solo dígitos», `Number()` lo volvía 1e60 y el
// mensaje de WhatsApp salió con «1e+60 × … Total: $7e+60 BCV». El filtro de caracteres
// nunca fue el hueco; lo era que cualquier cifra, por larga que fuera, se aceptaba.
//
// Una sola definición: el campo, el carrito guardado, `agregar` y la validación del mensaje
// salen de acá. Con una copia en cada lado, el día que cambie el tope uno se queda atrás.

/** Tope por defecto de unidades en un renglón. Un producto puede pedir otro. */
export const MAX_CANTIDAD = 999;

/** El texto del aviso al pasarse del tope. Lo comparten el campo y los tests. */
export const avisoDeTope = (maximo: number = MAX_CANTIDAD): string =>
  `Para más de ${maximo} unidades escríbenos por WhatsApp`;

/** ¿Es una cantidad pedible? Entera, finita y dentro de [minimo, maximo]. */
export function cantidadValida(
  n: unknown,
  minimo = 1,
  maximo: number = MAX_CANTIDAD,
): n is number {
  return (
    typeof n === 'number' &&
    Number.isFinite(n) &&
    Number.isInteger(n) &&
    n >= Math.max(1, minimo) &&
    n <= maximo
  );
}

/**
 * Lleva cualquier número a una cantidad pedible: trunca, sube al mínimo y baja al tope.
 * Un valor que no es número finito (NaN, ±Infinity) cae al mínimo: no hay forma de
 * adivinar qué quiso decir.
 */
export function acotarCantidad(
  n: number,
  minimo = 1,
  maximo: number = MAX_CANTIDAD,
): number {
  const min = Math.max(1, Math.trunc(minimo) || 1);
  if (!Number.isFinite(n)) return min;
  return Math.min(maximo, Math.max(min, Math.trunc(n)));
}
