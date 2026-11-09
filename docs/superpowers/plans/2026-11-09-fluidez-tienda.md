# Fluidez y estados de carga — Fase 1 (la tienda) — Plan de implementación

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development`
> (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea.
> Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Goal:** Que la tienda se perciba estable y fluida al cargar — fotos que entran con un
cruce corto, texto que no salta al llegar la fuente, refresco en vivo que no cambia datos
de golpe — sin empeorar el LCP.

**Architecture:** Todo en CSS y en las islas de React que ya existen. El espacio de las
fotos ya está reservado con `aspect-ratio` (13 de 14), así que el fade es **solo
opacidad** y no mueve nada. El estado «no cargada» lo aplica **únicamente el JS del
cliente** y **se autolibera por tiempo**, para que una foto no pueda quedar invisible. Las
candidatas a LCP no se funden. No se agregan librerías.

**Tech Stack:** Astro 7 (SSG) + islas de React 19 + Tailwind 4 CSS-first + shadcn/ui ·
vitest (`node` para `*.spec.ts`, `jsdom` para `*.spec.tsx`) · `@fontsource/poppins`

**Spec:** [`docs/superpowers/specs/2026-11-09-fluidez-y-carga-design.md`](../specs/2026-11-09-fluidez-y-carga-design.md)

**Fase 2 (el panel, `calc3d-web`) tiene su propio plan**, y no se escribe hasta que este
plan esté terminado y medido: son dos repos independientes y cada uno entrega software
funcionando por su cuenta.

---

## Global Constraints

Aplican a **todas** las tareas. Los requisitos de cada tarea las incluyen implícitamente.

- **Idioma:** UI, comentarios y mensajes de error en **español**. Texto de cara al cliente
  en **«tú»**, no voseo (lo vigila `src/idioma.spec.ts`).
- **Techo de movimiento:** nada supera `--dur-lenta` (420 ms). Los tokens existentes son
  `--ease: cubic-bezier(.22,.61,.36,1)`, `--dur-normal: 240ms`, `--dur-lenta: 420ms`, en
  `src/lib/tokens.css`. **Prohibido crear tokens de movimiento nuevos** (ya se borró un
  `--dur-rapida: 160ms` el 2026-11-07 por no usarse).
- **Ningún `!important` nuevo dentro de un `@layer`.** Para los `!important` el orden de
  capas se invierte y la guardia de `prefers-reduced-motion` —que vive fuera de capa—
  pasaría a perder.
- **Tailwind 4 CSS-first:** `@theme inline`, **no hay `tailwind.config`**.
- **Sin `sharp` y sin `astro:assets`:** las fotos van como `<img src={…}>`.
- **jsdom no aplica CSS.** Ningún `*.spec.tsx` puede medir `opacity`, `aspect-ratio` ni
  contraste con `getComputedStyle`: daría verde con el CSS roto. Lo que se amarra en jsdom
  es la **estructura**; el CSS se verifica leyendo el **texto** de `global.css` desde un
  `*.spec.ts` (precedente: `src/hover-con-reduce.spec.ts`, `src/components/ui/avisos.spec.ts`).
- **`pnpm check` no lo cubre `pnpm test`.** Las dos cosas en verde antes de cerrar
  cualquier tarea.
- **Un commit por tarea, en `main`. NUNCA `git push`** — un push es un despliegue y lo
  decide el dueño. Sin `--no-verify` ni flags interactivos.
- **No tocar `.env`** ni `packages/shared` ni la lógica de precios.

---

## Review Focus

Cinco modos de falla que el spec implica y que ninguna tarea exerciría sola. Cada línea
tiene su test asignado a la tarea que es dueña del código, en el estilo de pasos de esa
tarea.

1. **`prefers-reduced-motion: reduce` + fade = foto invisible para siempre.** La guardia
   reduce la **duración** a `0.01ms`, **no** cambia el valor inicial. Un mecanismo que
   arranque en opacidad 0 y dependa de una transición para llegar a 1 deja a quien pidió
   menos movimiento sin la foto. → Tarea 3, paso 1.
2. **Después de una navegación del cliente, el fade deja de funcionar o rompe.**
   `swapRootAttributes` de `<ClientRouter />` hace `removeAttribute` de **todos** los
   atributos de `<html>`, y el HTML destino viene del build sin ninguna marca de JS. Un
   mecanismo colgado de `<html>` muere en la segunda página. → Tarea 3, paso 8.
3. **Foto en caché: el `onLoad` ya disparó antes de que la isla hidratara**, así que no
   llega nunca y la foto queda transparente. → Tarea 3, paso 5.
4. **La API contesta `error` y el cruce en vivo cruza igual.** Con la API caída se
   conserva lo horneado: no cambió ningún dato, así que no hay nada que cruzar, y cruzar
   ahí haría parpadear datos viejos como si fueran nuevos. → Tarea 5, paso 5.
5. **Un banner que no es 16:9 se deforma en vez de recortarse.** `object-fit: fill` (el
   valor por defecto) estira la imagen; el spec fija `cover`. → Tarea 2, paso 1.

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `src/styles/global.css` | Reserva de espacio (`.banner-cat img`), keyframes y clases del fade, migración de duraciones a tokens. El bloque del fade va **al final y FUERA de `@layer`**, como la guardia de movimiento y los estilos de sonner. |
| `src/lib/foto.ts` (**nuevo**) | `marcarCargando(img)`: la política de «no cargada» en un solo lugar — la aplica solo el cliente y se autolibera por tiempo. Lógica pura, testeable en `node`. |
| `src/components/ui/Foto.tsx` (**nuevo**) | El `<img>` con fade. Envuelve la política de `foto.ts` y expone `prioridad` para excluir a las candidatas a LCP. |
| `src/lib/vivo.ts` | Se le agrega la detección de «este dato cambió» para el cruce. |
| `src/components/ui/Cruce.tsx` (**nuevo**) | Cruza un texto que cambió de valor. Un solo componente para tarjetas, ficha y franja. |
| `src/components/ficha/EsqueletoFicha.tsx` (**nuevo**) | El esqueleto del rescate de ficha. |
| `src/fotos-reservan-espacio.spec.ts` (**nuevo**) | Guardián: toda clase de foto remota declara su reserva de espacio. |
| `src/dist-sin-js.spec.ts` (**nuevo**) | Guardián sobre `dist/`: el HTML horneado no esconde ninguna foto. Corre en un script aparte. |
| `docs/superpowers/plans/2026-11-09-fluidez-tienda-mediciones.md` (**nuevo**) | La línea base y la medición final, con el umbral. |

---

## Task 1: Línea base de medición

Sin esto el anti-objetivo del LCP es infalsificable y las tareas 3 y 4 no se pueden
cerrar.

**Files:**
- Create: `docs/superpowers/plans/2026-11-09-fluidez-tienda-mediciones.md`

**Interfaces:**
- Consumes: nada.
- Produces: el documento de mediciones, con la tabla de línea base que la Tarea 8 compara.

- [ ] **Step 1: Construir con la configuración de producción y servirlo**

```bash
PUBLIC_API_URL=https://calc3d-api-production.up.railway.app/api \
PUBLIC_SITE_URL=https://bananolab-3d.com \
pnpm build && pnpm preview
```

- [ ] **Step 2: Medir LCP y CLS, mediana de 5 corridas**

Tres pantallas: `/` (portada), `/tienda/navidad/` (listado) y la ficha de un producto de
esa categoría. A **390×844** y en escritorio. Con la red frenada (perfil fijo, el mismo
en las 5 corridas y en la Tarea 8).

⚠️ **El panel del navegador tiene que estar VISIBLE, o medir con Playwright.** Una página
de fondo no arranca las transiciones de vista ni avanza las animaciones CSS, y el síntoma
se lee igual que un router roto. `tabs_context` dice si está visible: leer esa línea antes
de creerle a la medición.

- [ ] **Step 3: Medir el ancho de un bloque de texto conocido con Poppins y con la fuente de respaldo**

Es el número del reflow, el que la Tarea 4 tiene que bajar. Medir el `offsetWidth` de un
párrafo de la ficha con `font-family: var(--font-display)` y con la familia de respaldo
forzada.

- [ ] **Step 4: Escribir el documento de mediciones**

Tabla con las tres pantallas × (LCP, CLS) y el ancho del bloque de texto. Y, escrito
arriba, el umbral que decide todo lo demás:

> «Empeora» = la **mediana de 5 corridas** sube más de **5 % o 50 ms, el que sea mayor**.
> Por debajo de eso es ruido de medición y no decide nada. La comparación es contra esta
> tabla, medida igual — nunca contra una corrida suelta ni contra producción.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-11-09-fluidez-tienda-mediciones.md
git commit -m "docs: línea base de LCP, CLS y reflow de fuente antes del trabajo de fluidez"
```

