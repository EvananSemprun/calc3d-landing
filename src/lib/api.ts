// Cliente delgado de la API pública de la tienda (solo lectura). El mismo
// `fetch` sirve en el build (Node) y en el navegador. Las ESCRITURAS (pedidos,
// piezas a medida, subida de foto) llegan con el carrito, en otra tarea.
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

export function fetchInfo(): Promise<InfoApi> {
  return getJson<InfoApi>('/public/store/info');
}
