# Rediseño de la tienda: estructura para 500–1.000 productos y sin materiales a la vista

**Fecha:** 2026-11-07 · **Repo:** `calc3d-landing` · **Estado:** diseño aprobado en
estructura, sin implementar.

Boceto navegable de referencia: `docs/boceto-tienda-2026-11-07.html` (publicado también
como artefacto). Muestra portada, catálogo y ficha con los tokens de marca reales y
notas por decisión. **El boceto es la referencia de ESTRUCTURA, no el código a copiar**:
está escrito en HTML/CSS plano, fuera del stack del repo.

---

## 1. Qué es esto y por qué ahora

El dueño pidió tres cosas sobre la tienda pública: que se vea **más profesional y
moderna**, que tenga **mejores animaciones**, y que **deje de hablar de materiales**
(PLA, PETG, ABS, TPU) de cara al cliente, porque a un consumidor no le importa el
material mientras la pieza sea buena; al experto se le explica por privado.

Durante la revisión apareció el dato que cambia todo lo demás: el dueño **estima cargar
entre 500 y 1.000 productos**. Hoy hay **1**. La tienda actual no sobrevive a eso, y no
por estética: por cómo está armada. Por eso este documento cubre dos cosas que no se
pueden separar — **la estructura visible** y **la arquitectura que la sostiene** —, más
la limpieza del material.

### El porqué, en una línea

Con mil productos el problema del visitante deja de ser «qué vende esta gente» y pasa a
ser **«cómo encuentro lo que busco»**. Toda la estructura nueva sale de ahí.

---

## 2. Objetivos

1. Que un visitante encuentre un producto entre mil **sin saber el nombre exacto**.
2. Que la tienda cargue y se publique bien con 1.000 productos (hoy no lo hace).
3. Que no aparezca **ningún nombre de material** en lo que lee un cliente.
4. Que el sitio se sienta **vivo**: movimiento deliberado, no decorativo.
5. Que el SEO **mejore** con el crecimiento del catálogo, en vez de concentrarse en una
   sola página.

### No-objetivos

- No se agrega pago en línea. El pedido se sigue **registrando** en la bandeja del panel
  y cerrando por WhatsApp. Decisión vieja y firme.
- No hay cuentas de cliente.
- No se renombra el repo (`calc3d-landing` sigue siendo la tienda, a propósito).
- No se reescribe el stack: sigue Astro + islas de React + Tailwind 4 + shadcn.
- No se rehace `src/styles/global.css` de punta a punta.

### Anti-objetivos (esto sería un fracaso aunque «funcione»)

- **Una tienda linda y vacía.** Si al terminar el catálogo sigue teniendo 1 producto sin
  foto, el trabajo no sirvió para nada. El contenido es tarea del dueño y está fuera de
  este documento, pero el diseño tiene que verse bien **con poco y con mucho**.
- **Perder SEO.** Hoy hay una página por ruta y por producto, con JSON-LD y sitemap. Si
  el rediseño convierte contenido en algo que solo existe tras hidratar, se perdió lo
  único que hace valioso a Astro acá.
- **Un sitio pesado.** Si para animar se convierte HTML estático en islas de React, se
  cambió el activo del sitio por un efecto.
- **Inventar confianza.** Nada de contadores, reseñas, logos de clientes ni portafolio
  que no sean verdad. Regla vieja del proyecto y se mantiene.

---

## 3. Lo que se midió (estado real, 2026-11-07)

Todo esto está verificado, no supuesto. Es el porqué de la mitad de las decisiones.

| Medición | Valor | Dónde |
|---|---|---|
| Productos publicados | **1**, sin foto | `GET /public/store/products` en producción |
| Categorías con productos | **1** (Llaveros) | ídem |
| Peso de UNA tarjeta renderizada | **3.992 bytes** de HTML | `https://bananolab-3d.com/tienda/` |
| Peso de `/tienda/` hoy | 28.792 bytes | ídem |
| `@keyframes` en todo `src/` | **0** | `grep -rn "@keyframes" src` |
| `prefers-reduced-motion` en el CSS | **0** (solo en el JS del carrusel) | `grep -rn "reduced-motion" src` |
| Pedidos HTTP a la API por build | **1 por producto, todos a la vez** | `src/pages/producto/[slug].astro:17` |
| Buscador | **no existe** | — |

