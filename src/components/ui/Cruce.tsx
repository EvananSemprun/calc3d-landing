// El cruce del refresco en vivo: cuando un dato cambia bajo los pies del visitante, el
// nuevo entra fundido en vez de aparecer de golpe.
import { useState, type ReactNode } from 'react';

/**
 * Las props que marcan un elemento como «este dato acaba de cambiar».
 *
 * Es un `data-*` y no una clase a propósito: la clase la pone el diseño (`.price`,
 * `.price-alt`, las de shadcn en una insignia) y pisarla o concatenarla obligaría a cada
 * llamador a acordarse de combinarlas.
 */
export interface PropsDeCruce {
  'data-cruce'?: '1' | '2';
}

/**
 * ¿No hay dato? `null`, `undefined` o el texto vacío.
 *
 * ⚠️ **El `0` NO está ausente** (`0 == null` es `false`), y es a propósito: un precio de
 * cero es un dato, y un «de $12 a $0» es justo el cambio que hay que mostrar.
 */
const ausente = (v: unknown) => v == null || v === '';

/**
 * Marca un elemento que YA EXISTE para que cruce cuando `valor` cambie de un render al
 * siguiente. Devuelve props para esparcir: **cero nodos nuevos**.
 *
 * Es la forma que se usa en la mayoría de los casos (`.price-alt`, el precio tachado, las
 * insignias, el precio de la ficha): todos ya son elementos propios y envolverlos
 * agregaría una caja al medio sin ninguna necesidad —y una caja más es una caja que
 * puede mover la geometría—. Para un nodo de texto suelto, sin elemento propio, está
 * `<Cruce>`.
 *
 * ⚠️ **En el primer render no cruza, y ésa es la mitad del trabajo.** Lo horneado ya
 * viene pintado en el HTML del build: fundirlo al montar haría parpadear la pantalla
 * entera en cada carga sin que nada hubiera cambiado. Y el refresco contesta lo mismo
 * casi siempre (el dueño no corrige un precio cada vez que alguien abre la tienda), así
 * que el caso normal también es «no pasa nada».
 *
 * ⚠️ **`valor` es el DATO que llega de la API, no necesariamente el texto que se pinta.**
 * En la ficha, el número grande es el total del pedido y se mueve cada vez que el
 * visitante toca `+`: cruzarlo ahí convertiría un contador en un parpadeo. Lo que cruza
 * es lo que cambió **sin que el visitante lo pidiera**, así que el llamador pasa el dato
 * del catálogo (`p.price`) y no el total.
 *
 * ⚠️ **Por qué la marca ALTERNA entre `1` y `2`.** El cruce es una animación de CSS, y
 * una animación no se reinicia si su `animation-name` no cambia: con una sola marca, un
 * segundo cambio quedaría sin cruce. Hoy casi no podría pasar —`useEnVivo` pide una sola
 * vez y no reintenta— pero el defecto sería invisible para el próximo que use esto.
 *
 * ⚠️ **Compara con `Object.is`, o sea por IDENTIDAD si el valor es un objeto.** Para un
 * precio, un texto o un `null` es lo que se quiere. Si algún día hace falta cruzar un
 * objeto, el llamador pasa el campo que de verdad cambió, no el objeto: una respuesta
 * nueva de la API es siempre una referencia nueva, aunque diga exactamente lo mismo.
 *
 * ⚠️ **Un dato que APARECE o que SE VA no cruza: eso es un cambio de ALTO, y va seco.**
 * El cruce es para el texto que cambia de valor sin mover nada. Lo que entra o sale mueve
 * la página y lo que comunica es justamente que entró o salió, así que fundirlo pelea con
 * la reserva de espacio. **Y no es teórico en dos de los tres blancos de hoy**: la
 * insignia del dueño de la ficha vive en `.pdp-badges`, que es un flex EN FLUJO justo
 * encima del `<h1>` (una insignia que aparece empuja la ficha entera hacia abajo), y
 * `.price-alt` es `display: block`, así que aparecer le cambia el alto a
 * `.product-foot`. En las tarjetas, en cambio, `.product-badges` es `position: absolute`
 * y no mueve nada — pero la regla no puede depender de cuál de los blancos sea.
 * Después de aparecer, el cambio SIGUIENTE sí cruza: ahí ya no se mueve nada.
 */
export function useCruce(valor: unknown): PropsDeCruce {
  // El patrón de React para derivar algo de un cambio de prop: se compara durante el
  // render y se ajusta el estado ahí mismo. React descarta este render y vuelve a
  // ejecutar el componente ANTES de pintar, así que la marca y el valor nuevo llegan al
  // DOM en la misma pasada: nunca se ve el dato nuevo sin su cruce. (Mutar un `useRef`
  // durante el render sería más corto, pero el render dejaría de ser puro y en
  // `StrictMode` la cuenta se duplicaría.)
  const [anterior, setAnterior] = useState(valor);
  const [turno, setTurno] = useState<0 | 1 | 2>(0);
  if (!Object.is(anterior, valor)) {
    setAnterior(valor);
    // Apareció o se fue: cambio de alto, va seco (y se BORRA la marca, así el siguiente
    // cambio estrena turno sin arrastrar el anterior).
    if (ausente(anterior) || ausente(valor)) setTurno(0);
    else setTurno((t) => (t === 1 ? 2 : 1));
  }
  return turno === 0 ? {} : { 'data-cruce': turno === 1 ? '1' : '2' };
}

/**
 * Envuelve un nodo de texto SUELTO para que cruce cuando `valor` cambie.
 *
 * ⚠️ **Solo para texto que no tiene elemento propio**, y hay uno real: el precio de las
 * dos tarjetas es un nodo de texto dentro de `<span class="price">`, junto al «desde», al
 * «BCV» y al equivalente. Para todo lo demás va `useCruce`, que no agrega nada.
 *
 * ⚠️ **El `<span>` va PELADO —sin clase ni estilo— y eso es lo que lo hace inofensivo.**
 * Un `<span>` en línea alrededor de texto en línea no cambia la geometría (medido en el
 * navegador a 390 y 1280: `.price` y `.product-foot` al píxel). Uno alrededor de un hijo
 * `display: block`, o de un hijo de un contenedor flex o grid, **sí** la cambia: ahí
 * aparece una caja o un ítem de más. Por eso esto no se usa sobre `.price-alt` (que es
 * `display: block`) ni sobre una insignia (ítem de un flex).
 */
export default function Cruce({ valor, children }: { valor: unknown; children: ReactNode }) {
  const cruce = useCruce(valor);
  return <span {...cruce}>{children}</span>;
}
