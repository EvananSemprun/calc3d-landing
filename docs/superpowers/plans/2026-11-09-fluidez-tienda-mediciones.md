# Fluidez de la tienda — mediciones

**Plan:** [`2026-11-09-fluidez-tienda.md`](2026-11-09-fluidez-tienda.md) ·
**Línea base:** 2026-11-09 · **Después:** 2026-11-10 (Tarea 8)

> ⚠️ **Para comparar, usá la tabla «Final» del fondo, no la «Línea base» de acá arriba.**
> La línea base del 09/11 se tomó con un binario de Chrome que ya no existe en esta máquina
> y dos de sus filas no describen el LCP de su pantalla. La Tarea 8 volvió a medir **las dos
> ramas** el 10/11, con el mismo binario, la misma sesión y los mismos datos de catálogo.

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
| Espera | `load` + 2.500 ms. **Medido el 09/11: alcanza en las tres pantallas** con el `dist/` actual, porque `load` dispara a los 11,6 s en el listado (espera a la foto, aunque sea `lazy`). La ventana de 12 s da el **mismo** número. Se dejó en 12 s para el listado igual, como seguro barato — **no como arreglo**: ver hallazgo 5 |
| Elemento del LCP | **Se anota junto a cada número, siempre.** Un número sin su elemento no se puede comparar: si el elemento cambia entre dos tablas, no midieron lo mismo |
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

Elemento del LCP en móvil, que la línea base no había anotado y se midió después: **`hero-art`** (la imagen) en 5 de 5 en la portada. En escritorio es el `h1`.

| Listado `navidad` | ~~1.244 ms~~ **9.692 ms** | ❌ **no es el LCP de esa pantalla** (9.796 · 1.244 · 1.228 · 1.388 · 1.136) → re-medido con ventana de 12 s: 9.644 · 9.680 · **9.692** · 9.700 · 9.780 | **0,0097** | 0,0097 en las 5 |
| Ficha | **4.128 ms** | 4.188 · 4.132 · 4.108 · 4.128 · 4.116 | **0,0739** | 0,0739 en las 5 |

### Escritorio (1280×800)

| Pantalla | LCP mediana | LCP corridas crudas | CLS mediana | Elemento del LCP |
|---|---|---|---|---|
| Portada | **800 ms** | 804 · 760 · 800 · 776 · 832 | **0,0081** | `h1` (texto) en las 5 |
| Listado `navidad` | ~~1.272 ms~~ **30.340 ms** | ❌ **no es el LCP de esa pantalla** (1.272 · 1.408 · **30.064** · 1.200 · 1.116) → re-medido con ventana de 33 s: 30.292 · **30.340** · 30.380 | **0,0081** | **`product-photo` en todas.** El `h1` que la base anotó en 4 de 5 era el candidato que quedaba cuando el reloj cortaba |
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

### 1. El LCP de la portada es TEXTO. El del listado NO — eso estaba mal

⚠️ **Corregido el 2026-11-09 (Tarea 4).** El título original de este hallazgo decía «y del
listado», y era falso: en el listado el elemento es **`product-photo`** en todas las
corridas, medido con una ventana que no corta (ver hallazgo 5). Lo que sigue vale para la
**portada**, donde el elemento es el **`h1`** en 5 de 5 corridas de escritorio, confirmado
dos veces con binarios distintos. En móvil la portada da `hero-art`, la imagen.

Eso cambia dos cosas del plan:

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

⚠️ **Y es PEOR de lo que decía este hallazgo** (medido en la Tarea 4): no es solo la ficha.
La foto del **catálogo** tarda **9,7 s en móvil y 30,3 s en escritorio** con la misma red —
el LCP más malo de las tres pantallas, y el que un cliente ve primero. La línea base no lo
vio porque su ventana de medición cortaba antes (hallazgo 5).

Está FUERA del alcance de este plan: las fotos son demasiado pesadas para la red de un
cliente venezolano con datos móviles, en las dos pantallas. No se toca acá — el plan no lo
cubre y meterlo sería ampliar el alcance solo. **Vale una conversación aparte con el dueño,
y es la más valiosa que salió de todo este trabajo.**

⚠️ **Y el 10/11 (Tarea 8) se midió el tamaño, que es el número que faltaba para esa
conversación:** una página de listado baja **12.915.736 bytes (12,9 MB)** de fotos. Son
**12 PNG** de **542 KB a 1,5 MB** cada uno, todos a **1254×1254** para cajas de ~350 px.
Medido con `curl` contra `fotos.bananolab-3d.com`, archivo por archivo:

