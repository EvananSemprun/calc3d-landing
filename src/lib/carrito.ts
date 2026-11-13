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
import { MAX_CANTIDAD, acotarCantidad } from './cantidad';

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
  /** La parte de `unit` que aportan las opciones elegidas, denormalizada al agregar.
   *  Un tramo por precio fijo reemplaza al precio de LISTA y el recargo se cobra encima:
   *  sin este dato el cajón mostraría menos de lo que el servidor cobra. Opcional porque
   *  un carrito guardado antes del 2026-11-08 no lo tiene (y ahí valía 0). */
  recargo?: number;
  customNote?: string;
  customImageKey?: string;
  /** Con más de una unidad y nombres: `true` = los MISMOS nombres para todas. Sin esto el
   *  pedido no dice si los nombres son para las N piezas o para una (pedido real del
   *  2026-11-12: «3 × árbol» con un solo nombre). `undefined` = nadie lo aclaró. */
  mismosNombres?: boolean;
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
  /** La parte de `unit` que aportan las opciones elegidas, denormalizada al agregar.
   *  Un tramo por precio fijo reemplaza al precio de LISTA y el recargo se cobra encima:
   *  sin este dato el cajón mostraría menos de lo que el servidor cobra. Opcional porque
   *  un carrito guardado antes del 2026-11-08 no lo tiene (y ahí valía 0). */
  recargo?: number;
  customNote?: string;
  customImageKey?: string;
  mismosNombres?: boolean;
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

const esFinito = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * Un renglón guardado, saneado, o `null` si no tiene forma de renglón.
 *
 * ⚠️ localStorage es una entrada NO confiable: lo editó una versión vieja, otra pestaña o
 * el propio cliente a mano. Hasta el 2026-11-12 `leer` casteaba el JSON a `ItemCarrito[]`
 * sin mirar nada, así que un `qty: 1e60` guardado sobrevivía a recargar y salía en el
 * mensaje de WhatsApp. Se descarta lo que no es un renglón (sin id, sin precio) y se
 * acota la cantidad a [mínimo, MAX_CANTIDAD].
 */
function sanearRenglon(crudo: unknown): ItemCarrito | null {
  if (typeof crudo !== 'object' || crudo === null || Array.isArray(crudo)) return null;
  const r = crudo as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (!esFinito(r.qty) || !esFinito(r.unit) || r.unit < 0) return null;

  const minQty = esFinito(r.minQty) && r.minQty >= 1 ? Math.min(Math.trunc(r.minQty), MAX_CANTIDAD) : undefined;
  const opts: Record<string, string> = {};
  if (typeof r.opts === 'object' && r.opts !== null && !Array.isArray(r.opts)) {
    for (const [k, v] of Object.entries(r.opts)) if (typeof v === 'string') opts[k] = v;
  }

  const item: ItemCarrito = {
    id: r.id,
    qty: acotarCantidad(r.qty, minQty ?? 1, MAX_CANTIDAD),
    opts,
    unit: r.unit,
  };
  if (esFinito(r.recargo) && r.recargo > 0) item.recargo = r.recargo;
  if (typeof r.customNote === 'string' && r.customNote) item.customNote = r.customNote;
  if (typeof r.customImageKey === 'string' && r.customImageKey) item.customImageKey = r.customImageKey;
  if (typeof r.mismosNombres === 'boolean') item.mismosNombres = r.mismosNombres;
  if (typeof r.nombre === 'string' && r.nombre) item.nombre = r.nombre;
  if (typeof r.imagen === 'object' && r.imagen !== null) item.imagen = r.imagen as FotoApi;
  if (Array.isArray(r.priceTiers) && r.priceTiers.length) item.priceTiers = r.priceTiers as TramoPrecio[];
  if (minQty) item.minQty = minQty;
  return item;
}

export function leer(almacen: Almacen | null = almacenPorDefecto()): ItemCarrito[] {
  if (!almacen) return [];
  try {
    const datos: unknown = JSON.parse(almacen.getItem(CLAVE_CARRITO) ?? 'null');
    if (!Array.isArray(datos)) return [];
    return datos.map(sanearRenglon).filter((i): i is ItemCarrito => i !== null);
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
    // Acotado: dos agregados de 600 no pueden sumar 1.200 aunque cada uno sea válido.
    existente.qty = acotarCantidad(existente.qty + entrada.qty, existente.minQty ?? 1);
    // Misma clave = misma nota: agregar otra vez con los MISMOS nombres es decir, sin
    // ambigüedad, que valen para todas.
    if (existente.customNote) existente.mismosNombres = true;
  } else {
    const nuevo: ItemCarrito = {
      id: entrada.id,
      qty: acotarCantidad(entrada.qty, entrada.minQty ?? 1),
      opts,
      unit: entrada.unit,
    };
    // Solo si suma: un recargo en 0 es el default y no hace falta guardarlo.
    if (entrada.recargo) nuevo.recargo = entrada.recargo;
    if (entrada.customNote) nuevo.customNote = entrada.customNote;
    if (entrada.customImageKey) nuevo.customImageKey = entrada.customImageKey;
    if (entrada.mismosNombres !== undefined) nuevo.mismosNombres = entrada.mismosNombres;
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
  else item.qty = acotarCantidad(qty, item.minQty ?? 1);
  escribir(items, almacen);
  return items;
}

/** Anota si los nombres del renglón valen para TODAS sus unidades (ver `mismosNombres`). */
export function fijarMismosNombres(
  clave: string,
  mismos: boolean,
  almacen: Almacen | null = almacenPorDefecto(),
): ItemCarrito[] {
  const items = leer(almacen);
  const item = items.find((i) => claveDe(i) === clave);
  if (!item) return items;
  item.mismosNombres = mismos;
  escribir(items, almacen);
  return items;
}

/** Quita el renglón con esa clave y deja el resto. */
export function quitar(clave: string, almacen: Almacen | null = almacenPorDefecto()): ItemCarrito[] {
  const items = leer(almacen).filter((i) => claveDe(i) !== clave);
  escribir(items, almacen);
  return items;
}

/** Evento que abre el cajón del pedido desde cualquier isla (lo escucha `Carrito`).
 *  Existe para que un aviso flotante —que vive en un portal fuera del árbol de la
 *  ficha— pueda ofrecer "Ver pedido" sin depender de que haya un
 *  `[data-bl="cart-open"]` en pantalla. */
export const EVENTO_ABRIR_CARRITO = 'cart:open';

/** Pide que se abra el cajón del pedido. No-op fuera del navegador (SSR/build). */
export function abrirCarrito(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_ABRIR_CARRITO));
}