---

## Task 2: El banner de categoría reserva su espacio

**Files:**
- Modify: `src/styles/global.css:396`
- Create: `src/fotos-reservan-espacio.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: el guardián `fotos-reservan-espacio.spec.ts`, que la Tarea 3 **no** modifica
  (el fade no cambia la reserva de espacio).

- [ ] **Step 1: Escribir el test que falla**

Lee el **texto** de `global.css` (entorno `node`) y exige, para cada clase que pinta una
foto remota, que declare `aspect-ratio` **o** `width` y `height` concretos. La lista va a
mano y el mensaje de error dice que hay que sumar la clase nueva — un patrón general
sobre «todo `img`» se comería los logos locales, que ya traen atributos.

```ts
// src/fotos-reservan-espacio.spec.ts
const CLASES_CON_FOTO_REMOTA = [
  '.banner-cat img',
  '.hero-art--banner',
  '.product-photo',
  '.cat-card-foto',
  '.pdp-main',
  '.pdp-thumb',
  '.cart-thumb',
  '.pdp-custom-chip img',
] as const;

describe('toda foto remota reserva su espacio antes de cargar', () => {
  it.each(CLASES_CON_FOTO_REMOTA)('%s declara aspect-ratio o alto fijo', (sel) => { … });

  it('.banner-cat img recorta, no deforma', () => {
    expect(reglaDe('.banner-cat img')).toMatch(/object-fit:\s*cover/);
  });
});
```

El segundo test es el punto 5 del Review Focus: sin `object-fit`, el valor por defecto
(`fill`) **estira** el banner en vez de recortarlo.

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm vitest run src/fotos-reservan-espacio.spec.ts`
Expected: FAIL en `.banner-cat img` (hoy declara `height: auto`) y en `object-fit`.

- [ ] **Step 3: Cambiar la regla en `src/styles/global.css:396`**

```css
.banner-cat img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
```

