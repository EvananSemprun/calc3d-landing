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
pnpm check          # astro check (tipos)  ← NO lo cubre pnpm test, ver abajo
pnpm test           # vitest (la lógica de src/lib) — NO incluye el guardián de dist/
pnpm test:dist      # guardián sobre dist/: exige un pnpm build previo, se corre A MANO
```

⚠️ **`pnpm test` en verde NO quiere decir `pnpm check` en verde, y la diferencia esconde
bugs de verdad.** Vitest transpila sin chequear tipos: un campo que no existe se lee como
`undefined` y el test pasa igual. El 2026-11-08 `pnpm check` acumuló **8 errores** que
nadie corrió, y uno era un bug real (la insignia «Nuevo» del catálogo filtrado). **Correr
`pnpm check` antes de dar por terminado un cambio**, sobre todo si tocó un tipo
compartido: el hook de pre-push corre los tests, **no** el chequeo de tipos.

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

### Las fotos entran con un cruce corto (2026-11-09)

Las fotos remotas se pintan con **`components/ui/Foto.tsx`**, no con un `<img>` a mano,
**salvo el arte del hero**, que va como `<img>` plana a propósito (`HeroEnVivo.tsx`: es
remoto pero es candidato a LCP de la portada, así que no funde y no necesita el
componente). Funden al cargar, salvo las candidatas a LCP (`prioridad`).

- ⚠️ **La marca de «no cargada» (`data-cargando`) la pone SOLO el JS del cliente, en un
  efecto, después de montar.** El render que Astro hornea sale sin ella, y eso es el
  punto: si apareciera en el HTML del build, Google, la previsualización de WhatsApp y
  quien tenga el JS roto recibirían **las fotos invisibles**, sin un solo error. Lo
  vigilan `components/ui/Foto.spec.tsx` (sobre `renderToStaticMarkup`, que es lo que
  hornea Astro) y **`src/dist-sin-js.spec.ts`**, que lee el `dist/` de verdad.
- ⚠️ **El mecanismo NO puede colgar de `<html>`.** `swapRootAttributes` borra todos los
  atributos de `<html>` en cada navegación del router, así que una marca de «el JS está
  vivo» puesta ahí anda en la primera página y **muere en la segunda**. Por eso vive en el
  efecto de la propia isla: Astro rehidrata las islas de la página destino después del
  swap y el efecto corre de nuevo. Verificado navegando con un clic.
- ⚠️ **El techo por tiempo (`TECHO_CARGA_MS = 3000`, en `lib/foto.ts`) no es opcional.**
  La guardia de movimiento baja la duración a `0.01ms` pero **no cambia el valor
  inicial**: sin el techo, una foto cuyo `load` no llega (red cortada a mitad de la
  descarga) queda transparente **para siempre**. Hay tres salidas: `load`, `error` y el
  techo. Y una foto con `img.complete` **no se marca**: su `load` ya pasó.
- **Con `prefers-reduced-motion` la foto no se esconde NUNCA**: una regla aparte en el
  mismo bloque la deja en opacidad 1. Si no, quien pidió no ver movimiento pagaba la
  ventana invisible y no recibía el cruce a cambio: perdía sin ganar.
- **`prioridad` (sin fundido):** `.pdp-main` —medido, ES el LCP de la ficha: 11,4 s con
  red frenada en escritorio— y las **3 primeras** tarjetas de la grilla estática del
  listado (`COLUMNAS_PRIMERA_FILA` en `Catalogo.tsx`). ⚠️ **No se le quita a
  `.pdp-main`:** una imagen en `opacity: 0` no es candidata a LCP, así que fundirla
  retrasa el LCP. El hero y las fotos locales siguen siendo `<img>` planas.
- ⚠️ **El CSS va al final de `global.css` y FUERA de `@layer`, y su `transition` LISTA
  `transform` a propósito.** `.product-photo` declara `transition: transform …` dentro de
  `@layer components`; `transition` es un atajo y lo que está fuera de capa gana, así que
  una lista con solo `opacity` **mata el zoom del `:hover` de la tarjeta en silencio**
  (build verde, `hover-con-reduce.spec.ts` verde, porque ese mira la guardia de `reduce`,
  no si la transición existe). Lo exige **`src/fotos-funden.spec.ts`**, que además pide
  que el bloque no esté encapado y que las duraciones salgan de los tokens.
- **Los dos atributos no son lo mismo:** `data-fundir` (lo pone `<Foto>` en el marcado,
  también en el horneado) solo declara la transición; `data-cargando` es la opacidad 0.
  Separarlos es lo que permite que el cruce exista sin que el build esconda nada: una
  transición tiene que estar declarada en el estado FINAL.
- **Límite conocido:** una foto `loading="lazy"` muy abajo no empieza a bajar al hidratar,
  así que el techo la libera antes y **aparece sin cruce**. Nada queda invisible; el
  fundido simplemente no llega hasta ahí.
- ⚠️ **Cómo verificar este mecanismo en el navegador, y el error que lo arruina:** NO uses
  `route.abort()` para simular una foto que no llega. Un abort dispara `error`, que **es una
  de las tres vías de liberación**, así que la medición no distingue «nunca se marcó» de «se
  marcó y se liberó» — se lee igual que un mecanismo roto. La medición válida **cuelga** la
  petición (sin `load` ni `error`) y muestrea **dentro** de los 3 s del techo.
- **La galería de la ficha también cruza** al cambiar de foto, con `useCruce` (no con la
  transición de `data-fundir`: ésa deja el elemento en opacidad 0 en reposo, que es justo lo
  que `prioridad` evita en `.pdp-main`). Dos datos medidos que ahorran investigación:
  miniatura y principal **son la misma URL** y las miniaturas no son `lazy`, así que al
  cruzar el archivo ya está en caché y no hay que esperar ningún `load`; y cambiar el `src`
  de un `<img>` **no lo vacía** (a 1,5 s con el servidor colgado seguía pintando el cuadro
  anterior), así que lo que se funde es la foto vieja, no un hueco.
  - ⚠️ **Hoy esto NO SE PUEDE VER en la tienda: 0 de 13 fichas dibujan miniaturas**, porque
    ningún producto tiene más de una foto (`fotos.length > 1` es falso en todo el catálogo).
    El mecanismo está hecho, probado y medido; es invisible hasta que se suba una segunda
    foto a algún producto desde el panel. **No es un bug.**

### `pnpm test` NO corre el guardián de `dist/` (y es a propósito)

`vitest.config.ts` tiene un **tercer proyecto**, `dist`, con `src/dist-sin-js.spec.ts`.
Los scripts filtran por proyecto: `pnpm test` = `vitest run --project=!dist` y
`pnpm test:dist` = `--project=dist`.

- Leer `dist/` exige un `pnpm build`, **y el build le pega a la API**. Atar el gancho de
  pre-push (que corre `pnpm test` y hoy tarda segundos) a tener la API arriba y a un build
  de minutos es lo que entrena el `--no-verify`. Se corre a mano, junto con `pnpm check`.
- ⚠️ **Excluir el archivo del proyecto `node` y nada más NO alcanza:** entonces ningún
  proyecto lo incluye y `vitest run <ruta>` responde «No test files found» y sale en
  **rojo sin haber mirado nada**. Hace falta el proyecto propio.
- ⚠️ **Si `dist/` no existe, el guardián falla fuerte** (los 9 tests en rojo). Nunca dice
  «0 verificados» y sale en verde.
- ⚠️ **LA CONSECUENCIA QUE HAY QUE TENER PRESENTE AL ESCRIBIR UN GUARDIÁN: una prohibición
  que viva SOLO acá no protege al gancho de pre-push.** El gancho corre `pnpm test`, que
  excluye este proyecto, así que el guardián de `dist/` no se entera de nada hasta que
  alguien lo corra a mano. Pasó con la prohibición más fuerte de la Tarea 6: que `.pdp-main`
  no lleve `data-fundir` estaba vigilada en `dist-sin-js.spec.ts` y **en ningún otro lado**.
  **Si la regla se puede comprobar con un render, duplicala en un `*.spec.tsx`** y dejá acá
  solo lo que de verdad necesita el HTML construido. Cuesta un render y cierra el hueco.

## Cómo se prueba y se mide acá (lo que salió más caro de aprender)

Esta sección es el saldo del plan de fluidez de noviembre de 2026. Cada punto costó una
tanda de trabajo tirada o un hallazgo escrito al revés. **No está en el código: si no se
lee acá, se vuelve a pagar.**

### Tests

- ⚠️ **EN JSDOM NO HAY LAYOUT NI CSS.** `getBoundingClientRect()` devuelve ceros y
  `getComputedStyle` no conoce tu hoja de estilos. **Cualquier aserción sobre tamaño,
  posición u opacidad en un `*.spec.tsx` es nula y da VERDE con el diseño roto.** Esto se
  escribió **tres veces** en un mismo plan que ya lo tenía anotado en su encabezado, así que
  la regla tiene que estar donde se escriben los tests y no solo en un prólogo. Lo que SÍ se
  puede testear en jsdom: que la clase esté puesta, que el atributo esté, que el nodo exista.
  La **geometría se mide en un navegador** (Playwright), a 390 y a 1280.
- ⚠️ **El entorno lo elige la EXTENSIÓN** (`*.spec.ts` → node, `*.spec.tsx` → jsdom). Un
  spec que toca `document`, `HTMLImageElement` o un render y se llama `.ts` revienta con
  «document is not defined». Al nombrar un spec, **verificá la extensión con `ls`**, no de
  memoria.
- ⚠️ **Un test se valida con la mutación que uno TEME, no con la que basta para verlo en
  rojo.** Si una regla gana **por posición** en el archivo, la mutación que importa es
  **moverla**, no borrarla — borrarla da rojo y no prueba nada. Pasó con las dos guardias de
  `prefers-reduced-motion` (fotos y cruce): el test «existía» y quedaba verde con la guardia
  movida. También pasó al revés: un guardián de «alguna foto sigue fundiendo» quedaba verde
  con `COLUMNAS_PRIMERA_FILA = 999`, porque otra página siempre dejaba una fundiendo.
- ⚠️ **Y la mutación tiene que COMPILAR.** Si vitest responde «0 tests» o «No test files
  found», eso es un **verde falso**, no un verde.
- ⚠️ **Restaurar una mutación con `cp` desde una copia, NUNCA con `git checkout --`**: borra
  todo lo no commiteado. Después, `diff -q` para comprobar que quedó idéntico.
- **Un guardián que aparenta hermetismo es peor que uno que dice dónde termina.** Donde el
  guardián compara TEXTO y no puede ver un valor calculado, el límite va escrito en el test,
  con la medición a mano que lo cubre.
- **Las tres capas no son intercambiables:** función pura (`src/lib`), **pantalla**
  (`*.spec.tsx`) y `dist/`. Borrar una línea del JSX tumba los tests de pantalla y **cero**
  de función pura. Toda regla que viva en el JSX necesita su test de pantalla.

### Mediciones

**La receta exacta está en `docs/superpowers/plans/2026-11-09-fluidez-tienda-mediciones.md`,
con el script completo. Reusala; no escribas otro arnés.** Lo mínimo:

- **Las dos ramas se miden JUNTAS**, en la misma sesión y con el mismo binario, las dos en
  **el puerto 5182** (la API valida `STORE_ORIGIN` exacto: en otro puerto las islas mueren en
  CORS y se mide una página sin refresco en vivo, o sea otra cosa). El `antes` sale de un
  `git worktree`, construido con las **variables de producción**.
- ⚠️ **Playwright acá usa el Chrome INSTALADO del usuario, que se actualiza solo.** Entre el
  09/11 y el 10/11 pasó de 156 a 157 sin que nadie lo tocara. Por eso anotar la versión no
  alcanza: **re-medir las dos ramas** es lo único que vuelve comparables dos tablas.
- ⚠️ **ANOTÁ EL ELEMENTO DEL LCP JUNTO A CADA NÚMERO.** Es el control más barato que existe
  y el único que cazó una tabla falsa **sin que nadie supiera la causa**: si las corridas
  dicen `h1` en unas y `product-photo` en otras, ya no se está midiendo lo mismo. Anotar
  también `loadEventEnd` cuesta nada y habría ahorrado tres versiones equivocadas de un
  hallazgo.
- ⚠️ **Una mediana solo promedia mediciones del MISMO fenómeno.** Cuando la dispersión no es
  ruido sino dos fenómenos distintos, la mediana elige el mayoritario **y no avisa**. Y si
  una tanda da un resultado dudoso, la salida es **aislar la variable** (neutralizar el
  cambio en el `dist/` ya construido y volver a medir), **no ampliar la muestra** hasta que
  el número entre: eso cambia el método a mitad de camino.
- ⚠️ **Una medición tiene que poder dar que NO**, y conviene comprobarlo con un **control
  positivo**: metele vos la perturbación que buscás y verificá que el arnés la ve. Dos veces
  en ese plan una medición no podía detectar lo que afirmaba descartar.
- **Las cuatro trampas del arnés, todas pagadas ya:**
  1. **`route.fulfill` de Playwright entrega el documento SIN el freno de red de CDP** —
     64 ms contra 259 con el cuerpo **byte por byte idéntico**, sin solaparse. Interceptar
     regala ~195 ms, más que cualquier efecto que se esté buscando. **Interceptá las dos
     ramas o ninguna**, nunca mezcles.
  2. **Esperá a que `getAnimations()` quede quieto** antes de leer geometría, o medís la
     animación de entrada todavía corriendo (pasó: 12 px que no eran del cambio).
  3. **Para ver el respaldo de una fuente hay que bloquear `.woff2` Y `.woff`**: el
     `@font-face` lista las dos y bloquear una sola carga la fuente igual, así que se mide
     el estado equivocado creyendo que es el respaldo.
  4. **Una pestaña de fondo miente**: las transiciones no arrancan y las animaciones no
     avanzan. Con Playwright `visibilityState` siempre es `visible`.
- **Y el sesgo que no es del arnés:** los dos builds le pegan a la **API de producción en
  vivo**. Si el dueño edita el catálogo entre las dos construcciones, la comparación queda
  contaminada y nada avisa. El control es comparar las URLs de foto de los dos `dist/`
  (mismo md5) antes de creerle a la tabla.
- **Un umbral solo sirve aplicado contra el estado CORRECTO.** Comparar «autohospedada +
  precarga» contra «Google Fonts» cuando el estado relevante era «autohospedada sin
  precarga» convirtió una regresión del 22 % en un «+28 ms, pasa». Antes de aplicar un
  umbral, enumerá los estados posibles, no dos.

### Al escribir el porqué

- ⚠️ **Un comentario equivocado no da error, no rompe ningún test, y el próximo lo lee como
  medido.** Apareció **cinco veces** en un solo plan. Si un número aparece en **dos**
  lugares, ya divergió: dejá **una** copia y que los demás la citen.
- ⚠️ **Un mecanismo que explica los datos Y cita código real puede estar igual de equivocado
  que una corazonada.** Lo que separó uno de la verdad fue una medición de 15 segundos que
  nadie hizo antes de escribirlo.
- ⚠️ **Todo número que escribas tiene que salir de un comando que corriste** — incluidos los
  que te pasaron de arriba y los que describen tu propio trabajo. Los errores de ese plan se
  repartieron entre números heredados sin re-medir y números inventados sobre el trabajo
  propio (contar mal sus propios tests sin abrir el archivo).
- ⚠️ **Antes de concluir desde un dato cierto, enumerá TODOS los blancos a los que aplica.**
  «Esas insignias son `position: absolute`» era verdad y valía para **un blanco de tres**.

### ⚠️ Lo que la medición dejó sobre la mesa: las fotos pesan demasiado

Medido el 10/11 con red frenada (150 ms, 1,6 Mbps — datos móviles de un cliente
venezolano), el LCP de las tres pantallas es **malo en las tres**, y el umbral «bueno» de
Google es 2,5 s:

| Pantalla | Móvil | Escritorio | Elemento |
|---|---|---|---|
| Portada | 788 ms | 804 ms | `hero-art` / `h1` — **la única buena** |
| Listado de categoría | **9,9 s** | **30,6 s** | `product-photo` |
| Ficha | **4,2 s** | **11,4 s** | `pdp-main` |

El listado es **la primera pantalla que ve un cliente que llega por un enlace de
categoría**, y es la peor de las tres. La causa es una sola y está medida:

> **Una página de listado baja 12,9 MB de fotos.** Son 12 archivos **PNG** de
> **542 KB a 1,5 MB cada uno**, servidos a **1254×1254** para cajas de ~350 px. A 1,6 Mbps
> eso es **más de un minuto** de descarga, y la foto que define el LCP compite por el ancho
> de banda con las otras once.

Ninguna tarea del plan de fluidez lo toca y meterlo habría sido ampliar el alcance solo.

**Es el hallazgo más valioso del trabajo y está PENDIENTE de una conversación con el
dueño.** Si alguien va a invertir una tarde en que la tienda «se sienta rápida», es acá y no
en el movimiento. Ojo con el bloqueador conocido: **no hay `sharp`** en este repo (las
imágenes van como `<img src>` plano, no `astro:assets`), así que redimensionar no es una
línea de config.

⚠️ Y un dato que conviene tener antes de medir esto: en el listado, el evento `load` **a
veces espera a la foto `lazy` y a veces no**, dentro del mismo build. Es una carrera que no
está aislada. Si una medición del listado da ~1,2 s, no mejoró nada: se cortó la ventana.

## Qué es y qué NO es
- **Es** un catálogo de **solo lectura** que consume la API pública de `calc3d-api`
  (`/public/store/*`). Sin sesión, sin datos personales guardados.
- **NO es** un ecommerce con pago. El pedido **se cierra por WhatsApp** (decisión
  explícita: evita pasarela y toda la superficie de seguridad de los pagos).
- ⚠️ **Y desde el 2026-11-11 tampoco se REGISTRA en ninguna parte**: el botón abre WhatsApp
  y nada más. Ver «El pedido va directo a WhatsApp» abajo.
- **NO hay cuentas de cliente, y ya ni siquiera se pide el nombre.** No se guarda ningún
  dato personal en ningún lado: el único que existe es el que WhatsApp ya trae.

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

### El refresco en vivo CRUZA, y es una `animation` (no una transición) — 2026-11-09

Cuando `useEnVivo` reemplaza un dato que estaba horneado (un precio, una insignia, el texto
de la franja), el valor nuevo no aparece seco: **cruza**. Dos formas, y la diferencia
importa:

- **`useCruce(valor)`** (`components/ui/Cruce.tsx`) esparce el atributo sobre un elemento
  que YA existe — cero nodos nuevos.
- **`<Cruce valor>`** solo para **texto suelto en línea** (el precio de la tarjeta es un
  nodo de texto dentro de un `.price`; el de la franja, un nodo hermano de un emoji).
  Un envoltorio en línea alrededor de texto en línea no cambia la geometría; uno alrededor
  de un hijo `display: block` o de un hijo de flex/grid **sí**. Por eso son dos formas.

⚠️ **Es una `animation` y NO una `transition`, y las tres razones son trampas reales:**

1. **Una transición de 0 a 1 obliga a declarar el dato invisible EN REPOSO**, y entonces con
   `prefers-reduced-motion` se queda esperando: la guardia global solo baja duraciones a
   `0.01ms`, **no** cancela estados, así que el dato nunca llegaría a opacidad 1. Con una
   animación el reposo es opacidad **1** y el 0 vive solo dentro del keyframe: si la
   animación no corre, el dato simplemente está ahí. Por eso tampoco necesita el techo por
   tiempo que sí necesitan las fotos.
2. **La transición de las fotos no se podía reusar:** su selector es `img[data-fundir]`,
   fijado **textualmente** por `fotos-funden.spec.ts`. Ampliarlo rompe un guardián ajeno.
3. **`transition` es un atajo**, y los blancos del cruce son elementos cualesquiera —
   `badge.tsx` trae `transition-[color,box-shadow]`, que el atajo se habría comido.

- **Hay DOS keyframes idénticos** (`cruce-1` / `cruce-2`) y el atributo alterna entre ellos.
  Con uno solo, un elemento que cruza dos veces seguidas no vuelve a animar: reasignar la
  misma `animation` no la reinicia.
- ⚠️ **La guardia de `reduce` (`[data-cruce] { animation: none }`) gana SOLO POR ORDEN.**
  `[data-cruce]` y `[data-cruce='1']` pesan lo mismo (0,1,0), así que **mover el bloque
  arriba de las marcas devuelve el destello sin que nada se vea roto** — y meterlo en un
  `@layer` lo rompe igual. Las dos mutaciones están **medidas en rojo** contra
  **`src/cruce-funde.spec.ts`**: subir la guardia → ROJO; encaparla → ROJO.
- **Lo que APARECE también cruza**, y no es un capricho: `.pdp-badges` es `display: flex` en
  flujo normal justo encima del `<h1>` de la ficha, y `.price-alt` es `display: block`, así
  que una insignia o un tachado que aparece **empuja la página**. Solo en las tarjetas las
  insignias son `position: absolute` y no mueven nada — ése fue el dato cierto al que se le
  dio un alcance que no tenía, en dos blancos de tres.
- **El `0` NO cuenta como ausente.** Un «de $12 a $0» es justo lo que hay que mostrar; un
  `ausente = (v) => !v` lo escondería y ningún caso feliz lo notaría.
- **En la ficha dispara `p.price`, no el total**: fundir el total convierte el contador de
  cantidad en un parpadeo.

### El producto BORRADO deja de ofrecerse (2026-11-08)

Borrar o despublicar un producto no se veía hasta el próximo despliegue, por dos
caminos distintos:

- **La ficha.** `getJson` lanzaba el **mismo `Error`** para un 404 que para un
  corte de red, así que `useEnVivo` se quedaba con lo horneado y la página decía
  *«no pudimos conectar con el catálogo»* —falso— encima del producto muerto, con
  su precio y su botón de comprar. Ahora el 404 es **`NoExiste`** (`lib/api.ts`),
  `useEnVivo` devuelve **`noExiste`** aparte de `error`, y `FichaEnVivo` muestra
  «Este producto ya no está disponible».
  - ⚠️ **Esa guarda va ANTES de la de `!datos` y PISA lo horneado, a propósito.**
    Conservarlo es justo lo que no hay que mostrar. Es la única diferencia entre
    los dos estados: si la API no contesta, lo horneado es lo mejor que hay; si
    la API contesta que no está, lo horneado es la ficha de algo que no se vende.
  - ⚠️ El dato para distinguirlos **ya llegaba**: la API pública devuelve 404
    para lo borrado **y para lo despublicado** (filtra por `visible`).
- **Los relacionados.** Se elegían dentro del `getStaticPaths` de
  `producto/[slug].astro` y nunca se refrescaban. La regla salió a
  **`lib/relacionados.ts`** (`relacionadosDe`), que ahora usan el **build Y la
  isla** (`RelacionadosEnVivo`, `client:visible`): con dos caminos, el sitio
  ofrecería una cosa recién construido y otra un minuto después.
  - ⚠️ Pide el catálogo **COMPLETO**: la tarjeta dice «desde» cuando alguna
    opción suma y los recargos solo vienen en esa respuesta. Con la liviana el
    «desde» desaparecería al refrescar, que es peor que no refrescar.

⚠️ **Esto arregla lo que ve el VISITANTE, no lo que ve Google.** El HTML horneado
sigue teniendo el `og:title` y el JSON-LD del producto muerto hasta el próximo
despliegue. Se evaluó un deploy hook de Pages y **el dueño eligió el arreglo en
vivo primero**; el hook queda disponible si algún día molesta lo de Google.

⚠️ **Una mutación mintió y hay que saberlo**: los tests de pantalla de la ficha
moquean `fetchProducto` y lanzan `NoExiste` ellos mismos, así que **nunca pasan
por `getJson`** — romper la detección del 404 los dejaba a los 5 en verde. Por
eso existe `lib/api.spec.ts`, que prueba el único lugar donde se decide cuál de
los dos errores es.

### El enlace de un producto que todavía no tiene página

Lo resuelve **la 404** (`RescatarProducto.tsx`): si la ruta es `/producto/<algo>/`, en vez
del cartel se resuelve ese producto contra la API.

⚠️ **NO se puede hacer con una regla de reescritura, y está probado.** El 2026-11-08 se
intentó con `public/_redirects` (`/producto/* -> /p/ 200`) y en producción **tapó las
fichas que sí existían**: todas pasaron a devolver la cáscara y perdieron su título, su
descripción y su JSON-LD. La suposición de que Cloudflare sirve primero el archivo
estático es falsa para ese caso. La 404, en cambio, solo se sirve cuando no hay archivo.
⚠️ Y no se puede probar en local: `astro preview` no lee `_redirects`.

**La pestaña dice el nombre del producto (2026-11-09).** El rescate mostraba el producto
entero pero dejaba la cabecera del cartel, así que la pestaña decía «Página no
encontrada» encima de un reno. Lo corrige `lib/titulo.ts` (`tituloDeFicha`), que aplica
`FichaEnVivo` en un efecto, y la 404 deja solo la marca antes de pintar para que no
parpadee el título de error.

- ⚠️ **`tituloDeFicha` devuelve `null` mientras no se sabe** (la respuesta viaja, o solo
  hay horneado). Devolver siempre un texto es el mismo bug con otro disfraz: en una
  ficha de verdad el título horneado ya es el correcto.
- ⚠️ **La mutación que hay que recordar**: romper solo el efecto de `FichaEnVivo` deja
  los tests de función pura en VERDE y la pestaña mintiendo. Por eso hay tests en las
  dos capas (`lib/titulo.spec.ts` y `FichaEnVivo.spec.tsx`); medido el 2026-11-09:
  3 de pantalla en rojo, 0 de función pura.
- La marca sale de `meta[property="og:site_name"]`, que ya está en la cabecera: no se
  escribe «Banano Lab» una segunda vez en el script.

⚠️ **DECISIÓN DEL DUEÑO (2026-11-09): el SEO de un producto nuevo se pierde a
propósito.** Se le ofrecieron las tres salidas —deploy hook de Pages, reconstruir a mano,
o renderizar la ficha en el servidor con el adaptador de Cloudflare (que no costaba el
SEO)— y eligió **ninguna**: no quiere reconstruir el sitio ni esperar un build cada vez
que carga productos. O sea que hasta el próximo despliegue, una ficha nueva:

- responde **404** (el visitante igual la ve completa, y ahora con su título);
- se comparte por WhatsApp con la tarjeta del cartel de error (`og:title` = «Página no
  encontrada»), que es el costo real de esto, no la pestaña;
- no la indexa Google.

Medido ese día antes de decidir: **13 productos en la API, 3 en el sitemap** — 10 fichas
respondiendo 404. Un `git push` a este repo las hornea todas; el problema vuelve con el
siguiente producto. **No reabrir el tema sin que lo pida el dueño.**

**Lo que SÍ llega solo, y conviene no confundir.** Un producto nuevo aparece en la tienda
sin ningún despliegue: sale en el catálogo (se refresca contra la API al abrir la página)
y su ficha abre entera por el rescate. Lo ÚNICO que espera un build es que la ruta
responda **200** en vez de 404 — o sea, la tarjeta de WhatsApp y Google. Si el dueño
dice «los productos no llegan solos», casi seguro está hablando de eso y no del catálogo.

**Las dos salidas, con el costo medido el 2026-11-09 — y el dueño eligió NINGUNA:**

| Salida | Qué cuesta |
|---|---|
| Función de Pages (`functions/producto/[slug].ts`) que sirva la cáscara con las etiquetas del producto | Un push para instalarla y nunca más. No toca dominio ni panel. |
| Renderizar la ficha en el servidor (`prerender = false`) | ⚠️ **Obliga a mudar la tienda de Pages a Workers.** |

⚠️ **`@astrojs/cloudflare` YA NO SOPORTA CLOUDFLARE PAGES.** Textual de su documentación:
*«The Astro Cloudflare adapter no longer supports deployment on Cloudflare Pages»* — ahora
apunta a Workers. O sea que el SSR de la ficha **no es un cambio de código**: es mudar el
proyecto y llevarse `bananolab-3d.com` de Pages a Workers, con la tienda en vivo y en el
mismo panel donde el 2026-11-07 ya se creó un Worker por error. Datos para no volver a
investigarlo: Astro instalado **7.3.8**; `@astrojs/cloudflare@14.3.4` pide astro `^7.2.0`
(sirve sin subir Astro) y `14.4.x` pide `^7.4.0`.

**Decisión del dueño (2026-11-09, segunda vez): dejarlo como está.** Se le ofrecieron las
dos y dijo que no. El cliente que navega la tienda ve todo bien; el link pegado en un chat
muestra «Página no encontrada» hasta el próximo despliegue, y eso está aceptado.

## Tramos de mayoreo: DOS formas, y el recargo va aparte (2026-11-08)

`lib/precio.ts` **reimplementa** `precioConTramos` (la tienda no importa shared),
así que tiene que cobrar **lo mismo** o la ficha diría un número y el pedido
llegaría con otro.

| Forma | Campo | Cuándo |
|---|---|---|
| Precio fijo | `unitPriceUsd` | La nueva. Es la única que permite un precio redondo. |
| Descuento | `discountPct` | La vieja. ⚠️ **No se puede retirar**: hay fichas publicadas guardadas así. |

- ⚠️ **`recargos` es un parámetro OBLIGATORIO**, no opcional con default 0. Un
  precio fijo reemplaza al precio de **LISTA** y los recargos de opción se cobran
  **encima**; con un default, un llamador que se olvide muestra el tramo pelado
  mientras el servidor cobra tramo + recargo, y el cliente ve **menos** de lo que
  se le cobra. Que el compilador obligue a decidir en cada llamada es la
  protección — lo pidió la revisión de seguridad, y tenía razón: el servidor ya
  lo pasaba y la ficha y el carrito no.
- Quien de verdad quiere el precio de lista pasa **0**, y así **se lee que lo
  decidió**: la tabla de tramos de la ficha lo hace, porque muestra el «desde N u,
  $X c/u» del producto y no el de la combinación que el visitante tenga elegida.
- **El carrito DENORMALIZA `recargo`** al agregar, como ya hacía con los tramos y
  el mínimo: su `unit` viene congelado y ya sumado, así que sin ese dato no podría
  separarlos. ⚠️ Un carrito guardado **antes** del 2026-11-08 no lo tiene y vale
  0, que es exactamente lo que valía para esos productos.
- **`descuentoDeTramo`** deriva el «−17 %» de la tabla: hay **un** número
  guardado, no dos que mantener de acuerdo.
- ⚠️ Medido en producción ese día: **ninguna ficha tiene tramos Y recargos a la
  vez** (el único con tramos no tiene recargos). O sea que el agujero habría
  quedado latente hasta que el árbol de Navidad llevara mayoreo.

## El carrusel de la portada (2026-11-11)

`.coleccion-fila` eran ~5,5 tarjetas de 200 px cortadas en seco, con la barra de scroll
del sistema a la vista y sin ninguna señal de que aquello se desplazaba. Ahora es
**`components/ui/Carrusel.tsx`**: 4 tarjetas en escritorio, 2 en tablet y **1,3 en móvil**
—el 0,3 es lo que hace que se VEA que hay más—, con flechas, `scroll-snap`, arrastre con
mouse y sin barra. **Sin librería**: es `overflow-x` + snap + unas pocas líneas.

- ⚠️ **`behavior: 'smooth'` NO MUEVE NADA en esa pista**, y por eso el desplazamiento se
  anima a mano. Medido en Chrome: `scrollBy`/`scrollTo` con `smooth` dejan `scrollLeft`
  en 0 y la animación nunca arranca; con `'auto'` se mueve perfecto. **La causa no quedó
  establecida**: en ese mismo navegador `requestAnimationFrame` entregó **un solo cuadro**
  para 320 ms, o sea cuadros famélicos. Lo que importa es que la animación propia
  **degrada bien**: con cuadros normales anima y con cuadros famélicos salta al lugar
  correcto; `smooth` no hacía nada y los 9 tests seguían verdes (jsdom no tiene scroll).
- ⚠️ **Después de mover se vuelve a medir A MANO**, sin esperar el evento `scroll`: ese
  evento va alineado con los cuadros y llegaba tarde, así que la fila quedaba movida y la
  flecha izquierda APAGADA — sin forma de volver. Medido.
- ⚠️ **El arrastre se engancha SOLO a `pointerType === 'mouse'`.** El dedo ya tiene el
  scroll nativo; interceptarlo es cómo estos componentes terminan sintiéndose peores que
  un scroll normal. Y un arrastre suprime el `click` siguiente **en captura**, o deslizar
  la fila abre una ficha que nadie quiso abrir.
- Las flechas **se esconden bajo 560 px**: con 1,3 tarjetas, dos botones de 38 px tapan
  producto, y ahí el dedo es la forma natural. El teclado no se queda sin salida (los
  enlaces de las tarjetas son focalizables).
- Tests: `ui/Carrusel.spec.tsx` (9). ⚠️ El del destino le pasa un `requestAnimationFrame`
  que responde con un instante muy posterior: así mide el DESTINO —y su recorte en los dos
  extremos— sin depender de cuadros.
- ⚠️ **`setup-dom.ts` ganó dos dobles**, `ResizeObserver` y `matchMedia`, que jsdom no
  trae. Van ahí y **no** como guardas en el componente: un `typeof X !== 'undefined'` sería
  código muerto en todo navegador real.

**La tarjeta** cambió con él: la foto pasó de `4/3` a **`4/5`** (más alto sin ensanchar la
tarjeta, que es lo que no se puede tocar), **«Personalizable» bajó de la foto al cuerpo**
—las otras tres insignias son anuncios, ésa es un atributo— y la **etiqueta de categoría se
esconde cuando toda la franja es de la misma**, derivado de los datos y no de haber pasado
`categoria`. ⚠️ `TarjetaIndice` no muestra «Personalizable» porque su índice liviano no
lleva `custom`, y ese índice se mantiene mínimo a propósito.

**Contraste:** `--text-faint` era `#5d76a0` = **3,90:1** sobre la tarjeta, por debajo del
4,5 de AA y a 12 px. Pasó a `#7e97bd` = **6,05:1**, todavía por debajo de `--text-dim`
(8,30) para conservar la jerarquía. Lo usan cuatro textos chicos, todos sobre fondo oscuro.

**El hero no entraba en un teléfono.** Medido a 390×844: los botones arrancaban en **747 de
844** y el segundo terminaba en 847, fuera de la pantalla. Con el título a 30 px y el arte
a 150, van de **600 a 700**. ⚠️ La primera medición dio números absurdos porque
`window.scrollTo(0, 0)` **no llegó**: con el `scroll-behavior: smooth` del repo hay que
pasar `behavior: 'instant'`, que ya está escrito en la sección de mediciones.

## Áreas táctiles y el botón flotante de WhatsApp (2026-11-11)

- **`BotonWhatsapp.astro`**, montado en `Base`. ⚠️ Lleva **`data-bl="wa-directo"` y no
  `cotizar`**: los `cotizar` los intercepta `PiezaAMedida` para abrir su modal, y éste
  tiene que abrir el chat. Los dos los rellena `WhatsappCotizar`. **Nace `hidden`** y se
  muestra al tener teléfono: si naciera visible, con la API caída habría un botón de venta
  que no hace nada.
- ⚠️ Su `:hover` que mueve vive dentro de `@media (hover: hover)` **porque lo exigió
  `hover-con-reduce.spec.ts`**: en un teléfono un hover que mueve se queda pegado al tocar.
  El guardián hizo su trabajo.
- **Áreas táctiles de 44 px**: «Ver todo →» daba 20 y los enlaces del pie 33. ⚠️ La regla
  va con **`(pointer: coarse), (max-width: 560px)`**, las dos. Lo correcto en teoría es
  solo la primera —decide el dedo, no la pantalla—, pero **un Chrome de escritorio
  redimensionado a 390 px sigue reportando puntero FINO**, así que con esa sola no se puede
  verificar sin emular un dispositivo: medido, el pie seguía en 33. Con el ancho, queda
  comprobable. Después: pie 45-60, «Ver todo» 44.

## El guardián de voseo tenía un agujero ESTRUCTURAL (2026-11-11)

La lista a mano caza lo que alguien pensó en enumerar; un imperativo de un verbo que no
esté pasa en verde. **Dos textos sobrevivieron desde el 09/11**: «coordiná» en la franja
del encabezado y «Cotizá» en la **meta description**, o sea el texto que muestra Google.
Y al poner el patrón apareció un **tercero** que nadie había visto, en `/impresion-3d/`.

- El arreglo es un **patrón sobre `-á`** con lista blanca (`IMPERATIVO_EN_A`), igual que ya
  se hacía con el presente.
- ⚠️ **El primer intento excluía los futuros dejando fuera lo terminado en `-rá`, y ESTABA
  MAL**: se comía «mirá», «comprá», «esperá», «mostrá» — los imperativos más comunes de una
  tienda. Lo cazó el test de discriminación. Es **el mismo error** que se cometió horas
  antes en el guardián de la API con una exención de `-rás` que escondía «comprás».
- **Se eligió fallar hacia el FALSO POSITIVO**, y el costo está medido: en todo el código
  hay tres palabras terminadas en «á» y **ni un futuro**. Si aparece uno, el test se pone
  rojo nombrándolo y se agrega a la lista blanca: una línea, a la vista. Al revés, el
  defecto se publica.
- ⚠️ **`-é` y `-í` quedan fuera del patrón**: chocan con el pretérito de «yo» («compré»,
  «escribí»), donde el falso positivo sería constante.
- ⚠️ **El guardián de `calc3d-api`/`calc3d-web` tiene el MISMO agujero y sigue abierto**:
  su lista de imperativos son 12 palabras. Acá no se tocó porque es otro repo y tiene
  trabajo sin desplegar.

## Una opción puede EXIGIR una medida de otro grupo (2026-11-11)

Los grupos de opciones son independientes y se suman sin mirarse, así que el árbol de
Navidad se podía pedir en **12 cm con 7 nombres** —que no entran— y la ficha cotizaba
**$9,50** cuando con los 18 cm que hacen falta son **$16,50**: $7 regalados por pedido.

⚠️ **La regla ya estaba escrita en el catálogo y nadie la leía**: el dueño rotula la
opción «**7 nombres · desde 18 cm**». `lib/restricciones.ts` la lee de ahí
(`restriccionDeMedida`), apaga los tamaños que no alcanzan y sube al permitido más barato
(`corregirSeleccion`). **Decisión del dueño** frente a las otras dos salidas: un mecanismo
de dependencias en el modelo (correcto, pero es migración + contrato + pantalla de panel) o
partir el producto en dos (sin código, pero le cambia el catálogo y las URLs).

- ⚠️ **EL LÍMITE: depende de un TEXTO.** Si la etiqueta se reescribe de otra forma —«7
  nombres (18 cm o más)»— la regla deja de aplicar **y nada falla**: vuelve el bug. Las
  formas reconocidas están fijadas en `restricciones.spec.ts`.
- **Nada está escrito a mano**: el grupo de medidas se DERIVA (aquel cuyas opciones son
  todas «N cm»), así que renombrarlo «Alto» no lo rompe, y ningún `slug` aparece en el
  código. Para el resto del catálogo la función devuelve `null` y no cuesta nada.
- **La corrección SUBE el precio sin que el visitante lo pida, así que se dice** (un
  `role="status"` bajo las opciones). Un número que cambia solo es el mismo bug al revés.
- Las opciones prohibidas **se apagan, no se esconden**: una opción que desaparece deja al
  visitante buscando el tamaño que vio hace un segundo.
- **El campo de personalización deja de ser «(opcional)»** cuando lo elegido pide nombres:
  pasa a «Escribe los nombres, uno por línea», bloquea el botón de agregar y avisa si se
  escriben más de los que se pagaron (`problemaDeNombres`). Cuántos se pagaron sale de la
  misma etiqueta (`cantidadDeNombres`); «Más de 10 · lo coordinamos» no declara cuántos y
  solo exige que haya algo.
- ⚠️ **Y LA NOTA AHORA VIAJA EN EL MENSAJE DE WHATSAPP.** Hasta ese mismo día no llegaba a
  ninguna parte: iba en el `POST` a la bandeja, y al sacar ese POST se perdía entera y en
  silencio —el carrito la mostraba en pantalla y el mensaje no la decía—. Sin eso el pedido
  llega sin el dato con el que se fabrica la pieza. La FOTO no viaja (una clave de bucket
  no le sirve a nadie en un chat): el mensaje pide que la manden por ahí.
- Tests: `lib/restricciones.spec.ts` (22, función pura) y `ficha/Ficha.spec.tsx` (5, el
  CABLEADO — el bug vivía justo ahí, en que nadie leía la regla). Por mutación, que la
  ficha ignore `corregirSeleccion` tumba 2 de pantalla y **0** de función pura.

## El contador de cantidad se ESCRIBE (2026-11-11)

El número entre − y + era un `<span>`: para pedir 24 unidades había que tocar «+» 24 veces.
Ahora es un campo editable, en **`components/ui/Cantidad.tsx`**, y lo usan la ficha **y** el
carrito — con dos copias del mismo JSX, el día que una gane el teclado la otra se queda
atrás y nadie se entera (es lo que le pasó a las dos tarjetas del catálogo con «Nuevo»).

- Solo dígitos; vacío, 0 o negativo vuelven al mínimo **al salir**, no al teclear (si no,
  no se podría borrar para escribir otra cifra). Lo válido se confirma **en el acto**, para
  que el total, el tramo de mayoreo y el carrito se muevan mientras escribe.
- Enter confirma, ↑/↓ suben y bajan, y **dejar apretado − o + repite** (400 ms de espera,
  90 ms por paso).
- ⚠️ **El valor vigente vive en una REF, no en el estado.** Los pasos de la repetición
  salen de un temporizador que capturó el render en que arrancó: con el estado, las diez
  repeticiones calculan desde el MISMO número viejo. Lo encontró su test, que daba 2 donde
  esperaba 6.
- ⚠️ **El primer paso lo da el `click`, no el `pointerdown`**, y el `click` que viene
  DESPUÉS de un `pointerdown` se descarta. El teclado no emite `pointerdown`: sin ese
  filtro, el mouse contaría dos pasos por clic y el teclado ninguno.
- ⚠️ **Bajar del mínimo ya NO borra el renglón del carrito**: `−` se apaga y para sacar
  algo está «Quitar». Perder un renglón por tocar `−` una vez de más era fácil y no tenía
  deshacer.
- ⚠️ **El `.qty` pasó de 104 a 120 px** (el campo mide 40 donde el `span` medía 24), así
  que `.esq-cantidad` lo acompaña. Su guardián **solo comparaba el ALTO**, o sea que el
  ancho del esqueleto no lo vigilaba nadie: ahora `esqueleto-mide.spec.ts` lo deriva de las
  tres declaraciones que lo dibujan (2 botones + 2 huecos + el campo). Medido en el
  navegador: 120 px.
- ⚠️ **«Quitar» salió del `.qty`, y el bug era de ESPECIFICIDAD**: `.cart-del` (0,1,0)
  perdía contra `.qty button` (0,1,1), así que heredaba su `width: 32px` y su borde — el
  recuadro del hover no envolvía la palabra (la «Q» quedaba afuera) y era más alto que − y
  +. Como hermano, `.cart-del` manda sobre sí mismo. Medido después: 57×32 para un texto de
  37 px, alineado al píxel con el contador.
- Tests: `components/ui/Cantidad.spec.tsx` (9), incluidos la repetición con temporizadores
  falsos y los dos caminos del clic (mouse y teclado).

## El pedido va DIRECTO a WhatsApp (2026-11-11)

⚠️ **La tienda ya no escribe NADA en el servidor.** Hasta el 2026-11-11 el cajón pedía
nombre y WhatsApp, hacía `POST /public/store/orders` y recién entonces ofrecía el botón;
la pieza a medida hacía lo mismo contra `/custom-requests`. **Decisión del dueño:** las
dos puertas abren WhatsApp y punto. El formulario pedía datos que WhatsApp ya trae, en el
momento exacto de la compra, que es donde se pierden las ventas.

**La bandeja del panel queda sin usarse y NO se quitó** (decisión del dueño): el endpoint
sigue vivo, y por eso `api-escritura.ts` (`enviarPedido`, `enviarConsulta`),
`itemsParaPedido` y `validarContacto` **se quedan en el repo con sus tests**. No son
código muerto por descuido: volver atrás es un import.

**Lo que se perdió, dicho para que no lo descubra alguien dentro de seis meses:**
- un pedido que no se termina de mandar por WhatsApp **no deja ningún rastro**;
- el pedido ya no nace con `originChannel: STORE`: la atribución por campaña hay que
  ponerla a mano al crearlo en el panel;
- ⚠️ **el total del mensaje lo calcula la TIENDA y el servidor ya no lo recalcula**, así
  que una regla de precio que falte en `lib/precio.ts` se le manda al cliente **por
  escrito**. Esto cambia dónde tiene que vivir la validación del árbol de Navidad (el
  punto 1 del spec de noviembre pedía cerrarla «también en el servidor al crear el
  pedido», y ya no hay creación de pedido en el servidor).

**Reglas que no hay que romper:**
1. ⚠️ **El carrito NO se vacía solo**, ni al cerrar el cajón. Sin copia en el servidor,
   vaciarlo sobre un mensaje que capaz no se envió es perder el pedido entero. Se vacía
   quitando renglones. Lo mismo con el texto del modal de pieza a medida.
2. **El renglón del carrito guarda el unitario PRE-TRAMO** (base + recargos de opción); el
   descuento por mayoreo lo aplica `precioUnitarioItem`/`precioRenglon` con la cantidad
   ACTUAL. Guardarlo ya con descuento lo aplicaría dos veces.
3. **El carrito DENORMALIZA** el nombre/imagen/tramos/mínimo en cada renglón al agregarlo,
   para renderizar el cajón **sin re-traer el catálogo** en cada página (robusto, sin
   depender de CORS para mostrar). De la API solo sale el mensaje (teléfono y tasa).
4. **Sin el WhatsApp del negocio no hay enlace: se DICE, no se esconde el botón.** Y
   mientras la info viaja se dice que está en camino — «todavía no llegó» y «llegó y no
   trae teléfono» son dos cosas distintas, y antes no se notaba porque el botón aparecía
   recién después de enviar.
5. La **pieza a medida** conserva **un** campo, el de qué necesita: sin él no hay mensaje
   que mandar. El botón queda **apagado y a la vista** con el motivo al lado.

⚠️ **Y una advertencia sobre los tests:** `Carrito.spec.tsx` **nunca cubrió el checkout**,
así que al borrar el formulario entero los 416 tests quedaron **verdes**. Los casos del
flujo nuevo están en `Carrito.spec.tsx` («el pedido va directo a WhatsApp», 3) y en
`PiezaAMedida.spec.tsx` (3, el archivo no existía). Medido por mutación: devolver el
vaciado automático al cerrar tumba **1** test, el que corresponde.

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
(nombre, precio, foto, colores, tramos, `badge`, `nuevo`, `compareAt`) y **tiene prohibido**
`desc`, `description`, `specs`, `optionGroups`, `images` y `summary` — su test exige las
claves exactas. `badge`, `nuevo` y `compareAt` están para que ordenar por precio no le quite
a la tarjeta su insignia ni su tachado de oferta.

⚠️ **Las DOS tarjetas tienen que dibujar lo mismo, y es fácil que no lo hagan.**
`TarjetaProducto` (paginado estático) y `TarjetaIndice` (filtrado) son dos componentes con
el mismo aspecto, así que una insignia agregada a una no aparece en la otra y **nadie se
entera**: el visitante solo ve la segunda después de tocar un filtro. Pasó el 2026-11-08
con «Nuevo» — `TarjetaIndice` leía `e.nuevo` y el índice no lo llevaba, así que valía
`undefined`. **Todo test de insignia cubre las dos** (`insignias.spec.tsx`), porque cubrir
una sola fue exactamente lo que dejó pasar esto.

## El precio de la ficha: unitario Y total (2026-11-08)

La ficha muestra el unitario grande y, **debajo del botón**, el renglón
«N × precio = total». No es decoración: sin él, subir la cantidad **no cambiaba nada
visible**. El unitario sí se movía al cruzar un tramo, pero cambia arriba de todo —lejos
del contador, que está al final— y sin decir que es por unidad. El precio grande agrega
**«c/u»** en cuanto hay más de una unidad, por lo mismo.

- El renglón aparece solo con **cantidad > 1**: con una sola, el precio grande YA es el
  total y repetirlo es ruido.
- **`totalRenglon(unit, qty)`** (en `precio.ts`) redondea a centavos y la usan la ficha
  **y** el pie del carrito. Es a propósito: con dos cuentas distintas, lo que el cliente
  vio antes de agregar no coincidía con lo que ve en el cajón. El redondeo va **por
  renglón** y no al final de la suma, o el pie no cuadra con lo que está escrito arriba.
- Lo cubre **`Ficha.spec.tsx`** (pantalla), no la función pura: borrar el renglón del JSX
  deja a `totalRenglon` perfectamente verde.

## Avisos flotantes: sonner, y sus DOS trampas (2026-11-09)

Al agregar al pedido sale un **aviso flotante** (`toast.success` de **sonner**) con
«Agregado a tu pedido», la pieza y la cantidad, y un botón «Ver pedido». Reemplazó al
cartel fijo «Ya está en tu pedido» que vivía debajo del botón (`​.pdp-agregado`, borrado).

- **sonner es la ÚNICA librería de avisos del repo.** No sumar otra: dos sistemas de
  toasts conviviendo es el problema, no la solución.
- El aviso **no abre el cajón solo**: quien arma un pedido de varias piezas tendría que
  cerrarlo en cada una. El botón «Ver pedido» dispara **`abrirCarrito()`**
  (`lib/carrito.ts`), que emite el evento global **`cart:open`** que `Carrito` escucha.
  No usa `[data-bl="cart-open"]` porque el aviso vive en un **portal**, fuera del árbol
  de la ficha.

**Trampa 1 — el aviso que no se ve.** `toast()` empuja a un store global que SOLO se
pinta si hay un **`<Toaster />` montado**. La isla es `components/ui/Avisos.tsx` y va en
**`Base.astro`**. Si desaparece de ahí, cada aviso del sitio se vuelve un **no-op
silencioso**: sin error en consola, sin fallar el build, con los tipos compilando. Lo
cuida **`components/ui/avisos.spec.ts`**, que lee la FUENTE del layout (un `.astro` no se
puede renderizar desde vitest). Por lo mismo, `Ficha.spec.tsx` monta su propio
`<Toaster />` y busca el **texto en pantalla**: un test con `vi.mock('sonner')` quedaría
verde justo con el defecto puesto.

**Trampa 2 — el CSS de marca que pierde en silencio.** sonner **inyecta sus estilos en
tiempo de ejecución**, sin `@layer`, así que:
1. Un bloque dentro de `@layer components` **pierde siempre**, por mucha especificidad
   que tenga (lo que no está en capa le gana a cualquier capa). Por eso los estilos del
   aviso viven **al final de `global.css` y FUERA de capa**, como la «Guardia de
   movimiento».
2. Una **clase y un atributo pesan lo mismo**: `[data-sonner-toaster].bl-toaster` empata
   con `[data-sonner-toaster][data-sonner-theme="dark"]` y **pierde por orden**. Hay que
   sumar un selector más (`[data-sonner-theme]`).
Lo que se pisa son sus **variables** (`--normal-bg`, `--normal-text`, `--normal-border`…),
no sus clases: así una versión nueva de sonner no rompe el color. Medido el 2026-11-09
con cada paso mal: el aviso salía **negro con el botón blanco**, con el CSS cargado,
escrito y sin un solo error.

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

### El HERO lleva DOS imágenes (2026-11-11)

Un `HERO` tiene **fondo** (`backgroundUrl`: la foto grande detrás del texto, a todo el
ancho) y **arte** (`imageUrl`: lo que reemplaza al banano, en la columna de al lado).
**Las dos son opcionales por separado y hace falta al menos una** — lo exige el contrato.

⚠️ **El filtro es el que decide si un banner se ve, y era la pieza que faltaba.**
`bannersDeHero` pedía `imageUrl`, así que un banner **con solo fondo** se guardaba bien en
el panel, la API lo publicaba, y la portada **no lo mostraba nunca, sin un solo error**.
Hoy acepta `imageUrl || backgroundUrl`; 3 tests fijan las tres combinaciones. Si alguna
vez se agrega una tercera imagen al hero, **este filtro es el tercer lugar que hay que
tocar** (contrato → proyección pública → filtro).

⚠️ **El velo sobre el fondo (`.hero-fondo::after`) NO es decoración: es lo que hace que el
título se lea.** El texto va en blanco y, encima de una foto cualquiera, la mitad de las
veces no se distingue. Son dos degradados (horizontal en escritorio, **vertical en el
teléfono**, porque ahí el texto ocupa todo el ancho). Verificado en el navegador con una
foto **clara a propósito** —el caso difícil para texto blanco— a 1280×900. Si se saca, el
hero pasa a ser legible por suerte.

- La capa del fondo va **FUERA del `.container`** (su razón de ser es el ancho completo) y
  se dibuja **solo la del slide activo**: con todas montadas, el navegador baja varias
  fotos de 1920 px para mostrar una.
- Sin arte, el slide lleva `hero-slide--sin-arte` y el texto toma la fila entera, acotado
  a `56ch`: una línea de 1.200 px no se lee.
- ⚠️ **El fondo NO va en `fotos-reservan-espacio.spec.ts`**, y está dicho en el propio
  test: está posicionado absoluto cubriendo al hero, así que no empuja nada al cargar —
  reservarle alto sería reservarlo dos veces.

⚠️ Los tres **ya no necesitan un despliegue**: se refrescan en el navegador como el resto
del catálogo.
- Si los banners fallan, el build **NO** se cae (`fetchBanners().catch(() => [])`): un
  banner es decoración. El catálogo, en cambio, sí es obligatorio.
- El arte de un banner es remoto y sus medidas no se conocen en el build, así que no puede
  llevar `width`/`height`: la reserva de espacio la hace `.hero-art--banner` con
  `aspect-ratio` + `object-fit`. Sin eso el hero salta cuando la imagen carga.
  - ⚠️ **Era `1 / 1` + `contain` y pasó a `16 / 9` + `cover` el 2026-11-11.** El panel
    dice «Se recomienda horizontal (16:9)» y **previsualiza el arte recortado a 16:9**
    (`StoreBanners.tsx`), pero el hero reservaba un CUADRADO: una imagen horizontal
    quedaba centrada con espacio vacío arriba y abajo, ~320×180 dentro de 320×320. O sea
    que lo aprobado en la vista previa no era lo publicado. Es el mismo criterio que ya
    estaba escrito para el banner de CATEGORÍA, donde los dos lados sí coincidían.
  - ⚠️ **Nada comprueba que las dos proporciones sigan iguales**, porque viven en repos
    distintos (el recorte en `calc3d-web`, el dibujo acá). Si alguna vez se cambia una,
    hay que cambiar la otra a mano.
  - ⚠️ **En móvil el banner NO se achica como el banano**: el banano es decoración y a
    150 px se entiende; un banner lleva un mensaje y a 150 px no se lee. Va a 240 de
    ancho, que en 16/9 son 135 de alto — menos que el cuadrado del banano, así que el
    hero no crece.
- ⚠️ **El banner de CATEGORÍA reserva `16 / 9`** (`.banner-cat img`, + `object-fit: cover`),
  y el número lo eligió el dueño **por coherencia con la vista previa del panel**: el arte
  se sube viéndolo en ese recorte, así que cualquier otra proporción acá recorta distinto de
  lo que el dueño aprobó. No es un valor «de diseño» que se pueda afinar a ojo.
  - Medido a 390 px con una imagen que nunca carga: **210,9 px** de alto reservado
    (proporción 1,778). Con `aspect-ratio: auto` vuelve a **0 px** y el listado salta
    entero cuando llega el arte.
  - Lo exige **`src/fotos-reservan-espacio.spec.ts`**, y exige el **valor**, no solo que la
    declaración exista: un guardián que acepte `auto` no protege nada, porque `auto` es
    exactamente el defecto.
- **Flash Sale**: isla que consume `/public/store/sale`; `{ sale: null }` → oculta. Contador
  regresivo; el precio cobrado NO cambia (solo tacha + badge `-XX%`).

## Marca (fuente de verdad del CSS en `src/styles`)
Navy + amarillo, Poppins, oscuro siempre (`<html class="dark">`). Paleta en
`src/lib/tokens.css` (`--ink-900 #000814`, `--ink-700 #001D3D`, `--ink-600 #003566`,
`--yellow #FFC300`, `--yellow-2 #FFD60A`). Logo/isotipo/mascotas en `src/assets/brand/`.
**No** inventar contadores, reseñas ni portafolio: solo lo verdadero.

### Poppins va AUTOHOSPEDADA, con overrides de métrica (2026-11-09)

Hasta el 09/11 Poppins venía de **Google Fonts por `<link>`**: 5 peticiones a otro dominio
en una carga de portada (1 de CSS + 4 woff2) justo en el camino crítico, y el `h1` de la
portada **crecía 37,1 px de alto (33 %)** cuando por fin llegaba, empujando todo lo de
abajo. Ahora va en el bundle (`@fontsource/poppins`, las 6 caras `latin` por `@import` al
principio de `global.css`) y **no se le pide nada a Google**.

Lo que sostiene que no salte, y que es lo fácil de romper:

- **Dos `@font-face` de respaldo con overrides de métrica**, calibrados contra **Arial**
  (`local('Arial'), local('Helvetica'), local('Liberation Sans')`). Uno por rango de peso,
  con `size-adjust` **104 %** y **123 %**.
- ⚠️ **Los `ascent-override`/`descent-override` van DIVIDIDOS por su `size-adjust`**, porque
  `size-adjust` escala también las métricas sobreescritas. Los comentarios del CSS llevan la
  cuenta al lado de cada número (`1050/1000 / 1.04`). Sin dividir, el ajuste **agrega** el
  salto que vino a quitar.
- **Arial, no `system-ui`**: un `size-adjust` solo tiene sentido contra UN juego de anchos
  concreto. En Windows y macOS `local('Arial')` resuelve y el ajuste aplica; **en Android cae
  a Roboto**, que es más angosta, y la corrección es parcial. Lo que hace aceptable el
  riesgo: **toda rama que falle cae a `system-ui` sin ajustar = el comportamiento de antes**,
  nunca peor.
- `@fontsource` trae **`font-display: swap`** en cada cara. No se cambia a `block`.
- Los `size-adjust` se eligieron contra los títulos que el sitio tiene HOY.
- Lo vigila **`src/fuentes.spec.ts`**.

⚠️ **LA PRECARGA CUESTA 20 ms EN MÓVIL Y 76 ms EN ESCRITORIO, Y ESTÁ PUESTA A PROPÓSITO.**
No es un descuido ni una optimización a medias: es **decisión del dueño**, tomada con dos
capturas y los dos números delante. Lo que compra es cerrar la ventana de **~540 ms** en que
el titular principal de la portada se ve en la familia de respaldo — **no se mueve de
lugar** (148,3 × 335 px y el mismo quiebre en 4 líneas, con y sin Poppins: los overrides
funcionan), pero se ve **fino en vez de negro**. Solo afecta la primera visita.

- **El `<link rel="preload">` vive en `Base.astro`** y su URL sale de
  `import … '@fontsource/poppins/files/poppins-latin-900-normal.woff2?url'`. ⚠️ **Esa ruta
  no se escribe a mano**: tiene que ser el **mismo** archivo que resuelve el `@font-face`, o
  son dos URLs y el mismo woff2 se baja **dos veces** — más tráfico que antes de
  autohospedar.
- `src/fuentes.spec.ts` **permite esta precarga y prohíbe una segunda** por otro camino.
- **El peso 900 no es arbitrario:** el CSS *declara* 6 pesos pero la portada *descarga* 4
  (400, 600, 700, 900); 500 y 800 quedan `unloaded`. Precargar uno de los dos que no se usan
  habría sido tráfico puro.
- ⚠️ **No reabrir el tema con una medición nueva sin leer antes la sección de medición de
  este archivo.** Este número se midió mal una vez (dio −150/−220 ms, o sea «la precarga
  mejora todo») y el error era del arnés, no de la página.

**El resultado, medido el 10/11 comparando el estado previo al plan contra hoy:**

| | Antes (Google Fonts) | Después |
|---|---|---|
| Reflujo del `h1` de la portada (390×844) | **+37,1 px (33 %)** | **0 px** |
| CLS de la portada móvil | 0,0342 | **0,0167 (−51 %)** |
| Peticiones a Google por carga | 5 | **0** |
| Ventana con la fuente de respaldo en pantalla | 514 ms | **0 ms** |
| LCP de la portada (móvil / escritorio) | 788 / 780 ms | 788 / **804** ms |

O sea: el LCP de la portada queda **igual en móvil y +24 ms en escritorio** (dentro de la
tolerancia de 50 ms del plan), y a cambio desaparece el salto de 37 px y la mitad del CLS.
Los 76 ms de la precarga son reales, pero son el costo **contra autohospedada-sin-precarga**,
que no es el estado del que se viene: autohospedar devuelve casi todo lo que la precarga
cuesta.

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

## El texto habla de TÚ, no de vos (2026-11-09)

El sitio nació con voseo argentino y el negocio es venezolano: el cliente leía a alguien
de otro país. Se tradujeron los 36 textos de cara al usuario (portada, ficha, catálogo,
carrito, FAQ, 404, impresión 3D) a «tú», y «acá» pasó a «aquí».

Lo que lo sostiene es **`src/idioma.spec.ts`**, que lee el código fuente y falla si
vuelve a aparecer una forma de voseo en texto visible. Tres cosas que no hay que deshacer:

- ⚠️ **Mira el FUENTE, no una pantalla renderizada.** Lo que hay que atajar es el texto
  recién escrito, antes de que lo vea un cliente.
- ⚠️ **La lista de formas es A MANO.** Un patrón general («cualquier palabra terminada
  en -ás») se come «además», «después», «atrás» y «quizás»; un guardián que grita por
  todo termina desactivado.
- ⚠️ **`` NO funciona junto a una vocal acentuada en JavaScript**, y esto mordió DOS
  veces. Un `/acá/` no encuentra «desde acá»: después de la «á» no hay frontera de
  palabra. La primera versión del test pasó en VERDE con «desde acá» escrito en la
  portada. Se arregló en `LUGAR`… y se dejó el `` en la lista de voseo, así que
  **ninguna forma terminada en vocal acentuada se detectaba**: «mirá», «probá»,
  «mandá», «elegí». Las que terminan en «s» sí, y eso hizo parecer que el guardián
  andaba. «Mirá por categoría» siguió publicado en la portada hasta que se corrigió, el
  mismo día. Las dos listas usan miradas laterales (`(?<![a-záéíóúñ…])`).
- Los comentarios del código se saltan (de línea Y de bloque): están en el español de
  quien los escribió y no los lee ningún cliente. Validado con dos mutaciones el
  2026-11-09: voseo en texto visible → rojo; el mismo voseo en un comentario → verde.

⚠️ **Los textos que vienen de la API son DATOS** (las descripciones que escribe el
dueño): no se traducen desde acá ni los mira el guardián.

## La portada, después del 2026-11-09

Cinco cambios que pidió el dueño porque «se veía vacía». Lo que no hay que deshacer:

- ⚠️ **El hero YA NO entra con animación.** Arrancaba en `opacity: 0` y se encendía
  escalonado hasta los 180 ms: lo primero que veía el visitante era un hueco en blanco,
  justo arriba. El contenido ya está horneado, no hay nada que esperar. Las demás
  entradas siguen, que están más abajo. El selector viejo quedó anotado en el CSS por si
  alguna vez se quiere devolver.
- **La franja principal es la COLECCIÓN del panel** (2026-11-13): `ColeccionEnVivo` pinta «Destacados» horneado y al montar lee `GET /public/store/coleccion`; sin colección vigente (`null`) se queda en «Destacados» (`franjaDePortada`, `lib/portada.ts`). La franja hardcodeada «Colección Navidad 2026» se **quitó**: la colección la reemplaza. Cada colección tiene página `/coleccion/<slug>/` (`PaginaColeccion`; 404 de la API si está oculta o fuera de ventana; una creada tras el build la rescata la 404 vía `RescatarColeccion`).
- **Destacados son 8** (`TOPE_DESTACADOS`), en 4 columnas y **2 en celular**:
  `.shop-grid--destacados` no baja a una columna, porque 8 productos en una columna son
  ocho pantallas de scroll y la portada se sigue sintiendo vacía.
- **Las tarjetas de categoría llevan foto**, y sale del CATÁLOGO (`portadaDe`, en
  `paginacion.ts`): `StoreCategory` no tiene campo de imagen en la base y no se va a
  agregar — sería una migración más y una subida por categoría. Si ninguna pieza de la
  categoría tiene foto, la tarjeta va sin imagen y NO con la de otra categoría.

## La moneda que se muestra: BCV, no USD (2026-11-09)

El precio publicado está en **dólares BCV**, que no es el dólar del costeo (ese es USDT;
ver el CLAUDE.md de la API). La etiqueta decía «USD» en todas partes.

⚠️ **Se cambió en la ficha y el carrito, y las TARJETAS se quedaron en USD**: el catálogo
y la ficha del mismo producto nombraban monedas distintas para el mismo número. Por eso
existe `components/catalogo/moneda.spec.tsx`, que falla si un lugar nuevo vuelve a
escribir «USD» en texto visible.

⚠️ La excepción es `product:price:currency` de los datos estructurados, que pide un
**código ISO** y no existe uno para «dólar BCV». Ahí queda `USD` a propósito: inventar
un código rompería los resultados enriquecidos de Google.

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
