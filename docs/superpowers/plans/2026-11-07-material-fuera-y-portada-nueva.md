# El material fuera de la vista del cliente + la portada nueva — Plan de implementación

> **Para quien ejecute:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development
> para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** sacar el nombre del material de todo lo que ve un cliente, rehacer la
portada alrededor de categorías en vez de productos, y que una página de categoría se
lea como un lugar donde estás y no como un filtro encendido.

**Arquitectura:** todo el trabajo vive en `calc3d-landing`. **Cero cambios de API y cero
migraciones**: `material` ya viaja en la respuesta pública y se queda ahí; lo que cambia
es a dónde va dentro de la página. Cada regla que decide algo (qué dice la línea de una
tarjeta, qué productos entran en Destacados, si vale la pena dibujar los filtros) se
escribe como **función pura en `src/lib/` con su test**; el marcado se verifica
**construyendo y midiendo el HTML de `dist/`**, porque este repo no tiene jsdom.

**Stack:** Astro 7 (SSG) + islas React + Tailwind 4 (CSS-first) + shadcn. Tests: vitest
con `environment: 'node'`.

**Spec:** `docs/superpowers/specs/2026-11-07-rediseno-tienda-design.md` — cubre su
**fase 2** (limpieza del material, §6) y su **fase 3** (estructura de la portada, §5.1).
El movimiento (§7) y el pulido quedan para el plan siguiente.

---

## Restricciones globales

Valen para **todas** las tareas. Salen de los tres `CLAUDE.md` y del spec §8.

- **Español** en UI, errores y comentarios.
- **vitest corre con `environment: 'node'`**: sin jsdom, sin testing-library, y **sin el
  alias `@/` dentro de los specs** (usar rutas relativas). Un test que monte un componente
  de React no corre acá.
- **No convertir en isla lo que hoy es HTML estático.** El activo del sitio es que el
  contenido está en el HTML. Si una sección se puede escribir en `.astro`, va en `.astro`.
- **SEO**: una página por ruta, contenido en el HTML (no solo tras hidratar), JSON-LD
  `Product` en la ficha, sitemap.
- **No inventar confianza**: nada de contadores, reseñas, logos ni portafolio que no sean
  verdad. En particular, **el rótulo de la franja de portada NO puede decir «más
  vendidos»**: no hay dato de ventas. Es **«Destacados»** (spec §5.1).
- **El `summary` de un producto lo escribe el dueño en el panel.** Prohibido filtrar
  palabras automáticamente del texto de una persona (spec §6).
- **Tailwind-first** con los tokens de marca ya existentes. Nada de hex sueltos nuevos.
- **No tocar `.env` ni `.env.*`.**
- **No tocar las cuatro reglas del carrito** (el precio no se manda, el unitario va
  pre-tramo, el renglón denormaliza, nunca se pierde la venta).
- **No hacer `push`.** Un push a `main` **despliega**. Commit por tarea y nada más.
- Accesibilidad mínima: foco visible, `aria-label` donde el control no tiene texto.
- ⚠️ **`Footer.astro:29` NO se toca.** Dice «**Materializamos** tus ideas»: es un juego de
  palabras, no un material (spec §6). Quien haga `grep -i material` lo va a encontrar y va
  a querer limpiarlo. No es un hallazgo: es la única aparición que se queda.

## Fallos a vigilar (Review Focus)

Clases de entrada que el spec implica y que ninguna tarea ejercitaría sola. Cada una
tiene su test asignado a la tarea que es dueña del código.

1. **Un producto sin categoría** (`catLabel` vacío): la línea de la tarjeta tiene que
   quedar **vacía**, no un separador huérfano. → Tarea 2.
2. **Ningún producto con `badge`**: Destacados no puede quedar vacío; se completa por
   `position`. → Tarea 5.
3. **Más productos con `badge` que lugares en la franja**: se corta en el tope, sin
   repetir ni desbordar. → Tarea 5.
4. **Una categoría con exactamente el mínimo de productos**: el borde decide si los
   filtros se dibujan. Hay que fijarlo, o alguien lo invierte sin que falle nada.
   → Tarea 1.
5. **Sin banners cargados en el panel**: el hero usa su arte propio, no deja un hueco.
   → Tarea 6.

## Decisiones que tomé al escribir este plan

Van acá para que se puedan revisar y desandar.

1. **La línea de la tarjeta queda SOLO con la categoría**, contra el spec §6, que manda
   `[catLabel, días, mínimo]`. **Medido**: `TarjetaProducto.tsx` ya pinta
   «Listo en {ship}» y «Mínimo {minQty}» en su fila `product-meta`. Seguir el spec
   pondría los dos datos **dos veces en la misma tarjeta**. La intención del spec era que
   la línea dejara de decir el material; eso se cumple igual.
