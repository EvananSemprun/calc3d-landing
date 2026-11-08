import { useEffect, useState } from 'react';
import FichaEnVivo from './FichaEnVivo';
import type { InfoApi } from '@/lib/api';

/**
 * Rescata un producto que NO tiene página propia, desde la 404.
 *
 * La tienda se arma en el build, así que un producto creado después no tiene HTML y su
 * enlace cae en la 404. Esto mira la URL: si es `/producto/<algo>/`, en vez del cartel
 * de «no existe» intenta resolver ese producto contra la API. El enlace compartido
 * funciona igual, que es lo que pidió el dueño.
 *
 * ⚠️ **Va en la 404 y NO en una regla de reescritura.** El 2026-11-08 se probó con un
 * `_redirects` (`/producto/* -> /p/ 200`) y en producción TAPÓ las fichas que sí
 * existían: todas pasaron a devolver la cáscara y perdieron su título, su descripción y
 * su JSON-LD. La suposición de que Cloudflare sirve primero el archivo estático era
 * falsa para ese caso. Acá eso no puede pasar: la 404 solo se sirve cuando no hay
 * archivo, así que una ficha real nunca la ve.
 *
 * ⚠️ **El estado HTTP sigue siendo 404** hasta el próximo build, y está aceptado: para
 * una persona el enlace abre el producto, y la página de verdad nace cuando se
 * reconstruye. Lo que no hace es prometerle a un buscador una página que no existe.
 */
export default function RescatarProducto({ info }: { info: InfoApi }) {
  const [esFicha, setEsFicha] = useState<boolean | null>(null);

  useEffect(() => {
    setEsFicha(/^\/producto\/[^/]+\/?$/.test(location.pathname));
  }, []);

  // Antes de saberlo no se dibuja nada: pintar el cartel de «no existe» y cambiarlo un
  // instante después por un producto es peor que esperar un tick.
  if (esFicha === null) return null;
  if (!esFicha) return null;

  return <FichaEnVivo inicial={null} info={info} />;
}
