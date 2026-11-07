# CLAUDE.md — `calc3d-landing` (la tienda pública de Banano Lab)

Vitrina pública del catálogo de **Banano Lab**. Cuarto repo del proyecto, hermano de
`calc3d-api` y `calc3d-web`. Idioma de UI y respuestas: **español**.

## ⚠️ El nombre miente: esto NO es una landing

El repo se llama `calc3d-landing`, pero el contenido es la **tienda** (el ex
`calc3d-store`). Incoherencia deliberada: se fusionaron los dos repos y el dueño decidió
**no renombrar** para conservar la historia git y el remoto
(`https://github.com/EvananSemprun/calc3d-landing.git`). Por eso el `package.json` sigue
diciendo `@calc3d/store`.

## Stack: Astro + React + Tailwind 4 + shadcn (migrado el 2026-10-15)

Hasta el 2026-10-15 la tienda era HTML/CSS/JS **vanilla** (sin React). Se reescribió a
**Astro** (sitio estático) + **islas de React** (solo lo interactivo) + **Tailwind 4** +
**shadcn/ui**, para ganar una base de componentes de mejor calidad **sin perder el SEO**
(Astro genera HTML por ruta; las islas hidratan solo lo que lo necesita). La vanilla
quedó en el historial git (último estado vanilla: el commit anterior al cutover).

```
pnpm install        # instala deps
pnpm dev            # http://localhost:5182  (astro dev --strictPort)
pnpm build          # dist/  (SSG: pega a la API en el build, ver abajo)
pnpm preview        # sirve dist/
pnpm check          # astro check (tipos)
pnpm test           # vitest (la lógica de src/lib)
```

⚠️ **El puerto 5182 está fijado y debe coincidir** (`astro.config.mjs` `server.port`
y `.claude/launch.json`). La API valida este origen exacto en CORS (`STORE_ORIGIN`): en
otro puerto el navegador bloquea las peticiones del cliente (carrito, info, flash sale) y
el error no menciona el puerto. `--strictPort` hace fallar si está ocupado en vez de
saltar a otro.

### Estructura (`src/`)
- `src/pages/` — las rutas. `index.astro` (inicio), `tienda/index.astro` (catálogo),
  `producto/[slug].astro` (ficha, **una página por producto** vía `getStaticPaths`),
  `impresion-3d/index.astro`, `404.astro`, `robots.txt.ts` (robots dinámico).
- `src/layouts/Base.astro` — `<head>` parametrizable (title/description/canonical/OG/
  jsonLd/ogType + slot `head`), cabecera, pie, y monta las islas globales (carrito,
  pieza a medida, WhatsApp).
- `src/components/` — `.astro` para lo estático (Header, Footer, secciones del inicio) y
  `.tsx` para las **islas**: `catalogo/` (filtros + tarjeta), `ficha/` (galería, opciones,
  personalización), `carrito/` (cajón + checkout + pieza a medida), `inicio/` (carrusel +
  flash sale). `components/ui/` son los primitivos de shadcn.
- `src/lib/` — **lógica pura con tests** (vitest): `precio`, `producto` (`adapt` + tipos),
  `galeria`, `ficha`, `carrito` (estado localStorage), `pedido`, `telefono`, `banner`,
  `escape`, `subir-foto`, `api` (lectura), `api-escritura` (las 2 escrituras).
- `src/styles/global.css` — Tailwind 4 **CSS-first** (`@theme inline`) + utilidades
  propias portadas, en `@layer components`. `src/lib/tokens.css` = paleta de marca →
  tokens de shadcn.

### Reglas del stack que NO hay que romper
- **Tailwind 4, no 3** (Astro 7 dejó de soportar `@astrojs/tailwind`): va
  `@tailwindcss/vite`, **no hay `tailwind.config`**. El `.container` de marca es un
  `@utility` (gana por emisión sobre la `.container` built-in de Tailwind 4).
- **Botones/insignias: shadcn** (`Button`, `Badge`, `buttonVariants`), NO un `.btn`/`.badge`
  propio — evita un sistema de botones paralelo.
- **Imágenes sin `sharp`**: `<img src={import.src}>`, no `astro:assets` `<Image>`.
- ⚠️ **shadcn CLI en Windows**: `pnpm dlx shadcn` falla (`@shadcn/registry`); usar
  `npx --yes shadcn@latest add <comp>` y revisar que los imports queden en `@/lib/utils`.
- `typescript` pineado en `^6` (astro check rechaza TS 7).

## Qué es y qué NO es
- **Es** un catálogo de **solo lectura** que consume la API pública de `calc3d-api`
  (`/public/store/*`). Sin sesión, sin datos personales guardados.
