// Fila deslizable con flechas, arrastre y teclado.
//
// Reemplaza a `.coleccion-fila`, que eran ~5,5 tarjetas de 200 px cortadas en seco a la
// derecha, con la barra de scroll gris del sistema a la vista y sin ninguna señal de que
// aquello se desplazaba. Ahora entran **4 tarjetas en escritorio, 2 en tablet y 1,3 en
// móvil** — el 0,3 no es un capricho: es lo que hace que se VEA que hay más a la derecha.
//
// ⚠️ **Sin librería de carrusel, a propósito.** Es `overflow-x` + `scroll-snap` + un
// puñado de líneas de JS; una dependencia nueva para esto no se justifica, y las de
// carrusel traen su propio motor de gestos que pelea con el scroll nativo del teléfono.
//
// ⚠️ **El deslizamiento táctil NO lo maneja este componente: lo hace el navegador.** El
// arrastre de abajo se engancha SOLO al puntero de tipo `mouse`. Interceptar el dedo es
// cómo estos componentes terminan sintiéndose peores que un scroll normal.
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  /** Qué es esta fila, para quien la recorre con un lector de pantalla. */
  etiqueta: string;
}

/** Cuánto hay que mover el mouse para que sea un arrastre y no un clic tembloroso. */
const UMBRAL_ARRASTRE = 5;

export default function Carrusel({ children, etiqueta }: Props) {
  const pista = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

  const arrastre = useRef<{ x: number; scroll: number } | null>(null);
  // Un arrastre termina en un `click` sobre la tarjeta que quedó bajo el cursor: sin esto,
  // deslizar la fila abre un producto que nadie quiso abrir.
  const arrastro = useRef(false);

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    // 1px de tolerancia: con zoom o anchos fraccionarios, `scrollLeft` no llega al entero
    // exacto y la flecha derecha se quedaría encendida para siempre al final.
    setPuedeIzq(el.scrollLeft > 1);
    setPuedeDer(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    // El ancho de la pista cambia con la ventana Y con el contenido (el refresco en vivo
    // puede traer más tarjetas): un `resize` de ventana solo no alcanza.
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    for (const hijo of Array.from(el.children)) ro.observe(hijo);
    return () => {
      el.removeEventListener('scroll', medir);
      ro.disconnect();
    };
  }, [medir, children]);

  /**
   * ⚠️ **El desplazamiento se anima A MANO en vez de con `behavior: 'smooth'`.** Medido
   * en Chrome el 2026-11-11: `scrollBy`/`scrollTo` con `smooth` sobre esta pista dejan
   * `scrollLeft` en **0** y, muestreando cada 80 ms durante un segundo, la animación
   * nunca arranca; con `'auto'` se mueve perfecto. Pasa igual con `scroll-snap: none`,
   * así que no es el snap.
   *
   * ⚠️ **Lo que NO está establecido es la causa, y conviene decirlo:** en ese mismo
   * navegador `requestAnimationFrame` entregó **un solo cuadro** para una animación de
   * 320 ms, o sea que los cuadros estaban famélicos (la trampa de la «pestaña que
   * miente» que documenta el CLAUDE.md, aunque `visibilityState` dijera «visible»). Eso
   * explicaría las dos cosas a la vez. El control positivo que se usó primero —el scroll
   * suave del DOCUMENTO, que sí funcionaba— **no alcanzaba**: el del documento y el de un
   * elemento no los mueve el mismo motor.
   *
   * Entonces, ¿por qué se queda esta versión? Porque **degrada bien en los dos mundos**:
   * con cuadros normales anima, y con cuadros famélicos termina de un salto **en el lugar
   * correcto**. `behavior: 'smooth'`, en cambio, en el entorno medido no movía NADA — y
   * los 8 tests del componente seguían en verde, porque jsdom no tiene scroll que animar.
   *
   * Durante la animación se apaga el `scroll-snap`: con `mandatory` el navegador pelea
   * cada cuadro contra el valor que escribimos. Al terminar se devuelve, y ahí el propio
   * navegador ajusta a la tarjeta más cercana — que es justo lo que se quiere.
   */
  const mover = (signo: 1 | -1) => {
    const el = pista.current;
    if (!el) return;
    // Casi una pantalla, no exactamente: deja una tarjeta de contexto entre página y
    // página, que es lo que evita perder el hilo al avanzar.
    const salto = signo * el.clientWidth * 0.9;
    const desde = el.scrollLeft;
    const hasta = Math.max(0, Math.min(desde + salto, el.scrollWidth - el.clientWidth));

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.scrollLeft = hasta;
      medir();
      return;
    }

    const snap = el.style.scrollSnapType;
    el.style.scrollSnapType = 'none';
    const inicio = performance.now();
    const DURACION = 320;
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / DURACION);
      // easeOutCubic: arranca rápido y frena, que es como se siente un empujón.
      const e = 1 - Math.pow(1 - t, 3);
      el.scrollLeft = desde + (hasta - desde) * e;
      if (t < 1) {
        requestAnimationFrame(paso);
      } else {
        el.style.scrollSnapType = snap;
        // ⚠️ **Se vuelve a medir A MANO al terminar, sin esperar el evento `scroll`.**
        // Ese evento se despacha alineado con los cuadros, así que en un navegador con
        // los cuadros famélicos llega tarde o coalescido: medido el 2026-11-11, la fila
        // quedaba movida y la flecha izquierda seguía APAGADA, o sea sin forma de volver.
        // El evento sigue enganchado para el scroll del dedo y de la rueda; esto cubre
        // el camino que disparamos nosotros, que es el único que podemos cerrar.
        medir();
      }
    };
    requestAnimationFrame(paso);
  };

  return (
    <div className="carrusel">
      <button
        type="button"
        className="carrusel-flecha carrusel-flecha--izq"
        aria-label={`Anterior de ${etiqueta}`}
        disabled={!puedeIzq}
        onClick={() => mover(-1)}
      >
        ‹
      </button>

      <div
        ref={pista}
        className="carrusel-pista"
        role="group"
        aria-label={etiqueta}
        onPointerDown={(e) => {
          // Solo el mouse: el dedo y el lápiz ya tienen el scroll nativo del navegador.
          if (e.pointerType !== 'mouse' || !pista.current) return;
          arrastre.current = { x: e.clientX, scroll: pista.current.scrollLeft };
          arrastro.current = false;
        }}
        onPointerMove={(e) => {
          const ini = arrastre.current;
          const el = pista.current;
          if (!ini || !el) return;
          const dx = e.clientX - ini.x;
          if (!arrastro.current && Math.abs(dx) < UMBRAL_ARRASTRE) return;
          arrastro.current = true;
          el.scrollLeft = ini.scroll - dx;
        }}
        onPointerUp={() => {
          arrastre.current = null;
        }}
        onPointerLeave={() => {
          arrastre.current = null;
        }}
        // En CAPTURA y en la pista: el clic lo recibe el enlace de la tarjeta, así que
        // frenarlo cuando burbujee llega tarde.
        onClickCapture={(e) => {
          if (!arrastro.current) return;
          e.preventDefault();
          e.stopPropagation();
          arrastro.current = false;
        }}
      >
        {children}
      </div>

      <button
        type="button"
        className="carrusel-flecha carrusel-flecha--der"
        aria-label={`Siguiente de ${etiqueta}`}
        disabled={!puedeDer}
        onClick={() => mover(1)}
      >
        ›
      </button>
    </div>
  );
}