### Los tres bloqueos

**A. `/tienda` es una sola página con todo el catálogo adentro.**
`tienda/index.astro` trae todos los productos en el build y se los pasa a la isla
`<Catalogo client:load>`. Astro renderiza **todas** las tarjetas en el HTML **y** además
serializa los productos otra vez como props de hidratación.

| Productos | Peso estimado de `/tienda/` |
|---|---|
| 1 (hoy) | 29 KB |
| 500 | ~2 MB |
| 1.000 | **~4 MB** |

Y se hidrata con `client:load`, o sea bloqueando. No es un problema de estilo.

**B. El build pide una ficha por producto, todas a la vez.**

```js
// src/pages/producto/[slug].astro:17
const fichas = await Promise.all(lista.map((p) => fetchProducto(p.id)));
```

Con 1.000 productos son **1.000 pedidos HTTP simultáneos** a la API de Railway desde el
build de Cloudflare. Choca contra el rate limiter, y el build **falla fuerte a propósito**
(sin `try/catch`): no publica nada. ⚠️ **Esto se arregla del lado de `calc3d-api`**, no
acá — uno de los dos puntos del rediseño que cruzan de repo (el otro son las
subcategorías, §4).

**C. No hay buscador.** Con mil productos, filtrar por color y precio no alcanza.

---

## 4. Decisiones del dueño (ya tomadas, no re-preguntar)

| # | Decisión | Nota |
|---|---|---|
| 1 | **El catálogo manda, el servicio es la salida** | ⚠️ Revierte una recomendación anterior («vender el servicio, catálogo secundario») que se hizo midiendo 1 producto. Con 500–1.000, el catálogo es el negocio. |
| 2 | En la tarjeta y la ficha, el material se reemplaza por **días de producción y mínimo** | Datos que la API ya manda (`leadTimeDays`, `minQty`). Cero trabajo de backend. |
| 3 | La sección «Materiales» de `/impresion-3d` **se reformula por uso**, no se borra | Mismas 4 tarjetas, mismo texto, títulos cambiados. Sin línea técnica al final. |
| 4 | Animaciones **con CSS + IntersectionObserver, sin librería** | Se descartó framer-motion / Magic UI: convertir secciones estáticas en islas de React paga el activo del sitio por un efecto. |
| 5 | **Va a haber más categorías Y subcategorías** | ⚠️ Cambia el alcance: ver abajo. |
| 6 | Un banner del panel **reemplaza solo la imagen** del hero, no sus textos | Se usa el primero por `position`. El `h1` queda fijo en el HTML. ⚠️ Los títulos y subtítulos que el dueño escriba en un banner **dejan de verse en la portada**: es la consecuencia aceptada, no un bug. |
| 7 | El texto SEO de las categorías sale de **plantilla** | Ver la advertencia en §4.1. |
| 8 | El `material` **se queda en el JSON-LD** de la ficha | Ahí solo lo lee Google. Sostiene la búsqueda del experto sin que la palabra aparezca en pantalla. |

### 4.1 ⚠️ Las subcategorías cambian el alcance

El dueño confirmó que **va a crear más categorías y subcategorías**. Eso no es un detalle
de rutas: `StoreCategory` (`calc3d-api/apps/api/prisma/schema.prisma:794`) es **plano**,
sin padre, y `/public/store/categories` devuelve solo `{name, slug}`.

**Aparece una fase 0 que cruza de repo y va ANTES de todo lo demás:**

| Dónde | Qué |
|---|---|
| `calc3d-api` | Migración: `StoreCategory` gana padre (`parentId` auto-relación) + orden dentro del padre |
| `calc3d-api` | `/public/store/categories` devuelve el árbol, no la lista |
| `calc3d-web` | ABM del panel: elegir categoría padre al crear/editar |
| `calc3d-landing` | Rutas `/tienda/<cat>/<sub>/`, migas, sitemap e índice del buscador |

