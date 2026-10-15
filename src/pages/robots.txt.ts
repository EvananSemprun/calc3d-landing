// robots.txt generado en el build. La URL del sitemap es ABSOLUTA y sale de
// PUBLIC_SITE_URL (Astro.site): sin dominio configurado, se omite esa línea en vez
// de emitir una ruta relativa inválida.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? `Sitemap: ${new URL('sitemap-index.xml', site).href}\n` : '';
  const cuerpo = `User-agent: *\nAllow: /\n${sitemap}`;
  return new Response(cuerpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
