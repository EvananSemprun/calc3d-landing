# Banano Lab — sitio público

Sitio web de **Banano Lab**, un taller venezolano de fabricación digital con dos
mitades: **impresión 3D** (piezas bajo pedido) y **software a medida**. El sitio
muestra los servicios, publica el catálogo de productos y recibe pedidos y
solicitudes de cotización.

No es un ecommerce con pasarela de pago: el pedido se **registra** en la bandeja
del panel (`calc3d-web`) y se cierra por WhatsApp. Fue una decisión explícita, no
una etapa pendiente. El detalle de por qué está en [`CLAUDE.md`](CLAUDE.md).

## Ojo con el nombre del repo

**El repo se llama `calc3d-landing` pero su contenido es el sitio de Banano Lab.**
Antes vivía acá la landing comercial del SaaS "Cotiza3D"; se descartó y en su lugar
se mudó el contenido del repo `calc3d-store`, para aprovechar la historia git y el
remoto de GitHub que ya existían. **No se renombra a propósito** (decisión del
dueño); por eso el `package.json` también sigue diciendo `@calc3d/store`. La
landing vieja sigue recuperable del historial:

```bash
git show 925c532:index.html
```

## Stack

Vite + HTML + CSS + JavaScript de navegador. **Sin React**, a propósito: es una
vitrina de solo lectura, el HTML plano se indexa sin trucos y el bundle queda en
~20 KB (10 KB gzip). Un framework no aportaría nada acá.

Tres plugins propios en `vite.config.ts`:

- `parciales()` — inyecta `partials/header.html` y `partials/footer.html` en cada
  página en tiempo de build (no con JS, para que los enlaces internos existan en
  el HTML).
- `seo()` — genera `robots.txt` y `sitemap.xml` a partir de la misma lista de
  páginas con la que se compila.
- `rutasLimpias()` — resuelve `/tienda/`, `/producto/{slug}`, etc. en el servidor
  de desarrollo. En producción eso lo hace nginx.

## Páginas

| Ruta | Archivo | Qué es |
|---|---|---|
| `/` | `index.html` | Inicio: las dos mitades del negocio, destacados, proceso, FAQ |
| `/tienda/` | `tienda/index.html` | Vitrina/catálogo con filtros y carrito |
| `/producto/{slug}` | `producto/index.html` | Ficha de producto (un solo HTML para todos los slugs) |
| `/impresion-3d/` | `impresion-3d/index.html` | Servicio de impresión 3D: materiales, proceso, alcance |
| `/programacion/` | `programacion/index.html` | Servicio de desarrollo de software |
| `/calculadora/` | `calculadora/index.html` | Estimador por rangos de proyectos de programación |

## Levantarlo

```bash
pnpm install
pnpm dev        # http://localhost:5182
pnpm build      # genera dist/
pnpm preview    # sirve dist/
```

`pnpm-workspace.yaml` autoriza el postinstall de **esbuild**; sin eso `pnpm`
aborta la instalación.

El puerto **5182** está fijado en `vite.config.ts` y en `.claude/launch.json` (que
además pasa `--strictPort`): tiene que coincidir con el origen que la API acepta en
`STORE_ORIGIN`, o el navegador bloquea las peticiones por CORS.

## Variables de entorno

Copiar `.env.example` y completar:

| Variable | Para qué |
|---|---|
| `VITE_API_URL` | URL de la API pública de Calc3D, sin barra final (dev: `http://localhost:3001/api`) |
| `VITE_SITE_URL` | Dominio público del sitio, sin barra final (ej. `https://ejemplo.com`) |

⚠️ **Las dos se hornean en el build**: Vite las resuelve al compilar, no en tiempo
de ejecución. En Docker van como `--build-arg`, **no** como variables de runtime
del contenedor; cambiarlas exige recompilar.

Sin `VITE_SITE_URL` el build **no emite `sitemap.xml`** y avisa por consola (un
sitemap con el dominio equivocado es peor que no tenerlo: los buscadores descartan
las URLs de otro dominio). El `robots.txt` igual se genera, sin la línea `Sitemap:`.

## Relación con la API

Los datos del catálogo, la info del negocio y la tasa en bolívares los trae en el
cliente la API pública de `calc3d-api`, bajo `/api/public/store/*`. Los pedidos y
las solicitudes de pieza a medida se escriben en `POST /public/store/orders` y
`/public/store/custom-requests`.

Del lado de la API hace falta:

- `STORE_ORGANIZATION_ID` — de qué organización se publica el catálogo.
- `STORE_ORIGIN` — el origen de este sitio, para CORS.

## Despliegue

`Dockerfile` de dos etapas: compila con Node 20 + pnpm y sirve `dist/` con nginx
(`nginx.conf`, puerto 80).

```bash
docker build \
  --build-arg VITE_API_URL=https://api.ejemplo.com/api \
  --build-arg VITE_SITE_URL=https://ejemplo.com \
  -t banano-lab-web .
```

`nginx.conf` agrega cabeceras de seguridad, cachea `/assets/` por un año (llevan
hash en el nombre) y devuelve **404** ante una ruta inexistente en vez del inicio,
para no generar "404 blandos".

## Pendientes conocidos

- **Dominio sin decidir.** Hasta que exista, `VITE_SITE_URL` queda vacía y no hay
  sitemap.
- **Los precios del estimador (`/calculadora/`) son provisionales.** Viven en la
  constante `PRECIOS` al tope de su `<script>`. Hay que ajustarlos a lo que de
  verdad se cobra antes de publicar.
- **La vitrina y las fichas no se indexan.** Se pintan en el cliente, así que un
  buscador ve una página vacía; por eso no están en el sitemap. Hay que
  pre-renderizarlas en el build o aceptar que no aparezcan. Las demás páginas
  tienen su contenido en el HTML y se indexan bien.

Documentación interna (decisiones de diseño, contrato de datos, seguridad, qué se
tomó de cada prototipo): [`CLAUDE.md`](CLAUDE.md).