`16 / 9` es decisión del dueño (spec §5.1): es lo que el panel ya muestra en su vista
previa (`aspect-[16/9]` + `object-cover`) y lo que su texto ya recomienda al subir. Dejar
un comentario que diga **por qué** está ahí, igual que `.hero-art--banner`.

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm vitest run src/fotos-reservan-espacio.spec.ts` → PASS

- [ ] **Step 5: Validar el guardián rompiéndolo**

Sacar `aspect-ratio` de `.hero-art--banner` (una clase que el test NO tocó en esta tarea)
→ el test tiene que ponerse **rojo**. Restaurar con **copia de respaldo** (`cp`), **nunca
con `git checkout --`**.

- [ ] **Step 6: Verificar en el navegador**

El banner no se puede medir: **no hay ninguno cargado** (`{"banners":[]}` en producción,
medido el 2026-11-09). Confirmar la reserva inyectando un `<img>` con la clase
`.banner-cat img` en un listado servido por `pnpm preview` y comprobando que el bloque
ocupa su alto **antes** de que la imagen cargue.

- [ ] **Step 7: Commit**

```bash
git add src/styles/global.css src/fotos-reservan-espacio.spec.ts
git commit -m "fix(tienda): el banner de categoría reserva su espacio (16/9) y no empuja la página"
```

---

## Task 3: Fade-in de las fotos que no son candidatas a LCP

La tarea más delicada del plan: su modo de falla es **dejar fotos invisibles**, y el HTML
horneado lo serviría así a Google.

**Files:**
- Create: `src/lib/foto.ts`, `src/lib/foto.spec.tsx`
- Create: `src/components/ui/Foto.tsx`, `src/components/ui/Foto.spec.tsx`
- Create: `src/dist-sin-js.spec.ts`
- Modify: `src/styles/global.css` (bloque nuevo al final, **fuera de `@layer`**)
- Modify: `package.json` (script del guardián de `dist/`)
- Modify: `TarjetaProducto.tsx`, `TarjetaIndice.tsx`, `CategoriasEnVivo.tsx`,
  `BannerCategoriaEnVivo.tsx`, `Carrito.tsx`, `Galeria.tsx` (solo las miniaturas)

**Interfaces:**
- Consumes: la reserva de espacio de la Tarea 2 (el fade **no** la cambia).
- Produces:
  - `TECHO_CARGA_MS: number` y `marcarCargando(img: HTMLImageElement, ahora?: () => number): () => void`
    en `src/lib/foto.ts` — devuelve la función que libera la marca.
  - `<Foto src alt className? prioridad? loading? />` en `src/components/ui/Foto.tsx`.
    `prioridad` (por defecto `false`) **apaga el fade**: es el interruptor de las
    candidatas a LCP.

### Qué se funde y qué no

**Decisión tomada en el spec §5.2 y no se reabre.** Una imagen en `opacity: 0` **no es
candidata a LCP** para el navegador: fundir la foto grande retrasa el LCP, que es causa
de reversión declarada.

| Entra con fade | `prioridad` (sin fade) |
|---|---|
| `.product-photo` fuera de la primera fila | `.pdp-main` (el LCP de la ficha) |
| `.cat-card-foto`, `.banner-cat img`, `.cart-thumb` | El **hero** de la portada y de `/impresion-3d/` |
| Las miniaturas de la galería (`.pdp-thumb img`) | La **primera fila** de `.shop-grid` |
| | Las fotos **locales** (Header, Footer, 404, arte del hero) |

La primera pantalla no queda fea sin fade: su hueco ya está pintado con `--ink-700`, así
que la foto reemplaza una **caja llena**, no un blanco.

- [ ] **Step 1: Escribir el test de la política de carga**

En **`src/lib/foto.spec.tsx`** — con `x`, y no es un detalle: el test manipula un
`HTMLImageElement`, que **no existe** en el proyecto `node` de vitest (fallaría con
«HTMLImageElement is not defined»). La extensión elige el entorno, así que `.tsx` lo manda
a jsdom. Mismo motivo por el que `lib/vivo.spec.tsx` es `.tsx` aunque pruebe un hook.

Es el test que hace **imposible** el modo de falla, y cubre los puntos 1 y 3 del Review
Focus:

```ts
describe('la marca de «foto no cargada»', () => {
  it('no se aplica si la imagen ya está completa (foto en caché, el onLoad no llega nunca)', …);
  it('se libera sola al pasar TECHO_CARGA_MS, aunque el onLoad nunca dispare', …);  // con vi.useFakeTimers()
  it('la función que devuelve libera la marca al llamarla', …);
  it('liberar dos veces no explota', …);
});
```

⚠️ **El techo por tiempo es lo que cierra el anti-objetivo.** Con `reduce` la guardia baja
la duración a `0.01ms` pero **no** cambia el valor inicial: sin el techo, una foto cuyo
`onLoad` no llega (red cortada a mitad de descarga) queda transparente **para siempre**.
El techo convierte «invisible» en «aparece de golpe», que es el peor caso aceptable.

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm vitest run src/lib/foto.spec.ts`
Expected: FAIL — `marcarCargando` no existe.

- [ ] **Step 3: Implementar `marcarCargando(img, ahora?)` y `TECHO_CARGA_MS` en `src/lib/foto.ts`**

`TECHO_CARGA_MS = 3000`. La marca es un atributo (`data-cargando`), no una clase, para no
pelearse con las clases que ya trae cada foto. Si `img.complete` es `true`, no marca nada
y devuelve una función que no hace nada.

- [ ] **Step 4: Correr el test para verificar que pasa** → PASS

- [ ] **Step 5: Escribir el test de pantalla de `<Foto>`**

En `src/components/ui/Foto.spec.tsx`. jsdom **no aplica CSS**, así que no se mide
`opacity`: se amarra la **estructura**.

```tsx
describe('<Foto>', () => {
  it('el marcado inicial NO lleva la marca de «no cargada» (es lo que se hornea)', …);
  it('con prioridad no marca nunca, ni después de montar', …);
  it('pasa width y height cuando se los dan', …);
  it('pasa className TAL CUAL al <img>', …);
  it('la marca desaparece al pasar TECHO_CARGA_MS sin onLoad', …);  // fake timers
});
```

