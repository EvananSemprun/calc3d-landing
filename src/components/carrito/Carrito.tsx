// Cajón del carrito → WhatsApp. Isla global (montada en Base), presente en todas las
// páginas. Abre cuando se hace clic en cualquier `[data-bl="cart-open"]` (el botón del
// header), y mantiene la insignia `[data-bl="cart-count"]` al día.
//
// ⚠️ **EL PEDIDO YA NO SE REGISTRA EN LA BANDEJA** (2026-11-11, decisión del dueño).
// Antes este cajón pedía nombre y WhatsApp, hacía `POST /public/store/orders` y recién
// entonces ofrecía el botón. Ahora va DIRECTO a WhatsApp: sin formulario y sin escribir
// nada en el servidor. Lo que se gana es el paso que se saca en el momento exacto de la
// compra, que es donde se pierden las ventas. Lo que se pierde va dicho acá, para que no
// lo descubra alguien dentro de seis meses:
//  - un pedido que no se termina de mandar por WhatsApp **no deja ningún rastro**;
//  - el pedido ya no nace con `originChannel: STORE`, así que la atribución por campaña
//    hay que ponerla a mano al crearlo en el panel;
//  - el total del mensaje lo calcula ESTA pantalla y el servidor ya no lo recalcula, así
//    que una regla de precio que falte acá se le manda al cliente **por escrito**.
//
// `lib/api-escritura.ts` y los helpers del pedido (`itemsParaPedido`, `validarContacto`)
// se dejan en el repo A PROPÓSITO: el endpoint sigue vivo y la bandeja sigue en el panel,
// así que volver atrás es un import. No son código muerto por descuido.
//
// Reglas que NO hay que romper:
//  1. **El carrito NO se vacía solo.** Sin copia en el servidor, vaciarlo sobre un mensaje
//     que capaz no se envió es perder el pedido entero. Se vacía quitando renglones.
//  2. Sin el WhatsApp del negocio no hay enlace: **se dice**, no se esconde el botón. Y
//     mientras la info viaja se dice que está en camino, que no es lo mismo que faltar.
import { useEffect, useState } from 'react';
import Foto from '@/components/ui/Foto';
import {
  contar,
  fijarCantidad,
  leer,
  quitar,
  claveDeItem,
  EVENTO_ABRIR_CARRITO,
  type ItemCarrito,
} from '@/lib/carrito';
import { fetchInfo, type InfoApi } from '@/lib/api';
import { describirOpciones, mensajePedido, precioRenglon, totalPedido } from '@/lib/pedido';
import { equivalenteEnMoneda, totalRenglon } from '@/lib/precio';
import { urlWhatsapp } from '@/lib/telefono';

const claveDe = (i: ItemCarrito) => claveDeItem(i.id, i.opts, i.customNote, i.customImageKey);

// Último número pintado; null = aún no se pintó nada (la primera carga no festeja).
let ultimoConteo: number | null = null;

function sincronizarInsignia() {
  const n = contar();
  const sube = ultimoConteo !== null && n > ultimoConteo;
  ultimoConteo = n;
  document.querySelectorAll<HTMLElement>('[data-bl="cart-count"]').forEach((el) => {
    el.textContent = String(n);
    el.hidden = n === 0;
    // Se toca la clase SOLO si el número sube: un evento que no sube no corta el pulso.
    if (sube) {
      // La clase se saca al terminar la animación: dejarla puesta es estado colgado (y
      // deja a los `@keyframes` como la fuente de verdad de si está pulsando o no). El
      // listener se engancha UNA vez por elemento, no una por pulso, para no apilar
      // listeners pendientes en la insignia.
      if (!el.dataset.blPulsoLimpio) {
        el.dataset.blPulsoLimpio = '1';
        // Se filtra por nombre: sin eso, CUALQUIER animación que termine en la insignia
        // le saca la clase a mitad del pulso. Hoy no hay otra, pero la habrá.
        el.addEventListener('animationend', (e) => {
          if (e.animationName === 'cart-pulso') el.classList.remove('cart-count--pulso');
        });
      }
      el.classList.remove('cart-count--pulso');
      void el.offsetWidth; // reinicia la animación si se agrega seguido
      el.classList.add('cart-count--pulso');
    }
  });
}

