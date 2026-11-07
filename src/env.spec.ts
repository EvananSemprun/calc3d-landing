import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * EL `.env.example` TIENE QUE NOMBRAR LAS VARIABLES QUE EL CÓDIGO LEE
 * (2026-11-07).
 *
 * ⚠️ **Nació de un error real que estuvo meses sin verse.** El `.env.example`
 * documentaba `VITE_API_URL` y `VITE_SITE_URL`; el código lee
 * `PUBLIC_API_URL` y `PUBLIC_SITE_URL`. Son nombres que no existen entre sí
 * — Astro solo expone al navegador las que empiezan con `PUBLIC_` —, así que
 * quien siguiera el `.env.example` configuraba variables que nadie lee.
 *
 * **Y falla en SILENCIO**, que es lo peligroso: `api.ts` tiene el respaldo
 * `?? 'http://localhost:3001/api'`, así que el build sale en VERDE y la
 * tienda publicada le habla a localhost. No hay error, no hay aviso: las
 * fichas simplemente aparecen vacías para todo el que entre. Se descubrió
 * justo antes de publicar la tienda en su dominio.
 *
 * Arreglar el archivo no alcanza: vuelve a quedar viejo en cuanto alguien
 * agregue una variable. Esto es lo que lo mantiene honesto. Cubre las dos
 * direcciones a propósito:
 *  - variable que el código lee y el ejemplo NO documenta → nadie sabe que hay
 *    que configurarla;
 *  - variable documentada que el código NO lee → el caso de arriba, el que
 *    manda a configurar algo que no sirve.
 */

const RAIZ = join(__dirname, '..');

/** Los nombres declarados en el `.env.example` (ignora comentarios). */
function declaradasEnElEjemplo(): Set<string> {
  const texto = readFileSync(join(RAIZ, '.env.example'), 'utf8');
  const nombres = texto
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .map((l) => /^\s*([A-Z][A-Z0-9_]*)\s*=/.exec(l)?.[1])
    .filter((n): n is string => Boolean(n));
  return new Set(nombres);
}

/** Archivos de código donde puede leerse una variable de entorno. */
function fuentes(dir: string, acumulado: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      fuentes(ruta, acumulado);
    } else if (/\.(ts|tsx|astro|mjs)$/.test(entrada) && !entrada.endsWith('.spec.ts')) {
      acumulado.push(ruta);
    }
  }
  return acumulado;
}

/**
 * Los nombres que el código realmente lee. Se miran `import.meta.env.X` y
 * `env.X` (así las lee `astro.config.mjs`, que no tiene `import.meta.env`).
 * Se excluyen las que define Astro/Vite por su cuenta, que no se configuran.
 */
const DE_LA_HERRAMIENTA = new Set(['MODE', 'DEV', 'PROD', 'SSR', 'BASE_URL', 'NODE_ENV']);

function leidasPorElCodigo(): Set<string> {
  const archivos = [...fuentes(join(RAIZ, 'src')), join(RAIZ, 'astro.config.mjs')];
  const nombres = new Set<string>();
  for (const archivo of archivos) {
    const texto = readFileSync(archivo, 'utf8');
    for (const m of texto.matchAll(/(?:import\.meta\.env|\benv)\.([A-Z][A-Z0-9_]*)/g)) {
      if (!DE_LA_HERRAMIENTA.has(m[1])) nombres.add(m[1]);
    }
  }
  return nombres;
}

describe('.env.example y el código nombran las mismas variables', () => {
  it('toda variable que el código lee está documentada en el .env.example', () => {
    const faltan = [...leidasPorElCodigo()].filter((n) => !declaradasEnElEjemplo().has(n));
    expect(
      faltan,
      `El código lee estas variables y el .env.example no las nombra: ${faltan.join(', ')}. ` +
        'Quien clone el repo no se entera de que tiene que configurarlas.',
    ).toEqual([]);
  });

  it('toda variable del .env.example la lee alguien: nada de documentación muerta', () => {
    const sobran = [...declaradasEnElEjemplo()].filter((n) => !leidasPorElCodigo().has(n));
    expect(
      sobran,
      `El .env.example nombra variables que NADIE lee: ${sobran.join(', ')}. ` +
        'Configurarlas no hace nada y el build igual sale verde (hay respaldo a localhost).',
    ).toEqual([]);
  });

  // Astro solo expone al navegador lo que empieza con `PUBLIC_`. Una variable
  // `VITE_` acá no es un detalle de estilo: es la causa EXACTA del error que
  // originó este archivo.
  it('las variables del navegador llevan el prefijo PUBLIC_, no VITE_', () => {
    const conVite = [...declaradasEnElEjemplo(), ...leidasPorElCodigo()].filter((n) =>
      n.startsWith('VITE_'),
    );
    expect(
      conVite,
      `Astro no expone las variables \`VITE_\` al navegador: ${conVite.join(', ')}. ` +
        'Tienen que llamarse PUBLIC_*.',
    ).toEqual([]);
  });
});
