// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Astro no vuelca el .env a process.env dentro de este archivo: se lee a mano.
// PUBLIC_SITE_URL = dominio sin barra final (sitemap, canónicas, og:url).
const env = { ...loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), ''), ...process.env };

export default defineConfig({
  output: 'static',
  site: env.PUBLIC_SITE_URL || undefined,
  integrations: [
    react(),
    // Fuera del sitemap: la categoría sin clasificar y la CÁSCARA /p/ (que además es
    // noindex — pedirle a Google que la visite y que no la indexe es contradictorio).
    sitemap({ filter: (pagina) => !/\/tienda\/sin-categoria\/|\/p\/$/.test(pagina) }),
  ],
  server: { port: 5182 },
  vite: {
    // Tailwind 4 se engancha como plugin de Vite (@astrojs/tailwind es solo para Tailwind 3).
    plugins: [tailwindcss()],
    // 5182 es el origen exacto que valida la API (STORE_ORIGIN, CORS): si está
    // ocupado, que falle en vez de saltar a otro puerto en silencio.
    server: { strictPort: true },
  },
});
