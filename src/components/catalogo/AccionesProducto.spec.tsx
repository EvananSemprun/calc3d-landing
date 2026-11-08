/**
 * El pie de una tarjeta del catálogo: UN solo botón, que lleva a la ficha.
 *
 * ⚠️ **Este es el primer test de PANTALLA del repo** (2026-11-08). Hasta hoy los 170
 * tests eran de función pura y ninguno tocaba el JSX: se podía borrar un botón de una
 * tarjeta y la suite seguía verde. Lo que se fija acá no es una función, es el CABLEADO
 * — que la tarjeta dibuje la acción, y que la acción apunte a la ficha de SU producto.
 *
 * El caso que lo motivó: había dos botones, "Ver detalle" y "Elegir", y con un producto
 * que exige alguna opción los dos eran el MISMO enlace. Por eso el primer test cuenta
 * los enlaces del pie: si alguien vuelve a sumar uno, se pone rojo.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AccionesProducto from './AccionesProducto';
import TarjetaProducto from './TarjetaProducto';
import type { ProductoVitrina } from '@/lib/producto';

const producto = (extra: Partial<ProductoVitrina> = {}): ProductoVitrina => ({
  id: 'arbol-de-navidad-con-nombres',
  name: 'Árbol de Navidad con nombres',
  cat: 'navidad',
  catLabel: 'Navidad',
  price: 8,
  compareAt: null,
  priceTiers: [],
  desc: 'Un árbol armado con los nombres de tu familia.',
  kind: 'PHYSICAL',
  minQty: 1,
  material: 'PLA',
  badge: 'Nuevo',
  custom: true,
  requiresOptions: true,
  specs: [],
  ship: '3 días',
  image: null,
  images: null,
  description: null,
  optionGroups: [],
  colorList: [],
  colors: [],
  ...extra,
});

describe('AccionesProducto — el pie de la tarjeta', () => {
  it('dibuja UN solo enlace, a la ficha del producto', () => {
    render(<AccionesProducto id="arbol-de-navidad-con-nombres" nombre="Árbol de Navidad" />);
    const enlaces = screen.getAllByRole('link');
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]).toHaveAttribute('href', '/producto/arbol-de-navidad-con-nombres/');
  });

  it('no deja ningún botón que agregue al pedido', () => {
    render(<AccionesProducto id="llavero" nombre="Llavero" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('el texto dice que se va a elegir, no que se agrega', () => {
    render(<AccionesProducto id="llavero" nombre="Llavero" />);
    // Un "+ Agregar" prometería sumar al pedido sin salir de la página, y esto navega.
    expect(screen.getByRole('link')).toHaveTextContent('Elegir opciones');
    expect(screen.queryByText(/agregar/i)).toBeNull();
  });

  it('el nombre accesible nombra al producto, no solo la acción', () => {
    render(<AccionesProducto id="llavero" nombre="Llavero con QR" />);
    expect(screen.getByRole('link', { name: 'Ver Llavero con QR' })).toBeInTheDocument();
  });
});

describe('TarjetaProducto — el cableado', () => {
  it('la tarjeta dibuja la acción, apuntando a la ficha de SU producto', () => {
    render(<TarjetaProducto producto={producto()} tasa={null} />);
    const pie = document.querySelector('.product-actions') as HTMLElement;
    expect(pie).not.toBeNull();
    const enlaces = within(pie).getAllByRole('link');
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]).toHaveAttribute('href', '/producto/arbol-de-navidad-con-nombres/');
  });

  it('un producto SIN opciones obligatorias tampoco agrega desde la tarjeta', () => {
    // Decisión del dueño (2026-11-08): la compra directa desde la grilla se fue.
    // Antes, sin opciones obligatorias, acá había un botón "Agregar".
    render(<TarjetaProducto producto={producto({ requiresOptions: false })} tasa={null} />);
    const pie = document.querySelector('.product-actions') as HTMLElement;
    expect(within(pie).getAllByRole('link')).toHaveLength(1);
    expect(within(pie).queryByRole('button')).toBeNull();
  });
});
