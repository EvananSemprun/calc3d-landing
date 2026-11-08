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
- `src/pages/` — las rutas. `index.astro` (inicio), `tienda/index.astro` (índice de
  categorías + destacados; **ya no lista el catálogo entero**), `producto/[slug].astro`
  (ficha, **una página por producto** vía `getStaticPaths`), `impresion-3d/index.astro`,
  `404.astro`, `robots.txt.ts` (robots dinámico) e `indice-busqueda.json.ts` (el índice
  del buscador, generado en el build).
  - **Listados por categoría** (todos pintan `components/catalogo/ListadoCategoria.astro`):
    `/tienda/<cat>/`, `/tienda/<cat>/<sub>/` y, de la página 2 en adelante,
    `/tienda/<cat>/pagina/<n>/` y `/tienda/<cat>/<sub>/pagina/<n>/`. `pagina` va en el
    MEDIO: con `/tienda/<cat>/2/` el número chocaría con una subcategoría. La página 1 es
    la ruta sin `pagina` (dos URLs para el mismo contenido sería contenido duplicado).
    Solo existen los listados que tienen productos (una ruta vacía sería una página en
    blanco indexable). Los `getStaticPaths` de las cuatro salen de `rutasDeListado`.
  - **`/tienda/sin-categoria/`**: el listado de los productos sin categoría (o con una
    que ya no existe), para que no queden invisibles. ⚠️ **NO es una categoría**:
    (`Listado.sinCategoria`) queda fuera de `raices` —es decir, del pie de TODAS las
    páginas—, lleva `noindex` (también sus páginas de paginado) y está filtrado del
    sitemap en `astro.config.mjs`. Solo aparece en el índice de `/tienda/`
    (`categoriasDelIndice`). Antes un solo producto sin asignar ponía un enlace
    "Sin categoría" en el pie del sitio entero. Una categoría real con ese slug
    **rompe el build** a propósito.
- `src/layouts/Base.astro` — `<head>` parametrizable (title/description/canonical/OG/
  jsonLd/ogType + slot `head`), cabecera, pie, y monta las islas globales (carrito,
  pieza a medida, WhatsApp).
- `src/components/` — `.astro` para lo estático (Header, Footer, secciones del inicio) y
  `.tsx` para las **islas**: `catalogo/` (filtros + tarjeta), `ficha/` (galería, opciones,
  personalización), `carrito/` (cajón + checkout + pieza a medida), `inicio/` (hero
  estático + flash sale). `components/ui/` son los primitivos de shadcn.
- `src/lib/` — **lógica pura con tests** (vitest): `precio`, `producto` (`adapt` + tipos),
  `galeria`, `ficha`, `carrito` (estado localStorage), `pedido`, `telefono`, `banner`,
  `escape`, `subir-foto`, `api` (lectura), `api-escritura` (las 2 escrituras).
  - `tienda-build.ts` → **`cargarTienda()`**: trae productos (ligeros y completos),
    categorías, info **y los `banners` del hero** **una sola vez** y los reparte a todas
    las páginas (los banners son la única pieza tolerante: si fallan, el hero usa su arte
    propio en vez de romper el build). Con una petición
    por página, mil productos en cien listados reventarían el límite público (120/min).
    Si la API falla, el build **falla** (publicar un catálogo vacío sería peor).
    ⚠️ **Memoiza PARA SIEMPRE**: en `pnpm dev` un producto nuevo no aparece hasta
    **reiniciar** el servidor. Toda página que necesite catálogo, categorías o info
    tiene que pedirlo ahí, no con su propio `fetch`: `producto/[slug].astro` tenía los
    suyos y el pie de las 1.002 fichas podía salir distinto del resto si el dueño editaba
    una categoría a mitad del build. Por eso `fetchProducto` (uno por uno) se borró: era
    el camino para reintroducir el N+1.
  - `paginacion.ts` — `POR_PAGINA` (24), `listadosDe`, `rutaDeCategoria`/`rutaDePagina`,
    `indiceDeCategoria`. `producto.ts` — `rutaFicha(slug)` (con barra final: es la URL
    servida, la del sitemap y la canónica; todo enlace a una ficha sale de ahí),
    `lineaDeTarjeta`, y **`textoDeEntrega`/`textoDeMinimo`**: los textos «Listo en N» y
    «Mínimo N». ⚠️ Esos dos los pintan la tarjeta del catálogo **y** los hechos de la
    ficha; estuvieron escritos a mano en los dos lados y solo uno tenía test, así que
    cambiar el probado dejaba todas las tarjetas diciendo lo viejo con la suite en verde.
    Hay **una** definición: si hace falta un tercer consumidor, sale de ahí.
  - `portada.ts` — qué entra en la franja «Destacados»: `destacadosDe` (primero los que
    tienen insignia, después el resto; sin `sort`) + los dos topes, `TOPE_DESTACADOS` (4,
    la portada: una fila) y `TOPE_DESTACADOS_TIENDA` (8, el índice de `/tienda/`: dos
    filas). ⚠️ **Las dos pantallas usan `destacadosDe`**; lo único que cambia es el tope.
    Una de las dos con `slice` hacía que la insignia del panel sirviera en una y no en la
    otra, con el mismo rótulo «Destacados» en pantalla.
  - `indice-busqueda.ts` — el buscador (`components/catalogo/Buscador.tsx`, en el
    inicio): pide `/indice-busqueda.json` la primera vez que se enfoca el campo y filtra
    en el navegador. Si el JS falla, el campo no hace nada y el resto anda.
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