⚠️ **No se puede hacer después.** Si la tienda se construye asumiendo categorías planas,
cuando lleguen las subcategorías hay que rehacer el paginado, el sitemap, las migas y el
índice. Por eso la decisión del paginado en `/pagina/<n>/` (§5.2) importa: deja libre el
segmento que ocupará la subcategoría.

⚠️ **Esto tensiona la decisión 7 (plantilla de texto SEO).** La plantilla alcanza con
cinco categorías; con más categorías **y** subcategorías son decenas de páginas con texto
casi idéntico, que es el patrón que Google trata como contenido pobre. La plantilla se
construye igual —es gratis y reversible—, pero **al pasar de ~15 páginas de categoría hay
que volver sobre esto**: o se escribe texto por categoría (campo nuevo en API + panel), o
esas páginas no van al sitemap.

---

## 5. La estructura

### 5.1 Portada (`/`)

| Orden | Sección | Qué cambia |
|---|---|---|
| 1 | **Hero fijo** | ⚠️ **Se va el carrusel.** Hoy son 3 slides con `client:load` que reparten el mensaje en tres. Queda una promesa, un `h1`, dos acciones. Los banners del panel se siguen soportando: **reemplazan el arte, no rotan**. |
| 2 | **Buscador**, dentro del hero | Nuevo. Es la primera acción con mil productos. |
| 3 | **Categorías** | Reemplaza los bloques por categoría. La portada muestra **puertas**, no productos. Con conteo real por categoría. |
| 4 | **Destacados**, una franja | Funde «Nuestros más vendidos» + los bloques por categoría en una sola sección. Ver abajo qué entra y cómo se llama. |
| 5 | **Flash Sale** | Sin cambios de fondo (la isla se sigue ocultando sola si no hay oferta). Cambia de lugar: va pegada al catálogo. |
| 6 | **Las tres vías del servicio** | Traé tu archivo / mandá foto o medidas / diseño desde cero. Deja de ser el centro: es la salida para lo que el catálogo no cubre. |
| 7 | **Cómo trabajamos** (5 pasos) | ⚠️ **Solo acá.** Hoy está duplicado en `/impresion-3d` como «Cómo es el proceso», con textos distintos. Esa página pasa a enlazar. |
| 8 | **FAQ** | Las 4 preguntas actuales. Sin cambios de contenido. |
| 9 | **CTA + pie** | Sin cambios. |

⚠️ **Se cae la tarjeta de beneficios que dice «Listo en N días».** La `N` se publica
literal hoy (`src/pages/index.astro`, arreglo `beneficios`). El dato real ya vive en la
primera pregunta del FAQ y en cada ficha.

#### ⚠️ Qué entra en «Destacados», y cómo se llama

*(Decisión mía. La primera versión del documento no lo decía, y con mil productos la
franja más visible de la portada la decidiría el azar.)*

Hoy es `productos.slice(0, 4)` (`src/pages/index.astro:27`). Con 1 producto da igual; con
1.000, es el orden interno del panel por accidente.

**Entran los productos que tengan `badge`**, en orden de `position`; si no alcanzan para
llenar la franja, se completa por `position`. `StoreProduct.badge` ya existe, es texto
libre y **el dueño ya lo usa** (el único producto cargado dice «Más vendido»). O sea:
cero trabajo de backend, y el dueño ya tiene el control desde el panel.

⚠️ **El rótulo NO puede decir «más vendidos».** No hay dato de ventas en la tienda, y
afirmarlo es exactamente el anti-objetivo de inventar confianza. El rótulo es
**«Destacados»**. *(El boceto dice «Lo que más sale»: eso está mal y no se copia.)*

*Camino de mejora, fuera de alcance:* un campo `featured` de verdad, que sería migración +
panel + API.

### 5.2 Catálogo

**Rutas nuevas:**

- `/tienda/` → índice de **categorías** + destacados. **No** mil tarjetas.
- `/tienda/<categoria>/` → una página real por categoría, con su `<title>`,
  `description` y canónica propias.
