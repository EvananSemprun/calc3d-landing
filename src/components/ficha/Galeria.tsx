// Galería de la ficha: foto principal + miniaturas. Las fotos las decide
// `fotosDeOpcion` según el color elegido; acá solo se pintan y se elige la activa.
//
// ⚠️ **ÉSTE ES EL LUGAR CANÓNICO de por qué la foto principal se comporta así.** Lo que
// sigue estaba escrito cuatro veces —acá, en `Galeria.spec.tsx`, en `Foto.tsx` y más
// abajo en este mismo archivo— y cuatro copias son cuatro cosas que divergen: ya pasó,
// con el número del LCP, que terminó diciendo 11,4 s en tres lados y 11,9 s en dos.
// Los otros tres apuntan acá; si hay que cambiar algo, se cambia acá.
//
// **1. La foto principal va con `prioridad`, o sea SIN fundido, y eso NO se toca.**
// Medido el 2026-11-09: `.pdp-main` ES el elemento del LCP de la ficha, y tarda 11,4 s
// con la red frenada en escritorio (4,1 s en móvil), con una corrida pasando los 60 s.
// Una imagen en `opacity: 0` no es candidata a LCP para el navegador, así que fundirla
// le sumaría la duración del cruce a un LCP que ya es malo. Las miniaturas sí se funden:
// son chicas, están debajo y ninguna es candidata.
//
// **2. Al CAMBIAR de foto sí cruza, y con `useCruce`, no con el fundido de
// `data-fundir`.** Son dos disparadores distintos y solo uno es gratis: cruzar al cambiar
// de foto no cuesta nada (el LCP ya ocurrió); fundir su CARGA INICIAL cuesta el LCP. Por
// eso el mecanismo tiene que ser el que reposa en opacidad 1 —`useCruce`, con el 0 solo
// dentro del keyframe— y no el que deja el elemento escondido mientras carga.
//
// **3. Cruza al cambiar el `src`, sin esperar el `load` de la foto nueva.** La
// alternativa era disparar el cruce cuando la foto nueva termina de cargar, lo que además
// obligaría a un techo por tiempo (como el `TECHO_CARGA_MS` de `lib/foto.ts`) para que una
// foto que nunca llega no deje el cruce colgado. No hace falta: la miniatura y la
// principal **son la misma URL** —las dos salen del mismo arreglo `fotos`, y `<Foto>`
// pinta un `<img src>` pelado, sin `srcset`— y las miniaturas van sin `loading="lazy"`,
// así que cuando el visitante toca una, ese archivo ya está en la caché del navegador.
//
// ⚠️ Y en el único caso en que la URL nueva puede no estar en caché (cambiar el color,
// que trae otras fotos) **lo que se funde es la foto ANTERIOR, no un hueco**: cambiar el
// `src` de un `<img>` no lo vacía, el navegador sigue pintando el último cuadro hasta que
// decodifica el nuevo. Medido el 2026-11-09 apuntando el `src` a un servidor que acepta la
// conexión y nunca contesta: 1,5 s después el elemento seguía pintando la foto de antes,
// con `naturalWidth` en 0 y `currentSrc` vacío. O sea que el peor caso es un cruce que
// empieza mostrando la foto vieja, no una pantalla en blanco — y además hoy no existe en
// producción (medido el mismo día: de los 13 productos, ninguno tiene más de una foto ni
// fotos por opción).
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

  // El cruce al cambiar de foto; el porqué está entero en la cabecera del archivo.
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
