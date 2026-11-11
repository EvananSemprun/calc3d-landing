/**
 * El contador de la ficha y lo que muestra al moverlo.
 *
 * ⚠️ **Lo que se fija acá es el CABLEADO, no la cuenta.** `totalRenglon` y
 * `precioConTramos` ya tienen sus tests de función pura y seguirían verdes si alguien
 * borrara el renglón del total del JSX o dejara de pasarle `cantidad`. Eso es
 * exactamente lo que pasó antes del 2026-11-08: subir la cantidad no cambiaba un solo
 * número en pantalla, y los 190 tests del repo no se enteraron.
 *
 * El producto de prueba es el real que lo destapó (los identificadores para lápices):
 * tramos que BAJAN el precio a partir de 10 unidades, así el test cubre el caso tibio
 * —sumar dentro del mismo tramo— y el que cruza al siguiente.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster, toast } from 'sonner';
import Ficha from './Ficha';
import type { InfoApi } from '@/lib/api';
import type { ProductoVitrina } from '@/lib/producto';

const info: InfoApi = {
  businessName: 'Banano Lab',
  whatsappPhone: null,
  currency: 'USD',
  rate: null,
  storageReady: false,
};

// Los avisos viven en un store GLOBAL del módulo (no en el árbol de React): sin esto,
// el aviso de un test sigue en pie en el siguiente.
afterEach(() => toast.dismiss());

const producto = (extra: Partial<ProductoVitrina> = {}): ProductoVitrina => ({
  id: 'identificadores-para-lapices',
  name: 'Identificadores para lápices',
  cat: 'colegio',
  catLabel: 'Colegio',
  price: 1.5,
  compareAt: null,
  priceTiers: [
    { minQty: 10, discountPct: 0.17 },
    { minQty: 20, discountPct: 0.27 },
  ],
  desc: 'Con el nombre y el color que elijas.',
  kind: 'PHYSICAL',
  minQty: 1,
  material: 'PLA',
  badge: null,
  nuevo: false,
  custom: false,
  requiresOptions: false,
  specs: [],
  ship: '2 días',
  image: null,
  images: null,
  description: null,
  optionGroups: [],
  colorList: [],
  colors: [],
  ...extra,
});

const mas = () => screen.getByLabelText('más');
const menos = () => screen.getByLabelText('menos');
/** El renglón del total, que es el que se mueve con el contador. */
const total = () => document.querySelector('.pdp-total');

