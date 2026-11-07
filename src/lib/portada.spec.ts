import { describe, expect, it } from 'vitest';
import { adapt } from './producto';
import type { Listado } from './paginacion';
import { categoriasDePortada, destacadosDe, TOPE_DESTACADOS } from './portada';

const con = (id: string) => adapt({ slug: id, name: id, priceUsd: 10, minQty: 1, badge: 'Nuevo' });
const sin = (id: string) => adapt({ slug: id, name: id, priceUsd: 10, minQty: 1 });

const listado = (extra: Partial<Listado>): Listado => ({
  cat: 'x', sub: null, nombre: 'X', nombreMadre: null, productos: [], hijas: [], paginas: 1, sinCategoria: false,
  ...extra,
});
const productosN = (n: number) => Array.from({ length: n }, (_, i) => sin(`p${i}`));
const raiz = (slug: string, n: number) =>
  listado({ cat: slug, nombre: slug[0].toUpperCase() + slug.slice(1), productos: productosN(n) });
const hija = (slug: string, n: number) =>
  listado({ cat: 'llaveros', sub: slug, nombre: slug, nombreMadre: 'Llaveros', productos: productosN(n) });
const huerfanos = () =>
  listado({ cat: 'sin-categoria', nombre: 'Sin categoría', productos: productosN(1), sinCategoria: true });

describe('destacadosDe', () => {
  it('entran primero los que tienen badge, en el orden recibido', () => {
    const r = destacadosDe([sin('a'), con('b'), sin('c'), con('d')], 4);
    expect(r.map((p) => p.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('sin ningún badge, se completa igual y no queda vacío', () => {
    expect(destacadosDe([sin('a'), sin('b')], 4).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('con más badges que lugares, corta en el tope y no repite', () => {
    const r = destacadosDe([con('a'), con('b'), con('c'), con('d'), con('e')], 4);
    expect(r.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sin productos devuelve vacío', () => {
    expect(destacadosDe([], 4)).toEqual([]);
  });

  it('el tope por defecto de la portada son 4', () => {
    expect(TOPE_DESTACADOS).toBe(4);
  });
});

describe('categoriasDePortada', () => {
  it('solo raíces, con su conteo, y "Sin categoría" afuera', () => {
    const r = categoriasDePortada([raiz('llaveros', 2), hija('autos', 1), huerfanos()]);
    expect(r).toEqual([{ cat: 'llaveros', nombre: 'Llaveros', n: 2 }]);
  });

  it('no tiene tope: todas las raíces entran', () => {
    const r = categoriasDePortada(Array.from({ length: 20 }, (_, i) => raiz(`c${i}`, 1)));
    expect(r).toHaveLength(20);
  });
});