2. **`material` hay que AGREGARLO al JSON-LD, no conservarlo ahí.** El spec §6 dice que
   el campo se queda «porque se usa en el JSON-LD», y la decisión 8 de §4 lo da por
   hecho. **Medido**: el `jsonLd` de `src/pages/producto/[slug].astro:47-60` **no lo
   incluye**. Sin esta tarea, sacarlo de los hechos deja el campo muerto y la decisión sin
   cumplir.
3. **`materialKey` se borra.** Era el ayudante del filtro de material, que murió en el
   plan anterior. **Medido**: fuera de `lib/producto.ts` solo lo nombra
   `lib/ficha.spec.ts:19`, como relleno.
4. **Entra trabajo que el spec no tenía: el botón de volver y el mínimo de filtros**
   (Tarea 1). Lo pidió el dueño el 2026-11-07 mirando el sitio ya publicado. Se pone
   **primero** porque es el defecto que está vivo hoy.
5. **El «ver todas» que pidió el dueño NO se construye como una lista única.** Esa
   página existía y se eliminó: medía **4,4 MB** con mil productos y rompía el build con
   un 429. La salida es volver a `/tienda/`, que es el índice de categorías.
6. **Los banners pasan a traerse en el build, y eso cambia su comportamiento.** Hoy los
   pide el navegador desde el carrusel, así que un banner nuevo se ve al recargar; con un
   hero estático hay que traerlos en `cargarTienda()` y **un banner nuevo necesita un
   build**. Es coherente con el resto de la tienda (un producto tampoco aparece sin
   build), pero el dueño tiene que saberlo.
7. **«Las tres vías del servicio» hay que CREARLA.** El spec §5.1 la lista como si
   existiera y **no existe**: su mensaje vive hoy en los slides 2 y 3 del carrusel, que se
   muere en la Tarea 6. Sin esta sección, ese contenido desaparece del sitio.

---

## Estructura de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `src/lib/catalogo.ts` | `MINIMO_PARA_FILTRAR`, `valeLaPenaFiltrar()` | 1 |
| `src/components/catalogo/Catalogo.tsx` | deja de dibujar `Filtros` bajo el mínimo | 1 |
| `src/components/catalogo/ListadoCategoria.astro` | botón «← Todas las categorías» | 1 |
| `src/lib/producto.ts` | `lineaDeTarjeta()`; muere `materialKey` | 2 |
| `src/components/catalogo/TarjetaProducto.tsx` | usa `lineaDeTarjeta` | 2 |
| `src/lib/ficha.ts` | `hechosDeFicha()`, `jsonLdDeProducto()` | 3 |
| `src/components/ficha/Ficha.tsx` | usa `hechosDeFicha` | 3 |
| `src/pages/producto/[slug].astro` | usa `jsonLdDeProducto` | 3 |
| `src/pages/impresion-3d/index.astro` | títulos por uso, paso, `description`, h2 | 4 |
| `src/pages/index.astro` | `description` sin nombres; portada nueva | 4, 6 |
| `src/lib/portada.ts` **(nuevo)** | `destacadosDe()`, `categoriasDePortada()` | 5 |
| `src/components/inicio/Carrusel.tsx` | **se borra** | 6 |
| `src/components/inicio/Hero.astro` **(nuevo)** | hero fijo, con el banner como arte | 6 |
| `src/components/inicio/Vias.astro` **(nuevo)** | las tres vías del servicio | 6 |
| `src/lib/tienda-build.ts` | `cargarTienda()` trae además los banners | 6 |
| `src/components/Beneficios.astro` | pierde la tarjeta con la `N` literal | 6 |

---

## Tarea 1: Volver al catálogo, y filtros solo cuando sirven

Lo que el dueño reportó el 2026-11-07: en `/tienda/<categoria>/` el panel de filtros está
pegado al título, así que la categoría **se lee como un filtro encendido** y no hay forma
visible de apagarlo. Con un solo producto, además, filtrar por color y precio es ruido.

**Archivos:**
- Modificar: `src/lib/catalogo.ts`
- Modificar: `src/components/catalogo/Catalogo.tsx`
- Modificar: `src/components/catalogo/ListadoCategoria.astro`
- Test: `src/lib/catalogo.spec.ts`

**Interfaces:**
- Produce: `MINIMO_PARA_FILTRAR: number` y
  `valeLaPenaFiltrar(indice: EntradaIndice[]): boolean`, exportadas de `lib/catalogo.ts`.

