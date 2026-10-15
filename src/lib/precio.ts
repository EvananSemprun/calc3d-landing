// Precios de la vitrina. Todo en USD (la base del sistema): los bolívares son
// presentación y se calculan al mostrar, este módulo NO convierte moneda.
// Los porcentajes son FRACCIONES (0.1 = 10 %).

/** Tramo de mayoreo: desde `minQty` unidades, `discountPct` de descuento sobre el precio final. */
export interface TramoPrecio {
  minQty: number;
  discountPct: number;
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
): number {
  const t = (tiers || []).filter((x) => qty >= x.minQty).sort((a, b) => b.minQty - a.minQty)[0];
  if (!t) return baseUnit;
  return Math.round(baseUnit * (1 - t.discountPct) * 10000) / 10000;
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
