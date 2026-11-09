/**
 * TODA LA TIENDA DICE LA MISMA MONEDA (2026-11-09).
 *
 * El precio publicado está en dólares BCV, que NO es el dólar del costeo (el del
 * costeo es USDT; ver el CLAUDE.md de la API). La ficha y el carrito pasaron a decir
 * «BCV» y las TARJETAS se quedaron en «USD», así que el catálogo y la ficha del mismo
 * producto nombraban monedas distintas para el mismo número.
 *
 * ⚠️ Este test mira el código fuente y no una pantalla: lo que hay que atajar es un
 * lugar NUEVO que vuelva a escribir «USD», y una pantalla solo cubre la que se montó.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function archivos(dir: string, acc: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) archivos(ruta, acc);
    else if (/\.(astro|tsx)$/.test(entrada) && !/\.spec\.tsx$/.test(entrada)) acc.push(ruta);
  }
  return acc;
}

const sinComentarios = (fuente: string) => {
  const enBlanco = (m: string) => m.replace(/[^\r\n]/g, ' ');
  return fuente.replace(/\/\*[\s\S]*?\*\//g, enBlanco).replace(/(^|[^:])\/\/.*$/gm, enBlanco);
};

describe('la moneda que se le muestra al cliente', () => {
  it('ningún precio visible dice «USD»', () => {
    const encontrado: string[] = [];
    for (const ruta of archivos('src')) {
      sinComentarios(readFileSync(ruta, 'utf8'))
        .split('\n')
        .forEach((linea, i) => {
          // `product:price:currency` es la etiqueta de datos estructurados para Google,
          // que pide un código ISO. No hay código ISO para «dólar BCV», así que ahí se
          // queda USD a propósito: inventar uno rompería los resultados enriquecidos.
          if (linea.includes('price:currency')) return;
          if (/\bUSD\b/.test(linea) && !/USDT/.test(linea)) encontrado.push(`${ruta}:${i + 1}`);
        });
    }
    expect(encontrado).toEqual([]);
  });
});
