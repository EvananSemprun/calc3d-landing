// Buscador de la tienda: índice liviano que se genera en el build y búsqueda pura en el
// navegador. Lleva el resumen (`desc`) A PROPÓSITO: el objetivo es encontrar un producto
// sin saber su nombre exacto, y con solo el nombre «soporte de celular» no encuentra una
// «Base Anti-Slip». Pura: sin DOM, para poder probarla en el runner de node.
import type { ProductoVitrina } from './producto';

export interface EntradaBusqueda {
  id: string;
  name: string;
  cat: string;
  catLabel: string;
  desc: string;
}

export const TOPE_RESULTADOS = 8;

/** Palabras de relleno que no distinguen un producto de otro («soporte DE celular»). */
const RELLENO = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'para', 'con', 'por', 'y', 'en', 'a']);

export function indiceDeBusqueda(productos: readonly ProductoVitrina[]): EntradaBusqueda[] {
  return productos.map((p) => ({ id: p.id, name: p.name, cat: p.cat, catLabel: p.catLabel, desc: p.desc }));
}

/** Minúsculas y sin acentos («Corazón» → «corazon»). */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function palabrasDe(consulta: string): string[] {
  const todas = normalizar(consulta).split(/[^a-z0-9ñ]+/).filter(Boolean);
  const utiles = todas.filter((t) => !RELLENO.has(t));
  return utiles.length > 0 ? utiles : todas;
}

/**
 * Puntaje de una entrada para las palabras dadas; 0 si ALGUNA no aparece (se exigen todas).
 * El nombre pesa más que la categoría y esta más que el resumen; empezar una palabra
 * del nombre pesa más que aparecer en el medio.
 */
function puntaje(e: EntradaBusqueda, palabras: readonly string[]): number {
  const nombre = normalizar(e.name);
  const categoria = normalizar(e.catLabel);
  const resumen = normalizar(e.desc);
  let total = 0;
  for (const w of palabras) {
    let p = 0;
    if (empiezaPalabra(nombre, w)) p = 4;
    else if (nombre.includes(w)) p = 3;
    else if (categoria.includes(w)) p = 2;
    else if (resumen.includes(w)) p = 1;
    if (p === 0) return 0;
    total += p;
  }
  return total;
}

function empiezaPalabra(texto: string, w: string): boolean {
  return texto.split(/[^a-z0-9ñ]+/).some((palabra) => palabra.startsWith(w));
}

/** Una consulta vacía no devuelve nada (no «todo»). Empates: el orden del catálogo. */
export function buscar(
  indice: readonly EntradaBusqueda[],
  consulta: string,
  tope: number = TOPE_RESULTADOS,
): EntradaBusqueda[] {
  const palabras = palabrasDe(consulta);
  if (palabras.length === 0) return [];
  return indice
    .map((e, orden) => ({ e, orden, p: puntaje(e, palabras) }))
    .filter((r) => r.p > 0)
    .sort((a, b) => b.p - a.p || a.orden - b.orden)
    .slice(0, tope)
    .map((r) => r.e);
}
