// Tarjeta para los resultados filtrados u ordenados: sale del índice de la categoría
// (nombre, precio, foto y lo que el carrito necesita), que es lo que viaja a la isla de
// toda la categoría. Sin descripción ni etiquetas, pero CON "Agregar".
// Comparte clases con <TarjetaProducto>, la completa del paginado estático.
import type { TasaApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { equivalenteEnMoneda } from '@/lib/precio';
import { rutaFicha } from '@/lib/producto';
import type { EntradaIndice } from '@/lib/paginacion';
import AccionesProducto from './AccionesProducto';
import { INSIGNIA_DESTACADA } from './insignias';


export default function TarjetaIndice({ entrada: e, tasa }: { entrada: EntradaIndice; tasa: TasaApi | null }) {
  const ficha = rutaFicha(e.id);
  const equivalente = equivalenteEnMoneda(e.price, tasa);
  const enOferta = !!e.compareAt && e.compareAt > e.price;
  return (
    <article className="card product">
      <a className="product-media" href={ficha} aria-label={`Ver ${e.name}`}>
        {e.image ? (
          <img
            className="product-photo"
            src={e.image.url}
            alt={e.image.alt || e.name}
            loading="lazy"
            {...(e.image.width && e.image.height ? { width: e.image.width, height: e.image.height } : {})}
          />
        ) : (
          <div className="ph" data-label="sin foto" />
        )}
        {e.badge && (
          <div className="product-badges">
            <Badge className={INSIGNIA_DESTACADA}>{e.badge}</Badge>
          </div>
        )}
      </a>
      <div className="product-body">
        <div className="product-top">
          <h3>
            <a href={ficha}>{e.name}</a>
          </h3>
        </div>
        <div className="product-foot">
          <span className="price">
            ${e.price.toFixed(2)}
            <small> USD</small>
            {equivalente && (
              <span className="price-alt">
                ≈ {equivalente} {tasa?.currencyCode}
              </span>
            )}
            {enOferta && e.compareAt != null && (
              <s className="dim mono ml-1.5 text-[13px]">${e.compareAt.toFixed(2)}</s>
            )}
          </span>
          <AccionesProducto id={e.id} nombre={e.name} />
        </div>
      </div>
    </article>
  );
}
