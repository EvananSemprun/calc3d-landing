# Movimiento y pulido — Plan de implementación

> **Para quien ejecute:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development
> para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** que la tienda deje de sentirse estática, sin agregar una sola librería y
sin que nada dependa de que el JavaScript corra.

**Arquitectura:** todo en `calc3d-landing`. Cero cambios de API, cero migraciones, cero
dependencias nuevas. El movimiento es **CSS** más las transiciones de vista nativas de
Astro. El pulido es sacar los `style="..."` sueltos a clases.

**Spec:** `docs/superpowers/specs/2026-11-07-rediseno-tienda-design.md` — cubre su **§7
(Movimiento)** y el paso 5 de su §11 (**Pulido**). Es la última fase del rediseño.

**Estado medido hoy (2026-11-07), antes de empezar:**

| | Hoy |
|---|---|
| `@keyframes` en `global.css` | **0** |
| `prefers-reduced-motion` | **0** |
| `transition` | 16, todas de hover o de paneles |
| `scroll-behavior: smooth` | `global.css:61`, **sin guardia** |
| Transiciones de vista | ninguna |
| `style="..."` sueltos | **28**, en 8 archivos |
| `global.css` | 1.023 líneas |

---

## Restricciones globales

- **Ninguna librería de animación.** Ni una. CSS y lo que trae Astro.
- ⚠️ **Nada puede quedar en `opacity: 0` esperando a un observador.** Si el JS no corre,
  la página se ve **completa**. Una animación de CSS que arranca en `opacity: 0` es
  válida porque corre sin JS; un `IntersectionObserver` que quita una clase **no lo es**.
- ⚠️ **`@media (prefers-reduced-motion: reduce)` apaga TODO**, incluido el
  `scroll-behavior: smooth` de `global.css:61`, que hoy no tiene guardia.
- **No se rehace `global.css` de punta a punta** (es un no-objetivo del spec, §2). Se
  agregan reglas y se tocan las que haga falta, nada más.
- **Lo que NO va** (spec §7): fundido-y-subida en cada sección al hacer scroll; contadores
  animados; cualquier librería.
- Español en UI y comentarios. Tailwind y los tokens de marca que ya existen, sin hex
  sueltos. `environment: 'node'` en los tests: sin jsdom, sin testing-library, sin `@/`.
- **No se toca el carrito** ni sus cuatro reglas. Animar el cajón no es tocar su lógica.
- **No hacer `push`.** Un push a `main` despliega. Commit por tarea.

## Fallos a vigilar (Review Focus)

Los cinco se verifican **en un navegador de verdad**, no leyendo el HTML. Son el gate
de la Tarea 3, que es la única que puede romperlos.

1. **Con el JS apagado, la página se ve entera.** Ningún elemento queda invisible.
2. **Con `prefers-reduced-motion: reduce`, no se mueve nada** — ni las entradas, ni los
   hovers, ni el scroll al tocar un ancla.
3. **Tras una navegación de cliente, el menú móvil sigue abriendo.** Su listener se
   engancha una vez al cargar; sin recablearlo, muere en la primera navegación.
4. **Tras una navegación de cliente, el botón de WhatsApp sigue teniendo su `href`.**
   Hoy lo completa un script que corre una sola vez. Si no se recablea, el botón queda
   en `href="#"`: **una venta perdida, que es una regla cardinal del proyecto**.
5. **Tras una navegación de cliente, la insignia del carrito sigue mostrando su número.**
   ⚠️ **Este es el que más probabilidades tiene de romperse, y ya sé por qué.** El
   marcado es HTML estático (`Header.astro:55`, `<span data-bl="cart-count" hidden>0</span>`)
   y lo mantiene al día la isla `Carrito.tsx:39`, que lo busca con `querySelectorAll`
   **cada vez que el pedido cambia**. Al navegar, el `span` se reemplaza por uno nuevo
   con su estado inicial —oculto y en cero— y nadie lo vuelve a pintar hasta que el
   pedido cambie otra vez. El pedido en `localStorage` sigue intacto; **lo que miente es
   la pantalla**, que es peor, porque el cliente cree que perdió lo que había elegido.
   El arreglo es repintar la insignia en `astro:page-load`.

## Decisiones que tomé al escribir este plan

1. **No hay `IntersectionObserver` en ningún lado, y eso cambia una respuesta vieja.**
   Al principio del rediseño el dueño eligió «CSS + observer, sin librería». Siguiendo el
   §7 del spec **el observador no hace falta**: la entrada del hero es una animación de
   carga (CSS puro) y todo lo demás responde a un clic. El único uso que tendría era el
   fundido-y-subida por sección, que el spec **prohíbe** por genérico. Menos código y el
   Review Focus 1 se cumple solo.
