# Migración de la tienda a Astro + React + shadcn — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescribir la tienda pública sobre Astro + islas de React + Tailwind + shadcn/ui, conservando SEO, el modelo catálogo→WhatsApp y el comportamiento actual, con mejor calidad visual.

**Architecture:** Astro `output: 'static'` genera HTML por ruta y por producto (SSG con `getStaticPaths` que trae la API en build). La interacción vive en islas React (`client:visible`/`client:load`). La lógica de precios/adaptación se porta a `src/lib/*.ts` con tests. shadcn se tematiza a la marca.

**Tech Stack:** Astro 4.x, @astrojs/react, @astrojs/sitemap, Tailwind 3.x, shadcn/ui, React 18, TypeScript, vitest. Deploy: Cloudflare Pages (estático).

**Spec:** `calc3d-landing/docs/superpowers/specs/2026-10-15-migracion-astro-react-shadcn-design.md`

## Global Constraints

- **Commit por tarea en `main`. NUNCA push** (un push a Pages despliega).
- **La tienda vieja (`assets/`, `partials/`, `*.html`, `vite.config.ts`) NO se borra hasta el cutover** (Task 9): el stack nuevo convive en `src/` hasta estar verde y verificado.
- **La API pública NO se toca.** Se consumen los mismos `/api/public/store/*`.
- **SEO innegociable:** cada página y cada ficha emiten HTML con `<title>`, `description`, canonical, OG y JSON-LD; el contenido está en el HTML (no solo tras hidratar). Verificar con `view-source`/`get_page_text`, no solo a ojo.
- **shadcn tematizado a la MARCA** (navy `#000814/#001D3D/#003566`, amarillo `#FFC300/#FFD60A`, Poppins), nunca el tema por defecto.
- **Islas chicas:** `client:visible` por defecto; `client:load` solo si debe estar listo antes del scroll (carrito). Medir el JS por ruta.
- **El precio lo calcula el SERVIDOR** (no viaja en el pedido); el carrito solo muestra. Igual que hoy.
- Idioma: **español**. Puerto dev: **5182**.

## Review Focus

- **Una ficha cargada directo (sin pasar por el catálogo)** debe traer su HTML completo (SSG), no una cáscara que se llena con JS → SEO. (Verificación en Task 5.)
- **La API caída en build** rompe el SSG: el build debe fallar con un mensaje claro (y reintentos), no publicar páginas vacías. (Task 1 + 5.)
- **El carrito con un producto de opciones** debe mandar el `unitPrice` calculado en la ficha, no el precio base. (Task 6.)
- **Un producto `custom` sin R2 configurado** esconde el cargador de foto pero deja la nota (igual que hoy). (Task 5.)
- **Recargar en `/tienda/?cat=x&mat=y`** restaura los filtros y el link sigue compartible. (Task 4.)
- **JS deshabilitado / primer render**: el catálogo prerenderizado se ve (aunque sin filtros interactivos); la ficha se lee. (Task 3/4/5.)

---

### Task 1: Andamiaje — Astro + React + Tailwind + shadcn + tema de marca

**Files:**
- Create: `astro.config.mjs`, `tailwind.config.mjs`, `tsconfig.json`, `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/ui/` (shadcn), `components.json`
- Modify: `package.json` (deps + scripts), `.claude/launch.json` (sigue 5182)
- Create: `src/lib/tokens.css` (tokens de marca → variables shadcn)

**Interfaces:**
- Produces: `Base.astro` (layout con `<head>` parametrizable: title/description/og/canonical + header + footer + fuentes Poppins); el tema de marca aplicado a los tokens de shadcn (`--primary` = amarillo, `--background` = navy, etc.).

- [ ] **Step 1: Inicializar Astro + integraciones**

En una carpeta de trabajo del repo (sin borrar lo viejo):
```bash
cd calc3d-landing
pnpm add -D astro @astrojs/react @astrojs/tailwind @astrojs/sitemap tailwindcss react react-dom @types/react @types/react-dom
pnpm dlx astro add react tailwind --yes   # genera astro.config + tailwind.config
```
`astro.config.mjs`: `output: 'static'`, `site: process.env.PUBLIC_SITE_URL`, integraciones react + tailwind + sitemap, `server: { port: 5182 }`.

