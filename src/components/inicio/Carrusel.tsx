// Carrusel del hero. Astro lo renderiza en el build con los 3 slides FIJOS (quedan en
// el HTML: SEO + sin salto de layout) y lo hidrata: al montar trae los banners del
// panel (GET /public/store/banners) y, si hay, reemplaza los fijos. Autoplay con pausa
// al pasar el mouse, respeta prefers-reduced-motion, operable por teclado (prev/next/puntos).
import { useEffect, useState } from 'react';
import bananoHola from '@/assets/brand/banano-hola.png';
import bananoChamba from '@/assets/brand/banano-chamba.png';
import impresora3d from '@/assets/brand/impresora-3d.png';
import { buttonVariants } from '@/components/ui/button';
import { fetchBanners } from '@/lib/api';
import { enlaceBanner } from '@/lib/banner';

const CLASE_CTA = buttonVariants({ size: 'lg' });

interface Slide {
  kicker?: string;
  title: string;
  subtitle?: string | null;
  img: string;
  cta?: { href: string; texto: string; cotizar?: boolean } | null;
}

const FALLBACK: Slide[] = [
  {
    kicker: 'Impresión 3D',
    title: 'De la idea a la pieza. La imprimimos por vos.',
    subtitle: 'Piezas por encargo en PLA, PETG, ABS y TPU. Desde una unidad.',
    img: bananoHola.src,
    cta: { href: '/tienda/', texto: 'Ver el catálogo' },
  },
  {
    kicker: 'A tu medida',
    title: '¿No está en el catálogo? Lo fabricamos.',
    subtitle: 'Traés el archivo, la foto de una pieza rota o solo la idea. Te cotizamos por WhatsApp.',
    img: bananoChamba.src,
    cta: { href: '#', texto: 'Cotizar a medida', cotizar: true },
  },
  {
    kicker: 'Hecho acá',
    title: 'Taller propio, producción bajo pedido.',
    subtitle: 'Sin stock que se venza ni mínimos absurdos. Listo en los días que dice cada ficha.',
    img: impresora3d.src,
    cta: { href: '/impresion-3d/', texto: 'Cómo trabajamos' },
  },
];

export default function Carrusel() {
  const [slides, setSlides] = useState<Slide[]>(FALLBACK);
  const [activa, setActiva] = useState(0);
  const [pausado, setPausado] = useState(false);

  // Trae los banners del panel; si hay, reemplazan a los fijos.
  useEffect(() => {
    fetchBanners()
      .then((banners) => {
        if (!banners.length) return;
        setSlides(
          banners.map((b) => {
            const href = enlaceBanner(b);
            return {
              title: b.title ?? '',
              subtitle: b.subtitle,
              img: b.imageUrl ?? '',
              cta: href ? { href, texto: 'Ver más' } : null,
            };
          }),
        );
        setActiva(0);
      })
      .catch(() => {
        /* se quedan los fijos */
      });
  }, []);

  // Autoplay, salvo reduced-motion, con un solo slide, o en pausa (hover).
  useEffect(() => {
    if (pausado || slides.length < 2) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => setActiva((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [pausado, slides.length]);

  const ir = (n: number) => setActiva((n + slides.length) % slides.length);

  return (
    <section
      className="carousel"
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="carousel-track">
        {slides.map((s, n) => {
          const Tag = n === 0 ? 'h1' : 'h2';
          return (
            <article
              key={`${s.title}-${n}`}
              id={`slide-${n}`}
              role="tabpanel"
              aria-roledescription="diapositiva"
              aria-hidden={n !== activa}
              className={`carousel-slide${n === activa ? ' is-active' : ''}`}
            >
              <div className="container carousel-content">
                <div className="carousel-text">
                  {s.kicker && <span className="kicker">{s.kicker}</span>}
                  <Tag className="h1 text-balance">{s.title}</Tag>
                  {s.subtitle && <p className="lead">{s.subtitle}</p>}
                  {s.cta &&
                    (s.cta.cotizar ? (
                      <a href={s.cta.href} className={CLASE_CTA} data-bl="cotizar">
                        {s.cta.texto}
                      </a>
                    ) : (
                      <a href={s.cta.href} className={CLASE_CTA}>
                        {s.cta.texto}
                      </a>
                    ))}
                </div>
                {s.img && (
                  <img className="carousel-art" src={s.img} alt="" loading={n === 0 ? 'eager' : 'lazy'} />
                )}
              </div>
            </article>
          );
        })}
      </div>

      {slides.length > 1 && (
        <>
          <button className="carousel-nav prev" type="button" aria-label="Anterior" onClick={() => ir(activa - 1)}>
            ‹
          </button>
          <button className="carousel-nav next" type="button" aria-label="Siguiente" onClick={() => ir(activa + 1)}>
            ›
          </button>
          <div className="carousel-dots" role="tablist" aria-label="Elegir banner">
            {slides.map((s, n) => (
              <button
                key={`dot-${s.title}-${n}`}
                type="button"
                role="tab"
                aria-label={`Banner ${n + 1}`}
                aria-controls={`slide-${n}`}
                aria-selected={n === activa}
                onClick={() => ir(n)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
