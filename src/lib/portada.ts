// Qué entra en la portada. Puro (sin DOM ni React) para poder probarlo en node.
//
// ⚠️ Acá NO va el filtro de las categorías de la portada: ya existe
// `raicesConProductos` (`paginacion.ts`), que `cargarTienda()` llama y sirve como
// `raices` a todas las páginas. Una segunda definición del mismo filtro se desincroniza.
import type { ProductoVitrina } from './producto';

/** Lugares de la franja «Destacados» de la PORTADA: una sola fila de tarjetas. */
export const TOPE_DESTACADOS = 4;

/**
 * Lugares de la franja «Destacados» del índice de la tienda (`/tienda/`): DOS filas.
 * Ahí la franja es el único producto que se ve (el resto de la página son categorías),
 * así que muestra el doble que la portada, donde compite con el hero, las vías y el FAQ.
 * ⚠️ Lo único que cambia entre las dos pantallas es ESTE número: las dos ordenan con
 * `destacadosDe`, o la insignia que pone el dueño serviría en una y no en la otra.
 */
export const TOPE_DESTACADOS_TIENDA = 8;

/**
 * Los productos de la franja «Destacados»: primero los que tienen insignia, después el
 * resto, y se corta en `tope`. Cada mitad conserva el orden de entrada (que ya viene por
 * `position` desde la API).
 * ⚠️ Sin `sort`: un orden estable no necesita reordenarse, y un `sort` invita a cambiar
 * el criterio sin notar que rompe el empate.
 */
export function destacadosDe(productos: readonly ProductoVitrina[], tope: number): ProductoVitrina[] {
  const conBadge = productos.filter((p) => p.badge);
  const sinBadge = productos.filter((p) => !p.badge);
  return [...conBadge, ...sinBadge].slice(0, tope);
}