El primero es el que protege el HTML del build: **la marca no puede existir en el render
inicial**, porque ese render es el que Astro hornea.

⚠️ **El de `className` no es trivial: tapa un agujero entre los dos guardianes.**
`fotos-reservan-espacio.spec.ts` (Tarea 2) lee el **CSS** y es **ciego** a que el JSX
pierda la clase. Si `<Foto>` se come el `className`, `.product-photo` y compañía dejan de
aplicar, la reserva de espacio se cae **y los dos guardianes siguen en verde**.

- [ ] **Step 6: Correr el test para verificar que falla** → FAIL, `Foto` no existe.

- [ ] **Step 7: Implementar `<Foto>` en `src/components/ui/Foto.tsx` y su CSS**

Firma: `<Foto src alt className? prioridad? loading? width? height? />`.

Requisito que no es negociable: **la marca de «no cargada» la aplica únicamente el JS del
cliente, después de montar** — nunca el render que Astro hornea. El mecanismo exacto es
criterio del implementador (spec §9), con dos límites: tiene que pasar el test del paso 5
y el guardián de `dist/` del paso 9.

El CSS va **al final de `global.css` y FUERA de `@layer`**, como la guardia de movimiento
y los estilos de sonner: `[data-cargando]` en opacidad 0 y la transición de opacidad de
`--dur-normal var(--ease)`. **Sin `!important`.**

- [ ] **Step 8: Verificar que sobrevive a una navegación del cliente**

Punto 2 del Review Focus. `swapRootAttributes` borra **todos** los atributos de `<html>`
en cada swap y el documento destino viene del build sin marca de JS: un mecanismo colgado
de `<html>` funciona en la primera página y muere en la segunda.

Con `pnpm preview`: entrar a la portada, navegar a un listado **haciendo clic** (no
recargando) y comprobar que las fotos de abajo siguen fundiéndose. Si el mecanismo
elegido depende de `<html>`, cambiarlo.

- [ ] **Step 9: Escribir el guardián sobre `dist/` y su script**

`src/dist-sin-js.spec.ts` (entorno `node`): lee los `.html` de `dist/` y exige que ninguna
foto llegue escondida — ni `data-cargando`, ni `opacity: 0` en línea, ni una clase de «no
cargada».

⚠️ **Va en un script APARTE, no en `pnpm test` ni en el gancho de pre-push.** Leer `dist/`
exige un `pnpm build`, y el build **le pega a la API**: atar cada push a tener la API
arriba y a un build de minutos —donde hoy la suite tarda segundos— entrena el
`--no-verify`. Se corre a mano, junto con `pnpm check`.

⚠️ **Si `dist/` no existe, FALLA fuerte. Nunca se saltea.** Un script que diga «0
verificados» y salga en verde es el guardián-que-no-guarda que este repo viene cerrando.

En `package.json`: `"test:dist": "vitest run src/dist-sin-js.spec.ts"`, y excluir ese
archivo del proyecto `node` de `vitest.config.ts` para que `pnpm test` no lo arrastre.

- [ ] **Step 10: Correr el guardián contra un `dist/` construido** → PASS

- [ ] **Step 11: Validar el guardián rompiéndolo**

Poner `prioridad` en `false` en la foto de la ficha **y** forzar la marca en el render
inicial (la mutación tiene que **compilar**) → `test:dist` en **rojo**. Restaurar con
copia de respaldo.

- [ ] **Step 12: Pasar las fotos a `<Foto>` y medir el LCP**

Los seis archivos de la lista de Files, respetando la tabla de `prioridad`. Volver a medir
LCP en las tres pantallas de la Tarea 1 con el umbral de la Tarea 1 paso 4. **Si empeora,
se revierte** — el anti-objetivo no se discute.

- [ ] **Step 13: Commit**

```bash
git add src/lib/foto.ts src/lib/foto.spec.ts src/components/ui/Foto.tsx \
        src/components/ui/Foto.spec.tsx src/dist-sin-js.spec.ts \
        src/styles/global.css package.json vitest.config.ts \
        src/components/catalogo src/components/banners src/components/carrito src/components/ficha
git commit -m "feat(tienda): las fotos entran con un cruce corto, sin tocar las candidatas a LCP"
```

---

## Task 4: Fuentes autohospedadas

**Files:**
- Modify: `package.json` (dependencia), `src/layouts/Base.astro:108-113`,
  `src/styles/global.css` (bloque de `@font-face` de respaldo)
- Create: `src/fuentes.spec.ts`

**Interfaces:**
- Consumes: la línea base del ancho de texto (Tarea 1 paso 3).
- Produces: nada que otra tarea consuma.

⚠️ **Dato medido el 2026-11-09, contra lo que suponía el spec: los 6 pesos de Poppins se
usan** (700×13, 600×11, 400×6, y 900, 800 y 500 una vez cada uno en `global.css`, más
`font-medium` y `font-semibold` de Tailwind en los `.tsx`). **No hay recorte disponible
sin tocar el diseño**, que es un no-objetivo. Se empaquetan los 6, solo subconjunto
`latin`.

- [ ] **Step 1: Escribir el test que falla**

`src/fuentes.spec.ts` (entorno `node`), lee `Base.astro` y `global.css`:

```ts
it('no queda ninguna referencia a Google Fonts', () => {
  expect(base).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
});
it('precarga EXACTAMENTE un woff2', () => { … });   // precargar seis es pelearse por el ancho de banda
it('ningún @font-face usa font-display: block', () => { … });
it('la familia de respaldo declara los overrides de métrica', () => { … });
```

