import { describe, expect, it } from 'vitest';
import { adapt } from './producto';
import { destacadosDe, franjaDePortada, TOPE_DESTACADOS, TOPE_DESTACADOS_TIENDA, type ColeccionPortada } from './portada';

const con = (id: string) => adapt({ slug: id, name: id, priceUsd: 10, minQty: 1, badge: 'Nuevo' });
const sin = (id: string) => adapt({ slug: id, name: id, priceUsd: 10, minQty: 1 });

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

  it('el tope de la portada son 8: dos filas de cuatro (2026-11-09)', () => {
    // Eran 4 y la portada se veía vacía. El dueño pidió el doble.
    expect(TOPE_DESTACADOS).toBe(8);
  });

  it('el tope del índice de la tienda son 8', () => {
    expect(TOPE_DESTACADOS_TIENDA).toBe(8);
  });

  it('con el tope de la tienda la insignia sigue mandando (mismo criterio, otro tope)', () => {
    const entrada = [sin('a'), sin('b'), sin('c'), sin('d'), sin('e'), sin('f'), sin('g'), sin('h'), con('z')];
    const r = destacadosDe(entrada, TOPE_DESTACADOS_TIENDA);
    expect(r).toHaveLength(8);
    expect(r[0]!.id).toBe('z');
  });
});

describe('franjaDePortada', () => {
  // Con colección la franja existe siempre: el helper falla fuerte si no, en vez de ensuciar cada test con `?.`.
  const franja = (c: ColeccionPortada, tope: number) => {
    const f = franjaDePortada(c, tope);
    if (!f) throw new Error('con colección tenía que haber franja');
    return f;
  };
  const coleccion = (extra: Partial<ColeccionPortada> = {}): ColeccionPortada => ({
    slug: 'navidad-2026',
    titulo: 'Colección Navidad',
    subtitulo: 'Lo de la temporada',
    verTodo: { tipo: 'CATEGORIA', valor: 'navidad' },
    productos: [sin('x'), con('y')],
    ...extra,
  });

  it('con colección vigente usa su título y sus productos en SU orden, sin reordenar por insignia', () => {
    const f = franja(coleccion(), 8);
    expect(f.titulo).toBe('Colección Navidad');
    expect(f.subtitulo).toBe('Lo de la temporada');
    // x va antes que y aunque y tenga insignia: el orden lo fijó el dueño en el panel.
    expect(f.productos.map((p) => p.id)).toEqual(['x', 'y']);
  });

  it('corta la colección en el tope', () => {
    const f = franja(coleccion({ productos: [sin('1'), sin('2'), sin('3')] }), 2);
    expect(f.productos.map((p) => p.id)).toEqual(['1', '2']);
  });

  it('SIN colección devuelve null: la franja no se dibuja y NO cae a «Destacados»', () => {
    // Destacados es otra franja, siempre presente más abajo: caer a ella la duplicaría.
    expect(franjaDePortada(null, 8)).toBeNull();
  });

  it('con colección devuelve sus productos y su «Ver todo»', () => {
    const f = franja(coleccion(), 8);
    expect(f.productos.map((p) => p.id)).toEqual(['x', 'y']);
    expect(f.verTodoHref).toBe('/tienda/navidad/');
  });

  it('un «Ver todo» de categoría lleva a la página de esa categoría', () => {
    expect(franja(coleccion(), 8).verTodoHref).toBe('/tienda/navidad/');
  });

  it('un «Ver todo» NONE no lleva a ningún lado: sin enlace, no un enlace muerto', () => {
    const f = franja(coleccion({ verTodo: { tipo: 'NONE', valor: null } }), 8);
    expect(f.verTodoHref).toBeNull();
  });

  it('un «Ver todo» a otra colección lleva a SU página, que ahora existe', () => {
    const f = franja(coleccion({ verTodo: { tipo: 'COLECCION', valor: 'regalos' } }), 8);
    expect(f.verTodoHref).toBe('/coleccion/regalos/');
  });
});
