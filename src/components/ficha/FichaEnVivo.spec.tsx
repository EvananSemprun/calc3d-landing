/**
 * EL PRODUCTO BORRADO DEJA DE OFRECERSE (2026-11-08).
 *
 * La ficha se refresca contra la API al montar, pero `getJson` lanzaba el MISMO error
 * para un 404 que para un corte de red. `useEnVivo` se quedaba con lo horneado y la
 * página mostraba *«no pudimos conectar con el catálogo»* —un mensaje falso— encima de
 * la ficha del producto muerto, con su precio y su botón de comprar.
 *
 * ⚠️ Lo que se fija acá es que las dos causas se traten DISTINTO. Un test que solo
 * mirara "hay un aviso" pasaría con el bug puesto: antes también había uno.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FichaEnVivo from './FichaEnVivo';
import { NoExiste } from '@/lib/api';
import type { InfoApi } from '@/lib/api';
import type { ProductoVitrina } from '@/lib/producto';

const fetchProducto = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async () => {
  const real = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...real, fetchProducto };
});

const info: InfoApi = {
  businessName: 'Banano Lab',
  whatsappPhone: null,
  currency: 'USD',
  rate: null,
  storageReady: false,
};

const horneado = (extra: Partial<ProductoVitrina> = {}): ProductoVitrina =>
  ({
    id: 'arbol-de-navidad',
    name: 'Árbol de Navidad',
    cat: 'navidad',
    catLabel: 'Navidad',
    price: 8,
    compareAt: null,
    priceTiers: [],
    desc: 'Un árbol con los nombres de tu familia.',
    kind: 'PHYSICAL',
    minQty: 1,
    material: 'PLA',
    badge: null,
    nuevo: false,
    custom: false,
    requiresOptions: false,
    specs: [],
    ship: '3 días',
    image: null,
    images: null,
    description: null,
    optionGroups: [],
    colorList: [],
    colors: [],
    ...extra,
  }) as ProductoVitrina;

describe('FichaEnVivo — borrado y caída de red no son lo mismo', () => {
  it('la API dice 404: la ficha horneada SE PISA', async () => {
    fetchProducto.mockRejectedValue(new NoExiste('/public/store/products/arbol-de-navidad'));
    render(<FichaEnVivo inicial={horneado()} slug="arbol-de-navidad" info={info} />);

    await screen.findByText(/ya no está disponible/i);
    // Lo que importa: el producto muerto NO se sigue mostrando.
    expect(screen.queryByText('Árbol de Navidad')).toBeNull();
    expect(screen.queryByText(/\$8\.00/)).toBeNull();
  });

  it('la API NO contesta: se conserva lo horneado y se avisa que puede estar viejo', async () => {
    fetchProducto.mockRejectedValue(new Error('conexión caída'));
    render(<FichaEnVivo inicial={horneado()} slug="arbol-de-navidad" info={info} />);

    await screen.findByText(/última información guardada/i);
    // Acá lo horneado SÍ es lo mejor que hay.
    expect(screen.getByText('Árbol de Navidad')).toBeTruthy();
    expect(screen.queryByText(/ya no está disponible/i)).toBeNull();
  });

  it('el mensaje del borrado NO culpa a la conexión', async () => {
    fetchProducto.mockRejectedValue(new NoExiste('/x'));
    render(<FichaEnVivo inicial={horneado()} slug="x" info={info} />);

    const aviso = await screen.findByText(/ya no está disponible/i);
    expect(aviso.closest('div')?.textContent).not.toMatch(/conectar|conexión/i);
  });

  it('sin ficha horneada y con 404, tampoco se queda cargando para siempre', async () => {
    fetchProducto.mockRejectedValue(new NoExiste('/x'));
    render(<FichaEnVivo inicial={null} slug="fantasma" info={info} />);

    await screen.findByText(/ya no está disponible/i);
    expect(screen.queryByText(/Cargando el producto/i)).toBeNull();
  });

  it('si la ficha existe, se muestra como siempre', async () => {
    fetchProducto.mockResolvedValue(horneado({ name: 'Árbol corregido' }));
    render(<FichaEnVivo inicial={horneado()} slug="arbol-de-navidad" info={info} />);

    await waitFor(() => expect(screen.getByText('Árbol corregido')).toBeTruthy());
    expect(screen.queryByText(/ya no está disponible/i)).toBeNull();
  });
});

/**
 * LA PESTAÑA DICE EL NOMBRE DEL PRODUCTO (2026-11-09).
 *
 * El rescate de la 404 mostraba el producto entero pero dejaba la cabecera del cartel
 * de error, así que la pestaña decía «Página no encontrada». La cuenta vive en
 * `lib/titulo.ts` y tiene sus tests; acá se fija que el COMPONENTE la aplique.
 */
