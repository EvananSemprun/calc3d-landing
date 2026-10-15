import { describe, expect, it } from 'vitest';
import { fotosDeOpcion } from './galeria';
import { adapt } from './producto';

const base = { slug: 'x', name: 'X', priceUsd: 10, minQty: 1, images: [{ url: 'https://cdn/base.jpg' }] };

describe('fotosDeOpcion', () => {
  it('usa la foto de la opción elegida del grupo que define la foto', () => {
    const p = adapt({
      ...base,
      optionGroups: [
        {
          name: 'Color',
          required: true,
          drivesPhoto: true,
          options: [
            { value: 'Rojo', images: [{ url: 'https://cdn/rojo.jpg' }] },
            { value: 'Azul', images: [] },
          ],
        },
      ],
    });
    // El color elegido tiene foto propia -> la galería usa esa.
    expect(fotosDeOpcion(p, { Color: 'Rojo' }).map((f) => f.url)).toEqual(['https://cdn/rojo.jpg']);
    // Un color sin foto propia -> cae a la galería base, no se rompe.
    expect(fotosDeOpcion(p, { Color: 'Azul' }).map((f) => f.url)).toEqual(['https://cdn/base.jpg']);
  });

  it('sin grupo que define la foto usa la galería base', () => {
    const p = adapt({
      ...base,
      optionGroups: [
        {
          name: 'Color',
          required: true,
          drivesPhoto: false,
          options: [{ value: 'Rojo', images: [{ url: 'https://cdn/rojo.jpg' }] }],
        },
      ],
    });
    expect(fotosDeOpcion(p, { Color: 'Rojo' }).map((f) => f.url)).toEqual(['https://cdn/base.jpg']);
  });

  it('sin opción elegida (o una inexistente) en el grupo foto cae a la base', () => {
    const p = adapt({
      ...base,
      optionGroups: [
        { name: 'Color', drivesPhoto: true, options: [{ value: 'Rojo', images: [{ url: 'https://cdn/rojo.jpg' }] }] },
      ],
    });
    expect(fotosDeOpcion(p, {}).map((f) => f.url)).toEqual(['https://cdn/base.jpg']);
    expect(fotosDeOpcion(p, { Color: 'Verde' }).map((f) => f.url)).toEqual(['https://cdn/base.jpg']);
  });

  it('opción con `images` ausente (undefined) cae a la base', () => {
    const p = adapt({
      ...base,
      optionGroups: [{ name: 'Color', drivesPhoto: true, options: [{ value: 'Rojo' }] }],
    });
    expect(fotosDeOpcion(p, { Color: 'Rojo' }).map((f) => f.url)).toEqual(['https://cdn/base.jpg']);
  });

  it('sin `images` pero con `image` (tarjeta), la base es [image]', () => {
    const p = adapt({ slug: 'y', name: 'Y', priceUsd: 1, minQty: 1, image: { url: 'https://cdn/portada.jpg' } });
    expect(fotosDeOpcion(p, {}).map((f) => f.url)).toEqual(['https://cdn/portada.jpg']);
  });

  it('sin ninguna foto devuelve []', () => {
    const p = adapt({ slug: 'z', name: 'Z', priceUsd: 1, minQty: 1 });
    expect(fotosDeOpcion(p, {})).toEqual([]);
  });
});
