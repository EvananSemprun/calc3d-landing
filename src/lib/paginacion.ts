// Paginado e índice de categoría. Puro (sin DOM ni React) para poder probarlo en node.
import type { FotoApi, ProductoVitrina } from './producto';

/** Tarjetas por página de categoría. */
export const POR_PAGINA = 24;

/**
 * Lo MÍNIMO que los controles (filtros, orden, tope de precio) necesitan de cada
 * producto de la categoría. Viaja a la isla entero, así que cada campo que se agregue
 * se multiplica por el tamaño de la categoría: NO meter `summary`, `priceTiers` ni
 * `desc` — eso reintroduce el HTML de megas que el paginado vino a resolver.
 */
export interface EntradaIndice {
  id: string;
  name: string;
  price: number;
  colors: string[];
  image: FotoApi | null;
}

export function indiceDeCategoria(productos: readonly ProductoVitrina[]): EntradaIndice[] {
  return productos.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    colors: p.colors,
    image: p.image ?? null,
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