## Transiciones de vista: `<ClientRouter />` (desde 2026-11-07)

`Base.astro` monta **`<ClientRouter />`** de `astro:transitions` (en Astro 7 se llama
así; `<ViewTransitions />` es el nombre viejo, hasta Astro 5). La navegación entre
páginas ya **no recarga**: hace un fundido y reemplaza el `<body>`.

⚠️ **Esa es la regla que rompe cosas sin avisar:** todo `<script>` que se engancha una
sola vez al evaluarse queda colgado de un elemento que ya no está en el DOM. No hay
error en consola, los tipos compilan y el build sale **verde** — el botón simplemente
deja de hacer nada. Pasó con tres: el menú del `Header`, el CTA de WhatsApp
(`WhatsappCotizar`, que se quedaba en `href="#"`: **una venta perdida**) y la insignia
del carrito. Los tres se recablean en **`astro:page-load`**, que dispara en la carga
inicial *y* en cada navegación.

- **El recableado va en los DOS momentos** (al evaluar el módulo **y** en
  `astro:page-load`): ese evento lo dispara el módulo del router, así que **no existe si
  `ClientRouter` no está montado**. Cablear solo en el evento deja el sitio muerto si
  alguien saca el router.
- **`src/scripts-recableados.spec.ts`** es la regresión: falla si un `<script>` de
  `src/components` o `src/layouts` engancha un listener sin recablearse. Busca la
  **llamada**, no la palabra (con un `includes` se daba por satisfecho con los
  comentarios que nombran el evento).
- ⚠️ **`history.replaceState` nunca con `null`.** En el estado de historia vive el del
  router (`{index, scrollX, scrollY}`) y su `onPopState` arranca con
  `if (ev.state === null) return`: pisarlo deja la entrada muda y **el botón ATRÁS cambia
  la URL sin cambiar la pantalla**. Hay que reusar `window.history.state` (lo hace
  `Catalogo.tsx`, que refleja los filtros en la URL). ⚠️ **Y prohibir solo `null` no
  alcanza: las otras formas rompen PEOR.** Medido: con `undefined`, `history.state` queda
  `undefined`, el `=== null` del router **no corta**, sigue y revienta con
  `TypeError: Cannot read properties of undefined (reading 'index')` — de fallo silencioso
  pasa a excepción en cada ATRÁS; con `{}` o cualquier objeto ajeno tampoco corta y el
  índice de historia queda basura. La regresión es
  **`src/estado-de-historia.spec.ts`**, y exige el invariante real: que el primer argumento
  **sea** `window.history.state` o un `{ ...window.history.state, … }`.