- **NO es** un ecommerce con pago. El pedido se **registra** en la bandeja del panel y se
  **cierra por WhatsApp** (decisión explícita: evita pasarela y toda la superficie de
  seguridad de los pagos).
- **NO hay cuentas de cliente.** Se pide como invitado: nombre + WhatsApp.

## SEO (lo que NO se puede regresar)
- Una página HTML por ruta **y por producto**, con su `<title>`, `description`, canonical,
  OG y, en las fichas, **JSON-LD `Product`**. El contenido está en el HTML (las islas lo
  SSR-renderizan en el build), no solo tras hidratar.
- `@astrojs/sitemap` genera el sitemap **incluyendo las fichas** (`/producto/*`) — ventaja
  sobre la vanilla, que las dejaba afuera. `robots.txt` (dinámico, `src/pages/robots.txt.ts`)
  apunta al sitemap absoluto. Una ruta inexistente da **404 real** (`404.astro` → `dist/404.html`).
- **Necesita `PUBLIC_SITE_URL`** (dominio sin barra final) para el sitemap y las canónicas
  absolutas; sin ella se omiten.

## El build pega a la API (SSG)
El build del **catálogo, las fichas y el inicio** trae los productos/categorías/info de la
API **en el build** (`getStaticPaths` / frontmatter) y los deja como HTML. Por eso **la API
tiene que estar arriba en el build**; si cae, el build **falla fuerte** (no publica un
catálogo vacío). El inicio también dejó de ser API-independiente (sus destacados y bloques
por categoría son SSG). Local: `PUBLIC_API_URL=http://localhost:3001/api pnpm build`.

## Carrito → WhatsApp: la única escritura (y sus reglas)
`api-escritura.ts` (`enviarPedido`, `enviarConsulta`) es lo único que **escribe**:
`POST /public/store/orders` y `/custom-requests`. Cuatro cosas que no hay que romper:
1. **El precio NO se manda.** El payload lleva `{slug, qty, options, customNote?,
   customImageKey?}` y nada más; el total lo calcula el servidor. `itemsParaPedido` descarta
   todo lo demás del renglón.
2. **El renglón del carrito guarda el unitario PRE-TRAMO** (base + recargos de opción); el
   descuento por mayoreo lo aplica `precioUnitarioItem`/`precioRenglon` con la cantidad
   ACTUAL. Guardarlo ya con descuento lo aplicaría dos veces.
3. **El carrito DENORMALIZA** el nombre/imagen/tramos/mínimo en cada renglón al agregarlo,
   para renderizar el cajón **sin re-traer el catálogo** en cada página (robusto, sin
   depender de CORS para mostrar). Solo el ENVÍO del pedido y el WhatsApp usan la API.
4. **Nunca se pierde la venta**: si el POST falla, se muestra el motivo real del backend y
   se ofrece **igual** el botón de WhatsApp. El carrito se vacía al **cerrar** el cajón
   (tras enviar), no al enviar.

La **pieza a medida** (`PiezaAMedida`) intercepta los enlaces `[data-bl="cotizar"]` por
delegación con `preventDefault`; si el JS falla, el enlace a WhatsApp (que pone
`WhatsappCotizar`) sigue andando.

## Filtros del catálogo
Todos los filtros en la **barra lateral** (decisión del dueño): **Categoría = SELECT**
(selección única, oculto con <2 categorías — revirtió las pestañas), **Material/Color =
chips** multi-selección, **Precio = slider**, **Orden = select**. Las listas salen de los
productos reales. La vista es **compartible por URL** (`?cat&mat&col&max&sort`) y se
restaura al recargar.

## Personalización (productos `custom`)
Nota opcional + foto opcional. La foto **solo** si la API reporta `storageReady` (R2
configurado): se sube en dos pasos (`subir-foto.ts` → `/uploads/custom-url` → PUT firmado)
y viaja solo la **clave**. Sin R2, el cargador no aparece y el pedido entra con la nota.

## Carrusel y Flash Sale
- **Carrusel**: 3 slides FIJOS en el build (SEO + instantáneo) que una isla reemplaza con
  los banners del panel (`/public/store/banners`) si hay. Autoplay con pausa al hover,
  respeta `prefers-reduced-motion`, un solo `h1` por página.
- **Flash Sale**: isla que consume `/public/store/sale`; `{ sale: null }` → oculta. Contador
  regresivo; el precio cobrado NO cambia (solo tacha + badge `-XX%`).

## Marca (fuente de verdad del CSS en `src/styles`)
Navy + amarillo, Poppins, oscuro siempre (`<html class="dark">`). Paleta en
`src/lib/tokens.css` (`--ink-900 #000814`, `--ink-700 #001D3D`, `--ink-600 #003566`,
`--yellow #FFC300`, `--yellow-2 #FFD60A`). Logo/isotipo/mascotas en `src/assets/brand/`.
**No** inventar contadores, reseñas ni portafolio: solo lo verdadero.

