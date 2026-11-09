import Foto from '@/components/ui/Foto';
import { fetchBanners } from '@/lib/api';
import { bannerDeCategoria, enlaceBanner, type Banner } from '@/lib/banner';
import { useEnVivo } from '@/lib/vivo';

/**
 * El banner de una categoría, EN VIVO.
 *
 * Se ve en la página de esa categoría y en las fichas de sus productos. Pinta lo
 * horneado y al montar vuelve a preguntar: prender o apagar el banner se ve sin
 * reconstruir, que es lo que pidió el dueño.
 *
 * ⚠️ Cuál es lo decide `bannerDeCategoria`, la MISMA función que usó el build y que usan
 * los dos lugares donde aparece. Si cada uno eligiera por su cuenta, el día que cambie
 * la regla la categoría y la ficha mostrarían banners distintos.
 *
 * ⚠️ Sin banner no se dibuja nada: no hay hueco ni marco vacío.
 */
export default function BannerCategoriaEnVivo({
  inicial,
  slug,
  rutasDeCategoria = {},
}: {
  inicial: Banner | null;
  slug: string | null;
  rutasDeCategoria?: Record<string, string>;
}) {
  const { datos } = useEnVivo(inicial, async () => bannerDeCategoria(await fetchBanners(), slug));

  if (!datos?.imageUrl) return null;

  const href = enlaceBanner(datos, rutasDeCategoria);
  const img = <Foto src={datos.imageUrl} alt={datos.title ?? ''} loading="lazy" />;

  return href ? (
    <a className="banner-cat" href={href} aria-label={datos.title ? `Ver: ${datos.title}` : 'Ver más'}>
      {img}
    </a>
  ) : (
    <div className="banner-cat">{img}</div>
  );
}