- [ ] **Step 2: shadcn + tema de marca**

```bash
pnpm dlx shadcn@latest init   # style: default, baseColor: slate, CSS variables: yes
```
En `src/styles/global.css` (o el que use shadcn), **sobrescribir los tokens** con los de marca: `--background: 210 100% 4%` (navy), `--primary: 44 100% 50%` (amarillo), `--foreground`, `--card`, `--border`, `--ring`, fuente Poppins. Mapear claro/oscuro al tema oscuro navy del sitio (el sitio es dark siempre). Portar las utilidades propias necesarias de `assets/styles.css`.
Agregar los componentes base: `pnpm dlx shadcn@latest add button select slider dialog input textarea badge`.

- [ ] **Step 3: Layout Base + header/footer**

`src/layouts/Base.astro`: recibe `props { title, description, canonical, image?, jsonLd? }` y arma `<head>` (title, meta description, canonical, OG, Poppins) + `<slot />`. Portar el header (nav: Inicio · Catálogo · Impresión 3D) y el footer desde `partials/` a `src/components/Header.astro` / `Footer.astro`. Incluir el topbar y la marca (logos de `assets/brand/` → `src/assets/` o `public/`).

- [ ] **Step 4: Página de humo + verificación**

Crear `src/pages/index.astro` mínima usando `Base.astro` + un `<Button>` de shadcn (isla `client:visible`) para probar que React + shadcn + tema andan.
Run: `pnpm astro dev --port 5182` y verificar en el navegador: el botón se ve con la marca (amarillo/navy), sin errores de consola; `view-source` muestra el `<title>` y el contenido estático.
Run: `pnpm astro build` → `dist/` generado sin errores.

- [ ] **Step 5: Commit**

```bash
git add astro.config.mjs tailwind.config.mjs tsconfig.json components.json src/ package.json pnpm-lock.yaml && git commit -m "feat(astro): andamiaje Astro + React + Tailwind + shadcn tematizado a la marca"
```

---

### Task 2: Lógica compartida — portar `render.js` a `src/lib/*.ts` con tests

**Files:**
- Create: `src/lib/precio.ts` (`precioConTramos`, `precioUnitarioItem`), `src/lib/producto.ts` (`adapt`, tipos), `src/lib/escape.ts`, `src/lib/api.ts` (fetch a la API pública), `src/lib/galeria.ts` (foto por color)
- Create: `src/lib/*.spec.ts` (vitest), `vitest.config.ts`
- Reference: `assets/render.js`, `assets/app.js` (fuente a portar)

**Interfaces:**
- Produces: `precioConTramos(baseUnit, qty, tiers)`, `precioUnitarioItem(item, product)`, `adapt(apiProduct) → ProductoVitrina`, `fetchProductos()`, `fetchProducto(slug)`, `fetchInfo()`, `fotosDeOpcion(producto, elegido)`. Mismos nombres/semántica que hoy, tipados.

- [ ] **Step 1: Escribir los tests (portados de `render.test.js`)**

