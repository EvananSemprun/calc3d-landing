// El selector de cantidad: − , un campo EDITABLE, +.
//
// Hasta el 2026-11-11 el número entre los dos botones era un `<span>`: para pedir 24
// unidades había que tocar «+» veinticuatro veces. Ahora se escribe.
//
// ⚠️ **Existe UNA sola vez a propósito.** Lo usan la ficha y el carrito, y hasta hoy eran
// dos bloques de JSX escritos a mano con el mismo aspecto. Con dos copias, el día que una
// gane el teclado o la pulsación mantenida la otra se queda atrás y nadie se entera, que
// es exactamente lo que le pasó a las dos tarjetas del catálogo con la insignia «Nuevo».
import { useEffect, useRef, useState } from 'react';
import { MAX_CANTIDAD, acotarCantidad, avisoDeTope } from '@/lib/cantidad';

interface Props {
  valor: number;
  /** El mínimo que se puede pedir de este producto. Nunca baja de 1. */
  minimo?: number;
  /** El tope que se puede pedir por acá. Por defecto 999: más se coordina por WhatsApp. */
  maximo?: number;
  onCambiar: (n: number) => void;
  /** Para distinguirlos cuando hay varios en pantalla (un renglón por producto). */
  etiqueta?: string;
}

/** Cuánto se espera antes de repetir, y cada cuánto repite, al dejar apretado − o +. */
const ESPERA_MS = 400;
const REPITE_MS = 90;

export default function Cantidad({
  valor,
  minimo = 1,
  maximo = MAX_CANTIDAD,
  onCambiar,
  etiqueta = 'Cantidad',
}: Props) {
  const min = Math.max(1, minimo);
  const max = Math.max(min, maximo);
  // El aviso de tope es ESTADO visible (un `role=status`), no un `title`: un `title` no
  // lo ve nadie en un teléfono ni lo anuncia un lector de pantalla.
  const [pasado, setPasado] = useState(false);
  // Buffer de TEXTO, no de número: sin él no se puede borrar para escribir otra cifra —
  // el campo volvería a `min` en cuanto queda vacío y haría imposible tipear «24».
  const [texto, setTexto] = useState(String(valor));
  // ⚠️ **El valor vigente vive en una REF, no en el estado, y no es un capricho.** Al
  // dejar apretado − o +, los pasos salen de un temporizador que capturó el `texto` del
  // render en que arrancó: sin la ref, las diez repeticiones calculan todas desde el
  // MISMO número viejo y el contador se queda clavado en el segundo paso. Lo encontró el
  // test «dejar apretado + REPITE», que daba 2 donde esperaba 6.
  const actual = useRef(valor);
  const enfocado = useRef(false);
  const repetidor = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Un `click` posterior a un `pointerdown` ya se contó acá; el del teclado no.
  const vinoDePuntero = useRef(false);

  // Si el valor cambia DESDE AFUERA (el carrito se recarga, otra pestaña lo movió) el
  // campo lo refleja — salvo mientras se está escribiendo, o se pisaría al tipear.
  useEffect(() => {
    if (!enfocado.current) {
      setTexto(String(valor));
      actual.current = valor;
    }
  }, [valor]);

  // Un intervalo vivo después de desmontar sigue llamando a `onCambiar` sobre un
  // componente que ya no está.
  useEffect(() => () => frenar(), []);

  const frenar = () => {
    if (repetidor.current) clearTimeout(repetidor.current);
    repetidor.current = null;
  };

  const paso = (delta: number) => {
    const pedido = Math.trunc(actual.current) + delta;
    setPasado(pedido > max);
    const siguiente = acotarCantidad(pedido, min, max);
    actual.current = siguiente;
    setTexto(String(siguiente));
    onCambiar(siguiente);
  };

  /** Repetición mientras se mantiene apretado. El primer paso lo da el `click`. */
  const mantener = (delta: number) => {
    frenar();
    const tic = () => {
      paso(delta);
      repetidor.current = setTimeout(tic, REPITE_MS);
    };
    repetidor.current = setTimeout(tic, ESPERA_MS);
  };

  const escribir = (crudo: string) => {
    // Solo dígitos: un «-» o un «,» no son una cantidad, y dejarlos entrar obliga a
    // adivinar después qué quiso decir.
    const limpio = crudo.replace(/\D/g, '');
    setTexto(limpio);
    const n = Number(limpio);
    // ⚠️ El tope va ANTES de confirmar: `Number('1' + 60 ceros)` es 1e60 y de ahí salió
    // el «$7e+60» del pedido real. Se deja el máximo en el campo y se avisa.
    if (limpio !== '' && n > max) {
      setPasado(true);
      setTexto(String(max));
      actual.current = max;
      onCambiar(max);
      return;
    }
    setPasado(false);
    // Se confirma EN EL ACTO cuando ya es válido, para que el total, el tramo de mayoreo
    // y el carrito se muevan mientras escribe. Lo inválido espera al blur.
    if (limpio !== '' && n >= min) {
      actual.current = n;
      onCambiar(n);
    }
  };

  /** Vacío, 0 o por debajo del mínimo vuelven al mínimo: al salir, no al teclear. */
  const confirmar = () => {
    enfocado.current = false;
    const n = Number(texto);
    const bueno = texto !== '' && Number.isFinite(n) && n >= min ? acotarCantidad(n, min, max) : min;
    actual.current = bueno;
    setTexto(String(bueno));
    if (bueno !== valor) onCambiar(bueno);
  };

  const botonProps = (delta: number) => ({
    type: 'button' as const,
    onPointerDown: () => {
      vinoDePuntero.current = true;
      paso(delta);
      mantener(delta);
    },
    onPointerUp: frenar,
    onPointerLeave: frenar,
    onPointerCancel: frenar,
    // El teclado no emite `pointerdown`: sin esto, − y + no funcionarían con Enter.
    onClick: () => {
      if (vinoDePuntero.current) {
        vinoDePuntero.current = false;
        return;
      }
      paso(delta);
    },
  });

  return (
    <>
    <div className="qty">
      <button {...botonProps(-1)} aria-label="menos" disabled={valor <= min}>
        –
      </button>
      <input
        className="qty-input"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={etiqueta}
        value={texto}
        onFocus={(e) => {
          enfocado.current = true;
          e.currentTarget.select();
        }}
        onChange={(e) => escribir(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            paso(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            paso(-1);
          }
        }}
      />
      <button {...botonProps(1)} aria-label="más">
        +
      </button>
    </div>
    {pasado && (
      <p className="qty-aviso" role="status">
        {avisoDeTope(max)}
      </p>
    )}
    </>
  );
}
