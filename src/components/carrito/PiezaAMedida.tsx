// Modal de "Cotizar una pieza a medida". Isla global (montada en Base). Intercepta por
// DELEGACIÓN los clics en `[data-bl="cotizar"]` con preventDefault: si el JS falla, el
// enlace original a WhatsApp (que pone WhatsappCotizar) sigue funcionando. Manda la
// consulta a la bandeja y ofrece además el WhatsApp.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { enviarConsulta } from '@/lib/api-escritura';
import { fetchInfo, type InfoApi } from '@/lib/api';
import { mensajeConsulta, validarContacto } from '@/lib/pedido';
import { urlWhatsapp } from '@/lib/telefono';

export default function PiezaAMedida() {
  const [abierto, setAbierto] = useState(false);
  const [info, setInfo] = useState<InfoApi | null>(null);
  const [datos, setDatos] = useState({ name: '', phone: '', description: '' });
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onClickDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-bl="cotizar"]')) {
        e.preventDefault();
        setAbierto(true);
        if (!info) fetchInfo().then(setInfo).catch(() => setInfo(null));
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

  const cerrar = () => setAbierto(false);

  const urlWa =
    info?.whatsappPhone && hecho
      ? urlWhatsapp(info.whatsappPhone, mensajeConsulta(info, datos.name, datos.description))
      : null;

  const enviar: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (enviando) return;
    const problema =
      validarContacto(datos) ||
      (datos.description.trim().length < 10 ? 'Contanos un poco más de lo que necesitás.' : null);
    if (problema) return setError(problema);

    setEnviando(true);
    setError(null);
    try {
      await enviarConsulta({ name: datos.name.trim(), phone: datos.phone.trim() }, datos.description.trim());
      setHecho(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar.';
      const conPunto = /[.!?]$/.test(msg.trim()) ? msg.trim() : `${msg.trim()}.`;
      setError(`${conPunto} Podés escribirnos por WhatsApp.`);
    } finally {
      setEnviando(false);
    }
  };

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

        {!hecho ? (
          <form className="checkout" onSubmit={enviar} noValidate>
            <p className="dim custom-intro">Contanos qué necesitás y te pasamos un precio. Sin compromiso.</p>
            <label>
              Tu nombre
              <input
                name="name"
                autoComplete="name"
                maxLength={80}
                value={datos.name}
                onChange={(e) => setDatos({ ...datos, name: e.target.value })}
                required
              />
            </label>
            <label>
              Tu WhatsApp
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                placeholder="0412 1234567"
                value={datos.phone}
                onChange={(e) => setDatos({ ...datos, phone: e.target.value })}
                required
              />
            </label>
            <label>
              Qué necesitás
              <textarea
                name="description"
                rows={4}
                maxLength={2000}
                placeholder="Medidas, cantidad, color, para cuándo…"
                value={datos.description}
                onChange={(e) => setDatos({ ...datos, description: e.target.value })}
                required
              />
            </label>
            {error && <p className="checkout-error">{error}</p>}
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar consulta'}
            </Button>
          </form>
        ) : (
          <div className="checkout-done">
            <strong>Recibimos tu consulta</strong>
            <p className="dim">Te escribimos con el precio. Si querés adelantar, mandanos un WhatsApp.</p>
            {urlWa && (
              <a className="btn-wa" href={urlWa} target="_blank" rel="noopener noreferrer">
                Escribir por WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </>
  );
}