Portar `assets/render.test.js` a `src/lib/precio.spec.ts` y `producto.spec.ts` (vitest): `precioConTramos` (tramo mayor aplicable), `precioUnitarioItem` (tramo por cantidad actual), `adapt` (forma API→vitrina), el swap de foto por color (grupo `drivesPhoto`), `escapeHtml`. Son los MISMOS casos que ya pasan en node:test.

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm vitest run` → FAIL (los módulos no existen aún).

- [ ] **Step 3: Portar la lógica**

Crear los módulos TS copiando la lógica de `assets/render.js` (es JS puro, sin DOM): `precioConTramos`, `precioUnitarioItem`, `adapt` (incluyendo `priceTiers`, `custom`, `colorList`, `optionGroups` con `drivesPhoto`/`images`), `escapeHtml/escapeAttr`, y `fotosDeOpcion` (la galería que cambia según el color del grupo `drivesPhoto`). `api.ts` con `fetch(PUBLIC_API_URL + path)` (build: Node fetch; cliente: browser fetch).

- [ ] **Step 4: Correr tests + tipos**

Run: `pnpm vitest run && pnpm astro check` → PASS, 0 errores de tipo.

- [ ] **Step 5: Commit**

```bash
git add src/lib vitest.config.ts && git commit -m "feat(astro): porta la logica de precios/producto/galeria a src/lib con tests"
```

---

### Task 3: Páginas estáticas — inicio + impresión 3D

**Files:**
- Create: `src/pages/index.astro`, `src/pages/impresion-3d/index.astro`
- Create: componentes `.astro` de secciones (hero, beneficios, proceso, FAQ) según el contenido actual
- Reference: `index.html`, `impresion-3d/index.html` (contenido a portar, YA sin resina y sin el bloque de servicio que se quitaron)

**Interfaces:**
- Consumes: `Base.astro` (Task 1), `fetchInfo()` (Task 2, para el teléfono de WhatsApp en los CTA).

- [ ] **Step 1: Portar el inicio**

`index.astro`: hero (texto actual), beneficios (4), "Cómo trabajamos" (pasos), FAQ. Todo HTML estático con los componentes shadcn donde sume (botones). El carrusel de banners y el flash sale se dejan como placeholders hasta Task 7. Los CTA de WhatsApp usan `fetchInfo().whatsappPhone` resuelto en build o como isla mínima.

- [ ] **Step 2: Portar impresión 3D**

`impresion-3d/index.astro`: materiales (PLA/PETG/ABS/TPU — SIN resina), proceso, qué se puede hacer. Contenido actual.

- [ ] **Step 3: Verificación (SEO + visual)**

Run: `pnpm astro dev`. En el navegador: las dos páginas se ven con la marca; `get_page_text`/`view-source` muestran el contenido EN EL HTML (no vacío). `<head>` con title/description/canonical/OG correctos por página.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro src/pages/impresion-3d src/components && git commit -m "feat(astro): inicio e impresion 3D como paginas estaticas"
```

---

### Task 4: Catálogo — `/tienda/` con la isla de filtros

**Files:**
- Create: `src/pages/tienda/index.astro`, `src/components/catalogo/Catalogo.tsx` (isla React), `src/components/catalogo/TarjetaProducto.tsx`, `src/components/catalogo/Filtros.tsx`
- Reference: `tienda/index.html` + `assets/app.js` (Shop) — comportamiento a replicar

**Interfaces:**
- Consumes: `fetchProductos()`, `fetchInfo()`, `adapt`, `precioConTramos` (Task 2); shadcn Select/Slider/Badge/Button (Task 1).
- Produces: la isla `Catalogo` recibe `productos` + `info` como props (traídos en build por el `.astro`) y hace el filtrado en cliente.

- [ ] **Step 1: La página `.astro` (SSG)**

`tienda/index.astro`: en el frontmatter, `const { products } = await fetchProductos(); const info = await fetchInfo();` (build). Renderiza `<Catalogo productos={...} info={...} client:load />` y, como fallback SEO, pinta las tarjetas también en HTML estático (server) para que el catálogo esté en el HTML aunque el JS no corra. Título "Catálogo — {negocio}".

- [ ] **Step 2: La isla de filtros (paridad con hoy)**

`Filtros.tsx` + `Catalogo.tsx`: estado `{ cat, materials:Set, colors:Set, maxPrice, sort }`. TODOS los filtros de un solo lado (barra lateral), como quedó: Categoría (shadcn Select), Material y Color (chips/toggles), Precio (shadcn Slider), Orden (shadcn Select). **URL compartible**: refleja `?cat&mat&col&max&sort` y los restaura al cargar (misma regla ya implementada en vanilla; portarla). Selección única de categoría; con <2 categorías se oculta.

- [ ] **Step 3: La tarjeta (distribución pareja)**

