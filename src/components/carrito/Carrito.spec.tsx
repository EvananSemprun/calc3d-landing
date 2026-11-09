/**
 * EL CAJÓN DEL PEDIDO (2026-11-09).
 *
 * Tres cosas que antes no estaban y que el dueño pidió:
 *  - el SUBTOTAL de cada renglón (solo estaba el unitario, así que con 10 unidades no
 *    había forma de ver cuánto pesaba ese renglón en el total);
 *  - la foto de la VARIANTE elegida y no la del producto;
 *  - una salida cuando está vacío, que si no es un callejón.
 *
 * ⚠️ Lo que se fija acá es el CABLEADO. `precioRenglon` y `totalRenglon` ya tienen sus
 * tests de función pura y seguirían verdes si el JSX mostrara el unitario donde va el
 * subtotal.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Carrito from './Carrito';
import { CLAVE_CARRITO } from '@/lib/carrito';

vi.mock('@/lib/api', async () => {
  const real = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...real,
    fetchInfo: vi.fn().mockResolvedValue({
      businessName: 'Banano Lab',
      whatsappPhone: '04146317864',
      currency: 'USD',
      rate: { rate: 200, currencyCode: 'Bs' },
      storageReady: false,
    }),
  };
});

/** Los identificadores reales: $1,50 y tramo de $1,25 desde 10 unidades. */
const RENGLON = {
  id: 'identificadores-para-lapices',
  qty: 10,
  opts: { Color: 'Rojo' },
  unit: 1.5,
  recargo: 0,
  nombre: 'Identificadores para lápices',
  imagen: { url: 'https://cdn/rojo.jpg' },
  priceTiers: [{ minQty: 10, unitPriceUsd: 1.25 }],
  minQty: 1,
};

function sembrar(items: unknown[]) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items));
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

const abrir = async () => {
  render(<Carrito />);
  // El cajón abre con un clic en cualquier `[data-bl="cart-open"]`, como el encabezado.
  const gancho = document.createElement('button');
  gancho.setAttribute('data-bl', 'cart-open');
  document.body.appendChild(gancho);
  fireEvent.click(gancho);
};

describe('el cajón del pedido', () => {
  it('abre con el evento global, no solo con un clic en el enganche', async () => {
    // Lo usa el «Ver pedido» del aviso flotante, que vive en un portal y no tiene a
    // mano ningún `[data-bl="cart-open"]`.
    sembrar([RENGLON]);
    render(<Carrito />);
    // El cajón está siempre en el HTML y se abre con la clase: lo que se mide es si
    // está ABIERTO, no si su contenido existe.
    const cajon = screen.getByLabelText('Carrito');
    expect(cajon.className).not.toContain('open');

    fireEvent(window, new Event('cart:open'));

    await waitFor(() => expect(cajon.className).toContain('open'));
    expect(cajon.getAttribute('aria-hidden')).toBe('false');
  });

  it('muestra el SUBTOTAL del renglón, no solo el unitario', async () => {
    sembrar([RENGLON]);
    await abrir();
    const fila = await screen.findByText(/c\/u/);
    // 10 × 1,25 = 12,50 — y el unitario del tramo al lado.
    expect(fila.parentElement?.textContent).toContain('$12.50');
    expect(fila.textContent).toContain('$1.25 c/u');
  });

  it('el total va en BCV y con su equivalente en bolívares', async () => {
    sembrar([RENGLON]);
    await abrir();
    const total = await screen.findByText(/BCV/);
    expect(total.textContent).toContain('$12.50');
    expect(total.textContent).not.toContain('USD');
    // 12,50 × 200 = 2.500 Bs
    await waitFor(() => expect(total.textContent).toContain('2.500'));
  });

  it('vacío, ofrece volver al catálogo en vez de dejar un callejón', async () => {
    await abrir();
    const volver = await screen.findByRole('link', { name: 'Seguir comprando' });
    expect(volver.getAttribute('href')).toBe('/tienda/');
  });

  it('la miniatura es la de la variante que se eligió', async () => {
    sembrar([RENGLON]);
    await abrir();
    const foto = (await screen.findAllByRole('presentation', { hidden: true }))[0] as HTMLImageElement;
    expect(foto.src).toContain('rojo.jpg');
  });
});