- [ ] **Paso 1: escribir los tests que fallan** en `src/lib/catalogo.spec.ts`

```ts
describe('valeLaPenaFiltrar', () => {
  const n = (cuantos: number) =>
    Array.from({ length: cuantos }, (_, i) => ({ id: `p${i}` }) as EntradaIndice);

  it('con menos del mínimo no se dibujan los filtros', () => {
    expect(valeLaPenaFiltrar(n(MINIMO_PARA_FILTRAR - 1))).toBe(false);
  });

  it('con EXACTAMENTE el mínimo sí se dibujan', () => {
    expect(valeLaPenaFiltrar(n(MINIMO_PARA_FILTRAR))).toBe(true);
  });

  it('una categoría vacía no dibuja filtros', () => {
    expect(valeLaPenaFiltrar([])).toBe(false);
  });
});
```

- [ ] **Paso 2: correr y ver que fallan**

`npx vitest run src/lib/catalogo.spec.ts` → FAIL, `valeLaPenaFiltrar is not defined`.

- [ ] **Paso 3: implementar en `src/lib/catalogo.ts`**

`export const MINIMO_PARA_FILTRAR = 6;` con **su razón escrita al lado**, no un número
suelto: por debajo de una fila de tarjetas, el visitante ve el catálogo entero de la
categoría de un vistazo y filtrarlo no le ahorra nada; el panel solo agrega ruido y hace
leer la categoría como un filtro encendido. El borde es **inclusivo** (con 6 se dibujan).

`valeLaPenaFiltrar(indice)` devuelve `indice.length >= MINIMO_PARA_FILTRAR`.

- [ ] **Paso 4: correr y ver que pasan**

- [ ] **Paso 5: `Catalogo.tsx` deja de dibujar el panel bajo el mínimo**

Envolver el render de `<Filtros .../>` y el botón **«Filtros»** con
`valeLaPenaFiltrar(indice)`. El contador de productos **se queda siempre**.

⚠️ **Corregido el 2026-11-07, tras la revisión de la tarea.** Este paso decía antes que
«el ordenamiento se queda siempre», y eso era un defecto del plan: **el `Select` de
ordenar vive DENTRO de `Filtros.tsx`** (líneas 100-112), no en la barra. Esconder el panel
esconde también el orden.

**Ruling: se acepta.** Con cinco productos o menos, ordenarlos no le ahorra nada a nadie —
entran todos en una pantalla—, y sacar el `Select` a la barra es un cambio de maquetación
que pertenece a la fase de pulido, no a esta. **Lo que cuesta si me equivoco:** alguien
con exactamente 5 productos en una categoría no puede ordenarlos por precio. Es visible y
se desanda moviendo un control.

⚠️ También decía «las dos apariciones» de `<Filtros>` (escritorio y móvil). **Hay una
sola**: el panel de móvil es el mismo `<aside>` con la clase `open`.

⚠️ El cálculo va sobre `indice` (la categoría entera), **nunca sobre `productos`** (la
página de 24): si no, la página 2 de una categoría grande podría esconder los filtros.

- [ ] **Paso 6: el botón de volver, en `ListadoCategoria.astro`**

Dentro de `section.shop-head`, debajo del `h1`, un enlace visible a `/tienda/` con el
texto **«← Todas las categorías»**, con los estilos de botón secundario que ya usa el
proyecto. Es un `<a>` estático en el HTML, **no una isla**.

La miga de pan (`nav.crumbs`) **se queda**: es la que da la jerarquía a Google. El botón
es para la persona.

- [ ] **Paso 7: verificar por contenido**

```bash
PUBLIC_API_URL=http://localhost:3001/api npx astro build
grep -c "Todas las categor" dist/tienda/llaveros/index.html   # >= 1
grep -c "Precio máximo" dist/tienda/llaveros/index.html       # 0 con pocos productos
```

- [ ] **Paso 8: commit**

```bash
git add src/lib/catalogo.ts src/lib/catalogo.spec.ts src/components/catalogo/Catalogo.tsx src/components/catalogo/ListadoCategoria.astro
git commit -m "feat(tienda): volver al catalogo desde una categoria, y filtros solo cuando hay que filtrar"
```

---

## Tarea 2: La línea de la tarjeta dice la categoría y nada más

**Archivos:**
- Modificar: `src/lib/producto.ts`
- Modificar: `src/components/catalogo/TarjetaProducto.tsx`
- Test: `src/lib/producto.spec.ts`

