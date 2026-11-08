import { describe, expect, it } from 'vitest';
import {
  bannerDeCategoria,
  bannersDeHero,
  enlaceBanner,
  formatearCuenta,
  porcentajeOff,
  textoDeBanner,
} from './banner';

describe('enlaceBanner', () => {
  const rutas = { llaveros: '/tienda/llaveros/', mundial: '/tienda/llaveros/mundial/' };
  it('CATEGORY → la ruta del mapa (una hija vive bajo su madre)', () => {
    expect(enlaceBanner({ linkType: 'CATEGORY', linkValue: 'llaveros' }, rutas)).toBe('/tienda/llaveros/');
    expect(enlaceBanner({ linkType: 'CATEGORY', linkValue: 'mundial' }, rutas)).toBe('/tienda/llaveros/mundial/');
  });
  it('CATEGORY sin listado (vacía, borrada, o "constructor") → el índice, no un 404', () => {
    expect(enlaceBanner({ linkType: 'CATEGORY', linkValue: 'fantasma' }, rutas)).toBe('/tienda/');
    expect(enlaceBanner({ linkType: 'CATEGORY', linkValue: 'constructor' }, rutas)).toBe('/tienda/');
    expect(enlaceBanner({ linkType: 'CATEGORY', linkValue: 'llaveros' })).toBe('/tienda/');
  });
  it('PRODUCT → /producto/slug/', () => {
    expect(enlaceBanner({ linkType: 'PRODUCT', linkValue: 'taza-feliz' })).toBe('/producto/taza-feliz/');
  });
  it('URL http(s) → la URL; otro protocolo → null (defensa anti-javascript:)', () => {
    expect(enlaceBanner({ linkType: 'URL', linkValue: 'https://ej.com/x' })).toBe('https://ej.com/x');
    expect(enlaceBanner({ linkType: 'URL', linkValue: 'javascript:alert(1)' })).toBeNull();
  });
  it('sin linkType → null', () => {
    expect(enlaceBanner({})).toBeNull();
  });
});

describe('porcentajeOff', () => {
  it('redondea el % de descuento cuando compareAt > price', () => {
    expect(porcentajeOff(100, 75)).toBe(25);
    expect(porcentajeOff(30, 20)).toBe(33);
  });
  it('0 si no hay oferta (price >= compareAt o sin compareAt)', () => {
    expect(porcentajeOff(20, 20)).toBe(0);
    expect(porcentajeOff(null, 20)).toBe(0);
  });
});

describe('formatearCuenta', () => {
  it('ms <= 0 → "Oferta finalizada"', () => {
    expect(formatearCuenta(0)).toBe('Oferta finalizada');
    expect(formatearCuenta(-5)).toBe('Oferta finalizada');
  });
  it('formatea HH:MM:SS, con días cuando corresponde', () => {
    expect(formatearCuenta(5_000)).toBe('00:00:05');
    expect(formatearCuenta((2 * 3600 + 3 * 60 + 9) * 1000)).toBe('02:03:09');
    expect(formatearCuenta((1 * 86400 + 1 * 3600) * 1000)).toBe('1d 01:00:00');
  });
});

/**
 * Los TRES TIPOS (2026-11-08). `kind` es DÓNDE se muestra; `linkType`, adónde lleva.
 * Spec: `calc3d-api/docs/superpowers/specs/2026-11-08-tres-tipos-de-banner-design.md`.
 */
describe('los tres tipos de banner', () => {
  const hero = { kind: 'HERO' as const, title: 'Uno', imageUrl: 'https://x/a.png' };
  const texto = { kind: 'TEXTO' as const, title: '  Envío gratis  ', imageUrl: null };
  const cat = { kind: 'CATEGORIA' as const, title: 'Navidad', imageUrl: 'https://x/n.png', categorySlug: 'navidad' };

  it('el carrusel toma los de portada, en orden', () => {
    expect(bannersDeHero([texto, hero, cat]).map((b) => b.title)).toEqual(['Uno']);
  });

  it('un banner viejo SIN kind cuenta como portada', () => {
    // Antes del cambio era lo único que un banner podía ser. Sin esta tolerancia, una
    // API vieja dejaría la portada sin carrusel y sin que nada falle.
    expect(bannersDeHero([{ title: 'Viejo', imageUrl: 'https://x/v.png' }])).toHaveLength(1);
  });

  it('uno de portada SIN imagen no entra: una diapositiva vacía es un hueco', () => {
    expect(bannersDeHero([{ kind: 'HERO', title: 'Sin foto' }])).toHaveLength(0);
  });

  it('el texto de la franja sale recortado, o null para dejar el de siempre', () => {
    expect(textoDeBanner([hero, texto])).toBe('Envío gratis');
    expect(textoDeBanner([hero, cat])).toBeNull();
  });

  it('un TEXTO sin título no cuenta: dejaría la franja vacía', () => {
    expect(textoDeBanner([{ kind: 'TEXTO', title: '   ' }])).toBeNull();
  });

  it('el de categoría se encuentra por su slug, y solo el suyo', () => {
    expect(bannerDeCategoria([hero, cat], 'navidad')?.title).toBe('Navidad');
    expect(bannerDeCategoria([hero, cat], 'llaveros')).toBeNull();
    expect(bannerDeCategoria([hero, cat], null)).toBeNull();
  });
});
