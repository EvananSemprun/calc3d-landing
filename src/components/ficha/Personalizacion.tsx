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
  /**
   * Cuando lo elegido pide nombres (ver `lib/restricciones.ts`), el campo deja de ser
   * «(opcional)» y pasa a pedirlos de verdad: son el dato con el que se fabrica la pieza.
   * `maximo` es el tope que se pagó; `null` = la opción no declara cuántos.
   */
  nombres?: { maximo: number | null; problema: string | null };
}

export default function Personalizacion({
  storageReady,
  nota,
  onNota,
  foto,
  onElegirFoto,
  nombres,
}: Props) {
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
        {nombres ? (
          <label htmlFor="pdp-nota">Escribe los nombres, uno por línea</label>
        ) : (
          <>
            Personalización <span className="dim">(opcional)</span>
          </>
        )}
      </h4>
      <textarea
        id="pdp-nota"
        maxLength={500}
        // Con nombres se muestran todos los renglones que se pagaron: un campo de 2 líneas
        // para 10 nombres obliga a escribir a ciegas dentro de una ventanita.
        rows={nombres ? Math.min(Math.max(nombres.maximo ?? 4, 3), 12) : 2}
        placeholder={
          nombres
            ? nombres.maximo
              ? `Uno por línea, hasta ${nombres.maximo}.`
              : 'Uno por línea.'
            : 'Cuéntanos qué quieres (nombre, logo, color…).'
        }
        aria-label={nombres ? 'Escribe los nombres, uno por línea' : undefined}
        aria-invalid={nombres?.problema ? true : undefined}
        value={nota}
        onChange={(e) => onNota(e.target.value)}
      />
      {/* El problema se dice SIEMPRE que exista, no solo al intentar agregar: enterarse de
          que sobra un nombre recién al apretar el botón es llegar tarde. */}
      {nombres?.problema && <p className="pdp-custom-error">{nombres.problema}</p>}
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
