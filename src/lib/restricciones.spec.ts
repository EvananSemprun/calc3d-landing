/**
 * LA REGLA QUE VIVE EN LA ETIQUETA.
 *
 * Los números son los REALES del catálogo de producción, medidos el 2026-11-11 contra
 * `/public/store/products?detail=full`: árbol a $8, tamaños 12 cm (+0), 18 cm (+7) y
 * 26 cm (+22); nombres «Hasta 6» (+0) y «7 nombres · desde 18 cm» (+1,50). De ahí sale el
 * $9,50 que el dueño reportó y los $16,50 que correspondían.
 */
import { describe, expect, it } from 'vitest';
import {
  cantidadDeNombres,
  corregirSeleccion,
  grupoDeMedidas,
  lineasDeNombres,
  medidaDeOpcion,
  medidaExigida,
  nombresPedidos,
  problemaDeNombres,
  restriccionDeMedida,
} from './restricciones';
import type { GrupoOpcionesApi } from './producto';

const ARBOL: GrupoOpcionesApi[] = [
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
      { value: '10 nombres · desde 18 cm', priceDeltaUsd: 6 },
      { value: 'Más de 10 · lo coordinamos', priceDeltaUsd: 0 },
    ],
  },
  {
    name: 'Combinación de colores',
    required: true,
    options: [{ value: 'Verde y rojo, estrella dorada', priceDeltaUsd: 0 }],
  },
];

describe('leer la medida del texto', () => {
  it('«7 nombres · desde 18 cm» exige 18', () => {
    expect(medidaExigida('7 nombres · desde 18 cm')).toBe(18);
  });

  it('acepta las variaciones de espaciado y mayúsculas que el dueño escribe a mano', () => {
    expect(medidaExigida('10 nombres · Desde 18cm')).toBe(18);
    expect(medidaExigida('algo · desde  26 cm')).toBe(26);
  });

  it('una opción SIN la marca no exige nada', () => {
    // El hermano alcanzable del de arriba: sin esto, una función que devolviera 18
    // siempre pasaría el primer test.
    expect(medidaExigida('Hasta 6 nombres')).toBeNull();
    expect(medidaExigida('Más de 10 · lo coordinamos')).toBeNull();
  });

  it('«18 cm» es una medida; «7 nombres · desde 18 cm» NO lo es', () => {
    // La diferencia es la que separa al grupo de tamaños de los demás: la etiqueta de una
    // medida es SOLO la medida. Sin el anclaje, el grupo «Nombres» se tomaría por tamaños.
    expect(medidaDeOpcion('18 cm')).toBe(18);
    expect(medidaDeOpcion('7 nombres · desde 18 cm')).toBeNull();
    expect(medidaDeOpcion('Hasta 6 nombres')).toBeNull();
  });

  it('el grupo de medidas se DERIVA, no se busca por su nombre', () => {
    expect(grupoDeMedidas(ARBOL)?.name).toBe('Tamaño');
    // El mismo grupo llamado de otra forma se sigue reconociendo.
    const renombrado = ARBOL.map((g) => (g.name === 'Tamaño' ? { ...g, name: 'Alto' } : g));
    expect(grupoDeMedidas(renombrado)?.name).toBe('Alto');
  });
});

describe('qué tamaños quedan prohibidos', () => {
  it('con 7 nombres, 12 cm se bloquea y 18 y 26 quedan', () => {
    const r = restriccionDeMedida(ARBOL, {
      Tamaño: '12 cm',
      Nombres: '7 nombres · desde 18 cm',
    });
    expect(r).toEqual({
      grupo: 'Tamaño',
      minimo: 18,
      bloqueadas: ['12 cm'],
      porque: '7 nombres · desde 18 cm',
    });
  });

  it('con hasta 6 nombres NO se bloquea nada', () => {
    expect(restriccionDeMedida(ARBOL, { Tamaño: '12 cm', Nombres: 'Hasta 6 nombres' })).toBeNull();
  });

  it('manda el mínimo MÁS ALTO de todo lo elegido', () => {
    const conDos: GrupoOpcionesApi[] = [
      ...ARBOL,
      {
        name: 'Base',
        options: [{ value: 'Con base · desde 26 cm', priceDeltaUsd: 2 }],
      },
    ];
    const r = restriccionDeMedida(conDos, {
      Tamaño: '12 cm',
      Nombres: '7 nombres · desde 18 cm',
      Base: 'Con base · desde 26 cm',
    });
    expect(r?.minimo).toBe(26);
    expect(r?.bloqueadas).toEqual(['12 cm', '18 cm']);
  });

  it('un producto SIN grupo de medidas no restringe nada', () => {
    // Es el caso de todo el resto del catálogo: esto no les cuesta nada.
    const otro: GrupoOpcionesApi[] = [
      { name: 'Color', options: [{ value: 'Rojo' }, { value: 'Azul' }] },
    ];
    expect(restriccionDeMedida(otro, { Color: 'Rojo' })).toBeNull();
  });

  it('un mínimo que TODAS las medidas cumplen no es una restricción', () => {
    // Si devolviera una, la pantalla explicaría un bloqueo que no está ocurriendo.
    const r = restriccionDeMedida(ARBOL, {
      Tamaño: '18 cm',
      Nombres: 'Hasta 6 nombres',
    });
    expect(r).toBeNull();
  });
});

