/**
 * EL CONTADOR EDITABLE (2026-11-11).
 *
 * Antes era un `<span>`: para pedir 24 unidades había que tocar «+» veinticuatro veces.
 * Acá se fija el comportamiento del campo, que es casi todo estado local y por eso no hay
 * ninguna función pura que lo cubra.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Cantidad from './Cantidad';

const campo = () => screen.getByLabelText('Cantidad') as HTMLInputElement;
const mas = () => screen.getByLabelText('más');
const menos = () => screen.getByLabelText('menos');

afterEach(() => vi.useRealTimers());

describe('Cantidad', () => {
  it('escribir una cifra la confirma EN EL ACTO, sin salir del campo', () => {
    // Es lo que hace que el total, el tramo de mayoreo y el carrito se muevan mientras
    // escribe. Si esperara al blur, el precio se quedaría viejo a la vista.
    const onCambiar = vi.fn();
    render(<Cantidad valor={1} onCambiar={onCambiar} />);
    fireEvent.change(campo(), { target: { value: '24' } });
    expect(onCambiar).toHaveBeenLastCalledWith(24);
  });

  it('se puede BORRAR para escribir otra cifra', () => {
    // Con un buffer numérico, vaciar el campo lo devolvería a 1 en el acto y escribir
    // «24» sería imposible: quedaría «124».
    const onCambiar = vi.fn();
    render(<Cantidad valor={5} onCambiar={onCambiar} />);
    fireEvent.change(campo(), { target: { value: '' } });
    expect(campo().value).toBe('');
    fireEvent.change(campo(), { target: { value: '3' } });
    expect(campo().value).toBe('3');
    expect(onCambiar).toHaveBeenLastCalledWith(3);
  });

  it('vacío, 0 y negativo vuelven al mínimo AL SALIR', () => {
    const onCambiar = vi.fn();
    const { rerender } = render(<Cantidad valor={4} minimo={2} onCambiar={onCambiar} />);
    fireEvent.change(campo(), { target: { value: '' } });
    fireEvent.blur(campo());
    expect(campo().value).toBe('2');
    expect(onCambiar).toHaveBeenLastCalledWith(2);

    rerender(<Cantidad valor={4} minimo={2} onCambiar={onCambiar} />);
    fireEvent.change(campo(), { target: { value: '0' } });
    fireEvent.blur(campo());
    expect(campo().value).toBe('2');
  });

  it('no deja escribir nada que no sea una cifra', () => {
    render(<Cantidad valor={1} onCambiar={vi.fn()} />);
    fireEvent.change(campo(), { target: { value: '-5x' } });
    expect(campo().value).toBe('5');
  });

  it('las flechas suben y bajan', () => {
    const onCambiar = vi.fn();
    render(<Cantidad valor={3} onCambiar={onCambiar} />);
    fireEvent.keyDown(campo(), { key: 'ArrowUp' });
    expect(onCambiar).toHaveBeenLastCalledWith(4);
    fireEvent.keyDown(campo(), { key: 'ArrowDown' });
    // Baja desde lo que quedó escrito (4), no desde el `valor` de la prop.
    expect(onCambiar).toHaveBeenLastCalledWith(3);
  });

  it('«menos» se APAGA en el mínimo en vez de borrar el renglón', () => {
    // Antes, en el carrito, bajar del mínimo quitaba el producto: fácil de hacer sin
    // querer y sin deshacer. Para sacarlo está «Quitar».
    render(<Cantidad valor={1} onCambiar={vi.fn()} />);
    expect((menos() as HTMLButtonElement).disabled).toBe(true);
    expect((mas() as HTMLButtonElement).disabled).toBe(false);
  });

  it('dejar apretado «+» REPITE', () => {
    // Sin esto, «pulsación mantenida» es una promesa del pedido que no cumple nadie, y
    // no fallaría ningún test.
    vi.useFakeTimers();
    const onCambiar = vi.fn();
    render(<Cantidad valor={1} onCambiar={onCambiar} />);

    fireEvent.pointerDown(mas());
    expect(onCambiar).toHaveBeenLastCalledWith(2); // el primer paso es inmediato
    act(() => void vi.advanceTimersByTime(400 + 90 * 3));
    expect(onCambiar).toHaveBeenLastCalledWith(6);

    fireEvent.pointerUp(mas());
    const ultimo = onCambiar.mock.calls.length;
    act(() => void vi.advanceTimersByTime(1000));
    expect(onCambiar.mock.calls.length, 'soltar tiene que FRENAR la repetición').toBe(ultimo);
  });

  it('un clic de teclado en «+» cuenta UNA sola vez', () => {
    // El teclado no emite `pointerdown`: si el `click` no se filtrara, el mouse contaría
    // dos pasos por clic y el teclado ninguno.
    const onCambiar = vi.fn();
    render(<Cantidad valor={1} onCambiar={onCambiar} />);
    fireEvent.click(mas());
    expect(onCambiar).toHaveBeenCalledTimes(1);
    expect(onCambiar).toHaveBeenLastCalledWith(2);
  });

  it('un clic de MOUSE en «+» también cuenta una sola vez', () => {
    // `pointerdown` y después `click`: el segundo se descarta.
    const onCambiar = vi.fn();
    render(<Cantidad valor={1} onCambiar={onCambiar} />);
    fireEvent.pointerDown(mas());
    fireEvent.pointerUp(mas());
    fireEvent.click(mas());
    expect(onCambiar).toHaveBeenCalledTimes(1);
  });
});

/**
 * EL TOPE (2026-11-12). Bug en producción: pegar un 1 y sesenta ceros pasaba el filtro de
 * «solo dígitos» y el pedido salió como «1e+60 × … Total: $7e+60 BCV».
 */
