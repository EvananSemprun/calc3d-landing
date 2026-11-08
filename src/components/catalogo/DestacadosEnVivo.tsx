import TarjetaProducto from './TarjetaProducto';
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
}: {
  inicial: ProductoVitrina[];
  tope: number;
  tasa: TasaApi | null;
  titulo?: string;
  verTodo?: boolean;
}) {
  const { datos } = useEnVivo(inicial, async () => destacadosDe(await fetchProductosCompletos(), tope));

  if (datos.length === 0) return null;

  return (
    <section className="section pt-0" aria-labelledby="destacados-titulo">
      <div className="container">
        {verTodo ? (
          <div className="eyebrow-row mb-6">
            <h2 className="h2" id="destacados-titulo">
              {titulo}
            </h2>
            <a href="/tienda/" className="text-sm font-semibold text-primary hover:underline">
              Ver todo →
            </a>
          </div>
        ) : (
          <h2 className="h2 mb-6" id="destacados-titulo">
            {titulo}
          </h2>
        )}
        <div className="grid shop-grid">
          {datos.map((p) => (
            <TarjetaProducto key={p.id} producto={p} tasa={tasa} />
          ))}
        </div>
      </div>
    </section>
  );
}