## Seguridad
- Todo lo interpolado se **escapa** (`escape.ts`; el JSON-LD escapa `<` para que un
  `</script>` del dueño no rompa la etiqueta).
- La API pública **nunca** devuelve costos ni el origen de costeo (fijado con tests en
  `calc3d-api`).
- Cabeceras de seguridad: `public/_headers` (Cloudflare Pages) y `nginx.conf` (contenedor).
  Desde la auditoría del 2026-11-05 incluye **HSTS**, agregado antes de comprar el dominio
  (solo actúa sobre HTTPS, y ponerlo después deja sin él a la primera gente que entre).
  ⚠️ **Sigue sin CSP a propósito**: tiene que listar R2 en `img-src` y la API en
  `connect-src`, y mal puesto no avisa — deja las fotos en blanco. Y el bloque de caché
  de `/_astro/*` que está debajo **no es decorativo**: al editar ese archivo, conservarlo.

## Despliegue (Cloudflare Pages) — dominio `bananolab-3d.com`

El dominio se compró el 2026-11-07 (sin `www`, decisión del dueño). El panel se
quedó en `calc3d-web.pages.dev`; este repo es el que lleva dominio propio.

| Configuración de compilación | Valor |
|---|---|
| Valor preestablecido del marco | Ninguno |
| Comando de compilación | `pnpm install --frozen-lockfile && pnpm build` |
| Directorio de salida | `dist` |
| Directorio raíz | vacío |
| Rama de producción | `main` |

| Variable (tipo **Texto**, no Secreto) | Valor |
|---|---|
| `PUBLIC_API_URL` | `https://calc3d-api-production.up.railway.app/api` |
| `PUBLIC_SITE_URL` | `https://bananolab-3d.com` |
| `NODE_VERSION` | `22.18.0` (Astro 7 pide >=22.12; pnpm 11 pide >=22.13) |
| `PNPM_VERSION` | `11.6.0` |

- ⚠️ **`PUBLIC_`, NO `VITE_`.** Astro solo expone al navegador lo que empieza con
  `PUBLIC_`. Con `VITE_` el build sale **verde** y la tienda publicada le habla a
  `http://localhost:3001/api` (hay respaldo en `api.ts`): fichas vacías, sin un solo
  error. El `.env.example` documentó los nombres equivocados hasta el 2026-11-07; ahora
  lo vigila **`src/env.spec.ts`**, que falla si el archivo y el código divergen.
- ⚠️ **`PUBLIC_API_URL` TIENE que terminar en `/api`** (`setGlobalPrefix('api')`), o todo
  da 404 — y el síntoma parece CORS.
- ⚠️ **Cloudflare ahora empuja a crear un WORKER, no un Pages.** Al "Crear", hay que
  entrar explícitamente a la pestaña **Pages → Conectar a Git**. Un Worker se reconoce
  porque su configuración muestra «Implementar comando: `npx wrangler deploy`» y **no
  tiene campo "Directorio de salida"**; falla porque espera un `wrangler.jsonc` en el
  repo, que este proyecto no tiene. Pasó el 2026-11-07: el primer intento se creó como
  Worker y se borró.
- ⚠️ El build prerenderiza pegándole a la API → **la API tiene que estar arriba en el
  build**; si cae, el build falla fuerte (no publica un catálogo vacío).
- **Del lado de la API (Railway), `STORE_ORIGIN`** tiene que incluir
  `https://bananolab-3d.com` o la tienda muere en CORS.
- **Del lado de R2, la política CORS del bucket** tiene que incluir ese mismo origen: la
  tienda sube la foto que el cliente adjunta y ese `PUT` va del navegador **directo al
  bucket** (ver `calc3d-api/CLAUDE.md`, «LA POLÍTICA CORS DEL BUCKET ES OBLIGATORIA»).
- Verificar el despliegue **por CONTENIDO**, no por el ✅ de Cloudflare: que el bundle
  tenga la URL de Railway, que no quede ningún `localhost`, y que `sitemap-0.xml` y
  `robots.txt` digan `bananolab-3d.com`.
- El `Dockerfile` + `nginx.conf` son una opción de contenedor; **producción va en Pages**,
  no en el Dockerfile.

## Entorno
- Windows / PowerShell para los comandos. `pnpm-workspace.yaml` autoriza el postinstall de
  esbuild.
- `.env` reales NO se versionan ni se editan por iniciativa propia; usar `.env.example`.

## Git
- No hacer commit ni push salvo que se pida. Un push a `main` **despliega** en Pages.
