// Índice del buscador, generado en el build (un solo archivo, no un campo en cada página):
// la isla lo pide la primera vez que alguien enfoca el campo. Si la API falla, el build falla.
import type { APIRoute } from 'astro';
import { indiceDeBusqueda } from '../lib/indice-busqueda';
import { cargarTienda } from '../lib/tienda-build';

export const GET: APIRoute = async () => {
  const { productos } = await cargarTienda();
  return new Response(JSON.stringify(indiceDeBusqueda(productos)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
