# Fluidez percibida y estados de carga: tienda y panel

**Fecha:** 2026-11-09 · **Repos:** `calc3d-landing` (fase 1) y `calc3d-web` (fase 2) ·
**Estado:** diseño, sin implementar.

El documento vive en la tienda porque la fase 1 es suya, pero cubre los dos repos. La
fase 2 no arranca hasta que la 1 esté medida y en verde.

---

## 1. Qué es esto y por qué ahora

El dueño pidió que la interfaz «se sienta más premium, limpia y estable»: transiciones
sutiles, un loader inicial, skeletons en lo que carga asíncrono, fotos que no aparezcan
de golpe y estados de carga en los componentes interactivos. Todo con respeto a
`prefers-reduced-motion`.

**La auditoría recortó el pedido a menos de la mitad, y eso es el resultado más
importante de este documento.** Tres razones:

1. **Dos de las piezas pedidas son anti-patrones en la tienda.** `calc3d-landing` es un
   sitio **estático de Astro**: el HTML que llega al navegador ya trae el producto, el
   título y el precio. Un loader a pantalla completa taparía contenido ya pintado y
   **retrasaría el LCP**; un skeleton en el catálogo reemplazaría contenido real por un
   cuadrito gris. Las dos se descartan — decisión del dueño, con el costo a la vista.
2. **Casi todo lo demás ya está hecho** (§2), y mucho mejor de lo que parecía a primera
   vista. Los estados de carga de los formularios, el buscador y el paginado funcionan.
   La reserva de espacio de las fotos está resuelta en **13 de 14** `<img>`. Los tokens
   de movimiento existen.
3. **Quedan seis huecos reales** (§3). Uno es un defecto de verdad que nadie había visto
   —el banner de categoría no reserva su espacio— pero es **latente**: medido el
   2026-11-09, `/public/store/banners` devuelve `{"banners":[]}` y no hay ni un banner
   cargado en producción, así que hoy no lo sufre nadie. Se arregla igual, porque los
   banners se prenden **en vivo, sin despliegue**: el salto aparecería el día que el
   dueño suba el primero, y ese día nadie va a estar mirando el CLS.

### ⚠️ Una corrección, para que no se repita

La primera pasada contó «10 de 14 `<img>` sin `width`» y concluyó que había un problema
grande de salto de contenido. **El número era cierto y la conclusión era falsa.** Este
repo reserva el espacio con **`aspect-ratio` en CSS**, no con los atributos del `<img>` —
que es lo correcto, porque las fotos vienen de R2 y sus medidas **no se conocen en el
build** (está documentado en el `CLAUDE.md`, en los banners del hero). Contar atributos
mide la técnica equivocada.

La lección, que vale para el constructor: **en este repo, «¿reserva espacio?» se
responde leyendo el CSS de la clase, no el JSX.**

---

## 2. Lo que YA existe, y por eso no se toca

Verificado archivo por archivo el 2026-11-09. Escribir esto de nuevo sería vender
trabajo hecho.

### Tienda: estados de carga e interacción

| Pieza | Dónde | Estado |
|---|---|---|
| Enviar pedido: `enviando` + `disabled` + «Enviando…» | `carrito/Carrito.tsx:297` | ✅ |
| Pieza a medida: igual | `carrito/PiezaAMedida.tsx:126` | ✅ |
| Buscador: `sin-pedir / cargando / listo / error` | `catalogo/Buscador.tsx:10` | ✅ |
| Agregar al carrito: `subiendo` + `disabled` | `ficha/Ficha.tsx:256` | ✅ |
| Paginado: `disabled` en los topes | `catalogo/Paginacion.tsx:37` | ✅ |
| `transition-*` + `disabled:opacity-50` en los primitivos | `components/ui/*` (shadcn) | ✅ |
| Aviso flotante al agregar (sonner) | `components/ui/Avisos.tsx` | ✅ |
| Transiciones de vista entre rutas (`<ClientRouter />`) | `layouts/Base.astro` | ✅ |
| Animación de entrada (`entrada`, `entrada-grid`) con reglas de dónde SÍ y dónde NO | `styles/global.css` | ✅ |
| Guardia de `prefers-reduced-motion`, retardos incluidos, fuera de `@layer` | `styles/global.css:67` | ✅ |
| Prueba de que cada `:hover` que mueve está anulado con `reduce` | `src/hover-con-reduce.spec.ts` | ✅ |

