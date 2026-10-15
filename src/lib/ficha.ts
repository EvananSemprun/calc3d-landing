// Lógica pura de la ficha (sin DOM, sin React): la selección inicial de opciones y
// el precio base con recargos. El tramo por cantidad lo aplica `precioConTramos`.
import type { ProductoVitrina } from './producto';

/** Opción elegida por grupo: { [nombre del grupo]: valor }. */
export type Seleccion = Record<string, string>;

/**
 * Selección inicial: la primera opción de cada grupo REQUERIDO (igual que la ficha
 * vieja). Obliga menos y hace que el precio mostrado siempre corresponda a algo
 * pedible. Los grupos opcionales arrancan sin elegir.
 */
export function seleccionInicial(producto: Pick<ProductoVitrina, 'optionGroups'>): Seleccion {
  const sel: Seleccion = {};
  for (const g of producto.optionGroups ?? []) {
    if (g.required && g.options.length) sel[g.name] = g.options[0].value;
  }
  return sel;
}

/**
 * Precio base + los recargos de las opciones elegidas, SIN el tramo por cantidad.
 * Es lo que se congela en el carrito (`item.unit`); el tramo se recalcula después
 * con la cantidad actual del renglón (`precioUnitarioItem`). Guardarlo ya con el
 * descuento del tramo lo aplicaría dos veces.
 */
export function precioBaseConOpciones(
  producto: Pick<ProductoVitrina, 'price' | 'optionGroups'>,
  elegido: Record<string, string | undefined>,
): number {
  let total = producto.price;
  for (const g of producto.optionGroups ?? []) {
    const op = g.options.find((o) => o.value === elegido[g.name]);
    if (op) total += op.priceDeltaUsd || 0;
  }
  return total;
}
