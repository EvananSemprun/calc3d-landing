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

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`La API respondió ${res.status}`);
  return (await res.json()) as T;
}

/** Listado del catálogo, ya en la forma de la vitrina. */
export async function fetchProductos(): Promise<ProductoVitrina[]> {
  const { products } = await getJson<{ products: ProductoApi[] }>('/public/store/products');
  return products.map(adapt);
}

/** Ficha completa de un producto, por su enlace, ya en la forma de la vitrina. */
export async function fetchProducto(slug: string): Promise<ProductoVitrina> {
  return adapt(await getJson<ProductoApi>(`/public/store/products/${encodeURIComponent(slug)}`));
}

/** Categorías del negocio, en el orden que les dio el panel. */
export async function fetchCategorias(): Promise<Categoria[]> {
  const { categories } = await getJson<{ categories: { slug: string; name: string }[] }>(
    '/public/store/categories',
  );
  return categories.map((c) => ({ slug: c.slug, nombre: c.name }));
}

export function fetchInfo(): Promise<InfoApi> {
  return getJson<InfoApi>('/public/store/info');
}

/** Banners del carrusel (los administra el panel). [] si no hay. */
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