- `/tienda/<categoria>/<subcategoria>/` → ídem para cada subcategoría (decisión del
  dueño, §4.1).
- `/tienda/<categoria>/pagina/<n>/` y `/tienda/<cat>/<sub>/pagina/<n>/` → paginado con el
  `paginate()` nativo de Astro.

Una página de categoría con subcategorías muestra **las subcategorías primero** y después
sus productos paginados: con mil piezas, entrar a «Llaveros» y ver 200 tarjetas no ayuda
más que entrar a «Llaveros / Con logo».

⚠️ **El `pagina/` del medio no es adorno** *(decisión mía)*. Con `/tienda/llaveros/2/`,
el segmento después de la categoría queda ocupado por el número de página y **choca con
una subcategoría futura** (`/tienda/llaveros/con-logo/`): habría que distinguir «número»
de «slug» en la misma posición. Con `pagina/` en el medio, el día que hagan falta
subcategorías (§12.1) el espacio de rutas ya está libre, y hoy no cuesta nada.

**Por qué páginas y no parámetros:** con mil productos, el tráfico de buscadores llega a
«llaveros personalizados», no a «catálogo». Hoy todo eso compite por una sola URL.

**Paginación:** 24–36 por página (el número exacto queda al constructor; ver §9).

**Filtros:**

| Filtro | Hoy | Después |
|---|---|---|
| Categoría | select en la barra lateral | ❌ **Sale.** Ahora es la URL |
| Material | chips multi-selección | ❌ **Sale** (decisión del dueño) |
| Color | chips | ✅ se queda |
| Precio | slider | ✅ se queda |
| Orden | select | ✅ se queda |

⚠️ **La vista compartible por URL (`?col&max&sort`) no se puede perder.** Es una regla
vieja del repo con dos trampas ya documentadas en `CLAUDE.md` («Filtros del catálogo»):
no sincronizar la URL antes de haber restaurado, y sincronizar **también** cuando no hay
resultados. `cat` y `mat` desaparecen de los parámetros.

#### ⚠️ Los filtros operan sobre la CATEGORÍA ENTERA, no sobre la página

*(Decisión mía, no del dueño. Resuelve una contradicción que tenía la primera versión de
este documento.)*

«La isla recibe solo los productos de su página» y «Color / Precio / Orden se quedan» no
pueden ser las dos verdad tal cual: filtrar «rojo» en la página 3 de una categoría de 200
devolvería los rojos **de esos 24**, y además `topePrecio()` y `coloresDe()`
(`src/lib/catalogo.ts`) derivan el dominio de los controles de los productos recibidos —
el tope del slider y los chips de color **cambiarían de página en página**. Eso es un
filtro roto y choca con el objetivo 1.

La forma que se construye:

1. Cada página de categoría recibe **sus 24–36 productos renderizados** (el HTML que lee
   un buscador). Eso corrige el bloqueo A.
2. Además recibe un **índice de toda su categoría**: por producto, solo lo que los
   controles necesitan — `slug`, `nombre`, `precio`, `colores`, `imagen`. Unos 100–120
   bytes cada uno: **~24 KB para una categoría de 200**. Es dos órdenes de magnitud menos
   que los 4 MB del problema A.
3. **Sin filtros activos** manda el paginado estático: `/tienda/<cat>/pagina/2/` es una página de
   verdad y es la que indexa Google.
4. **Con un filtro activo**, la isla trabaja sobre el índice de la categoría completa y
   pagina del lado del cliente, reflejándolo en la URL. El dominio de los controles
   (tope de precio, colores disponibles) sale **siempre del índice**, nunca de la página.

❌ Lo que se descartó: filtros como rutas prerenderizadas (explota en combinaciones) y
degradar los filtros a «dentro de esta página» (se lee como un bug).

**Buscador:** sobre un **índice liviano generado en el build**, global al sitio: `slug`,
`nombre`, `categoría` y **`summary`**. ⚠️ El `summary` entra a propósito: el objetivo 1
es encontrar algo **sin saber el nombre exacto**, y con solo el nombre, buscar «soporte
de celular» no encuentra un producto llamado «Base Anti-Slip». Con el `summary` el índice
queda en ~120 bytes por producto (~120 KB con mil), que sigue siendo aceptable.
⚠️ **No sobre el catálogo completo**: eso reintroduce el problema A por otra puerta.