`TarjetaProducto.tsx` (o `.astro` para el fallback): foto/placeholder, insignias, título (2 líneas fijas), línea "categoría • material", desc (2 líneas), colores, y **pie en columna** (precio arriba, dos botones a todo el ancho) para que queden parejas — como se corrigió en vanilla. "Elegir" (requiresOptions) va a la ficha; "Agregar" agrega.

- [ ] **Step 4: Verificación**

Run: `pnpm astro dev`. Navegador: el catálogo se ve; filtrar por categoría/material/color/precio/orden funciona y actualiza la URL; recargar `/tienda/?cat=llaveros&sort=price-asc` restaura; las tarjetas quedan niveladas (medir el pie como se hizo). `view-source` muestra los productos en el HTML (fallback SSG).

- [ ] **Step 5: Commit**

```bash
git add src/pages/tienda src/components/catalogo && git commit -m "feat(astro): catalogo con filtros (link compartible) y tarjetas parejas"
```

---

### Task 5: Ficha — `/producto/[slug]` (SSG) + opciones + personalización + galería

**Files:**
- Create: `src/pages/producto/[slug].astro` (`getStaticPaths`), `src/components/ficha/Ficha.tsx` (isla), `src/components/ficha/Opciones.tsx`, `src/components/ficha/Personalizacion.tsx`, `src/components/ficha/Galeria.tsx`
- Reference: `producto/index.html` + `assets/render.js` (renderFichaHtml)

**Interfaces:**
- Consumes: `fetchProductos` (para `getStaticPaths`), `fetchProducto(slug)`, `adapt`, `precioConTramos`, `fotosDeOpcion`, `fetchInfo().storageReady` (Task 2).
- Produces: la ficha llama a `Carrito.add(...)` (Task 6) con el `unitPrice` ya calculado.

- [ ] **Step 1: SSG por producto**

`[slug].astro`: `export async function getStaticPaths() { const { products } = await fetchProductos(); return products.map(p => ({ params: { slug: p.slug }, props: { producto: adapt(p) } })); }`. Renderiza el contenido de la ficha en HTML estático (nombre, precio, specs, descripción, tabla de mayoreo) + las islas interactivas. `<head>` con metas + JSON-LD `Product` (reusar `metaTagsFor`/`jsonLdProduct` portados).

- [ ] **Step 2: Islas de opciones + galería + personalización**

`Opciones.tsx` (grupos de opciones, recargo por opción, precio que recalcula el tramo por cantidad), `Galeria.tsx` (swap de foto según el color del grupo `drivesPhoto`, con `fotosDeOpcion`), `Personalizacion.tsx` (si `producto.custom`: nota + cargador de foto SOLO si `info.storageReady`, sube a R2 con el flujo de 2 pasos y guarda la clave en el ítem). shadcn: Select/Textarea/Input/Button.

- [ ] **Step 3: Verificación (SEO + comportamiento)**

Run: `pnpm astro build && pnpm astro preview`. Abrir una ficha DIRECTO (sin pasar por el catálogo): `view-source` tiene el nombre/precio/specs en el HTML + el JSON-LD. En dev: cambiar color cambia la galería; elegir opciones recalcula el precio; un producto `custom` muestra la nota (y el cargador solo con R2). Sin R2, el cargador no aparece y el pedido con nota entra.

- [ ] **Step 4: Commit**

```bash
git add src/pages/producto src/components/ficha && git commit -m "feat(astro): ficha SSG por producto + opciones, galeria por color y personalizacion"
```

---

### Task 6: Carrito → WhatsApp + pieza a medida

**Files:**
- Create: `src/components/carrito/Carrito.tsx` (isla, estado en localStorage), `src/components/carrito/Checkout.tsx`, `src/components/carrito/PiezaAMedida.tsx`, `src/lib/carrito.ts` (`claveDeItem`, add/setQty/remove, `precioDeItem`)
- Reference: `assets/app.js` (Cart, Checkout, Custom, submitOrder)

**Interfaces:**
- Consumes: `precioUnitarioItem`, `fetchInfo` (teléfono), `src/lib/api` (`POST /public/store/orders`, `/custom-requests`, `/uploads/custom-url`).
- Produces: `Carrito` montado en el layout (botón flotante + cajón); `claveDeItem(id, opts, note, imageKey)` (incluye personalización).

