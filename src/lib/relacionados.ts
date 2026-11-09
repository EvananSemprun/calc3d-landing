// Qué se ofrece debajo de una ficha ("También te puede servir"). Pura: sin DOM.
import type { ProductoVitrina } from './producto';

/** Cuántos se ofrecen. Una fila de la grilla del catálogo en escritorio. */
export const TOPE_RELACIONADOS = 3;

/**
 * Los productos que acompañan a una ficha: primero los de SU categoría y, si esa
 * categoría no tiene otros, cualquiera del catálogo. Nunca él mismo.
 *
 * ⚠️ **Existe como función para que el build y el navegador elijan IGUAL** (2026-11-08).
 * Esta regla vivía escrita a mano dentro del `getStaticPaths` de `producto/[slug].astro`,
 * así que los relacionados se congelaban en el despliegue: un producto borrado seguía
 * ofreciéndose desde todas las fichas hasta la próxima reconstrucción, con su enlace y
 * su precio, como si se pudiera comprar.
 *
 * ⚠️ **El respaldo "cualquiera del catálogo" es a propósito.** Un producto solo en su
 * categoría dejaría la franja vacía, y el final de una ficha es justo donde conviene
 * ofrecer algo más. Lo que no puede pasar es que se ofrezca a sí mismo.
 */
export function relacionadosDe(
  productos: readonly ProductoVitrina[],
  actual: Pick<ProductoVitrina, 'id' | 'cat'>,
  tope: number = TOPE_RELACIONADOS,
): ProductoVitrina[] {
  const otros = productos.filter((p) => p.id !== actual.id);
  const deSuCategoria = actual.cat ? otros.filter((p) => p.cat === actual.cat) : [];
  return (deSuCategoria.length > 0 ? deSuCategoria : otros).slice(0, Math.max(0, tope));
}
