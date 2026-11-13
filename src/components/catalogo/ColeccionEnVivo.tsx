import TarjetaProducto from './TarjetaProducto';
import Carrusel from '@/components/ui/Carrusel';
import { fetchColeccion, type TasaApi } from '@/lib/api';
import { franjaDePortada, type FranjaPortada } from '@/lib/portada';
import { useEnVivo } from '@/lib/vivo';

/**
 * La franja de la COLECCIÓN del panel, bajo el hero. Sin colección vigente no dibuja nada.
 *
 * Pinta lo horneado en el build (la colección vigente de ese momento, o nada) y al montar
 * le pregunta a la API cuál vale hoy: el dueño la cambia o la vacía sin reconstruir el sitio.
 * Mismo patrón que `DestacadosEnVivo`.
 *
 * ⚠️ «Sin colección» es una respuesta VÁLIDA de la API (`null`), no un error: ahí se
 * reemplaza lo horneado por nada, o seguiría mostrándose una colección que el dueño ya
 * apagó. Una caída de la API es otra cosa: lanza y se conserva lo horneado (`useEnVivo`).
 */
export default function ColeccionEnVivo({
  inicial,
  tope,
  tasa,
}: {
  inicial: FranjaPortada | null;
  tope: number;
  tasa: TasaApi | null;
}) {
  const { datos } = useEnVivo<FranjaPortada | null>(inicial, async () => franjaDePortada(await fetchColeccion(), tope));

  if (!datos || datos.productos.length === 0) return null;

  // Con una sola categoría en toda la franja, repetirla en cada tarjeta es ruido.
  const unaSolaCategoria = new Set(datos.productos.map((p) => p.cat)).size <= 1;
  const idTitulo = 'franja-portada';

  return (
    <section className="section" aria-labelledby={idTitulo}>
      <div className="container">
        <div className="eyebrow-row mb-6">
          <div>
            <h2 className="h2" id={idTitulo}>
              {datos.titulo}
            </h2>
            {datos.subtitulo ? <p className="text-sm text-muted-foreground">{datos.subtitulo}</p> : null}
          </div>
          {datos.verTodoHref ? (
            <a href={datos.verTodoHref} className="enlace-tactil text-sm font-semibold text-primary hover:underline">
              Ver todo →
            </a>
          ) : null}
        </div>
        <Carrusel etiqueta={datos.titulo}>
          {datos.productos.map((p) => (
            <TarjetaProducto key={p.id} producto={p} tasa={tasa} sinCategoria={unaSolaCategoria} />
          ))}
        </Carrusel>
      </div>
    </section>
  );
}