- [ ] **Step 1: Tests de la lógica del carrito**

`src/lib/carrito.spec.ts` (vitest): `claveDeItem` distingue por opciones y por personalización; `precioDeItem` aplica el tramo por la cantidad actual; add agrupa por clave. (Portado de la lógica de `app.js`.)

- [ ] **Step 2: Correr y verificar que falla → implementar**

`carrito.ts` con la lógica (localStorage `bl_cart_v1`). Islas `Carrito`/`Checkout`/`PiezaAMedida` con shadcn (Drawer/Dialog, Input, Textarea, Button). **El precio NO viaja**: el payload es `{slug, qty, options, customNote?, customImageKey?}`. Si el envío falla, mostrar el motivo real del backend y OFRECER igual el botón de WhatsApp (regla de hoy). El carrito se vacía al CERRAR el cajón, no al enviar.

- [ ] **Step 3: Verificación**

Run: `pnpm vitest run` (PASS) + navegador: agregar un producto con opciones manda el `unitPrice` de la ficha; el pedido entra en la bandeja del panel (verificar en `/store/requests`); el botón de WhatsApp arma el mensaje; la pieza a medida intercepta y manda `/custom-requests`.

- [ ] **Step 4: Commit**

```bash
git add src/components/carrito src/lib/carrito.ts src/lib/carrito.spec.ts && git commit -m "feat(astro): carrito -> WhatsApp + pieza a medida (precio del servidor)"
```

---

### Task 7: Banners del carrusel + Flash Sale

**Files:**
- Create: `src/components/inicio/Carrusel.tsx`, `src/components/inicio/FlashSale.tsx`
- Modify: `src/pages/index.astro` (montar las dos islas)
- Reference: `assets/app.js` (banners, flash sale) + `/public/store/banners`, `/public/store/sale`

**Interfaces:**
- Consumes: `fetchBanners()`, `fetchSale()` (agregar a `src/lib/api`).

- [ ] **Step 1: Carrusel de banners**

`Carrusel.tsx`: consume `/public/store/banners`; si no hay o falla, 3 slides fijos de fallback (como hoy). Autoplay + controles accesibles.

- [ ] **Step 2: Flash Sale**

`FlashSale.tsx`: consume `/public/store/sale`; `{ sale: null }` → sección oculta. Con datos: título, contador regresivo hasta `endsAt` (al llegar a 0, "Oferta finalizada"), productos con `compareAtUsd > priceUsd` + badge `-XX%`. Reusa la tarjeta.

- [ ] **Step 3: Verificación**

Navegador: con banners cargados se ven; sin banners, el fallback; el flash sale aparece solo con ventana activa + productos en oferta y el contador corre.

- [ ] **Step 4: Commit**

```bash
git add src/components/inicio src/pages/index.astro src/lib/api.ts && git commit -m "feat(astro): carrusel de banners + flash sale"
```

---

### Task 8: SEO — sitemap, metas por página/producto, robots, 404

**Files:**
- Modify: `astro.config.mjs` (@astrojs/sitemap), `src/pages/404.astro`, `public/robots.txt`
- Verify: metas/JSON-LD de todas las rutas

**Interfaces:**
- Consumes: `site` en `astro.config` (dominio).

- [ ] **Step 1: Sitemap + robots + 404**

Activar `@astrojs/sitemap` (incluye las fichas, que hoy quedaban afuera). `robots.txt` apuntando al sitemap. `404.astro` con la marca (no 404 blando: la ruta inexistente da 404 real).

- [ ] **Step 2: Auditar metas**

Recorrer inicio, catálogo, impresión 3D y 2-3 fichas: cada una con `<title>` único, `description`, canonical, OG completo y, en las fichas, JSON-LD `Product` válido. Verificar en el HTML construido (`dist/`), no en dev.

- [ ] **Step 3: Verificación**

