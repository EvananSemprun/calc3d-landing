# Fluidez de la tienda — mediciones

**Plan:** [`2026-11-09-fluidez-tienda.md`](2026-11-09-fluidez-tienda.md) ·
**Línea base:** 2026-11-09 · **Después:** pendiente (Tarea 8)

---

## El umbral que decide todo lo demás

> «Empeora» = la **mediana de 5 corridas** sube más de **5 % o 50 ms, el que sea mayor**.
> Por debajo de eso es ruido de medición y no decide nada. La comparación es contra la
> tabla de abajo, medida igual — nunca contra una corrida suelta ni contra producción.

## Cómo se midió (la Tarea 8 tiene que repetirlo IGUAL)

| | |
|---|---|
| Build | `PUBLIC_API_URL=https://calc3d-api-production.up.railway.app/api` `PUBLIC_SITE_URL=https://bananolab-3d.com` `pnpm build` → 19 páginas, 13 fichas |
| Servidor | `pnpm exec astro preview --port 5182` (el `dist/` de ese build) |
| Herramienta | Playwright, no el panel del navegador |
| Red | CDP `Network.emulateNetworkConditions`: **150 ms de latencia, 1,6 Mbps bajada, 750 kbps subida** |
| Caché | **Fría en cada corrida** (contexto nuevo del navegador por corrida) |
| Espera | `load` + 2.500 ms de reposo antes de leer |
| Pantallas | `/` · `/tienda/navidad/` · `/producto/arbol-de-navidad-con-nombres/` |
| Tamaños | **390×844** y **1280×800** |

⚠️ **El puerto 5182 no es un detalle.** La API valida `STORE_ORIGIN` exacto: en otro puerto
las islas mueren en CORS y el refresco en vivo no corre, así que se mediría otra cosa.

⚠️ **`pnpm preview` NO respeta `--port` si ya hay un preview corriendo**, y `astro` deja el
proceso vivo aunque se mate el shell que lo lanzó: responde
*«Another astro preview server is already running»* y el anterior sigue en su puerto (acá
eligió 5183 solo). Se detiene con **`pnpm exec astro preview stop`**, no matando el shell.

⚠️ **El movimiento no se puede medir en una pestaña oculta** (página de fondo: las
transiciones no arrancan y las animaciones no avanzan, y se lee igual que un sitio roto).
Por eso se usó Playwright, donde `visibilityState` siempre es `visible`.

---

## Línea base — 2026-11-09

### Móvil (390×844)

| Pantalla | LCP mediana | LCP corridas crudas | CLS mediana | CLS corridas crudas |
|---|---|---|---|---|
| Portada | **780 ms** | 780 · 776 · 788 · 776 · 808 | **0,0342** | 0,0333 · 0,0342 · 0,0333 · 0,0365 · 0,0365 |
| Listado `navidad` | **1.244 ms** | 9.796 · 1.244 · 1.228 · 1.388 · 1.136 | **0,0097** | 0,0097 en las 5 |
| Ficha | **4.128 ms** | 4.188 · 4.132 · 4.108 · 4.128 · 4.116 | **0,0739** | 0,0739 en las 5 |

### Escritorio (1280×800)

| Pantalla | LCP mediana | LCP corridas crudas | CLS mediana | Elemento del LCP |
|---|---|---|---|---|
| Portada | **800 ms** | 804 · 760 · 800 · 776 · 832 | **0,0081** | `h1` (texto) en las 5 |
| Listado `navidad` | **1.272 ms** | 1.272 · 1.408 · **30.064** · 1.200 · 1.116 | **0,0081** | `h1` en 4 de 5; `product-photo` en la del outlier |
| Ficha | **11.394 ms** (n=4) | **timeout >60 s** · 11.388 · 11.388 · 11.488 · 11.400 | **0,0350** | **`pdp-main`** en las 4 |

⚠️ **La ficha de escritorio tiene n=4, no 5:** la primera corrida pasó los **60 s** de
timeout. Queda escrito a propósito en vez de repetirla hasta que diera lindo. Las 4 válidas
caen en 100 ms entre sí, así que la mediana es sólida, pero **que una carga de ficha supere
los 60 s con red frenada es un dato, no un accidente de medición** (ver hallazgo 2).

### Reflujo de la fuente (390×844)

Alto y ancho del mismo elemento con Poppins y con el respaldo (`system-ui`), que es lo que
ve quien todavía no la recibió:

| Elemento | Con Poppins | Con respaldo | Diferencia |
|---|---|---|---|
| **`h1` de la portada** | 335 × **148,3** | 335 × **111,2** | **+37,1 px de alto (33 %)** |
| `h1` de la ficha | 335 × 57,7 | 335 × 57,7 | 0 |
| Nombre en la tarjeta | 278,6 × 45 | 265,0 × 45 | 13,6 px de ancho |
| Precio | 297 × 34,1 | 297 × 34,1 | 0 |

### Pedidos de fuente a terceros

**5 peticiones a Google** en una carga de portada: 1 de CSS a `fonts.googleapis.com` y
**4 woff2** a `fonts.gstatic.com`.

`document.fonts` en la portada: cargan **400, 600, 700 y 900**; **500 y 800 quedan
`unloaded`** (están declarados pero esa página no los usa).

---

## Hallazgos de la línea base

### 1. El LCP de la portada y del listado es TEXTO, no una foto

El elemento es el **`h1`** en 9 de 10 corridas de escritorio. Eso cambia dos cosas del plan:

- **La fuente está en el camino crítico del LCP.** Autohospedarla (Tarea 4) no es solo
  cosmética: puede **mejorar** el LCP, no solo el reflujo. Hoy el texto que define el LCP
  espera un CSS y un woff2 de **otro dominio**.
- **Excluir del fade la primera fila de la grilla era más conservador de lo necesario** en
  escritorio, donde esas fotos no son el LCP. Se mantiene igual: en la corrida lenta del
  listado el LCP **sí** fue `product-photo`, así que cuando la red se degrada la foto pasa a
  ser candidata. La exclusión cuesta poco y cubre el caso malo.

### 2. La ficha tarda 11,4 s en pintar su foto grande, y una corrida pasó los 60 s

El LCP de la ficha es **`pdp-main`**, confirmado en las 4 corridas válidas. Con red frenada
da **11,4 s** en escritorio y **4,1 s** en móvil (el umbral «bueno» de Google es 2,5 s).

Esto **confirma con números la decisión del spec §5.2**: fundir esa foto le sumaría la
duración del fade a un LCP que ya es malo. No se funde, y no se reabre.

⚠️ **Pero además es un problema que el diseño no conocía**, y está FUERA del alcance de
este plan: la foto de la ficha es demasiado pesada para la red de un cliente venezolano con
datos móviles. No se toca acá — el plan no lo cubre y meterlo sería ampliar el alcance solo.
**Vale una conversación aparte con el dueño.**

### 3. El reflujo de la fuente es real y vale 37 px en el peor sitio

El `h1` de la portada crece **37,1 px de alto (33 %)** cuando llega Poppins, y empuja todo
lo que tiene debajo. Es el número que la Tarea 4 tiene que bajar, y es el más grande de los
cuatro medidos: el resto de los elementos casi no se mueve.

⚠️ Corrige un supuesto mío del plan: dije que «los 6 pesos se usan». Lo correcto es que el
CSS **declara** 6 y la portada **descarga 4** (400, 600, 700, 900). Los 6 siguen haciendo
falta a nivel de sitio, pero el preload de la Tarea 4 tiene que apuntar a uno de esos
cuatro, no a 500 ni a 800.

### 4. La ficha es la pantalla con más CLS, y la culpa NO es de las fotos

CLS de la ficha: **0,0739 en móvil** y 0,0350 en escritorio — el peor de las tres pantallas.
Los elementos que se desplazan, según el observador: **`pdp-opt-group` y `pdp-opt`** — los
grupos de opciones, que los pinta la isla de React y empujan el contenido al hidratar.

Las fotos no aparecen entre los culpables, lo cual **confirma** que la reserva de espacio ya
estaba bien (13 de 14, §2 del diseño). El CLS que queda viene de la hidratación de las
opciones, que **ninguna tarea de este plan toca**. Queda anotado para el dueño.

### 5. Las corridas lentas sueltas son reales y por eso la mediana de 5 era lo correcto

Tres outliers en 30 corridas: 9.796 ms, 30.064 ms y un timeout de más de 60 s. La mediana
los absorbió sin problema en los tres casos. Una medición de una sola corrida habría
reportado un LCP de 30 segundos en el listado.

---

## Después del trabajo — pendiente (Tarea 8)
