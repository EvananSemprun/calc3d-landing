// Cajón del carrito + checkout → WhatsApp. Isla global (montada en Base), presente en
// todas las páginas. Abre cuando se hace clic en cualquier `[data-bl="cart-open"]`
// (el botón del header), y mantiene la insignia `[data-bl="cart-count"]` al día.
//
// Reglas que NO hay que romper (del sitio viejo):
//  1. El precio NO se manda (ver api-escritura / itemsParaPedido). Lo calcula la API.
//  2. Nunca se pierde la venta: si el POST falla, se muestra el motivo real y se ofrece
//     IGUAL el botón de WhatsApp.
//  3. El carrito se vacía al CERRAR el cajón (tras enviar), no al enviar: así el mensaje
//     de WhatsApp sigue armado mientras el cliente lo va a tocar.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  contar,
  fijarCantidad,
  leer,
  quitar,
  vaciar,
  claveDeItem,
  type ItemCarrito,
} from '@/lib/carrito';
import { enviarPedido } from '@/lib/api-escritura';
import { fetchInfo, type InfoApi } from '@/lib/api';
import {
  describirOpciones,
  itemsParaPedido,
  mensajePedido,
  precioRenglon,
  totalPedido,
  validarContacto,
} from '@/lib/pedido';
import { equivalenteEnMoneda } from '@/lib/precio';
import { urlWhatsapp } from '@/lib/telefono';

const claveDe = (i: ItemCarrito) => claveDeItem(i.id, i.opts, i.customNote, i.customImageKey);

function sincronizarInsignia() {
  const n = contar();
  document.querySelectorAll<HTMLElement>('[data-bl="cart-count"]').forEach((el) => {
    el.textContent = String(n);
    el.hidden = n === 0;
  });
}

