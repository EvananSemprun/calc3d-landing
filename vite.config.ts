import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import {
  adapt,
  renderCard,
  renderFichaHtml,
  metaTagsFor,
  jsonLdProduct,
  tituloFicha,
  escapeHtml,
  inyectarFicha,
} from './assets/render.js';

/** API y dominio del build (mismas variables que el cliente). */
const API = (process.env.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');
const SITE = (process.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');

/**
 * Catálogo consultado en el BUILD (fichas completas). Lo llena el plugin
 * `prerender` en `buildStart` y lo lee también `seo` para el sitemap. Módulo-scope
 * para compartirlo sin reconsultar la API.
 */
let catalogo: any[] = [];
let infoRate: any = null;
let businessName = 'Banano Lab';

/** fetch con reintentos y espera creciente (para el cold start de Render). */
async function fetchConReintentos(url: string, intentos = 6): Promise<any> {
  let ultimoError: unknown;
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
      ultimoError = new Error(`HTTP ${r.status}`);
    } catch (e) {
      ultimoError = e;
    }
    await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
  }
  throw new Error(`[prerender] No se pudo consultar ${url} tras ${intentos} intentos: ${ultimoError}`);
}

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
    // Las fichas pre-renderizadas (las llenó `prerender` en buildStart) ya SON
    // páginas reales con contenido, así que entran al sitemap.
    const fichas = catalogo.map(
      (raw) => `  <url>\n    <loc>${base}/producto/${encodeURIComponent(raw.slug)}/</loc>\n  </url>`,
    );
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls, ...fichas].join('\n')}\n</urlset>\n`;
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

/**
 * Pre-render (SSG) de la vitrina y de cada ficha. Consulta la API en el BUILD
 * (con reintentos; FALLA el build si no responde) para que el buscador y el
 * primer paint vean el contenido escrito en el HTML. El cliente sigue
 * re-renderizando con las MISMAS funciones puras (render.js), así que no diverge.
 *
 * - La VITRINA es un input del build: se inyecta la grilla en `transformIndexHtml`
 *   (post), con los assets ya resueltos por Vite.
 * - Las FICHAS por slug NO son inputs: se escriben en `closeBundle` usando el
 *   `dist/producto/index.html` ya construido como plantilla (hereda assets
 *   hasheados + parciales resueltos).
 */
function prerender(): Plugin {
  let outDir = 'dist';
  return {
    name: 'prerender',
    // Solo en BUILD: su `buildStart` consulta la API, y en `pnpm dev` (que también
    // dispara `buildStart`) eso bloquearía el arranque del server si la API está
    // caída. En dev el sitio sigue degradándose solo (lo renderiza el cliente).
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async buildStart() {
      const info = await fetchConReintentos(`${API}/public/store/info`);
      infoRate = info?.rate ?? null;
      businessName = info?.businessName ?? 'Banano Lab';
      const { products } = await fetchConReintentos(`${API}/public/store/products`);
      catalogo = [];
      for (const card of products) {
        catalogo.push(await fetchConReintentos(`${API}/public/store/products/${encodeURIComponent(card.slug)}`));
      }
      this.info(`[prerender] ${catalogo.length} fichas desde ${API}`);
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!/(^|\/)tienda\/index\.html$/.test(ctx.path)) return html;
        const grid = catalogo.map((raw) => renderCard(adapt(raw), infoRate)).join('');
        // El contenido de #shopGrid son SOLO los skeletons: se matchean uno a uno
        // (y su cierre), para no cortar en el primer </div> ni dejar skeletons sueltos.
        return html.replace(
          /(<div class="grid shop-grid" id="shopGrid">)(?:\s*<div class="skeleton"><\/div>)*\s*(<\/div>)/,
          `$1${grid}$2`,
        );
      },
    },
    closeBundle() {
      const plantilla = readFileSync(resolve(outDir, 'producto/index.html'), 'utf8');
      for (const raw of catalogo) {
        const p = adapt(raw);
        const path = `/producto/${p.id}/`;
        const head =
          `<title>${escapeHtml(tituloFicha(p, businessName))}</title>\n` +
          metaTagsFor(p, { siteUrl: SITE, path }) +
          '\n' +
          jsonLdProduct(p, { siteUrl: SITE, path });
        const cuerpo = renderFichaHtml(p, { rate: infoRate });
        const html = inyectarFicha(plantilla, head, cuerpo);
        mkdirSync(resolve(outDir, `producto/${p.id}`), { recursive: true });
        writeFileSync(resolve(outDir, `producto/${p.id}/index.html`), html);
      }
    },
  };
}

export default defineConfig({
  // `prerender` va antes que `seo`: su `buildStart` llena `catalogo`, que `seo`
  // lee para el sitemap. `seo` va antes que `rutasLimpias` (orden explícito).
  plugins: [parciales(), prerender(), seo(), rutasLimpias()],
  server: { port: 5182 },
  build: {
    target: 'es2019',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        tienda: resolve(__dirname, 'tienda/index.html'),
        producto: resolve(__dirname, 'producto/index.html'),
        impresion3d: resolve(__dirname, 'impresion-3d/index.html'),
      },
    },
  },
});
