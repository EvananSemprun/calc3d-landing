import { describe, expect, it } from 'vitest';
import { adapt, type ProductoApi } from './producto';
import { POR_PAGINA, indiceDeCategoria, rutaDeCategoria, rutaDePagina } from './paginacion';

const prod = (slug: string, extra: Partial<ProductoApi> = {}) =>
  adapt({ slug, name: slug, priceUsd: 10, minQty: 1, ...extra });

const completo = prod('copa', {
  priceUsd: 24,
  material: 'PLA',
  description: 'Una descripción larga '.repeat(30),
  category: { slug: 'llaveros', name: 'Llaveros' },
  image: { url: 'https://fotos.bananolab-3d.com/copa.jpg', alt: 'Copa', width: 600, height: 600 },
  colors: [{ value: 'Rojo', swatchHex: '#f00' }],
});

describe('índice de categoría', () => {
  it('trae solo lo que los controles necesitan, y nada más', () => {
    const [e] = indiceDeCategoria([completo]);
    expect(Object.keys(e).sort()).toEqual(['colors', 'id', 'image', 'name', 'price']);
    expect(e).toEqual({ id: 'copa', name: 'copa', price: 24, colors: ['Rojo'], image: completo.image });
  });

  it('un producto sin foto queda con image null, no undefined', () => {
    expect(indiceDeCategoria([prod('sin-foto')])[0].image).toBeNull();
  });

  it('conserva el orden de la API', () => {
    expect(indiceDeCategoria([prod('b'), prod('a')]).map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('cada entrada pesa poco: mil productos no reintroducen los megas', () => {
    const peso = JSON.stringify(indiceDeCategoria([completo])[0]).length;
    expect(peso).toBeLessThan(250);
  });
});

describe('rutas', () => {
  it('POR_PAGINA son 24', () => {
    expect(POR_PAGINA).toBe(24);
  });

  it('rutaDeCategoria arma /tienda/<cat>/ y /tienda/<cat>/<sub>/', () => {
    expect(rutaDeCategoria('llaveros')).toBe('/tienda/llaveros/');
    expect(rutaDeCategoria('llaveros', null)).toBe('/tienda/llaveros/');
    expect(rutaDeCategoria('llaveros', 'con-logo')).toBe('/tienda/llaveros/con-logo/');
  });

  it('rutaDePagina pone el segmento `pagina` en el medio, para no chocar con una subcategoría', () => {
    expect(rutaDePagina('llaveros', null, 2)).toBe('/tienda/llaveros/pagina/2/');
    expect(rutaDePagina('llaveros', 'con-logo', 3)).toBe('/tienda/llaveros/con-logo/pagina/3/');
  });

  it('la página 1 es la ruta sin `pagina`, no /pagina/1/', () => {
    expect(rutaDePagina('llaveros', null, 1)).toBe('/tienda/llaveros/');
    expect(rutaDePagina('llaveros', 'con-logo', 1)).toBe('/tienda/llaveros/con-logo/');
  });
});