export default function Carrito() {
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [info, setInfo] = useState<InfoApi | null>(null);
  const [datos, setDatos] = useState({ name: '', phone: '', note: '' });
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refrescar = () => setItems(leer());

  useEffect(() => {
    refrescar();
    sincronizarInsignia();
    const onChange = () => {
      refrescar();
      sincronizarInsignia();
    };
    const onClickDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-bl="cart-open"]')) {
        e.preventDefault();
        abrir();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    window.addEventListener('cart:change', onChange);
    document.addEventListener('click', onClickDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('cart:change', onChange);
      document.removeEventListener('click', onClickDoc);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrir = () => {
    refrescar();
    setAbierto(true);
    // La info (teléfono, tasa, nombre) se usa solo para el mensaje de WhatsApp: se
    // trae perezosamente al abrir. Si falla, el pedido igual se puede enviar.
    if (!info) fetchInfo().then(setInfo).catch(() => setInfo(null));
  };

  const cerrar = () => {
    setAbierto(false);
    // El pedido ya se envió: vaciar acá (no al enviar) deja el WhatsApp armado.
    if (hecho) {
      vaciar();
      setHecho(false);
      setError(null);
      setDatos({ name: '', phone: '', note: '' });
    }
  };

  const bajar = (i: ItemCarrito) => {
    const min = i.minQty ?? 1;
    const nueva = i.qty - 1;
    if (nueva < min) quitar(claveDe(i));
    else fijarCantidad(claveDe(i), nueva);
  };
  const subir = (i: ItemCarrito) => fijarCantidad(claveDe(i), i.qty + 1);

  const total = totalPedido(items);
  const urlWa =
    info?.whatsappPhone && items.length
      ? urlWhatsapp(info.whatsappPhone, mensajePedido({ items, info, nombre: datos.name || undefined }))
      : null;

  const enviar: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (enviando) return;
    const problema = validarContacto(datos);
    if (problema) return setError(problema);
    if (!items.length) return setError('Tu carrito está vacío.');

    setEnviando(true);
    setError(null);
    try {
      const customer = {
        name: datos.name.trim(),
        phone: datos.phone.trim(),
        ...(datos.note.trim() ? { note: datos.note.trim() } : {}),
      };
      await enviarPedido(customer, itemsParaPedido(items));
      setHecho(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar.';
      const conPunto = /[.!?]$/.test(msg.trim()) ? msg.trim() : `${msg.trim()}.`;
      setError(`${conPunto} Podés mandarlo igual por WhatsApp.`);
    } finally {
      setEnviando(false);
    }
  };

  const mostrarPie = items.length > 0 || hecho;

  return (
    <>
      <div
        className={`cart-overlay${abierto ? ' open' : ''}`}
        onClick={cerrar}
        aria-hidden="true"
      />
      <aside className={`cart-drawer${abierto ? ' open' : ''}`} aria-label="Carrito" aria-hidden={!abierto}>
        <div className="cart-head">
          <strong className="cart-title">Tu pedido</strong>
          <button className="cart-x" type="button" onClick={cerrar} aria-label="cerrar">
            ✕
          </button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <p className="dim">Tu carrito está vacío.</p>
            </div>
          ) : (
            items.map((i) => {
              const clave = claveDe(i);
              const detalle = describirOpciones(i.opts);
              return (
                <div className="cart-row" key={clave}>
                  {i.imagen ? (
                    <img className="cart-thumb" src={i.imagen.url} alt="" />
                  ) : (
                    <div className="ph cart-thumb" data-label="sin foto" />
                  )}
                  <div className="cart-row-body">
                    <div className="cart-row-name">{i.nombre ?? i.id}</div>
                    {detalle && <div className="dim cart-row-opts">{detalle}</div>}
                    {i.customNote && <div className="dim cart-row-opts">Nota: {i.customNote}</div>}
                    <div className="cart-row-price">${precioRenglon(i).toFixed(2)} USD</div>
                    <div className="qty cart-row-qty">
                      <button type="button" onClick={() => bajar(i)} aria-label="menos">
                        –
                      </button>
                      <span>{i.qty}</span>
                      <button type="button" onClick={() => subir(i)} aria-label="más">
                        +
                      </button>
                      <button className="cart-del" type="button" onClick={() => quitar(clave)}>
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {mostrarPie && (
          <div className="cart-foot">
            <div className="cart-total">
              <span className="dim">Total</span>
              <span className="cart-total-val">
                ${total.toFixed(2)} USD
                {equivalenteEnMoneda(total, info?.rate) && (
                  <span className="price-alt">
                    ≈ {equivalenteEnMoneda(total, info?.rate)} {info?.rate?.currencyCode}
                  </span>
                )}
              </span>
            </div>

            {!hecho ? (
              <form className="checkout" onSubmit={enviar} noValidate>
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
                  Algo que debamos saber <span className="dim">(opcional)</span>
                  <textarea
                    name="note"
                    rows={2}
                    maxLength={500}
                    value={datos.note}
                    onChange={(e) => setDatos({ ...datos, note: e.target.value })}
                  />
                </label>
                {error && <p className="checkout-error">{error}</p>}
                <Button type="submit" className="w-full" disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Enviar pedido'}
                </Button>
              </form>
            ) : (
              <div className="checkout-done">
                <strong>Recibimos tu pedido</strong>
                <p className="dim">
                  Ya está en nuestra bandeja. Confirmalo por WhatsApp y coordinamos pago y entrega.
                </p>
              </div>
            )}

            {(hecho || error) &&
              (urlWa ? (
                <a className="btn-wa" href={urlWa} target="_blank" rel="noopener noreferrer">
                  Pedir por WhatsApp
                </a>
              ) : (
                <p className="dim cart-wa-falta">Falta el WhatsApp del negocio para armar el enlace.</p>
              ))}

            <p className="dim cart-foot-nota">Coordinamos el pago y la entrega por WhatsApp.</p>
          </div>
        )}
      </aside>
    </>
  );
}
