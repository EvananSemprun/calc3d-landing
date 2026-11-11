import TarjetaProducto from './TarjetaProducto';
import Carrusel from '@/components/ui/Carrusel';
import { fetchProductosCompletos, type TasaApi } from '@/lib/api';
import { destacadosDe } from '@/lib/portada';
import type { ProductoVitrina } from '@/lib/producto';
import { useEnVivo } from '@/lib/vivo';

/**
 * Los destacados, EN VIVO sobre lo horneado.
 *
 * Lo usan la portada y el índice de la tienda: el mismo marcado con distinto tope y un
 * encabezado opcional. Pinta lo horneado y al montar rederiva con `destacadosDe` sobre
 * lo que responde la API — las mismas funciones del build, para que el sitio no diga una
 * cosa recién construido y otra un minuto después.
 *
 * ⚠️ Si se quedó sin productos se dibuja VACÍO, no lo horneado. Conservarlo seguiría
 * mostrando algo que el dueño acaba de apagar, que es justo lo que esto viene a cerrar.
 * Una caída de la API es otra cosa: ahí el fetch lanza y lo horneado se conserva.
 */
export default function DestacadosEnVivo({
  inicial,
  tope,
  tasa,
  titulo = 'Destacados',
  verTodo = false,
  categoria,
  fila = false,
}: {
  inicial: ProductoVitrina[];
  tope: number;
  tasa: TasaApi | null;
  titulo?: string;
  verTodo?: boolean;
  /** Si viene, la franja muestra SOLO esa categoría (la colección de Navidad). */
  categoria?: string;
  /** Fila deslizable en vez de grilla: para una colección, donde se espera desplazar. */
  fila?: boolean;
}) {
  const { datos } = useEnVivo(inicial, async () => {
    const todos = await fetchProductosCompletos();
    return destacadosDe(categoria ? todos.filter((p) => p.cat === categoria) : todos, tope);
  });
  // ⚠️ Un id fijo se repetiría al haber DOS franjas en la portada, y `aria-labelledby`
  // apuntaría siempre a la primera.
  const idTitulo = `franja-${(categoria ?? 'destacados').replace(/[^a-z0-9]+/gi, '-')}`;

  // La etiqueta de categoría de cada tarjeta no aporta nada cuando TODA la franja es de
  // la misma: once veces «Navidad» debajo de once productos de Navidad es ruido que
  // compite con el nombre. Se DERIVA de los datos, no del hecho de haber pasado
  // `categoria`: una franja sin filtrar que casualmente traiga una sola categoría se
  // comporta igual, y es la misma regla.
  const unaSolaCategoria = new Set(datos.map((p) => p.cat)).size <= 1;

  if (datos.length === 0) return null;

  return (
    <section className="section" aria-labelledby={idTitulo}>
      <div className="container">
        {verTodo ? (
          <div className="eyebrow-row mb-6">
            <h2 className="h2" id={idTitulo}>
              {titulo}
            </h2>
            <a
              href={categoria ? `/tienda/${categoria}/` : '/tienda/'}
              className="enlace-tactil text-sm font-semibold text-primary hover:underline"
            >
              Ver todo →
            </a>
          </div>
        ) : (
          <h2 className="h2 mb-6" id={idTitulo}>
            {titulo}
          </h2>
        )}
        {fila ? (
          <Carrusel etiqueta={titulo}>
            {datos.map((p) => (
              <TarjetaProducto key={p.id} producto={p} tasa={tasa} sinCategoria={unaSolaCategoria} />
            ))}
          </Carrusel>
        ) : (
          <div className="grid shop-grid shop-grid--destacados">
            {datos.map((p) => (
              <TarjetaProducto key={p.id} producto={p} tasa={tasa} sinCategoria={unaSolaCategoria} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