2. **Las transiciones de vista se quedan, pero con su recableado como requisito duro.**
   Son lo que más hace sentir moderno un catálogo grande, y es nativo. Pero rompen dos
   scripts del sitio; la Tarea 3 no está hecha hasta que los puntos 3, 4 y 5 del Review
   Focus se midan en un navegador.
3. **El pulido se limita a los `style="..."` sueltos.** Espaciado y escala tipográfica ya
   están decididos dentro de los tokens; tocarlos sin una queja concreta es rehacer
   `global.css`, que el spec prohíbe.

---

## Estructura de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `src/styles/global.css` | tokens de movimiento, `prefers-reduced-motion`, entrada, hover | 1, 2 |
| `src/components/inicio/Hero.astro` | marca las piezas que entran escalonadas | 1 |
| `src/layouts/Base.astro` | `<ClientRouter />` | 3 |
| `src/components/Header.astro` | el menú móvil se recablea a `astro:page-load` | 3 |
| `src/components/WhatsappCotizar.astro` | ídem, y es el que no puede fallar | 3 |
| Los 8 archivos con `style="..."` | pasan a clases | 4 |

---

## Tarea 1: La base del movimiento, y la entrada

**Archivos:** modificar `src/styles/global.css` y `src/components/inicio/Hero.astro`.

- [ ] **Paso 1: tokens de movimiento**

Al lado de `--ease`, que ya existe: `--dur-rapida: 160ms`, `--dur-normal: 240ms`,
`--dur-lenta: 420ms`. Las 16 `transition` que ya hay **no se migran en esta tarea**
(sería tocar todo el archivo por cosmética); los tokens son para lo nuevo.

- [ ] **Paso 2: la guardia, y va ANTES que todo lo demás**

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

⚠️ El `html { scroll-behavior: auto }` es aparte a propósito: el `scroll-behavior: smooth`
de la línea 61 está en `html`, y el selector universal no siempre lo gana. Hay que
apagarlo en los dos lados.

- [ ] **Paso 3: la entrada orquestada, en CSS puro**

Un `@keyframes entrada` que va de `opacity: 0; translateY(12px)` a visible, aplicado con
`animation-delay` escalonado (0, 60, 120, 180 ms) a **el hero y a la primera grilla**
(spec §7, punto 1): en la portada, el `h1`, el `lead`, las acciones, el arte, y después
las tarjetas de «Mirá por categoría»; en una página de categoría, el encabezado y la
primera fila de tarjetas.

**Sin JS y sin observador**: es una animación de carga, así que corre igual con el
JavaScript apagado y termina con todo visible.

⚠️ **Un solo momento por página** (spec §7). El escalonado llega hasta la primera grilla
y se termina ahí: ninguna sección de más abajo se anima al entrar en pantalla.

⚠️ **La primera grilla no puede escalonar 24 tarjetas.** Con `nth-child` acotá el
retardo a las primeras 6-8 y dejá el resto sin retardo, o la última tarjeta aparece casi
un segundo después que la primera.

- [ ] **Paso 4: verificar en un navegador**

Con `prefers-reduced-motion: reduce`: nada se mueve y un ancla salta sin deslizar.
Sin JS: la página se ve entera. Pegá las dos mediciones en el informe.

- [ ] **Paso 5: commit**

## Tarea 2: El movimiento que responde a un clic, y el hover de la tarjeta

**Archivos:** modificar `src/styles/global.css`.

- [ ] **Paso 1: hover con intención en la tarjeta** (spec §7, punto 3)

Hoy `.product` **no se mueve** al pasar el mouse (solo cambia el color del título). La
tarjeta sube unos pixeles y su foto hace un zoom suave; el zoom va con `overflow: hidden`
en `.product-media` para que la foto no se derrame.

⚠️ Solo en `@media (hover: hover)`: en un teléfono el «hover» se queda pegado después de
tocar.

- [ ] **Paso 2: el movimiento de respuesta** (spec §7, punto 2)

De los cuatro que pide el spec, **dos ya existen**: el cajón del carrito (`.cart-drawer`,
0.38s) y el panel de filtros (`.filters`, 0.3s). El tercero, **cambiar de página**, lo
resuelve la transición de vista de la Tarea 3. Falta el cuarto.

**La confirmación de agregar al pedido:** un pulso corto en la insignia del carrito
cuando el número cambia.

