/**
 * EL PLAZO SIGUE A LA OPCIÓN ELEGIDA (2026-11-09).
 *
 * «Listo en 2 días» era del producto entero, así que el dueño escribía los días a mano
 * DENTRO del nombre («20 cm · 3 días»): texto, que no se puede comparar. Ahora cada
 * opción puede traer los suyos y la ficha dice el plazo de lo que el visitante eligió.
 */
import { describe, expect, it } from 'vitest';
import { diasDeEntrega } from './entrega';

const producto = {
  leadTimeDays: 2,
  optionGroups: [
    {
      name: 'Tamaño',
      options: [
        { value: '15 cm' },
        { value: '20 cm', leadTimeDays: 3 },
        { value: '30 cm', leadTimeDays: 5 },
      ],
    },
    { name: 'Acabado', options: [{ value: 'Liso' }, { value: 'Rayado', leadTimeDays: 4 }] },
  ],
};

describe('diasDeEntrega', () => {
  it('sin opciones con días propios, manda el del producto', () => {
    expect(diasDeEntrega(producto, { Tamaño: '15 cm', Acabado: 'Liso' })).toBe(2);
  });

  it('la opción elegida pisa al del producto', () => {
    expect(diasDeEntrega(producto, { Tamaño: '20 cm', Acabado: 'Liso' })).toBe(3);
  });

  it('con dos opciones que suman días, manda la MÁS LENTA', () => {
    // Nada sale antes de que esté lo que más tarda.
    expect(diasDeEntrega(producto, { Tamaño: '30 cm', Acabado: 'Rayado' })).toBe(5);
  });

  it('una opción más lenta que otra no se promedia ni se suma', () => {
    expect(diasDeEntrega(producto, { Tamaño: '20 cm', Acabado: 'Rayado' })).toBe(4);
  });

  it('una opción NO elegida no cuenta', () => {
    expect(diasDeEntrega(producto, { Tamaño: '15 cm' })).toBe(2);
  });

  it('sin plazo en ningún lado, no inventa uno', () => {
    expect(diasDeEntrega({ leadTimeDays: null, optionGroups: [] }, {})).toBeNull();
  });

  it('un producto sin opciones sigue teniendo su plazo', () => {
    expect(diasDeEntrega({ leadTimeDays: 4 }, {})).toBe(4);
  });

  it('una opción con 0 días es "sale hoy", no "no dice nada"', () => {
    // ⚠️ El 0 es un valor, no un hueco: si se tratara como ausente, la ficha
    // mostraría el plazo del producto y el dueño no podría ofrecer entrega el mismo día.
    const p = { leadTimeDays: 5, optionGroups: [{ name: 'T', options: [{ value: 'Ya', leadTimeDays: 0 }] }] };
    expect(diasDeEntrega(p, { T: 'Ya' })).toBe(0);
  });
});