El tercero es un modo de falla propio: `block` deja el texto **invisible** hasta que llega
la fuente, que es peor que el reflow que esto viene a arreglar.

- [ ] **Step 2: Correr el test para verificar que falla** → FAIL en la referencia a Google.

- [ ] **Step 3: Instalar la fuente y reemplazar el enlace**

```bash
pnpm add @fontsource/poppins
```

Importar los 6 pesos del subconjunto `latin` y **borrar** las tres etiquetas de
`Base.astro:108-113` (los dos `preconnect` y el `stylesheet` de
`fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap`).
Agregar el `preload` de **un** woff2: el peso que pinta el texto grande de la primera
pantalla.

- [ ] **Step 4: Medir las métricas de la fuente real y calcular los overrides**

⚠️ **Los números salen del `woff2` instalado, NO de un blog.** Leer `unitsPerEm`,
`ascender`, `descender` y `lineGap` del archivo (script de un solo uso en el scratchpad) y
derivar `ascent-override`, `descent-override` y `line-gap-override`. `size-adjust` sale de
**medir en el navegador** el ancho del mismo bloque de texto con Poppins y con la familia
de respaldo (la base de la Tarea 1 paso 3) y dividir.

Un número equivocado acá **agrega** salto en vez de quitarlo, y se nota en el párrafo
largo de la ficha.

- [ ] **Step 5: Escribir el `@font-face` de respaldo con esos overrides en `global.css`**

Y dejar los números con un comentario que diga **de dónde salieron y cuándo se midieron**,
para que el próximo no los copie de otro lado.

- [ ] **Step 6: Correr los tests** → `pnpm vitest run src/fuentes.spec.ts` PASS

- [ ] **Step 7: Volver a medir el reflow y el LCP**

El ancho del bloque de texto tiene que moverse **mucho menos** que en la línea base, y el
LCP no puede empeorar según el umbral. Comprobar también que con la red cortada el texto
se ve en la de respaldo (no invisible).

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml src/layouts/Base.astro src/styles/global.css src/fuentes.spec.ts
git commit -m "perf(tienda): Poppins autohospedada con preload y métricas de respaldo, sin reflow"
```

---

## Task 5: El refresco en vivo cruza, sin avisar

**Files:**
- Modify: `src/lib/vivo.ts`, `src/lib/vivo.spec.tsx`
- Create: `src/components/ui/Cruce.tsx`, `src/components/ui/Cruce.spec.tsx`

⚠️ El spec de `useEnVivo` es **`vivo.spec.tsx`**, con `x`: corre en **jsdom**, no en
`node`. Renombrarlo a `.ts` lo mandaría al proyecto `node` y fallaría con «document is not
defined» (`vitest.config.ts` elige el entorno por la extensión).
- Modify: `TarjetaProducto.tsx`, `TarjetaIndice.tsx`, `Ficha.tsx`, `FranjaEnVivo.tsx`

**Interfaces:**
- Consumes: el bloque de CSS fuera de `@layer` de la Tarea 3.
- Produces: `<Cruce valor={…}>` en `src/components/ui/Cruce.tsx`, que cruza cuando su
  `valor` cambia de una renderización a la siguiente y no hace nada en el primer render.

### Dónde cruza, y dónde no

**Decisión tomada en el spec §5.4.** Hay **8** componentes que usan `useEnVivo`. El cruce
va en **4**: las dos tarjetas, la ficha y `FranjaEnVivo`.

La regla: **cruza el TEXTO que cambia de valor sin cambiar de altura** — precio, precio
tachado, insignias, texto de la franja. Son los datos que el dueño corrige desde el panel.

**Queda fuera todo cambio de ALTURA**, y son más casos de los que parecen: un producto que
se apagó y desaparece, una categoría que quedó vacía, **y también algo que apareció** (un
producto publicado, un banner que se prendió, relacionados que ahora existen). Esos valen
**secos**: lo que comunican es que algo entró o salió, y fundirlos pelearía con la Tarea 2.

- [ ] **Step 1: Escribir el test de `<Cruce>`**

```tsx
describe('<Cruce>', () => {
  it('en el primer render no cruza (lo horneado se pinta de una)', …);
  it('cruza cuando el valor cambia', …);
  it('no cruza cuando el valor llega igual — el caso normal', …);
  it('sobre un elemento que ya existe NO agrega ningún nodo', …);
  it('alrededor de un nodo de texto suelto agrega UN solo elemento, en línea', …);
});
```

⚠️ **jsdom no hace layout: `getBoundingClientRect()` devuelve ceros.** Un test de jsdom
**no puede** comprobar «no cambia la altura» — daría verde con el bloque roto, igual que
pasa con el CSS (ver Global Constraints). Lo que se amarra acá es la **estructura**; la
geometría se mide en el navegador (paso 7).

El tercero es el que importa: el refresco contesta lo mismo casi siempre, y ahí **no se
debe ver nada**.

- [ ] **Step 2: Correr el test para verificar que falla** → FAIL, `Cruce` no existe.

- [ ] **Step 3: Implementar `<Cruce valor>` en `src/components/ui/Cruce.tsx`**

Compara el `valor` con el del render anterior. El CSS reusa la transición de opacidad de
la Tarea 3, con `--dur-normal`.

**Dos formas, y la razón de que sean dos.** Medido en el marcado real: el precio de la
tarjeta es un **nodo de texto suelto** dentro de `<span class="price">`
(`TarjetaProducto.tsx:87`), así que para fundirlo hace falta envolverlo; pero `.price-alt`,
las insignias y el texto de la franja **ya son elementos propios**, y envolverlos agrega una
caja al medio sin ninguna necesidad.

- `useCruce(valor)` → devuelve las props para **esparcir sobre un elemento que ya existe**.
  Cero nodos nuevos. Es la forma que se usa en la mayoría de los casos.
- `<Cruce valor>` → **solo** para un nodo de texto suelto que no tiene elemento propio.
  Envuelve en un `<span>` **en línea** (un `<span>` en línea alrededor de texto en línea no
  cambia la geometría; uno alrededor de un hijo `display: block` o de un hijo de flex/grid
  **sí** la cambia, y por eso no se usa ahí).

- [ ] **Step 4: Correr el test** → PASS

- [ ] **Step 5: Escribir el test de `useEnVivo` con la API caída**

Punto 4 del Review Focus. En **`src/lib/vivo.spec.tsx`** (con `x` — ya existe; ver la
advertencia de **Files**, que es la que vale):

```ts
it('con la API caída conserva lo horneado y no reporta ningún cambio de dato', …);
it('no vuelve a pedir después de fallar', …);   // el tope público es 120 peticiones/minuto
```

Con `error`, lo horneado se conserva: **no cambió ningún dato**, así que no hay nada que
cruzar. Cruzar ahí haría parpadear datos viejos como si fueran nuevos.

- [ ] **Step 6: Correr el test, implementar lo que falte en `vivo.ts`, volver a correr** → PASS

- [ ] **Step 7: Cablear los 4 consumidores, medir la geometría y validar con una mutación**

**Medir antes de dar por bueno el «no cambia la altura»**, porque ningún test de jsdom lo
cubre: con el `astro preview` en 5182, leer `getBoundingClientRect()` de `.product-foot`,
`.price` y la franja **antes y después** del cambio, a **390 y 1280**. Tienen que dar lo
mismo al píxel. Si alguno se mueve, el envoltorio está en el lugar equivocado.

Envolver precio, precio tachado, insignias y texto de franja. Después, la mutación:
**borrar el `<Cruce>` de `TarjetaIndice` y dejarlo en `TarjetaProducto`** → los tests de
pantalla tienen que ponerse rojos. Es el bug que este repo ya tuvo dos veces (la insignia
«Nuevo», la moneda «USD»): **las dos tarjetas tienen que dibujar lo mismo** y cubrir una
sola fue exactamente lo que lo dejó pasar.

- [ ] **Step 8: Commit**

```bash
git add src/lib/vivo.ts src/lib/vivo.spec.tsx src/components/ui/Cruce.tsx \
        src/components/ui/Cruce.spec.tsx src/components/catalogo src/components/ficha src/components/banners