### Tienda: reserva de espacio de las fotos — 13 de 14

| `<img>` | Cómo reserva | |
|---|---|---|
| `TarjetaProducto.tsx:35` `.product-photo` | `aspect-ratio: 4/3` + `width`/`height` cuando el contrato los trae + fondo | ✅ |
| `TarjetaIndice.tsx:22` `.product-photo` | idem (las dos tarjetas están parejas) | ✅ |
| `HeroEnVivo.tsx:87` / `:141` `.hero-art--banner` | `aspect-ratio: 1/1` + `object-fit: contain` | ✅ |
| `Galeria.tsx:17` `.pdp-main` | `aspect-ratio: 1/1` + fondo | ✅ |
| `Galeria.tsx:32` miniaturas | `.pdp-thumb` 72×72 fijo + fondo | ✅ |
| `CategoriasEnVivo.tsx:80` `.cat-card-foto` | `aspect-ratio: 4/3` | ✅ |
| `Carrito.tsx:211` `.cart-thumb` | 64×64 fijo | ✅ |
| `Personalizacion.tsx:74` `.pdp-custom-chip img` | 36×36 fijo | ✅ |
| `Header.astro` / `Footer.astro` / `404.astro` / `impresion-3d` | `width`/`height` (recursos locales) | ✅ |
| **`BannerCategoriaEnVivo.tsx:32`** | **`.banner-cat img { width: 100%; height: auto }` — nada** | ❌ §5.1 |

### Tienda: tokens de movimiento — existen

En `src/lib/tokens.css`:

```
--ease: cubic-bezier(.22, .61, .36, 1);
--dur-normal: 240ms;
--dur-lenta: 420ms;
```

⚠️ **Y hay un dato de historia que el constructor tiene que respetar:** existió un
`--dur-rapida: 160ms` y **se borró el 2026-11-07 porque nadie lo usaba.** Inventar un
juego nuevo de tokens de movimiento sería recrear ese token con otro nombre y montar un
sistema paralelo al que ya está. **No se hace** (§5.5).

### Panel (`calc3d-web`)

| Pieza | Dónde | Estado |
|---|---|---|
| `Skeleton`, `TableSkeleton`, `PageSkeleton`, `EmptyState` | `components/ui.tsx:732+` | ✅ |
| Rutas con `lazy` + `Suspense fallback={<PageSkeleton />}` | `App.tsx:73+` | ✅ |
| Loader de arranque mientras resuelve la sesión | `App.tsx:49` | ✅ (mejorable, §7) |
| Tema aplicado antes del primer render (sin parpadeo) | `index.html` (script en línea) | ✅ |
| Skeletons en ~26 pantallas | `pages/*`, `features/*` | ✅ |
| `motion` (framer-motion) ya instalado | `package.json` | ✅ |

**Consecuencia:** este trabajo es **seis arreglos puntuales**, no una capa nueva.

---

## 3. Objetivos

1. **Que el banner de categoría deje de empujar la página** cuando carga su imagen.
2. **Que ninguna foto aparezca de golpe**: entra con un cruce corto sobre el fondo que ya
   ocupaba su lugar.
3. **Que el texto no cambie de tamaño** cuando llega la fuente de marca.
4. **Que el refresco en vivo no sea brusco**: cuando la API corrige un precio sobre lo
   horneado, el valor cruza en ~180 ms, sin cartel ni destello.
5. **Que el rescate de una ficha muestre la forma de la ficha**, no una línea de texto.
6. **Que la galería cruce** al cambiar de foto.
7. **Que quien pida menos movimiento no pierda nada**: ningún elemento queda invisible,
   trabado ni enfocable fuera de pantalla con `reduce`.

### No-objetivos