describe('Cantidad: el tope', () => {
  const AVISO = 'Para más de 999 unidades escríbenos por WhatsApp';

  it.each([
    ['1e60', '160'], // la «e» se quita: queda 160, dentro del tope
    ['1e+60', '160'],
    ['-5', '5'],
    ['2.5', '25'],
  ])('«%s» no produce nada fuera de rango', (escrito, esperado) => {
    const onCambiar = vi.fn();
    render(<Cantidad valor={1} onCambiar={onCambiar} />);
    fireEvent.change(campo(), { target: { value: escrito } });
    expect(campo().value).toBe(esperado);
    for (const [n] of onCambiar.mock.calls) expect(n).toBeLessThanOrEqual(999);
  });

  it('999999 se queda en 999 y AVISA a la vista', () => {
    const onCambiar = vi.fn();
    render(<Cantidad valor={1} onCambiar={onCambiar} />);
    fireEvent.change(campo(), { target: { value: '999999' } });
    expect(campo().value).toBe('999');
    expect(onCambiar).toHaveBeenLastCalledWith(999);
    expect(screen.getByRole('status').textContent).toBe(AVISO);
  });

  it('un pegado de 61 dígitos (1 y sesenta ceros) queda en 999', () => {
    const onCambiar = vi.fn();
    render(<Cantidad valor={1} onCambiar={onCambiar} />);
    fireEvent.change(campo(), { target: { value: '1' + '0'.repeat(60) } });
    expect(campo().value).toBe('999');
    expect(onCambiar).toHaveBeenLastCalledWith(999);
    expect(onCambiar.mock.calls.some(([n]) => !Number.isFinite(n) || n > 999)).toBe(false);
  });

  it('un pegado de cientos de dígitos (Number da Infinity) también', () => {
    const onCambiar = vi.fn();
    render(<Cantidad valor={1} onCambiar={onCambiar} />);
    fireEvent.change(campo(), { target: { value: '9'.repeat(400) } });
    expect(campo().value).toBe('999');
    expect(onCambiar).toHaveBeenLastCalledWith(999);
  });

  it('el aviso se va al volver a escribir una cantidad válida', () => {
    render(<Cantidad valor={1} onCambiar={vi.fn()} />);
    fireEvent.change(campo(), { target: { value: '5000' } });
    expect(screen.queryByRole('status')).not.toBeNull();
    fireEvent.change(campo(), { target: { value: '12' } });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('el tope es configurable por producto', () => {
    render(<Cantidad valor={1} maximo={50} onCambiar={vi.fn()} />);
    fireEvent.change(campo(), { target: { value: '51' } });
    expect(campo().value).toBe('50');
    expect(screen.getByRole('status').textContent).toBe('Para más de 50 unidades escríbenos por WhatsApp');
  });

  it('«+» y la flecha ↑ también respetan el tope, y avisan', () => {
    const onCambiar = vi.fn();
    render(<Cantidad valor={999} onCambiar={onCambiar} />);
    fireEvent.click(mas());
    expect(onCambiar).toHaveBeenLastCalledWith(999);
    expect(screen.getByRole('status').textContent).toBe(AVISO);
    fireEvent.keyDown(campo(), { key: 'ArrowUp' });
    expect(onCambiar).toHaveBeenLastCalledWith(999);
  });

  it('dejar apretado «+» se frena en el tope', () => {
    vi.useFakeTimers();
    const onCambiar = vi.fn();
    render(<Cantidad valor={995} onCambiar={onCambiar} />);
    fireEvent.pointerDown(mas());
    act(() => void vi.advanceTimersByTime(400 + 90 * 30));
    expect(onCambiar.mock.calls.every(([n]) => n <= 999)).toBe(true);
    expect(onCambiar).toHaveBeenLastCalledWith(999);
  });
});
