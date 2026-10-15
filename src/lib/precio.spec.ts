import { describe, expect, it } from 'vitest';
import { equivalenteEnMoneda, precioConTramos, precioUnitarioItem } from './precio';

describe('precioConTramos', () => {
  const t = [
    { minQty: 10, discountPct: 0.1 },
    { minQty: 25, discountPct: 0.2 },
  ];

  it('aplica el mayor tramo aplicable', () => {
    expect(precioConTramos(10, 9, t)).toBe(10);
    expect(precioConTramos(10, 10, t)).toBeCloseTo(9, 9);
    expect(precioConTramos(10, 30, t)).toBeCloseTo(8, 9);
    expect(precioConTramos(5, 100, [])).toBe(5);
  });

  it('no depende del orden en que vienen los tramos', () => {
    const alReves = [...t].reverse();
    expect(precioConTramos(10, 30, alReves)).toBeCloseTo(8, 9);
    expect(precioConTramos(10, 10, alReves)).toBeCloseTo(9, 9);
  });

  it('el límite es inclusivo: qty === minQty ya aplica el tramo', () => {
    expect(precioConTramos(10, 25, t)).toBeCloseTo(8, 9);
    expect(precioConTramos(10, 24, t)).toBeCloseTo(9, 9);
  });

  it('sin tramos (null/undefined) devuelve el unitario base', () => {
    expect(precioConTramos(7.25, 50, null)).toBe(7.25);
    expect(precioConTramos(7.25, 50, undefined)).toBe(7.25);
  });

  it('el descuento es una FRACCIÓN y redondea a 4 decimales', () => {
    // 3.3333 * (1 - 0.15) = 2.833305 -> 2.8333
    expect(precioConTramos(3.3333, 5, [{ minQty: 5, discountPct: 0.15 }])).toBe(2.8333);
  });

  it('no muta el arreglo de tramos recibido', () => {
    const original = [
      { minQty: 25, discountPct: 0.2 },
      { minQty: 10, discountPct: 0.1 },
    ];
    precioConTramos(10, 30, original);
    expect(original.map((x) => x.minQty)).toEqual([25, 10]);
  });
});

describe('precioUnitarioItem', () => {
  const prod = { price: 9.5, priceTiers: [{ minQty: 10, discountPct: 0.2 }] };

  it('aplica el tramo según la cantidad ACTUAL del renglón', () => {
    // unit = base+opciones SIN tramo (9.5). A qty 10 -> 7.60; a qty 2 -> 9.50 (no congelado).
    expect(precioUnitarioItem({ unit: 9.5, qty: 10 }, prod)).toBeCloseTo(7.6, 9);
    expect(precioUnitarioItem({ unit: 9.5, qty: 2 }, prod)).toBeCloseTo(9.5, 9);
  });

  it('sin unit guardado, usa el precio del producto', () => {
    expect(precioUnitarioItem({ qty: 10 }, prod)).toBeCloseTo(7.6, 9);
  });

  it('sin producto (listado viejo), no rompe y usa unit', () => {
    expect(precioUnitarioItem({ unit: 5, qty: 1 }, null)).toBe(5);
  });

  it('sin producto ni unit, el base es 0', () => {
    expect(precioUnitarioItem({ qty: 3 }, undefined)).toBe(0);
  });

  it('el unit del renglón (con recargos de opción) manda sobre el price del producto', () => {
    // 9.5 + 3 de opción = 12.5; tramo 20% a qty 10 -> 10
    expect(precioUnitarioItem({ unit: 12.5, qty: 10 }, prod)).toBeCloseTo(10, 9);
  });
});

describe('equivalenteEnMoneda', () => {
  it('sin tasa no hay equivalente (solo USD)', () => {
    expect(equivalenteEnMoneda(10, null)).toBeNull();
    expect(equivalenteEnMoneda(10, undefined)).toBeNull();
  });

  it('multiplica por la tasa y formatea a la venezolana, máx. 2 decimales', () => {
    expect(equivalenteEnMoneda(10, { rate: 36.5 })).toBe('365');
    expect(equivalenteEnMoneda(9.5, { rate: 36.123 })).toBe('343,17');
  });
});