- ⚠️ **El scroll de la navegación lo arregla `Base.astro`, no el router** (2026-11-07).
  El router restaura la posición de lectura con un `scrollTo` hecho **justo después del
  swap**, cuando la página destino todavía no recuperó su alto (islas `client:visible` sin
  hidratar, fotos de R2 sin dimensiones): el destino se **recortaba** a lo que entraba y
  el `scrollend` posterior guardaba ESE valor recortado en la entrada de historia, así que
  la posición real no se recuperaba nunca más. Y ese `scrollTo` va en la forma de **dos
  argumentos** (sin `behavior`), así que `html { scroll-behavior: smooth }` lo volvía un
  deslizamiento animado en cada atrás/adelante (medido: 27 pasos en 530 ms). El script de
  navegación de `Base.astro`:
  - pone **`data-bl-navegando`** en `<html>` para apagar el `smooth` (la regla está en
    `global.css`, **sin capa**), y ⚠️ **lo pone DENTRO del swap, envolviendo `ev.swap` de
    `astro:before-swap`** — ésa es la pieza que no es obvia. `swapRootAttributes` de Astro
    hace `removeAttribute` de **TODOS** los atributos de `<html>`, y el `scrollTo` del
    router va después de eso y antes de `astro:after-swap`: un atributo puesto en
    `astro:before-preparation` llega **muerto** justo al instante que importa (medido en el
    momento exacto de la llamada: `navegando: false`, `scroll-behavior: "smooth"`).
    `ev.swap` es `writable` a propósito y es el único punto entre el swap y el `scrollTo`.
  - **captura el destino en `astro:before-preparation`**, antes de que el router pueda
    pisarlo — después del swap `history.state` ya puede estar contaminado;
  - **reintenta llegar mientras el documento crece** (ventana de 1 s), siempre con
    `behavior: 'instant'`; al aterrizar bien, el `scrollend` del router deja la entrada
    sana.
  - ⚠️ **Y abandona el reintento si se movió el usuario**, con DOS detecciones porque
    ninguna sola alcanza: por **intención** (`wheel`/`touchmove`/`keydown`, que avisan
    incluso cuando el scroll no se mueve — rueda hacia abajo estando ya en el tope
    recortado) y por **posición** (si `scrollY` cambió respecto de lo último que puso el
    script y el alto **no** cambió, lo movió otro). La segunda es la que no adivina la
    fuente: arrastrar la barra de scroll, el autoscroll del botón del medio y arrastrar una
    selección **no emiten ninguno** de esos tres eventos, y sin ella el reintento traía al
    usuario de vuelta al cuadro siguiente. Recuperar su posición es un favor, no una orden.
  - ⚠️ **No se quitó `html { scroll-behavior: smooth }`** (la alternativa): obligaría a un
    listener de clics recableado en `astro:page-load` para que los anclas con hash sigan
    deslizándose, o sea la clase de fallo silencioso que este repo viene cerrando, a cambio
    de algo que hoy funciona bien.
- ⚠️ **Un ancla con `href="#"` el router la toma por navegación** (`new URL('#', …).hash`
  es `''`, así que el atajo de hash no aplica): apila una entrada basura `/#` y el swap se
  lleva lo que haya abierto. Los CTA de cotizar llevan **`data-astro-reload`** para que el
  router se abstenga.
- ⚠️ **La animación `entrada` NO corre al navegar** (2026-11-07). `entrada` se diseñó
  como animación **de carga**, y montar el router convirtió cada clic en una carga: el
  fundido de la transición y la entrada corrían encima, así que la página destino se veía
  **casi vacía** durante los 250 ms del fundido (`entrada` la retiene en opacidad 0), el
  `h1` se fundía dos veces y la grilla no se veía hasta 633 ms después del clic; en ATRÁS
  se **re-escenificaba** una página ya vista (8 animaciones + el fundido + el scroll).
  `Base.astro` pone **`data-bl-navegado`** dentro del swap (envolviendo `ev.swap`, el mismo
  punto que `data-bl-navegando` y por la misma razón: `swapRootAttributes` borra los
  atributos de `<html>`; antes se ponía en `astro:after-swap`, que funcionaba porque entre
  el swap y ese evento no hay repintado, pero dejaba una ventana sin motivo) y `global.css`
  apaga `entrada` con ese atributo. Medido después:
  **0** animaciones `entrada` al navegar y la grilla visible a los **38 ms**; en una carga
  completa siguen estando. **El fundido se queda**: es el movimiento que le corresponde a
  cambiar de página.
