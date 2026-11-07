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
  it('trae lo que los controles y el carrito necesitan, y nada más', () => {
    const [e] = indiceDeCategoria([completo]);
    expect(Object.keys(e).sort()).toEqual([
      'badge', 'colors', 'compareAt', 'id', 'image', 'minQty', 'name', 'price', 'priceTiers', 'requiresOptions',
    ]);
    for (const prohibido of ['desc', 'description', 'specs', 'optionGroups', 'images', 'summary']) {
      expect(e).not.toHaveProperty(prohibido);
    }
    expect(e).toEqual({
      id: 'copa', name: 'copa', price: 24, colors: ['Rojo'], image: completo.image,
      priceTiers: [], minQty: 1, requiresOptions: false, badge: null, compareAt: null,
    });
  });

  it('la insignia y el precio de lista viajan en el índice (ordenar no las quita)', () => {
    const [e] = indiceDeCategoria([prod('oferta', { priceUsd: 8, compareAtUsd: 10, badge: 'Nuevo' })]);
    expect(e.badge).toBe('Nuevo');
    expect(e.compareAt).toBe(10);
  });

  it('un producto sin foto queda con image null, no undefined', () => {
    expect(indiceDeCategoria([prod('sin-foto')])[0].image).toBeNull();
  });

  it('conserva el orden de la API', () => {
    expect(indiceDeCategoria([prod('b'), prod('a')]).map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('cada entrada pesa poco: mil productos no reintroducen los megas', () => {
    const peso = JSON.stringify(indiceDeCategoria([completo])[0]).length;
    expect(peso).toBeLessThan(330);
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

import { SLUG_SIN_CATEGORIA, categoriasDelIndice, raicesConProductos, conPagina, listadosDe, rutasDeListados, paginaDe, paginaDesdeUrl, rutaDeSlug, ventanaDePaginas } from './paginacion';

describe('listados por categoría', () => {
  const cats = [
    { slug: 'llaveros', nombre: 'Llaveros', parentSlug: null },
    { slug: 'mundial', nombre: 'Mundial', parentSlug: 'llaveros' },
    { slug: 'vacia', nombre: 'Vacía', parentSlug: null },
  ];
  const en = (slug: string, cat: string) => prod(slug, { category: { slug: cat, name: cat } });
  const productos = [en('a', 'llaveros'), en('b', 'mundial'), en('c', 'mundial')];

  it('la madre incluye los productos de sus hijas; la hija, solo los suyos; la vacía no existe', () => {
    const l = listadosDe(cats, productos);
    expect(l.map((x) => [x.cat, x.sub, x.productos.length])).toEqual([
      ['llaveros', null, 3],
      ['llaveros', 'mundial', 2],
    ]);
    expect(l[0].hijas).toEqual([{ slug: 'mundial', nombre: 'Mundial', n: 2 }]);
  });

  it('rutaDeSlug manda las hijas bajo su madre', () => {
    expect(rutaDeSlug('mundial', cats)).toBe('/tienda/llaveros/mundial/');
    expect(rutaDeSlug('llaveros', cats)).toBe('/tienda/llaveros/');
  });
});

describe('paginado', () => {
  it('corta de a 24 y la última lleva el resto', () => {
    const lista = Array.from({ length: 50 }, (_, i) => i);
    expect(paginaDe(lista, 1)).toHaveLength(24);
    expect(paginaDe(lista, 3)).toEqual([48, 49]);
  });

  it('la ventana siempre trae primera y última, con huecos', () => {
    expect(ventanaDePaginas(1, 3)).toEqual([1, 2, 3]);
    expect(ventanaDePaginas(10, 42)).toEqual([1, null, 9, 10, 11, null, 42]);
  });

  it('la página del cliente va en ?p=, la 1 no se escribe y lo demás se respeta', () => {
    expect(conPagina('https://x.com/t/?col=Rojo', 3)).toBe('https://x.com/t/?col=Rojo&p=3');
    expect(conPagina('https://x.com/t/?col=Rojo&p=3', 1)).toBe('https://x.com/t/?col=Rojo');
    expect(paginaDesdeUrl('?p=4')).toBe(4);
    expect(paginaDesdeUrl('?p=abc')).toBe(1);
    expect(paginaDesdeUrl('?p=-2')).toBe(1);
  });
});

describe('productos sin categoría', () => {
  const cats = [{ slug: 'llaveros', nombre: 'Llaveros', parentSlug: null }];
  const en = (slug: string, cat?: string) =>
    prod(slug, cat ? { category: { slug: cat, name: cat } } : {});

  it('tienen su propio listado, y las demás categorías no los pierden', () => {
    const l = listadosDe(cats, [en('a', 'llaveros'), en('b'), en('c', 'borrada')]);
    expect(l.map((x) => [x.cat, x.productos.map((p) => p.id)])).toEqual([
      ['llaveros', ['a']],
      [SLUG_SIN_CATEGORIA, ['b', 'c']],
    ]);
  });

  it('si no hay huérfanos, el listado no existe', () => {
    expect(listadosDe(cats, [en('a', 'llaveros')]).map((x) => x.cat)).toEqual(['llaveros']);
  });

  it('el listado de huérfanos está marcado y NO entra en las raíces del pie', () => {
    const productos = [en('a', 'llaveros'), en('b')];
    const l = listadosDe(cats, productos);
    expect(l.map((x) => [x.cat, x.sinCategoria])).toEqual([['llaveros', false], [SLUG_SIN_CATEGORIA, true]]);
    expect(raicesConProductos(cats, productos).map((r) => r.slug)).toEqual(['llaveros']);
  });

  it('pero SÍ aparece en el índice de /tienda/, al final', () => {
    expect(categoriasDelIndice(cats, [en('a', 'llaveros'), en('b')]).map((r) => [r.slug, r.n])).toEqual([
      ['llaveros', 1],
      [SLUG_SIN_CATEGORIA, 1],
    ]);
  });

  it('sin huérfanos, ni el pie ni el índice tienen "Sin categoría"', () => {
    const productos = [en('a', 'llaveros')];
    expect(raicesConProductos(cats, productos)).toHaveLength(1);
    expect(categoriasDelIndice(cats, productos)).toHaveLength(1);
  });

  it('una categoría real con ese slug ROMPE el build, con un mensaje que dice qué hacer', () => {
    const choque = [...cats, { slug: SLUG_SIN_CATEGORIA, nombre: 'Sin categoría', parentSlug: null }];
    expect(() => listadosDe(choque, [en('a', 'llaveros')])).toThrow(/sin-categoria.*Cambiale el enlace/);
  });
});

describe('mapa slug → ruta', () => {
  it('las hijas cuelgan de su madre y los huérfanos tienen la suya', () => {
    const cats = [
      { slug: 'llaveros', nombre: 'Llaveros', parentSlug: null },
      { slug: 'mundial', nombre: 'Mundial', parentSlug: 'llaveros' },
    ];
    const en = (slug: string, cat?: string) => prod(slug, cat ? { category: { slug: cat, name: cat } } : {});
    const rutas = rutasDeListados(listadosDe(cats, [en('a', 'mundial'), en('b')]));
    expect(rutas).toEqual({
      llaveros: '/tienda/llaveros/',
      mundial: '/tienda/llaveros/mundial/',
      'sin-categoria': '/tienda/sin-categoria/',
    });
  });
});