| | |
|---|---|
| Formato | `image/png` en **12 de 12** — ni WebP ni AVIF |
| El más liviano / el más pesado | 554.807 B / 1.565.540 B |
| Total de la página | **12.915.736 B** |
| A 1,6 Mbps (200 KB/s) | **~64 s** para bajarlas todas |

Eso explica los dos números sin ninguna hipótesis: la foto que define el LCP compite con las
otras once por el ancho de banda. ⚠️ **El bloqueador conocido: este repo no tiene `sharp`**
(las imágenes van como `<img src>` plano, no `astro:assets`), así que redimensionar o
convertir no es una línea de configuración.

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

### 5. ⚠️ La fila del listado de la línea base es falsa, y la causa NO es la que escribí

Este hallazgo ha estado mal **dos veces**, y las dos versiones equivocadas quedan escritas
porque el valor está en por qué fallaron.

**Versión 1 (la línea base), mal.** Decía que los tres valores lentos (9.796 ms, 30.064 ms y
un timeout de 60 s) eran outliers que «lа mediana absorbió sin problema», y lo presentaba
como prueba de que el método funcionaba.

**Versión 2 (mía, al cerrar la Tarea 4), también mal.** Escribí que la causa era la ventana
de 2.500 ms: `load` espera solo a las imágenes *eager*, la foto del catálogo es `lazy`, así
que la ventana se agotaba antes de que llegara. Lo armé con una tabla de `file:line` que
se veía rigurosa — y los datos de esa tabla son ciertos (la foto del catálogo **es** `lazy`,
`TarjetaProducto.tsx:47`; la del hero y la de la ficha **son** eager). **Lo que es falso es
que eso explique la observación.**

**Lo medido el 09/11 contra el `dist/` actual (5 corridas, 390×844, misma red):**

| | |
|---|---|
| `loadEventEnd` | **11.625–11.660 ms** → `load` **SÍ espera** a la foto, aunque sea `lazy` |
| Último candidato del LCP al disparar `load` | **`product-photo`** a 9.604–9.704 ms, en **5 de 5** |
| Con la ventana corta de la línea base (2.500 ms) | **9.6 s, `product-photo`** |
| Con la ventana larga (12 s) | **9.6 s, `product-photo`** — idéntico |

O sea que, con este `dist/`, el arnés de la línea base **habría reportado 9,6 s**, no 1,2 s.
Alargar la ventana no cambia nada. Mi explicación estaba desmentida por la primera medición
que la puso a prueba.

**Qué queda en firme, y qué no:**

- ✅ **La fila de 1.244 ms no describe el LCP de esa pantalla.** Su elemento era `h1` o
  `product-desc`; el elemento real es `product-photo`, 83.145 px² contra 10.897. Eso no es
  una diferencia de medición, es otro objeto.
- ✅ **El LCP real del listado es ~9,6 s en móvil y ~30 s en escritorio**, y no lo movió el
  trabajo de la Tarea 4 (9.692 → 9.672 ms aislando la variable en el `dist/` construido).
- ✅ **La causa quedó identificada el 10/11 (Tarea 8), y no era ninguno de los dos
  candidatos como estaban planteados: era la VENTANA DE MEDICIÓN.** Ver
  «Por qué la línea base leyó 1,2 s» en la sección Final. En resumen: con la ventana de
  2.500 ms, el `dist/` de `07638a0` da **1,1-1,5 s en unas corridas y 9,6-12,6 s en otras**,
  según si el evento `load` de esa corrida esperó o no a la foto perezosa. No es el binario:
  la base re-medida hoy reproduce las dos modas. Los dos candidatos se descartan tal como
  estaban escritos — el `dist/` **sí** participa, pero no porque fuera más lento, sino
  porque su `load` es una carrera.

**La lección, que sobrevive a las dos versiones equivocadas:** el control que caza esto es
**anotar el elemento del LCP junto a cada número**, y es el único de todos los que
probé que funciona sin saber la causa. Las corridas de la línea base decían `h1` en unas y
`product-photo` en otras; eso solo ya dice que no se estaba midiendo lo mismo, sin que haga
falta entender por qué. Una mediana, en cambio, promedia lo que le den: cuando la dispersión
no es ruido sino **dos fenómenos distintos**, elige el que tenga mayoría y no avisa.

