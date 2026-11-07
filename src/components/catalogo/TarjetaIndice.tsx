// Tarjeta LIVIANA para los resultados filtrados: sale del índice de la categoría
// (nombre, precio, foto), que es lo único que viaja a la isla de toda la categoría.
// Comparte clases con <TarjetaProducto>, que es la completa del paginado estático.
import { Button } from '@/components/ui/button';
import type { TasaApi } from '@/lib/api';
import { equivalenteEnMoneda } from '@/lib/precio';
import type { EntradaIndice } from '@/lib/paginacion';

const BOTON_FANTASMA =
  'h-10 px-[18px] border-[var(--card-line-strong)] bg-transparent text-foreground shadow-none hover:border-primary hover:bg-transparent hover:text-primary dark:border-[var(--card-line-strong)] dark:bg-transparent dark:hover:bg-transparent';

export default function TarjetaIndice({ entrada: e, tasa }: { entrada: EntradaIndice; tasa: TasaApi | null }) {
  const ficha = `/producto/${e.id}`;
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
          <div className="product-actions">
            <Button asChild variant="outline" className={BOTON_FANTASMA}>
              <a href={ficha}>Ver detalle</a>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
