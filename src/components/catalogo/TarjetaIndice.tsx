// Tarjeta para los resultados filtrados u ordenados: sale del índice de la categoría
// (nombre, precio, foto y lo que el carrito necesita), que es lo que viaja a la isla de
// toda la categoría. Sin descripción ni etiquetas, pero CON "Agregar".
// Comparte clases con <TarjetaProducto>, la completa del paginado estático.
import type { TasaApi } from '@/lib/api';
import { equivalenteEnMoneda } from '@/lib/precio';
import { rutaFicha } from '@/lib/producto';
import type { EntradaIndice } from '@/lib/paginacion';
import AccionesProducto from './AccionesProducto';

export default function TarjetaIndice({ entrada: e, tasa }: { entrada: EntradaIndice; tasa: TasaApi | null }) {
  const ficha = rutaFicha(e.id);
  const equivalente = equivalenteEnMoneda(e.price, tasa);
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
          </span>
          <AccionesProducto
            id={e.id}
            nombre={e.name}
            precio={e.price}
            imagen={e.image}
            priceTiers={e.priceTiers}
            minQty={e.minQty}
            requiresOptions={e.requiresOptions}
          />
        </div>
      </div>
    </article>
  );
}