Y la segunda, más incómoda: un mecanismo que explica los datos **y** cita código real puede
estar igual de equivocado que una corazonada. Lo que lo separó de la verdad fue una sola
medición de `loadEventEnd` — quince segundos de trabajo que no hice antes de escribirlo.

## El script exacto, para que la Tarea 8 mida IGUAL

⚠️ **La línea base no guardó este script y eso fue un error.** Sin él, la Tarea 8 mide con
otro arnés —y posiblemente otro binario de Chromium— y las dos tablas dejan de ser
comparables, que es lo único que les da sentido. Queda escrito acá para que se reuse tal
cual. Se corre con Playwright, con el preview en 5182.

```js
async (page) => {
  const browser = page.context().browser();
  const BASE = 'http://localhost:5182';
  const urls = [
    ['portada', '/'],
    ['listado', '/tienda/navidad/'],
    ['ficha', '/producto/arbol-de-navidad-con-nombres/'],
  ];
  const init = () => {
    window.__lcp = 0; window.__cls = 0; window.__shifts = [];
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) {
        window.__lcp = e.startTime;
        window.__lcpEl = e.element ? (e.element.className || e.element.tagName) : null;
      } }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) {
        window.__cls += e.value;
        for (const s of (e.sources || [])) if (s.node)
          window.__shifts.push(String(s.node.className || s.node.tagName).slice(0, 40));
      } }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) { window.__err = String(e); }
  };
  const out = [];
  for (const [nombre, url] of urls) {
    for (let i = 1; i <= 5; i++) {
      // Contexto nuevo por corrida = caché FRÍA. Es parte del método.
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const p = await ctx.newPage();
      await p.addInitScript(init);
      const cdp = await ctx.newCDPSession(p);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false, latency: 150,
        downloadThroughput: 1.6 * 1024 * 1024 / 8,
        uploadThroughput: 750 * 1024 / 8,
      });
      try {
        await p.goto(BASE + url, { waitUntil: 'load', timeout: 60000 });
      } catch (e) { out.push({ nombre, run: i, error: String(e).slice(0, 120) }); await ctx.close(); continue; }
      // ⚠️ La ventana depende de la pantalla: tiene que ser MÁS LARGA que su
      // candidato más lento, o el LCP se corta y se reporta el candidato anterior
      // (ver hallazgo 5). El listado tiene fotos `lazy`, que `load` no espera.
      await p.waitForTimeout(nombre === 'listado' ? 12000 : 2500);
      const m = await p.evaluate(() => ({
        lcp: window.__lcp, cls: window.__cls, el: window.__lcpEl,
        shifts: [...new Set(window.__shifts)].slice(0, 5),
      }));
      out.push({ nombre, run: i, lcp: Math.round(m.lcp), cls: Number(m.cls.toFixed(4)),
                 lcpEl: m.el, culpables: m.shifts });
      await ctx.close();
    }
  }
  return JSON.stringify(out);
}
```

Para escritorio, lo mismo con `viewport: { width: 1280, height: 800 }` — y la ventana del
listado sube a **33.000 ms**, porque ahí la foto tarda ~30 s con la red frenada.

⚠️ **La versión de Chromium es parte del método.** La línea base no la anotó, así que la
Tarea 8 tiene que **re-medir la base Y el después con el mismo binario, en la misma
sesión**, y comparar esas dos. Una mejora o un empeoramiento de un 10-15 % entre tablas
medidas con binarios distintos no dice nada.

⚠️ **El umbral habla de la mediana de 5 corridas.** Si una tanda da un resultado dudoso, la
salida correcta es **aislar la variable** (por ejemplo neutralizar el cambio en el CSS del
`dist/` ya construido y volver a medir), no ampliar la muestra hasta que el número entre.
Ampliar la muestra cambia el método a mitad de camino y hace la comparación incomparable.

## Después del trabajo

### Parcial — Tarea 4 (fuentes autohospedadas), 2026-11-09

Medido con **Chromium 156.0.8078.81**, re-midiendo la base Y el después con ese mismo
binario en la misma sesión (la línea base de arriba se tomó con otro binario, así que sus
números **no** son comparables con estos de a uno).

| | Antes | Después |
|---|---|---|
| **Reflujo del `h1` de la portada** (390×844) | **+37,1 px (33 %)** | **0 px** |
| CLS portada móvil | 0,0357 | **0,0167 (−53 %)** |
| Peticiones a Google por carga | 5 (1 CSS + 4 woff2) | **0** |
| Ventana con la fuente de respaldo en pantalla (portada) | 514 ms | **0 ms** (llega 170 ms antes del primer pintado) |
| LCP portada | 764 / 748 ms | 772 / 712 ms (móvil / escritorio) |
| LCP ficha | 4.120 / 11.452 ms | 4.116 / **11.296** ms |
| LCP listado (ventana larga) | 9.692 / 30.340 ms | 9.672 / 30.084 ms |

