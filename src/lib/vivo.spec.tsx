/**
 * `useEnVivo`: lo horneado primero, lo de la API después.
 *
 * Es el corazón de que la tienda sea reactiva sin dejar de ser estática, así que lo que
 * se fija acá es el ORDEN: nunca una pantalla vacía esperando a la red.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEnVivo } from './vivo';

function Sonda({ inicial, cargar }: { inicial: string; cargar: () => Promise<string> }) {
  const { datos, error } = useEnVivo(inicial, cargar);
  return (
    <div>
      <span data-testid="datos">{datos}</span>
      {error && <span data-testid="error">falló</span>}
    </div>
  );
}

describe('useEnVivo', () => {
  it('pinta lo horneado ANTES de que conteste la API', () => {
    render(<Sonda inicial="horneado" cargar={() => new Promise(() => {})} />);
    // Sin esperar nada: el primer pintado ya tiene datos.
    expect(screen.getByTestId('datos')).toHaveTextContent('horneado');
  });

  it('lo reemplaza con lo que trae la API', async () => {
    render(<Sonda inicial="horneado" cargar={async () => 'en vivo'} />);
    await waitFor(() => expect(screen.getByTestId('datos')).toHaveTextContent('en vivo'));
  });

  it('si la API falla, se queda lo horneado y avisa', async () => {
    render(<Sonda inicial="horneado" cargar={async () => { throw new Error('caída'); }} />);
    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
    // Lo importante: NO se vació la pantalla.
    expect(screen.getByTestId('datos')).toHaveTextContent('horneado');
  });

  it('pide UNA sola vez, aunque la función de carga cambie en cada render', async () => {
    const cargar = vi.fn(async () => 'en vivo');
    const { rerender } = render(<Sonda inicial="h" cargar={cargar} />);
    await waitFor(() => expect(screen.getByTestId('datos')).toHaveTextContent('en vivo'));
    // Un literal nuevo en cada render: sin la ref, el efecto volvería a pedir en bucle
    // contra una API con tope de 120 por minuto.
    rerender(<Sonda inicial="h" cargar={async () => 'otra'} />);
    rerender(<Sonda inicial="h" cargar={async () => 'otra mas'} />);
    expect(cargar).toHaveBeenCalledTimes(1);
  });
});