describe('FichaEnVivo — la pestaña acompaña al producto', () => {
  it('rescatado sin página propia: la pestaña deja de decir «Página no encontrada»', async () => {
    document.title = 'Página no encontrada — Banano Lab';
    fetchProducto.mockResolvedValue(horneado({ id: 'reno-de-navidad', name: 'Reno de Navidad' }));
    render(<FichaEnVivo inicial={null} slug="reno-de-navidad" info={info} />);

    await waitFor(() => expect(document.title).toBe('Reno de Navidad — Banano Lab'));
  });

  it('mientras la respuesta viaja NO pisa el título', async () => {
    document.title = 'Página no encontrada — Banano Lab';
    fetchProducto.mockReturnValue(new Promise(() => {}));
    render(<FichaEnVivo inicial={null} slug="fantasma" info={info} />);

    await screen.findByText(/Cargando el producto/i);
    expect(document.title).toBe('Página no encontrada — Banano Lab');
  });

  it('si la API dice que el producto ya no está, la pestaña lo dice', async () => {
    document.title = 'Árbol de Navidad — Banano Lab';
    fetchProducto.mockRejectedValue(new NoExiste('/x'));
    render(<FichaEnVivo inicial={horneado()} slug="arbol-de-navidad" info={info} />);

    await waitFor(() => expect(document.title).toBe('Producto no disponible — Banano Lab'));
  });

  it('un nombre corregido se ve también en la pestaña', async () => {
    document.title = 'Árbol de Navidad — Banano Lab';
    fetchProducto.mockResolvedValue(horneado({ name: 'Árbol corregido' }));
    render(<FichaEnVivo inicial={horneado()} slug="arbol-de-navidad" info={info} />);

    await waitFor(() => expect(document.title).toBe('Árbol corregido — Banano Lab'));
  });
});

/**
 * EL RESCATE MUESTRA UN ESQUELETO, NO UN TEXTO SUELTO (2026-11-09).
 *
 * Cuando alguien abre una ficha que el build no horneó (un producto creado después del
 * último despliegue), la página no tiene nada que mostrar hasta que contesta la API. Antes
 * se veía un «Cargando el producto…» suelto en el medio de la nada y, al llegar la
 * respuesta, la ficha entera aparecía de golpe empujando el pie del sitio. Ahora se pinta
 * un esqueleto con la FORMA de la ficha —galería, título, precio, botón— con sus
 * dimensiones medidas, así que lo que llega ocupa el lugar que ya estaba reservado.
 *
 * ⚠️ **Los tres estados de `useEnVivo` NO son el mismo, y el esqueleto es solo para uno.**
 * Son «la respuesta viaja» (esqueleto), «la API no contestó» (se conserva lo horneado) y
 * «la API dice que no está» (se PISA lo horneado). Mezclarlos es el bug que este repo ya
 * cerró una vez el 2026-11-08; los dos tests del medio existen para que el esqueleto no lo
 * reintroduzca por la puerta de atrás, mostrando una silueta donde había que mostrar una
 * ficha o un cartel.
 *
 * ⚠️ **Y por eso acá NO se busca por `role="status"`:** el aviso de «última información
 * guardada» TAMBIÉN es un `role="status"`, así que un test que midiera «no hay status»
 * daría rojo con el código bien. Lo que se mide es la silueta (`.esqueleto`).
 *
 * jsdom no aplica CSS, así que acá se amarra la ESTRUCTURA: que estén las piezas que el
 * CSS dimensiona. Los altos los vigila `src/esqueleto-mide.spec.ts` leyendo `global.css`.
 */
describe('FichaEnVivo — el esqueleto del rescate', () => {
  it('mientras viaja la respuesta y no hay ficha horneada, pinta el esqueleto de la ficha', async () => {
    fetchProducto.mockReturnValue(new Promise(() => {}));
    const { container } = render(<FichaEnVivo inicial={null} slug="fantasma" info={info} />);

    const esqueleto = container.querySelector('.esqueleto');
    expect(esqueleto, 'No se pintó el esqueleto mientras la respuesta viajaba').not.toBeNull();

    // La forma de la ficha. El hueco de la galería REUSA `.pdp-main`, que ya trae su
    // `aspect-ratio` (lo exige `fotos-reservan-espacio.spec.ts`): un hueco con otra clase
    // sería un alto nuevo que mantener de acuerdo con la foto de verdad.
    for (const sel of ['.pdp-gallery .pdp-main', '.esq-titulo', '.esq-precio', '.esq-boton']) {
      expect(esqueleto!.querySelector(sel), `al esqueleto le falta \`${sel}\``).not.toBeNull();
    }

    // Y no es la ficha: una silueta no tiene título, ni precio, ni botón de comprar que
    // puedan decir algo falso.
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('con error conserva lo horneado y NO pinta esqueleto', async () => {
    fetchProducto.mockRejectedValue(new Error('conexión caída'));
    const { container } = render(<FichaEnVivo inicial={horneado()} slug="arbol-de-navidad" info={info} />);

    await screen.findByText(/última información guardada/i);
    expect(screen.getByText('Árbol de Navidad')).toBeTruthy();
    expect(
      container.querySelector('.esqueleto'),
      'La API no contestó y lo horneado es lo mejor que hay: una silueta encima sería ' +
        'esconder la ficha que sí tenemos.',
    ).toBeNull();
  });

  it('con noExiste pisa lo horneado y NO pinta esqueleto', async () => {
    fetchProducto.mockRejectedValue(new NoExiste('/public/store/products/arbol-de-navidad'));
    const { container } = render(<FichaEnVivo inicial={horneado()} slug="arbol-de-navidad" info={info} />);

    await screen.findByText(/ya no está disponible/i);
    expect(screen.queryByText('Árbol de Navidad')).toBeNull();
    expect(
      container.querySelector('.esqueleto'),
      'La API dijo que el producto no está: lo que corresponde es el cartel, no una ' +
        'silueta que promete una ficha que no va a llegar.',
    ).toBeNull();
  });

  it('el esqueleto conserva role="status" para el lector de pantalla', async () => {
    fetchProducto.mockReturnValue(new Promise(() => {}));
    render(<FichaEnVivo inicial={null} slug="fantasma" info={info} />);

    // Una silueta no dice nada en voz alta: el texto sigue estando, solo que ya no se ve.
    const aviso = await screen.findByRole('status');
    expect(aviso.className).toMatch(/esqueleto/);
    expect(aviso.textContent).toMatch(/Cargando el producto/i);
  });
});
