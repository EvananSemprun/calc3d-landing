// Ficha de producto (isla). Astro la renderiza en el build (su estado inicial queda
// en el HTML, para SEO) y la hidrata para lo interactivo: elegir opciones, cambiar la
// foto por color, ajustar la cantidad y agregar al pedido (con personalización).
//
// El unitario que se guarda en el carrito es base + recargos de opción, SIN el tramo
// por cantidad: el carrito aplica el tramo con la cantidad actual del renglón. Guardarlo
// ya con descuento lo aplicaría dos veces.
import { useMemo, useRef, useState } from 'react';
import Galeria from './Galeria';
import Opciones from './Opciones';
import Personalizacion from './Personalizacion';
import { Badge } from '@/components/ui/badge';
import { INSIGNIA_NUEVO } from '@/components/catalogo/insignias';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { abrirCarrito, agregar as agregarAlCarrito } from '@/lib/carrito';
import { hechosDeFicha, precioBaseConOpciones, seleccionInicial } from '@/lib/ficha';
import { fotosDeOpcion } from '@/lib/galeria';
import {
  descuentoDeTramo,
  equivalenteEnMoneda,
  precioConTramos,
  totalRenglon,
  tramoAplicable,
} from '@/lib/precio';
import { diasDeEntrega, textoDeEntregaElegida } from '@/lib/entrega';
import { textoDeMinimo } from '@/lib/producto';
import { pedirUrlDeFoto } from '@/lib/subir-foto';
import type { InfoApi } from '@/lib/api';
import type { ProductoVitrina } from '@/lib/producto';

interface Props {
  producto: ProductoVitrina;
  info: InfoApi;
}

/** "−17 %" al lado del tramo. Vacío si no se puede derivar: mejor no decir nada que
 *  mostrar un porcentaje inventado. */
function textoDeDescuento(precioLista: number, tramo: { minQty: number; discountPct?: number; unitPriceUsd?: number }) {
  const d = descuentoDeTramo(precioLista, tramo);
  return d == null || d <= 0 ? '' : `−${Math.round(d * 100)}%`;
}

