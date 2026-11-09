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
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
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

  it('sin tasa configurada NO muestra un bolívar inventado', () => {
    // ⚠️ Hoy la API devuelve `rate: null` en producción. Un «≈ 0 Bs» sería peor que
    // no decir nada.
    render(<Ficha producto={producto()} info={{ ...info, rate: null }} />);
    const grande = document.querySelector('.pdp-price')?.textContent ?? '';
    expect(grande).not.toContain('≈');
    expect(grande).toContain('$1.50');
  });
});
