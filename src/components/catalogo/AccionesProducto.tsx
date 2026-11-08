// El pie de una tarjeta del catálogo: UN solo botón, que lleva a la ficha del producto.
//
// ⚠️ Hasta el 2026-11-08 eran DOS, "Ver detalle" y "Elegir"/"Agregar", y con un producto
// que exige alguna opción los dos eran el MISMO enlace a la ficha (`requiresOptions`
// mandaba a elegir allá, porque agregar a ciegas cotizaría el precio base y sin la
// opción). Dos botones pegados que hacen lo mismo obligan a leer los dos para descubrir
// que daba igual cuál tocar. En el catálogo real eso era el 100 % de los productos: todos
// tienen al menos un grupo obligatorio.
//
// ⚠️ El `+` se fue con el segundo botón, y no es cosmético: un "más" promete agregar al
// pedido, y esto navega. El texto dice lo que pasa.
//
// ⚠️ Lo que se PIERDE y fue decisión del dueño (2026-11-08): un producto SIN opciones
// obligatorias ya no se puede agregar al pedido desde la tarjeta; hay que entrar a la
// ficha. Hoy no existe ninguno. Si vuelve a hacer falta la compra directa desde la
// grilla, el camino es `agregar()` de `lib/carrito` y vive en la ficha
// (`AccionesFicha`), no acá.
import { Button } from '@/components/ui/button';
import { rutaFicha } from '@/lib/producto';

interface Props {
  id: string;
  nombre: string;
}

export default function AccionesProducto({ id, nombre }: Props) {
  return (
    <div className="product-actions">
      <Button asChild className="h-10 px-4">
        <a href={rutaFicha(id)} aria-label={`Ver ${nombre}`}>
          Elegir opciones
        </a>
      </Button>
    </div>
  );
}
