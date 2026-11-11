// Modal de "Cotizar una pieza a medida". Isla global (montada en Base). Intercepta por
// DELEGACIÓN los clics en `[data-bl="cotizar"]` con preventDefault: si el JS falla, el
// enlace original a WhatsApp (que pone WhatsappCotizar) sigue funcionando.
//
// ⚠️ **LA CONSULTA YA NO SE REGISTRA EN LA BANDEJA** (2026-11-11, decisión del dueño), por
// la misma razón que el carrito: el formulario pedía nombre y WhatsApp antes de dejar
// escribir, y WhatsApp ya trae las dos cosas. Acá se conserva **un** campo, el de qué
// necesita, porque sin él no hay mensaje que mandar. Igual que en el carrito: una consulta
// que no se termina de mandar no deja ningún rastro, y `enviarConsulta` se queda en el repo
// porque el endpoint y la bandeja siguen vivos.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { fetchInfo, type InfoApi } from '@/lib/api';
import { mensajeConsulta } from '@/lib/pedido';
import { urlWhatsapp } from '@/lib/telefono';

/** Debajo de esto no hay consulta que valga: un "hola" no se puede cotizar. */
const MINIMO_DESCRIPCION = 10;

export default function PiezaAMedida() {
  const [abierto, setAbierto] = useState(false);
  const [info, setInfo] = useState<InfoApi | null>(null);
  const [descripcionCruda, setDescripcion] = useState('');
  // "Todavía viaja" no es lo mismo que "llegó y no trae WhatsApp". Ver Carrito.tsx.
  const [infoListo, setInfoListo] = useState(false);

  useEffect(() => {
    const onClickDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-bl="cotizar"]')) {
        e.preventDefault();
        setAbierto(true);
        if (!info) {
          setInfoListo(false);
          fetchInfo()
            .then(setInfo)
            .catch(() => setInfo(null))
            .finally(() => setInfoListo(true));
        }
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('click', onClickDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClickDoc);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  // ⚠️ Cerrar NO borra lo escrito: si el cliente vuelve, su texto sigue ahí. Con la
  // consulta fuera de la bandeja, esto es lo único que la conserva.
  const cerrar = () => setAbierto(false);

  const descripcion = descripcionCruda.trim();
  const faltaTexto = descripcion.length < MINIMO_DESCRIPCION;
  const urlWa =
    info?.whatsappPhone && !faltaTexto
      ? urlWhatsapp(info.whatsappPhone, mensajeConsulta(info, descripcion))
      : null;

  if (!abierto) return null;

  return (
    <>
      <div className="cart-overlay open" onClick={cerrar} aria-hidden="true" />
      <div className="custom-modal" role="dialog" aria-modal="true" aria-labelledby="customTitle">
        <div className="cart-head">
          <strong id="customTitle" className="cart-title">
            Cotizar una pieza a medida
          </strong>
          <button className="cart-x" type="button" onClick={cerrar} aria-label="cerrar">
            ✕
          </button>
        </div>

        <div className="checkout">
          <p className="dim custom-intro">Cuéntanos qué necesitas y te pasamos un precio. Sin compromiso.</p>
          <label>
            Qué necesitas
            <textarea
              name="description"
              rows={4}
              maxLength={2000}
              placeholder="Medidas, cantidad, color, para cuándo…"
              value={descripcionCruda}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />
          </label>

          {urlWa ? (
            <a className="btn-wa" href={urlWa} target="_blank" rel="noopener noreferrer">
              Escribir por WhatsApp
            </a>
          ) : (
            <>
              {/* El botón apagado se queda A LA VISTA con el motivo al lado: esconderlo
                  deja al cliente escribiendo sin saber qué le falta para mandarlo. */}
              <Button type="button" className="w-full" disabled>
                Escribir por WhatsApp
              </Button>
              <p className="dim">
                {faltaTexto
                  ? 'Cuéntanos un poco más de lo que necesitas.'
                  : infoListo
                    ? 'Falta el WhatsApp del negocio para armar el enlace.'
                    : 'Preparando el enlace de WhatsApp…'}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
