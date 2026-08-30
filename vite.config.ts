import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Tienda y sitio público de Banano Lab. Estático y SIN React, igual que
 * `calc3d-landing`: el HTML plano se indexa sin trucos de SEO. Los datos del
 * catálogo los trae en el cliente la API pública (`/api/public/store/*`).
 */

/** Páginas del sitio: ruta pública -> archivo en disco. */
const PAGINAS: Record<string, string> = {
  '/': 'index.html',
  '/tienda/': 'tienda/index.html',
  '/impresion-3d/': 'impresion-3d/index.html',
  '/programacion/': 'programacion/index.html',
  '/calculadora/': 'calculadora/index.html',
};

/**
 * Inyecta los parciales compartidos (`partials/header.html`, `footer.html`) en
 * cada página, reemplazando los comentarios de inclusión.
 *
 * Existe porque el header y el footer estaban COPIADOS en cada HTML. Con dos
 * páginas era tolerable; con seis, cambiar un enlace del menú serían seis
 * ediciones y la primera que se olvide deja el sitio incoherente.
 *
 * Se resuelve acá y no en JavaScript a propósito: los enlaces internos son el
 * camino por el que un buscador descubre las demás páginas. Pintar el menú con
 * JS dejaría cada página aislada — el mismo problema de SEO que ya arrastra el
 * catálogo, pero extendido a la navegación.
 */
function parciales(): Plugin {
  const leer = (nombre: string) =>
    readFileSync(resolve(__dirname, `partials/${nombre}.html`), 'utf8');

  return {
    name: 'parciales',
    // `pre` para que corra antes de que Vite procese el HTML resultante (si no,
    // los <script> o <link> que vinieran en un parcial no se transformarían).
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/<!--#include\s+(\w+)-->/g, (_, nombre) => leer(nombre)),
    },
    // En desarrollo, editar un parcial tiene que recargar la página.
    configureServer(server) {
      server.watcher.add(resolve(__dirname, 'partials'));
      server.watcher.on('change', (file) => {
        if (file.includes('partials')) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

/**
 * Genera `sitemap.xml` y `robots.txt` a partir de `PAGINAS`, que es la misma
 * lista con la que se arma el build. Se generan y no se escriben a mano para que
 * una página nueva no pueda quedarse fuera del sitemap sin que nadie lo note.
 *
 * **Las fichas de producto NO van en el sitemap**, a propósito: se pintan en el
 * cliente, así que un buscador que las visite ve una página vacía. Listarlas
 * sería mandarlo a indexar huecos. Cuando se pre-rendericen, entran acá.
 *
 * Sin `VITE_SITE_URL` no se emite el sitemap ni la línea `Sitemap:` del robots:
 * un sitemap con el dominio equivocado es peor que no tenerlo (los buscadores
 * descartan las URLs que no son del mismo dominio). El build avisa.
 */
function seo(): Plugin {
  const base = (process.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');

  const robots = () =>
    [
      '# Sitio público de Banano Lab.',
      'User-agent: *',
      'Allow: /',
      '',
      // El carrito y los filtros viven en la URL como consulta; no son páginas.
      'Disallow: /*?cat=',
      '',
      base ? `Sitemap: ${base}/sitemap.xml` : '# Falta VITE_SITE_URL: sin dominio no se publica el sitemap.',
      '',
    ].join('\n');

  const sitemap = () => {
    const urls = Object.entries(PAGINAS).map(([ruta, archivo]) => {
      // `lastmod` sale de la fecha del archivo fuente: es un dato real y no
      // cambia en cada build, así que no ensucia el diff ni miente.
      const fecha = statSync(resolve(__dirname, archivo)).mtime.toISOString().slice(0, 10);
      return `  <url>\n    <loc>${base}${ruta}</loc>\n    <lastmod>${fecha}</lastmod>\n  </url>`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  };

  return {
    name: 'seo',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots() });
      if (!base) {
        this.warn(
          'VITE_SITE_URL no está definida: no se generó sitemap.xml. ' +
            'Definila con el dominio del sitio (ej. https://bananolab.com) antes de publicar.',
        );
        return;
      }
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() });
    },
    // En desarrollo se sirven al vuelo, para poder verificarlos sin compilar.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const ruta = (req.url ?? '').split('?')[0];
        if (ruta === '/robots.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end(robots());
        }
        if (ruta === '/sitemap.xml' && base) {
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          return res.end(sitemap());
        }
        next();
      });
    },
  };
}

/**
 * Rutas "limpias" en desarrollo. En producción las resuelve nginx; el servidor
 * de Vite no reescribe solo, así que sin esto `/tienda/` o `/producto/llavero`
 * darían 404 al recargar.
 */
function rutasLimpias(): Plugin {
  return {
    name: 'rutas-limpias',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // Solo rutas sin punto ni consulta: con esa precisión no se tocan las
        // peticiones internas de Vite (`/producto/index.html?html-proxy...`),
        // que reescritas fallan con 500.
        const ruta = (req.url ?? '').split('?')[0];
        if (/^\/producto\/[^/.]+$/.test(ruta)) {
          req.url = '/producto/index.html';
        } else if (PAGINAS[ruta]) {
          req.url = '/' + PAGINAS[ruta];
        } else if (/^\/[a-z0-9-]+$/.test(ruta) && PAGINAS[ruta + '/']) {
          // `/tienda` sin barra final también funciona.
          req.url = '/' + PAGINAS[ruta + '/'];
        }
        next();
      });
    },
  };
}

export default defineConfig({
  // `seo` va antes que `rutasLimpias`: si no, `/robots.txt` no llegaría a su
  // middleware (aunque hoy el patrón no lo tocaría, el orden lo deja explícito).
  plugins: [parciales(), seo(), rutasLimpias()],
  server: { port: 5182 },
  build: {
    target: 'es2019',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        tienda: resolve(__dirname, 'tienda/index.html'),
        producto: resolve(__dirname, 'producto/index.html'),
        impresion3d: resolve(__dirname, 'impresion-3d/index.html'),
        programacion: resolve(__dirname, 'programacion/index.html'),
        calculadora: resolve(__dirname, 'calculadora/index.html'),
      },
    },
  },
});