### ⚠️ La precarga de fuente: el costo real, y cómo me lo medí mal

La precarga del woff2 del peso 900 **cuesta 20 ms de LCP en móvil y 76 ms en escritorio**, con
las dos ramas bajo el mismo tratamiento. Se repone igual, por decisión del dueño: lo que compra
es cerrar la ventana de ~540 ms en la que el titular se ve en la familia de respaldo. **No se
mueve de lugar** — 148,3 × 335 px y el mismo quiebre en 4 líneas, con y sin Poppins, verificado
con captura — pero se ve **fino en vez de negro**, y es el titular principal de la portada.

⚠️ **La trampa del arnés, que es lo que vale para la Tarea 8.** Una medición anterior dio
−150/−220 ms y era del **arnés, no de la página**: comparó una rama interceptada con
`route.fulfill` de Playwright contra una sin interceptar, y `route.fulfill` entrega el documento
**sin pasar por el freno de red de CDP**. Medido con el cuerpo devuelto **byte por byte
idéntico** y la intercepción como única variable:

| | `responseEnd` del documento |
|---|---|
| Interceptado (`route.fulfill`) | **64 ms** (24·27·64·105·118) |
| Sin interceptar (`route.continue`) | **259 ms** (252·257·259·268·322) |

Sin solaparse. **Interceptar regala ~195 ms**, más que cualquier efecto que este plan pueda
tener. Regla para la Tarea 8: **interceptar las dos ramas o ninguna**, nunca mezclar.

⚠️ **Y para medir geometría** (Tarea 5): esperar a que `getAnimations()` quede quieto antes de
leer, o se mide la animación de **entrada** todavía corriendo y se le echa la culpa a otra cosa
(pasó: 12 px de desplazamiento que no eran del cambio).

⚠️ **Bloquear una fuente para ver el respaldo exige bloquear `.woff2` Y `.woff`.** El
`@font-face` de `@fontsource` lista las dos y bloquear una sola deja pasar la otra: la página
carga Poppins igual y se mide el estado equivocado creyendo que es el respaldo.

Sin medir, y dicho a propósito: **Android y macOS**. El `size-adjust` se calibró contra
Arial, que es lo que resuelve en Windows; en Android `local('Arial')` cae a Roboto y la
corrección es parcial. La propiedad que hace aceptable el riesgo es que **toda rama que
falle cae a `system-ui` sin ajustar = el comportamiento de hoy**, nunca peor.

### Final — Tarea 8, 2026-11-10

## 🏁 VEREDICTO

> **Pasa. Las 6 filas quedan dentro del umbral y NO se revierte nada.** La peor fila es el
> LCP de la portada en escritorio: **+24 ms (+3,1 %)** contra una tolerancia de 50 ms. El
> elemento del LCP es **el mismo antes y después en las 6 filas, en 5 de 5 corridas cada
> una**, así que las dos tablas miden lo mismo. De yapa, dos mejoras que ninguna tarea
> prometió: el CLS de la portada móvil baja **−51 %** y el de la ficha en escritorio
> **−36 %**.

### Cómo se midió esta tanda (y en qué se diferencia de la línea base)

| | |
|---|---|
| Antes | `git worktree` en **`07638a0`** (último estado antes del plan), `pnpm install`, build con las variables de producción |
| Después | **`b197bff`**, build con las mismas variables, verificado por contenido (`--dur-rapida`/`--dur-panel` de la Tarea 7, URL de Railway, 0 `localhost`) |
| Servidor | Las **dos** en `astro preview --port 5182`, una después de otra (`pnpm exec astro preview stop` entre medio). El puerto no es un detalle: la API valida `STORE_ORIGIN` exacto |
| Binario | **Chrome 157.0.8103.39**, el mismo para las dos ramas y en la misma sesión |
| Red, caché, ventanas, pantallas, tamaños | Idénticos al método de arriba (150 ms / 1,6 Mbps / 750 kbps, contexto nuevo por corrida, `load` + 2.500 ms salvo el listado: 12 s en móvil y 33 s en escritorio) |
| Control de datos | Las **12 URLs de foto** del listado dan el **mismo md5** en los dos builds, y la foto de la ficha medida es la misma. Los dos builds le pegan a la API de producción en vivo, así que sin este control el dueño editando el catálogo entre medio habría contaminado la comparación |

