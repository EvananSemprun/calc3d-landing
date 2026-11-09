// Tarjeta del catálogo. Se renderiza en el servidor (build) y se hidrata: el HTML del
// catálogo completo queda en la página para el buscador.
//
// Distribución pareja (decisión del dueño): título de 2 líneas fijas, descripción
// tope 2 líneas y pie en COLUMNA (precio arriba, botones abajo) pegado al fondo con
// `margin-top:auto`, así las tarjetas de una misma fila se alinean aunque su texto
// mida distinto. Los estilos (`.product*`) viven en global.css.
import { Badge } from '@/components/ui/badge';
import Cruce, { useCruce } from '@/components/ui/Cruce';
import Foto from '@/components/ui/Foto';
import { equivalenteEnMoneda } from '@/lib/precio';
import { hayRecargo, lineaDeTarjeta, rutaFicha, textoDeEntrega, textoDeMinimo, type ProductoVitrina } from '@/lib/producto';
import type { TasaApi } from '@/lib/api';
import AccionesProducto from './AccionesProducto';
import { INSIGNIA_DESTACADA, INSIGNIA_NUEVO, INSIGNIA_OFERTA, INSIGNIA_SUAVE } from './insignias';



interface Props {
  producto: ProductoVitrina;
  tasa: TasaApi | null;
  /**
   * Apaga el fundido de la foto: para las tarjetas que pueden ser la candidata a LCP de
   * la pantalla (la PRIMERA FILA de la grilla del listado). Una imagen en `opacity: 0` no
   * es candidata a LCP para el navegador, así que fundirla lo RETRASA. Quien decide
   * cuáles son es `Catalogo.tsx`, que es el único que sabe en qué posición va cada una.
   */
  prioridad?: boolean;
}

export default function TarjetaProducto({ producto: p, tasa, prioridad = false }: Props) {
  const ficha = rutaFicha(p.id);
  const enOferta = !!p.compareAt && p.compareAt > p.price;
  const linea = lineaDeTarjeta(p);
  // Mismos textos que los hechos de la ficha: una sola definición en `producto.ts`.
  const entrega = textoDeEntrega(p);
  const minimo = textoDeMinimo(p);
  const equivalente = equivalenteEnMoneda(p.price, tasa);

  // El refresco en vivo cruza el dato que el dueño corrigió desde el panel, en vez de
  // reemplazarlo de golpe. Son los tres textos que cambian de valor sin mover la
  // tarjeta; un producto que aparece o desaparece vale SECO (ver `ui/Cruce.tsx`).
  // ⚠️ `TarjetaIndice` —la del filtrado— tiene que cruzar LO MISMO. Son dos componentes
  // con el mismo aspecto y este repo ya dejó pasar dos veces lo que se cubrió en uno
  // solo (la insignia «Nuevo», la moneda «USD»). Lo exige `ui/Cruce.spec.tsx`.
  const cruceEquivalente = useCruce(equivalente);
  const cruceTachado = useCruce(p.compareAt);
  const cruceInsignia = useCruce(p.badge);

  return (
    <article className="card product">
      <a className="product-media" href={ficha} aria-label={`Ver ${p.name}`}>
        {p.image ? (
          <Foto
            className="product-photo"
            src={p.image.url}
            alt={p.image.alt || p.name}
            loading="lazy"
            prioridad={prioridad}
            {...(p.image.width && p.image.height ? { width: p.image.width, height: p.image.height } : {})}
          />
        ) : (
          <div className="ph" data-label="sin foto" />
        )}
        <div className="product-badges">
          {p.badge && (
            <Badge className={INSIGNIA_DESTACADA} {...cruceInsignia}>
              {p.badge}
            </Badge>
          )}
          {p.nuevo && <Badge className={INSIGNIA_NUEVO}>Nuevo</Badge>}
          {enOferta && <Badge className={INSIGNIA_OFERTA}>Oferta</Badge>}
          {p.custom && <Badge className={INSIGNIA_SUAVE}>Personalizable</Badge>}
        </div>
      </a>

      <div className="product-body">
        <div className="product-top">
          <h3>
            <a href={ficha}>{p.name}</a>
          </h3>
          {p.kind === 'SERVICE' && <Badge className={INSIGNIA_SUAVE}>Servicio</Badge>}
        </div>
        {linea && <p className="product-line mono">{linea}</p>}
        {p.desc && <p className="product-desc">{p.desc}</p>}

        <div className="product-meta">
          {p.colorList.length > 0 && (
            <div className="swatches">
              {p.colorList.map((c) => (
                <span key={c.value} className="swatch" style={{ background: c.hex }} title={c.value} />
              ))}
            </div>
          )}
          {entrega && <span className="mono dim text-xs">{entrega}</span>}
          {minimo && <span className="mono dim text-xs">{minimo}</span>}
        </div>

        <div className="product-foot">
          <span className="price">
            {hayRecargo(p) && <small className="price-desde">desde </small>}
            {/* El precio es un nodo de texto SUELTO: no tiene elemento propio que marcar,
                así que acá sí hace falta envolverlo. El `<span>` va pelado y en línea
                (medido: `.price` y `.product-foot` al píxel, a 390 y 1280). */}
            <Cruce valor={p.price}>${p.price.toFixed(2)}</Cruce>
            <small> BCV</small>
            {equivalente && (
              <span className="price-alt" {...cruceEquivalente}>
                ≈ {equivalente} {tasa?.currencyCode}
              </span>
            )}
            {enOferta && p.compareAt != null && (
              <s className="dim mono ml-1.5 text-[13px]" {...cruceTachado}>
                ${p.compareAt.toFixed(2)}
              </s>
            )}
          </span>

          <AccionesProducto id={p.id} nombre={p.name} />
        </div>
      </div>
    </article>
  );
}
