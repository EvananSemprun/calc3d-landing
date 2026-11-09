// Precios de la vitrina. Todo en USD (la base del sistema): los bolívares son
// presentación y se calculan al mostrar, este módulo NO convierte moneda.
// Los porcentajes son FRACCIONES (0.1 = 10 %).

/**
 * Tramo de mayoreo: desde `minQty` unidades.
 *
 * **Dos formas**, y hay que aceptar las dos: `unitPriceUsd` es el precio unitario de
 * lista para ese tramo (la nueva, 2026-11-08, la que permite precios redondos) y
 * `discountPct` el descuento en fracción (la vieja, viva en fichas ya publicadas).
 * Quitar la segunda deja esos productos sin mayoreo sin un solo error.
 */
export interface TramoPrecio {
  minQty: number;
  discountPct?: number;
  unitPriceUsd?: number;
}

/** Lo mínimo que necesita saber del producto el cálculo del renglón. */
export interface ProductoConPrecio {
  price: number;
  priceTiers?: TramoPrecio[] | null;
}

/** Un renglón del carrito: `unit` es el unitario SIN tramo (base + recargos de opción). */
export interface RenglonPrecio {
  unit?: number;
  qty: number;
}

/**
 * Precio unitario tras el mayor tramo aplicable (minQty <= qty). Sin tramos,
 * baseUnit. Reimplementa precioConTramos de @calc3d/shared: la tienda no
 * importa shared.
 */
export function precioConTramos(
  baseUnit: number,
  qty: number,
  tiers: readonly TramoPrecio[] | null | undefined,
  recargos = 0,
): number {
  const t = (tiers || []).filter((x) => qty >= x.minQty).sort((a, b) => b.minQty - a.minQty)[0];
  if (!t) return baseUnit;
  // El precio fijo reemplaza al de LISTA; los recargos de opción se cobran encima. Si
  // reemplazara todo, a partir del tramo el tamaño grande saldría gratis.
  if (t.unitPriceUsd !== undefined) {
    return Math.round((t.unitPriceUsd + recargos) * 10000) / 10000;
  }
  return Math.round(baseUnit * (1 - (t.discountPct ?? 0)) * 10000) / 10000;
}

/**
 * El descuento de un tramo, en fracción, PARA MOSTRARLO (el "−17 %" de la ficha). Nunca
 * para cobrar. Con un tramo por precio fijo lo deriva del precio de lista, así no hay un
 * segundo número que mantener de acuerdo con el primero. `null` si no se puede.
 */
export function descuentoDeTramo(precioLista: number, tramo: TramoPrecio): number | null {
  if (tramo.unitPriceUsd === undefined) return tramo.discountPct ?? null;
  if (!(precioLista > 0)) return null;
  return Math.round((1 - tramo.unitPriceUsd / precioLista) * 10000) / 10000;
}

/**
 * Precio unitario de un renglón del carrito aplicando el tramo según su cantidad
 * ACTUAL. `item.unit` es el unitario SIN tramo (base + recargos de opción), que
 * se congela al agregar; el tramo se recalcula acá con `item.qty`, así bajar o
 * subir la cantidad en el carrito actualiza el precio. Sin producto, usa `unit`.
 */
export function precioUnitarioItem(
  item: RenglonPrecio,
  product: ProductoConPrecio | null | undefined,
): number {
  const base = typeof item.unit === 'number' ? item.unit : (product?.price ?? 0);
  return precioConTramos(base, item.qty, product?.priceTiers ?? []);
}

/**
 * Equivalente en la moneda de la tasa vigente ("1.234,5"), o null si el negocio no
 * publica tasa (solo USD). Es PRESENTACIÓN: la base del sistema es USD.
 */
export function equivalenteEnMoneda(
  usd: number,
  tasa: { rate: number } | null | undefined,
): string | null {
  if (!tasa) return null;
  return (usd * tasa.rate).toLocaleString('es-VE', { maximumFractionDigits: 2 });
}

/**
 * Total de un renglón en USD: unitario (ya con su tramo) por cantidad, redondeado
 * a centavos.
 *
 * ⚠️ El redondeo es POR RENGLÓN y no al final de la suma, porque es el número que
 * el cliente ve línea por línea: multiplicar flotantes sin redondear deja totales
 * como 3.7500000000000004, y sumarlos hace que el pie del carrito no coincida con
 * la suma de lo que está escrito arriba.
 *
 * Es la MISMA definición que usa la ficha al mostrar «N × precio = total» y el
 * carrito al sumar el pedido: si se separan, los dos números dejan de cuadrar.
 */
export function totalRenglon(unit: number, qty: number): number {
  return Math.round(unit * qty * 100) / 100;
}