⚠️ **El binario cambió solo, a mitad del plan.** La línea base del 09/11 se tomó con
**156.0.8078.81** y hoy la misma máquina trae **157.0.8103.39**: Playwright acá no usa un
Chromium empaquetado, usa el **Chrome instalado del usuario**
(`C:\Program Files\Google\Chrome\Application\chrome.exe`), que se actualiza por su cuenta.
Por eso «mismo binario» no se puede conseguir **entre días**, solo dentro de una tanda — y
por eso la regla correcta no es anotar la versión, es **re-medir las dos ramas juntas**.

### LCP y CLS — móvil (390×844)

| Pantalla | Antes | Después | Δ | Tolerancia | Elemento (antes → después) | |
|---|---|---|---|---|---|---|
| Portada | **788 ms** | **788 ms** | **0 ms (0,0 %)** | 50 ms | `hero-art` 5/5 → `hero-art` 5/5 | ✅ |
| Listado `navidad` | **9.792 ms** | **9.852 ms** | +60 ms (+0,6 %) | 490 ms | `product-photo` 5/5 → `product-photo` 5/5 | ✅ |
| Ficha | **4.188 ms** | **4.172 ms** | −16 ms (−0,4 %) | 209 ms | `pdp-main` 5/5 → `pdp-main` 5/5 | ✅ |

| Pantalla | CLS antes | CLS después | Δ |
|---|---|---|---|
| Portada | 0,0342 | **0,0167** | **−51 %** |
| Listado | 0,0097 | 0,0100 | +0,0003 (ruido) |
| Ficha | 0,0739 | 0,0735 | −0,5 % |

Corridas crudas del LCP (ms):

| | Antes | Después |
|---|---|---|
| Portada | 1.052 · 748 · 832 · 748 · 788 | 812 · 788 · 780 · 772 · 796 |
| Listado | 11.004 · 9.692 · 9.792 · 10.088 · 9.784 | 9.964 · 9.852 · 9.852 · 9.648 · 9.676 |
| Ficha | 4.344 · 4.132 · 4.160 · 4.336 · 4.188 | 4.172 · 4.144 · 4.176 · 4.136 · 4.180 |

### LCP y CLS — escritorio (1280×800)

| Pantalla | Antes | Después | Δ | Tolerancia | Elemento (antes → después) | |
|---|---|---|---|---|---|---|
| Portada | **780 ms** | **804 ms** | **+24 ms (+3,1 %)** | 50 ms | `h1` 5/5 → `h1` 5/5 | ✅ |
| Listado `navidad` | **30.340 ms** | **30.580 ms** | +240 ms (+0,8 %) | 1.517 ms | `product-photo` 5/5 → `product-photo` 5/5 | ✅ |
| Ficha | **11.360 ms** | **11.420 ms** | +60 ms (+0,5 %) | 568 ms | `pdp-main` 5/5 → `pdp-main` 5/5 | ✅ |

| Pantalla | CLS antes | CLS después | Δ |
|---|---|---|---|
| Portada | 0,0081 | 0,0083 | +0,0002 (ruido) |
| Listado | 0,0081 | 0,0083 | +0,0002 (ruido) |
| Ficha | 0,0402 | **0,0258** | **−36 %** |

Corridas crudas del LCP (ms):

| | Antes | Después |
|---|---|---|
| Portada | 780 · 824 · 736 · 780 · 1.028 | 868 · 796 · 768 · 804 · 920 |
| Listado | 30.520 · 29.964 · 30.672 · 30.340 · **11.916** | 30.204 · 30.596 · 30.580 · 29.676 · 30.584 |
| Ficha | 11.400 · 11.360 · 11.340 · 11.292 · 11.424 | 11.296 · 11.368 · 11.628 · 11.420 · 11.620 |

⚠️ **Los 11.916 ms del listado de la base son reales y se dejan escritos**: en esa corrida
la foto llegó mucho antes, con el **mismo elemento** (`product-photo`) que las otras cuatro.
O sea que es dispersión del **mismo** fenómeno, no dos fenómenos como en la línea base, y la
mediana lo absorbe con derecho. Lo que lo autoriza es el elemento, no la forma de la
distribución.

### La precarga de la fuente: costo aceptado, no regresión pendiente