*Camino de mejora, fuera de alcance:* etiquetas por producto. No existen en el schema
(`StoreProduct` no tiene campo de tags), así que serían migración + panel + API.

**Tarjeta de producto:**

- Línea de datos: `Categoría · Listo en N días · Mínimo N` (el mínimo solo si es > 1).
- ⚠️ `width` y `height` **siempre** en la foto. Hoy van solo si la API los manda
  (`TarjetaProducto.tsx`): con mil fotos en carga diferida y sin medidas, la grilla salta
  mientras bajan.
- El placeholder «sin foto» se queda, pero con el isotipo de la marca: hoy es un bloque
  gris con un cartel y se lee como roto.

#### Los enlaces que mueren con el parámetro `cat`

Al convertir la categoría en ruta, **todo enlace a `/tienda/?cat=…` deja de servir**.
Verificado con `grep`; es mecánico y tiene tests:

| Archivo | Qué hace |
|---|---|
| `lib/banner.ts:29` | `enlaceBanner()` para banners de tipo `CATEGORY` |
| `components/Footer.astro:41` | las categorías del pie |
| `pages/index.astro:106` | los bloques por categoría (mueren con la sección) |
| `pages/producto/[slug].astro:74` | la miga de pan de la ficha |

Todos pasan a `/tienda/<slug>/`. Hay que actualizar `banner.spec.ts` y `catalogo.spec.ts`.
✅ Comprobado que **ninguna de esas URLs se referencia desde `calc3d-web` ni
`calc3d-api`**: el cambio de rutas no rompe nada fuera de este repo.

### 5.3 Ficha (`/producto/<slug>/`)

Cambia una sola cosa visible: la línea de datos pierde el material y queda
`Categoría · Listo en N días · Mínimo N`.

### 5.4 `/impresion-3d`

| Orden | Sección |
|---|---|
| 1 | Hero corto (sin cambios) |
| 2 | «Qué se puede hacer» (sin cambios) |
| 3 | **«Según para qué sea la pieza»** — la ex sección «Materiales», reformulada |
| 4 | FAQ del servicio |
| 5 | CTA |

❌ **Sale «Cómo es el proceso»**: enlaza a la sección de la portada.

---

## 6. El material: inventario y destino de cada aparición

Esta tabla **es la lista de tareas** de la parte de materiales. Está verificada con
`grep` sobre `src/`.

| Archivo | Qué hay | Destino |
|---|---|---|
| `components/catalogo/Filtros.tsx` | columna «Material» (chips) | **Borrar** el bloque y su prop |
| `components/catalogo/Catalogo.tsx` | arma `materiales` y lo pasa | **Borrar** |
| `components/catalogo/TarjetaProducto.tsx:39` | `[p.catLabel, p.material]` | → `[catLabel, días, mínimo]` |
| `components/ficha/Ficha.tsx:116` | `p.material` en `hechos` | **Borrar** esa entrada |
| `lib/catalogo.ts` | `materialesDe`, filtro `materials`, parámetro `mat` | **Borrar** (y sus tests) |
| `lib/producto.ts` | campo `material` en el tipo | **Se queda**: viene de la API y se usa en el JSON-LD (ver §11) |
| `components/inicio/Carrusel.tsx:27` | «Piezas por encargo en PLA, PETG, ABS y TPU» | Muere con el carrusel |
| `pages/index.astro:72` | `description` con los 4 nombres | **Reescribir** sin nombres |
| `pages/impresion-3d/index.astro:16-32` | las 4 tarjetas | **Retitular por uso** (abajo) |
| `pages/impresion-3d/index.astro:41` | paso «Material, color, acabado…» | → «Color, acabado y cantidad» |
| `pages/impresion-3d/index.astro:74` | `description` con los 4 nombres | **Reescribir** sin nombres |
| `pages/impresion-3d/index.astro:104` | título «Materiales» | → «Según para qué sea la pieza» |
| `components/Footer.astro:29` | «**Materializamos** tus ideas» | ✅ **No tocar**: es un juego de palabras, no un material |

