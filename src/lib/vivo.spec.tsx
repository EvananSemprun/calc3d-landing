/**
 * `useEnVivo`: lo horneado primero, lo de la API después.
 *
 * Es el corazón de que la tienda sea reactiva sin dejar de ser estática, así que lo que
 * se fija acá es el ORDEN: nunca una pantalla vacía esperando a la red.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEnVivo } from './vivo';
import { useCruce } from '@/components/ui/Cruce';

function Sonda({ inicial, cargar }: { inicial: string; cargar: () => Promise<string> }) {
  const { datos, error } = useEnVivo(inicial, cargar);
  // `useCruce` es el consumidor real de este hook: marca el elemento cuando el dato
  // cambia. Se monta en la sonda para poder preguntar «¿cambió algo?» de la misma forma
  // en que lo pregunta la tienda, en vez de con una comparación inventada acá.
  const cruce = useCruce(datos);
  return (
    <div>
      <span data-testid="datos" {...cruce}>
        {datos}
      </span>
      {error && <span data-testid="error">falló</span>}
    </div>
  );
}

const cruzo = () => screen.getByTestId('datos').hasAttribute('data-cruce');

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

/**
 * **Con la API caída no hay nada que cruzar.**
 *
 * Es la contracara del cruce del refresco (2026-11-09). Cuando la API no contesta,
 * `useEnVivo` **conserva lo horneado**: el dato no cambió, así que fundirlo haría
 * parpadear datos viejos como si fueran nuevos — el visitante vería movimiento donde no
 * pasó nada, y justo en el momento en que lo que hay en pantalla es lo MENOS fresco.
 *
 * Lo que sostiene eso es que `datos` siga siendo **la misma referencia** que `inicial`.
 *
 * ⚠️ **Y por eso la sonda de acá abajo lleva un OBJETO y no un texto**, aunque el texto
 * sea más corto de escribir. La mutación que hay que atajar es un `catch` que reponga lo
 * horneado (`setDatos({ ...inicial })`, un `structuredClone`, el resultado de volver a
 * derivarlo): con un texto, el valor repuesto es `Object.is`-igual y **el test queda
 * verde con el defecto puesto**. Con un objeto —que es lo que la tienda pasa de verdad:
 * el catálogo, la ficha y los relacionados— la referencia cambia, `useCruce` lo ve y el
 * test se pone rojo. Validado con esa mutación exacta el 2026-11-09.
 */
const HORNEADO = { texto: 'horneado' };
type Dato = typeof HORNEADO;

function SondaObjeto({ cargar }: { cargar: () => Promise<Dato> }) {
  const { datos, error } = useEnVivo(HORNEADO, cargar);
  const cruce = useCruce(datos);
  return (
    <div>
      <span data-testid="datos" {...cruce}>
        {datos.texto}
      </span>
      {error && <span data-testid="error">falló</span>}
    </div>
  );
}

const caida = async (): Promise<Dato> => {
  throw new Error('caída');
};

describe('useEnVivo con la API caída', () => {
  it('conserva lo horneado y no reporta ningún cambio de dato', async () => {
    render(<SondaObjeto cargar={caida} />);
    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
    expect(screen.getByTestId('datos')).toHaveTextContent('horneado');
    expect(
      cruzo(),
      'Cruzó con la API caída. No cambió ningún dato: lo que se ve es lo horneado de ' +
        'siempre, y fundirlo haría parpadear datos viejos como si fueran nuevos, justo ' +
        'cuando lo que hay en pantalla es lo MENOS fresco.',
    ).toBe(false);
  });

  it('cuando SÍ cambia, cruza (si no, el caso de arriba no probaría nada)', async () => {
    // Sin este caso, un `useCruce` que no marcara nunca dejaría verde al test anterior.
    render(<SondaObjeto cargar={async () => ({ texto: 'en vivo' })} />);
    await waitFor(() => expect(screen.getByTestId('datos')).toHaveTextContent('en vivo'));
    expect(cruzo()).toBe(true);
  });

  it('no vuelve a pedir después de fallar', async () => {
    // El tope público de la API es 120 peticiones por minuto, y el costo de fallar es
    // ver datos de hace un rato: reintentar sale más caro que la falla. Quien quiera
    // reintentar, recarga.
    const cargar = vi.fn(caida);
    const { rerender } = render(<SondaObjeto cargar={cargar} />);
    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
    rerender(<SondaObjeto cargar={cargar} />);
    rerender(<SondaObjeto cargar={cargar} />);
    expect(cargar).toHaveBeenCalledTimes(1);
  });
});