**Interfaces:**
- Consume: `ProductoVitrina` de `lib/producto.ts`.
- Produce: `lineaDeTarjeta(p: ProductoVitrina): string`.
- ⚠️ **`material` NO se borra del tipo**: la Tarea 3 lo necesita para el JSON-LD.

- [ ] **Paso 1: escribir los tests que fallan** en `src/lib/producto.spec.ts`

```ts
describe('lineaDeTarjeta', () => {
  it('es la categoría, y el material no aparece', () => {
    const p = adapt({
      slug: 'a', name: 'A', priceUsd: 1, minQty: 1,
      material: 'PLA', category: { slug: 'llaveros', name: 'Llaveros' },
    });
    expect(lineaDeTarjeta(p)).toBe('Llaveros');
  });

  it('un producto sin categoría no deja un separador huérfano', () => {
    const p = adapt({ slug: 'b', name: 'B', priceUsd: 1, minQty: 1, material: 'PETG' });
    expect(lineaDeTarjeta(p)).toBe('');
  });
});

it('materialKey ya no existe', () => {
  const p = adapt({ slug: 'c', name: 'C', priceUsd: 1, minQty: 1, material: ' PLA ' });
  expect('materialKey' in p).toBe(false);
});
```

- [ ] **Paso 2: correr y ver que fallan**

- [ ] **Paso 3: implementar**

En `lib/producto.ts`: `lineaDeTarjeta(p)` devuelve `p.catLabel ?? ''`. Borrar el campo
`materialKey` del tipo `ProductoVitrina` y su asignación en `adapt`.

En `TarjetaProducto.tsx`, reemplazar la línea 28 por `const linea = lineaDeTarjeta(p);`.
**No tocar** `product-meta`: ahí ya viven los días y el mínimo (ver Decisión 1).

Ajustar `src/lib/ficha.spec.ts:19`, que pasa `materialKey: ''` como relleno.

- [ ] **Paso 4: correr toda la suite y ver que pasa**

- [ ] **Paso 5: verificar por contenido**

```bash
PUBLIC_API_URL=http://localhost:3001/api npx astro build
grep -o "product-line[^<]*<" dist/tienda/llaveros/index.html | head
# no debe aparecer " • PLA" ni ningún nombre de material
```

- [ ] **Paso 6: commit**

```bash
git add src/lib/producto.ts src/lib/producto.spec.ts src/lib/ficha.spec.ts src/components/catalogo/TarjetaProducto.tsx
git commit -m "feat(tienda): la linea de la tarjeta dice la categoria, no el material"
```

---

## Tarea 3: La ficha — fuera de los hechos, dentro del JSON-LD

El material deja de verse en pantalla y pasa a donde **solo lo lee Google** (spec §4,
decisión 8). Así la búsqueda del experto sigue encontrando la pieza.

**Archivos:**
- Modificar: `src/lib/ficha.ts`
- Modificar: `src/components/ficha/Ficha.tsx`
- Modificar: `src/pages/producto/[slug].astro`
- Test: `src/lib/ficha.spec.ts`

**Interfaces:**
- Produce: `hechosDeFicha(p: ProductoVitrina): string[]` y
  `jsonLdDeProducto(p, opciones: { descripcion: string; imagen?: string; url?: string }): Record<string, unknown>`.

- [ ] **Paso 1: escribir los tests que fallan** en `src/lib/ficha.spec.ts`

```ts
describe('hechosDeFicha', () => {
  it('no incluye el material', () => {
    const p = adapt({
      slug: 'a', name: 'A', priceUsd: 1, minQty: 2, material: 'PLA',
      leadTimeDays: 5, category: { slug: 'c', name: 'Llaveros' },
    });
    expect(hechosDeFicha(p)).toEqual(['Llaveros', 'Listo en 5 días', 'Mínimo 2']);
  });
});

describe('jsonLdDeProducto', () => {
  it('el material viaja al JSON-LD', () => {
    const p = adapt({ slug: 'a', name: 'A', priceUsd: 24, minQty: 1, material: 'PLA' });
    expect(jsonLdDeProducto(p, { descripcion: 'd' }).material).toBe('PLA');
  });

  it('sin material, la clave NO se emite vacía', () => {
    const p = adapt({ slug: 'b', name: 'B', priceUsd: 24, minQty: 1 });
    expect('material' in jsonLdDeProducto(p, { descripcion: 'd' })).toBe(false);
  });
});
```

- [ ] **Paso 2: correr y ver que fallan**

- [ ] **Paso 3: implementar**

`hechosDeFicha` sale tal cual de `Ficha.tsx:114-119`, **sin** la entrada `p.material`.