### Los nuevos títulos (el texto del cuerpo no cambia)

| Antes | Después |
|---|---|
| PLA | **Decoración y detalle fino** |
| PETG | **Uso diario e intemperie** |
| ABS | **Golpes y repuestos** |
| TPU | **Flexible, tipo goma** |

### Lo que el código NO puede arreglar

⚠️ El `summary` de cada producto **lo escribe el dueño en el panel**. El único producto
cargado dice hoy *«Impreso en PLA, listo en 5 días»*. Con mil productos eso es una
**convención de redacción**, no un cambio de una línea. Nada de filtrar esas palabras
automáticamente: destrozaría texto escrito por una persona.

---

## 7. Movimiento

Hoy no hay ninguno: cero `@keyframes`, cero `prefers-reduced-motion` en CSS, solo
transiciones de hover. La sensación de que el sitio está estático es literal.

**Lo que va:**

1. **Un momento orquestado por página**: la entrada del hero y de la primera grilla,
   escalonada. Uno, no uno por sección.
2. **Movimiento que responde a un clic**: agregar al pedido, abrir filtros, cambiar de
   página, abrir el cajón del carrito. Éste es el que más se nota y el que menos molesta.
3. **Hover con intención** en la tarjeta: sube y la foto hace un zoom suave.
4. **Astro View Transitions** entre páginas. Es nativo del framework, no pesa, y con un
   catálogo grande es lo que más se siente moderno al navegar.

**Lo que NO va:**

- ❌ Fundido-y-subida en **cada** sección al hacer scroll. Es el efecto más visto y se
  lee como plantilla.
- ❌ Contadores animados: no hay números verdaderos que contar.
- ❌ Cualquier librería de animación.

⚠️ **Dos reglas que no se pueden romper:**

- `@media (prefers-reduced-motion: reduce)` apaga **todo**, incluido el
  `scroll-behavior: smooth` de `global.css:61`, que hoy está sin guardia.
- **Nada puede quedar en `opacity: 0` esperando un observador.** Si el JS no corre, la
  página tiene que verse completa igual. La animación va de un estado visible a otro, no
  desde la nada.

---

## 8. Restricciones del stack (de `CLAUDE.md`, no negociables)

- **Tailwind 4 CSS-first**, sin `tailwind.config`. El `.container` de marca es un
  `@utility`.
- **Botones e insignias: shadcn** (`Button`, `Badge`, `buttonVariants`). No crear un
  sistema de botones paralelo.
- **Imágenes sin `sharp`**: `<img src={import.src}>`, nunca `astro:assets` `<Image>`.
- **Marca**: navy + amarillo, Poppins, **oscuro siempre**. Paleta en `src/lib/tokens.css`.
  No hay tema claro y no se agrega.
- **Puerto 5182 fijado** (`strictPort`), porque la API valida ese origen exacto en CORS.
- **SEO**: una página HTML por ruta y por producto, con contenido **en el HTML**, no solo
  tras hidratar. JSON-LD `Product` en las fichas. Sitemap incluyendo `/producto/*` — y
  ahora también las nuevas páginas de categoría.
- **Las cuatro reglas del carrito no se tocan**: el precio no se manda, el unitario va
  pre-tramo, el renglón denormaliza, nunca se pierde la venta. Son de negocio y están
  fuera de alcance.
  ⚠️ **Pero los archivos del carrito SÍ se van a editar, y hay que hacerlo**
  *(aclaración mía: la primera versión decía «el carrito no se toca» y eso era
  incompatible con las View Transitions del §7).* Con el `ClientRouter` de Astro,
  `Carrito` (`client:load`) y `PiezaAMedida` (`client:idle`), montados en
  `Base.astro:116-117`, **se remontan en cada navegación**; los dos cuelgan escuchas en
  `document` (`Carrito.tsx:73-79`, `PiezaAMedida.tsx:32-36`) y `sincronizarInsignia()`
  escribe el contador directo en `[data-bl="cart-count"]`, que el router reemplaza al
  cambiar de página. Sin `transition:persist` y sin re-sincronizar esas escuchas y el
  contador, el carrito se rompe al navegar. **Tocar esa cañería está permitido; tocar las
  cuatro reglas, no.** Si al construir resulta que no se puede hacer sin arriesgar una de
  las cuatro, se caen las View Transitions, no las reglas.
