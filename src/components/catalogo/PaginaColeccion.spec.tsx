/**
 * La página de una colección (`/coleccion/<slug>/`): cableado en pantalla.
 *
 * ⚠️ Lo que se fija es que la página pinte EXACTAMENTE lo que la API resolvió (que es lo
 * que `resolverColeccion` decidió, la misma función de la vista previa del panel) y que
 * un slug que la API no conoce no rompa: dice que ya no está, aunque haya página horneada.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PaginaColeccion from './PaginaColeccion';
import { NoExiste } from '@/lib/api';
import type { ColeccionPortada } from '@/lib/portada';
import { adapt } from '@/lib/producto';

const fetchColeccionPorSlug = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async () => {
  const real = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...real, fetchColeccionPorSlug };
});

const prod = (id: string) => adapt({ slug: id, name: `Pieza ${id}`, priceUsd: 5, minQty: 1 });
const coleccion = (ids: string[]): ColeccionPortada => ({
  slug: 'regalos',
  titulo: 'Para regalar',
  subtitulo: 'Ideas',
  verTodo: { tipo: 'NONE', valor: null },
  productos: ids.map(prod),
});

describe('PaginaColeccion', () => {
  it('pinta los productos que la API resolvió, en su orden, y reemplaza lo horneado', async () => {
    fetchColeccionPorSlug.mockResolvedValue(coleccion(['b', 'a']));
    render(<PaginaColeccion inicial={coleccion(['viejo'])} slug="regalos" tasa={null} />);
    await waitFor(() => expect(screen.getByText('Pieza b')).toBeTruthy());
    expect(screen.queryByText('Pieza viejo')).toBeNull();
    const nombres = screen.getAllByText(/^Pieza /).map((n) => n.textContent);
    expect(nombres).toEqual(['Pieza b', 'Pieza a']);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Para regalar');
  });

  it('un slug que la API no conoce NO rompe: avisa que ya no está, aunque haya horneado', async () => {
    fetchColeccionPorSlug.mockRejectedValue(new NoExiste('/public/store/coleccion/fantasma'));
    render(<PaginaColeccion inicial={coleccion(['viejo'])} slug="fantasma" tasa={null} />);
    await waitFor(() => expect(screen.getByText(/ya no está disponible/i)).toBeTruthy());
    expect(screen.queryByText('Pieza viejo')).toBeNull();
  });

  it('si la API se cae, conserva lo horneado', async () => {
    fetchColeccionPorSlug.mockRejectedValue(new Error('500'));
    render(<PaginaColeccion inicial={coleccion(['viejo'])} slug="regalos" tasa={null} />);
    await waitFor(() => expect(fetchColeccionPorSlug).toHaveBeenCalled());
    expect(screen.getByText('Pieza viejo')).toBeTruthy();
  });
});
