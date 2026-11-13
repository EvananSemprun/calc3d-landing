import { describe, expect, it } from 'vitest';
import { formatoMonto, itemsParaPedido, mensajePedido, precioRenglon, problemasDelPedido, totalPedido, validarContacto } from './pedido';
import type { ItemCarrito } from './carrito';
import type { InfoApi } from './api';

const info: InfoApi = {
  businessName: 'Banano Lab',
  whatsappPhone: '04121234567',
  currency: 'VES',
  rate: { rate: 40, currencyCode: 'Bs' },
  storageReady: false,
};

describe('itemsParaPedido', () => {
  it('manda slug/qty/options y la personalización, pero NUNCA el precio ni el display', () => {
    const items: ItemCarrito[] = [
      {
        id: 'taza',
        qty: 2,
        opts: { Color: 'Rojo' },
        unit: 25.5,
        customNote: 'con nombre',
        customImageKey: 'org/custom-uploads/x.png',
        nombre: 'Taza',
        priceTiers: [{ minQty: 3, discountPct: 0.1 }],
        minQty: 1,
      },
    ];
    const lineas = itemsParaPedido(items);
    expect(lineas).toEqual([
      { slug: 'taza', qty: 2, options: { Color: 'Rojo' }, customNote: 'con nombre', customImageKey: 'org/custom-uploads/x.png' },
    ]);
    // Ni el precio ni los datos de display viajan como CAMPOS (el servidor recalcula).
    // Se chequea por propiedad, no por substring: el valor de customNote puede contener
    // la palabra "nombre" sin que exista el campo `nombre`.
    expect(lineas[0]).not.toHaveProperty('unit');
    expect(lineas[0]).not.toHaveProperty('priceTiers');
    expect(lineas[0]).not.toHaveProperty('nombre');
    expect(lineas[0]).not.toHaveProperty('minQty');
    expect(lineas[0]).not.toHaveProperty('imagen');
  });

  it('omite customNote/customImageKey cuando no hay', () => {
    const lineas = itemsParaPedido([{ id: 'llavero', qty: 1, opts: {}, unit: 5 }]);
    expect(lineas).toEqual([{ slug: 'llavero', qty: 1, options: {} }]);
  });
});

describe('validarContacto', () => {
  it('nombre corto → mensaje', () => {
    expect(validarContacto({ name: 'A', phone: '04121234567' })).toBe('Escribe tu nombre.');
  });
  it('teléfono con menos de 7 dígitos → mensaje', () => {
    expect(validarContacto({ name: 'Evan', phone: '123' })).toBe('Escribe un WhatsApp válido.');
  });
  it('datos válidos → null', () => {
    expect(validarContacto({ name: 'Evan', phone: '0412 1234567' })).toBeNull();
  });
});

describe('precioRenglon / totalPedido', () => {
  it('aplica el tramo denormalizado por la cantidad ACTUAL del renglón', () => {
    // unit congelado = 10; con qty 3 aplica el tramo (−10%) → 9 c/u.
    const item: ItemCarrito = { id: 'taza', qty: 3, opts: {}, unit: 10, priceTiers: [{ minQty: 2, discountPct: 0.1 }] };
    expect(precioRenglon(item)).toBe(9);
    expect(totalPedido([item])).toBe(27);
  });
  it('sin tramos, el unitario es el congelado', () => {
    expect(precioRenglon({ id: 'x', qty: 5, opts: {}, unit: 4 })).toBe(4);
  });
});

describe('mensajePedido', () => {
  it('arma líneas con nombre, cantidad y precio, el total y el equivalente en Bs', () => {
    const items: ItemCarrito[] = [{ id: 'taza', qty: 2, opts: { Color: 'Rojo' }, unit: 10, nombre: 'Taza' }];
    const msg = mensajePedido({ items, info, nombre: 'Evan' });
    expect(msg).toContain('soy Evan');
    expect(msg).toContain('2 × Taza');
    expect(msg).toContain('Color: Rojo');
    // «BCV» y no «USD»: lo publicado esta en dolares BCV, que no es el dolar del costeo.
    expect(msg).toContain('Total: $20.00 BCV');
    expect(msg).toContain('Bs'); // equivalente a la tasa
  });
});

describe('el pedido nunca sale roto (2026-11-12)', () => {
  const rojo = (qty: number): ItemCarrito => ({ id: 'cas', qty, opts: {}, unit: 7, nombre: 'Cascanueces' });

  it('con 1e60 NO se arma el mensaje: lanza y dice qué corregir', () => {
    expect(() => mensajePedido({ items: [rojo(1e60)], info })).toThrow(/Cascanueces/);
    expect(problemasDelPedido([rojo(1e60)])[0].texto).toContain('999 unidades');
  });

  it.each([1e60, 1e21, -5, 0, 2.5, 999999, NaN, Infinity])('problemasDelPedido rechaza qty %s', (q) => {
    expect(problemasDelPedido([rojo(q)])).toHaveLength(1);
  });

  it('señala el RENGLÓN que falla', () => {
    const p = problemasDelPedido([rojo(1), rojo(5000)]);
    expect(p.map((x) => x.renglon)).toEqual([2]);
  });

  it('un precio no finito también bloquea', () => {
    const roto: ItemCarrito = { id: 'x', qty: 1, opts: {}, unit: Infinity };
    expect(problemasDelPedido([roto])).toHaveLength(1);
  });

  it('un pedido válido no tiene problemas', () => {
    expect(problemasDelPedido([rojo(1), rojo(999)])).toEqual([]);
  });

  it.each([1, 3, 999])('el mensaje con qty %s no lleva «e+», NaN ni Infinity', (q) => {
    const msg = mensajePedido({ items: [rojo(q)], info });
    expect(msg).not.toMatch(/e\+/i);
    expect(msg).not.toContain('NaN');
    expect(msg).not.toContain('Infinity');
    expect(msg).toContain('$7.00 c/u');
  });

  it('formatoMonto: 2 decimales y jamás notación científica', () => {
    expect(formatoMonto(7)).toBe('7.00');
    expect(formatoMonto(7e60)).not.toMatch(/e/i);
    expect(formatoMonto(1234.5)).toBe('1234.50');
    expect(formatoMonto(NaN)).toBe('—');
    expect(formatoMonto(Infinity)).toBe('—');
  });
});