- **`prefers-reduced-motion`**: la guardia de la transición está en `global.css`
  (bloque `::view-transition-*`). Astro trae la suya, pero **solo la inyecta si alguna
  página usa `transition:*`**, y acá ninguna lo hace.
- **El prefetch al pasar el mouse queda ENCENDIDO** (decisión del dueño, 2026-11-07):
  `ClientRouter` lo activa para todos los enlaces. En un teléfono —donde los datos se
  pagan— el hover prácticamente no ocurre, y en escritorio el costo es barato frente a
  la navegación instantánea. Y el costo en datos móviles lo cubre la propia librería:
  **Astro no prefetchea con `saveData` ni en 2g** (su `canPrefetchUrl` corta por
  `isSlowConnection()`). Si algún día molesta, la salida es
  `prefetch: { prefetchAll: false }` en `astro.config.mjs`.
- ⚠️ **El movimiento NO se puede medir en una pestaña oculta** (2026-11-08). Si el panel
  del navegador de la app está escondido, la página corre como **página de fondo**: las
  transiciones de vista **no arrancan** y las animaciones CSS **no avanzan**. El síntoma
  engaña: el clic no navega, `data-astro-transition` se queda pegado en `<html>` y
  `getAnimations()` devuelve las mismas animaciones «vivas» para siempre — se lee igual
  que un router roto. Pasó al verificar producción. `tabs_context` termina diciendo si el
  panel está visible: **leer esa línea antes de creerle a la medición**. Para medir
  movimiento, el panel visible o **Playwright** (ahí `visibilityState` es `visible`).

## Movimiento: las reglas del CSS (`global.css`)

- **La guardia de `prefers-reduced-motion` va SIN `@layer`.** Para las declaraciones
  normales, lo que está fuera de capa le gana a lo encapado, y así la guardia pisa a las
  utilidades propias de `@layer components`. ⚠️ **Lo que de verdad la sostiene es ser
  `!important` contra declaraciones normales**: para los `!important` el orden de las
  capas se **invierte** y lo que está fuera de capa queda ÚLTIMO, así que un `!important`
  dentro de un `@layer` le ganaría. Hoy no hay ninguno; si se agrega, la guardia pierde.
- ⚠️ **La guardia solo mata DURACIONES y RETARDOS**, no estados. Un `:hover` con
  `transform` se sigue aplicando entero y de un frame: el «salto sin interpolación» que es
  justo lo que se quiso evitar. Por eso cada `:hover` que mueva algo se anula a mano con
  `<propiedad>: none` **y** vive dentro de `@media (hover: hover)` (en un teléfono, si no,
  queda pegado tras tocar). Eso no depende de que alguien se acuerde:
  **`src/hover-con-reduce.spec.ts`** falla si aparece un `:hover` que mueva sin cubrir en
  cualquiera de los dos sentidos. Vigila **cuatro** propiedades —`transform` y las
  individuales `translate`, `scale` y `rotate`, que desplazan igual— y **no** cuenta el
  valor `none` como movimiento (un `:hover { transform: none }` es una anulación legítima).
  ⚠️ No resuelve el anidamiento `&:hover`: hoy `global.css` no lo usa, y si se empieza a
  usar hay que arreglar el test (daría un falso rojo).
- **`entrada-grid` es la marca de «primera grilla»** y se pone **solo ahí**: en la grilla
  estática del listado (la del HTML del build) y en la primera de `/tienda/`. **No** la
  llevan la grilla filtrada de la isla —que se remonta al limpiar filtros y repetiría la
  entrada— ni la franja «Destacados». Una clase explícita es lo que permite que «la
  primera grilla entra» no signifique «toda grilla entra».
