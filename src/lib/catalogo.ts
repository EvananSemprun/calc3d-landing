// Lógica del catálogo (filtros, orden, URL compartible). Pura: sin DOM ni React, para
// poder probarla en node. Es el porte de `Shop` en tienda/index.html del sitio viejo;
// ante la duda, manda ese comportamiento.
import type { ProductoVitrina } from './producto';
import type { EntradaIndice } from './paginacion';

export type Orden = 'featured' | 'price-asc' | 'price-desc' | 'name';

/** Estado de los filtros (la categoría es la RUTA, no un filtro). Arreglos (no Set) para que React los compare por valor. */
export interface Filtros {
  /** Colores (`value`) — multi-selección. */
  colors: string[];
  maxPrice: number;
  sort: Orden;
}

export interface Categoria {
  slug: string;
  nombre: string;
  /** Slug de la categoría madre; null/ausente en las raíces. */
  parentSlug?: string | null;
}

/** Colores presentes en el catálogo como pares [nombre, hex]. */
export type ColorFiltro = [value: string, hex: string];

/** Datos contra los que se valida lo que llega por la URL. */
export interface ContextoUrl {
  colores: ColorFiltro[];
  tope: number;
}

const ORDENES_VALIDOS: readonly Orden[] = ['price-asc', 'price-desc', 'name'];

/** Los colores salen de los productos reales, no de una lista fija. */
export function coloresDe(productos: readonly ProductoVitrina[]): ColorFiltro[] {
  const colores = new Map<string, string>();
  for (const p of productos) {
    for (const c of p.colorList) colores.set(c.value, c.hex);
  }
  return [...colores];
}

/** El tope del control de precio se ajusta al producto más caro del catálogo real. */
export function topePrecio(productos: readonly { price: number }[]): number {
  return Math.max(120, ...productos.map((p) => Math.ceil(p.price)));
}

export function filtrosIniciales(tope: number): Filtros {
  return { colors: [], maxPrice: tope, sort: 'featured' };
}

export function hayFiltros(f: Filtros, tope: number): boolean {
  return f.colors.length > 0 || f.maxPrice < tope || f.sort !== 'featured';
}

/** Filtra y ordena. No muta la lista original (el orden 'featured' es el de la API). */
export function filtrar<T extends { name: string; price: number; colors: string[] }>(
  productos: readonly T[],
  f: Filtros,
): T[] {
  const lista = productos.filter(
    (p) =>
      (f.colors.length === 0 || p.colors.some((c) => f.colors.includes(c))) &&
      p.price <= f.maxPrice,
  );
  if (f.sort === 'price-asc') lista.sort((a, b) => a.price - b.price);
  else if (f.sort === 'price-desc') lista.sort((a, b) => b.price - a.price);
  else if (f.sort === 'name') lista.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return lista;
}

function lista(valor: string | null): string[] {
  return [...new Set((valor ?? '').split(',').filter(Boolean))];
}

/**
 * Restaura los filtros desde la URL (vista compartible). Un valor que ya no existe en
 * la categoría se IGNORA, no rompe. `cat` y `mat` de enlaces viejos también se ignoran. `search` es `location.search`.
 */
export function filtrosDesdeUrl(search: string, ctx: ContextoUrl): Filtros {
  const q = new URLSearchParams(search);
  const f = filtrosIniciales(ctx.tope);

  f.colors = lista(q.get('col')).filter((c) => ctx.colores.some(([v]) => v === c));

  const max = Number(q.get('max'));
  if (Number.isFinite(max) && max > 0 && max <= ctx.tope) f.maxPrice = max;

  const sort = q.get('sort');
  if (sort && (ORDENES_VALIDOS as readonly string[]).includes(sort)) f.sort = sort as Orden;

  return f;
}

/**
 * Devuelve `href` con los filtros reflejados: la vista es compartible (pasás el link y
 * el otro cae en el catálogo filtrado igual) y volver atrás desde una ficha devuelve
 * lo mismo. Un valor por defecto no se escribe, para no ensuciar; lo ajeno a los
 * filtros (otros parámetros, el hash) se respeta.
 */
export function sincronizarUrl(href: string, f: Filtros, tope: number): string {
  const url = new URL(href);
  const poner = (k: string, v: string) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  poner('col', f.colors.join(','));
  poner('max', f.maxPrice < tope ? String(f.maxPrice) : '');
  poner('sort', f.sort !== 'featured' ? f.sort : '');
  return url.toString();
}

/**
 * Mínimo de productos de la categoría para dibujar el panel de filtros: una fila de
 * tarjetas. Por debajo, el visitante ve la categoría entera de un vistazo y filtrarla no
 * le ahorra nada; el panel solo agrega ruido y hace leer la categoría como un filtro
 * encendido. El borde es inclusivo (con 6 se dibujan).
 */
export const MINIMO_PARA_FILTRAR = 6;

/** ¿Vale la pena mostrar filtros? Se decide sobre el índice de TODA la categoría, nunca sobre la página de 24. */
export function valeLaPenaFiltrar(indice: readonly EntradaIndice[]): boolean {
  return indice.length >= MINIMO_PARA_FILTRAR;
}
