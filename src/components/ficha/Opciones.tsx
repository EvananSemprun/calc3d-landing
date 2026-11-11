// Grupos de opciones de la ficha (Color, Tamaño…). Cada opción muestra su muestra
// de color y su recargo; al elegir, el precio y (si el grupo define la foto) la
// galería se recalculan en la isla padre.
import type { GrupoOpcionesApi } from '@/lib/producto';

interface Props {
  grupos: GrupoOpcionesApi[];
  elegido: Record<string, string | undefined>;
  onElegir: (grupo: string, valor: string) => void;
  /**
   * Las opciones que lo ya elegido deja prohibidas, por grupo (ver `lib/restricciones.ts`).
   * ⚠️ Se APAGAN, no se esconden: una opción que desaparece deja al visitante buscando el
   * tamaño que vio hace un segundo. Apagada con su motivo al lado se entiende.
   */
  bloqueadas?: { grupo: string; valores: string[]; motivo: string };
}

export default function Opciones({ grupos, elegido, onElegir, bloqueadas }: Props) {
  if (!grupos.length) return null;
  return (
    <>
      {grupos.map((g) => (
        <div className="pdp-opt-group" key={g.name}>
          <h4>
            {g.name}
            {!g.required && ' (opcional)'}
          </h4>
          <div className="pdp-opts" role="group" aria-label={g.name}>
            {g.options.map((o) => {
              const on = elegido[g.name] === o.value;
              const fuera = bloqueadas?.grupo === g.name && bloqueadas.valores.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`pdp-opt${on ? ' on' : ''}`}
                  aria-pressed={on}
                  disabled={fuera}
                  // El motivo viaja en el `title` además del texto de abajo: quien llega
                  // al botón con el teclado o el mouse lo tiene ahí mismo.
                  title={fuera ? bloqueadas?.motivo : undefined}
                  onClick={() => onElegir(g.name, o.value)}
                >
                  {o.swatchHex && <i style={{ background: o.swatchHex }} aria-hidden="true" />}
                  {o.value}
                  {o.priceDeltaUsd ? ` +$${o.priceDeltaUsd.toFixed(2)}` : ''}
                </button>
              );
            })}
          </div>
          {bloqueadas?.grupo === g.name && <p className="dim pdp-opt-nota">{bloqueadas.motivo}</p>}
        </div>
      ))}
    </>
  );
}