⚠️ **Cómo funciona esa insignia, medido:** el marcado es HTML **estático** en
`Header.astro:55` (`<span class="cart-count" data-bl="cart-count" hidden>0</span>`), y
quien lo mantiene al día es la isla `Carrito.tsx:39`, que lo busca con `querySelectorAll`
y le escribe el número. O sea que el pulso se agrega **ahí**, poniendo y sacando una
clase junto con el número.

⚠️ **No se agrega un observador ni un `setInterval`.** Y el pulso solo cuando el número
**sube**: al quitar algo del pedido, festejar está de más.

- [ ] **Paso 3: verificar en un navegador** — hover, agregar al pedido, abrir filtros y
      abrir el cajón, todo con y sin `prefers-reduced-motion`.

- [ ] **Paso 4: commit**

## Tarea 3: Transiciones de vista — la tarea riesgosa

**Archivos:** modificar `src/layouts/Base.astro`, `src/components/Header.astro`,
`src/components/WhatsappCotizar.astro`.

⚠️ **Astro 7 usa `<ClientRouter />` de `astro:transitions`**, no `<ViewTransitions />`
(se renombró en Astro 5). Si ves el nombre viejo en un ejemplo, está desactualizado.

- [ ] **Paso 1: el recableado PRIMERO, el router después**

Los dos scripts se enganchan una sola vez al cargar. Pasalos a `astro:page-load`, que
Astro dispara en la carga inicial **y** en cada navegación de cliente:

- `Header.astro`: el listener del menú móvil.
- `WhatsappCotizar.astro`: la llamada a `pintar()`.
- `Carrito.tsx`: **repintar la insignia** en `astro:page-load` (ver Review Focus 5). Es
  el tercero y el que no salta a la vista, porque el que se rompe es un `<span>` del
  `Header`, no la isla.

⚠️ **Este paso va antes de montar el router**, no después. Al revés, el sitio queda roto
entre un commit y el otro.

⚠️ `fetchInfo()` no debería repetir la petición en cada navegación: memoizá el resultado
en el módulo. Un sitio que le pega a la API en cada clic es peor que uno sin transiciones.

- [ ] **Paso 2: montar `<ClientRouter />`** en el `<head>` de `Base.astro`.

- [ ] **Paso 3: la verificación que define la tarea — en un navegador, navegando de
      cliente** (clic en un enlace, no recarga):

1. El menú móvil abre y cierra **después** de navegar.
2. El botón de WhatsApp tiene un `href` de `wa.me` **después** de navegar, nunca `#`.
3. Agregás algo al pedido, navegás, y **el carrito conserva lo que tenía**.
4. Con `prefers-reduced-motion: reduce` la transición no anima.

**Si alguno de los cuatro falla, la tarea no está hecha.** Pegá las cuatro mediciones en
el informe. Si no podés medirlos, decilo: **no los des por buenos**.

- [ ] **Paso 4: commit** (uno para el recableado, otro para el router)

## Tarea 4: Pulido — los `style="..."` sueltos

**Archivos:** los 8 con `style="..."` (28 en total): `pages/impresion-3d/index.astro` (8),
`pages/index.astro` (7), `pages/tienda/index.astro` (6), `components/inicio/Vias.astro` (2),
`components/CtaCotizar.astro` (2), `components/catalogo/ListadoCategoria.astro` (1),
`components/Footer.astro` (1), `components/Beneficios.astro` (1).

- [ ] **Paso 1: inventariar antes de tocar.** Listá los 28 con su archivo y su valor. Los
      que se repiten son los que piden una clase; los únicos pueden ir a una utilidad de
      Tailwind.

- [ ] **Paso 2: reemplazarlos.** Preferí una utilidad de Tailwind cuando alcanza; una
      clase en `global.css` solo cuando el valor se repite o no tiene utilidad.

⚠️ **Ningún cambio visual.** Esto es una refactorización: si algo se ve distinto después,
es un error, no una mejora.

- [ ] **Paso 3: verificar que no cambió nada.** Guardá el `dist/` de antes, reconstruí y
      **comparar el HTML de las páginas**. Las diferencias tienen que ser solo el cambio
      de `style="..."` por `class="..."`. Pegá el resultado en el informe.

- [ ] **Paso 4: `grep -ro 'style="' src | wc -l` → 0.** Si queda alguno, decí cuál y por
      qué no se pudo.

- [ ] **Paso 5: commit**

---

## Cierre

Al terminar: la tienda se mueve, nada depende de que el JS corra, quien pida menos
movimiento no ve ninguno, y no hay un solo `style="..."` suelto.

⚠️ **Nada se pushea.** El dueño decide cuándo se despliega.