- **Seguridad**: todo lo interpolado se escapa (`escape.ts`). El bloque de caché de
  `/_astro/*` en `public/_headers` no es decorativo: conservarlo.

---

## 9. Cómo se comprueba que aguanta mil productos

*(Decisión mía. La primera versión ponía el objetivo 2 y no decía cómo se verifica, lo
cual lo dejaba como una suposición — justo lo que la regla del proyecto prohíbe.)*

El objetivo 2 **no se puede verificar contra producción**, que tiene 1 producto, y cargar
el catálogo es tarea del dueño. Sin datos no hay medición, y entonces el trabajo se
entrega a ciegas.

**Antes de dar la fase 1 por terminada**, el constructor siembra un catálogo sintético
**en la base LOCAL** (nunca en producción: `pnpm seed` del repo de la API ya es el lugar,
detrás de una bandera propia, al lado de `SEED_DEMO`): ~1.000 productos repartidos en las
categorías reales, con y sin foto, con precios y colores variados.

Con eso se miden cuatro cosas, y los números van en el `CLAUDE.md` del repo:

| Qué | Umbral |
|---|---|
| Peso de `/tienda/<categoria>/` | que quede en decenas de KB, no en MB |
| Duración del build completo | holgadamente bajo el límite de Cloudflare Pages |
| Cantidad de archivos del `dist` | bajo el límite de 20.000 por despliegue de Pages |
| Que el arreglo del bloqueo B no tumbe la API | el build termina sin reintentos |

⚠️ **Los datos sintéticos no se versionan ni se suben.** El script sí; el dataset no.
Es la misma regla que el resto del proyecto.

---

## 10. Lo que queda a criterio de quien construya

- **Cuántos productos por página** (24, 30 o 36) y si la paginación es numerada o
  «cargar más». Se pide numerada por SEO, pero el número es suyo.
- **Cómo se genera el índice del buscador** (endpoint propio en el build vs. derivarlo de
  la lista que ya se trae) y si el matcher es por substring o algo con tolerancia a
  errores de tipeo.
- **Si las categorías llevan foto propia** o una trama generada. La API hoy no manda foto
  de categoría; si se quiere, es trabajo de backend y entonces va en otra fase.
- **La forma exacta del arreglo del bloqueo B** en `calc3d-api`: mandar la ficha completa
  en `/public/store/products`, agregar un endpoint por lotes, o limitar la concurrencia
  del build. Las tres sirven; tienen costos distintos.
- **El orden interno de los pasos** de la limpieza de `global.css`.
- Toda decisión de espaciado, escala tipográfica y grilla **dentro** de los tokens de
  marca ya fijados.

---

## 11. Orden sugerido

No es obligatorio, pero este orden evita trabajo doble: **la estructura del catálogo
cambia su diseño**, así que maquetar el catálogo de hoy y después paginarlo es hacerlo
dos veces.

0. **Subcategorías** (§4.1). ⚠️ **Va primero y cruza de repo**: migración + endpoint en
   `calc3d-api`, ABM en `calc3d-web`. Sin esto, la fase 1 se construye sobre un árbol de
   categorías que no existe y después hay que rehacerla.
0b. **Catálogo sintético en local** (§9), ya con el árbol de categorías real. Sin él las
   fases 1 y 5 se entregan sin medir.
1. **Arquitectura del catálogo** — páginas por categoría, paginado, la isla recibiendo
   solo su página + el índice de su categoría, buscador, y los enlaces `?cat=`. (Incluye
   el arreglo del bloqueo B en `calc3d-api`.)
2. **Limpieza del material** — la tabla de §6 completa. Es mecánica y tiene tests que
   actualizar.
