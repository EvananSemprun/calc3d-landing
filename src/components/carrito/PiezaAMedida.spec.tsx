/**
 * COTIZAR UNA PIEZA A MEDIDA, DIRECTO A WHATSAPP (2026-11-11).
 *
 * Este modal no tenía ningún test: al sacarle el formulario de contacto y el `POST` a la
 * bandeja, nada en la suite se habría puesto rojo. Lo que se fija acá es el CABLEADO —
 * `mensajeConsulta` tiene su test de función pura y seguiría verde con el modal pidiendo
 * nombre y teléfono, o sin el botón.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PiezaAMedida from './PiezaAMedida';

vi.mock('@/lib/api', async () => {
  const real = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...real,
    fetchInfo: vi.fn().mockResolvedValue({
      businessName: 'Banano Lab',
      whatsappPhone: '04146317864',
      currency: 'USD',
      rate: null,
      storageReady: false,
    }),
  };
});

/** El modal intercepta por DELEGACIÓN los clics en `[data-bl="cotizar"]`. */
const abrir = () => {
  render(<PiezaAMedida />);
  const enlace = document.createElement('a');
  enlace.setAttribute('data-bl', 'cotizar');
  document.body.appendChild(enlace);
  fireEvent.click(enlace);
};

describe('cotizar una pieza a medida', () => {
  it('no pide nombre ni teléfono: solo qué necesitas', async () => {
    abrir();
    await screen.findByRole('dialog');

    expect(screen.queryByLabelText(/tu nombre/i)).toBeNull();
    expect(screen.queryByLabelText(/tu whatsapp/i)).toBeNull();
    expect(screen.getByLabelText(/qué necesitas/i)).toBeTruthy();
    // El texto viejo afirmaba que la consulta quedaba registrada. Ya no.
    expect(screen.queryByText(/Recibimos tu consulta/i)).toBeNull();
  });

  it('con la descripción escrita, el botón es un enlace a WhatsApp con ese texto', async () => {
    abrir();
    const campo = await screen.findByLabelText(/qué necesitas/i);
    fireEvent.change(campo, { target: { value: 'Una maceta de 20 cm en verde' } });

    const boton = await screen.findByRole('link', { name: 'Escribir por WhatsApp' });
    const href = decodeURIComponent(boton.getAttribute('href') ?? '');
    expect(href).toContain('wa.me/584146317864');
    expect(href).toContain('Una maceta de 20 cm en verde');
    expect(href).toContain('Banano Lab');
  });

  it('sin descripción el botón está APAGADO y dice qué falta, no desaparece', async () => {
    // Un botón que no está deja al cliente escribiendo sin saber qué le falta para
    // mandarlo. Con una descripción demasiado corta pasa lo mismo que con ninguna.
    abrir();
    const campo = await screen.findByLabelText(/qué necesitas/i);
    fireEvent.change(campo, { target: { value: 'hola' } });

    await waitFor(() => {
      const boton = screen.getByRole('button', { name: 'Escribir por WhatsApp' });
      expect(boton.hasAttribute('disabled')).toBe(true);
    });
    expect(screen.getByText(/un poco más de lo que necesitas/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Escribir por WhatsApp' })).toBeNull();
  });
});
