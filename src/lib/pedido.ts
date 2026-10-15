// Lógica pura del envío del pedido: el payload que viaja a la API, el total, el
// mensaje de WhatsApp y la validación del contacto. Sin DOM.
//
// ⚠️ El PRECIO no viaja al servidor: solo slug/qty/opciones (+ personalización). El
// total lo calcula la API leyendo la ficha; lo que muestra la tienda es informativo.
// Los precios de display salen del propio renglón (nombre/tramos denormalizados al
// agregar), así el cajón no necesita re-traer el catálogo.
import type { ItemCarrito } from './carrito';
import type { InfoApi } from './api';
import { equivalenteEnMoneda, precioConTramos } from './precio';

/** Un renglón tal como se manda a `/public/store/orders`. SIN precio. */
export interface LineaPedido {
  slug: string;
  qty: number;
  options: Record<string, string>;
  customNote?: string;
  customImageKey?: string;
}

export interface Contacto {
  name: string;
  phone: string;
  note?: string;
}

/** Convierte los renglones del carrito al payload del pedido. El precio NO va. */
export function itemsParaPedido(items: ItemCarrito[]): LineaPedido[] {
  return items.map((i) => {
    const linea: LineaPedido = { slug: i.id, qty: i.qty, options: i.opts ?? {} };
    if (i.customNote) linea.customNote = i.customNote;
    if (i.customImageKey) linea.customImageKey = i.customImageKey;
    return linea;
  });
}

/** Valida en el navegador lo mismo que exige el contrato, para no gastar un viaje
 *  (ni una de las 5 solicitudes por minuto) en un nombre vacío. null = ok. */
export function validarContacto(d: { name: string; phone: string }): string | null {
  if (!d.name || d.name.trim().length < 2) return 'Escribí tu nombre.';
  if ((d.phone.match(/\d/g) ?? []).length < 7) return 'Escribí un WhatsApp válido.';
  return null;
}

/** "Color: Rojo · Tamaño: Grande" */
export function describirOpciones(opts: Record<string, string> | undefined): string {
  return Object.entries(opts ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
}

/** Precio unitario del renglón: su `unit` (base + opciones, congelado al agregar)
 *  con el tramo por su cantidad ACTUAL. Los tramos van denormalizados en el renglón. */
export function precioRenglon(i: ItemCarrito): number {
  return precioConTramos(i.unit, i.qty, i.priceTiers ?? []);
}

/** Total del pedido en USD. */
export function totalPedido(items: ItemCarrito[]): number {
  return items.reduce((s, i) => s + precioRenglon(i) * i.qty, 0);
}

/** Mensaje de WhatsApp con el detalle del pedido, el total y el equivalente a la tasa. */
export function mensajePedido({
  items,
  info,
  nombre,
}: {
  items: ItemCarrito[];
  info: Pick<InfoApi, 'businessName' | 'rate'>;
  nombre?: string;
}): string {
  const lineas = items.map((i) => {
    const detalle = describirOpciones(i.opts);
    const nom = i.nombre ?? 'Producto';
    return `• ${i.qty} × ${nom}${detalle ? ` (${detalle})` : ''} — $${precioRenglon(i).toFixed(2)} c/u`;
  });
  const total = totalPedido(items);
  const quien = nombre ? `soy ${nombre} y ` : '';
  let msg = `Hola ${info.businessName}, ${quien}quiero hacer este pedido:\n\n${lineas.join('\n')}\n\nTotal: $${total.toFixed(2)} USD`;
  const alt = equivalenteEnMoneda(total, info.rate);
  if (alt) msg += `\n(≈ ${alt} ${info.rate?.currencyCode} a la tasa de hoy)`;
  return msg;
}

/** Mensaje de WhatsApp para una consulta de pieza a medida. */
export function mensajeConsulta(
  info: Pick<InfoApi, 'businessName'>,
  nombre: string,
  descripcion: string,
): string {
  return `Hola ${info.businessName}, soy ${nombre}. ${descripcion}`;
}