3. **Estructura de la portada** — hero fijo, categorías, franja de destacados, muerte del
   carrusel y de la tarjeta con la `N`.
4. **Movimiento** — el sistema de §7, de una vez para todo el sitio.
5. **Pulido** — espaciado, los `style="..."` sueltos, el `global.css`.

---

## 12. Las preguntas abiertas, ya contestadas

El dueño las contestó el 2026-11-07. **No queda ninguna pregunta abierta**; las decisiones
viven en §4 y lo que sigue es solo el rastro de por qué se preguntaron.

| Pregunta | Respuesta | Dónde quedó |
|---|---|---|
| ¿Hacen falta subcategorías? | **Sí**, y además más categorías | §4.1 — abre una fase 0 que cruza de repo |
| ¿Qué reemplaza un banner del panel en el hero fijo? | **Solo la imagen**, el primero por `position` | §4, decisión 6 |
| ¿El texto SEO de las categorías es plantilla o escrito a mano? | **Plantilla** | §4, decisión 7 — con la advertencia de §4.1 |
| ¿El `material` sale del JSON-LD? | **Se queda** | §4, decisión 8 |

⚠️ **Las dos primeras se tensionan entre sí** y hay que tenerlo presente al construir: se
eligió plantilla de texto SEO *y* se confirmó que habrá más categorías y subcategorías. La
plantilla es gratis y reversible, así que se hace igual, pero al pasar de ~15 páginas de
categoría deja de alcanzar. Está escrito en §4.1.

---

## 13. Lo que este documento NO cubre

- **Las fotos.** Mil productos necesitan mil fotos, y sin `sharp` hoy se sirve la imagen
  tal como se subió a R2. Generar variantes al subir es trabajo de `calc3d-api` y del
  panel, y merece su propio documento.
- **Cargar el catálogo.** Es tarea del dueño en el panel.
- **El dato raro del único producto cargado**: `priceUsd: 24` con `compareAtUsd: 4,50`.
  El código está bien (solo tacha si el anterior es mayor) y no muestra nada roto, pero
  parece que los campos entraron al revés. Es un arreglo de datos, no de código.

---

## 14. Decisiones que tomé yo (no las pidió el dueño)

Un revisor leyó la primera versión de este documento y encontró tres contradicciones y
dos huecos. Esto es lo que resolví por mi cuenta, para que se pueda revisar aparte:

| # | Decisión | Por qué |
|---|---|---|
| 1 | **Los filtros operan sobre la categoría entera**, con un índice por categoría (§5.2) | «La isla recibe solo su página» + «los filtros se quedan» no podían ser las dos verdad: filtrar dentro de 24 ítems es un filtro roto, y el dominio de los controles cambiaría de página en página |
| 2 | **El buscador indexa también el `summary`** (§5.2) | El objetivo 1 dice «sin saber el nombre exacto»; con solo el nombre, buscar «soporte de celular» no encuentra «Base Anti-Slip» |
| 3 | **Destacados = los que tienen `badge`**, y el rótulo es «Destacados», no «más vendidos» (§5.1) | `badge` ya existe y el dueño ya lo usa: cero backend. Y no hay dato de ventas, así que decir «más vendidos» sería inventar confianza |
| 4 | **Los archivos del carrito SÍ se editan** para las View Transitions; lo intocable son sus cuatro reglas de negocio (§8) | «El carrito no se toca» era incompatible con el §7: el `ClientRouter` remonta las islas y el contador se escribe directo en el DOM |
| 5 | **La fase 1 no se da por terminada sin sembrar ~1.000 productos sintéticos en local y medir** (§9) | El objetivo 2 no se puede verificar contra producción, que tiene 1 producto |
| 7 | **El paginado va en `/tienda/<cat>/pagina/<n>/`**, con `pagina/` en el medio (§5.2) | Deja libre el espacio de rutas para subcategorías; hoy no cuesta nada y después sería rehacer el paginado |
| 6 | **Cada pregunta al dueño se hizo con un default**, para que ninguna frenara el arranque (§12) | Las cuatro se contestaron el mismo día; tres coincidieron con el default y la de subcategorías no, y por eso abrió la fase 0 |
