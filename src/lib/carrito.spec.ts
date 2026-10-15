import { describe, expect, it } from 'vitest';
import { agregar, claveDeItem, contar, leer, vaciar, type Almacen } from './carrito';

/** localStorage de mentira: las pruebas corren en node, sin navegador. */
function almacenFalso(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

describe('claveDeItem', () => {
  it('sin opciones es el id a secas', () => {
    expect(claveDeItem('llavero', {})).toBe('llavero');
  });

  it('distingue el mismo producto con opciones distintas', () => {
    const rojo = claveDeItem('llavero', { Color: 'Rojo' });
    const azul = claveDeItem('llavero', { Color: 'Azul' });
    expect(rojo).not.toBe(azul);
    expect(rojo).not.toBe(claveDeItem('llavero', {}));
  });

  it('no depende del orden en que vienen las opciones', () => {
    expect(claveDeItem('x', { A: '1', B: '2' })).toBe(claveDeItem('x', { B: '2', A: '1' }));
  });

  it('la personalización (nota/foto) también distingue el renglón', () => {
    const base = claveDeItem('taza', {});
    expect(claveDeItem('taza', {}, 'para Ana')).not.toBe(base);
    expect(claveDeItem('taza', {}, undefined, 'k/1.png')).not.toBe(base);
    expect(claveDeItem('taza', {}, 'para Ana')).not.toBe(claveDeItem('taza', {}, 'para Luis'));
  });
});

describe('agregar', () => {
  it('crea un renglón con la cantidad y el unitario recibidos', () => {
    const a = almacenFalso();
    agregar({ id: 'llavero', qty: 2, unit: 9.5 }, a);
    expect(leer(a)).toEqual([{ id: 'llavero', qty: 2, opts: {}, unit: 9.5 }]);
  });

  it('agrupa por clave: el mismo producto suma cantidad en el mismo renglón', () => {
    const a = almacenFalso();
    agregar({ id: 'llavero', qty: 2, unit: 9.5 }, a);
    agregar({ id: 'llavero', qty: 3, unit: 9.5 }, a);
    const items = leer(a);
    expect(items).toHaveLength(1);
    expect(items[0]?.qty).toBe(5);
  });

  it('opciones distintas del mismo producto son renglones distintos', () => {
    const a = almacenFalso();
    agregar({ id: 'llavero', qty: 1, opts: { Color: 'Rojo' }, unit: 10 }, a);
    agregar({ id: 'llavero', qty: 1, opts: { Color: 'Azul' }, unit: 11 }, a);
    agregar({ id: 'llavero', qty: 1, opts: { Color: 'Rojo' }, unit: 10 }, a);
    const items = leer(a);
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.opts.Color === 'Rojo')?.qty).toBe(2);
    expect(items.find((i) => i.opts.Color === 'Azul')?.qty).toBe(1);
  });

  it('guarda la personalización solo si viene', () => {
    const a = almacenFalso();
    agregar({ id: 'taza', qty: 1, unit: 5, customNote: 'para Ana' }, a);
    expect(leer(a)[0]).toMatchObject({ customNote: 'para Ana' });
    agregar({ id: 'otra', qty: 1, unit: 5 }, a);
    expect(leer(a)[1]).not.toHaveProperty('customNote');
  });

  it('persiste bajo la clave bl_cart_v1 (la misma del sitio viejo)', () => {
    const a = almacenFalso();
    agregar({ id: 'x', qty: 1, unit: 1 }, a);
    expect(JSON.parse(a.datos.get('bl_cart_v1') ?? 'null')).toHaveLength(1);
  });
});

describe('contar / vaciar / leer', () => {
  it('contar suma las unidades de todos los renglones', () => {
    const a = almacenFalso();
    agregar({ id: 'a', qty: 2, unit: 1 }, a);
    agregar({ id: 'b', qty: 3, unit: 1 }, a);
    expect(contar(a)).toBe(5);
  });

  it('vaciar deja el carrito en cero', () => {
    const a = almacenFalso();
    agregar({ id: 'a', qty: 2, unit: 1 }, a);
    vaciar(a);
    expect(leer(a)).toEqual([]);
    expect(contar(a)).toBe(0);
  });

  it('leer tolera contenido corrupto o ausente', () => {
    const a = almacenFalso();
    expect(leer(a)).toEqual([]);
    a.datos.set('bl_cart_v1', '{no es json');
    expect(leer(a)).toEqual([]);
    a.datos.set('bl_cart_v1', '{"no":"un arreglo"}');
    expect(leer(a)).toEqual([]);
  });

  it('sin almacenamiento disponible (SSR) no revienta', () => {
    expect(leer(null)).toEqual([]);
    expect(contar(null)).toBe(0);
  });
});
