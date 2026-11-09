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
