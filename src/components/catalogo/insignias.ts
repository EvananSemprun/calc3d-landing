/**
 * Las insignias de una tarjeta del catálogo, en UN solo lugar.
 *
 * ⚠️ Estaban duplicadas en `TarjetaProducto` y `TarjetaIndice` —y la ficha tenía una
 * TERCERA versión— así que la misma insignia se veía distinta según dónde cayera.
 *
 * ⚠️ **Son OPACAS, y esa es la regla** (2026-11-08). Las dos de color eran translúcidas
 * (`bg-primary/12` y un verde al 14 %) con el texto del mismo tono, así que heredaban lo
 * que hubiera detrás. Sobre la tarjeta oscura daban 8,99 y 7,05 y nadie notó nada; sobre
 * una FOTO CLARA caen a **1,27 y 1,51**, contra el mínimo AA de 4,5 para texto chico.
 * Apareció recién cuando se publicó un producto con foto de fondo beige: el defecto
 * estaba desde el día uno y dependía del contenido, no del código.
 *
 * Opacas dan **12,5** y **11,2** pase lo que pase detrás, porque la foto deja de
 * participar. La dorada usa los mismos tokens que el `Badge` por defecto, que es lo que
 * ya dibuja la ficha: así no se copia un valor que después pueda divergir.
 */

/** Tamaño y tipografía, común a las tres. */
export const INSIGNIA = 'px-[11px] py-[5px] text-[11.5px] font-semibold tracking-[.08em] uppercase';

/** La del dueño ("Nuevo", "Más vendido"). Oro lleno con texto navy, como en la ficha. */
export const INSIGNIA_DESTACADA = `${INSIGNIA} border-transparent bg-primary text-primary-foreground`;

/** Dato neutro ("Personalizable", "Servicio"). Ya era opaca. */
export const INSIGNIA_SUAVE = `${INSIGNIA} border-border bg-card text-muted-foreground`;

/** Oferta. Verde lleno con texto navy; el verde es el mismo de la marca para WhatsApp. */
export const INSIGNIA_OFERTA = `${INSIGNIA} border-transparent bg-[#25d366] text-[#000814]`;
