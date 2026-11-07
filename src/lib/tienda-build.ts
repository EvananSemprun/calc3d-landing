// Datos de la tienda para el BUILD, traídos UNA sola vez y repartidos en memoria entre
// todas las páginas de categoría (con una petición por página, mil productos en cien
// listados reventarían el límite público de la API). Si la API falla, el build FALLA a
// propósito: publicar un catálogo vacío en silencio sería peor que no publicar.
import { fetchCategorias, fetchInfo, fetchProductos, type InfoApi } from './api';
import type { Categoria } from './catalogo';
import { listadosDe, raicesConProductos, type Listado } from './paginacion';
import type { ProductoVitrina } from './producto';

export interface DatosTienda {
  productos: ProductoVitrina[];
  categorias: Categoria[];
  info: InfoApi;
  listados: Listado[];
  /** Raíces con productos: los enlaces del pie en TODAS las páginas de la tienda. */
  raices: { slug: string; nombre: string; n: number }[];
}

let pendiente: Promise<DatosTienda> | null = null;

export function cargarTienda(): Promise<DatosTienda> {
  pendiente ??= Promise.all([fetchProductos(), fetchCategorias(), fetchInfo()]).then(
    ([productos, categorias, info]) => ({
      productos,
      categorias,
      info,
      listados: listadosDe(categorias, productos),
      raices: raicesConProductos(categorias, productos),
    }),
  );
  return pendiente;
}
