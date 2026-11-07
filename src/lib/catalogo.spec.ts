import { describe, expect, it } from 'vitest';
import { adapt, type ProductoApi } from './producto';
import { indiceDeCategoria } from './paginacion';
import * as catalogo from './catalogo';
import {
  categoriasConProductos,
  coloresDe,
  filtrar,
  filtrosDesdeUrl,
  filtrosIniciales,
  sincronizarUrl,
  topePrecio,
} from './catalogo';

const prod = (slug: string, extra: Partial<ProductoApi> = {}) =>
  adapt({ slug, name: slug, priceUsd: 10, minQty: 1, ...extra });

const productos = [
  prod('copa', { priceUsd: 24, material: 'PLA', category: { slug: 'llaveros', name: 'Llaveros' }, colors: [{ value: 'Rojo', swatchHex: '#f00' }] }),
  prod('qr', { priceUsd: 9.5, material: ' pla ', category: { slug: 'identificadores', name: 'Identificadores' } }),
  prod('tag', { priceUsd: 130.2, material: 'PETG', category: { slug: 'identificadores', name: 'Identificadores' }, colors: [{ value: 'Negro', swatchHex: '#111' }, { value: 'Rojo', swatchHex: '#f00' }] }),
  prod('ana', { priceUsd: 5, category: { slug: 'llaveros', name: 'Llaveros' } }),
];
const cats = [
  { slug: 'llaveros', nombre: 'Llaveros' },
  { slug: 'vacia', nombre: 'Sin productos' },
  { slug: 'identificadores', nombre: 'Identificadores' },
];

describe('listas que salen de los productos reales', () => {
  it('una categoría sin productos no existe, y trae su conteo', () => {
    expect(categoriasConProductos(cats, productos)).toEqual([
      { slug: 'llaveros', nombre: 'Llaveros', n: 2 },
      { slug: 'identificadores', nombre: 'Identificadores', n: 2 },
    ]);
  });

  it('los colores salen una sola vez cada uno', () => {
    expect(coloresDe(productos)).toEqual([
      ['Rojo', '#f00'],
      ['Negro', '#111'],
    ]);
  });

  it('el tope del precio es 120 como mínimo y sube con el producto más caro', () => {
    expect(topePrecio([prod('a', { priceUsd: 3 })])).toBe(120);
    expect(topePrecio(productos)).toBe(131);
  });

  it('el tope del precio y los colores salen del índice de la CATEGORÍA, no de la página', () => {
    const identificadores = productos.filter((p) => p.cat === 'identificadores');
    const idx = indiceDeCategoria(identificadores);
    // El tope se calcula sobre la categoría entera, aunque la página 1 no traiga el más caro.
    expect(topePrecio(idx)).toBe(131);
    expect(topePrecio(idx.slice(0, 1))).toBe(120);
    expect(coloresDe(identificadores)).toEqual([['Negro', '#111'], ['Rojo', '#f00']]);
  });
});

describe('filtrar', () => {
  const base = filtrosIniciales(131);

  it('sin filtros devuelve todo en el orden de la API', () => {
    expect(filtrar(productos, base).map((p) => p.id)).toEqual(['copa', 'qr', 'tag', 'ana']);
  });

  it('ya no existe el filtro de categoría: la categoría es la ruta', () => {
    expect(Object.keys(base)).not.toContain('cat');
    // Un `cat` colado se ignora: no recorta nada.
    expect(filtrar(productos, { ...base, cat: 'llaveros' } as never).map((p) => p.id)).toEqual(['copa', 'qr', 'tag', 'ana']);
  });

  it('ya no existe el filtro de material', () => {
    expect(Object.keys(base)).not.toContain('materials');
    expect('materialesDe' in catalogo).toBe(false);
    expect(filtrar(productos, { ...base, materials: ['pla'] } as never).map((p) => p.id)).toEqual(['copa', 'qr', 'tag', 'ana']);
  });

  it('filtra igual sobre el índice liviano que sobre los productos completos', () => {
    const idx = indiceDeCategoria(productos);
    const f = { ...base, colors: ['Rojo'], sort: 'price-desc' as const };
    expect(filtrar(idx, f).map((e) => e.id)).toEqual(filtrar(productos, f).map((p) => p.id));
  });

  it('color: basta con que el producto tenga alguno de los elegidos', () => {
    expect(filtrar(productos, { ...base, colors: ['Negro'] }).map((p) => p.id)).toEqual(['tag']);
    expect(filtrar(productos, { ...base, colors: ['Rojo'] }).map((p) => p.id)).toEqual(['copa', 'tag']);
  });

  it('precio máximo es inclusivo', () => {
    expect(filtrar(productos, { ...base, maxPrice: 9.5 }).map((p) => p.id)).toEqual(['qr', 'ana']);
  });

  it('ordena por precio y por nombre sin mutar el original', () => {
    expect(filtrar(productos, { ...base, sort: 'price-asc' }).map((p) => p.id)).toEqual(['ana', 'qr', 'copa', 'tag']);
    expect(filtrar(productos, { ...base, sort: 'price-desc' }).map((p) => p.id)).toEqual(['tag', 'copa', 'qr', 'ana']);
    expect(filtrar(productos, { ...base, sort: 'name' }).map((p) => p.id)).toEqual(['ana', 'copa', 'qr', 'tag']);
    expect(productos.map((p) => p.id)).toEqual(['copa', 'qr', 'tag', 'ana']);
  });
});