El umbral habría mandado revertir la precarga del woff2 del peso 900 (**20 ms de LCP en
móvil, 76 ms en escritorio**, medido en la Tarea 5 con las dos ramas bajo el mismo
tratamiento). **No se revierte: es decisión del dueño**, tomada con las dos capturas y los
dos números delante, y lo que compra es cerrar la ventana de ~540 ms en que el titular
principal de la portada se ve en la familia de respaldo (fino en vez de negro; **no se
mueve de lugar**, eso ya lo resuelven los overrides de métrica).

⚠️ **Y medido de punta a punta, la excepción ni se necesita.** Los 76 ms son el costo de la
precarga contra *autohospedada sin precarga*, que **no es ninguna de las dos ramas de esta
tabla**. La fila que la contiene —portada escritorio— cierra en **+24 ms**, dentro de la
tolerancia de 50 ms: autohospedar devuelve la mayor parte de lo que cuesta la precarga. El
número de 76 ms sigue siendo cierto y sigue siendo el costo de una decisión; lo que no es,
es una regresión abierta.

### Por qué la línea base leyó 1,2 s en el listado (causa cerrada)

La pregunta que quedó abierta en el hallazgo 5 era: la base decía **1.244 ms** y hoy esa
pantalla mide **~9,8 s** — ¿fue el `dist/` viejo o fue el binario? Se zanjó re-midiendo la
base con el binario de hoy, y la respuesta es **el `dist/`… por un mecanismo que no era
ninguna de las dos explicaciones escritas**:

| Base `07638a0`, listado móvil, Chrome 157 | Resultado |
|---|---|
| Ventana de **12 s** (la de hoy) | **9.792 ms**, `product-photo` en **5 de 5** |
| Ventana de **2.500 ms** (la de la línea base) | **bimodal**: 1.476 ms con `product-desc` **o** 9,6-10,0 s con `product-photo`, según la corrida |

Y el reparto de las dos modas cambia de tanda en tanda sobre el mismísimo `dist/`:
**3 rápidas / 2 lentas** en una tanda y **1 rápida / 4 lentas** en otra. La línea base
original cayó en una tanda con mayoría rápida (9.796 · 1.244 · 1.228 · 1.388 · 1.136) y su
mediana eligió esa moda.

**Lo que separa las dos modas, medido:** el `loadEventEnd` de la corrida. Donde da
**~1,2-1,5 s**, el evento `load` **no esperó** a la foto perezosa, la ventana de 2.500 ms
cerró a los ~3,9 s y el observador se quedó con el candidato anterior (`product-desc`,
10.897 px²). Donde da **~11,7 s**, `load` sí la esperó y el número es el de la foto
(83.145 px²).

**Qué queda en firme:**

- ✅ **No fue el binario.** La base re-medida con el binario de hoy reproduce las dos modas.
- ✅ **El `dist/` participa, pero no por ser más lento.** Base y después miden el mismo LCP
  en esa pantalla (9.792 vs 9.852 ms). La «regresión de 1,2 s a 9,6 s» **nunca existió**:
  era el arnés leyendo dos cosas distintas.
- ✅ **La «versión 2» del hallazgo 5 estaba sustancialmente BIEN** (la ventana corta se
  agota antes de que llegue la foto `lazy`), y lo que la hizo parecer falsa fue que la
  medición que la refutó corrió contra el **`dist/` equivocado** — el actual, donde `load`
  espera a la foto en 5 de 5 y entonces la ventana corta alcanza igual. La refutación
  repitió el pecado original: medir el artefacto que no era.
- ❌ **Lo que NO sé, y no invento:** por qué dentro de un mismo build el evento `load`
  espera a una imagen `lazy` en unas corridas y no en otras. Es una carrera que no aislé.
  Escribir acá un mecanismo plausible es exactamente el defecto que este plan pagó cinco
  veces.

**La lección final sobre el método, que es la que hay que llevarse:** lo único que cazó esto
—dos veces, sin conocer la causa— fue **anotar el elemento del LCP junto a cada número**. Una
tabla cuyas corridas dicen `h1` en unas y `product-photo` en otras ya está mal, y se nota sin
entender por qué. La mediana, en cambio, promedia lo que le den: cuando la dispersión son dos
fenómenos, elige el mayoritario y no avisa. El segundo control, más barato todavía, es
**anotar `loadEventEnd`**: 15 segundos de trabajo que habrían ahorrado tres versiones
equivocadas de un hallazgo.