git commit -m "feat(tienda): el refresco en vivo cruza el dato que cambió, sin cartel ni destello"
```

---

## Task 6: Esqueleto del rescate de ficha y cruce de la galería

**Files:**
- Create: `src/components/ficha/EsqueletoFicha.tsx`
- Modify: `src/components/ficha/FichaEnVivo.tsx:81-95`, `src/components/ficha/FichaEnVivo.spec.tsx`
- Create: `src/components/ficha/Galeria.spec.tsx` — **no existe** (comprobado: en
  `src/components/ficha/` solo hay specs de `Ficha`, `FichaEnVivo` y `RelacionadosEnVivo`)
- Modify: `src/components/ficha/Galeria.tsx`, `src/styles/global.css`

**Interfaces:**
- Consumes: **`useCruce` de la Tarea 5** (`src/components/ui/Cruce.tsx`), **no** la
  transición de la Tarea 3.
- Produces: nada que otra tarea consuma.

⚠️ **Corregido el 2026-11-09, después de cerrar la Tarea 5.** Este bloque decía «la
transición de la Tarea 3» y no sirve acá, por dos razones medidas en esa tarea:

1. La regla de la Tarea 3 es **`img[data-fundir]`**, y `src/fotos-funden.spec.ts:40` fija ese
   selector **textual**: ampliarlo pone rojo un guardián ajeno.
2. Esa regla deja el elemento en **`opacity: 0` en reposo** mientras carga. `.pdp-main` va con
   `prioridad` justamente para **no** estar nunca escondida, porque es el elemento del LCP de
   la ficha. Usarla acá es la reversión que el paso 6 prohíbe, por la puerta de atrás.

`useCruce` es lo correcto: reposo en **opacidad 1** (el 0 vive solo en el keyframe) y sus
reglas `[data-cruce='1']`/`[data-cruce='2']` no están calificadas por elemento, así que
alcanzan a un `<img>` igual que a un `<span>`.

⚠️ **`Foto` tiene una `interface Props` cerrada** (`src/components/ui/Foto.tsx:6`): no
reenvía props sueltas, así que hay que ensancharla para que acepte las del cruce. Es un
cambio chico y explícito; **no** lo resuelvas con un `{...rest}` que deje pasar cualquier
cosa.

- [ ] **Step 1: Escribir el test del esqueleto**

En `FichaEnVivo.spec.tsx`. Son **tres** estados distintos y el esqueleto es solo para el
primero:

```tsx
it('mientras viaja la respuesta y no hay ficha horneada, pinta el esqueleto de la ficha', …);
it('con error conserva lo horneado y NO pinta esqueleto', …);
it('con noExiste pisa lo horneado y NO pinta esqueleto', …);
it('el esqueleto conserva role="status" para el lector de pantalla', …);
```

Los dos del medio existen para que el esqueleto no reintroduzca el bug que ya se cerró:
mezclar «la API no contesta» con «la API dice que no está».

- [ ] **Step 2: Correr los tests para verificar que fallan** → FAIL

- [ ] **Step 3: Implementar `<EsqueletoFicha />` y usarlo en `FichaEnVivo`**

Reemplaza el `<p className="lead" role="status">Cargando el producto…</p>` de
`FichaEnVivo.tsx:93`. Toma la forma de la ficha real —galería, título, precio, botón— con
las dimensiones **medidas** de la ficha, y conserva `role="status"`. Reusa la clase
`.pdp-main` para el hueco de la galería, que ya tiene su `aspect-ratio`.

- [ ] **Step 4: Correr los tests** → PASS

- [ ] **Step 5: Escribir el test del cruce de la galería**

```tsx
it('al elegir otra miniatura, la foto principal cruza', …);        // estructura, no opacity
it('la foto principal conserva la clase `.pdp-main` sea cual sea la elegida', …);
it('al elegir la MISMA miniatura no cruza', …);
```

⚠️ **El segundo test NO mide altura, y es a propósito.** La versión anterior de este paso
pedía «la foto principal no cambia de alto entre fotos de distinta proporción»: eso es
geometría, **jsdom no hace layout** y el test habría dado verde con el bloque roto. Es la
**tercera** vez que este plan escribe ese mismo error (ya corregido en las Tareas 3 y 5).

Lo que de verdad garantiza el alto es el `aspect-ratio` de `.pdp-main`, y **ya lo cuida
`src/fotos-reservan-espacio.spec.ts`** (Tarea 2). Así que acá alcanza con amarrar que la
clase siga puesta pase lo que pase; el `aspect-ratio` lo vigila el otro guardián, y la
geometría se mide en el navegador si hace falta.

El tercero es el que evita el verde vacío: si el mecanismo marcara **siempre**, los dos
primeros pasarían igual.

- [ ] **Step 6: Correr, implementar el cruce en `Galeria.tsx`, volver a correr** → PASS

El cambio de foto es una **interacción**, no una carga: acá sí cruza aunque `.pdp-main`
sea candidata a LCP, porque el LCP ya ocurrió.

⚠️ **Decidí y decí qué elegiste: cruzar al cambiar el `src` significa cruzar hacia una
foto que puede no haber llegado.** Si la nueva no está en caché, el cruce pinta un hueco que
se desvanece hacia adentro en vez de una foto. Dos salidas razonables: (a) disparar el cruce
cuando la foto nueva **termina de cargar** (y entonces hace falta un techo por tiempo, como
el de la Tarea 3, para que una foto que nunca llega no deje el cruce colgado), o (b) aceptar
el hueco porque `.pdp-main` tiene fondo y `aspect-ratio`, así que no salta nada. **Medí si
las miniaturas y la principal comparten URL** (si la comparten, la foto ya está en caché y
el problema no existe) y elegí con ese dato, no de memoria.

⚠️ **Prohibido quitarle `prioridad` a `.pdp-main`.** Son dos disparadores distintos y solo
uno es gratis: cruzar al **cambiar de foto** no cuesta nada, fundir su **carga inicial**
retrasa el LCP de la ficha, que es causa de reversión declarada.

- [ ] **Step 7: Commit**

```bash
git add src/components/ficha src/styles/global.css
git commit -m "feat(tienda): esqueleto en el rescate de ficha y cruce al cambiar de foto"
```

---

## Task 7: Las duraciones sueltas pasan a los tokens

Va última a propósito: es la que más archivos toca y la que menos se nota, así que no
debe bloquear a ninguna otra.

**Files:**
- Modify: `src/styles/global.css`, `src/lib/tokens.css`
- Create: `src/duraciones-con-token.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: nada.

