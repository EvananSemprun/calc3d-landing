// Lógica pura del carrusel de banners y la Flash Sale: el destino de un banner, el
// % de descuento y el contador regresivo. Sin DOM.

/** Banner tal como lo administra el panel. */
export interface Banner {
  title?: string;
  subtitle?: string | null;
  imageUrl?: string;
  linkType?: 'CATEGORY' | 'PRODUCT' | 'URL' | null;
  linkValue?: string | null;
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

/** Destino del banner según su tipo de enlace. null = sin enlace (no se pinta botón). */
export function enlaceBanner(b: Pick<Banner, 'linkType' | 'linkValue'>): string | null {
  const v = b.linkValue ?? '';
  switch (b.linkType) {
    case 'CATEGORY':
      return `/tienda/?cat=${encodeURIComponent(v)}`;
    case 'PRODUCT':
      return `/producto/${encodeURIComponent(v)}`;
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