Run: `pnpm astro build`. Revisar `dist/sitemap-index.xml` (incluye `/producto/*`), `dist/404.html`, y el `<head>` de las páginas construidas. Validar un JSON-LD con un linter.

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs public/robots.txt src/pages/404.astro && git commit -m "feat(astro): sitemap con fichas, robots, 404 y metas/JSON-LD por pagina"
```

---

### Task 9: Cutover — build de Pages a Astro + borrar lo vanilla

**Files:**
- Delete: `assets/`, `partials/`, `index.html`, `tienda/`, `producto/`, `impresion-3d/` (los `.html` viejos), `vite.config.ts`, el plugin de prerender
- Modify: `package.json` (scripts a Astro), `.claude/launch.json`, `README`/`CLAUDE.md` del repo
- Doc: actualizar `calc3d-landing/CLAUDE.md` (ya NO es vanilla)

**Interfaces:**
- Consumes: todo lo anterior verde y verificado.

- [ ] **Step 1: Verificación integral ANTES de borrar**

Con el stack nuevo: `pnpm astro build` limpio, `pnpm vitest run` verde, y una pasada por el navegador de las 4 páginas + 2 fichas + carrito + personalización + filtros + flash sale, contra la API local. Confirmar paridad con la vieja.

- [ ] **Step 2: Borrar lo vanilla + ajustar scripts**

Eliminar los archivos vanilla (arriba). `package.json` scripts: `dev: astro dev --port 5182`, `build: astro build`, `preview: astro preview`, `test: vitest run`. `.claude/launch.json` → `astro dev --port 5182 --strictPort`.

- [ ] **Step 3: Actualizar la doc del repo**

Reescribir el `CLAUDE.md` de `calc3d-landing`: ya NO es vanilla; es Astro + React + shadcn; dónde viven las páginas (`src/pages`), las islas (`src/components`), la lógica (`src/lib`); cómo se despliega en Pages (nuevo comando/salida).

- [ ] **Step 4: Config de despliegue (Cloudflare Pages)**

Documentar (no aplicar sin pedir): comando de build `pnpm install && pnpm build`, salida `dist/`, variables `PUBLIC_API_URL`, `PUBLIC_SITE_URL`, `NODE_VERSION`, `PNPM_VERSION`. El `_redirects` deja de hacer falta (Astro genera HTML por ruta); mantener/ajustar según 404.

- [ ] **Step 5: Verificación final + Commit**

Run: `pnpm build` + `pnpm preview`, pasada final en el navegador. Commit:
```bash
git add -A && git commit -m "chore(astro): cutover — borra la tienda vanilla, scripts y doc a Astro"
```
(El push/despliegue a producción se hace SOLO cuando el dueño lo pida.)

---

## Self-Review

**Spec coverage:** andamiaje+tema → T1; lógica compartida → T2; estáticas → T3; catálogo+filtros compartibles → T4; ficha SSG+opciones+personalización+galería → T5; carrito→WhatsApp → T6; banners+flash sale → T7; SEO → T8; cutover+doc+deploy → T9. ✔

**Placeholder scan:** las tareas de UI dan comandos reales (astro/shadcn), rutas de archivo exactas y la verificación por tarea; el "código" de las islas se porta del comportamiento actual (referenciado por archivo) y se fija con tests (lib) + verificación en navegador (islas), que es el nivel honesto para una migración. Sin "TBD". ✔

**Type consistency:** `adapt`/`precioConTramos`/`precioUnitarioItem`/`fotosDeOpcion`/`claveDeItem` tipados en T2 y consumidos igual en T4/T5/T6. Props `productos`/`producto`/`info` de las islas, consistentes. ✔

**Review Focus:** ficha directa con HTML (SEO) → T5; API caída en build → T1/T5; carrito con unitPrice de la ficha → T6; custom sin R2 → T5; URL de filtros compartible → T4; sin JS/primer render → T3/T4/T5. ✔

## Riesgo principal
El **SEO** (que la ficha y el catálogo emitan HTML completo por SSG) y la **paridad de comportamiento** del carrito/filtros/personalización. Se cubren con verificación de `view-source`/`dist` en cada tarea de página y tests de la lógica portada. La **tienda vieja vive hasta T9**, así que nada se rompe en producción hasta el cutover explícito.