⚠️ **Corregido el 2026-11-09, antes de despachar.** La versión anterior de esta tarea la
trataba como un reemplazo mecánico y **habría roto dos cosas**. Medido sobre el
`global.css` de hoy:

| Valor | Veces | Qué es |
|---|---|---|
| `0.2s` | 12 | duración de transición |
| `0.3s` | 8 | duración de transición |
| `0.18s` | 3 | duración de transición |
| `0.15s` | 2 | duración de transición |
| `0.35s`, `0.38s` | 1 c/u | duración de transición |
| `0s` ×4, `0.01ms` ×2 | 6 | **la guardia de `prefers-reduced-motion` — NO SE TOCAN** |
| `60`…`450ms` | 11 | **`animation-delay`: el escalonado de entrada — NO SON DURACIONES** |

1. **Los `0s` y `0.01ms` son la guardia de movimiento misma** (`global.css:184,191`).
   Tokenizarlos no tiene sentido y el `0.01ms` es un valor mágico deliberado.
2. **La escalera 60→450 ms son `animation-delay`** (`global.css:1421-1434`): una
   **secuencia** que escalona la entrada de la cabecera y de las primeras 8 tarjetas.
   Meterlas en dos tokens destruye el efecto. Un `transition`/`animation` en atajo incluye
   el retraso, así que un guardián escrito como decía el plan **las marcaría a las once**.

- [ ] **Step 1: Escribir el guardián**

```ts
it('ninguna DURACIÓN de global.css está escrita a mano', () => {
  // solo duraciones: ni `*-delay`, ni el bloque de `prefers-reduced-motion`.
  // El mensaje de error nombra la línea y el valor encontrado.
});
it('el escalonado de entrada sigue siendo una secuencia creciente', …);
```

El segundo existe porque la escalera queda **exenta** del primero: sin él, exenta pasa a
significar «sin vigilar», y el día que alguien desordene los retrasos no falla nada.

