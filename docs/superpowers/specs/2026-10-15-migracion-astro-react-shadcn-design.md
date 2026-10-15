# Migración de la tienda a Astro + React + shadcn/ui — Diseño

**Fecha:** 2026-10-15
**Repo:** `calc3d-landing`
**Estado:** aprobado en brainstorming (framework + alcance); pendiente de plan.

## Objetivo

Reescribir la tienda pública (hoy HTML/CSS/JS vanilla) sobre **Astro + islas de
React + Tailwind + shadcn/ui**, para ganar una base de componentes de mejor
calidad visual **sin perder** lo que hacía buena a la versión vanilla: HTML
estático indexable (SEO), peso bajo y el modelo "catálogo de solo lectura +
pedido por WhatsApp".

## Decisiones tomadas (brainstorming 2026-10-15)

1. **Framework: Astro.** Genera HTML estático por página e hidrata solo "islas"
   de React donde hay interacción. Así shadcn/Tailwind conviven con el SEO. Un
   SPA de React pelado se descartó por eso (HTML vacío para Google en una
   vitrina).
2. **Alcance: toda la tienda** (inicio, catálogo, ficha, impresión 3D, carrito→
   WhatsApp, pieza a medida, banners, flash sale), no solo el catálogo.
3. **Se conserva el modelo de negocio**: sin cuentas, sin pasarela; el pedido
   cae en la bandeja del panel y se cierra por WhatsApp. La API pública no cambia.

## Por qué Astro (y no lo que había)

- La versión vanilla ya prerenderizaba el catálogo/fichas en el build (plugin
  `prerender` de Vite). Astro hace lo mismo de forma nativa con `getStaticPaths`
  (fetch a la API en build → una página HTML por producto) y deja el JS de
  interacción como islas. Es el reemplazo natural, no un cambio de modelo.
- shadcn/ui es React + Tailwind: Astro soporta ambos de primera. Las islas
  mantienen el bundle acotado (solo hidrata lo interactivo).

## Arquitectura

**Stack:** Astro 4.x · `@astrojs/react` · Tailwind 3.x · shadcn/ui · TypeScript.
Build **estático** (`output: 'static'`) → Cloudflare Pages (igual que hoy, otro
comando de build).

**Páginas (`.astro`, estáticas, SEO):**
- `/` (inicio) · `/tienda/` (catálogo) · `/producto/[slug]` (ficha, vía
  `getStaticPaths` que trae los productos de la API en build) · `/impresion-3d/`.
- El `<head>` (title, description, OG, JSON-LD de producto), el header y el
  footer se arman en layouts `.astro` compartidos (reemplazan los `partials/` +
  el plugin `parciales()`).

**Islas de React (`client:visible` / `client:load`), solo lo interactivo:**
- `FiltrosCatalogo` (categoría, material, color, precio, orden) — con la misma
  regla de URL compartible (`?cat&mat&col&max&sort`) ya implementada. Usa
  componentes shadcn (Select, Slider, Toggle/Badge).
- `Carrito` + `Checkout` + `PiezaAMedida` (el flujo a WhatsApp). shadcn Dialog/
  Drawer, Input, Textarea, Button.
- `OpcionesProducto` + `Personalizacion` (nota + foto) en la ficha.
- `Carrusel` de banners y sección `FlashSale` (contador).
- El estado del carrito sigue en `localStorage` (igual que hoy).

**Lógica compartida (TS, sin framework):** portar `assets/render.js`
(`precioConTramos`, `precioUnitarioItem`, `adapt`, `escapeHtml`, el swap de foto
por color, etc.) a módulos TS en `src/lib/`. Siguen con sus tests (migrados a
vitest o node:test). El motor NO depende de React.

**API:** se consumen los mismos endpoints `/api/public/store/*`. En build para el
SSG (catálogo/fichas); en cliente para el carrito, el envío del pedido, la subida
de foto y el flash sale. `VITE_API_URL`/`PUBLIC_API_URL` horneada en build.

## Sistema de diseño

