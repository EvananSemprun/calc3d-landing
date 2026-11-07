import { describe, expect, it } from 'vitest';
import { enlaceBanner, formatearCuenta, porcentajeOff } from './banner';

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
  it('PRODUCT → /producto/slug', () => {
    expect(enlaceBanner({ linkType: 'PRODUCT', linkValue: 'taza-feliz' })).toBe('/producto/taza-feliz');
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
