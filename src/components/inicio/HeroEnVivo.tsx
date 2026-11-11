import { useEffect, useRef, useState } from 'react';
import Buscador from '@/components/catalogo/Buscador';
import { buttonVariants } from '@/components/ui/button';
import { fetchBanners } from '@/lib/api';
import { bannersDeHero, enlaceBanner, type Banner } from '@/lib/banner';
import { useEnVivo } from '@/lib/vivo';

/**
 * El hero de la portada, EN VIVO.
 *
 * Con banners de portada cargados es un carrusel; sin ninguno, el hero de siempre con su
 * arte de marca. Esa decisión ahora se toma también en el navegador: prender el primer
 * banner, apagar el último o cambiar el orden se ve sin reconstruir.
 *
 * ⚠️ **Se conserva la FORMA del DOM**: `section.hero.hero-home > .container.hero-art-grid
 * > div` + la imagen hermana. Las reglas de la animación de entrada se enganchan con
 * hijo directo sobre esa estructura (ver «Entrada de la página» en global.css); envolver
 * los textos en un div más apaga la entrada **sin que nada falle**.
 *
 * ⚠️ **Se renderiza también en el BUILD**, como toda isla de Astro, así que el `h1` y el
 * mensaje siguen en el HTML. Es lo que separa esto de una SPA.
 *
 * ⚠️ **Solo la primera diapositiva lleva `<h1>`**; las demás usan `<p class="h1">`, que
 * se ve igual y deja un único encabezado de primer nivel en la página.
 *
 * ⚠️ Un solo banner NO es carrusel: ni puntos ni rotación.
 */
export default function HeroEnVivo({
  slidesIniciales,
  rutasDeCategoria = {},
  arte,
}: {
  slidesIniciales: Banner[];
  rutasDeCategoria?: Record<string, string>;
  /** El arte de marca, para cuando no hay ningún banner. */
  arte: { src: string; width: number; height: number };
}) {
  const { datos: slides } = useEnVivo(slidesIniciales, async () => bannersDeHero(await fetchBanners()));
  const [activa, setActiva] = useState(0);
  const caja = useRef<HTMLElement>(null);

  // Si cambian los banners, la diapositiva activa puede quedar fuera de rango.
  useEffect(() => {
    setActiva((i) => (i < slides.length ? i : 0));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    // ⚠️ Con `prefers-reduced-motion: reduce` no rota sola. Los puntos siguen andando:
    // se saca el movimiento automático, no el control.
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (quieto.matches) return;
    const reloj = window.setInterval(() => setActiva((i) => (i + 1) % slides.length), 6000);
    return () => window.clearInterval(reloj);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <section className="hero hero-home" aria-label="Banano Lab, impresión 3D a pedido">
        <div className="container hero-art-grid">
          <div>
            <span className="kicker">Impresión 3D</span>
            <h1 className="h1 text-balance">De la idea a la pieza. La imprimimos por ti.</h1>
            <p className="lead">
              Producimos por encargo en nuestro taller, desde una sola unidad. Tú nos dices qué
              necesitas y nosotros resolvemos cómo hacerla.
            </p>
            <div className="hero-actions">
              <a href="/tienda/" className={buttonVariants({ size: 'lg' })}>
                Ver el catálogo
              </a>
              {/* `data-bl="cotizar"`: el teléfono lo completa `WhatsappCotizar` al cargar.
                  `data-astro-reload` evita que el router trate el `#` como navegación. */}
              <a
                href="#"
                data-bl="cotizar"
                data-astro-reload
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Cotizar por WhatsApp
              </a>
            </div>
            <div className="hero-search">
              <Buscador />
            </div>
          </div>
          <img
            className="hero-art"
            src={arte.src}
            width={arte.width}
            height={arte.height}
            alt=""
            loading="eager"
          />
        </div>
      </section>
    );
  }

  const varias = slides.length > 1;

  return (
    <section
      ref={caja}
      className="hero hero-home hero-carrusel"
      aria-label="Novedades"
      aria-roledescription={varias ? 'carrusel' : undefined}
    >
      {/* ⚠️ EL FONDO va FUERA del `.container` y detrás de todo: tiene que ocupar el ancho
          completo de la pantalla, no el del contenido. Solo se dibuja el de la
          diapositiva activa — con todos montados, el navegador bajaría cuatro imágenes
          grandes de una.

          ⚠️ El `alt` va VACÍO a propósito: es decoración. Lo que dice la diapositiva ya
          está en el `<h1>` de al lado, y un lector de pantalla que lea dos veces lo mismo
          estorba. */}
      {slides[activa]?.backgroundUrl && (
        <div className="hero-fondo" aria-hidden="true">
          <img src={slides[activa].backgroundUrl ?? ''} alt="" />
        </div>
      )}
      <div className="container">
        {slides.map((b, i) => {
          const href = enlaceBanner(b, rutasDeCategoria);
          return (
            <div
              key={`${b.title}-${i}`}
              className={`hero-art-grid hero-slide${b.imageUrl ? '' : ' hero-slide--sin-arte'}`}
              {...(i === activa ? { 'data-activa': '' } : { 'aria-hidden': 'true' })}
              aria-roledescription={varias ? 'diapositiva' : undefined}
              aria-label={varias ? `${i + 1} de ${slides.length}` : undefined}
            >
              <div>
                {i === 0 ? (
                  <h1 className="h1 text-balance">{b.title}</h1>
                ) : (
                  <p className="h1 text-balance">{b.title}</p>
                )}
                {b.subtitle && <p className="lead">{b.subtitle}</p>}
                <div className="hero-actions">
                  <a href={href ?? '/tienda/'} className={buttonVariants({ size: 'lg' })}>
                    {href ? 'Ver más' : 'Ver el catálogo'}
                  </a>
                  <a
                    href="#"
                    data-bl="cotizar"
                    data-astro-reload
                    className={buttonVariants({ variant: 'outline', size: 'lg' })}
                  >
                    Cotizar por WhatsApp
                  </a>
                </div>
              </div>
              {/* ⚠️ El arte de al lado es OPCIONAL desde el 2026-11-12: un banner puede
                  traer solo el fondo, y entonces el texto va sobre la foto. Sin este
                  condicional se dibujaría un `<img>` con `src=""`, que el navegador
                  pinta como imagen rota. */}
              {b.imageUrl && (
                <img
                  className="hero-art hero-art--banner"
                  src={b.imageUrl}
                  alt={b.title ?? ''}
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              )}
            </div>
          );
        })}

        {varias && (
          <div className="hero-puntos" role="tablist" aria-label="Elegir diapositiva">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                className="hero-punto"
                aria-selected={i === activa}
                aria-label={`Diapositiva ${i + 1}`}
                onClick={() => setActiva(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
