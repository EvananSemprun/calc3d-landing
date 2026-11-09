/**
 * El cruce del refresco en vivo: el dato que CAMBIÓ entra fundido, el que llegó igual no
 * se mueve.
 *
 * El refresco de `useEnVivo` contesta lo mismo casi siempre —el dueño no corrige un
 * precio cada vez que alguien abre la tienda—, así que el caso normal es «no pasa nada»
 * y es el que más importa: un cruce que se disparara en cada montaje haría parpadear la
 * pantalla entera al cargar, sin que nada hubiera cambiado.
 *
 * ⚠️ **Acá se amarra la ESTRUCTURA, no la geometría ni el movimiento.** jsdom no aplica
 * CSS y no hace layout: `getBoundingClientRect()` devuelve ceros y `getComputedStyle`
 * devuelve lo que diga el atributo `style`, así que un test de este archivo que midiera
 * «no cambia la altura» o «la opacidad va de 0 a 1» daría **verde con el CSS borrado**.
 * El CSS lo verifica `src/cruce-funde.spec.ts` leyendo el texto de `global.css`, y la
 * geometría se midió en el navegador (`astro preview`, a 390 y 1280).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Cruce, { useCruce } from './Cruce';
import TarjetaProducto from '@/components/catalogo/TarjetaProducto';
import TarjetaIndice from '@/components/catalogo/TarjetaIndice';
import type { ProductoVitrina } from '@/lib/producto';
import type { EntradaIndice } from '@/lib/paginacion';
import type { TasaApi } from '@/lib/api';

/** Sonda de `useCruce`: las props se esparcen sobre un elemento que YA existe. */
function Precio({ valor }: { valor: string }) {
  return (
    <span className="price" data-testid="precio" {...useCruce(valor)}>
      {valor}
    </span>
  );
}

/** Sonda de `<Cruce>`: el precio de la tarjeta es un nodo de texto suelto. */
function PrecioSuelto({ valor }: { valor: string }) {
  return (
    <span className="price" data-testid="precio">
      <Cruce valor={valor}>{valor}</Cruce>
      <small> BCV</small>
    </span>
  );
}

const cruzado = (de: HTMLElement) => de.querySelector('[data-cruce]');

describe('<Cruce>', () => {
  it('en el primer render no cruza (lo horneado se pinta de una)', () => {
    const { container } = render(<PrecioSuelto valor="$8.00" />);
    expect(
      cruzado(container),
      'Cruzó en el primer render. Lo horneado ya está en el HTML y no cambió nada: ' +
        'fundirlo haría parpadear la pantalla entera en cada carga.',
    ).toBeNull();
  });

  it('cruza cuando el valor cambia', () => {
    const { container, rerender } = render(<PrecioSuelto valor="$8.00" />);
    rerender(<PrecioSuelto valor="$9.50" />);
    expect(cruzado(container)).not.toBeNull();
    expect(cruzado(container)).toHaveTextContent('$9.50');
  });

  it('no cruza cuando el valor llega igual — el caso normal', () => {
    // Es el caso que más ocurre: el refresco contesta lo mismo. Si cruzara acá, la
    // tienda parpadearía al abrir cualquier página sin que nada hubiera cambiado.
    const { container, rerender } = render(<PrecioSuelto valor="$8.00" />);
    rerender(<PrecioSuelto valor="$8.00" />);
    rerender(<PrecioSuelto valor="$8.00" />);
    expect(cruzado(container)).toBeNull();
  });

  it('un SEGUNDO cambio vuelve a cruzar, y se distingue del primero', () => {
    // Una animación de CSS no se reinicia si su `animation-name` no cambia: con una sola
    // marca, el segundo cambio quedaría sin cruce y el defecto sería invisible (el
    // refresco pide una sola vez, así que en la tienda de hoy casi nunca pasaría).
    const { container, rerender } = render(<PrecioSuelto valor="$8.00" />);
    rerender(<PrecioSuelto valor="$9.50" />);
    const primera = cruzado(container)?.getAttribute('data-cruce');
    rerender(<PrecioSuelto valor="$10.00" />);
    const segunda = cruzado(container)?.getAttribute('data-cruce');
    expect(primera).toBeTruthy();
    expect(segunda).toBeTruthy();
    expect(segunda).not.toBe(primera);
  });

  it('sobre un elemento que ya existe NO agrega ningún nodo', () => {
    const { container, rerender } = render(<Precio valor="$8.00" />);
    const antes = container.querySelectorAll('*').length;
    rerender(<Precio valor="$9.50" />);
    expect(
      container.querySelectorAll('*').length,
      '`useCruce` agregó nodos. Su razón de existir es justamente no agregarlos: ' +
        '`.price-alt`, las insignias y la franja ya son elementos propios, y una caja ' +
        'más al medio es una caja más que puede mover la geometría.',
    ).toBe(antes);
    // La marca cae sobre el elemento que ya estaba, no sobre un envoltorio nuevo.
    expect(screen.getByTestId('precio')).toHaveAttribute('data-cruce');
  });

  it('alrededor de un nodo de texto suelto agrega UN solo elemento, en línea', () => {
    // El precio de la tarjeta es un nodo de texto dentro de `<span class="price">`: no
    // tiene elemento propio que marcar, así que hace falta envolverlo.
    const { container } = render(<PrecioSuelto valor="$8.00" />);
    const envoltorio = screen.getByTestId('precio').firstElementChild;
    expect(envoltorio?.tagName).toBe('SPAN');
    expect(envoltorio?.textContent).toBe('$8.00');
    // Un `<span>` sin clase ni estilo es `display: inline`, y un inline alrededor de
    // texto en línea no cambia la geometría. Una clase o un `style` acá podrían volverlo
    // una caja (`block`, `inline-block`, un `margin`) y mover el pie de la tarjeta.
    // ⚠️ jsdom no hace layout: esto amarra la estructura; la geometría se midió en el
    // navegador.
    expect(envoltorio?.className).toBe('');
    expect(envoltorio?.getAttribute('style')).toBeNull();
    expect(envoltorio?.children.length).toBe(0);
  });
});

