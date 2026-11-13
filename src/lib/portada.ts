// Qué entra en la portada. Puro (sin DOM ni React) para poder probarlo en node.
//
// ⚠️ Acá NO va el filtro de las categorías de la portada: ya existe
// `raicesConProductos` (`paginacion.ts`), que `cargarTienda()` llama y sirve como
// `raices` a todas las páginas. Una segunda definición del mismo filtro se desincroniza.
import type { ProductoVitrina } from './producto';

/**
 * Lugares de la franja «Destacados» de la PORTADA: dos filas de cuatro.
 * Eran 4 hasta el 2026-11-09 y la portada se veía vacía — el dueño pidió el doble.
 */
export const TOPE_DESTACADOS = 8;

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

/** La colección que publica la API (`GET /public/store/coleccion`), con sus productos adaptados. */
export interface ColeccionPortada {
  titulo: string;
  subtitulo: string | null;
  /** Viaja por SLUG: la API no publica ids internos. */
  verTodo: { tipo: 'NONE' | 'CATEGORIA' | 'COLECCION'; valor: string | null };
  productos: ProductoVitrina[];
}

/** Lo que dibuja la franja de la portada, sea colección o «Destacados». */
export interface FranjaPortada {
  titulo: string;
  subtitulo: string | null;
  /** null = sin enlace «Ver todo». */
  verTodoHref: string | null;
  productos: ProductoVitrina[];
}

/**
 * Qué muestra la franja principal de la portada.
 *
 * ⚠️ SIN colección vigente (`null`) cae a «Destacados», no a una lista vacía: es el estado
 * del día uno —el dueño todavía no creó ninguna— y la portada tiene que verse como siempre.
 *
 * Los productos de una colección van en el orden que fijó el dueño: NO pasan por
 * `destacadosDe`, que los reordenaría por insignia y desharía su orden.
 *
 * ⚠️ El «Ver todo» a otra COLECCIÓN no genera enlace: la tienda todavía no tiene la página
 * `/coleccion/<slug>/`, y publicar la ruta sería un enlace muerto. Cuando exista, se cablea acá.
 */
export function franjaDePortada(
  coleccion: ColeccionPortada | null,
  completos: readonly ProductoVitrina[],
  tope: number,
): FranjaPortada {
  if (!coleccion) {
    return {
      titulo: 'Destacados',
      subtitulo: null,
      verTodoHref: '/tienda/',
      productos: destacadosDe(completos, tope),
    };
  }
  const { tipo, valor } = coleccion.verTodo;
  return {
    titulo: coleccion.titulo,
    subtitulo: coleccion.subtitulo,
    verTodoHref: tipo === 'CATEGORIA' && valor ? `/tienda/${encodeURIComponent(valor)}/` : null,
    productos: coleccion.productos.slice(0, tope),
  };
}
