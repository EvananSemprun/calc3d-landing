// Personalización (solo productos `custom`): una nota opcional y, si el almacenamiento
// está configurado (`storageReady`), una foto. Sin R2 el cargador no aparece y el
// pedido entra solo con la nota.
import { useEffect, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { CUSTOM_IMAGE_MIME_TYPES, motivoRechazoFoto } from '@/lib/subir-foto';

interface Props {
  storageReady: boolean;
  nota: string;
  onNota: (valor: string) => void;
  foto: File | null;
  onElegirFoto: (file: File | null) => void;
}

export default function Personalizacion({ storageReady, nota, onNota, foto, onElegirFoto }: Props) {
  const [previo, setPrevio] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // La URL de previsualización se crea y se REVOCA junto con el archivo elegido,
  // para no filtrar object URLs al cambiar o quitar la foto.
  useEffect(() => {
    if (!foto) {
      setPrevio(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setPrevio(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const alElegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const motivo = motivoRechazoFoto(file);
    if (motivo) {
      setError(motivo);
      onElegirFoto(null);
      return;
    }
    setError(null);
    onElegirFoto(file);
  };

  return (
    <div className="pdp-custom">
      <h4>
        Personalización <span className="dim">(opcional)</span>
      </h4>
      <textarea
        maxLength={500}
        rows={2}
        placeholder="Contanos qué querés (nombre, logo, color…)."
        value={nota}
        onChange={(e) => onNota(e.target.value)}
      />
      {storageReady && (
        <>
          <label className="pdp-custom-foto">
            <input
              type="file"
              accept={CUSTOM_IMAGE_MIME_TYPES.join(',')}
              hidden
              onChange={alElegir}
            />
            <span className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Agregar una foto
            </span>
          </label>
          {error && <p className="pdp-custom-error">{error}</p>}
          {foto && previo && (
            <div className="pdp-custom-preview">
              <span className="pdp-custom-chip">
                <img src={previo} alt="Tu foto" />
                {foto.name}
                <button type="button" onClick={() => onElegirFoto(null)}>
                  quitar
                </button>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
