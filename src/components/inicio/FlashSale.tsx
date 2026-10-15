// Sección Flash Sale. Consume GET /public/store/sale al hacerse visible. Si no hay
// ventana activa o no hay productos en oferta, la respuesta es null y la sección NO se
// pinta. El contador corre en el navegador; al llegar a 0 muestra "Oferta finalizada"
// (no se auto-oculta). El precio que se cobra NO cambia: la tarjeta ya muestra el
// tachado y la insignia "Oferta"; acá solo se agrega el %OFF.
import { useEffect, useState } from 'react';
import TarjetaProducto from '@/components/catalogo/TarjetaProducto';
import { fetchSale, type SaleData, type TasaApi } from '@/lib/api';
import { formatearCuenta, porcentajeOff } from '@/lib/banner';

interface Props {
  tasa: TasaApi | null;
}

export default function FlashSale({ tasa }: Props) {
  const [sale, setSale] = useState<SaleData | null>(null);
  const [cuenta, setCuenta] = useState('');

  useEffect(() => {
    fetchSale()
      .then(setSale)
      .catch(() => setSale(null));
  }, []);

  useEffect(() => {
    if (!sale) return;
    const fin = new Date(sale.endsAt).getTime();
    const tick = () => setCuenta(formatearCuenta(fin - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [sale]);

  if (!sale || !sale.products.length) return null;

  return (
    <section className="section flash-sale">
      <div className="container">
        <div className="eyebrow-row flash-head">
          <h2 className="h2">{sale.title || 'Flash Sale'}</h2>
          <div className="flash-countdown" aria-live="polite">
            {cuenta}
          </div>
        </div>
        <div className="grid shop-grid">
          {sale.products.map((p) => {
            const off = porcentajeOff(p.compareAt, p.price);
            return (
              <div className="flash-item" key={p.id}>
                {off > 0 && <span className="flash-off">-{off}%</span>}
                <TarjetaProducto producto={p} tasa={tasa} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
