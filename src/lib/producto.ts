// Contrato de la API pública de la tienda (`/public/store/*`) y la forma que usa
// la vitrina. `adapt()` es el único puente entre las dos. Pura: sin DOM.
import type { TramoPrecio } from './precio';

/* ---------- Lo que entrega la API ---------- */

export type TipoProducto = 'PHYSICAL' | 'SERVICE';

export interface FotoApi {
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface OpcionApi {
  value: string;
  priceDeltaUsd?: number;
  swatchHex?: string | null;
  /** Fotos propias de la opción (solo cuentan si el grupo `drivesPhoto`). */
  images?: FotoApi[];
}

export interface GrupoOpcionesApi {
  name: string;
  required?: boolean;
  /** El color elegido en este grupo decide qué fotos muestra la galería. */
  drivesPhoto?: boolean;
  options: OpcionApi[];
}

export interface EspecificacionApi {
  label: string;
  value: string;
}

export interface ColorApi {
  value: string;
  swatchHex: string;
}

/** Producto tal como llega de la API (tarjeta del listado o ficha completa). */
export interface ProductoApi {
  slug: string;
  name: string;
  category?: { slug: string; name: string } | null;
  priceUsd: number;
  compareAtUsd?: number | null;
  priceTiers?: TramoPrecio[];
  summary?: string | null;
  kind?: TipoProducto;
  minQty: number;
  material?: string | null;
  badge?: string | null;
  custom?: boolean;
  requiresOptions?: boolean;
  specs?: EspecificacionApi[];
  leadTimeDays?: number | null;
  image?: FotoApi | null;
  /** Solo en la ficha individual: */
  images?: FotoApi[] | null;
  description?: string | null;
  optionGroups?: GrupoOpcionesApi[];
  /** Opciones del grupo "Color" que tienen muestra; la API ya las entrega listas. */
  colors?: ColorApi[];
}

/* ---------- La forma de la vitrina ---------- */

export interface ColorVitrina {
  value: string;
  hex: string;
}

/**
 * Producto en la forma que consume la vitrina. El precio queda en USD (la base
 * del sistema); los bolívares se calculan al mostrar.
 */
export interface ProductoVitrina {
  id: string;
  name: string;
  cat: string;
  catLabel: string;
  price: number;
  compareAt: number | null | undefined;
  priceTiers: TramoPrecio[];
  desc: string;
  kind: TipoProducto | undefined;
  minQty: number;
  material: string | null;
  /** Clave para comparar en el filtro (minúsculas, sin espacios al borde). */
  materialKey: string;
  badge: string | null;
  custom: boolean;
  requiresOptions: boolean;
  specs: EspecificacionApi[];
  /** "5 días"; null si el negocio no cargó el plazo. */
  ship: string | null;
  image: FotoApi | null;
  /** Solo presentes en la ficha individual: */
  images: FotoApi[] | null;
  description: string | null;
  optionGroups: GrupoOpcionesApi[];
  colorList: ColorVitrina[];
  colors: string[];
}

/**
 * Traduce un producto de la API a la forma que usa la vitrina. El precio queda
 * en USD (la base del sistema); los bolívares se calculan al mostrar.
 */
export function adapt(p: ProductoApi): ProductoVitrina {
  // La API ya entrega los colores listos en `colors` (tanto en la tarjeta como
  // en la ficha): son las opciones del grupo "Color" que tienen muestra.
  const colorList = (p.colors ?? []).map((c) => ({ value: c.value, hex: c.swatchHex }));

  return {
    id: p.slug,
    name: p.name,
    cat: p.category?.slug ?? '',
    catLabel: p.category?.name ?? '',
    price: p.priceUsd,
    compareAt: p.compareAtUsd,
    priceTiers: p.priceTiers ?? [],
    desc: p.summary ?? '',
    kind: p.kind,
    minQty: p.minQty,
    material: p.material ?? null,
    materialKey: (p.material ?? '').trim().toLowerCase(),
    badge: p.badge ?? null,
    custom: !!p.custom,
    requiresOptions: !!p.requiresOptions,
    specs: p.specs ?? [],
    ship: p.leadTimeDays != null ? `${p.leadTimeDays} días` : null,
    image: p.image ?? (p.images ? (p.images[0] ?? null) : null),
    images: p.images ?? null,
    description: p.description ?? null,
    optionGroups: p.optionGroups ?? [],
    colorList,
    colors: colorList.map((c) => c.value),
  };
}
