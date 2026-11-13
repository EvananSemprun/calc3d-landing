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
  /** Su enlace: `/coleccion/<slug>/`. */
  slug: string;
  titulo: string;
  subtitulo: string | null;
  /** Viaja por SLUG: la API no publica ids internos. */
  verTodo: { tipo: 'NONE' | 'CATEGORIA' | 'COLECCION'; valor: string | null };
  productos: ProductoVitrina[];
}

/** Lo que dibuja la franja de la colección en la portada. */
export interface FranjaPortada {
  titulo: string;
  subtitulo: string | null;
  /** null = sin enlace «Ver todo». */
  verTodoHref: string | null;
  productos: ProductoVitrina[];
}

/**
 * Qué muestra la franja de la colección, bajo el hero.
 *
 * ⚠️ SIN colección vigente (`null`) devuelve `null`: la franja NO se dibuja. NO cae a
 * «Destacados». Hubo una versión que sí caía (cuando la portada tenía UNA sola franja y
 * Destacados ocupaba su lugar); ahora «Destacados» es una franja propia que SIEMPRE está
 * más abajo, y caer a ella desde acá la mostraría dos veces. Si un plan viejo dice «sin
 * colección cae a Destacados», está superado: el dueño pidió poder vaciar ese espacio
 * desde el panel.
 *
 * Los productos de una colección van en el orden que fijó el dueño: NO pasan por
 * `destacadosDe`, que los reordenaría por insignia y desharía su orden.
 *
 * El «Ver todo» a otra COLECCIÓN lleva a su página (`/coleccion/<slug>/`). La API ya lo
 * degrada a NONE si esa colección no tiene página hoy (oculta, vencida o borrada).
 */
export function franjaDePortada(coleccion: ColeccionPortada | null, tope: number): FranjaPortada | null {
  if (!coleccion) return null;
  const { tipo, valor } = coleccion.verTodo;
  return {
    titulo: coleccion.titulo,
    subtitulo: coleccion.subtitulo,
    verTodoHref: valor ? rutaDeVerTodo(tipo, valor) : null,
    productos: coleccion.productos.slice(0, tope),
  };
}

/** Adónde lleva un «Ver todo» por SLUG. NONE no lleva a ningún lado. */
function rutaDeVerTodo(tipo: ColeccionPortada['verTodo']['tipo'], valor: string): string | null {
  if (tipo === 'CATEGORIA') return `/tienda/${encodeURIComponent(valor)}/`;
  if (tipo === 'COLECCION') return rutaDeColeccion(valor);
  return null;
}

/** La página de una colección. Con barra final, como el resto de las rutas del sitio. */
export function rutaDeColeccion(slug: string): string {
  return `/coleccion/${encodeURIComponent(slug)}/`;
}
