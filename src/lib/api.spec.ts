/**
 * `getJson`: un 404 NO es un corte de red.
 *
 * ⚠️ **Este test existe porque una mutación lo pidió.** Los tests de pantalla de la
 * ficha moquean `fetchProducto` y lanzan `NoExiste` ellos mismos, así que nunca pasan
 * por acá: romper la detección del 404 los dejaba a los 5 en verde. Lo que se fija acá
 * es el ÚNICO lugar donde se decide cuál de los dos errores es.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NoExiste, fetchProducto } from './api';

const responder = (status: number, body: unknown = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })),
  );

afterEach(() => vi.unstubAllGlobals());

describe('getJson distingue el 404 del resto', () => {
  it('404 lanza NoExiste: el producto no está, la API sí', async () => {
    responder(404);
    await expect(fetchProducto('fantasma')).rejects.toBeInstanceOf(NoExiste);
  });

  it('500 NO es NoExiste: ahí el producto puede existir perfectamente', async () => {
    responder(500);
    const e = await fetchProducto('arbol').catch((x) => x);
    expect(e).toBeInstanceOf(Error);
    expect(e).not.toBeInstanceOf(NoExiste);
  });

  it('un fetch que ni sale tampoco es NoExiste', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const e = await fetchProducto('arbol').catch((x) => x);
    expect(e).not.toBeInstanceOf(NoExiste);
  });

  it('200 devuelve el producto adaptado', async () => {
    responder(200, { slug: 'arbol', name: 'Árbol', priceUsd: 8, minQty: 1 });
    await expect(fetchProducto('arbol')).resolves.toMatchObject({ id: 'arbol', name: 'Árbol' });
  });
});