`jsonLdDeProducto` sale tal cual del objeto `jsonLd` de `producto/[slug].astro:47-60`, más
`...(p.material ? { material: p.material } : {})`. ⚠️ Condicional, no
`material: p.material ?? null`: una clave vacía en datos estructurados es peor que su
ausencia.

`Ficha.tsx` y `producto/[slug].astro` pasan a llamar a las dos funciones. El `.astro` sigue
calculando `descripcion`, `canonical` e `imagen` donde están y se los pasa.

- [ ] **Paso 4: correr y ver que pasan**

- [ ] **Paso 5: verificar por contenido**

```bash
PUBLIC_API_URL=http://localhost:3001/api npx astro build
grep -o '"material":"[^"]*"' dist/producto/*/index.html | head   # aparece
grep -c "PLA" dist/producto/llaveros-de-copa-del-mundial/index.html
# lo que quede tiene que ser el JSON-LD o el summary del dueño, NUNCA los hechos
```

- [ ] **Paso 6: commit**

```bash
git add src/lib/ficha.ts src/lib/ficha.spec.ts src/components/ficha/Ficha.tsx "src/pages/producto/[slug].astro"
git commit -m "feat(tienda): el material sale de la ficha y entra al JSON-LD"
```

---

## Tarea 4: `/impresion-3d` habla de usos, no de siglas

Mecánica y toda de texto. **Una sola tarea**: son cinco ediciones del mismo archivo más
una línea de `index.astro`, y partirlas no le da a nadie una superficie de revisión
distinta.

**Archivos:**
- Modificar: `src/pages/impresion-3d/index.astro`
- Modificar: `src/pages/index.astro` (solo la línea 76, `description`)

- [ ] **Paso 1: retitular las cuatro tarjetas** (`impresion-3d/index.astro:16-32`)

El `nombre` cambia; **el `texto` del cuerpo no se toca** (spec §6):

| Antes | Después |
|---|---|
| PLA | **Decoración y detalle fino** |
| PETG | **Uso diario e intemperie** |
| ABS | **Golpes y repuestos** |
| TPU | **Flexible, tipo goma** |

Renombrar la constante `materiales` a `usos` y actualizar el `.map` de la línea 111.
Actualizar también el comentario de cabecera (líneas 7-8), que habla de «materiales».

- [ ] **Paso 2: el paso del proceso** (línea 41)

«Material, color, acabado y cantidad…» → **«Color, acabado y cantidad. Acá se decide todo
lo que cambia el precio.»**

- [ ] **Paso 3: el título de la sección** (línea 104)

«Materiales» → **«Según para qué sea la pieza»**. El párrafo de abajo (línea 106) dice
«Cada material sirve para algo distinto…»: reescribirlo sin la palabra, conservando la
invitación a contar para qué es la pieza.

- [ ] **Paso 4: las dos `description`**

`impresion-3d/index.astro:74` y `index.astro:76` nombran los cuatro materiales.
Reescribirlas sin ningún nombre, conservando lugar (Venezuela), qué se hace (piezas por
encargo, desde una unidad) y la acción (cotizar por WhatsApp).

- [ ] **Paso 5: los pasos del proceso dejan de estar duplicados** (spec §5.1, fila 7)

`impresion-3d/index.astro` tiene su propia sección **«Cómo es el proceso»** (línea 128)
con su propio arreglo `pasos` (línea 34), **con textos distintos** a los de «Cómo
trabajamos» de la portada. Son los mismos cinco pasos contados dos veces, y van a
divergir más.

Borrar de `impresion-3d` la sección, su arreglo `pasos` y el `import` de `Pasos.astro`, y
dejar en su lugar **un enlace a `/#como-trabajamos`**. La portada es la única dueña.

⚠️ Eso obliga a que la sección de la portada lleve `id="como-trabajamos"`. Si la Tarea 6
todavía no corrió, el enlace apunta a un ancla que no existe: **ponerle el `id` a
`index.astro` en esta misma tarea** (es una línea y no choca con la Tarea 6).

- [ ] **Paso 6: verificar por contenido** — este es el paso que prueba la tarea

```bash
PUBLIC_API_URL=http://localhost:3001/api npx astro build
grep -cE "PLA|PETG|ABS|TPU" dist/impresion-3d/index.html   # 0
grep -c "Decoración y detalle fino" dist/impresion-3d/index.html   # 1
grep -c "Cómo es el proceso" dist/impresion-3d/index.html  # 0
grep -c 'id="como-trabajamos"' dist/index.html             # 1
grep -o '<meta name="description"[^>]*>' dist/index.html dist/impresion-3d/index.html
```

