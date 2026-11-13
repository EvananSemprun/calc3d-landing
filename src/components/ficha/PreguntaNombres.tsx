// «¿Los mismos nombres para todos?» — la pregunta que faltaba cuando un producto que pide
// nombres se pide en más de una unidad.
//
// El primer pedido real traía `3 × Árbol de Navidad con nombres (… Hasta 6 nombres …)` con
// UN solo nombre y no se entendía si eran para los 3 árboles ni si de verdad quería 3.
// Lo usan la ficha y el cajón del carrito: con dos copias, una se quedaría sin la pregunta.
import { useId } from 'react';

interface Props {
  cantidad: number;
  /** `undefined` = todavía no respondió. */
  valor: boolean | undefined;
  onCambiar: (mismos: boolean) => void;
  /** Lo que hace el botón de la respuesta «No» (bajar a una unidad para pedir de a uno). */
  onDejarEnUno?: () => void;
}

export default function PreguntaNombres({ cantidad, valor, onCambiar, onDejarEnUno }: Props) {
  const nombre = useId();
  return (
    <fieldset className="pdp-mismos">
      <legend>¿Los mismos nombres para las {cantidad} unidades?</legend>
      <label>
        <input
          type="radio"
          name={nombre}
          checked={valor === true}
          onChange={() => onCambiar(true)}
        />{' '}
        Sí
      </label>{' '}
      <label>
        <input
          type="radio"
          name={nombre}
          checked={valor === false}
          onChange={() => onCambiar(false)}
        />{' '}
        No
      </label>
      {valor === undefined && (
        <p className="dim" role="status">
          Elige una respuesta para poder continuar.
        </p>
      )}
      {valor === false && (
        <p className="dim" role="status">
          Entonces agrégalas una por una: deja la cantidad en 1, escribe sus nombres y agrega; luego
          repite con la siguiente.{' '}
          {onDejarEnUno && (
            <button type="button" className="cart-del" onClick={onDejarEnUno}>
              Dejar en 1
            </button>
          )}
        </p>
      )}
    </fieldset>
  );
}