describe('Ficha — el total se mueve con la cantidad', () => {
  beforeEach(() => localStorage.clear());

  it('con una sola unidad no muestra la cuenta: el precio grande YA es el total', () => {
    render(<Ficha producto={producto()} info={info} />);
    expect(total()).toBeNull();
    expect(screen.getByText('$1.50')).toBeTruthy();
  });

  it('al sumar aparece el total, y cambia en cada clic', () => {
    render(<Ficha producto={producto()} info={info} />);

    fireEvent.click(mas());
    expect(total()?.textContent).toContain('2 × $1.50');
    expect(total()?.textContent).toContain('$3.00');

    fireEvent.click(mas());
    expect(total()?.textContent).toContain('3 × $1.50');
    expect(total()?.textContent).toContain('$4.50');
  });

  it('al cruzar un tramo baja el unitario Y el total lo refleja', () => {
    render(<Ficha producto={producto({ minQty: 9 })} info={info} />);

    // 9 unidades: todavía al precio de lista
    expect(total()?.textContent).toContain('9 × $1.50');
    expect(total()?.textContent).toContain('$13.50');

    // La décima entra en el tramo: 1.50 − 17 % = 1.2450
    fireEvent.click(mas());
    expect(total()?.textContent).toContain('10 × $1.25');
    expect(total()?.textContent).toContain('$12.45');
  });

  it('el precio grande es el TOTAL, y el unitario va debajo (2026-11-09)', () => {
    // Antes el grande era el unitario y el total aparecía recién al pasar de 1, así que
    // el visitante no veía lo que iba a pagar hasta sumar.
    render(<Ficha producto={producto()} info={info} />);
    const grande = () => document.querySelector('.pdp-price')?.textContent ?? '';
    const unitario = () => document.querySelector('.pdp-unit')?.textContent ?? '';

    expect(grande()).toContain('$1.50');
    expect(unitario()).toContain('$1.50 c/u');

    fireEvent.click(mas());
    expect(grande()).toContain('$3.00');
    expect(grande()).not.toContain('c/u');
    expect(unitario()).toContain('$1.50 c/u');
  });

  it('el precio dice «$ BCV», que es la moneda publicada, y no «USD»', () => {
    render(<Ficha producto={producto()} info={info} />);
    expect(document.querySelector('.pdp-price')?.textContent).toContain('BCV');
    expect(document.querySelector('.pdp-price')?.textContent).not.toContain('USD');
  });

  it('avisa cuando el precio que se está mostrando ya es el de mayoreo', () => {
    render(<Ficha producto={producto({ minQty: 9 })} info={info} />);
    const unitario = () => document.querySelector('.pdp-unit')?.textContent ?? '';
    expect(unitario()).not.toContain('mayor');

    fireEvent.click(mas()); // la décima entra en el tramo
    expect(unitario()).toContain('Precio por mayor aplicado');
  });

  it('bajar no perfora el mínimo del producto', () => {
    render(<Ficha producto={producto({ minQty: 6 })} info={info} />);
    expect(total()?.textContent).toContain('6 × $1.50');

    fireEvent.click(menos());
    fireEvent.click(menos());
    fireEvent.click(menos());
    expect(total()?.textContent).toContain('6 × $1.50');
    expect(total()?.textContent).toContain('$9.00');
  });

  it('el equivalente en bolívares acompaña al TOTAL grande', () => {
    render(
      <Ficha
        producto={producto()}
        info={{ ...info, rate: { rate: 200, currencyCode: 'Bs' } }}
      />,
    );
    fireEvent.click(mas());
    // 2 × 1.50 = 3.00 -> 600 Bs
    expect(document.querySelector('.pdp-price')?.textContent).toContain('600');
  });

  it('el plazo cambia al elegir una opción que tarda más (2026-11-09)', () => {
    // La cuenta vive en `diasDeEntrega` y ya tiene sus tests; lo que se fija acá es que
    // la PANTALLA use la elección. Volver a `hechosDeFicha(p)` deja los 8 de función
    // pura en verde y la ficha prometiendo el plazo del producto.
    render(
      <Ficha
        producto={producto({
          ship: '2 días',
          leadTimeDays: 2,
          optionGroups: [
            {
              name: 'Tamaño',
              required: true,
              options: [{ value: '15 cm' }, { value: '30 cm', leadTimeDays: 5 }],
            },
          ],
        } as Partial<ProductoVitrina>)}
        info={info}
      />,
    );
    expect(screen.getByText(/Listo en 2 días/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '30 cm' }));
    expect(screen.getByText(/Listo en 5 días/)).toBeTruthy();
    expect(screen.queryByText(/Listo en 2 días/)).toBeNull();
  });

  it('al agregar SE VE un aviso flotante con el camino al pedido (2026-11-09)', async () => {
    // ⚠️ Se monta el `<Toaster />` a propósito y se busca el TEXTO EN PANTALLA, no
    // una llamada espiada: `toast()` sin Toaster montado es un no-op silencioso (no
    // hay error, no falla el build, no pasa nada). Un test con `vi.mock('sonner')`
    // quedaría verde justo con ese defecto puesto.
    render(
      <>
        <Ficha producto={producto()} info={info} />
        <Toaster />
      </>,
    );
    expect(screen.queryByText('Agregado a tu pedido')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Agregar al pedido/ }));

    expect(await screen.findByText('Agregado a tu pedido')).toBeTruthy();
    // Dice QUÉ entró: el aviso aparece lejos del botón y sin esto no se sabe de
    // cuál pieza habla.
    expect(screen.getByText('1 × Identificadores para lápices')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver pedido' })).toBeTruthy();
  });

  it('«Ver pedido» del aviso pide abrir el cajón', async () => {
    // El aviso vive en un portal, fuera del árbol de la ficha: no le sirve el
    // `[data-bl="cart-open"]` del encabezado, usa el evento global.
    const visto = vi.fn();
    window.addEventListener('cart:open', visto);
    try {
      render(
        <>
          <Ficha producto={producto()} info={info} />
          <Toaster />
        </>,
      );
      fireEvent.click(screen.getByRole('button', { name: /Agregar al pedido/ }));
      fireEvent.click(await screen.findByRole('button', { name: 'Ver pedido' }));
      expect(visto).toHaveBeenCalled();
    } finally {
      window.removeEventListener('cart:open', visto);
    }
  });

  it('el botón confirma solo un rato: el aviso no depende de él', () => {
    vi.useFakeTimers();
    try {
      render(<Ficha producto={producto()} info={info} />);
      fireEvent.click(screen.getByRole('button', { name: /Agregar al pedido/ }));
      expect(screen.getByRole('button', { name: 'Agregado ✓' })).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByRole('button', { name: /Agregar al pedido/ })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('sin tasa configurada NO muestra un bolívar inventado', () => {
    // ⚠️ Hoy la API devuelve `rate: null` en producción. Un «≈ 0 Bs» sería peor que
    // no decir nada.
    render(<Ficha producto={producto()} info={{ ...info, rate: null }} />);
    const grande = document.querySelector('.pdp-price')?.textContent ?? '';
    expect(grande).not.toContain('≈');
    expect(grande).toContain('$1.50');
  });
});

/**
 * EL ÁRBOL QUE COBRABA DE MENOS (2026-11-11).
 *
 * Con «7 nombres» elegido se podía dejar 12 cm, que no entran, y la ficha cotizaba
 * **$9,50** cuando con los 18 cm que hacen falta son **$16,50**: $7 regalados por pedido.
 * Los recargos son los reales del catálogo de producción.
 *
 * ⚠️ Lo que se fija acá es el CABLEADO. `restricciones.ts` tiene sus 22 tests de función
 * pura y seguiría verde con la ficha ignorándola: el bug vivía justo ahí, en que nadie
 * leía la regla que el dueño ya había escrito en la etiqueta.
 */
const arbol = () =>
  producto({
    id: 'arbol-de-navidad-con-nombres',
    name: 'Árbol de Navidad con nombres',
    price: 8,
    priceTiers: [],
    custom: true,
    minQty: 1,
    optionGroups: [
      {
        name: 'Tamaño',
        required: true,
        options: [
          { value: '12 cm', priceDeltaUsd: 0 },
          { value: '18 cm', priceDeltaUsd: 7 },
          { value: '26 cm', priceDeltaUsd: 22 },
        ],
      },
      {
        name: 'Nombres',
        required: true,
        options: [
          { value: 'Hasta 6 nombres', priceDeltaUsd: 0 },
          { value: '7 nombres · desde 18 cm', priceDeltaUsd: 1.5 },
        ],
      },
    ],
  });

const precioGrande = () => document.querySelector('.pdp-price')?.textContent ?? '';
const botonOpcion = (texto: string | RegExp) => screen.getByRole('button', { name: texto });

describe('Ficha — 7 nombres no entran en 12 cm', () => {
  beforeEach(() => localStorage.clear());

  it('al elegir 7 nombres, 12 cm queda bloqueado y el tamaño sube a 18 cm', () => {
    render(<Ficha producto={arbol()} info={info} />);
    // Arranca en la primera de cada grupo: 12 cm + hasta 6 nombres = $8,00.
    expect(precioGrande()).toContain('$8.00');

    fireEvent.click(botonOpcion(/7 nombres/));

    // 8 + 7 (18 cm) + 1,50 = 16,50. Antes de esto daba 9,50.
    expect(precioGrande()).toContain('$16.50');
    expect((botonOpcion(/12 cm/) as HTMLButtonElement).disabled).toBe(true);
    expect((botonOpcion(/^18 cm/) as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
  });

  it('DICE que cambió el tamaño, porque el precio subió sin que nadie lo pidiera', () => {
    render(<Ficha producto={arbol()} info={info} />);
    fireEvent.click(botonOpcion(/7 nombres/));
    expect(screen.getByRole('status').textContent).toContain('18 cm');
  });

  it('con hasta 6 nombres los tres tamaños siguen disponibles', () => {
    // El hermano alcanzable: sin él, una ficha que bloqueara 12 cm SIEMPRE pasaría el
    // primer test.
    render(<Ficha producto={arbol()} info={info} />);
    expect((botonOpcion(/12 cm/) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('pide los nombres y no deja agregar sin ellos', () => {
    render(<Ficha producto={arbol()} info={info} />);
    const agregar = screen.getByRole('button', { name: /agregar/i }) as HTMLButtonElement;
    expect(agregar.disabled).toBe(true);
    expect(screen.getByLabelText('Escribe los nombres, uno por línea')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Escribe los nombres, uno por línea'), {
      target: { value: 'Ana\nLuis' },
    });
    expect((screen.getByRole('button', { name: /agregar/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('pasarse de los nombres pagados lo dice y vuelve a bloquear', () => {
    render(<Ficha producto={arbol()} info={info} />);
    fireEvent.change(screen.getByLabelText('Escribe los nombres, uno por línea'), {
      target: { value: 'A\nB\nC\nD\nE\nF\nG' },
    });
    expect(screen.getByText(/Escribiste 7 y elegiste 6/)).toBeTruthy();
    expect((screen.getByRole('button', { name: /agregar/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