export default function Ficha({ producto: p, info }: Props) {
  const [elegido, setElegido] = useState<Record<string, string | undefined>>(() =>
    seleccionInicial(p),
  );
  const [cantidad, setCantidad] = useState(p.minQty || 1);
  const [fotoActiva, setFotoActiva] = useState(0);
  const [nota, setNota] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [agregado, setAgregado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  const grupoFoto = useMemo(() => p.optionGroups.find((g) => g.drivesPhoto), [p.optionGroups]);
  const fotos = useMemo(() => fotosDeOpcion(p, elegido), [p, elegido]);
  const precioBase = precioBaseConOpciones(p, elegido);
  // Lo que aportan las opciones elegidas. Va APARTE porque un tramo por precio fijo
  // reemplaza al precio de lista y el recargo se cobra encima: sin esto, la ficha
  // mostraría menos de lo que el servidor cobra.
  const recargo = precioBase - p.price;
  const precioUnit = precioConTramos(precioBase, cantidad, p.priceTiers, recargo);
  const equivalente = equivalenteEnMoneda(precioUnit, info.rate);
  // Lo que va a pagar por lo que tiene elegido AHORA. El unitario de arriba ya se
  // mueve solo al cruzar un tramo, pero cambia lejos del contador y sin decir que
  // es por unidad: sin esta cuenta, subir la cantidad no muestra nada.
  const total = totalRenglon(precioUnit, cantidad);
  const equivalenteTotal = equivalenteEnMoneda(total, info.rate);

  const elegir = (grupo: string, valor: string) => {
    setElegido((prev) => ({ ...prev, [grupo]: valor }));
    // Si cambió el color del grupo que define la foto, se vuelve a la primera foto
    // para no quedar en una miniatura que la nueva opción no tiene.
    if (grupoFoto && grupoFoto.name === grupo) setFotoActiva(0);
  };

  const cambiarCantidad = (delta: number) => {
    setCantidad((n) => Math.max(p.minQty || 1, n + delta));
  };

  const agregar = async () => {
    if (subiendo) return;
    setError(null);
    let extra: { customNote?: string; customImageKey?: string } = {};
    try {
      if (foto) {
        setSubiendo(true);
        const customImageKey = await pedirUrlDeFoto(foto);
        extra = { customNote: nota.trim() || undefined, customImageKey };
      } else if (nota.trim()) {
        extra = { customNote: nota.trim() };
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.');
      setSubiendo(false);
      return;
    }
    setSubiendo(false);

    // Solo las opciones realmente elegidas (sin undefined) definen el renglón.
    const opts: Record<string, string> = {};
    for (const [k, v] of Object.entries(elegido)) if (v) opts[k] = v;

    agregarAlCarrito({
      id: p.id,
      qty: cantidad,
      opts,
      unit: precioBase,
      recargo,
      nombre: p.name,
      // La foto de la VARIANTE, no la del producto: el carrito mostraba el verde
      // aunque el visitante hubiera elegido el rojo. Misma función que la galería, para
      // que no haya dos reglas de qué foto corresponde.
      imagen: fotosDeOpcion(p, elegido)[0] ?? p.image,
      priceTiers: p.priceTiers,
      minQty: p.minQty,
      ...extra,
    });

    // Agregado: se limpia la personalización para el próximo renglón.
    setNota('');
    setFoto(null);
    setAgregado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAgregado(false), 1800);

    // El aviso es flotante (sonner) y lleva el camino al pedido. NO se abre el cajón
    // solo: el visitante que está armando un pedido de varias piezas tendría que
    // cerrarlo en cada una.
    toast.success('Agregado a tu pedido', {
      description: `${cantidad} × ${p.name}`,
      action: { label: 'Ver pedido', onClick: abrirCarrito },
    });
  };

  const insignias = [
    p.badge && <Badge key="badge">{p.badge}</Badge>,
    // La automatica va junto a la del dueno, con SU color: las dos pueden salir a la vez
    // y con el mismo tono no se distinguiria cual dice el y cual dice el sistema.
    p.nuevo && (
      <Badge key="nuevo" className={INSIGNIA_NUEVO}>
        Nuevo
      </Badge>
    ),
    p.custom && (
      <Badge key="custom" variant="secondary">
        Personalizable
      </Badge>
    ),
    p.kind === 'SERVICE' && (
      <Badge key="service" variant="secondary">
        Servicio
      </Badge>
    ),
  ].filter(Boolean);

  // El plazo SIGUE a lo elegido: una opción puede traer sus propios días. Por eso los
  // hechos se arman acá y no con `hechosDeFicha`, que es para el HTML horneado y no
  // sabe qué eligió el visitante.
  const dias = diasDeEntrega(p, elegido);
  const hechos = [p.catLabel || '', textoDeEntregaElegida(dias) ?? '', textoDeMinimo(p) ?? ''].filter(
    Boolean,
  );
  const tramo = tramoAplicable(cantidad, p.priceTiers);

  return (
    <div className="pdp">
      <Galeria fotos={fotos} activa={fotoActiva} onElegir={setFotoActiva} nombre={p.name} />

      <div className="pdp-info">
        {insignias.length > 0 && <div className="pdp-badges">{insignias}</div>}
        <h1 className="h2">{p.name}</h1>
        {hechos.length > 0 && (
          <div className="pdp-facts">
            {hechos.map((h, i) => (
              <span key={h}>
                {i > 0 && <span className="dim">·</span>} {h}
              </span>
            ))}
          </div>
        )}

        {/*
          El precio grande es el TOTAL de lo que se está por pedir: cantidad, recargos de
          las opciones y tramo de mayoreo, ya aplicados. Debajo, en chico, el unitario.
          Antes el grande era el unitario y el total aparecía recién al pasar de 1, así
          que el visitante no veía lo que iba a pagar hasta sumar.

          «$ BCV» y no «USD»: lo publicado está en dólares BCV, que no es el dólar del
          costeo (ver CLAUDE.md de la API, «el margen en USDT»).
        */}
        <div className="pdp-price">
          ${total.toFixed(2)}
          {/* «BCV» a secas: el signo ya esta en el numero, y «$1.50 $ BCV» se lee mal. */}
          <small> BCV</small>
          {equivalenteTotal && (
            <span className="price-alt">
              ≈ {equivalenteTotal} {info.rate?.currencyCode}
            </span>
          )}
        </div>
        <p className="pdp-unit dim">
          ${precioUnit.toFixed(2)} c/u
          {equivalente && (
            <span className="price-alt-inline">
              {' '}
              (≈ {equivalente} {info.rate?.currencyCode})
            </span>
          )}
          {tramo && <strong className="pdp-mayoreo"> · Precio por mayor aplicado</strong>}
        </p>

        {p.priceTiers.length > 0 && (
          <table className="pdp-tiers">
            <tbody>
              {p.priceTiers.map((t) => (
                <tr key={t.minQty}>
                  <th scope="row">Desde {t.minQty} u</th>
                  {/* Sobre el precio de LISTA (recargo 0): es el «desde N u, $X c/u»
                      del producto, no el de la combinación que el visitante tenga
                      elegida ahora. */}
                  <td>${precioConTramos(p.price, t.minQty, p.priceTiers, 0).toFixed(2)} c/u</td>
                  <td className="dim">{textoDeDescuento(p.price, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {p.desc && <p className="lead pdp-lead">{p.desc}</p>}

        <Opciones grupos={p.optionGroups} elegido={elegido} onElegir={elegir} />

        {p.custom && (
          <Personalizacion
            storageReady={info.storageReady}
            nota={nota}
            onNota={setNota}
            foto={foto}
            onElegirFoto={setFoto}
          />
        )}

        <div className="pdp-buy">
          <div className="qty">
            <button type="button" onClick={() => cambiarCantidad(-1)} aria-label="menos">
              –
            </button>
            <span>{cantidad}</span>
            <button type="button" onClick={() => cambiarCantidad(1)} aria-label="más">
              +
            </button>
          </div>
          <Button type="button" className="h-11 px-6" onClick={agregar} disabled={subiendo}>
            {subiendo ? 'Subiendo foto…' : agregado ? 'Agregado ✓' : 'Agregar al pedido'}
          </Button>
        </div>
        {cantidad > 1 && (
          <p className="pdp-total">
            {cantidad} × ${precioUnit.toFixed(2)} = <strong>${total.toFixed(2)}</strong> BCV
          </p>
        )}
        {error && (
          <p className="pdp-custom-error" role="alert">
            {error}
          </p>
        )}

        {p.description && <div className="pdp-desc">{p.description}</div>}

        {p.specs.length > 0 && (
          <div>
            <h3 className="h3 pdp-specs-title">Especificaciones</h3>
            <table className="pdp-specs">
              <tbody>
                {p.specs.map((e) => (
                  <tr key={e.label}>
                    <th scope="row">{e.label}</th>
                    <td>{e.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