describe('URL compartible', () => {
  const ctx = {
    colores: coloresDe(productos),
    tope: 131,
  };

  it('restaura todos los filtros', () => {
    const f = filtrosDesdeUrl('?col=Rojo&max=50&sort=price-asc', ctx);
    expect(f).toEqual({ colors: ['Rojo'], maxPrice: 50, sort: 'price-asc' });
  });

  it('acepta las comas escapadas (%2C) que escribe sincronizarUrl', () => {
    expect(filtrosDesdeUrl('?col=Rojo%2CNegro', ctx).colors).toEqual(['Rojo', 'Negro']);
  });

  it('cat y mat de enlaces viejos se ignoran, sin romper', () => {
    expect(filtrosDesdeUrl('?cat=llaveros&mat=pla', ctx)).toEqual(filtrosIniciales(131));
  });

  it('ignora lo que ya no existe en el catálogo, sin romper', () => {
    const f = filtrosDesdeUrl('?col=Verde,Rojo&max=999&sort=raro', ctx);
    expect(f).toEqual({ ...filtrosIniciales(131), colors: ['Rojo'] });
  });

  it('un max inválido (0, negativo, texto) se ignora', () => {
    expect(filtrosDesdeUrl('?max=0', ctx).maxPrice).toBe(131);
    expect(filtrosDesdeUrl('?max=-3', ctx).maxPrice).toBe(131);
    expect(filtrosDesdeUrl('?max=abc', ctx).maxPrice).toBe(131);
  });

  it('sin parámetros devuelve los iniciales', () => {
    expect(filtrosDesdeUrl('', ctx)).toEqual(filtrosIniciales(131));
  });

  it('sincronizarUrl no escribe los valores por defecto, y no toca lo que ya no es suyo', () => {
    expect(sincronizarUrl('http://x/tienda/llaveros/?col=Rojo&max=5&sort=name', filtrosIniciales(131), 131)).toBe('http://x/tienda/llaveros/');
  });

  it('sincronizarUrl escribe lo activo y respeta lo ajeno (hash, otros params)', () => {
    const url = sincronizarUrl(
      'http://x/tienda/llaveros/?utm=1#abajo',
      { colors: ['Rojo'], maxPrice: 50, sort: 'price-asc' },
      131,
    );
    const u = new URL(url);
    expect(u.pathname).toBe('/tienda/llaveros/');
    expect(u.searchParams.get('utm')).toBe('1');
    expect(u.searchParams.has('cat')).toBe(false);
    expect(u.searchParams.has('mat')).toBe(false);
    expect(u.searchParams.get('col')).toBe('Rojo');
    expect(u.searchParams.get('max')).toBe('50');
    expect(u.searchParams.get('sort')).toBe('price-asc');
    expect(u.hash).toBe('#abajo');
  });

  it('ida y vuelta: lo que se escribe es lo que se restaura', () => {
    const f = { colors: ['Negro'], maxPrice: 20, sort: 'name' as const };
    expect(filtrosDesdeUrl(new URL(sincronizarUrl('http://x/tienda/', f, 131)).search, ctx)).toEqual(f);
  });
});
