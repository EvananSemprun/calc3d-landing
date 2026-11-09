/**
 * LA TARJETA DE CATEGORÍA LLEVA FOTO (2026-11-09).
 *
 * Eran un nombre y un conteo sobre un rectángulo vacío: cuatro cajas grises donde
 * debería estar lo más atractivo que tiene la tienda, que son las piezas.
 *
 * ⚠️ La portada NO tiene foto propia por categoría —`StoreCategory` no tiene ese campo
 * en la base y no se va a agregar—, así que sale del catálogo: la primera pieza de esa
 * categoría que tenga foto. Cero trabajo para el dueño y cero migración.
 */
import { describe, expect, it } from 'vitest';
import { raicesConProductos } from './paginacion';
import type { ProductoVitrina } from './producto';

const producto = (id: string, cat: string, url: string | null): ProductoVitrina =>
  ({
    id,
    name: id,
    cat,
    catLabel: cat,
    price: 1,
    priceTiers: [],
    minQty: 1,
    optionGroups: [],
    image: url ? { url } : null,
    images: url ? [{ url }] : null,
  }) as unknown as ProductoVitrina;

const categorias = [
  { slug: 'navidad', nombre: 'Navidad', parentSlug: null },
  { slug: 'colegio', nombre: 'Colegio', parentSlug: null },
];

describe('raicesConProductos — la portada de cada categoría', () => {
  it('toma la foto de la primera pieza de la categoría', () => {
    const r = raicesConProductos(categorias, [
      producto('reno', 'navidad', 'https://cdn/reno.jpg'),
      producto('arbol', 'navidad', 'https://cdn/arbol.jpg'),
    ]);
    expect(r[0].portada?.url).toBe('https://cdn/reno.jpg');
  });

  it('se saltea las piezas SIN foto en vez de quedarse sin portada', () => {
    const r = raicesConProductos(categorias, [
      producto('sin-foto', 'navidad', null),
      producto('reno', 'navidad', 'https://cdn/reno.jpg'),
    ]);
    expect(r[0].portada?.url).toBe('https://cdn/reno.jpg');
  });

  it('una categoría sin ninguna foto queda sin portada, no con una ajena', () => {
    const r = raicesConProductos(categorias, [
      producto('sin-foto', 'navidad', null),
      producto('lapiz', 'colegio', 'https://cdn/lapiz.jpg'),
    ]);
    const navidad = r.find((c) => c.slug === 'navidad');
    expect(navidad?.portada).toBeNull();
  });

  it('sigue contando los productos como antes', () => {
    const r = raicesConProductos(categorias, [
      producto('reno', 'navidad', 'https://cdn/reno.jpg'),
      producto('arbol', 'navidad', null),
    ]);
    expect(r[0].n).toBe(2);
  });
});