- [ ] **Step 2: Correr para verificar que falla** → FAIL (hoy hay **8** usos de `var(--dur`
  y **28** duraciones a mano en 33 reglas).

- [ ] **Step 3: Migrar las duraciones a tokens**

⚠️ **Esto NO es un buscar-y-reemplazar: cambia cómo se siente el sitio entero.** Hay seis
valores reales (150, 180, 200, 300, 350, 380 ms) y solo dos tokens. Forzarlos a `240`/`420`
movería 28 reglas que ninguna tarea de este plan miró: un `0.15s` pasando a 240 ms es un
**60 % más lento**, y el pedido original decía «sutiles y **rápidas**».

**La regla que lo acota: ninguna regla puede cambiar su duración más de un 20 %.** Proponé
el **conjunto mínimo de tokens** que cumpla eso y entregá la **tabla completa** de antes y
después, regla por regla. Si alguna no entra en el 20 %, dejala como está y nombrala en el
reporte en vez de acomodarla.

**`--dur-rapida` puede volver**, y hoy sí califica: el plan pedía «usos reales ese mismo
día» y hay **17** (12 × 200 ms + 3 × 180 ms + 2 × 150 ms). Se borró el 2026-11-07 por no
tener ninguno; eso ya no es cierto. Cualquier token nuevo más allá de ese **se justifica
con su cuenta de usos en el reporte**, o no va.

Si al revisar `--dur-lenta: 420ms` sigue pareciendo largo para lo que lo usa, se ajusta **el
token**, con el resto de sus usos a la vista — no se le pone un número propio a un
componente.

⚠️ Hay **una** utilidad `duration-200` de Tailwind fuera del CSS
(`src/components/ui/dialog.tsx:62`). Queda **fuera de alcance**: es un componente de
shadcn y el guardián lee `global.css`. Anotalo en el reporte, no lo toques.

- [ ] **Step 4: Correr los tests** → PASS

- [ ] **Step 5: Verificar que la guardia de movimiento sigue ganando**

`pnpm vitest run src/hover-con-reduce.spec.ts` → PASS, y revisar que la migración no metió
ningún `!important` dentro de un `@layer` (le ganaría a la guardia).

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css src/lib/tokens.css src/duraciones-con-token.spec.ts
git commit -m "refactor(tienda): las duraciones de movimiento salen todas de los tokens"
```

---

## Task 8: Medición final y cierre de la fase 1

**Files:**
- Modify: `docs/superpowers/plans/2026-11-09-fluidez-tienda-mediciones.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: la línea base de la Tarea 1 y todo lo implementado.
- Produces: el veredicto que habilita el plan de la fase 2.

- [ ] **Step 1: Correr todo en verde**

```bash
pnpm test && pnpm check
```

Y el guardián de `dist/`, que no corre con los otros:

```bash
pnpm build && pnpm test:dist
```

- [ ] **Step 2: Medir igual que en la Tarea 1 y comparar con el umbral**

Mismas tres pantallas, mismo perfil de red, mediana de 5. CLS y LCP. **Si el LCP empeoró
más de 5 % o 50 ms, se revierte la tarea culpable** — no se discute.

- [ ] **Step 3: Escribir el resultado en el documento de mediciones**

Tabla antes/después y, en una línea, el veredicto: pasa o se revierte, y qué.

- [ ] **Step 4: Actualizar el `CLAUDE.md` del repo**

Lo que el próximo necesita y no está en el código: que las candidatas a LCP **no se
funden** y por qué (una imagen en `opacity: 0` no es candidata a LCP); que la marca de «no
cargada» se autolibera por tiempo y por qué; que `test:dist` existe, **no** corre con
`pnpm test` y falla si no hay `dist/`; y que la proporción del banner es `16/9` por
coherencia con la vista previa del panel.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-11-09-fluidez-tienda-mediciones.md CLAUDE.md
git commit -m "docs: medición final de la fase 1 de fluidez y lo aprendido"
```

⚠️ **Acá termina el plan. NO se hace `push`**: lo decide el dueño, y un push a `main`
despliega en Cloudflare Pages.

---

## Self-Review

**1. Cobertura del spec.** §5.1 → Tarea 2. §5.2 → Tarea 3. §5.3 → Tarea 4. §5.4 →
Tarea 5. §5.5 → Tarea 7. §5.6 → Tarea 6. §8 medición → Tareas 1 y 8. §8 umbral → Tarea 1
paso 4. §8 prueba sobre `dist/` → Tarea 3 pasos 9-11. §10 (mis decisiones) → repartidas en
las tareas dueñas. **Sin huecos.**

**2. Consistencia de nombres.** `marcarCargando` / `TECHO_CARGA_MS` (`lib/foto.ts`) se
usan con ese nombre en la Tarea 3; `<Foto prioridad>` idem; `<Cruce valor>` se define y se
consume solo en la Tarea 5. El atributo es `data-cargando` en las tres menciones.

**3. Review Focus.** Los cinco tienen test asignado: reduce → T3 p1; navegación del
cliente → T3 p8; foto en caché → T3 p1 y p5; API caída → T5 p5; banner deformado → T2 p1.

**4. Lo que el plan NO decide, a propósito.** El mecanismo exacto de «solo el cliente
marca» (spec §9) — el plan fija el requisito y los dos tests que lo pinan. El valor final
de `--dur-lenta`. La forma del esqueleto más allá de «la de la ficha, medida».

**5. Proporción.** El plan es más corto que el spec. Los bloques de código son nombres de
test y firmas, no cuerpos; el único CSS literal es la línea de una sola regla de la
Tarea 2, que es exactamente la decisión del dueño.