/**
 * ⚠️ **Las DOS tarjetas tienen que cruzar lo mismo.** `TarjetaProducto` (paginado
 * estático) y `TarjetaIndice` (filtrado) se ven iguales y son dos componentes distintos:
 * este repo ya dejó pasar dos veces lo mismo por cubrir una sola (la insignia «Nuevo» y
 * la moneda «USD»). El visitante ve la segunda recién después de tocar un filtro.
 */
const producto = (extra: Partial<ProductoVitrina> = {}): ProductoVitrina => ({
  id: 'arbol',
  name: 'Árbol',
  cat: 'navidad',
  catLabel: 'Navidad',
  price: 8,
  compareAt: null,
  priceTiers: [],
  desc: '',
  kind: 'PHYSICAL',
  minQty: 1,
  material: null,
  badge: null,
  custom: false,
  requiresOptions: false,
  nuevo: false,
  specs: [],
  ship: null,
  image: null,
  images: null,
  description: null,
  optionGroups: [],
  colorList: [],
  colors: [],
  ...extra,
});

const entrada = (extra: Partial<EntradaIndice> = {}): EntradaIndice => ({
  id: 'arbol',
  name: 'Árbol',
  price: 8,
  colors: [],
  image: null,
  priceTiers: [],
  minQty: 1,
  requiresOptions: false,
  badge: null,
  nuevo: false,
  desde: false,
  compareAt: null,
  ...extra,
});

/** Lo que una tarjeta necesita para este archivo: los datos que cruzan, y la tasa. */
interface Caso {
  price?: number;
  compareAt?: number | null;
  badge?: string | null;
  tasa?: TasaApi | null;
}

/** La misma tarjeta dibujada por los dos componentes, para probarlas en paralelo. */
const tarjetas = {
  'del paginado': ({ tasa = null, ...resto }: Caso) => (
    <TarjetaProducto producto={producto(resto)} tasa={tasa} />
  ),
  'del índice': ({ tasa = null, ...resto }: Caso) => (
    <TarjetaIndice entrada={entrada(resto)} tasa={tasa} />
  ),
};

const BS: TasaApi = { rate: 40, currencyCode: 'Bs' };

describe.each(Object.entries(tarjetas))('la tarjeta %s cruza lo que el dueño corrige', (_nombre, dibujar) => {
  it('el precio', () => {
    const { container, rerender } = render(dibujar({ price: 8 }));
    expect(container.querySelector('.price [data-cruce]')).toBeNull();
    rerender(dibujar({ price: 9.5 }));
    expect(container.querySelector('.price [data-cruce]')).toHaveTextContent('$9.50');
  });

  it('el equivalente en la otra moneda', () => {
    const { container, rerender } = render(dibujar({ price: 8, tasa: BS }));
    rerender(dibujar({ price: 9.5, tasa: BS }));
    expect(container.querySelector('.price-alt[data-cruce]')).toHaveTextContent('380 Bs');
  });

  it('el precio tachado', () => {
    const { container, rerender } = render(dibujar({ price: 8, compareAt: 12 }));
    rerender(dibujar({ price: 8, compareAt: 14 }));
    expect(container.querySelector('s[data-cruce]')).toHaveTextContent('$14.00');
  });

  it('la insignia del dueño', () => {
    const { rerender } = render(dibujar({ price: 8, badge: 'Más vendido' }));
    rerender(dibujar({ price: 8, badge: 'Último' }));
    expect(screen.getByText('Último')).toHaveAttribute('data-cruce');
  });

  it('y NO cruza nada cuando el refresco trae lo mismo', () => {
    const caso: Caso = { price: 8, compareAt: 12, badge: 'Más vendido', tasa: BS };
    const { container, rerender } = render(dibujar(caso));
    rerender(dibujar({ ...caso }));
    expect(
      container.querySelectorAll('[data-cruce]'),
      'Cruzó algo con el refresco trayendo lo mismo. Es el caso que más ocurre: la ' +
        'tarjeta entera parpadearía al abrir cualquier página.',
    ).toHaveLength(0);
  });
});
