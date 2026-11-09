// Galería de la ficha: foto principal + miniaturas. Las fotos las decide
// `fotosDeOpcion` según el color elegido; acá solo se pintan y se elige la activa.
//
// ⚠️ **La foto principal va con `prioridad`, o sea SIN fundido, y eso NO se toca.**
// Medido el 2026-11-09: `.pdp-main` ES el elemento del LCP de la ficha, y tarda 11,4 s
// con la red frenada en escritorio (4,1 s en móvil), con una corrida pasando los 60 s.
// Una imagen en `opacity: 0` no es candidata a LCP para el navegador, así que fundirla
// le sumaría la duración del cruce a un LCP que ya es malo. Las miniaturas sí se funden:
// son chicas, están debajo y ninguna es candidata.
import Foto from '@/components/ui/Foto';
import { useCruce } from '@/components/ui/Cruce';
import type { FotoApi } from '@/lib/producto';

interface Props {
  fotos: FotoApi[];
  activa: number;
  onElegir: (i: number) => void;
  nombre: string;
}

export default function Galeria({ fotos, activa, onElegir, nombre }: Props) {
  const principal = fotos[activa];

  // ⚠️ **El cruce al cambiar de foto es `useCruce`, NO el fundido de `data-fundir`**, y la
  // diferencia es justo lo de arriba: el fundido deja el elemento en `opacity: 0` en
  // reposo mientras carga, y `.pdp-main` va con `prioridad` para no estar nunca escondida.
  // El cruce reposa en opacidad 1 y el 0 vive solo dentro del keyframe, así que no le toca
  // el LCP. Son dos disparadores distintos y solo uno es gratis: cruzar al CAMBIAR de foto
  // no cuesta nada (el LCP ya ocurrió); fundir su CARGA INICIAL cuesta el LCP de la ficha.
  //
  // ⚠️ **Cruza al cambiar el `src`, sin esperar el `load` de la foto nueva, y eso está
  // medido.** La alternativa era disparar el cruce cuando la foto nueva termina de
  // cargar, que además obligaría a un techo por tiempo (como el `TECHO_CARGA_MS` de las
  // fotos) para que una foto que nunca llega no deje el cruce colgado. No hace falta: la
  // miniatura y la principal **son la misma URL** —las dos salen de este mismo arreglo
  // `fotos`, y `<Foto>` pinta un `<img src>` pelado, sin `srcset`— y las miniaturas van
  // sin `loading="lazy"`, así que cuando el visitante toca una, el navegador ya descargó
  // ese archivo y lo tiene en caché. Y en el único caso en que la URL nueva puede no estar
  // (cambiar el color, que trae otras fotos), `.pdp-main` tiene fondo y `aspect-ratio`:
  // se funde su hueco, no salta nada, y el precio de esperar sería un mecanismo con
  // temporizador para un caso que hoy no existe en producción (medido el 2026-11-09: de
  // los 13 productos, ninguno tiene más de una foto ni fotos por opción).
  //
  // `useCruce` no marca cuando falta el dato de alguno de los dos lados, así que pasar de
  // «sin foto» a «con foto» entra seco: eso es un cambio de alto, no de valor.
  const cruce = useCruce(principal?.url);

  return (
    <div className="pdp-gallery">
      {principal ? (
        <Foto
          className="pdp-main"
          src={principal.url}
          alt={principal.alt || nombre}
          prioridad
          {...cruce}
        />
      ) : (
        <div className="ph pdp-main" data-label="sin foto" />
      )}
      {fotos.length > 1 && (
        <div className="pdp-thumbs">
          {fotos.map((f, i) => (
            <button
              key={`${f.url}-${i}`}
              type="button"
              className={`pdp-thumb${i === activa ? ' on' : ''}`}
              aria-label={`Ver foto ${i + 1}`}
              aria-pressed={i === activa}
              onClick={() => onElegir(i)}
            >
              {/* Sin `loading="lazy"`: están arriba del pliegue, al lado de la foto
                  grande, así que diferirlas retrasa la descarga sin ganar nada. */}
              <Foto src={f.url} alt={f.alt || ''} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
