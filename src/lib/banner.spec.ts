import { describe, expect, it } from 'vitest';
import { enlaceBanner, formatearCuenta, porcentajeOff } from './banner';

describe('enlaceBanner', () => {
  it('CATEGORY → /tienda/?cat=', () => {
    expect(enlaceBanner({ linkType: 'CATEGORY', linkValue: 'llaveros' })).toBe('/tienda/?cat=llaveros');
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
