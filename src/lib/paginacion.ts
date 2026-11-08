// Paginado e índice de categoría. Puro (sin DOM ni React) para poder probarlo en node.
import type { Categoria } from './catalogo';
import type { TramoPrecio } from './precio';
import { hayRecargo, type FotoApi, type ProductoVitrina } from './producto';

/** Tarjetas por página de categoría. */
export const POR_PAGINA = 24;

/**
 * Lo MÍNIMO que los controles (filtros, orden, tope de precio) necesitan de cada
 * producto de la categoría. Viaja a la isla entero, así que cada campo que se agregue
 * se multiplica por el tamaño de la categoría: NO meter `summary`, `desc`,
 * `description`, `specs` ni `optionGroups` — eso reintroduce el HTML de megas que el paginado vino a resolver.
 */
export interface EntradaIndice {
  id: string;
  name: string;
  price: number;
  colors: string[];
  image: FotoApi | null;
  /** Lo que el carrito necesita para el "Agregar" de la tarjeta (ordenar no debe quitar la compra). */
  priceTiers: TramoPrecio[];
  minQty: number;
  requiresOptions: boolean;
  /** Insignia de la esquina ("Nuevo"…). Sin ella, ordenar por precio le quitaría la insignia a la tarjeta. */
  badge: string | null;
  /** true si alguna opción suma: la tarjeta dice «desde». */
  desde: boolean;
  /** Precio de lista, para el tachado de la oferta. */
  compareAt: number | null;
}

export function indiceDeCategoria(productos: readonly ProductoVitrina[]): EntradaIndice[] {
  return productos.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    colors: p.colors,
    image: p.image ?? null,
    priceTiers: p.priceTiers,
    minQty: p.minQty,
    requiresOptions: p.requiresOptions,
    badge: p.badge ?? null,
    compareAt: p.compareAt ?? null,
    desde: hayRecargo(p),
  }));
}

/** `/tienda/<cat>/` o `/tienda/<cat>/<sub>/`. */
export function rutaDeCategoria(cat: string, sub?: string | null): string {
  return sub ? `/tienda/${cat}/${sub}/` : `/tienda/${cat}/`;
}

/**
 * La página 1 es la ruta de la categoría, sin `pagina`: dos URLs para el mismo
 * contenido es contenido duplicado para Google. Las demás llevan `pagina/` en el MEDIO
 * (`/tienda/llaveros/pagina/2/`): con `/tienda/llaveros/2/` el segmento quedaría ocupado
 * por el número y chocaría con una subcategoría.
 */
export function rutaDePagina(cat: string, sub: string | null, n: number): string {
  const base = rutaDeCategoria(cat, sub);
  return n <= 1 ? base : `${base}pagina/${n}/`;
}

/* ---------- Listados por categoría ---------- */

/**
 * Una página de listado: una categoría raíz (con los productos de sus hijas) o una
 * subcategoría. Solo existen los que tienen productos: una ruta vacía sería una página
 * en blanco indexable.
 */
export interface Listado {
  cat: string;
  /** null en una categoría raíz. */
  sub: string | null;
  nombre: string;
  /** Nombre de la madre, solo en una subcategoría. */
  nombreMadre: string | null;
  productos: ProductoVitrina[];
  /** Subcategorías con productos (solo en una raíz). */
  hijas: { slug: string; nombre: string; n: number }[];
  paginas: number;
  /** true solo en el listado de los productos sin categoría: NO es una categoría del negocio. */
  sinCategoria: boolean;
}

export function totalDePaginas(n: number): number {
  return Math.max(1, Math.ceil(n / POR_PAGINA));
}

/** Slug (y ruta) del listado de los productos que nadie metió en una categoría. */
export const SLUG_SIN_CATEGORIA = 'sin-categoria';