- ⚠️ **`.shop-head .container > *` abarca cualquier hijo FUTURO** del encabezado de
  categoría (del 4.º en adelante, a 180 ms): agregar un elemento ahí le suma la entrada
  sola. Es a propósito —enumerar los hijos sería más frágil—, pero si uno no debe entrar,
  hay que excluirlo explícitamente.
- **Las reglas de `entrada` del hero dependen de la FORMA del DOM** (`> div >`, hijo
  directo) y las usan la portada y `/impresion-3d/` con el mismo marcado. Envolver los
  textos en un `div` más apaga la entrada **sin que nada falle**. Está avisado en
  `Hero.astro`.

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

## El build hornea, y el navegador REFRESCA (2026-11-08)

El build del **catálogo, las fichas, el inicio y los banners** trae todo de la API
(`getStaticPaths` / frontmatter) y lo deja como HTML. Por eso **la API tiene que estar
arriba en el build**; si cae, el build **falla fuerte** (no publica un catálogo vacío).
Local: `PUBLIC_API_URL=http://localhost:3001/api pnpm build`.

⚠️ **Pero eso ya no es toda la historia.** Desde el 2026-11-08 las islas vuelven a
preguntarle a la API **al montar** y reemplazan lo que cambió: prender o apagar un
producto, corregir un precio o cargar un banner **se ve sin reconstruir el sitio**. Lo
hace `useEnVivo` (`lib/vivo.ts`), y lo usan el catálogo de categoría, la ficha, los
destacados y las categorías del inicio y de `/tienda/`, y los tres tipos de banner.

**Por qué así y no una SPA** (decisión del dueño, con las dos opciones medidas): el
primer pintado ya trae productos, así que Google y la previsualización de WhatsApp los
leen del HTML. En una SPA el `index.html` queda en ~2 KB sin un solo producto —medido en
las páginas de Detales, que son ese patrón— y cada ficha compartida previsualiza igual.

Tres reglas que sostienen esto:

1. **Lo que se rederiva usa las MISMAS funciones puras del build** (`listadosDe`,
   `paginaDe`, `destacadosDe`, `bannerDeCategoria`…). Si el navegador listara por su
   cuenta, el día que cambie la regla el sitio diría una cosa recién construido y otra un
   minuto después.
2. **Una categoría que se quedó sin productos se muestra VACÍA, no con lo horneado.** La
   primera versión conservaba lo horneado ahí y seguía mostrando el producto que el dueño
   acababa de apagar — justo el bug que esto venía a cerrar.
3. **Si la API falla, se conserva lo horneado y se avisa.** Y **no se reintenta**: el tope
   público es 120 peticiones por minuto y el costo de fallar es ver datos de hace un rato.

⚠️ **Lo que SIGUE necesitando un build**: la página propia de un producto nuevo (su
título, su descripción y su JSON-LD). Mientras no exista, su enlace igual funciona — lo
rescata la 404, ver abajo — pero responde con estado 404.

⚠️ **`PUBLIC_API_URL` se HORNEA en el bundle del cliente.** Al probar el refresco contra
una API distinta hay que **reconstruir**: una corrida apuntando a producción parece
demostrar que el refresco no anda.

### El enlace de un producto que todavía no tiene página

Lo resuelve **la 404** (`RescatarProducto.tsx`): si la ruta es `/producto/<algo>/`, en vez
del cartel se resuelve ese producto contra la API.

⚠️ **NO se puede hacer con una regla de reescritura, y está probado.** El 2026-11-08 se
intentó con `public/_redirects` (`/producto/* -> /p/ 200`) y en producción **tapó las
fichas que sí existían**: todas pasaron a devolver la cáscara y perdieron su título, su
descripción y su JSON-LD. La suposición de que Cloudflare sirve primero el archivo
estático es falsa para ese caso. La 404, en cambio, solo se sirve cuando no hay archivo.
⚠️ Y no se puede probar en local: `astro preview` no lee `_redirects`.

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
Viven en `Catalogo.tsx` (isla de cada listado), en la **barra lateral** (decisión del
dueño): **Color = chips** multi-selección, **Precio = slider (tope)**, **Orden = select**.
⚠️ **Ya NO hay filtro de Categoría ni de Material**: la categoría es la propia página
(`/tienda/<cat>/`), y el material se quitó con ella. Si alguien ve `?cat&mat` en un
comentario viejo, está desactualizado. La URL compartible es **`?col&max&sort&p`**
(`p` = página del lado del cliente; la 1 no se escribe) y se restaura al recargar.

