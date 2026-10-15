import { describe, expect, it } from 'vitest';
import { agregar, claveDeItem, fijarCantidad, leer, quitar, type Almacen } from './carrito';

// Almacén de mentira (en memoria) para correr en node.
function almacenFalso(): Almacen {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

describe('fijarCantidad', () => {
  it('cambia la cantidad del renglón identificado por su clave', () => {
    const a = almacenFalso();
    agregar({ id: 'taza', qty: 1, opts: { Color: 'Rojo' }, unit: 10 }, a);
    const clave = claveDeItem('taza', { Color: 'Rojo' });
    fijarCantidad(clave, 5, a);
    expect(leer(a)).toEqual([{ id: 'taza', qty: 5, opts: { Color: 'Rojo' }, unit: 10 }]);
  });

  it('con cantidad menor a 1, quita el renglón', () => {
    const a = almacenFalso();
    agregar({ id: 'taza', qty: 2, opts: {}, unit: 10 }, a);
    fijarCantidad(claveDeItem('taza', {}), 0, a);
    expect(leer(a)).toEqual([]);
  });

  it('no toca otros renglones', () => {
    const a = almacenFalso();
    agregar({ id: 'taza', qty: 1, opts: {}, unit: 10 }, a);
    agregar({ id: 'llavero', qty: 3, opts: {}, unit: 5 }, a);
    fijarCantidad(claveDeItem('taza', {}), 9, a);
    expect(leer(a).find((i) => i.id === 'llavero')?.qty).toBe(3);
  });
});

describe('quitar', () => {
  it('elimina el renglón por su clave y deja el resto', () => {
    const a = almacenFalso();
    agregar({ id: 'taza', qty: 1, opts: {}, unit: 10 }, a);
    agregar({ id: 'llavero', qty: 2, opts: {}, unit: 5 }, a);
    quitar(claveDeItem('taza', {}), a);
    expect(leer(a).map((i) => i.id)).toEqual(['llavero']);
  });
});
