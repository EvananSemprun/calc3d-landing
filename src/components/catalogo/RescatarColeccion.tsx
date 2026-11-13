import { useEffect, useState } from 'react';
import PaginaColeccion from './PaginaColeccion';
import type { TasaApi } from '@/lib/api';

/**
 * Rescata una colección SIN página propia, desde la 404 (creada después del último build).
 * Mismo mecanismo y mismas razones que `RescatarProducto`: va en la 404 y no en una regla
 * de reescritura, así que una página real nunca la ve. El estado HTTP sigue siendo 404.
 */
export default function RescatarColeccion({ tasa }: { tasa: TasaApi | null }) {
  const [esColeccion, setEsColeccion] = useState(false);
  useEffect(() => {
    setEsColeccion(/^\/coleccion\/[^/]+\/?$/.test(location.pathname));
  }, []);
  return esColeccion ? <PaginaColeccion inicial={null} tasa={tasa} /> : null;
}
