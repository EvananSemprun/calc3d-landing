import TarjetaProducto from './TarjetaProducto';
import Carrusel from '@/components/ui/Carrusel';
import { fetchColeccion, fetchProductosCompletos, type TasaApi } from '@/lib/api';
import { franjaDePortada, type FranjaPortada } from '@/lib/portada';
import { useEnVivo } from '@/lib/vivo';

/**
 * La franja principal de la portada: la COLECCIÓN que el dueño eligió en el panel, o
 * «Destacados» si no hay ninguna vigente.
 *
 * Pinta lo horneado (los destacados del build, o sea la portada de siempre) y al montar le
 * pregunta a la API cuál colección vale hoy. Mismo patrón que `DestacadosEnVivo`.
 *
 * ⚠️ Solo se le pide el catálogo completo cuando NO hay colección: es lo que alimenta la
 * caída a «Destacados». Con colección vigente la API ya trae sus productos resueltos.
 * Una caída de la API lanza y se conserva lo horneado (contrato de `useEnVivo`).
 */
export default function ColeccionEnVivo({
  inicial,
  tope,
  tasa,
}: {
  inicial: FranjaPortada;
  tope: number;
  tasa: TasaApi | null;
}) {
  const { datos } = useEnVivo(inicial, async () => {
    const coleccion = await fetchColeccion();
    return franjaDePortada(coleccion, coleccion ? [] : await fetchProductosCompletos(), tope);
  });

  // Con una sola categoría en toda la franja, repetirla en cada tarjeta es ruido.
  const unaSolaCategoria = new Set(datos.productos.map((p) => p.cat)).size <= 1;
  const idTitulo = 'franja-portada';

  if (datos.productos.length === 0) return null;

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
