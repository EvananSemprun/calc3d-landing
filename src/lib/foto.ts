/**
 * La política de carga de una foto remota: marcarla mientras baja y, sobre todo,
 * DESMARCARLA siempre.
 *
 * La marca (`data-cargando`) es lo que el CSS usa para dejar la foto en opacidad 0 y
 * fundirla cuando llega. Quien la pone es `<Foto>` (`components/ui/Foto.tsx`), y solo
 * desde el navegador: el HTML que hornea Astro no la lleva nunca.
 *
 * ⚠️ **Todo el cuidado de este archivo está en la SALIDA, no en la entrada.** Dejar una
 * foto marcada es dejarla invisible, y es un fallo mudo: sin error en consola, con el
 * build en verde y los tipos compilando. Por eso hay tres caminos de salida y ninguno
 * depende de que la red se porte bien:
 *
 * 1. el `load` de la imagen (el caso normal);
 * 2. el `error` (la foto no bajó: que se vea su `alt` o el hueco, no un vacío);
 * 3. **el techo por tiempo**, que es el que cierra el agujero de verdad.
 *
 * ⚠️ **Por qué el techo no es opcional.** Con `prefers-reduced-motion` la guardia de
 * `global.css` baja la duración de la transición a `0.01ms`, pero **no cambia el valor
 * inicial**: una foto cuyo `load` nunca llega (red cortada a mitad de la descarga) se
 * quedaría transparente **para siempre**. El techo convierte «invisible» en «aparece de
 * golpe», que es el peor caso aceptable.
 *
 * ⚠️ **Y una foto en caché no se marca.** Su `load` ya pasó y no vuelve a disparar, así
 * que marcarla la dejaría escondida hasta el techo: 3 segundos de hueco por una foto que
 * ya estaba lista.
 */

/**
 * Lo máximo que una foto puede quedarse escondida esperando su `load`.
 *
 * 3 s es más que de sobra para la red de un cliente con datos móviles (medido con la red
 * frenada, las fotos del catálogo bajan en bastante menos) y a la vez es un tope que un
 * visitante tolera si la descarga se cortó: ve la foto aparecer de golpe en vez de no
 * verla nunca.
 */
export const TECHO_CARGA_MS = 3000;

/**
 * Marca la imagen como «todavía no cargada» y devuelve la función que la libera.
 *
 * @param img  La imagen a marcar. Si ya está completa, no se marca nada.
 * @param ahora  El reloj con el que se mide el techo. Se inyecta para poder probarlo;
 *   el temporizador se programa por el tiempo que FALTA hasta la fecha límite, no por
 *   el techo entero, así que un reloj que ya avanzó acorta la espera en vez de
 *   reiniciarla.
 * @returns La función que libera la marca. Es idempotente: llamarla de nuevo (o después
 *   de que el `load` o el techo ya la hayan liberado) no hace nada y no explota, porque
 *   quien la usa es el desmontaje de un efecto de React y ése corre pase lo que pase.
 */
export function marcarCargando(
  img: HTMLImageElement,
  ahora: () => number = () => Date.now(),
): () => void {
  // Foto en caché: su `load` ya pasó. Marcarla la esconde hasta el techo por nada.
  if (img.complete) return () => {};

  const limite = ahora() + TECHO_CARGA_MS;
  img.setAttribute('data-cargando', '');

  let liberado = false;
  const liberar = () => {
    if (liberado) return;
    liberado = true;
    clearTimeout(temporizador);
    img.removeEventListener('load', liberar);
    img.removeEventListener('error', liberar);
    img.removeAttribute('data-cargando');
  };

  img.addEventListener('load', liberar);
  img.addEventListener('error', liberar);
  const temporizador = setTimeout(liberar, Math.max(0, limite - ahora()));

  return liberar;
}