⚠️ El `grep -E "ABS"` tiene que ser **sensible a mayúsculas**: `absolute` de Tailwind
contiene `abs` y con `-i` el chequeo da siempre positivo y no prueba nada.

- [ ] **Paso 7: commit**

```bash
git add src/pages/impresion-3d/index.astro src/pages/index.astro
git commit -m "feat(tienda): impresion-3d habla de usos, y los pasos del proceso viven en un solo lugar"
```

---

## Tarea 5: Qué entra en la portada (funciones puras)

La portada deja de mostrar productos sueltos y pasa a mostrar **puertas**. Las dos reglas
que deciden qué se ve van en una función cada una, **antes** de tocar el marcado, para que
la Tarea 6 sea solo maquetar.

**Archivos:**
- Crear: `src/lib/portada.ts`
- Test: `src/lib/portada.spec.ts`

**Interfaces:**
- Consume: `Listado` de `lib/paginacion.ts`; `ProductoVitrina` de `lib/producto.ts`.
- Produce:
  - `destacadosDe(productos: ProductoVitrina[], tope: number): ProductoVitrina[]`
  - `categoriasDePortada(listados: Listado[]): { cat: string; nombre: string; n: number }[]`
  - `TOPE_DESTACADOS: number`

- [ ] **Paso 1: escribir los tests que fallan** en `src/lib/portada.spec.ts`

`con(id)` / `sin(id)` son ayudantes locales del spec: devuelven un `ProductoVitrina`
mínimo **con** y **sin** `badge`. `raiz(slug, n)` / `hija(slug, n)` / `huerfanos()`
devuelven un `Listado` con `sub: null`, con `sub` y con `sinCategoria: true`.

```ts
describe('destacadosDe', () => {
  it('entran primero los que tienen badge, en el orden recibido', () => {
    const r = destacadosDe([sin('a'), con('b'), sin('c'), con('d')], 4);
    expect(r.map((p) => p.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('sin ningún badge, se completa igual y no queda vacío', () => {
    expect(destacadosDe([sin('a'), sin('b')], 4).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('con más badges que lugares, corta en el tope y no repite', () => {
    const r = destacadosDe([con('a'), con('b'), con('c'), con('d'), con('e')], 4);
    expect(r.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sin productos devuelve vacío', () => {
    expect(destacadosDe([], 4)).toEqual([]);
  });
});

describe('categoriasDePortada', () => {
  it('solo raíces, con su conteo, y "Sin categoría" afuera', () => {
    const r = categoriasDePortada([raiz('llaveros', 2), hija('autos', 1), huerfanos()]);
    expect(r).toEqual([{ cat: 'llaveros', nombre: 'Llaveros', n: 2 }]);
  });
});
```

- [ ] **Paso 2: correr y ver que fallan**

- [ ] **Paso 3: implementar `src/lib/portada.ts`**

`TOPE_DESTACADOS = 4`.

`destacadosDe`: parte los productos en los que tienen `badge` y los que no, **conservando
el orden de entrada en cada mitad** (que ya viene por `position` desde la API), concatena
y corta en `tope`. ⚠️ **Sin `sort`**: un orden estable no necesita reordenarse, y un
`sort` por `position` sobre datos ya ordenados invita a que alguien cambie el criterio sin
notar que rompe el empate.

`categoriasDePortada`: filtra `l.sub === null && !l.sinCategoria` y devuelve
`{cat, nombre, n: l.productos.length}`. ⚠️ **Sin tope**: con mil productos las categorías
son la navegación, no un adorno; recortarlas escondería parte del catálogo. El que existía
(`MAX_BLOQUES = 6`) era una mitigación contra las islas de React y muere con la Tarea 6,
porque una tarjeta de categoría es HTML estático.

- [ ] **Paso 4: correr y ver que pasan**

- [ ] **Paso 5: commit**

```bash
git add src/lib/portada.ts src/lib/portada.spec.ts
git commit -m "feat(tienda): las dos reglas que deciden que muestra la portada"
```

---

## Tarea 6: La portada se rehace

Muere el carrusel y nace un hero fijo. La portada pasa a mostrar **categorías** y una sola
franja de **Destacados**, en vez de repetir cuatro tarjetas por cada categoría.

**Archivos:**
- Crear: `src/components/inicio/Hero.astro`
- Crear: `src/components/inicio/Vias.astro`
- Borrar: `src/components/inicio/Carrusel.tsx`
- Modificar: `src/lib/tienda-build.ts`
- Modificar: `src/pages/index.astro`
- Modificar: `src/components/Beneficios.astro`

