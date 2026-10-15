// Lógica del catálogo (filtros, orden, URL compartible). Pura: sin DOM ni React, para
// poder probarla en node. Es el porte de `Shop` en tienda/index.html del sitio viejo;
// ante la duda, manda ese comportamiento.
import type { ProductoVitrina } from './producto';

export type Orden = 'featured' | 'price-asc' | 'price-desc' | 'name';

/** Estado de los filtros. Arreglos (no Set) para que React los compare por valor. */
export interface Filtros {
  /** Categoría de selección ÚNICA ('' = todas). */
  cat: string;
  /** Claves de material (`materialKey`) — multi-selección. */
  materials: string[];
  /** Colores (`value`) — multi-selección. */
  colors: string[];
  maxPrice: number;
  sort: Orden;
}

export interface Categoria {
  slug: string;
  nombre: string;
}

export interface CategoriaConConteo extends Categoria {
  n: number;
}

export interface MaterialFiltro {
  key: string;
  label: string;
}

/** Colores presentes en el catálogo como pares [nombre, hex]. */
export type ColorFiltro = [value: string, hex: string];

/** Datos contra los que se valida lo que llega por la URL. */
export interface ContextoUrl {
  cats: Categoria[];
  materiales: MaterialFiltro[];
  colores: ColorFiltro[];
  tope: number;
}

const ORDENES_VALIDOS: readonly Orden[] = ['price-asc', 'price-desc', 'name'];

/**
 * Una categoría SIN productos no llega a ser opción: se vería, se tocaría y no
 * mostraría nada. Vale también para los enlaces del pie.
 */
export function categoriasConProductos(
  cats: readonly Categoria[],
  productos: readonly ProductoVitrina[],
): CategoriaConConteo[] {
  return cats
    .map((c) => ({ ...c, n: productos.filter((p) => p.cat === c.slug).length }))
    .filter((c) => c.n > 0);
}

/**
 * Materiales presentes en el catálogo. El campo es TEXTO LIBRE en el panel, así que
 * "PLA", "pla" y " PLA " llegan como tres valores: se deduplica sin distinguir
 * mayúsculas ni espacios y se muestra la primera forma que aparece. Si no, el filtro
 * tendría tres botones para el mismo material y cada uno mostraría un tercio.
 */
export function materialesDe(productos: readonly ProductoVitrina[]): MaterialFiltro[] {
  const vistos = new Map<string, string>();
  for (const p of productos) {
    if (!p.materialKey || vistos.has(p.materialKey)) continue;
    vistos.set(p.materialKey, (p.material ?? '').trim());
  }
  return [...vistos]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

/** Los colores salen de los productos reales, no de una lista fija. */
export function coloresDe(productos: readonly ProductoVitrina[]): ColorFiltro[] {
  const colores = new Map<string, string>();
  for (const p of productos) {
    for (const c of p.colorList) colores.set(c.value, c.hex);
  }
  return [...colores];
}

/** El tope del control de precio se ajusta al producto más caro del catálogo real. */
export function topePrecio(productos: readonly ProductoVitrina[]): number {
  return Math.max(120, ...productos.map((p) => Math.ceil(p.price)));
}

export function filtrosIniciales(tope: number): Filtros {
  return { cat: '', materials: [], colors: [], maxPrice: tope, sort: 'featured' };
}

export function hayFiltros(f: Filtros, tope: number): boolean {
  return !!f.cat || f.materials.length > 0 || f.colors.length > 0 || f.maxPrice < tope || f.sort !== 'featured';
}

/** Filtra y ordena. No muta la lista original (el orden 'featured' es el de la API). */
export function filtrar(productos: readonly ProductoVitrina[], f: Filtros): ProductoVitrina[] {
  const lista = productos.filter(
    (p) =>
      (!f.cat || p.cat === f.cat) &&
      // `materialKey` ya viene normalizado (ver adapt).
      (f.materials.length === 0 || f.materials.includes(p.materialKey)) &&
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
 * el catálogo se IGNORA, no rompe: una categoría borrada dejaría la vitrina vacía y
 * ningún control marcado. `search` es `location.search`.
 */
export function filtrosDesdeUrl(search: string, ctx: ContextoUrl): Filtros {
  const q = new URLSearchParams(search);
  const f = filtrosIniciales(ctx.tope);

  const cat = q.get('cat');
  if (cat && ctx.cats.some((c) => c.slug === cat)) f.cat = cat;

  f.materials = lista(q.get('mat')).filter((m) => ctx.materiales.some((x) => x.key === m));
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
  poner('cat', f.cat);
  poner('mat', f.materials.join(','));
  poner('col', f.colors.join(','));
  poner('max', f.maxPrice < tope ? String(f.maxPrice) : '');
  poner('sort', f.sort !== 'featured' ? f.sort : '');
  return url.toString();
}
