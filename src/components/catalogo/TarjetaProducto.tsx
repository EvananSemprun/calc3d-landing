// Tarjeta del catálogo. Se renderiza en el servidor (build) y se hidrata: el HTML del
// catálogo completo queda en la página para el buscador.
//
// Distribución pareja (decisión del dueño): título de 2 líneas fijas, descripción
// tope 2 líneas y pie en COLUMNA (precio arriba, botones abajo) pegado al fondo con
// `margin-top:auto`, así las tarjetas de una misma fila se alinean aunque su texto
// mida distinto. Los estilos (`.product*`) viven en global.css.
import { useEffect, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { agregar } from '@/lib/carrito';
import { equivalenteEnMoneda } from '@/lib/precio';
import type { ProductoVitrina } from '@/lib/producto';
import type { TasaApi } from '@/lib/api';

const INSIGNIA = 'px-[11px] py-[5px] text-[11.5px] font-semibold tracking-[.08em] uppercase';
const INSIGNIA_AMARILLA = `${INSIGNIA} border-primary/30 bg-primary/12 text-primary`;
const INSIGNIA_SUAVE = `${INSIGNIA} border-border bg-card text-muted-foreground`;
const INSIGNIA_OFERTA = `${INSIGNIA} border-[rgba(37,211,102,.35)] bg-[rgba(37,211,102,.14)] text-[#4be88a]`;

// "Ver detalle": el .btn-ghost del sitio viejo (borde suave que se vuelve amarillo).
const BOTON_FANTASMA =
  'h-10 px-[18px] border-[var(--card-line-strong)] bg-transparent text-foreground shadow-none hover:border-primary hover:bg-transparent hover:text-primary dark:border-[var(--card-line-strong)] dark:bg-transparent dark:hover:bg-transparent';
const BOTON_ACCION = 'h-10 px-4';

interface Props {
  producto: ProductoVitrina;
  tasa: TasaApi | null;
}

export default function TarjetaProducto({ producto: p, tasa }: Props) {
  const [agregado, setAgregado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const ficha = `/producto/${p.id}`;
  const enOferta = !!p.compareAt && p.compareAt > p.price;
  const linea = [p.catLabel, p.material].filter(Boolean).join(' • ');
  const equivalente = equivalenteEnMoneda(p.price, tasa);

  const agregarAlPedido = () => {
    // El unitario va SIN tramo de mayoreo (igual que la ficha): el carrito aplica el
    // tramo con la cantidad ACTUAL del renglón (`precioUnitarioItem`). Guardarlo ya
    // con descuento lo aplicaría dos veces. Respeta el mínimo de compra.
    agregar({
      id: p.id,
      qty: p.minQty || 1,
      unit: p.price,
      nombre: p.name,
      imagen: p.image,
      priceTiers: p.priceTiers,
      minQty: p.minQty,
    });
    setAgregado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAgregado(false), 1600);
  };

  return (
    <article className="card product">
      <a className="product-media" href={ficha} aria-label={`Ver ${p.name}`}>
        {p.image ? (
          <img
            className="product-photo"
            src={p.image.url}
            alt={p.image.alt || p.name}
            loading="lazy"
            {...(p.image.width && p.image.height ? { width: p.image.width, height: p.image.height } : {})}
          />
        ) : (
          <div className="ph" data-label="sin foto" />
        )}
        <div className="product-badges">
          {p.badge && <Badge className={INSIGNIA_AMARILLA}>{p.badge}</Badge>}
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
          {p.ship && <span className="mono dim text-xs">Listo en {p.ship}</span>}
          {p.minQty > 1 && <span className="mono dim text-xs">Mínimo {p.minQty}</span>}
        </div>

        <div className="product-foot">
          <span className="price">
            ${p.price.toFixed(2)}
            <small> USD</small>
            {equivalente && (
              <span className="price-alt">
                ≈ {equivalente} {tasa?.currencyCode}
              </span>
            )}
            {enOferta && p.compareAt != null && (
              <s className="dim mono ml-1.5 text-[13px]">${p.compareAt.toFixed(2)}</s>
            )}
          </span>

          <div className="product-actions">
            <Button asChild variant="outline" className={BOTON_FANTASMA}>
              <a href={ficha}>Ver detalle</a>
            </Button>
            {p.requiresOptions ? (
              // Hay que elegir algo (color, tamaño): agregar a ciegas cotizaría el
              // precio base y sin la opción. Se lleva a la ficha.
              <Button asChild className={BOTON_ACCION}>
                <a href={ficha} aria-label={`Elegir opciones de ${p.name}`}>
                  <Plus aria-hidden="true" /> Elegir
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                className={BOTON_ACCION}
                onClick={agregarAlPedido}
                aria-label={`Agregar ${p.name} al pedido`}
              >
                {agregado ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
                {agregado ? 'Agregado' : 'Agregar'}
              </Button>
            )}
          </div>
          <span className="sr-only" role="status" aria-live="polite">
            {agregado ? `${p.name} agregado al pedido` : ''}
          </span>
        </div>
      </div>
    </article>
  );
}