- **No hay loader a pantalla completa en la tienda.** Decisión del dueño (§1.1).
- **No hay skeletons en el catálogo, la portada ni las franjas de destacados.** Esos
  datos vienen horneados: no existe el estado «vacío → cargado».
- **No se inventan tokens de movimiento nuevos** (§2, §5.5).
- **No se reescriben los estados de carga que ya funcionan** (§2).
- **No se agregan animaciones decorativas.** Nada de entradas al hacer scroll, parallax
  ni contadores animados.
- **No se amplía la animación de entrada** (`entrada`, `entrada-grid`) a más lugares. Sus
  reglas de dónde sí y dónde no son deliberadas y están documentadas.
- **No se cambia el diseño**, ni la lógica de negocio, ni `packages/shared`.
- **No se migra a una librería de animación en la tienda.** CSS alcanza y pesa cero.

### Anti-objetivos (esto sería un fracaso aunque «funcione»)

- **Que el sitio se sienta más lento.** Si el LCP o el INP empeoran respecto de la
  medición previa, el cambio se revierte, no se discute.
- **Que una foto quede invisible si el JS no corre o falla** (§5.2). Es el riesgo
  concreto de esta tanda.
- **Que el hero vuelva a arrancar en blanco.** El 2026-11-09 se **quitó** la animación de
  entrada del hero justo porque lo primero que veía el visitante era un hueco. Un fade-in
  mal puesto arriba lo reintroduce con otro nombre.
- **Que un `!important` nuevo dentro de un `@layer` le gane a la guardia de movimiento.**
  Para los `!important` el orden de capas se invierte y la guardia —que está fuera de
  capa— pasaría a perder. Hoy no hay ninguno.
- **Que el próximo banner remoto vuelva a salir sin reserva de espacio.** Si el arreglo
  depende de que alguien se acuerde, no está arreglado.

---

## 4. Restricciones

1. **La tienda es SSG y su SEO importa.** El HTML por ruta tiene que seguir trayendo el
   contenido. Nada que lo esconda, lo vacíe o lo retrase.
2. **El primer pintado de una isla es HTML horneado, no un estado vacío** (`lib/vivo.ts`).
3. **La guardia de movimiento apaga duraciones y retardos, NO estados.** Un cambio de
   `opacity` sin transición se sigue aplicando de un frame. Todo fade nuevo tiene que
   terminar en su estado final con `reduce`, nunca en el inicial.
4. **Tailwind 4 CSS-first**: `@theme inline`, **no hay `tailwind.config`**. Los tokens
   viven en `src/lib/tokens.css`.
5. **Sin `sharp` y sin `astro:assets`**: las fotos van como `<img src={…}>`.
6. **`pnpm check` no lo cubre `pnpm test`.** El chequeo de tipos se corre a mano; el
   gancho de pre-push no lo corre.
7. **Las dimensiones de las fotos son opcionales en el contrato** (`FotoApi.width`,
   `FotoApi.height`: `number | null | undefined`) y para los banners **no existen**.
8. **No se edita `.env` ni se publica nada.** Un `git push` a `main` **es** un despliegue.
9. ⚠️ **El movimiento no se puede medir en una pestaña oculta.** Una página de fondo no
   arranca las transiciones de vista ni avanza las animaciones CSS, y el síntoma se lee
   igual que un router roto. `tabs_context` dice si el panel está visible: **leer esa
   línea antes de creerle a una medición**, o medir con Playwright.

---

## 5. Los seis arreglos

### 5.1 El banner de categoría tiene que reservar su espacio

**El único salto de contenido que quedó en la tienda — y es latente, no visible.**
`.banner-cat img { width: 100%; height: auto }` (`global.css:396`) con una imagen remota
cuyas medidas no se conocen: el alto es 0 hasta que la foto baja, y entonces **empuja
todo lo de abajo**. Y no está en un rincón: el banner va arriba de `/tienda/<cat>/` y de
**cada ficha de esa categoría**.

El arreglo es el mismo que el hero ya tiene (`.hero-art--banner { aspect-ratio: 1/1 }`) y
por la misma razón, anotada en el CSS: «Sin eso el hero salta cuando la imagen carga». Al
banner de categoría ese arreglo nunca le llegó.

