/**
 * La franja de la colección bajo el hero: cableado en pantalla.
 *
 * ⚠️ Lo que se fija: sin colección NO se dibuja nada (ni una sección vacía, ni «Destacados»,
 * que es otra franja), y la respuesta «no hay colección» de la API vacía lo horneado.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ColeccionEnVivo from './ColeccionEnVivo';
import { franjaDePortada, type ColeccionPortada } from '@/lib/portada';
import { adapt } from '@/lib/producto';

const fetchColeccion = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async () => {
  const real = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...real, fetchColeccion };
});

const prod = (id: string) => adapt({ slug: id, name: `Pieza ${id}`, priceUsd: 5, minQty: 1 });
const coleccion = (ids: string[]): ColeccionPortada => ({
  slug: 'navidad',
  titulo: 'Colección Navidad',
  subtitulo: null,
  verTodo: { tipo: 'NONE', valor: null },
  productos: ids.map(prod),
});

describe('ColeccionEnVivo', () => {
  it('sin colección horneada ni en vivo no dibuja ninguna sección', async () => {
    fetchColeccion.mockResolvedValue(null);
    const { container } = render(<ColeccionEnVivo inicial={null} tope={8} tasa={null} />);
    await waitFor(() => expect(fetchColeccion).toHaveBeenCalled());
    expect(container.querySelector('section')).toBeNull();
    expect(screen.queryByText('Destacados')).toBeNull();
  });

  it('una colección sin productos no dibuja la sección', async () => {
    fetchColeccion.mockResolvedValue(coleccion([]));
    const { container } = render(<ColeccionEnVivo inicial={null} tope={8} tasa={null} />);
    await waitFor(() => expect(fetchColeccion).toHaveBeenCalled());
    expect(container.querySelector('section')).toBeNull();
  });

  it('pinta la colección horneada y la reemplaza por la que responde la API', async () => {
    fetchColeccion.mockResolvedValue(coleccion(['nuevo']));
    render(<ColeccionEnVivo inicial={franjaDePortada(coleccion(['viejo']), 8)} tope={8} tasa={null} />);
    expect(screen.getByText('Pieza viejo')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Pieza nuevo')).toBeTruthy());
    expect(screen.queryByText('Pieza viejo')).toBeNull();
  });

  it('si el dueño la apagó (API responde null), desaparece lo horneado', async () => {
    fetchColeccion.mockResolvedValue(null);
    render(<ColeccionEnVivo inicial={franjaDePortada(coleccion(['viejo']), 8)} tope={8} tasa={null} />);
    await waitFor(() => expect(screen.queryByText('Pieza viejo')).toBeNull());
  });

  it('si la API se cae, conserva lo horneado', async () => {
    fetchColeccion.mockRejectedValue(new Error('500'));
    render(<ColeccionEnVivo inicial={franjaDePortada(coleccion(['viejo']), 8)} tope={8} tasa={null} />);
    await waitFor(() => expect(fetchColeccion).toHaveBeenCalled());
    expect(screen.getByText('Pieza viejo')).toBeTruthy();
  });
});
