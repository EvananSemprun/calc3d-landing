import { describe, expect, it } from 'vitest';
import { precioBaseConOpciones, seleccionInicial } from './ficha';
import type { ProductoVitrina } from './producto';

// Producto mínimo para las pruebas (solo lo que miran estas funciones).
function prod(parcial: Partial<ProductoVitrina>): ProductoVitrina {
  return {
    id: 'x',
    name: 'X',
    cat: '',
    catLabel: '',
    price: 10,
    compareAt: null,
    priceTiers: [],
    desc: '',
    kind: 'PHYSICAL',
    minQty: 1,
    material: null,
    materialKey: '',
    badge: null,
    custom: false,
    requiresOptions: false,
    specs: [],
    ship: null,
    image: null,
    images: null,
    description: null,
    optionGroups: [],
    colorList: [],
    colors: [],
    ...parcial,
  };
}

describe('seleccionInicial', () => {
  it('elige la primera opción de cada grupo REQUERIDO', () => {
    const p = prod({
      optionGroups: [
        { name: 'Color', required: true, options: [{ value: 'Rojo' }, { value: 'Negro' }] },
        { name: 'Tamaño', required: true, options: [{ value: 'S' }, { value: 'L' }] },
      ],
    });
    expect(seleccionInicial(p)).toEqual({ Color: 'Rojo', Tamaño: 'S' });
  });

  it('NO elige nada para grupos opcionales', () => {
    const p = prod({
      optionGroups: [{ name: 'Grabado', required: false, options: [{ value: 'Sí' }, { value: 'No' }] }],
    });
    expect(seleccionInicial(p)).toEqual({});
  });

  it('sin grupos, selección vacía', () => {
    expect(seleccionInicial(prod({}))).toEqual({});
  });
});

describe('precioBaseConOpciones', () => {
  it('suma los recargos de las opciones elegidas al precio base, SIN tramo', () => {
    const p = prod({
      price: 10,
      optionGroups: [
        { name: 'Tamaño', required: true, options: [{ value: 'S', priceDeltaUsd: 0 }, { value: 'L', priceDeltaUsd: 1.5 }] },
      ],
    });
    expect(precioBaseConOpciones(p, { Tamaño: 'L' })).toBe(11.5);
    expect(precioBaseConOpciones(p, { Tamaño: 'S' })).toBe(10);
  });

  it('sin opciones elegidas, es el precio base', () => {
    expect(precioBaseConOpciones(prod({ price: 24 }), {})).toBe(24);
  });

  it('ignora una elección que no corresponde a ninguna opción', () => {
    const p = prod({
      price: 10,
      optionGroups: [{ name: 'Color', required: true, options: [{ value: 'Rojo', priceDeltaUsd: 2 }] }],
    });
    expect(precioBaseConOpciones(p, { Color: 'Inexistente' })).toBe(10);
  });
});
