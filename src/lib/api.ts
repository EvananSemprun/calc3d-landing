// Cliente delgado de la API pública de la tienda (solo lectura). El mismo
// `fetch` sirve en el build (Node) y en el navegador. Las ESCRITURAS (pedidos,
// piezas a medida, subida de foto) llegan con el carrito, en otra tarea.
import type { Categoria } from './catalogo';
import type { Banner } from './banner';
import { adapt, type ProductoApi, type ProductoVitrina } from './producto';

/** Tasa de presentación publicada por el negocio (null = solo USD). */
export interface TasaApi {
  rate: number;
  currencyCode: string;
}

/** Ficha del negocio: nombre, WhatsApp y tasa de presentación. */
export interface InfoApi {
  businessName: string;
  whatsappPhone: string | null;
  currency: string;
  rate: TasaApi | null;
  /** true si el almacenamiento (R2) está configurado: habilita el cargador de foto
   *  de la personalización. Si es false, la ficha ofrece solo la nota. */
  storageReady: boolean;
}

const BASE = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');

/**
 * La API contestó que ESO NO EXISTE (404). No es lo mismo que no poder hablar con ella.
 *
 * ⚠️ Hasta el 2026-11-08 las dos cosas eran el mismo `Error` y la ficha no podía
 * distinguirlas: un producto borrado mostraba «no pudimos conectar con el catálogo»
 * —un mensaje falso— encima de la ficha horneada, o sea del producto muerto, como si
 * siguiera a la venta. El dato para separarlos ya llegaba: la API pública devuelve 404
 * para lo borrado **y para lo despublicado** (filtra por `visible`).
 */
export class NoExiste extends Error {
  constructor(path: string) {
    super(`La API dice que no existe: ${path}`);
    this.name = 'NoExiste';
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path);
  if (res.status === 404) throw new NoExiste(path);
  if (!res.ok) throw new Error(`La API respondió ${res.status}`);
  return (await res.json()) as T;
}

/** Listado del catálogo, ya en la forma de la vitrina. */
export async function fetchProductos(): Promise<ProductoVitrina[]> {
  const { products } = await getJson<{ products: ProductoApi[] }>('/public/store/products');
  return products.map(adapt);
}

/** Catálogo CON todo lo de la ficha (descripción, specs, galería, opciones con recargo),
 *  en UNA sola petición. Es lo que usa el build de las fichas: pedir una por producto
 *  agota el límite público (120 por minuto) con un catálogo grande. No trae `image`;
 *  `adapt` la saca de `images[0]`. */
export async function fetchProductosCompletos(): Promise<ProductoVitrina[]> {
  const { products } = await getJson<{ products: ProductoApi[] }>('/public/store/products?detail=full');
  return products.map(adapt);
}

/**
 * UNA ficha, por su enlace. La respuesta viene PLANA, sin envoltorio.
 *
 * La usa la ficha para refrescarse en vivo y la ruta comodín para resolver un producto
 * que todavía no tiene página propia. Lanza si no existe: quien llama decide qué mostrar.
 */
export async function fetchProducto(slug: string): Promise<ProductoVitrina> {
  return adapt(await getJson<ProductoApi>(`/public/store/products/${encodeURIComponent(slug)}`));
}

/** Categorías del negocio, en el orden que les dio el panel. */
export async function fetchCategorias(): Promise<Categoria[]> {
  const { categories } = await getJson<{ categories: { slug: string; name: string; parentSlug?: string | null }[] }>(
    '/public/store/categories',
  );
  return categories.map((c) => ({ slug: c.slug, nombre: c.name, parentSlug: c.parentSlug ?? null }));
}

export function fetchInfo(): Promise<InfoApi> {
  return getJson<InfoApi>('/public/store/info');
}

/**
 * Banners del hero de la portada (los administra el panel). [] si no hay.
 * ⚠️ Se leen en el BUILD (`cargarTienda`), no en el navegador: ya no hay carrusel.
 */
export async function fetchBanners(): Promise<Banner[]> {
  const { banners } = await getJson<{ banners: Banner[] }>('/public/store/banners');
  return banners ?? [];
}

/** Flash Sale: ventana activa con productos EN OFERTA, ya en la forma de la vitrina.
 *  null si no hay ventana o no hay productos (la sección queda oculta). */
export interface SaleData {
  title?: string | null;
  endsAt: string;
  products: ProductoVitrina[];
}
export async function fetchSale(): Promise<SaleData | null> {
  const { sale } = await getJson<{
    sale: { title?: string | null; endsAt: string; products: ProductoApi[] } | null;
  }>('/public/store/sale');
  return sale ? { title: sale.title, endsAt: sale.endsAt, products: (sale.products ?? []).map(adapt) } : null;
}
