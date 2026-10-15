// Estado del carrito (localStorage). Capa mínima: el cajón, la insignia del header,
// el envío del pedido y el mensaje de WhatsApp llegan con el carrito visible.
//
// Es un armador de pedido, no una caja: junta lo que el cliente quiere y termina en
// un mensaje de WhatsApp. No cobra ni guarda datos personales. Misma clave y misma
// forma de renglón que el sitio viejo (`Cart` en assets/app.js), para que un carrito
// armado allá siga siendo válido acá.
//
// Todo recibe el almacenamiento como parámetro (por defecto, localStorage): así las
// pruebas corren en node con uno de mentira, y en el servidor (SSR) no revienta.

import type { TramoPrecio } from './precio';
import type { FotoApi } from './producto';

export const CLAVE_CARRITO = 'bl_cart_v1';

/** Lo mínimo de `Storage` que necesita el carrito. */
export interface Almacen {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

/**
 * Un renglón del pedido. `unit` es el unitario SIN tramo de mayoreo (base + recargos
 * de las opciones elegidas): se congela al agregar y el tramo se recalcula después con
 * la cantidad ACTUAL (`precioUnitarioItem`). El precio NO viaja al servidor: es
 * informativo, el total lo calcula la API.
 */
export interface ItemCarrito {
  id: string;
  qty: number;
  opts: Record<string, string>;
  unit: number;
  customNote?: string;
  customImageKey?: string;
  /** Datos de display DENORMALIZADOS al agregar, para que el cajón no tenga que
   *  re-traer el catálogo en cada página. NO viajan al servidor (ver `itemsParaPedido`);
   *  el precio real lo calcula la API. */
  nombre?: string;
  imagen?: FotoApi | null;
  priceTiers?: TramoPrecio[];
  minQty?: number;
}

export interface EntradaCarrito {
  id: string;
  qty: number;
  opts?: Record<string, string>;
  unit: number;
  customNote?: string;
  customImageKey?: string;
  nombre?: string;
  imagen?: FotoApi | null;
  priceTiers?: TramoPrecio[];
  minQty?: number;
}

/** localStorage si existe y se puede tocar (SSR, modo privado o bloqueado → null). */
export function almacenPorDefecto(): Almacen | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Identidad de un renglón: el mismo producto con OTRAS opciones es otro renglón. */
export function claveDeItem(
  id: string,
  opts: Record<string, string> | undefined,
  note?: string,
  imageKey?: string,
): string {
  const partes = Object.keys(opts ?? {})
    .sort()
    .map((k) => `${k}=${(opts as Record<string, string>)[k]}`);
  // La personalización también distingue: dos "Taza" con notas/fotos distintas son
  // renglones distintos (si no, el segundo pisaría la nota del primero).
  if (note) partes.push(`nota=${note}`);
  if (imageKey) partes.push(`foto=${imageKey}`);
  return partes.length ? `${id}|${partes.join('|')}` : id;
}

function claveDe(i: ItemCarrito): string {
  return claveDeItem(i.id, i.opts, i.customNote, i.customImageKey);
}

export function leer(almacen: Almacen | null = almacenPorDefecto()): ItemCarrito[] {
  if (!almacen) return [];
  try {
    const datos: unknown = JSON.parse(almacen.getItem(CLAVE_CARRITO) ?? 'null');
    return Array.isArray(datos) ? (datos as ItemCarrito[]) : [];
  } catch {
    return [];
  }
}

/** Guarda y avisa (`cart:change`) a quien esté escuchando: header, cajón, otras islas. */
export function escribir(items: ItemCarrito[], almacen: Almacen | null = almacenPorDefecto()): void {
  if (!almacen) return;
  try {
    almacen.setItem(CLAVE_CARRITO, JSON.stringify(items));
  } catch {
    return; // sin cupo o bloqueado: mejor no avisar de un cambio que no ocurrió
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('cart:change'));
}

/**
 * Agrega al pedido. Dos renglones del mismo producto con opciones (o personalización)
 * distintas son cosas distintas, así que se agrupa por producto + opciones: si ya
 * existe el renglón, suma cantidad.
 */
export function agregar(
  entrada: EntradaCarrito,
  almacen: Almacen | null = almacenPorDefecto(),
): ItemCarrito[] {
  const opts = entrada.opts ?? {};
  const clave = claveDeItem(entrada.id, opts, entrada.customNote, entrada.customImageKey);
  const items = leer(almacen);
  const existente = items.find((i) => claveDe(i) === clave);
  if (existente) {
    existente.qty += entrada.qty;
  } else {
    const nuevo: ItemCarrito = { id: entrada.id, qty: entrada.qty, opts, unit: entrada.unit };
    if (entrada.customNote) nuevo.customNote = entrada.customNote;
    if (entrada.customImageKey) nuevo.customImageKey = entrada.customImageKey;
    if (entrada.nombre) nuevo.nombre = entrada.nombre;
    if (entrada.imagen) nuevo.imagen = entrada.imagen;
    if (entrada.priceTiers && entrada.priceTiers.length) nuevo.priceTiers = entrada.priceTiers;
    if (entrada.minQty) nuevo.minQty = entrada.minQty;
    items.push(nuevo);
  }
  escribir(items, almacen);
  return items;
}

/** Unidades totales del pedido (lo que muestra la insignia del carrito). */
export function contar(almacen: Almacen | null = almacenPorDefecto()): number {
  return leer(almacen).reduce((n, i) => n + i.qty, 0);
}

export function vaciar(almacen: Almacen | null = almacenPorDefecto()): void {
  escribir([], almacen);
}

/**
 * Fija la cantidad del renglón identificado por su `clave` (la de `claveDeItem`).
 * Si la cantidad baja de 1, el renglón se quita. El mínimo de compra del producto
 * lo hace respetar quien llama (el cajón, que tiene el producto a mano).
 */
export function fijarCantidad(
  clave: string,
  qty: number,
  almacen: Almacen | null = almacenPorDefecto(),
): ItemCarrito[] {
  let items = leer(almacen);
  const item = items.find((i) => claveDe(i) === clave);
  if (!item) return items;
  if (qty < 1) items = items.filter((i) => i !== item);
  else item.qty = qty;
  escribir(items, almacen);
  return items;
}

/** Quita el renglón con esa clave y deja el resto. */
export function quitar(clave: string, almacen: Almacen | null = almacenPorDefecto()): ItemCarrito[] {
  const items = leer(almacen).filter((i) => claveDe(i) !== clave);
  escribir(items, almacen);
  return items;
}
