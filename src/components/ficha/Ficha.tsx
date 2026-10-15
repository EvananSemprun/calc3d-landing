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
import { Button } from '@/components/ui/button';
import { agregar as agregarAlCarrito } from '@/lib/carrito';
import { precioBaseConOpciones, seleccionInicial } from '@/lib/ficha';
import { fotosDeOpcion } from '@/lib/galeria';
import { equivalenteEnMoneda, precioConTramos } from '@/lib/precio';
import { pedirUrlDeFoto } from '@/lib/subir-foto';
import type { InfoApi } from '@/lib/api';
import type { ProductoVitrina } from '@/lib/producto';

interface Props {
  producto: ProductoVitrina;
  info: InfoApi;
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
  const precioUnit = precioConTramos(precioBase, cantidad, p.priceTiers);
  const equivalente = equivalenteEnMoneda(precioUnit, info.rate);

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

    agregarAlCarrito({ id: p.id, qty: cantidad, opts, unit: precioBase, ...extra });

    // Agregado: se limpia la personalización para el próximo renglón.
    setNota('');
    setFoto(null);
    setAgregado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAgregado(false), 1800);
  };

  const insignias = [
    p.badge && <Badge key="badge">{p.badge}</Badge>,
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

  const hechos = [
    p.catLabel || '',
    p.material || '',
    p.ship ? `Listo en ${p.ship}` : '',
    p.minQty > 1 ? `Mínimo ${p.minQty}` : '',
  ].filter(Boolean);

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

        <div className="pdp-price">
          ${precioUnit.toFixed(2)}
          <small> USD</small>
          {equivalente && (
            <span className="price-alt">
              ≈ {equivalente} {info.rate?.currencyCode}
            </span>
          )}
        </div>

        {p.priceTiers.length > 0 && (
          <table className="pdp-tiers">
            <tbody>
              {p.priceTiers.map((t) => (
                <tr key={t.minQty}>
                  <th scope="row">Desde {t.minQty} u</th>
                  <td>${precioConTramos(p.price, t.minQty, p.priceTiers).toFixed(2)} c/u</td>
                  <td className="dim">−{Math.round(t.discountPct * 100)}%</td>
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