**El panel de filtros no siempre se dibuja**: hace falta un mínimo de productos en la
categoría (`MINIMO_PARA_FILTRAR` = 6, borde inclusivo, en `catalogo.ts`), medido sobre el
índice de TODA la categoría y nunca sobre la página de 24 (`valeLaPenaFiltrar`). Por
debajo de eso, el visitante abarca la categoría de un vistazo y el panel solo agrega
ruido. ⚠️ 6 **no** es «una fila»: `.shop-grid` son 3 columnas en escritorio, 2 a ≤900px y
1 a ≤560px — son dos filas anchas, y hasta seis en un teléfono.

**Sin filtro activo** se muestra la página estática de 24 (HTML del build, SEO). **Con un
filtro u orden** la isla trabaja sobre el **índice liviano** de TODA la categoría
(`EntradaIndice`) y pinta `TarjetaIndice`. ⚠️ Ese índice viaja entero a la isla, así que
cada campo que se le agregue se multiplica por el tamaño de la categoría: lleva lo mínimo
(nombre, precio, foto, colores, tramos, `badge`, `compareAt`) y **tiene prohibido** `desc`,
`description`, `specs`, `optionGroups`, `images` y `summary` — su test exige las claves
exactas. `badge` y `compareAt` están para que ordenar por precio no le quite a la tarjeta
su insignia ni su tachado de oferta.

## Personalización (productos `custom`)
Nota opcional + foto opcional. La foto **solo** si la API reporta `storageReady` (R2
configurado): se sube en dos pasos (`subir-foto.ts` → `/uploads/custom-url` → PUT firmado)
y viaja solo la **clave**. Sin R2, el cargador no aparece y el pedido entra con la nota.

## Hero de la portada y Flash Sale

⚠️ **El carrusel VOLVIÓ el 2026-11-08**, por pedido del dueño y con el reparo sobre la
mesa (se había quitado porque era una isla de React y el mensaje no se leía sin JS). Vive
en `components/inicio/HeroEnVivo.tsx`, que reemplazó a `Hero.astro` y a
`CarruselHero.astro`. Si en un comentario viejo dice que el carrusel no existe, está
desactualizado.

**La mitigación del riesgo, que es obligatoria:** todas las diapositivas se generan
también en el BUILD —las islas de Astro se renderizan ahí— así que el `h1` y el mensaje
siguen en el HTML. El JS solo elige cuál está activa. Medido: **un solo `<h1>`** en la
portada, con o sin banners.

⚠️ **Se conserva la FORMA del DOM**: `section.hero > .container.hero-art-grid > div` + la
imagen hermana. Las reglas de la animación de entrada se enganchan con hijo directo sobre
esa estructura; envolver los textos en un div más **la apaga sin que nada falle**.

⚠️ **Solo la primera diapositiva lleva `<h1>`**; las demás usan `<p class="h1">`, que se
ve igual. Un solo banner **no** es carrusel: ni puntos ni rotación. Con
`prefers-reduced-motion` no rota sola, pero los puntos siguen andando.

### Los TRES tipos de banner (2026-11-08)

`StoreBanner.kind` dice **dónde** se muestra; `linkType` dice **adónde lleva**. Son cosas
distintas y conviven.

| `kind` | Dónde se ve | Sin ninguno cargado |
|---|---|---|
| `HERO` | El carrusel de la portada | El arte de marca (`banano-hola.png`) |
| `TEXTO` | La franja de arriba, en todas las páginas | El texto escrito a mano en `Header.astro` |
| `CATEGORIA` | `/tienda/<cat>/` y las fichas de sus productos | No se dibuja nada |

