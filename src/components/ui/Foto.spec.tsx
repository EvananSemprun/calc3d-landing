/**
 * `<Foto>`: la `<img>` de toda foto remota de la tienda.
 *
 * ⚠️ **jsdom NO aplica CSS**, así que acá no se mide `opacity` con `getComputedStyle`:
 * daría verde con el CSS roto. Lo que se amarra es la ESTRUCTURA (qué atributos salen y
 * cuándo); el bloque de `global.css` lo verifica `src/fotos-funden.spec.ts` leyendo el
 * texto del archivo. Mismo reparto que en `hover-con-reduce.spec.ts` y
 * `catalogo/insignias.spec.tsx`.
 *
 * Los dos tests que no son obvios, y por qué están:
 *
 * 1. **«el marcado inicial NO lleva la marca»** se mide sobre `renderToStaticMarkup`, que
 *    es exactamente lo que Astro hornea en el build. Si la marca apareciera ahí, el HTML
 *    servido a Google y a quien tenga el JS roto traería las fotos en opacidad 0: el modo
 *    de falla de toda esta tarea. Medirlo con `render()` no sirve — testing-library
 *    descarga los efectos, así que ahí la marca YA está puesta (y debe estarlo).
 *
 * 2. **«pasa className TAL CUAL»** tapa un agujero ENTRE los dos guardianes.
 *    `fotos-reservan-espacio.spec.ts` lee el CSS y es **ciego** a que el JSX pierda la
 *    clase: si `<Foto>` se comiera el `className`, `.product-photo` y compañía dejarían
 *    de aplicar, la reserva de espacio se caería **y los dos guardianes seguirían en
 *    verde**. Este repo ya fue mordido dos veces por ese patrón (la insignia «Nuevo», la
 *    moneda «USD»).
 */
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TECHO_CARGA_MS } from '@/lib/foto';
import Foto from './Foto';

afterEach(() => {
  vi.useRealTimers();
});

const img = () => screen.getByAltText('Un reno');

describe('<Foto>', () => {
  it('el marcado inicial NO lleva la marca de «no cargada» (es lo que se hornea)', () => {
    const html = renderToStaticMarkup(
      <Foto src="https://fotos.bananolab-3d.com/reno.jpg" alt="Un reno" className="product-photo" />,
    );
    expect(html).not.toContain('data-cargando');
    // Y tampoco una opacidad en línea, el otro modo de esconderla.
    expect(html).not.toMatch(/opacity/i);
  });

  it('sin prioridad marca la foto después de montar (si no, no habría fundido)', () => {
    render(<Foto src="/reno.jpg" alt="Un reno" />);
    expect(img()).toHaveAttribute('data-cargando');
  });

  it('con prioridad no marca nunca, ni después de montar', () => {
    render(<Foto src="/reno.jpg" alt="Un reno" prioridad />);
    expect(img()).not.toHaveAttribute('data-cargando');
    // `data-fundir` es lo que le da la transición: una candidata a LCP no la lleva.
    expect(img()).not.toHaveAttribute('data-fundir');
  });

  it('pasa width y height cuando se los dan', () => {
    render(<Foto src="/reno.jpg" alt="Un reno" width={800} height={600} />);
    expect(img()).toHaveAttribute('width', '800');
    expect(img()).toHaveAttribute('height', '600');
  });

  it('no inventa width ni height cuando no se los dan', () => {
    // La mayoría de las fotos vienen de R2 sin medidas conocidas: la reserva de espacio
    // la hace el `aspect-ratio` del CSS. Un `width="0"` inventado la rompería.
    render(<Foto src="/reno.jpg" alt="Un reno" />);
    expect(img()).not.toHaveAttribute('width');
    expect(img()).not.toHaveAttribute('height');
  });

  it('pasa className TAL CUAL al <img>', () => {
    render(<Foto src="/reno.jpg" alt="Un reno" className="product-photo" />);
    expect(img().getAttribute('class')).toBe('product-photo');
  });

  it('pasa loading tal cual al <img>', () => {
    render(<Foto src="/reno.jpg" alt="Un reno" loading="lazy" />);
    expect(img()).toHaveAttribute('loading', 'lazy');
  });

  it('la marca desaparece al pasar TECHO_CARGA_MS sin onLoad', () => {
    vi.useFakeTimers();
    render(<Foto src="/reno.jpg" alt="Un reno" />);
    expect(img()).toHaveAttribute('data-cargando');
    vi.advanceTimersByTime(TECHO_CARGA_MS);
    expect(img()).not.toHaveAttribute('data-cargando');
  });
});