⚠️ **Hoy no hay ningún banner cargado** (medido: `{"banners":[]}`, con la API sana), así
que esto **no se puede medir antes/después**. Es prevención, no corrección, y el paso 1
de la §6 no produce un número de CLS para esta pieza. Para verificarla hay que **sembrar
un banner de categoría en la base LOCAL** — no en producción, que es la base que manda.

**Proporción: `16 / 9` con `object-fit: cover`. Decisión del dueño (2026-11-09),** y la
razón es la coherencia, no el gusto: el panel **ya** muestra la vista previa del banner
con `aspect-[16/9]` + `object-cover` y **ya** dice «Se recomienda horizontal (16:9)» al
subirlo (`calc3d-web/.../StoreBanners.tsx:352`). Hoy la tienda contradice lo que el panel
promete. Un banner de otra forma se recorta — igual que en la previa que el dueño vio al
subirlo, que es exactamente el punto.

Se evaluó y **se descartó** que el contrato de `StoreBanner` traiga `width`/`height`
(hoy no los tiene, `schema.prisma:1003`): nunca recortaría nada, pero arrastra una
migración de base, el contrato Zod y el panel dentro de una fase que es solo la tienda.
Si algún día un banner recortado molesta, ése es el camino.

### 5.2 Fade-in de las fotos

Ninguna foto tiene cruce de entrada: aparecen de golpe sobre el fondo `--ink-700`. Como
el espacio ya está reservado (§2), esto es **solo opacidad** — no mueve nada, y por eso
es barato y seguro.

Entra por el fondo que ya está puesto, con `--dur-normal`.

#### ⚠️ Qué fotos NO se funden, y por qué no es negociable (mi decisión)

**Una imagen en `opacity: 0` no es candidata a LCP para el navegador.** Fundir la foto
grande de la primera pantalla **retrasa el LCP** por toda la duración del fade — justo lo
que el anti-objetivo declara causa de reversión. Así que el fade **se limita a lo que no
es candidato a LCP**:

| Entra con fade | No se funde |
|---|---|
| Todo `<img>` con `loading="lazy"` (tarjetas fuera de pantalla, categorías, banner de categoría) | **`.pdp-main`**, la foto grande de la ficha: es casi con certeza su LCP |
| Las miniaturas de la galería | El **hero** de la portada y de `/impresion-3d/` |
| El cambio de foto principal de la galería, que es una interacción y no una carga (§5.6) | La **primera fila** de `.shop-grid` en un listado |
| | Las fotos **locales** (Header, Footer, 404, arte del hero): llegan con el documento |

Lo de la primera pantalla **no queda feo sin fade**: su hueco ya está pintado con
`--ink-700`, así que la foto reemplaza una caja llena, no un blanco. Eso es lo que hace
que hoy no sea un salto.

⚠️ **Y hay una segunda razón para excluir la primera grilla:** sus tarjetas **ya** arrancan
en opacidad 0 por `entrada-grid` (`global.css:1242`: `entrada` de `--dur-lenta` 420 ms con
retardos escalonados hasta 450 ms). Un fade por foto encima se **apila** con la entrada de
su propia tarjeta: hasta ~870 ms de opacidad baja en la primera pantalla.

Esto es **mi decisión**, forzada por el anti-objetivo. Si el dueño quiere la foto de la
ficha con fade sabiendo que cuesta LCP, se agrega en una línea.

⚠️⚠️ **La trampa que define esta pieza, y es la razón de que sea un anti-objetivo:**
una isla de Astro **se hornea en el build**. Un fade que arranque en `opacity: 0`
esperando su `onLoad` deja **`opacity: 0` escrito en el HTML estático**. Si el JS no
corre, tarda o falla, las fotos quedan **invisibles para siempre** — y Google las ve así.
El estado «no cargada» tiene que depender de que el JS esté vivo (una clase en `<html>`
puesta por un script en línea, o equivalente), nunca al revés.

