// Qué entra en la portada. Puro (sin DOM ni React) para poder probarlo en node.
import type { Listado } from './paginacion';
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

/**
 * Las categorías raíz reales que se muestran como puertas en la portada.
 * ⚠️ Sin tope: con mil productos las categorías son la navegación, no un adorno;
 * recortarlas escondería parte del catálogo. "Sin categoría" queda afuera.
 */
export function categoriasDePortada(listados: readonly Listado[]): { cat: string; nombre: string; n: number }[] {
  return listados
    .filter((l) => l.sub === null && !l.sinCategoria)
    .map((l) => ({ cat: l.cat, nombre: l.nombre, n: l.productos.length }));
}
