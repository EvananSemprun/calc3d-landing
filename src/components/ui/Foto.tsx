// La `<img>` de toda foto remota de la tienda: la misma etiqueta de siempre, más un
// cruce corto cuando la foto llega.
import { useEffect, useRef } from 'react';
import { marcarCargando } from '@/lib/foto';
import type { PropsDeCruce } from '@/components/ui/Cruce';

/**
 * ⚠️ **`Props` extiende `PropsDeCruce` y NO reenvía props sueltas.** La galería de la
 * ficha marca su foto principal con `useCruce` para que cruce al elegir otra miniatura, y
 * para eso el `data-cruce` tiene que llegar al `<img>`. Se ensancha esta interfaz a mano,
 * explícitamente, en vez de abrirla con un `{...rest}`: con el `rest` cualquier atributo
 * pasaría sin que nadie lo decida, incluido un `className` que pisara el de arriba o un
 * `data-cargando` escrito a mano, que es justo la marca que este componente promete poner
 * SOLO desde el JS del cliente.
 */
interface Props extends PropsDeCruce {
  src: string;
  alt: string;
  /** Las clases de la foto (`product-photo`, `cat-card-foto`…). Llegan TAL CUAL al `<img>`. */
  className?: string;
  /**
   * Apaga el fundido. Es el interruptor de las **candidatas a LCP**: una imagen en
   * `opacity: 0` no es candidata a LCP para el navegador, así que fundir la foto grande
   * RETRASA el LCP, y eso es causa de reversión declarada en el plan.
   *
   * ⚠️ Lo lleva `.pdp-main` (medido: ES el LCP de la ficha, 11,4 s con red frenada en
   * escritorio), el hero y la primera fila de la grilla del listado. **No se le quita a
   * `.pdp-main`.**
   */
  prioridad?: boolean;
  loading?: 'lazy' | 'eager';
  width?: number;
  height?: number;
}

/**
 * Foto remota con fundido de entrada.
 *
 * ⚠️ **LA REGLA QUE SOSTIENE TODO ESTO: la marca de «no cargada» la pone ÚNICAMENTE el
 * JS del cliente, en un efecto, después de montar.** El render de este componente —el
 * que Astro ejecuta en el build y hornea en el HTML— sale sin marca, así que el HTML
 * servido a Google, a un navegador con el JS roto y a quien tenga una extensión que lo
 * bloquee trae las fotos **visibles**. El modo de falla de esta pieza es dejar fotos
 * invisibles en producción, y lo vigilan dos guardianes: `Foto.spec.tsx` (sobre
 * `renderToStaticMarkup`, que es lo que hornea Astro) y `src/dist-sin-js.spec.ts` (sobre
 * el `dist/` de verdad).
 *
 * ⚠️ **Por qué un efecto de React y NO un atributo en `<html>`.** El mecanismo obvio
 * —«si el JS está vivo, marco `<html>` y el CSS esconde las fotos»— **muere en la segunda
 * página**: `swapRootAttributes` de Astro hace `removeAttribute` de **todos** los
 * atributos de `<html>` en cada navegación del `<ClientRouter />` y repone solo los del
 * documento destino, que viene del build sin ninguna marca de JS. Un efecto, en cambio,
 * vive en la isla: Astro rehidrata las islas de la página nueva después del swap, así
 * que el efecto corre de nuevo en cada navegación. Verificado navegando con un clic (no
 * recargando).
 *
 * ⚠️ **El efecto no es «pintar el fundido»: es ponerle un TECHO.** Ver `lib/foto.ts`.
 */
export default function Foto({
  src,
  alt,
  className,
  prioridad = false,
  loading,
  width,
  height,
  'data-cruce': cruce,
}: Props) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (prioridad) return;
    const img = ref.current;
    if (!img) return;
    // Devolver `liberar` como limpieza del efecto es lo que garantiza que un desmontaje
    // a mitad de la descarga no deje la marca puesta en un nodo reutilizado.
    return marcarCargando(img);
    // `src` está en las dependencias porque la galería de la ficha cambia la foto al
    // elegir otro color: es otra descarga y le toca su propio fundido.
  }, [prioridad, src]);

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      width={width}
      height={height}
      // El cruce del dato que cambió (ver `ui/Cruce.tsx`). `undefined` no emite el
      // atributo, así que una foto que nadie marcó sale exactamente como antes.
      data-cruce={cruce}
      // `data-fundir` es lo que le da la TRANSICIÓN de opacidad (ver `global.css`); la
      // opacidad 0 la trae `data-cargando`, que solo pone el efecto. Sale en el HTML
      // horneado a propósito y es inofensivo: declarar una transición no esconde nada.
      {...(prioridad ? {} : { 'data-fundir': '' })}
    />
  );
}
