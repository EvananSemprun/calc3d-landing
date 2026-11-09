/**
 * EL TÍTULO DE LA PESTAÑA EN UNA FICHA RESUELTA EN VIVO (2026-11-09).
 *
 * Un producto creado después del último build no tiene página propia y lo rescata la
 * 404. El producto se veía entero, pero la cabecera seguía siendo la del cartel de
 * error: la pestaña decía «Página no encontrada — Banano Lab» encima de un reno.
 *
 * ⚠️ Lo que se fija acá es CUÁNDO NO hay que tocar el título. Devolver siempre un
 * texto es el bug de vuelta con otro disfraz: mientras la respuesta viaja no se sabe
 * qué producto es, y en una ficha real lo horneado ya es lo correcto.
 */
import { describe, expect, it } from 'vitest';
import { tituloDeFicha } from './titulo';

describe('tituloDeFicha', () => {
  it('con el producto resuelto, la pestaña lleva su nombre', () => {
    expect(tituloDeFicha({ name: 'Reno de Navidad' }, false, 'Banano Lab')).toBe(
      'Reno de Navidad — Banano Lab',
    );
  });

  it('sin producto todavía, NO se afirma nada', () => {
    expect(tituloDeFicha(null, false, 'Banano Lab')).toBeNull();
  });

  it('si la API dice que no existe, la pestaña lo dice', () => {
    expect(tituloDeFicha(null, true, 'Banano Lab')).toBe('Producto no disponible — Banano Lab');
  });

  it('el «no existe» pisa al producto horneado, igual que la ficha', () => {
    expect(tituloDeFicha({ name: 'Árbol de Navidad' }, true, 'Banano Lab')).toBe(
      'Producto no disponible — Banano Lab',
    );
  });

  it('usa el nombre del negocio que le pasan, no uno escrito a mano', () => {
    expect(tituloDeFicha({ name: 'Reno' }, false, 'Otro Taller')).toBe('Reno — Otro Taller');
  });
});