describe('cuántos nombres pide lo elegido', () => {
  it('lee la cantidad de la etiqueta', () => {
    expect(cantidadDeNombres('Hasta 6 nombres')).toBe(6);
    expect(cantidadDeNombres('7 nombres · desde 18 cm')).toBe(7);
    expect(cantidadDeNombres('10 nombres · desde 18 cm')).toBe(10);
  });

  it('«Más de 10 · lo coordinamos» NO declara una cantidad', () => {
    // Tiene un 10 adentro: si el patrón no exigiera la palabra «nombres» pegada al
    // número, esta opción quedaría topeada en 10 cuando justamente es la de «más».
    expect(cantidadDeNombres('Más de 10 · lo coordinamos')).toBeNull();
  });

  it('un producto que no pide nombres devuelve null', () => {
    const otro: GrupoOpcionesApi[] = [{ name: 'Color', options: [{ value: 'Rojo' }] }];
    expect(nombresPedidos(otro, { Color: 'Rojo' })).toBeNull();
  });

  it('con 7 nombres elegidos, pide 7', () => {
    expect(nombresPedidos(ARBOL, { Nombres: '7 nombres · desde 18 cm', Tamaño: '18 cm' })).toBe(7);
  });
});

describe('qué le falta al campo de nombres', () => {
  it('vacío pide escribirlos', () => {
    expect(problemaDeNombres('', 6)).toBe('Escribe los nombres, uno por línea.');
    expect(problemaDeNombres('   \n  \n ', 6)).toBe('Escribe los nombres, uno por línea.');
  });

  it('MENOS de los pagados está bien: el tope no es una cuota', () => {
    // Quien eligió «Hasta 6» puede querer poner 2.
    expect(problemaDeNombres('Ana\nLuis', 6)).toBeNull();
  });

  it('pasarse dice cuántos sobran y qué hacer', () => {
    expect(problemaDeNombres('Ana\nLuis\nSol', 2)).toBe(
      'Escribiste 3 y elegiste 2. Quita 1 o elige una opción con más nombres.',
    );
  });

  it('sin tope declarado solo exige que haya algo', () => {
    // «Más de 10 · lo coordinamos»: no se puede validar contra un número que no existe.
    expect(problemaDeNombres('Ana\nLuis', null)).toBeNull();
    expect(problemaDeNombres('', null)).toBe('Escribe los nombres, uno por línea.');
  });

  it('los renglones vacíos del medio no cuentan', () => {
    expect(lineasDeNombres('Ana\n\n  \nLuis\n')).toEqual(['Ana', 'Luis']);
  });
});

describe('corregir lo elegido', () => {
  it('de 12 cm con 7 nombres pasa a 18 cm, la permitida más barata', () => {
    const corregido = corregirSeleccion(ARBOL, {
      Tamaño: '12 cm',
      Nombres: '7 nombres · desde 18 cm',
    });
    expect(corregido.Tamaño).toBe('18 cm');
    // El resto no se toca.
    expect(corregido.Nombres).toBe('7 nombres · desde 18 cm');
  });

  it('si lo elegido YA es válido devuelve el MISMO objeto', () => {
    // La pantalla compara por identidad para no avisar cuando no cambió nada.
    const sel = { Tamaño: '26 cm', Nombres: '7 nombres · desde 18 cm' };
    expect(corregirSeleccion(ARBOL, sel)).toBe(sel);
  });

  it('sin ninguna medida permitida NO inventa una', () => {
    // Producto mal configurado: pide 40 cm y no existe. Se deja lo elegido.
    const imposible: GrupoOpcionesApi[] = [
      { name: 'Tamaño', options: [{ value: '12 cm' }] },
      { name: 'Nombres', options: [{ value: '7 nombres · desde 40 cm' }] },
    ];
    const sel = { Tamaño: '12 cm', Nombres: '7 nombres · desde 40 cm' };
    expect(corregirSeleccion(imposible, sel)).toBe(sel);
  });
});
