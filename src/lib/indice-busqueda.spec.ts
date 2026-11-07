import { describe, expect, it } from 'vitest';
import { adapt, type ProductoApi } from './producto';
import { buscar, indiceDeBusqueda } from './indice-busqueda';

const prod = (slug: string, name: string, extra: Partial<ProductoApi> = {}) =>
  adapt({ slug, name, priceUsd: 10, minQty: 1, ...extra });

const productos = [
  prod('base-anti-slip', 'Base Anti-Slip', {
    summary: 'Soporte para celular que no se resbala en el escritorio.',
    category: { slug: 'oficina', name: 'Oficina' },
  }),
  prod('llavero-corazon', 'Llavero Corazón', {
    summary: 'Llavero pequeño con forma de corazón.',
    category: { slug: 'llaveros', name: 'Llaveros' },
  }),
  prod('maceta-cactus', 'Maceta Cactus', { category: { slug: 'hogar', name: 'Hogar' } }),
  prod('llavero-pokebola', 'Llavero Pokebola', { category: { slug: 'llaveros', name: 'Llaveros' } }),
  prod('sin-cat', 'Pieza suelta'),
];
const indice = indiceDeBusqueda(productos);

describe('índice de búsqueda', () => {
  it('lleva lo justo para encontrar y mostrar: id, nombre, categoría y resumen', () => {
    expect(indice[0]).toEqual({
      id: 'base-anti-slip',
      name: 'Base Anti-Slip',
      cat: 'oficina',
      catLabel: 'Oficina',
      desc: 'Soporte para celular que no se resbala en el escritorio.',
    });
    expect(Object.keys(indice[0]).sort()).toEqual(['cat', 'catLabel', 'desc', 'id', 'name']);
  });

  it('conserva el orden de la API', () => {
    expect(indice.map((e) => e.id)[0]).toBe('base-anti-slip');
    expect(indice).toHaveLength(productos.length);
  });
});

describe('buscar', () => {
  it('encuentra por nombre aproximado', () => {
    expect(buscar(indice, 'coraz').map((e) => e.id)).toEqual(['llavero-corazon']);
    expect(buscar(indice, 'cactus').map((e) => e.id)).toEqual(['maceta-cactus']);
  });

  it('encuentra por el resumen: «soporte de celular» encuentra «Base Anti-Slip»', () => {
    expect(buscar(indice, 'soporte de celular').map((e) => e.id)).toEqual(['base-anti-slip']);
  });

  it('ignora acentos y mayúsculas, en la consulta y en el catálogo', () => {
    expect(buscar(indice, 'CORAZON').map((e) => e.id)).toEqual(['llavero-corazon']);
    expect(buscar(indice, 'corazón').map((e) => e.id)).toEqual(['llavero-corazon']);
    expect(buscar(indice, 'MACETA').map((e) => e.id)).toEqual(['maceta-cactus']);
  });

  it('una consulta vacía o de puro espacio no devuelve nada, no «todo»', () => {
    expect(buscar(indice, '')).toEqual([]);
    expect(buscar(indice, '   ')).toEqual([]);
  });

  it('respeta el tope de resultados', () => {
    expect(buscar(indice, 'llavero', 1)).toHaveLength(1);
    expect(buscar(indice, 'llavero')).toHaveLength(2);
  });

  it('exige todas las palabras: «llavero cactus» no trae cualquiera de las dos', () => {
    expect(buscar(indice, 'llavero cactus')).toEqual([]);
  });

  it('lo que coincide en el nombre va antes que lo que solo coincide en el resumen', () => {
    const lista = indiceDeBusqueda([
      prod('a', 'Soporte de pared', { summary: 'Para cosas' }),
      prod('b', 'Base', { summary: 'Un soporte cualquiera' }),
    ]);
    expect(buscar(lista, 'soporte').map((e) => e.id)).toEqual(['a', 'b']);
    // aunque en el catálogo vaya al revés
    expect(buscar([...lista].reverse(), 'soporte').map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('un producto sin categoría ni resumen igual se encuentra por nombre', () => {
    expect(buscar(indice, 'suelta').map((e) => e.id)).toEqual(['sin-cat']);
  });

  it('sin coincidencias devuelve una lista vacía', () => {
    expect(buscar(indice, 'zzzz')).toEqual([]);
  });

  it('mil productos se buscan sin trabarse', () => {
    const mil = indiceDeBusqueda(Array.from({ length: 1000 }, (_, i) => prod(`p${i}`, `Producto ${i}`, { summary: 'resumen de ejemplo' })));
    // Sin aserción de tiempo: un test que se pone rojo por la máquina entrena a ignorar el rojo.
    // Se comprueba que recorre las mil y devuelve resultados.
    expect(buscar(mil, 'resumen ejemplo').length).toBeGreaterThan(0);
  });
});
