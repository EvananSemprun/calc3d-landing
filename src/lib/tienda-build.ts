// Datos de la tienda para el BUILD, traídos UNA sola vez y repartidos en memoria entre
// todas las páginas de categoría (con una petición por página, mil productos en cien
// listados reventarían el límite público de la API). Si la API falla, el build FALLA a
// propósito: publicar un catálogo vacío en silencio sería peor que no publicar.
import { fetchCategorias, fetchInfo, fetchProductos, fetchProductosCompletos, type InfoApi } from './api';
import type { Categoria } from './catalogo';
import { categoriasDelIndice, listadosDe, raicesConProductos, type Listado } from './paginacion';
import type { ProductoVitrina } from './producto';

export interface DatosTienda {
  productos: ProductoVitrina[];
  /** Lo mismo con todo lo de la ficha (descripción, galería, opciones). Solo lo usan las fichas. */
  completos: ProductoVitrina[];
  categorias: Categoria[];
  info: InfoApi;
  listados: Listado[];
  /** Raíces con productos: los enlaces del pie en TODAS las páginas de la tienda. */
  raices: { slug: string; nombre: string; n: number }[];
  /** Las raíces más "Sin categoría" si hay huérfanos: solo para el índice de /tienda/. */
  categoriasDelIndice: { slug: string; nombre: string; n: number }[];
}

let pendiente: Promise<DatosTienda> | null = null;

/**
 * ⚠️ Memoiza PARA SIEMPRE (una sola carga por proceso). En `pnpm dev` un producto nuevo
 * no aparece hasta reiniciar el servidor; en el build es justo lo que se quiere: todas
 * las páginas ven la misma foto del catálogo.
 */
export function cargarTienda(): Promise<DatosTienda> {
  pendiente ??= Promise.all([fetchProductos(), fetchProductosCompletos(), fetchCategorias(), fetchInfo()]).then(
    ([productos, completos, categorias, info]) => ({
      productos,
      completos,
      categorias,
      info,
      listados: listadosDe(categorias, productos),
      raices: raicesConProductos(categorias, productos),
      categoriasDelIndice: categoriasDelIndice(categorias, productos),
    }),
  );
  return pendiente;
}

/**
 * El `getStaticPaths` de las cuatro rutas de listado, en un solo lugar.
 *  - `subcategoria`: los listados de subcategoría (si no, los de categoría raíz).
 *  - `paginas`: de la página 2 en adelante (si no, solo la página 1, que es la ruta sin `pagina/`).
 */
export async function rutasDeListado({ subcategoria, paginas }: { subcategoria: boolean; paginas: boolean }) {
  const { listados, info, raices } = await cargarTienda();
  return listados
    .filter((l) => (l.sub !== null) === subcategoria)
    .flatMap((listado) => {
      const numeros = paginas ? Array.from({ length: listado.paginas - 1 }, (_, i) => i + 2) : [1];
      return numeros.map((n) => ({
        params: {
          categoria: listado.cat,
          ...(subcategoria ? { subcategoria: listado.sub as string } : {}),
          ...(paginas ? { page: String(n) } : {}),
        },
        props: { listado, info, raices, n },
      }));
    });
}
