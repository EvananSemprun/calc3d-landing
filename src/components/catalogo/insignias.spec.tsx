/**
 * Las insignias de la tarjeta tienen que ser OPACAS.
 *
 * ⚠️ **jsdom no aplica CSS**, así que acá no se puede medir contraste: un test que leyera
 * `getComputedStyle` daría verde con la clase rota. Lo que se amarra es la ESTRUCTURA que
 * hace imposible el bug — que el fondo que aplica EN REPOSO no lleve opacidad. El
 * contraste se midió en el navegador: 1,27 sobre foto clara con las translúcidas y 12,5
 * con estas.
 *
 * El bug: las dos insignias de color eran semitransparentes con el texto del mismo tono,
 * así que heredaban lo que hubiera detrás. Sobre la tarjeta oscura daban 8,99 y nadie
 * notó nada; sobre una FOTO CLARA caían a 1,27 — invisibles. Dependía del contenido, no
 * del código, y apareció recién cuando se publicó un producto con foto de fondo beige.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TarjetaProducto from './TarjetaProducto';
import TarjetaIndice from './TarjetaIndice';
import { INSIGNIA_DESTACADA, INSIGNIA_NUEVO, INSIGNIA_OFERTA, INSIGNIA_SUAVE } from './insignias';
import type { ProductoVitrina } from '@/lib/producto';
import type { EntradaIndice } from '@/lib/paginacion';

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
  badge: 'Nuevo',
  custom: true,
  requiresOptions: true,
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

/**
 * ¿Hay un fondo TRANSLÚCIDO entre las clases que aplican EN REPOSO?
 *
 * ⚠️ Mira solo las clases SIN prefijo de variante. El `Badge` de shadcn trae
 * `[a&]:hover:bg-primary/90` y `dark:bg-destructive/60` en su base: son opacidades
 * reales, pero de hover o de otra variante, y contarlas ponía este test en rojo con el
 * código bien. Lo descubrí así — falló, y el equivocado era el test.
 */
const llevaOpacidad = (clases: string) =>
  clases
    .split(/\s+/)
    .filter((c) => c && !c.includes(':'))
    .some((c) => /^bg-.*\/\d/.test(c) || /rgba\([^)]*,\s*0?\.\d+\)/.test(c));

describe('las insignias no dependen de lo que tengan detrás', () => {
  it('ninguna de las tres lleva fondo con opacidad', () => {
    for (const c of [INSIGNIA_DESTACADA, INSIGNIA_SUAVE, INSIGNIA_OFERTA]) {
      expect(llevaOpacidad(c)).toBe(false);
    }
  });

  it('el helper SÍ detecta una translúcida (si no, no probaría nada)', () => {
    // Sin este caso, un `llevaOpacidad` que devolviera siempre false dejaría verde a
    // toda la suite. Son las dos clases reales que tenían las insignias antes.
    expect(llevaOpacidad('px-2 bg-primary/12 text-primary')).toBe(true);
    expect(llevaOpacidad('px-2 bg-[rgba(37,211,102,.14)]')).toBe(true);
  });

  it('la del dueño usa el mismo fondo lleno que el Badge de la ficha', () => {
    // `bg-primary` + `text-primary-foreground` es lo que dibuja la ficha con <Badge> a
    // secas. Se nombran los tokens, no un hex: copiarlo los dejaría divergir.
    expect(INSIGNIA_DESTACADA).toContain('bg-primary');
    expect(INSIGNIA_DESTACADA).toContain('text-primary-foreground');
  });

  it('la insignia del dueño se dibuja en la tarjeta con esa clase', () => {
    render(<TarjetaProducto producto={producto({ badge: 'Más vendido' })} tasa={null} />);
    const insignia = screen.getByText('Más vendido');
    expect(insignia.className).toContain('bg-primary');
    expect(llevaOpacidad(insignia.className)).toBe(false);
  });

  it('la de oferta también, cuando el precio tachado es MAYOR que el actual', () => {
    render(<TarjetaProducto producto={producto({ price: 8, compareAt: 12 })} tasa={null} />);
    expect(llevaOpacidad(screen.getByText('Oferta').className)).toBe(false);
  });

  it('un compareAt MENOR que el precio no dibuja «Oferta»', () => {
    // El caso real del llavero: compareAt 4,50 contra un precio de 24. Un tachado así
    // leería como un aumento.
    render(<TarjetaProducto producto={producto({ price: 24, compareAt: 4.5 })} tasa={null} />);
    expect(screen.queryByText('Oferta')).toBeNull();
  });
});

/**
 * Las DOS tarjetas dibujan las mismas insignias, y hasta el 2026-11-08 solo se probaba
 * una. La del índice —la que se ve al filtrar u ordenar— leía `e.nuevo`, un campo que el
 * índice nunca llevó: la insignia automática desaparecía en cuanto el visitante tocaba
 * un filtro, con la suite entera en verde y sin un error en consola.
 */
describe('la tarjeta del índice dibuja las mismas insignias que la del paginado', () => {
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

  it('«Nuevo» sobrevive al filtrado', () => {
    render(<TarjetaIndice entrada={entrada({ nuevo: true })} tasa={null} />);
    expect(screen.getByText('Nuevo').className).toContain(INSIGNIA_NUEVO.split(' ')[0]);
  });

  it('sin ser nuevo no la inventa', () => {
    render(<TarjetaIndice entrada={entrada()} tasa={null} />);
    expect(screen.queryByText('Nuevo')).toBeNull();
  });

  it('la del dueño también viaja en el índice', () => {
    render(<TarjetaIndice entrada={entrada({ badge: 'Más vendido' })} tasa={null} />);
    expect(llevaOpacidad(screen.getByText('Más vendido').className)).toBe(false);
  });
});
