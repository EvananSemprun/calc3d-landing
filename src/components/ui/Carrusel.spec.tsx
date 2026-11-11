/**
 * EL CARRUSEL DE LA PORTADA (2026-11-11).
 *
 * ⚠️ **En jsdom no hay layout**: `scrollWidth`, `clientWidth` y `scrollLeft` valen 0 y
 * `scrollBy` no existe. Así que acá NO se mide geometría — eso se mide en un navegador —
 * sino el CABLEADO: que las flechas existan con su nombre, que se apaguen con los números
 * que se les den, que muevan la pista, y que un arrastre no termine abriendo un producto.
 * Los valores de scroll se INYECTAN; no se leen de un layout que no existe.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Carrusel from './Carrusel';

const pista = () => screen.getByRole('group', { name: 'Navidad' });
const izq = () => screen.getByRole('button', { name: 'Anterior de Navidad' }) as HTMLButtonElement;
const der = () => screen.getByRole('button', { name: 'Siguiente de Navidad' }) as HTMLButtonElement;

/** Le pone a la pista las medidas que jsdom no calcula, y avisa del scroll. */
function medidas(el: HTMLElement, { scrollLeft = 0, clientWidth = 400, scrollWidth = 1200 } = {}) {
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(el, 'scrollLeft', { value: scrollLeft, writable: true, configurable: true });
  fireEvent.scroll(el);
}

const tarjetas = (
  <>
    <a href="/producto/uno/">Uno</a>
    <a href="/producto/dos/">Dos</a>
  </>
);

describe('Carrusel', () => {
  it('las flechas tienen nombre y dicen de qué fila son', () => {
    // Con dos franjas en la portada, «Anterior» a secas no distingue una de otra.
    render(<Carrusel etiqueta="Navidad">{tarjetas}</Carrusel>);
    expect(izq()).toBeTruthy();
    expect(der()).toBeTruthy();
    expect(pista()).toBeTruthy();
  });

  it('al principio la izquierda está apagada y la derecha encendida', () => {
    render(<Carrusel etiqueta="Navidad">{tarjetas}</Carrusel>);
    medidas(pista(), { scrollLeft: 0 });
    expect(izq().disabled).toBe(true);
    expect(der().disabled).toBe(false);
  });

  it('al final se invierte', () => {
    render(<Carrusel etiqueta="Navidad">{tarjetas}</Carrusel>);
    medidas(pista(), { scrollLeft: 800, clientWidth: 400, scrollWidth: 1200 });
    expect(izq().disabled).toBe(false);
    expect(der().disabled).toBe(true);
  });

  it('tolera 1px de diferencia al final', () => {
    // Con zoom o anchos fraccionarios `scrollLeft` no llega al entero exacto, y sin la
    // tolerancia la flecha derecha se queda encendida para siempre al final.
    render(<Carrusel etiqueta="Navidad">{tarjetas}</Carrusel>);
    medidas(pista(), { scrollLeft: 799.4, clientWidth: 400, scrollWidth: 1200 });
    expect(der().disabled).toBe(true);
  });

  it('la flecha mueve la pista al destino correcto, y lo RECORTA en los extremos', () => {
    // ⚠️ El componente NO usa `behavior: 'smooth'` —medido: no mueve nada— sino una
    // animación propia con `requestAnimationFrame`. Acá se le da un rAF que responde con
    // un instante muy posterior, así la animación termina en un paso y el test mide el
    // DESTINO, que es lo que decide la lógica, sin depender de cuadros.
    const rafReal = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(performance.now() + 10_000);
      return 0;
    }) as typeof requestAnimationFrame;
    try {
      render(<Carrusel etiqueta="Navidad">{tarjetas}</Carrusel>);
      const el = pista();
      medidas(el, { scrollLeft: 0, clientWidth: 400, scrollWidth: 1200 });

      // Avanza casi una pantalla: 400 × 0,9 = 360.
      fireEvent.click(der());
      expect(Math.round(el.scrollLeft)).toBe(360);

      // Y vuelve: 360 − 360 = 0, recortado en 0 y nunca negativo.
      medidas(el, { scrollLeft: 360, clientWidth: 400, scrollWidth: 1200 });
      fireEvent.click(izq());
      expect(Math.round(el.scrollLeft)).toBe(0);
    } finally {
      globalThis.requestAnimationFrame = rafReal;
    }
  });

  it('no se pasa del final aunque el salto sea más grande que lo que queda', () => {
    // El recorte del otro extremo: sin él, la pista queda en un scroll imposible y la
    // flecha derecha no se apagaría nunca.
    const rafReal = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(performance.now() + 10_000);
      return 0;
    }) as typeof requestAnimationFrame;
    try {
      render(<Carrusel etiqueta="Navidad">{tarjetas}</Carrusel>);
      const el = pista();
      // Quedan 40 px hasta el final (800 − 760) y el salto pide 360.
      medidas(el, { scrollLeft: 760, clientWidth: 400, scrollWidth: 1200 });
      fireEvent.click(der());
      expect(Math.round(el.scrollLeft)).toBe(800);
    } finally {
      globalThis.requestAnimationFrame = rafReal;
    }
  });

  it('ARRASTRAR no abre el producto que quedó debajo', () => {
    // Es el defecto clásico de estos carruseles: deslizás la fila y se te abre una ficha.
    const alClic = vi.fn();
    render(
      <Carrusel etiqueta="Navidad">
        <a href="/producto/uno/" onClick={alClic}>
          Uno
        </a>
      </Carrusel>,
    );
    const el = pista();
    Object.defineProperty(el, 'scrollLeft', { value: 0, writable: true, configurable: true });

    fireEvent.pointerDown(el, { pointerType: 'mouse', clientX: 200 });
    fireEvent.pointerMove(el, { pointerType: 'mouse', clientX: 120 });
    fireEvent.pointerUp(el, { pointerType: 'mouse', clientX: 120 });
    fireEvent.click(screen.getByText('Uno'));

    expect(alClic).not.toHaveBeenCalled();
  });

  it('un CLIC quieto sí abre el producto', () => {
    // El hermano alcanzable: sin él, un carrusel que bloqueara todos los clics pasaría
    // el test de arriba y la fila no llevaría a ningún lado.
    const alClic = vi.fn();
    render(
      <Carrusel etiqueta="Navidad">
        <a href="/producto/uno/" onClick={alClic}>
          Uno
        </a>
      </Carrusel>,
    );
    const el = pista();
    fireEvent.pointerDown(el, { pointerType: 'mouse', clientX: 200 });
    fireEvent.pointerUp(el, { pointerType: 'mouse', clientX: 200 });
    fireEvent.click(screen.getByText('Uno'));

    expect(alClic).toHaveBeenCalled();
  });

  it('el DEDO no pasa por el arrastre del mouse', () => {
    // El scroll táctil lo hace el navegador. Si este componente lo interceptara, el
    // teléfono se sentiría peor que con un scroll normal.
    const alClic = vi.fn();
    render(
      <Carrusel etiqueta="Navidad">
        <a href="/producto/uno/" onClick={alClic}>
          Uno
        </a>
      </Carrusel>,
    );
    const el = pista();
    fireEvent.pointerDown(el, { pointerType: 'touch', clientX: 200 });
    fireEvent.pointerMove(el, { pointerType: 'touch', clientX: 120 });
    fireEvent.pointerUp(el, { pointerType: 'touch', clientX: 120 });
    fireEvent.click(screen.getByText('Uno'));

    // No se marcó como arrastre, así que el clic sigue siendo un clic.
    expect(alClic).toHaveBeenCalled();
  });
});
