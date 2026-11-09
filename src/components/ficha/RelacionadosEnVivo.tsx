import TarjetaProducto from '@/components/catalogo/TarjetaProducto';
import { fetchProductosCompletos, type TasaApi } from '@/lib/api';
import { relacionadosDe } from '@/lib/relacionados';
import { useEnVivo } from '@/lib/vivo';
import type { ProductoVitrina } from '@/lib/producto';

/**
 * «También te puede servir», EN VIVO sobre lo horneado.
 *
 * ⚠️ **Antes se elegía en el BUILD y no se refrescaba nunca** (hasta el 2026-11-08): la
 * regla estaba escrita a mano dentro del `getStaticPaths` de `producto/[slug].astro` y
 * las tarjetas salían como marcado de Astro. Un producto borrado seguía ofreciéndose
 * desde todas las fichas —con su enlace, su foto y su precio— hasta el próximo
 * despliegue. Era la mitad del problema del producto borrado; la otra mitad es la ficha.
 *
 * ⚠️ **Rederiva con la MISMA función pura que el build** (`relacionadosDe`). Si acá se
 * eligiera por otro camino, el sitio ofrecería una cosa recién construido y otra un
 * minuto después, y nadie podría decir cuál de las dos es la regla.
 *
 * ⚠️ **Pide el catálogo COMPLETO**, no el liviano: la tarjeta dice «desde» cuando alguna
 * opción suma, y los recargos solo vienen en la respuesta completa. Con la liviana el
 * «desde» desaparecería al refrescar, que es peor que no refrescar.
 *
 * ⚠️ **Si la API falla se conserva lo horneado** (el comportamiento de `useEnVivo`): una
 * franja de sugerencias vieja no engaña a nadie sobre lo que está comprando. Lo que sí
 * se va es la sección entera cuando no queda ninguno.
 */
export default function RelacionadosEnVivo({
  inicial,
  actual,
  tasa,
}: {
  inicial: ProductoVitrina[];
  /** El producto de la ficha: no puede ofrecerse a sí mismo. `cat` vacío = sin categoría. */
  actual: { id: string; cat: string };
  tasa: TasaApi | null;
}) {
  const { datos } = useEnVivo(inicial, async () =>
    relacionadosDe(await fetchProductosCompletos(), actual),
  );

  if (datos.length === 0) return null;

  return (
    <section className="section pdp-related">
      <div className="container">
        <div className="eyebrow-row">
          <h2 className="h2">También te puede servir</h2>
          <a href="/tienda/" className="text-sm font-semibold text-primary hover:underline">
            Ver todo el catálogo →
          </a>
        </div>
        <div className="grid shop-grid">
          {datos.map((r) => (
            <TarjetaProducto key={r.id} producto={r} tasa={tasa} />
          ))}
        </div>
      </div>
    </section>
  );
}
