import { describe, expect, it } from 'vitest';
import { itemsParaPedido, mensajePedido, precioRenglon, totalPedido, validarContacto } from './pedido';
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
    expect(validarContacto({ name: 'A', phone: '04121234567' })).toBe('Escribí tu nombre.');
  });
  it('teléfono con menos de 7 dígitos → mensaje', () => {
    expect(validarContacto({ name: 'Evan', phone: '123' })).toBe('Escribí un WhatsApp válido.');
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
    expect(msg).toContain('Total: $20.00 USD');
    expect(msg).toContain('Bs'); // equivalente a la tasa
  });
});
