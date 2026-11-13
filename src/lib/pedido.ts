// Lógica pura del envío del pedido: el payload que viaja a la API, el total, el
// mensaje de WhatsApp y la validación del contacto. Sin DOM.
//
// ⚠️ El PRECIO no viaja al servidor: solo slug/qty/opciones (+ personalización). El
// total lo calcula la API leyendo la ficha; lo que muestra la tienda es informativo.
// Los precios de display salen del propio renglón (nombre/tramos denormalizados al
// agregar), así el cajón no necesita re-traer el catálogo.
import type { ItemCarrito } from './carrito';
import type { InfoApi } from './api';
import { MAX_CANTIDAD, avisoDeTope, cantidadValida } from './cantidad';
import { equivalenteEnMoneda, precioConTramos, totalRenglon } from './precio';

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
  if (!d.name || d.name.trim().length < 2) return 'Escribe tu nombre.';
  if ((d.phone.match(/\d/g) ?? []).length < 7) return 'Escribe un WhatsApp válido.';
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
  return precioConTramos(i.unit, i.qty, i.priceTiers ?? [], i.recargo ?? 0);
}

/** Total del pedido en USD: la suma de los renglones, cada uno redondeado a
 *  centavos por `totalRenglon` — la misma cuenta que la ficha muestra al elegir
 *  la cantidad, así lo que vio antes de agregar es lo que ve en el carrito. */
export function totalPedido(items: ItemCarrito[]): number {
  return items.reduce((s, i) => s + totalRenglon(precioRenglon(i), i.qty), 0);
}

const formatoDinero = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

/**
 * Un monto con 2 decimales y SIN notación científica. Todo monto que se escriba en un
 * mensaje o en pantalla pasa por acá: interpolar el número directo imprime «7e+60» en
 * cuanto es grande (así salió el pedido del 2026-11-12). Lo no finito no se formatea:
 * devuelve «—», que no se confunde con un precio.
 */
export function formatoMonto(n: number): string {
  return Number.isFinite(n) ? formatoDinero.format(n) : '—';
}

/** Un renglón que no se puede mandar, y por qué. */
export interface ProblemaPedido {
  /** Posición del renglón en el carrito, desde 1 (0 = el pedido entero). */
  renglon: number;
  texto: string;
}

/**
 * Qué renglones NO se pueden mandar por WhatsApp. Vacío = el pedido es enviable.
 *
 * ⚠️ Va ADEMÁS del tope del campo, no en lugar de él: el carrito viaja en localStorage y
 * se puede editar a mano, así que el campo no es la última línea de defensa. Chequea
 * cantidad entera dentro de rango, precio finito y que el total del pedido sea finito.
 */
export function problemasDelPedido(items: ItemCarrito[]): ProblemaPedido[] {
  const problemas: ProblemaPedido[] = [];
  items.forEach((i, idx) => {
    const renglon = idx + 1;
    const nom = i.nombre ?? 'Producto';
    const minimo = i.minQty ?? 1;
    if (!cantidadValida(i.qty, minimo)) {
      const motivo =
        typeof i.qty === 'number' && Number.isFinite(i.qty) && i.qty > MAX_CANTIDAD
          ? avisoDeTope()
          : `La cantidad tiene que ser un número entero entre ${Math.max(1, minimo)} y ${MAX_CANTIDAD}`;
      problemas.push({ renglon, texto: `Corrige la cantidad de «${nom}»: ${motivo}.` });
      return;
    }
    const unitario = precioRenglon(i);
    if (!Number.isFinite(unitario) || !Number.isFinite(totalRenglon(unitario, i.qty))) {
      problemas.push({ renglon, texto: `El precio de «${nom}» no es válido. Quítalo y agrégalo de nuevo.` });
    }
  });
  if (!problemas.length && !Number.isFinite(totalPedido(items))) {
    problemas.push({ renglon: 0, texto: 'El total del pedido no es válido. Revisa las cantidades.' });
  }
  return problemas;
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
  // ⚠️ **LA NOTA VA EN EL MENSAJE, y hasta el 2026-11-11 no iba a ninguna parte.** Viajaba
  // al servidor en el POST a la bandeja; al sacar ese POST, lo que el cliente escribía
  // —los nombres del árbol de Navidad, entre otras cosas— se perdía entero y en silencio:
  // el carrito lo mostraba en pantalla y el mensaje no lo decía. Sin esto, el pedido llega
  // sin el dato con el que se fabrica la pieza.
  // Última barrera: quien arma el enlace valida antes con `problemasDelPedido`, pero un
  // mensaje con «1e+60» no tiene que poder salir por ningún camino.
  const problemas = problemasDelPedido(items);
  if (problemas.length) throw new Error(problemas.map((p) => p.texto).join(' '));
  const lineas = items.flatMap((i) => {
    const detalle = describirOpciones(i.opts);
    const nom = i.nombre ?? 'Producto';
    const fila = `• ${i.qty} × ${nom}${detalle ? ` (${detalle})` : ''} — $${formatoMonto(precioRenglon(i))} c/u`;
    const extra: string[] = [];
    // Con saltos de línea adentro (los nombres van uno por renglón) se indenta cada uno,
    // o el mensaje se lee como si fueran productos sueltos del pedido.
    if (i.customNote) extra.push(`   ${i.customNote.split('\n').join('\n   ')}`);
    // La foto NO viaja: la clave del bucket no le sirve a nadie en un chat. Se le pide al
    // cliente que la mande acá, que es donde ya está escribiendo.
    if (i.customImageKey) extra.push('   (te mando la foto por aquí)');
    return [fila, ...extra];
  });
  const total = totalPedido(items);
  const quien = nombre ? `soy ${nombre} y ` : '';
  let msg = `Hola ${info.businessName}, ${quien}quiero hacer este pedido:\n\n${lineas.join('\n')}\n\nTotal: $${formatoMonto(total)} BCV`;
  const alt = equivalenteEnMoneda(total, info.rate);
  if (alt) msg += `\n(≈ ${alt} ${info.rate?.currencyCode} a la tasa de hoy)`;
  return msg;
}

/** Mensaje de WhatsApp para una consulta de pieza a medida.
 *
 *  ⚠️ Ya no lleva nombre (2026-11-11): el modal dejó de pedirlo, porque en WhatsApp el
 *  cliente llega con el suyo. Un parámetro opcional que nadie pasa es código muerto. */
export function mensajeConsulta(
  info: Pick<InfoApi, 'businessName'>,
  descripcion: string,
): string {
  return `Hola ${info.businessName}, ${descripcion}`;
}
