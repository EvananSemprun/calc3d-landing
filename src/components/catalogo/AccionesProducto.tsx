// Los botones del pie de una tarjeta: "Ver detalle" y "Agregar" (o "Elegir" si el
// producto exige una opción). Los comparten la tarjeta completa del paginado estático y
// la del modo filtrado: ordenar o filtrar NO le quita la compra directa al comprador.
import { useEffect, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { agregar } from '@/lib/carrito';
import type { TramoPrecio } from '@/lib/precio';
import { rutaFicha, type FotoApi } from '@/lib/producto';

const BOTON_FANTASMA =
  'h-10 px-[18px] border-[var(--card-line-strong)] bg-transparent text-foreground shadow-none hover:border-primary hover:bg-transparent hover:text-primary dark:border-[var(--card-line-strong)] dark:bg-transparent dark:hover:bg-transparent';
const BOTON_ACCION = 'h-10 px-4';

interface Props {
  id: string;
  nombre: string;
  precio: number;
  imagen: FotoApi | null;
  priceTiers: TramoPrecio[];
  minQty: number;
  requiresOptions: boolean;
}

export default function AccionesProducto({ id, nombre, precio, imagen, priceTiers, minQty, requiresOptions }: Props) {
  const [agregado, setAgregado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const ficha = rutaFicha(id);

  const agregarAlPedido = () => {
    // El unitario va SIN tramo de mayoreo (igual que la ficha): el carrito aplica el
    // tramo con la cantidad ACTUAL del renglón (`precioUnitarioItem`). Guardarlo ya
    // con descuento lo aplicaría dos veces. Respeta el mínimo de compra.
    agregar({ id, qty: minQty || 1, unit: precio, nombre, imagen, priceTiers, minQty });
    setAgregado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAgregado(false), 1600);
  };

  return (
    <>
      <div className="product-actions">
        <Button asChild variant="outline" className={BOTON_FANTASMA}>
          <a href={ficha}>Ver detalle</a>
        </Button>
        {requiresOptions ? (
          // Hay que elegir algo (color, tamaño): agregar a ciegas cotizaría el
          // precio base y sin la opción. Se lleva a la ficha.
          <Button asChild className={BOTON_ACCION}>
            <a href={ficha} aria-label={`Elegir opciones de ${nombre}`}>
              <Plus aria-hidden="true" /> Elegir
            </a>
          </Button>
        ) : (
          <Button type="button" className={BOTON_ACCION} onClick={agregarAlPedido} aria-label={`Agregar ${nombre} al pedido`}>
            {agregado ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
            {agregado ? 'Agregado' : 'Agregar'}
          </Button>
        )}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {agregado ? `${nombre} agregado al pedido` : ''}
      </span>
    </>
  );
}
