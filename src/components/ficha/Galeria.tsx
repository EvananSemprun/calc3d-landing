// Galería de la ficha: foto principal + miniaturas. Las fotos las decide
// `fotosDeOpcion` según el color elegido; acá solo se pintan y se elige la activa.
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
        <img className="pdp-main" src={principal.url} alt={principal.alt || nombre} />
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
              <img src={f.url} alt={f.alt || ''} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