export default function Carrito() {
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [info, setInfo] = useState<InfoApi | null>(null);
  // Distingue "la info todavía viaja" de "la info llegó y no trae WhatsApp". Sin esto,
  // el primer render tras abrir el cajón diría que falta el teléfono del negocio.
  const [infoListo, setInfoListo] = useState(false);

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
    // Segunda puerta al cajon, para quien no tiene un `[data-bl="cart-open"]` a mano:
    // el aviso flotante de "agregado" vive en un portal, fuera del arbol de la ficha.
    window.addEventListener(EVENTO_ABRIR_CARRITO, abrir);
    document.addEventListener('click', onClickDoc);
    document.addEventListener('keydown', onKey);
    // ⚠️ La insignia es HTML ESTÁTICO del Header (`[data-bl="cart-count"]`), no parte de
    // esta isla. Con transiciones de vista el <body> se reemplaza y ese <span> vuelve a
    // llegar oculto y en cero: el pedido sigue intacto en localStorage, pero la pantalla
    // miente y el cliente cree que perdió lo que eligió. Se repinta en cada navegación.
    document.addEventListener('astro:page-load', sincronizarInsignia);
    return () => {
      window.removeEventListener('cart:change', onChange);
      window.removeEventListener(EVENTO_ABRIR_CARRITO, abrir);
      document.removeEventListener('click', onClickDoc);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('astro:page-load', sincronizarInsignia);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrir = () => {
    refrescar();
    setAbierto(true);
    // La info (teléfono, tasa, nombre) arma el mensaje de WhatsApp: se trae perezosamente
    // al abrir. Si falló, se vuelve a intentar al reabrir — puede haber sido un corte.
    if (!info) {
      setInfoListo(false);
      fetchInfo()
        .then(setInfo)
        .catch(() => setInfo(null))
        .finally(() => setInfoListo(true));
    }
  };

  // ⚠️ Cerrar NO vacía el carrito: ver la regla 1 del encabezado.
  const cerrar = () => setAbierto(false);

  const bajar = (i: ItemCarrito) => {
    const min = i.minQty ?? 1;
    const nueva = i.qty - 1;
    if (nueva < min) quitar(claveDe(i));
    else fijarCantidad(claveDe(i), nueva);
  };
  const subir = (i: ItemCarrito) => fijarCantidad(claveDe(i), i.qty + 1);

  const total = totalPedido(items);
  // El nombre ya no se pide: en WhatsApp el cliente llega con el suyo y pedirlo acá era
  // un campo más entre el cliente y la compra.
  const urlWa =
    info?.whatsappPhone && items.length
      ? urlWhatsapp(info.whatsappPhone, mensajePedido({ items, info }))
      : null;

  const mostrarPie = items.length > 0;

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
              <p className="dim">Todavía no agregaste nada a tu pedido.</p>
              {/* Un carrito vacío sin salida es un callejón: el visitante cierra el
                  cajón y se queda donde estaba. */}
              <a className="cart-seguir" href="/tienda/">
                Seguir comprando
              </a>
            </div>
          ) : (
            items.map((i) => {
              const clave = claveDe(i);
              const detalle = describirOpciones(i.opts);
              return (
                <div className="cart-row" key={clave}>
                  {i.imagen ? (
                    <Foto className="cart-thumb" src={i.imagen.url} alt="" />
                  ) : (
                    <div className="ph cart-thumb" data-label="sin foto" />
                  )}
                  <div className="cart-row-body">
                    <div className="cart-row-name">{i.nombre ?? i.id}</div>
                    {detalle && <div className="dim cart-row-opts">{detalle}</div>}
                    {i.customNote && <div className="dim cart-row-opts">Nota: {i.customNote}</div>}
                    {/* El unitario YA trae el mayoreo y los recargos; el subtotal es
                        lo que ese renglón suma al total. Antes solo estaba el unitario,
                        así que con 10 unidades no había forma de ver cuánto pesaba. */}
                    <div className="cart-row-price">
                      <strong>${totalRenglon(precioRenglon(i), i.qty).toFixed(2)}</strong>
                      <span className="dim cart-row-unit"> · ${precioRenglon(i).toFixed(2)} c/u</span>
                    </div>
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
                ${total.toFixed(2)} BCV
                {equivalenteEnMoneda(total, info?.rate) && (
                  <span className="price-alt">
                    ≈ {equivalenteEnMoneda(total, info?.rate)} {info?.rate?.currencyCode}
                  </span>
                )}
              </span>
            </div>

            {urlWa ? (
              <a className="btn-wa" href={urlWa} target="_blank" rel="noopener noreferrer">
                Pedir por WhatsApp
              </a>
            ) : infoListo ? (
              <p className="dim cart-wa-falta">Falta el WhatsApp del negocio para armar el enlace.</p>
            ) : (
              <p className="dim cart-wa-falta">Preparando el enlace de WhatsApp…</p>
            )}

            <p className="dim cart-foot-nota">
              Se abre WhatsApp con tu pedido escrito. Ahí coordinamos el pago y la entrega.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