⚠️ **Y el `onLoad` puede no llegar nunca:** una foto en caché termina de cargar **antes**
de que la isla hidrate. El estado inicial se lee de `img.complete`.

⚠️ **Con `reduce` la foto aparece al instante**, que es la conducta correcta. Lo que hay
que verificar es que aparezca: la guardia reduce la duración a `0.01ms`, no cambia el
valor inicial.

### 5.3 Fuentes autohospedadas vía Fontsource

Hoy las dos interfaces piden la fuente a `fonts.gstatic.com` con `display=swap`: el texto
pinta con la fuente del sistema y **salta** cuando llega la de marca.

**Decisión:** autohospedar con los paquetes de **Fontsource** (`@fontsource/poppins` en
la tienda; `@fontsource-variable/bricolage-grotesque`, `@fontsource/hanken-grotesk` y
`@fontsource/jetbrains-mono` en el panel), no bajando `.woff2` a mano.

Es una dependencia nueva y se justifica: trae los `woff2` subdivididos por alfabeto y los
`@font-face` ya escritos, los versiona el gestor de paquetes en vez de un binario suelto
en el repo, y saca a un tercero del camino crítico del primer pintado.

- Solo el subconjunto **latin**, y solo los pesos que el CSS usa de verdad. **Hay que
  contarlos primero:** la tienda pide 6 pesos de Poppins (400 a 900) y es muy probable
  que no use todos. Cada peso que sobra es un archivo que compite por el ancho de banda.
- `preload` del `woff2` de **un** peso: el que pinta el texto grande de la primera
  pantalla. Precargar seis es pelearse consigo mismo.
