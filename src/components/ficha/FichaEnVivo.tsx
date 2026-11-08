import { useMemo } from 'react';
import Ficha from './Ficha';
import { fetchProducto, type InfoApi } from '@/lib/api';
import { useEnVivo } from '@/lib/vivo';
import type { ProductoVitrina } from '@/lib/producto';

/**
 * La ficha, EN VIVO sobre lo horneado.
 *
 * Dos trabajos en uno:
 *
 * 1. **Refrescar.** La página trae la ficha del último build; al montar se vuelve a
 *    preguntar por su enlace y se reemplaza lo que cambió (precio, descripción, fotos,
 *    si dejó de estar publicada). El dueño corrige un precio y se ve sin reconstruir.
 *
 * 2. **Resolver un producto SIN página propia.** Un producto creado después del último
 *    build no tiene HTML; la ruta comodín monta esto con `inicial = null` y el enlace
 *    compartido funciona igual. Era la condición que puso el dueño: los enlaces
 *    personalizados tienen que seguir andando.
 *
 * ⚠️ **`key` cuelga de la ESTRUCTURA de opciones.** `Ficha` arranca su selección y su
 * cantidad del producto en el primer render; si las opciones cambiaran bajo sus pies,
 * quedaría eligiendo un color que ya no existe. Con la key, cambia la estructura y el
 * componente se vuelve a montar con la selección correcta. El precio o la descripción
 * no mueven la key: eso se actualiza sin perder lo que el visitante ya eligió.
 */
export default function FichaEnVivo({
  inicial,
  slug,
  info,
}: {
  inicial: ProductoVitrina | null;
  /** Si no viene, se saca de la URL: la ruta comodín no lo conoce en el build. */
  slug?: string;
  info: InfoApi;
}) {
  // Con un rewrite 200 la barra de direcciones conserva /producto/<slug>/, así que la
  // URL es la única fuente del enlace cuando la página no se generó para él.
  const elSlug =
    slug ??
    (typeof location !== 'undefined'
      ? decodeURIComponent(location.pathname.replace(/^\/producto\//, '').replace(/\/+$/, ''))
      : '');
  const { datos, error } = useEnVivo(inicial, () => fetchProducto(elSlug));

  const clave = useMemo(
    () =>
      datos
        ? datos.optionGroups.map((g) => `${g.name}:${g.options.map((o) => o.value).join(',')}`).join('|')
        : '',
    [datos],
  );

  if (!datos) {
    // Sin ficha horneada: o está viajando, o el producto no existe.
    return error ? (
      <div className="pdp-aviso">
        <p className="lead">No pudimos cargar este producto.</p>
        <p>
          Puede que ya no esté disponible. Mirá el <a href="/tienda/">catálogo</a> o escribinos por
          WhatsApp y lo vemos.
        </p>
      </div>
    ) : (
      <p className="lead" role="status">
        Cargando el producto…
      </p>
    );
  }

  return (
    <>
      {error && (
        <p className="pdp-aviso-leve" role="status">
          Estás viendo la última información guardada: no pudimos conectar con el catálogo.
        </p>
      )}
      <Ficha key={clave} producto={datos} info={info} />
    </>
  );
}
