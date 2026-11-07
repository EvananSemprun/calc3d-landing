import { describe, expect, it } from 'vitest';
import { adapt } from './producto';
import { destacadosDe, TOPE_DESTACADOS } from './portada';

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

  it('el tope por defecto de la portada son 4', () => {
    expect(TOPE_DESTACADOS).toBe(4);
  });
});
