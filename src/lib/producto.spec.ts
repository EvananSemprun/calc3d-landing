import { describe, expect, it } from 'vitest';
import { adapt, lineaDeTarjeta, rutaFicha } from './producto';

describe('adapt', () => {
  it('mapea la forma de la API a la de la vitrina', () => {
    const p = adapt({
      slug: 'llavero',
      name: 'Llavero',
      category: { slug: 'llaveros', name: 'Llaveros' },
      priceUsd: 3.5,
      compareAtUsd: 5,
      summary: 'PLA',
      kind: 'PHYSICAL',
      minQty: 2,
      material: 'PLA',
      badge: 'Nuevo',
      custom: true,
      leadTimeDays: 5,
      colors: [{ value: 'Rojo', swatchHex: '#f00' }],
    });
    expect(p.id).toBe('llavero');
    expect(p.price).toBe(3.5);
    expect(p.compareAt).toBe(5);
    expect(p.cat).toBe('llaveros');
    expect(p.catLabel).toBe('Llaveros');
    expect(p.desc).toBe('PLA');
    expect(p.kind).toBe('PHYSICAL');
    expect(p.minQty).toBe(2);
    expect(p.badge).toBe('Nuevo');
    expect(p.custom).toBe(true);
    expect(p.ship).toBe('5 días');
    expect(p.colors).toEqual(['Rojo']);
    expect(p.colorList).toEqual([{ value: 'Rojo', hex: '#f00' }]);
  });

  it('un producto mínimo recibe defaults seguros', () => {
    const p = adapt({ slug: 's', name: 'Simple', priceUsd: 5, minQty: 1 });
    expect(p.cat).toBe('');
    expect(p.catLabel).toBe('');
    expect(p.priceTiers).toEqual([]);
    expect(p.desc).toBe('');
    expect(p.material).toBeNull();
    expect(p.badge).toBeNull();
    expect(p.custom).toBe(false);
    expect(p.requiresOptions).toBe(false);
    expect(p.specs).toEqual([]);
    expect(p.ship).toBeNull();
    expect(p.image).toBeNull();
    expect(p.images).toBeNull();
    expect(p.description).toBeNull();
    expect(p.optionGroups).toEqual([]);
    expect(p.colorList).toEqual([]);
    expect(p.colors).toEqual([]);
  });

  it('priceTiers pasa tal cual (descuento como fracción)', () => {
    const tiers = [{ minQty: 10, discountPct: 0.1 }];
    expect(adapt({ slug: 't', name: 'T', priceUsd: 1, minQty: 1, priceTiers: tiers }).priceTiers).toEqual(tiers);
  });

  it('`custom` y `requiresOptions` se coercionan a booleano', () => {
    const p = adapt({ slug: 'c', name: 'C', priceUsd: 1, minQty: 1, custom: true, requiresOptions: true });
    expect(p.custom).toBe(true);
    expect(p.requiresOptions).toBe(true);
    expect(adapt({ slug: 'd', name: 'D', priceUsd: 1, minQty: 1, custom: false }).custom).toBe(false);
  });

  it('material conserva el original (lo usa el JSON-LD de la ficha)', () => {
    const p = adapt({ slug: 'm', name: 'M', priceUsd: 1, minQty: 1, material: ' PLA ' });
    expect(p.material).toBe(' PLA ');
  });

  it('leadTimeDays = 0 cuenta como dato ("0 días"); solo null/undefined lo omiten', () => {
    expect(adapt({ slug: 'l', name: 'L', priceUsd: 1, minQty: 1, leadTimeDays: 0 }).ship).toBe('0 días');
    expect(adapt({ slug: 'l', name: 'L', priceUsd: 1, minQty: 1, leadTimeDays: null }).ship).toBeNull();
  });

  it('image: usa `image` si viene; si no, la primera de `images`; si no, null', () => {
    const conImage = adapt({
      slug: 'a',
      name: 'A',
      priceUsd: 1,
      minQty: 1,
      image: { url: 'https://cdn/a.jpg' },
      images: [{ url: 'https://cdn/b.jpg' }],
    });
    expect(conImage.image?.url).toBe('https://cdn/a.jpg');
    const soImages = adapt({
      slug: 'b',
      name: 'B',
      priceUsd: 1,
      minQty: 1,
      images: [{ url: 'https://cdn/b.jpg' }, { url: 'https://cdn/c.jpg' }],
    });
    expect(soImages.image?.url).toBe('https://cdn/b.jpg');
    expect(soImages.images).toHaveLength(2);
    expect(adapt({ slug: 'c', name: 'C', priceUsd: 1, minQty: 1 }).image).toBeNull();
  });

  it('optionGroups conserva `drivesPhoto`, `required` e `images` de cada opción', () => {
    const p = adapt({
      slug: 'g',
      name: 'G',
      priceUsd: 10,
      minQty: 1,
      optionGroups: [
        {
          name: 'Color',
          required: true,
          drivesPhoto: true,
          options: [
            { value: 'Rojo', priceDeltaUsd: 0, swatchHex: '#f00', images: [{ url: 'https://cdn/rojo.jpg' }] },
            { value: 'Grande', priceDeltaUsd: 3, swatchHex: null },
          ],
        },
      ],
    });
    const g = p.optionGroups[0]!;
    expect(g.drivesPhoto).toBe(true);
    expect(g.required).toBe(true);
    expect(g.options[0]!.images?.[0]?.url).toBe('https://cdn/rojo.jpg');
    expect(g.options[1]!.priceDeltaUsd).toBe(3);
  });

  it('colorList sale de `colors` de la API; colors es solo la lista de valores', () => {
    const p = adapt({
      slug: 'k',
      name: 'K',
      priceUsd: 1,
      minQty: 1,
      colors: [
        { value: 'Rojo', swatchHex: '#f00' },
        { value: 'Azul', swatchHex: '#00f' },
      ],
    });
    expect(p.colorList.map((c) => c.hex)).toEqual(['#f00', '#00f']);
    expect(p.colors).toEqual(['Rojo', 'Azul']);
  });
});

describe('rutaFicha', () => {
  it('termina en barra: es la URL canónica y evita una redirección por clic', () => {
    expect(rutaFicha('llavero')).toBe('/producto/llavero/');
    expect(rutaFicha('llavero').endsWith('/')).toBe(true);
  });
  it('escapa el slug', () => {
    expect(rutaFicha('a b')).toBe('/producto/a%20b/');
  });
});

describe('lineaDeTarjeta', () => {
  it('es la categoría, y el material no aparece', () => {
    const p = adapt({
      slug: 'a', name: 'A', priceUsd: 1, minQty: 1,
      material: 'PLA', category: { slug: 'llaveros', name: 'Llaveros' },
    });
    expect(lineaDeTarjeta(p)).toBe('Llaveros');
  });

  it('un producto sin categoría no deja un separador huérfano', () => {
    const p = adapt({ slug: 'b', name: 'B', priceUsd: 1, minQty: 1, material: 'PETG' });
    expect(lineaDeTarjeta(p)).toBe('');
  });
});

it('materialKey ya no existe', () => {
  const p = adapt({ slug: 'c', name: 'C', priceUsd: 1, minQty: 1, material: ' PLA ' });
  expect('materialKey' in p).toBe(false);
});
