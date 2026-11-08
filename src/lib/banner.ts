// Lógica pura de los banners del hero y de la Flash Sale: el destino de un banner, el
// % de descuento y el contador regresivo. Sin DOM.
// (El carrusel de 3 slides que los mostraba ya no existe: ahora es el arte del hero.)
import { rutaFicha } from './producto';

/** DÓNDE se muestra un banner. No confundir con `linkType`, que es adónde LLEVA. */
export type TipoDeBanner = 'HERO' | 'TEXTO' | 'CATEGORIA';

/** Banner tal como lo administra el panel. */
export interface Banner {
  kind?: TipoDeBanner;
  title?: string;
  subtitle?: string | null;
  /** null en los de TEXTO: no tienen imagen. */
  imageUrl?: string | null;
  /** Solo en CATEGORIA: el slug de la categoría donde se muestra. */
  categorySlug?: string | null;
  linkType?: 'CATEGORY' | 'PRODUCT' | 'URL' | null;
  linkValue?: string | null;
}

/**
 * Las diapositivas del carrusel de la portada, en orden.
 *
 * ⚠️ Un banner sin `kind` cuenta como HERO: es lo único que un banner podía ser antes
 * del 2026-11-08, y el servidor manda HERO por defecto. Sin esa tolerancia, una API
 * vieja dejaría la portada sin carrusel y sin que nada falle.
 *
 * ⚠️ Sin imagen no entra: una diapositiva vacía es un hueco.
 */
export function bannersDeHero(banners: Banner[]): Banner[] {
  return banners.filter((b) => (b.kind ?? 'HERO') === 'HERO' && !!b.imageUrl);
}

/**
 * El texto de la franja de arriba, o null para dejar el de siempre.
 *
 * ⚠️ Gana el PRIMERO con título (la API los manda por posición). Con varios cargados
 * hay que elegir uno y que sea siempre el mismo: un texto que cambia según el orden en
 * que se leyó sería imposible de predecir desde el panel.
 */
export function textoDeBanner(banners: Banner[]): string | null {
  const b = banners.find((x) => x.kind === 'TEXTO' && !!x.title?.trim());
  return b?.title?.trim() ?? null;
}

/**
 * El banner de una categoría, o null.
 *
 * Lo usan la página de la categoría Y las fichas de sus productos, con el mismo slug:
 * una sola definición para los dos lugares.
 */
export function bannerDeCategoria(banners: Banner[], slug: string | null | undefined): Banner | null {
  if (!slug) return null;
  return banners.find((b) => b.kind === 'CATEGORIA' && b.categorySlug === slug && !!b.imageUrl) ?? null;
}

/** Solo http(s): un `javascript:` que se cuele NO termina en un href. */
function urlSegura(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const x = new URL(String(u), 'https://x.invalid');
    return x.protocol === 'https:' || x.protocol === 'http:' ? String(u) : null;
  } catch {
    return null;
  }
}

/**
 * Destino del banner según su tipo de enlace. null = sin enlace (no se pinta botón).
 * `rutasDeCategoria` (slug → ruta, armado en el build) resuelve las categorías: una hija
 * vive bajo su madre y este módulo no conoce la jerarquía. Una categoría sin listado
 * (vacía o borrada) cae en el índice de la tienda en vez de dar un 404.
 */
export function enlaceBanner(
  b: Pick<Banner, 'linkType' | 'linkValue'>,
  rutasDeCategoria: Record<string, string> = {},
): string | null {
  const v = b.linkValue ?? '';
  switch (b.linkType) {
    case 'CATEGORY':
      return Object.hasOwn(rutasDeCategoria, v) ? rutasDeCategoria[v] : '/tienda/';
    case 'PRODUCT':
      return rutaFicha(v);
    case 'URL':
      return urlSegura(v);
    default:
      return null;
  }
}

/** % de descuento (entero) cuando `compareAt > price`; 0 si no hay oferta. */
export function porcentajeOff(compareAt: number | null | undefined, price: number): number {
  return compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
}

/** Contador: "1d 02:03:09" / "02:03:09"; "Oferta finalizada" cuando ya venció. */
export function formatearCuenta(ms: number): string {
  if (ms <= 0) return 'Oferta finalizada';
  const dos = (n: number) => String(n).padStart(2, '0');
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  return `${d > 0 ? `${d}d ` : ''}${dos(h)}:${dos(m)}:${dos(seg)}`;
}