- **Tailwind con los tokens de marca** (navy `#000814/#001D3D/#003566`, amarillo
  `#FFC300/#FFD60A`, Poppins) en `tailwind.config`. shadcn se **tematiza a la
  marca** (variables CSS de shadcn mapeadas a los tokens), NO el tema violeta por
  defecto. Se porta el CSS propio actual (`styles.css`) a utilidades/componentes.
- Se usa el skill **frontend-design** para la pasada visual (espaciado, jerarquía,
  estados), y los componentes shadcn por defecto en vez de reinventar.
- Accesibilidad: shadcn ya trae focus/teclado/aria; se mantiene el foco visible
  de marca.

## SEO (lo que NO se puede regresar)

- Una página HTML por ruta y por producto, con su `<title>`, `description`,
  canonical, Open Graph y JSON-LD `Product` — igual o mejor que el prerender
  actual. `@astrojs/sitemap` genera el sitemap (incluidas las fichas, que hoy
  quedaban afuera). `robots.txt` estático.
- `nginx`/Pages: una ruta inexistente da 404 (no 404 blando). Las fichas ahora SÍ
  entran al sitemap (ventaja sobre hoy).

## Despliegue (Cloudflare Pages)

- Comando de build: `pnpm install && pnpm build` (Astro) · salida: `dist/`.
- Variables: `PUBLIC_API_URL` (la API de Render), `NODE_VERSION`, `PNPM_VERSION`.
- ⚠️ El build prerenderiza pegándole a la API → la API tiene que estar arriba en
  el build (igual que hoy). Con Render free dormido, el primer build puede tardar
  en despertar la API.
- El repo se **mantiene** (`calc3d-landing`), con su remoto e historia; se
  reemplaza el contenido del árbol, no el repo.

## Migración / convivencia

- Se hace en una **rama** o carpeta de trabajo; la tienda vieja sigue sirviendo
  hasta el cutover. No se borra `assets/`, `partials/`, etc. hasta que el stack
  nuevo esté verde y verificado en el navegador.
- Cutover = cambiar el build de Pages al de Astro y borrar lo vanilla en el mismo
  commit, una vez verificado.

## Riesgos

- **SEO**: el riesgo central. Se mitiga con SSG por página/producto + sitemap +
  verificación del HTML renderizado (ver que el contenido esté en el HTML, no
  solo tras hidratar).
- **Peso del bundle**: se acota manteniendo las islas chicas (`client:visible`,
  no `client:load` global). Medir el JS por ruta.
- **Esfuerzo**: es una reescritura completa, de varias fases. No se hace de una
  sentada; se entrega fase por fase, con la vieja viva hasta el final.
- **Paridad de comportamiento**: el carrito, el filtro compartible por URL, la
  personalización y el flash sale tienen que replicar lo que ya funciona (hay
  tests y verificación en navegador para cada uno).

## Fases (para el plan)

1. **Andamiaje**: Astro + React + Tailwind + shadcn + tema de marca + layout
   (header/footer/head) + deploy de prueba.
2. **Lógica compartida**: portar `render.js` → `src/lib/*.ts` con sus tests.
3. **Páginas estáticas**: inicio + impresión 3D (contenido, sin islas pesadas).
4. **Catálogo**: `/tienda/` con la isla de filtros (categoría/material/color/
   precio/orden) + URL compartible + grilla de tarjetas.
5. **Ficha**: `/producto/[slug]` (SSG) + islas de opciones, personalización y
   galería por color.
6. **Carrito → WhatsApp** + pieza a medida (islas + localStorage).
7. **Banners + Flash Sale**.
8. **SEO**: sitemap, metas/JSON-LD por página/producto, robots, 404.
9. **Cutover**: build de Pages a Astro, borrar lo vanilla, verificar en prod.

## Fuera de alcance

- Cambiar la API pública o el panel (`calc3d-web`).
- El modelo de negocio (sigue catálogo + WhatsApp, sin pagos).
- Rediseñar el contenido/copys (se porta lo que hay; la pasada de diseño es
  visual, no de mensaje).