**Interfaces:**
- Consume: `destacadosDe`, `categoriasDePortada`, `TOPE_DESTACADOS` de `lib/portada.ts`
  (Tarea 5); `fetchBanners` de `lib/api.ts`; `enlaceBanner` de `lib/banner.ts`.
- Produce: `cargarTienda()` devuelve además `banners: Banner[]`.

- [ ] **Paso 1: los banners pasan a traerse en el BUILD**

⚠️ **Hoy los trae el navegador**: `Carrusel.tsx` llama a `fetchBanners()` dentro de un
`useEffect`. Un hero estático no puede hacer eso, así que **`cargarTienda()` tiene que
traerlos** y pasarlos por props, como ya hace con productos, info y listados. Es **una
petición más por build** (de 6 a 7), memoizada igual que el resto.

⚠️ **Consecuencia real y aceptada: un banner cargado en el panel ya no aparece solo.**
Hasta hoy se veía al recargar la página; ahora necesita un build. Es coherente con el
resto de la tienda —un producto nuevo tampoco aparece sin build— pero **es un cambio de
comportamiento, no un detalle**: anotarlo en el informe para que el dueño lo sepa.

⚠️ Si `fetchBanners()` falla, el build **no puede morir**: se sigue con `[]` y el hero usa
su arte propio. Un banner es decoración; el catálogo no.

- [ ] **Paso 2: `Hero.astro`**

Un `h1` fijo en el HTML, un subtítulo, dos acciones («Ver el catálogo» → `/tienda/` y
cotizar por WhatsApp), y el arte. **No es una isla.**

El `h1` y el subtítulo salen del **slide 1** de `Carrusel.tsx` («De la idea a la pieza. La
imprimimos por vos.»), pero el subtítulo se reescribe **sin nombrar materiales**
(reemplaza a `Carrusel.tsx:27`).

⚠️ **Un banner del panel reemplaza el ARTE, no los textos** (spec §4, decisión 6): se usa
el primero por `position`; el `h1` y el subtítulo quedan fijos en el HTML. **Sin banners
cargados, el hero usa su arte propio** — nunca un hueco (Review Focus 5). Los títulos que
el dueño escriba en un banner **dejan de verse**: es la consecuencia aceptada.

- [ ] **Paso 3: `Vias.astro` — las tres vías del servicio** (spec §5.1, fila 6)

⚠️ **Esta sección NO existe: hay que crearla.** Hoy su mensaje vive repartido en los
slides 2 y 3 del carrusel («¿No está en el catálogo? Lo fabricamos», «Taller propio») y se
va con él. El spec la quiere en la portada, pero **deja de ser el centro**: es la salida
para lo que el catálogo no cubre.

Tres entradas, HTML estático: **traé tu archivo** (STL, 3MF o STEP) / **mandá una foto o
las medidas** / **lo diseñamos desde cero**. El texto de apoyo sale de
`impresion-3d/index.astro:37`, que ya las describe. Cierra con un enlace a
`/impresion-3d/`.

- [ ] **Paso 4: reordenar `index.astro`** según spec §5.1

1. Hero (con el buscador adentro) — 2. Categorías — 3. Destacados — 4. Flash Sale
— 5. Las tres vías del servicio — 6. Cómo trabajamos — 7. FAQ — 8. CTA + pie.

- Borrar el bloque `bloques` entero (líneas 30-34 y su `.map`) y la constante `MAX_BLOQUES`.
- `destacados` pasa a ser `destacadosDe(productos, TOPE_DESTACADOS)`.
- El rótulo de la franja es **«Destacados»**, nunca «Nuestros más vendidos».
- La sección de categorías sale de `categoriasDePortada(listados)` y es **HTML estático**,
  una tarjeta por categoría con su nombre y su conteo, enlazando a `rutaDeCategoria(cat)`.
- Borrar el `import` de `Carrusel` y el archivo.
- La sección «Cómo trabajamos» lleva `id="como-trabajamos"` (si la Tarea 4 ya se lo puso,
  no tocarlo).

- [ ] **Paso 5: `Beneficios.astro` pierde la tarjeta de la `N`** (spec §5.1)

Sacar del arreglo `beneficios` de `index.astro:36-41` la entrada **«Listo en N días»**: la
`N` se publica literal y el dato real ya vive en la primera pregunta del FAQ y en cada
ficha. Si `Beneficios.astro` asume cuatro, ajustarlo a tres.

- [ ] **Paso 6: verificar por contenido y por PESO**