Un `TEXTO` no lleva imagen y un `CATEGORIA` exige su categoría: lo fija el contrato Zod,
que además **prohíbe** lo ajeno a cada tipo. Un `CATEGORIA` cuya categoría se borró **no
se devuelve** por la API: no hay página donde mostrarlo.

⚠️ Los tres **ya no necesitan un despliegue**: se refrescan en el navegador como el resto
del catálogo.
- Si los banners fallan, el build **NO** se cae (`fetchBanners().catch(() => [])`): un
  banner es decoración. El catálogo, en cambio, sí es obligatorio.
- El arte de un banner es remoto y sus medidas no se conocen en el build, así que no puede
  llevar `width`/`height`: la reserva de espacio la hace `.hero-art--banner` con
  `aspect-ratio: 1 / 1` (el cuadrado del arte propio) + `object-fit: contain`. Sin eso el
  hero salta cuando la imagen carga.
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
- ⚠️ **UN PROYECTO DESCONECTADO DE GIT NO DESPLIEGA, Y NO AVISA POR NINGUNA PARTE.**
  Pasó el 2026-11-07: Pages mostró el cartel *«Este proyecto está desconectado de tu
  cuenta de Git»* y el push a `main` **nunca disparó un build**. No hay despliegue en
  rojo que mirar — no hay despliegue — y «Implementaciones automáticas habilitadas»
  sigue diciendo que sí. Del lado de acá todo sale bien: el push entra, el hook de
  pre-push pasa en verde, y el sitio sigue sirviendo el build viejo con 200 en todas
  sus rutas. El síntoma es que **las rutas NUEVAS dan 404** mientras las viejas andan.
  - **Cómo distinguirlo de un build roto, sin entrar al panel**: si las rutas nuevas
    dan 404 **y** el build exacto de producción (`PUBLIC_API_URL` + `PUBLIC_SITE_URL`,
    Node 22.18) sale verde en local, el código está descartado. Y si además
    `cf-cache-status` dice `DYNAMIC` y el `.pages.dev` del proyecto da el mismo 404,
    tampoco es caché: es que el build no corrió.
  - **Reconectar NO reconstruye el push que se perdió**: el último despliegue sigue
    siendo el commit viejo. Después de reconectar hay que disparar el build a mano
    («Volver a intentar» / «Crear implementación»), o el siguiente push.
  - **Vale para los tres proyectos de Pages** (`calc3d-landing`, `calc3d-web`): el
    cartel es por proyecto, así que uno puede estar desconectado y el otro no.
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

## Lo que cambió el 2026-11-08 (resumen para no releer todo)

Día largo. Lo que hay que saber si venís de una versión anterior de este archivo:

- **La tienda es reactiva sobre lo horneado** (ver «El build hornea, y el navegador
  REFRESCA»). Era estática a secas.
- **Volvió el carrusel**, y hay **tres tipos de banner** (hero, franja de texto,
  categoría), todos en vivo.
- **La insignia «Nuevo» es AUTOMÁTICA**: sale de `publishedAt` (15 días desde que se
  publica, no desde que se crea la ficha). El contrato **rechaza** escribirla a mano.
- **Las insignias son OPACAS.** Las dos de color eran translúcidas y sobre una foto clara
  caían a 1,27 de contraste (el mínimo AA es 4,5). Viven en `catalogo/insignias.ts`,
  una sola definición para las dos tarjetas y la ficha.
- **Un solo botón por tarjeta** («Elegir opciones»), que lleva a la ficha. Antes eran dos
  y con un producto que exige opciones los dos iban al mismo lado.
- **La tarjeta dice «desde»** cuando alguna opción suma. Los tramos por cantidad NO lo
  disparan: esos bajan el precio.
- **Hay tests de PANTALLA** (jsdom + testing-library), elegidos por la extensión del
  archivo: `*.spec.ts` → node, `*.spec.tsx` → jsdom. Hasta ese día ni un test tocaba el
  JSX y se podía borrar un botón con la suite en verde.
- **El pie** lleva teléfono, Instagram y canal de WhatsApp; en Contacto quedó solo el
  enlace de WhatsApp, sin el número repetido.
