import { describe, expect, it } from 'vitest';
import { TOPE_RELACIONADOS, relacionadosDe } from './relacionados';
import type { ProductoVitrina } from './producto';

const p = (id: string, cat: string): ProductoVitrina =>
  ({ id, name: id, cat }) as ProductoVitrina;

describe('relacionadosDe', () => {
  const catalogo = [
    p('arbol', 'navidad'),
    p('bola', 'navidad'),
    p('guirnalda', 'navidad'),
    p('estrella', 'navidad'),
    p('llavero', 'llaveros'),
  ];

  it('ofrece los de SU categoría, nunca a sí mismo', () => {
    const r = relacionadosDe(catalogo, p('arbol', 'navidad'));
    expect(r.map((x) => x.id)).toEqual(['bola', 'guirnalda', 'estrella']);
  });

  it('respeta el tope', () => {
    expect(relacionadosDe(catalogo, p('arbol', 'navidad'))).toHaveLength(TOPE_RELACIONADOS);
    expect(relacionadosDe(catalogo, p('arbol', 'navidad'), 1).map((x) => x.id)).toEqual(['bola']);
  });

  it('solo en su categoría: cae a cualquiera del catálogo', () => {
    // El final de una ficha es donde conviene ofrecer algo: una franja vacía no sirve.
    const r = relacionadosDe(catalogo, p('llavero', 'llaveros'));
    expect(r).toHaveLength(3);
    expect(r.map((x) => x.id)).not.toContain('llavero');
  });

  it('sin categoría también ofrece, y tampoco se ofrece a sí mismo', () => {
    const r = relacionadosDe([...catalogo, p('suelto', '')], p('suelto', ''));
    expect(r).toHaveLength(3);
    expect(r.map((x) => x.id)).not.toContain('suelto');
  });

  it('un catálogo de UNO solo no ofrece nada', () => {
    expect(relacionadosDe([p('unico', 'navidad')], p('unico', 'navidad'))).toEqual([]);
  });

  it('no muta el catálogo recibido', () => {
    const original = [...catalogo];
    relacionadosDe(catalogo, p('arbol', 'navidad'));
    expect(catalogo).toEqual(original);
  });
});
