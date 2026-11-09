/**
 * «También te puede servir» DEJA DE OFRECER LO BORRADO (2026-11-08).
 *
 * La franja se elegía en el build y se pintaba como marcado de Astro: un producto
 * borrado seguía ofreciéndose desde todas las fichas, con su enlace y su precio, hasta
 * el próximo despliegue.
 *
 * ⚠️ `relacionadosDe` ya tiene sus tests de función pura. Lo que se fija acá es el
 * CABLEADO: que la franja vuelva a preguntar y reemplace lo horneado. Volver a pintar
 * `inicial` directo deja los 6 tests puros en verde y la franja congelada otra vez.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RelacionadosEnVivo from './RelacionadosEnVivo';
import type { ProductoVitrina } from '@/lib/producto';

const fetchProductosCompletos = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async () => {
  const real = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...real, fetchProductosCompletos };
});

const p = (id: string, name: string, cat = 'navidad'): ProductoVitrina =>
  ({
    id,
    name,
    cat,
    catLabel: 'Navidad',
    price: 8,
    compareAt: null,
    priceTiers: [],
    desc: '',
    kind: 'PHYSICAL',
    minQty: 1,
    material: null,
    badge: null,
    nuevo: false,
    custom: false,
    requiresOptions: false,
    specs: [],
    ship: null,
    image: null,
    images: null,
    description: null,
    optionGroups: [],
    colorList: [],
    colors: [],
  }) as ProductoVitrina;

const ACTUAL = { id: 'arbol', cat: 'navidad' };

describe('RelacionadosEnVivo', () => {
  it('reemplaza lo horneado con lo que hay AHORA en el catálogo', async () => {
    // El build ofrecía la bola; ya no está en la API.
    fetchProductosCompletos.mockResolvedValue([p('arbol', 'Árbol'), p('estrella', 'Estrella')]);
    render(<RelacionadosEnVivo inicial={[p('bola', 'Bola')]} actual={ACTUAL} tasa={null} />);

    await waitFor(() => expect(screen.getByText('Estrella')).toBeTruthy());
    expect(screen.queryByText('Bola')).toBeNull();
  });

  it('si no queda ninguno, la sección entera desaparece', async () => {
    fetchProductosCompletos.mockResolvedValue([p('arbol', 'Árbol')]);
    render(<RelacionadosEnVivo inicial={[p('bola', 'Bola')]} actual={ACTUAL} tasa={null} />);

    await waitFor(() => expect(screen.queryByText('Bola')).toBeNull());
    expect(screen.queryByText(/te puede servir/i)).toBeNull();
  });

  it('nunca se ofrece a sí mismo, aunque venga en la respuesta', async () => {
    fetchProductosCompletos.mockResolvedValue([p('arbol', 'Árbol'), p('bola', 'Bola')]);
    render(<RelacionadosEnVivo inicial={[]} actual={ACTUAL} tasa={null} />);

    await waitFor(() => expect(screen.getByText('Bola')).toBeTruthy());
    expect(screen.queryByText('Árbol')).toBeNull();
  });

  it('si la API falla se conserva lo horneado: una sugerencia vieja no engaña', async () => {
    fetchProductosCompletos.mockRejectedValue(new Error('sin red'));
    render(<RelacionadosEnVivo inicial={[p('bola', 'Bola')]} actual={ACTUAL} tasa={null} />);

    await waitFor(() => expect(screen.getByText('Bola')).toBeTruthy());
  });

  it('con lo horneado vacío no dibuja la sección antes de que conteste la API', () => {
    fetchProductosCompletos.mockReturnValue(new Promise(() => {}));
    render(<RelacionadosEnVivo inicial={[]} actual={ACTUAL} tasa={null} />);

    expect(screen.queryByText(/te puede servir/i)).toBeNull();
  });
});
