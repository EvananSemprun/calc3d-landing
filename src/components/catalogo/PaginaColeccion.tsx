import { useEffect } from 'react';
import TarjetaProducto from './TarjetaProducto';
import { fetchColeccionPorSlug, type TasaApi } from '@/lib/api';
import type { ColeccionPortada } from '@/lib/portada';
import { useEnVivo } from '@/lib/vivo';

/**
 * El contenido de `/coleccion/<slug>/`, EN VIVO sobre lo horneado.
 *
 * Tres trabajos, los mismos que `FichaEnVivo`:
 * 1. Refrescar: la página trae la colección del último build y al montar se vuelve a
 *    preguntar, así que un producto que el dueño agrega o saca se ve sin reconstruir.
 * 2. Resolver una colección SIN página propia (creada después del build): la 404 monta
 *    esto con `inicial = null` y el slug sale de la URL.
 * 3. Decir que ya no está. Si la API contesta 404 —borrada, oculta o fuera de su
 *    ventana— se avisa, AUNQUE haya página horneada: conservarla sería una portada fantasma.
 *
 * ⚠️ La lista de productos viene RESUELTA de la API (`resolverColeccion` de shared, la misma
 * función de la vista previa del panel). Acá no se filtra ni se reordena nada.
 */
export default function PaginaColeccion({
  inicial,
  slug,
  tasa,
}: {
  inicial: ColeccionPortada | null;
  /** Si no viene, se saca de la URL: la 404 no lo conoce en el build. */
  slug?: string;
  tasa: TasaApi | null;
}) {
  const elSlug =
    slug ??
    (typeof location !== 'undefined'
      ? decodeURIComponent(location.pathname.replace(/^\/coleccion\//, '').replace(/\/+$/, ''))
      : '');
  const { datos, noExiste } = useEnVivo(inicial, () => fetchColeccionPorSlug(elSlug));

  // La pestaña acompaña a la colección cuando la página no se generó para ella.
  useEffect(() => {
    if (datos && !inicial) document.title = `${datos.titulo} — Banano Lab`;
  }, [datos, inicial]);

  if (noExiste) {
    return (
      <div className="shop-state container">
        <strong>Esta colección ya no está disponible.</strong>
        <p className="dim">
          <a href="/tienda/" className="text-primary hover:underline">
            Ver todo el catálogo →
          </a>
        </p>
      </div>
    );
  }
  if (!datos) return null;

  const unaSolaCategoria = new Set(datos.productos.map((p) => p.cat)).size <= 1;

  return (
    <section className="section pt-0">
      <div className="container">
        <h1 className="h1 text-balance">{datos.titulo}</h1>
        {datos.subtitulo ? <p className="lead">{datos.subtitulo}</p> : null}
        {datos.productos.length === 0 ? (
          <div className="shop-state">
            <strong>Todavía no hay productos en esta colección.</strong>
          </div>
        ) : (
          <div className="grid shop-grid mt-6">
            {datos.productos.map((p) => (
              <TarjetaProducto key={p.id} producto={p} tasa={tasa} sinCategoria={unaSolaCategoria} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
