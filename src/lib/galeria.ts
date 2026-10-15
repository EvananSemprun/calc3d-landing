// Galería de la ficha: foto por color. Pura: sin DOM.
import type { FotoApi, ProductoVitrina } from './producto';

/** Opción elegida por grupo: { [nombre del grupo]: valor de la opción }. */
export type Elegido = Record<string, string | undefined>;

/**
 * Fotos que muestra la galería para la selección actual. Si un grupo "define la
 * foto" (`drivesPhoto`) y la opción elegida tiene fotos propias, la galería
 * muestra esas; si no (opción sin foto, sin elección, o ningún grupo foto), la
 * base del producto.
 */
export function fotosDeOpcion(
  producto: Pick<ProductoVitrina, 'images' | 'image' | 'optionGroups'>,
  elegido: Elegido,
): FotoApi[] {
  const fotosBase = producto.images ?? (producto.image ? [producto.image] : []);
  const grupoFoto = producto.optionGroups.find((g) => g.drivesPhoto);
  const opcionFoto = grupoFoto
    ? grupoFoto.options.find((o) => o.value === elegido[grupoFoto.name])
    : null;
  return opcionFoto?.images?.length ? opcionFoto.images : fotosBase;
}
