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
import type { FotoApi } from '@/lib/producto';

interface Props {
  fotos: FotoApi[];
  activa: number;
  onElegir: (i: number) => void;
  nombre: string;
}

export default function Galeria({ fotos, activa, onElegir, nombre }: Props) {
  const principal = fotos[activa];
  return (
    <div className="pdp-gallery">
      {principal ? (
        <Foto className="pdp-main" src={principal.url} alt={principal.alt || nombre} prioridad />
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
              <Foto src={f.url} alt={f.alt || ''} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
