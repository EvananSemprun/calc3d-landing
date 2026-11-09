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
| Espera | ⚠️ **`load` + una ventana más larga que el candidato más lento de ESA pantalla** (ver hallazgo 5). La línea base usó `load` + 2.500 ms y eso **cortó el LCP del listado**. Mínimos comprobados: portada y ficha 2.500 ms alcanzan; **listado necesita 12 s en móvil y 33 s en escritorio** |
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

| Listado `navidad` | ~~1.244 ms~~ **9.692 ms** | ❌ **artefacto** (9.796 · 1.244 · 1.228 · 1.388 · 1.136) → re-medido con ventana de 12 s: 9.644 · 9.680 · **9.692** · 9.700 · 9.780 | **0,0097** | 0,0097 en las 5 |
| Ficha | **4.128 ms** | 4.188 · 4.132 · 4.108 · 4.128 · 4.116 | **0,0739** | 0,0739 en las 5 |

### Escritorio (1280×800)

| Pantalla | LCP mediana | LCP corridas crudas | CLS mediana | Elemento del LCP |
|---|---|---|---|---|
| Portada | **800 ms** | 804 · 760 · 800 · 776 · 832 | **0,0081** | `h1` (texto) en las 5 |
| Listado `navidad` | ~~1.272 ms~~ **30.340 ms** | ❌ **artefacto** (1.272 · 1.408 · **30.064** · 1.200 · 1.116) → re-medido con ventana de 33 s: 30.292 · **30.340** · 30.380 | **0,0081** | **`product-photo` en todas.** El `h1` que la base anotó en 4 de 5 era el candidato que quedaba cuando el reloj cortaba |
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

### 5. ⚠️ Dos de los tres «outliers» eran la medición CORRECTA, y la mediana los tapó

**Este hallazgo decía lo contrario y estaba mal.** Decía que los tres valores lentos
(9.796 ms, 30.064 ms y un timeout de 60 s) eran outliers que «la mediana absorbió sin
problema», y lo presentaba como prueba de que el método funcionaba. Es al revés: en el
listado, **esas corridas lentas eran las únicas que medían el LCP de verdad**, y la mediana
de 5 las descartó justamente por ser correctas.

**La causa, verificada en el código y no solo en una medición.** El arnés esperaba
`waitUntil: 'load'` más 2.500 ms. `load` espera a las imágenes **eager**, y nada más:

| Pantalla | Foto que define el LCP | Cómo carga | ¿La espera `load`? |
|---|---|---|---|
| Portada | `hero-art` | `loading="eager"` ([HeroEnVivo.tsx:93](../../../src/components/inicio/HeroEnVivo.tsx)) | **Sí** → la fila es válida |
| Ficha | `.pdp-main` | con `prioridad`, o sea eager ([Galeria.tsx:25](../../../src/components/ficha/Galeria.tsx)) | **Sí** → la fila es válida |
| **Listado** | `.product-photo` | **`loading="lazy"`** ([TarjetaProducto.tsx:47](../../../src/components/catalogo/TarjetaProducto.tsx)) | **NO** → la fila es un artefacto |

O sea que el defecto golpea **exactamente** a la pantalla cuyas fotos son perezosas, y a
ninguna otra. `load` disparaba sin la foto, los 2.500 ms se agotaban antes de que llegara, y
el observador se quedaba con el candidato anterior: un `h1` o un `product-desc` de 1,2 s.
Las corridas «lentas» eran las que, por azar de red, alcanzaban a pintar la foto dentro de
la ventana.

**Aislando la variable** (reproducir el estado anterior dentro del `dist/` ya construido y
medir con ventana larga): listado móvil **9.692 → 9.672 ms** y escritorio
**30.340 → 30.084 ms**. El LCP real de esa pantalla **no se movió** con el trabajo de la
Tarea 4; lo único que cambió fue que entra en la ventana de medición.

**La lección, que es la que vale para la Tarea 8 y para el `CLAUDE.md`:** una mediana solo
promedia mediciones del mismo fenómeno. Cuando la dispersión no es ruido de red sino **dos
fenómenos distintos** —el LCP real y el reloj cortando—, la mediana elige el fenómeno
equivocado por mayoría y lo hace sin avisar. El control que lo habría cazado en la línea
base es barato y ahora está en el método: **anotar el elemento del LCP junto a cada
número**. Las corridas decían `h1` en unas y `product-photo` en otras; eso solo no es
dispersión, es la señal de que no se estaba midiendo lo mismo.

---

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
| LCP portada | 764 / 748 ms | 792 / 788 ms → **+28 / +40 ms**, bajo el umbral de 50 ms |
| LCP ficha | 4.120 / 11.452 ms | 4.116 / **11.296** ms |
| LCP listado (ventana larga) | 9.692 / 30.340 ms | 9.672 / 30.084 ms |

Sin medir, y dicho a propósito: **Android y macOS**. El `size-adjust` se calibró contra
Arial, que es lo que resuelve en Windows; en Android `local('Arial')` cae a Roboto y la
corrección es parcial. La propiedad que hace aceptable el riesgo es que **toda rama que
falle cae a `system-ui` sin ajustar = el comportamiento de hoy**, nunca peor.

### Final — pendiente (Tarea 8)
