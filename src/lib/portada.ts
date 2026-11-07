// Qué entra en la portada. Puro (sin DOM ni React) para poder probarlo en node.
//
// ⚠️ Acá NO va el filtro de las categorías de la portada: ya existe
// `raicesConProductos` (`paginacion.ts`), que `cargarTienda()` llama y sirve como
// `raices` a todas las páginas. Una segunda definición del mismo filtro se desincroniza.
import type { ProductoVitrina } from './producto';

/** Lugares de la franja «Destacados». */
export const TOPE_DESTACADOS = 4;

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