export function listadosDe(categorias: readonly Categoria[], productos: readonly ProductoVitrina[]): Listado[] {
  // Una categoría real con este slug pisaría el listado de los huérfanos y mezclaría
  // dos cosas distintas bajo la misma URL: se rompe el build en vez de publicarlo mal.
  if (categorias.some((c) => c.slug === SLUG_SIN_CATEGORIA)) {
    throw new Error(
      `Hay una categoría con el enlace "${SLUG_SIN_CATEGORIA}", que la tienda reserva para los productos sin categoría ` +
        `(/tienda/${SLUG_SIN_CATEGORIA}/). Cambiale el enlace a esa categoría en el panel y volvé a construir.`,
    );
  }
  const listados: Listado[] = [];
  const colocados = new Set<string>();
  const existe = new Set(categorias.map((c) => c.slug));
  // Una hija cuya madre no existe en la lista se trata como raíz: no se pierde.
  const esHija = (c: Categoria) => !!c.parentSlug && existe.has(c.parentSlug);

  for (const raiz of categorias.filter((c) => !esHija(c))) {
    const hijas = categorias.filter((c) => c.parentSlug === raiz.slug);
    const delas = (slug: string) => productos.filter((p) => p.cat === slug);
    const hijasConN = hijas
      .map((h) => ({ slug: h.slug, nombre: h.nombre, n: delas(h.slug).length }))
      .filter((h) => h.n > 0);
    const deLaRaiz = productos.filter((p) => p.cat === raiz.slug || hijas.some((h) => h.slug === p.cat));
    if (deLaRaiz.length === 0) continue;
    deLaRaiz.forEach((p) => colocados.add(p.id));
    listados.push({
      cat: raiz.slug,
      sub: null,
      nombre: raiz.nombre,
      nombreMadre: null,
      productos: deLaRaiz,
      hijas: hijasConN,
      paginas: totalDePaginas(deLaRaiz.length),
      sinCategoria: false,
    });
    for (const h of hijas) {
      const lista = delas(h.slug);
      if (lista.length === 0) continue;
      listados.push({
        cat: raiz.slug,
        sub: h.slug,
        nombre: h.nombre,
        nombreMadre: raiz.nombre,
        productos: lista,
        hijas: [],
        paginas: totalDePaginas(lista.length),
        sinCategoria: false,
      });
    }
  }

  // Los productos sin categoría (o con una que ya no existe) tienen su propio listado:
  // olvidarse de asignar categoría pasa, y no pueden quedar invisibles.
  const huerfanos = productos.filter((p) => !colocados.has(p.id));
  if (huerfanos.length > 0) {
    listados.push({
      cat: SLUG_SIN_CATEGORIA,
      sub: null,
      nombre: 'Sin categoría',
      nombreMadre: null,
      productos: huerfanos,
      hijas: [],
      paginas: totalDePaginas(huerfanos.length),
      sinCategoria: true,
    });
  }
  return listados;
}

/** slug → ruta de cada categoría que tiene listado (para los enlaces de los banners). */
export function rutasDeListados(listados: readonly Listado[]): Record<string, string> {
  const rutas: Record<string, string> = {};
  for (const l of listados) rutas[l.sub ?? l.cat] = rutaDeCategoria(l.cat, l.sub);
  return rutas;
}

/**
 * Las categorías raíz REALES que tienen listado: es lo que va al pie de TODAS las páginas.
 * ⚠️ "Sin categoría" queda afuera a propósito: un solo producto sin asignar le pondría
 * un enlace de relleno al pie del sitio entero. Ese listado aparece solo en el índice de
 * /tienda/ (ver `categoriasDelIndice`).
 */
export function raicesConProductos(
  categorias: readonly Categoria[],
  productos: readonly ProductoVitrina[],
): { slug: string; nombre: string; n: number }[] {
  return listadosDe(categorias, productos)
    .filter((l) => l.sub === null && !l.sinCategoria)
    .map((l) => ({ slug: l.cat, nombre: l.nombre, n: l.productos.length }));
}

/** Lo que lista el índice de /tienda/: las raíces y, si hay, "Sin categoría" al final. */
export function categoriasDelIndice(
  categorias: readonly Categoria[],
  productos: readonly ProductoVitrina[],
): { slug: string; nombre: string; n: number }[] {
  return listadosDe(categorias, productos)
    .filter((l) => l.sub === null)
    .map((l) => ({ slug: l.cat, nombre: l.nombre, n: l.productos.length }));
}

/** Ruta del listado de una categoría cualquiera (raíz o hija), a partir de su slug. */
export function rutaDeSlug(slug: string, categorias: readonly Categoria[]): string {
  const c = categorias.find((x) => x.slug === slug);
  const madre = c?.parentSlug && categorias.some((x) => x.slug === c.parentSlug) ? c.parentSlug : null;
  return madre ? rutaDeCategoria(madre, slug) : rutaDeCategoria(slug);
}

/** Los productos de la página `n` (1-based) de una lista. */
export function paginaDe<T>(lista: readonly T[], n: number): T[] {
  return lista.slice((n - 1) * POR_PAGINA, n * POR_PAGINA);
}

/** Números de página a mostrar: siempre la primera y la última, y una ventana alrededor de la actual. */
export function ventanaDePaginas(actual: number, total: number): (number | null)[] {
  const visibles = new Set([1, total, actual - 1, actual, actual + 1].filter((n) => n >= 1 && n <= total));
  const orden = [...visibles].sort((a, b) => a - b);
  const salida: (number | null)[] = [];
  orden.forEach((n, i) => {
    if (i > 0 && n - orden[i - 1] > 1) salida.push(null); // hueco: "…"
    salida.push(n);
  });
  return salida;
}

/** Página del lado del cliente (con un filtro activo), desde `?p=`. Inválida → 1. */
export function paginaDesdeUrl(search: string): number {
  const n = Number(new URLSearchParams(search).get('p'));
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** `href` con la página reflejada (`p`); la 1 no se escribe. Respeta lo demás. */
export function conPagina(href: string, n: number): string {
  const url = new URL(href);
  if (n > 1) url.searchParams.set('p', String(n));
  else url.searchParams.delete('p');
  return url.toString();
}