- `font-display: swap` **más overrides de métrica en la fuente de respaldo**
  (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`), para que
  el respaldo mida casi lo mismo y el cambio sea imperceptible.
- Se descartó `font-display: optional`: evita el reflow del todo, pero en una conexión
  lenta el visitante **nunca** ve la fuente de marca en esa visita. Para una tienda, la
  marca gana. Decisión mía; si el dueño prefiere estabilidad absoluta, se cambia en una
  línea.

⚠️ **Los números de los overrides se calculan de los `woff2` reales** (`unitsPerEm`,
`ascent`, `descent`, `lineGap` del archivo). **No se copian de un blog.** Un número
equivocado *agrega* salto en vez de quitarlo, y se nota en el párrafo largo de la ficha.

### 5.4 El refresco en vivo cruza, sin avisar

Elegido por el dueño. Cuando `useEnVivo` reemplaza lo horneado por lo de la API, el dato
que cambió hace un cruce de `--dur-normal`. **Si no cambió —el caso normal— no se ve
nada.** Ni cartel, ni destello, ni «precios actualizados».

#### Dónde cruza, y dónde no (mi decisión)

Hay **8** componentes que usan `useEnVivo` (`Catalogo`, `FichaEnVivo`, `DestacadosEnVivo`,
`CategoriasEnVivo`, `RelacionadosEnVivo`, `HeroEnVivo`, `FranjaEnVivo`,
`BannerCategoriaEnVivo`). **El cruce no va en los ocho.**

La regla que decide: **cruza el TEXTO que cambia de valor sin cambiar de altura.** O sea
precio, precio tachado, insignias y el texto de la franja, en las dos tarjetas, la ficha y
`FranjaEnVivo`. Son los datos que el dueño corrige desde el panel, que es el caso que esto
viene a suavizar.

**Queda fuera todo cambio de ALTURA**, y son más casos de los que parecen: un producto que
se apagó y desaparece, una categoría que se quedó vacía, **y también algo que apareció**
(un producto publicado, un banner que se prendió, relacionados que ahora existen). Esos
valen **secos**: lo que comunican es que algo entró o salió, y fundirlos pelearía con el
trabajo de §5.1.

#### Tres cosas no negociables

- La comparación **no puede volver a disparar el efecto** (bucle contra una API con tope
  de 120 peticiones por minuto).
- El cruce **no puede cambiar el alto** de la tarjeta, o el trabajo de §5.1 se pierde por
  la otra puerta.
- **No se cruza la tarjeta entera**, sino el texto que cambió dentro de ella. Cruzar el
  bloque completo arrastraría los casos de altura que la regla de arriba excluye.

### 5.5 Los tokens se USAN, no se inventan

Existen `--ease`, `--dur-normal: 240ms` y `--dur-lenta: 420ms`, y `global.css` los usa en
**4 lugares**. El resto de las duraciones está escrito a mano.

El trabajo es **migrar las sueltas a los tokens que ya hay**, no crear un juego nuevo
(§2: ya se borró un token por no usarse).

Dos cosas a resolver con medida en mano, no por gusto:

- **`--dur-lenta: 420ms` es largo** para lo que hoy lo usa (`.product-photo` al pasar el
  mouse). Si al revisarlo sigue pareciendo largo, se ajusta **el token**, con el resto de
  sus usos a la vista — no se le pone un número propio a ese componente.
- **Si hace falta una duración corta** para las micro-interacciones, vuelve
  `--dur-rapida`, pero **solo con usos reales ese mismo día**. Se borró por no tenerlos.

### 5.6 Skeleton del rescate, y cruce de la galería

- **`FichaEnVivo.tsx:93`** dice **«Cargando el producto…» en texto plano**. Es el único
  estado vacío real de la tienda (el rescate de una ficha que no estaba en el build), y
  ahí sí corresponde un skeleton con la forma de la ficha: galería, título, precio,
  botón. Las dimensiones salen de la ficha real, medidas.
  - ⚠️ Son **tres** estados distintos y no hay que mezclarlos: cargando, `error` (se
    conserva lo horneado) y `noExiste` (**pisa** lo horneado). Mezclar los dos últimos
    fue un bug real; el skeleton es solo para el primero.
- **`Galeria.tsx`** cambia la foto principal de golpe. Cruce de `--dur-normal`, con el
  alto fijo que `.pdp-main` ya tiene, para que no salte entre fotos de distinta
  proporción.

---

## 6. Fase 1 — la tienda (`calc3d-landing`)

En este orden: primero lo que arregla un defecto, después lo que agrega acabado.

1. **Medir el estado actual** (§8). Sin esto no hay forma de saber si el trabajo sirvió, y
   el anti-objetivo del LCP no se puede comprobar.
2. **§5.1** — el banner de categoría. Va primero y solo, aunque sea latente: es el único
   defecto de verdad y es una línea de CSS. Necesita un banner sembrado **en local** para
   verificarse.
3. **§5.2** — fade-in de las fotos que no son candidatas a LCP, con la prueba de «sigue
   visible sin JS» en el mismo commit.
4. **§5.3** — fuentes autohospedadas.
5. **§5.4** — cruce del refresco en vivo.
6. **§5.6** — skeleton del rescate y cruce de la galería.
7. **§5.5** — migrar las duraciones sueltas a los tokens. Va último a propósito: es la
   que más archivos toca y la que menos se nota, así que no debe bloquear al resto.
8. **Volver a medir** y comparar contra el paso 1, con el umbral de la §8.

---

## 7. Fase 2 — el panel (`calc3d-web`)

**La fase 2 ENTRA en esta entrega.** Decisión del dueño (2026-11-09): «fase 1 medida y en
verde» significa **medición local** — construir con la configuración de producción,
servirlo con `pnpm preview` y medir ahí, con el umbral de la §8. No hace falta que la
tienda esté desplegada: los commits quedan en `main` sin push, y el dueño publica cuando
quiera (§10).

1. **Endurecer la guardia de movimiento.** La del panel (`index.css:282`) es la versión
   vieja: **no neutraliza los retardos**. La de la tienda sí, y lo hace porque un bug real
   (un panel que salía de pantalla al instante pero seguía 300 ms enfocable) lo obligó.
   Portar la versión endurecida, y revisar si al panel le falta también el equivalente de
   `hover-con-reduce.spec.ts`.
2. **Las fotos del panel.** `StoreBanners` ya usa `aspect-[16/9]`: ése es el patrón.
   Revisar `Store.tsx:272`, `StoreProductDetail.tsx:543` y `:1026`,
   `StoreRequests.tsx:244` y `BusinessLogo.tsx:97` — **leyendo la clase, no el JSX**
   (§1).
3. **Fuentes autohospedadas**: Bricolage Grotesque (variable), Hanken Grotesk y JetBrains
   Mono. Tres familias es el caso más caro de los dos repos; contar los pesos que el CSS
   usa de verdad antes de empaquetar nada.
4. **Huecos de skeleton.** Pantallas sin ninguno hoy: `Calculator`, `Calendar` y
   `Filament` (las de autenticación quedan fuera; `Filament` quizá esté cubierto por sus
   pestañas, hay que mirar). Hay **35 archivos** con `isLoading`/`isPending`: ver cuáles
   resuelven con un skeleton y cuáles no muestran nada mientras esperan.
5. **El loader de arranque** (`App.tsx:49`): un cuadrado amarillo pulsando mientras
   resuelve la sesión. Se queda, pero se convierte en el esqueleto del armazón (barra
   lateral + barra superior), que es lo que viene después, y se le pone `role="status"` —
   hoy el `aria-label` va en un `div` sin rol y el lector de pantalla no lo anuncia de
   forma confiable.
6. **Tokens de movimiento**, al final y con el mismo criterio de §5.5: unificar lo que
   hay. El panel tiene `motion` instalado: se usa donde ya está, no se extiende a lo que
   CSS resuelve.

---

## 8. Cómo se verifica

### Medición, antes y después

Sobre `pnpm preview` del `dist/` construido con la configuración de producción (§7), a
**390×844** y en escritorio, y con el panel del navegador **visible** o con Playwright
(§4.9):

- **CLS** en portada, un listado de categoría **con un banner sembrado en local** y una
  ficha de esa categoría. Es el número de §5.1. Con la red frenada, o no se ve nada.
- **LCP** en las mismas tres. Es el número del anti-objetivo.
- **Reflow de la fuente**: ancho de un bloque de texto conocido antes y después del
  cambio de fuente. Es el número de §5.3.
- Las fotos **con dimensiones nulas en el contrato**, a propósito, para probar el camino
  del `aspect-ratio` y no solo el feliz.

#### El umbral, para que «empeora» sea falsable (mi decisión)

«Si empeora, se revierte» no sirve sin un número: dos corridas del mismo build con la red
frenada dan valores distintos, y sin umbral cualquier +8 ms de ruido «obliga» a revertir.

- **Mediana de 5 corridas**, mismo perfil de red, misma pantalla, mismo build.
- **Empeora** = la mediana sube **más de 5 % o más de 50 ms, el que sea mayor**. Por
  debajo de eso es ruido y no decide nada.
- La línea base es la del paso 1 de la §6, medida **igual**. Comparar contra una corrida
  suelta, o contra producción, no vale.

### Pruebas automáticas

- **La foto sigue visible si el `onLoad` nunca llega** (§5.2). Es la prueba que más
  importa de toda la tanda: cubre el anti-objetivo.
- **Sin JS**: el HTML construido (`dist/`) no tiene ningún `opacity: 0` ni clase de «no
  cargada» horneada en una foto. Se chequea sobre `dist/`, **no** en el servidor de
  desarrollo: es un defecto que solo existe en el HTML del build.
  - ⚠️ **Dónde vive, y por qué no en `pnpm test` (mi decisión).** Un test que lea `dist/`
    exige un `pnpm build` previo, y el build **le pega a la API** (si la API está caída,
    falla fuerte, a propósito). Meterlo en `pnpm test` ataría **cada push** a tener la API
    arriba y a un build de minutos, donde hoy la suite tarda segundos — y eso es la receta
    para que alguien empiece a usar `--no-verify`. Va como **script aparte**, a mano,
    junto con `pnpm check`, y se corre antes de cerrar la tarea de §5.2.
  - ⚠️ **Si `dist/` no existe, FALLA fuerte; nunca se saltea.** Un skip silencioso es
    exactamente el guardián-que-no-guarda que este repo viene cerrando (los avisos
    invisibles, el `` que no detectaba el voseo). Un script que diga «0 verificados» y
    salga en verde es peor que no tenerlo.
- **Reserva de espacio del banner** (§5.1), por su clase, para que el próximo banner
  remoto no vuelva a salir sin ella.
- **Cruce de `useEnVivo`** (§5.4): cruza cuando el dato cambió; no hace nada cuando no
  cambió; **no cruza** el caso «se quedó vacío» ni el «producto apagado»; no vuelve a
  pedir.
- **Guardia de movimiento**: con `reduce`, nada queda invisible ni trabado. Hay
  precedente de cómo se prueba (`hover-con-reduce.spec.ts`).
- `pnpm test` **y** `pnpm check` en verde. Los dos.

⚠️ **Las pruebas de pantalla van con las de función pura, no en su lugar.** Precedente
medido en este repo el 2026-11-09: romper un efecto dejó 3 tests de pantalla en rojo y
**0** de función pura. Un fade vive en el JSX y en el CSS: una función pura verde no dice
nada de él.

### Validar las pruebas

Cada prueba nueva se valida **rompiéndola a propósito**, y la mutación tiene que
**compilar** (si da «0 tests», es un verde falso). Restaurar con copia de respaldo,
**nunca con `git checkout --`**.

---

## 9. Lo que queda a criterio del constructor

- La forma exacta de detectar «el JS está vivo» en §5.2, mientras cumpla el anti-objetivo
  y se pruebe sobre `dist/`.
- Si el fade es una utilidad de CSS, un hook o un componente: lo que salga más limpio con
  los `<img>` que ya hay. **No** hace falta un componente nuevo si una clase alcanza — la
  reserva de espacio ya está resuelta y era la única razón para envolverlos.
- Cómo se comparan lo horneado y lo de la API en §5.4, mientras no vuelva a disparar el
  efecto.
- El valor final de `--dur-lenta` y si vuelve `--dur-rapida`, con los límites de §5.5.
- El orden interno de la fase 2, mientras la guardia de movimiento (§7.1) vaya primero.

### Lo que NO decide el constructor: se pregunta al dueño

- Fundir la foto grande de la ficha aceptando el costo de LCP (§5.2).
- Cambiar `font-display: swap` por `optional` (§5.3).
- Llevar `width`/`height` al contrato de `StoreBanner` para no recortar nunca (§5.1).

---

## 10. Las decisiones que tomé yo, para que se revisen

La revisión de constructor del 2026-11-09 encontró seis bifurcaciones. El dueño resolvió
dos; **estas cuatro las decidí yo** y están marcadas en su sección. Si alguna está mal, es
más barato corregirla ahora que después:

| Decisión | Dónde | Por qué así |
|---|---|---|
| El fade **excluye** las candidatas a LCP: foto grande de la ficha, hero y primera fila de la grilla | §5.2 | Una imagen en `opacity: 0` no es candidata a LCP: fundirla retrasa el LCP, que es causa de reversión declarada. Y se apilaría con `entrada-grid`. |
| El cruce en vivo va solo en el **texto que no cambia de altura**, no en los 8 consumidores de `useEnVivo` | §5.4 | Toda alta, baja o vaciado cambia la altura, y fundir eso pelea con §5.1. Reduce la tarea de 8 componentes a 4. |
| La prueba sobre `dist/` va en un **script aparte**, no en `pnpm test` ni en pre-push, y **falla** si no hay `dist/` | §8 | Atar cada push a un build con la API arriba entrena el `--no-verify`. Un skip silencioso sería el defecto que la prueba viene a cerrar. |
| «Empeora» = la **mediana de 5 corridas** sube más de 5 % o 50 ms | §8 | Sin umbral la regla es infalsificable y el ruido de medición «obliga» a revertir trabajo bueno. |

Lo que el dueño decidió: la proporción `16/9` del banner (§5.1) y que la fase 2 entra en
esta entrega con medición local (§7).

---

## 11. Cómo se entrega

Por tareas, con un commit por tarea en `main`, **sin push**. Un push es un despliegue: el
respaldo y el OK del dueño van antes, y los decide él.
