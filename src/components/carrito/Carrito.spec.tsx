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

/**
 * EL PEDIDO VA DIRECTO A WHATSAPP (2026-11-11).
 *
 * ⚠️ Estos tres casos nacen porque este archivo **nunca cubrió el checkout**: al sacar el
 * formulario y el `POST` a la bandeja, los 5 tests de arriba quedaron verdes sin mirar el
 * cambio. Un spec que no se pone rojo cuando se borra medio componente no estaba
 * protegiendo esa mitad.
 */
describe('el pedido va directo a WhatsApp', () => {
  it('no pide ningún dato: el botón está sin pasar por un formulario', async () => {
    sembrar([RENGLON]);
    await abrir();

    const boton = await screen.findByRole('link', { name: 'Pedir por WhatsApp' });
    expect(boton.getAttribute('href')).toContain('wa.me/584146317864');
    // El mensaje lleva el pedido armado: pieza, cantidad y total.
    const href = decodeURIComponent(boton.getAttribute('href') ?? '');
    expect(href).toContain('Identificadores para lápices');
    expect(href).toContain('Total: $12.50 BCV');

    // Y no quedó ningún campo de contacto en el camino.
    expect(screen.queryByLabelText(/nombre/i)).toBeNull();
    expect(screen.queryByLabelText(/whatsapp/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /enviar pedido/i })).toBeNull();
  });

  it('no dice que el pedido quedó registrado, porque ya no se registra', async () => {
    sembrar([RENGLON]);
    await abrir();
    await screen.findByRole('link', { name: 'Pedir por WhatsApp' });
    // El texto viejo afirmaba algo que dejó de ser cierto: es la clase de mentira que
    // nadie nota, porque se lee bien.
    expect(screen.queryByText(/bandeja/i)).toBeNull();
    expect(screen.queryByText(/Recibimos tu pedido/i)).toBeNull();
  });

  it('cerrar el cajón NO vacía el carrito', async () => {
    // Sin copia en el servidor, vaciar sobre un mensaje que capaz no se envió es perder
    // el pedido entero. Es la regla 1 del encabezado del componente.
    sembrar([RENGLON]);
    await abrir();
    await screen.findByRole('link', { name: 'Pedir por WhatsApp' });

    fireEvent.click(screen.getByRole('button', { name: 'cerrar' }));

    await waitFor(() => expect(screen.getByLabelText('Carrito').className).not.toContain('open'));
    expect(JSON.parse(localStorage.getItem(CLAVE_CARRITO) ?? '[]')).toHaveLength(1);
  });
});

describe('un carrito roto en el teléfono (2026-11-12)', () => {
  it('con qty 1e+60 guardado, el cajón muestra el tope y el enlace NO lleva «e+»', async () => {
    sembrar([{ ...RENGLON, qty: 1e60 }]);
    await abrir();
    await waitFor(() => expect(screen.getByText(/Pedir por WhatsApp/)).toBeTruthy());
    const href = (screen.getByText(/Pedir por WhatsApp/) as HTMLAnchorElement).href;
    const msg = decodeURIComponent(href);
    expect(msg).not.toMatch(/e\+/i);
    expect(msg).toContain('999 ×');
    expect(document.body.textContent).not.toMatch(/e\+60/);
  });
});

describe('un renglón que no se puede mandar (2026-11-12)', () => {
  it('con un precio que desborda NO hay enlace de WhatsApp y se dice qué corregir', async () => {
    // 1e308 pasa el saneado (es finito) pero × 5 da Infinity: solo lo ataja la validación.
    sembrar([{ ...RENGLON, qty: 5, unit: 1e308, priceTiers: undefined }]);
    await abrir();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('Identificadores para lápices');
    expect(screen.queryByText(/Pedir por WhatsApp/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/Infinity|NaN/);
  });
});

describe('nombres para varias unidades en el cajón (2026-11-12)', () => {
  const ARBOL = {
    id: 'arbol',
    qty: 3,
    opts: { Tamaño: '15 cm', Nombres: 'Hasta 6 nombres' },
    unit: 7,
    nombre: 'Árbol de Navidad con nombres',
    customNote: 'Benedetto',
  };

  it('sin aclarar NO hay enlace; pregunta; al responder «Sí» aparece el enlace con la aclaración', async () => {
    sembrar([ARBOL]);
    await abrir();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText(/Pedir por WhatsApp/)).toBeNull();
    expect(screen.getByText('¿Los mismos nombres para las 3 unidades?')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Sí'));
    await waitFor(() => expect(screen.getByText(/Pedir por WhatsApp/)).toBeTruthy());
    const href = decodeURIComponent((screen.getByText(/Pedir por WhatsApp/) as HTMLAnchorElement).href);
    expect(href).toContain('(mismos nombres para los 3)');
  });
});