⚠️ **`grep -c` NO SIRVE ACÁ, y este comando estaba mal.** `-c` cuenta **líneas que
coinciden**, y `dist/index.html` es **una sola línea**: devuelve `1` para todo, islas
incluidas. Alguien lee «1» y cree que queda una isla cuando quedan veintisiete. Hay que
contar ocurrencias con `grep -o … | wc -l`.

```bash
PUBLIC_API_URL=http://localhost:3001/api npx astro build
wc -c dist/index.html                                          # peso
grep -o "astro-island" dist/index.html | wc -l                 # islas
grep -o "más vendidos" dist/index.html | wc -l                 # 0
grep -oE "PLA|PETG|ABS|TPU" dist/index.html | wc -l            # ver la nota de abajo
grep -o "Listo en N días" dist/index.html | wc -l              # 0
grep -o "Traé tu archivo" dist/index.html | wc -l              # 1
```

⚠️ **El de los materiales NO puede dar 0, y eso está bien.** Lo que tiene que
desaparecer es el texto que escribe **el sitio**. Lo que queda son dos cosas ajenas a
esta tarea:

1. El campo `material` serializado en los props de las tarjetas de Destacados.
   `ProductoVitrina` lo conserva a propósito para el JSON-LD de la ficha. **Este no se
   lee en pantalla**: viaja en un atributo.
2. El `summary` que escribió el dueño. **Este SÍ SE LEE EN PANTALLA**, y en tres
   lugares: `<p class="product-desc">` en la portada y en el catálogo, y
   `<p class="lead pdp-lead">` en la ficha.

⚠️ **Corregido el 2026-11-07, tras la revisión de la rama. La versión anterior de este
párrafo decía «ninguno se lee en pantalla» y era FALSO** sobre el punto 2. Es
exactamente la clase de afirmación que hace que alguien dé por cerrado algo que sigue
abierto.

⚠️ **El número de islas tiene que BAJAR, no subir.** La portada medida antes del plan
anterior tenía 127 islas y 616 KB; la mitigación la dejó en 27 y 133 KB. Una sección de
categorías o unas vías escritas como isla desharían eso. Anotar las dos cifras en el
informe.

- [ ] **Paso 7: medir con el catálogo sintético**

Sembrar los mil productos (`SEED_CATALOGO_SINTETICO=1 pnpm seed` en `calc3d-api`, que solo
corre contra una base local) y repetir el build. La portada ahora lista **todas** las
categorías raíz sin tope: con 8 raíces y 23 subcategorías eso son 8 tarjetas estáticas,
pero hay que verlo, no suponerlo. Anotar peso e islas con mil productos.

Dejar la base como estaba (`SEED_CATALOGO_SINTETICO=borrar pnpm seed`).

- [ ] **Paso 8: correr toda la suite**

`npx vitest run` y `npx astro check` → los dos en verde, 0 errores.

- [ ] **Paso 9: commit**

```bash
git add -A src/pages/index.astro src/components/inicio src/components/Beneficios.astro src/lib/tienda-build.ts
git commit -m "feat(tienda): portada con hero fijo, categorias, vias del servicio y destacados"
```

---

## Cierre

Con las seis tareas en verde, el dueño tiene que poder:

- entrar a una categoría y **salir de ella** con un botón visible;
- no ver un panel de filtros en una categoría que no tiene qué filtrar;
- que ningún texto escrito por **el sitio** nombre un material;
- y que Google siga viendo el material, en el JSON-LD de cada ficha.

⚠️ **LO QUE ESTE PLAN NO PUEDE LOGRAR SOLO, y hay que decirlo sin maquillarlo.**
Recorrer la tienda «sin leer la palabra PLA» **no se cumple al terminar estas seis
tareas**, y no es un defecto de la implementación: el `summary` del producto lo escribe
el dueño y hoy dice *«Impreso en PLA, listo en 5 días»*. Ese texto se pinta en la
tarjeta de la portada, en la del catálogo y en el encabezado de la ficha.

El código **no lo va a filtrar**: hacerlo sería editar en silencio lo que escribió una
persona, que es justo lo que la restricción global prohíbe. **Falta una edición del
dueño en el panel**, y con 500-1000 productos por delante es una **convención de
redacción**, no un arreglo de una línea. Lo mismo vale para dos cosas más que son dato
suyo y se ven:

- una **especificación** cuyo `label` diga «Material»;
- una **insignia** que diga «Más vendido» — que además, con `destacadosDe`, queda
  **garantizada** en la franja más visible del sitio, y choca con el anti-objetivo de no
  inventar confianza sin dato de ventas.

⚠️ **Queda fuera, para el plan siguiente:** el movimiento (§7) y el pulido (§5).
⚠️ **Nada se pushea.** El dueño decide cuándo se despliega.
