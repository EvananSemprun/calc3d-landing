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
  /**
   * Días de entrega PROPIOS de esta opción, cuando elegirla cambia el plazo.
   * Ausente o `null` = no lo cambia y manda el del producto (ver `diasDeEntrega`).
   */
  leadTimeDays?: number | null;
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
  nuevo?: boolean;
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
  badge: string | null;
  /** Insignia automatica: la DERIVA el servidor de la fecha de publicacion. */
  nuevo: boolean;
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
 * ¿El precio de la tarjeta es un PISO y no el precio final?
 *
 * Lo es cuando alguna opción suma: el árbol vale $8 en 12 cm y $30 en 26 cm, así que una
 * tarjeta que diga «$8.00» a secas se lee como el precio y no como el arranque. La ficha
 * sí muestra el total al elegir (medido: $24,00 → $25,50 al marcar una opción); el que
 * necesita el «desde» es el catálogo.
 *
 * ⚠️ Solo recargos POSITIVOS. Un 0 no cambia el precio y no justifica la palabra.
 */
export function hayRecargo(p: { optionGroups?: GrupoOpcionesApi[] }): boolean {
  return (p.optionGroups ?? []).some((g) => g.options.some((o) => (o.priceDeltaUsd ?? 0) > 0));
}

/** La línea gris de la tarjeta: la categoría y nada más (el material no se muestra). */
export function lineaDeTarjeta(p: ProductoVitrina): string {
  return p.catLabel || '';
}

/**
 * «Listo en 5 días» — el plazo de producción, o null si el negocio no lo cargó.
 * ⚠️ ÚNICA definición de este texto: lo pintan la tarjeta del catálogo
 * (`TarjetaProducto`) y los hechos de la ficha (`hechosDeFicha`). Estaba escrito a mano
 * en los dos lados y solo uno tenía test: cambiar el probado dejaba todas las tarjetas
 * diciendo lo viejo con la suite en verde.
 */
export function textoDeEntrega(p: Pick<ProductoVitrina, 'ship'>): string | null {
  return p.ship ? `Listo en ${p.ship}` : null;
}

/**
 * «Mínimo 2» — la cantidad mínima, SOLO si es mayor que 1: «Mínimo 1» no informa nada
 * (es el piso de cualquier pedido) y ocupa un renglón.
 * ⚠️ Misma regla que `textoDeEntrega`: una sola definición para tarjeta y ficha.
 */
export function textoDeMinimo(p: Pick<ProductoVitrina, 'minQty'>): string | null {
  return p.minQty > 1 ? `Mínimo ${p.minQty}` : null;
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
    badge: p.badge ?? null,
    nuevo: p.nuevo === true,
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

/**
 * Ruta canónica de la ficha. CON barra final: es la URL que sirve el sitio (Astro genera
 * `producto/<slug>/index.html`), la que declara la canónica y la del sitemap. Sin la barra,
 * cada clic pasa por una redirección. Todo enlace a una ficha debe salir de aquí.
 */
export function rutaFicha(slug: string): string {
  return `/producto/${encodeURIComponent(slug)}/`;
}
