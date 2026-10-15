// Las ÚNICAS escrituras de la tienda: el pedido y la consulta de pieza a medida.
// El precio NO viaja (lo calcula la API). Devuelve el mensaje de error del backend
// cuando lo hay ("Falta elegir Tamaño", "se pide de a 2"): son cosas que el cliente
// puede corregir, y tragárselas dejaría un "algo salió mal" inútil.
import type { Contacto, LineaPedido } from './pedido';

const BASE = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const d = data as { message?: string | string[] } | null;
    const msg = Array.isArray(d?.message) ? d?.message[0] : d?.message;
    throw new Error(msg || `La API respondió ${res.status}`);
  }
  return data as T;
}

/** Manda el pedido a la bandeja del negocio. `customer` = { name, phone, note? }. */
export function enviarPedido(customer: Contacto, items: LineaPedido[]): Promise<unknown> {
  return postJson('/public/store/orders', { customer, items });
}

/** Manda una consulta de pieza a medida a la bandeja. */
export function enviarConsulta(
  customer: Pick<Contacto, 'name' | 'phone'>,
  description: string,
): Promise<unknown> {
  return postJson('/public/store/custom-requests', { customer, description });
}
