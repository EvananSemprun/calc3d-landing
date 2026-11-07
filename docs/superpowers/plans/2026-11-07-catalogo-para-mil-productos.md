# El catálogo para mil productos — Plan de implementación (fases 0b y 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la tienda pública se construya y se navegue bien con 500–1.000 productos: páginas por categoría, paginadas, con buscador, y un build que no reviente contra el rate limiter.

**Architecture:** El build deja de pedir una ficha por producto — el listado público gana un modo completo, porque **ya consulta a la base todo lo que le falta y lo descarta**. El catálogo deja de ser una página con todo adentro: pasa a páginas estáticas por categoría y subcategoría, paginadas con el `paginate()` nativo de Astro. Los filtros siguen operando sobre la **categoría entera** mediante un índice liviano, no sobre los 24 de la página. Toda la lógica nueva vive como **funciones puras en `src/lib`**, porque el runner de la tienda es `environment: 'node'` y no puede montar componentes React.

**Tech Stack:** NestJS + Prisma (`calc3d-api`) · Astro 7 + islas de React 19 + Tailwind 4 (`calc3d-landing`) · jest en la API · vitest `node` en la tienda.

**Spec:** `calc3d-landing/docs/superpowers/specs/2026-11-07-rediseno-tienda-design.md` — §3 (lo medido), §5.2 (el catálogo), §9 (cómo se comprueba), §11 (orden).

---

## Global Constraints

- **El build NO puede pedir una ficha por producto.** El límite público es **120 peticiones / 60 s por IP**, compartido entre las 6 rutas, contador en memoria (`store-public.module.ts:18` + `ProxyThrottlerGuard`). El build sale todo desde una IP.
- **La API pública arma la respuesta CAMPO POR CAMPO** (lista blanca). El spec de `store-public` barre toda la respuesta con `clavesDe` contra `PROHIBIDOS = ['costAtPublish','productId','quoteId','organizationId','id','key','position']`. ⚠️ **Pasar filas de Prisma sin proyectar tumba esos tests**, que es justo lo que tienen que hacer.
- **SEO, lo que no se puede regresar**: una página HTML por ruta y por producto, con contenido **en el HTML** (no solo tras hidratar), `<title>`, `description`, canónica, OG, JSON-LD `Product` en las fichas, y sitemap.
- **Si la API falla en el build, el build FALLA**, sin `try/catch`. Publicar un catálogo vacío en silencio es peor que no publicar.
- **Las dos reglas de la URL compartible** (`Catalogo.tsx:7-11`), que ya costaron bugs: (1) no sincronizar antes de haber restaurado; (2) sincronizar **también** cuando no hay resultados.
- **El runner de la tienda es `environment: 'node'`**, sin jsdom, sin testing-library, sin alias `@/`. **Toda la lógica nueva va en `src/lib` como funciones puras con tests**; las islas son una capa fina encima.
- **Tailwind 4 CSS-first**, sin `tailwind.config`. **Botones e insignias: shadcn.** **Imágenes sin `sharp`.** Oscuro siempre.
- **El carrito no se toca**: sus cuatro reglas (el precio no se manda, el unitario va pre-tramo, el renglón denormaliza, nunca se pierde la venta) están fuera de alcance.
- `packages/shared` **no participa**: la tienda no lo consume.
- Mensajes, comentarios y tests **en español**.
- **Un push a `main` es un despliegue.** Commit por tarea, sin push.

---

## Review Focus

Cinco cosas que el spec implica y que ninguna tarea testearía sola. Cada una tiene su test asignado.

1. **El build con 1.000 productos tiene que terminar sin rebotar.** Es el objetivo entero y hoy no hay forma de comprobarlo: producción tiene 1 producto. → Tareas 2 y 3.
2. **Un filtro que devuelve resultados de otra página.** Si la isla recibe solo sus 24 productos, filtrar «rojo» en la página 3 devuelve los rojos de esos 24, y el tope del slider cambia de página en página. → Tarea 4.
3. **Una categoría madre cuya página no muestra los productos de sus hijas.** El `where` público ya lo resuelve, pero la página tiene que pedirlo bien. → Tarea 6.
4. **Un enlace viejo `/tienda/?cat=…` que queda muerto.** Hay 4 generadores y 3 tests que fijan ese formato. → Tarea 9.
5. **La lista blanca rota al engordar el listado.** Las opciones de Prisma traen `id`, `groupId` y `position`. → Tarea 1.

---

## Estructura de archivos

**`calc3d-api`**
- Modificar: `apps/api/src/store-public/store-public.service.ts` (serializadores y `list`)
- Modificar: `apps/api/src/store-public/store-public.module.ts` (el query param)
- Modificar: `apps/api/src/store-public/store-public.service.spec.ts`
- Crear: `apps/api/prisma/seed-catalogo-sintetico.ts`
- Modificar: `apps/api/prisma/seed.ts` (la bandera)

**`calc3d-landing`**
- Crear: `src/lib/paginacion.ts` + `src/lib/paginacion.spec.ts`
- Crear: `src/lib/indice-busqueda.ts` + `src/lib/indice-busqueda.spec.ts`
- Modificar: `src/lib/catalogo.ts` + `src/lib/catalogo.spec.ts` (fuera `cat` y `mat`)
- Modificar: `src/lib/api.ts` (el modo completo)
- Modificar: `src/lib/banner.ts` + `src/lib/banner.spec.ts` (el enlace de categoría)
- Crear: `src/pages/tienda/[categoria]/index.astro`, `.../pagina/[page].astro`, `.../[subcategoria]/index.astro`, `.../[subcategoria]/pagina/[page].astro`
- Modificar: `src/pages/tienda/index.astro` (pasa a índice de categorías)
- Modificar: `src/pages/producto/[slug].astro` (muere el N+1)
- Modificar: `src/components/catalogo/Catalogo.tsx`, `Filtros.tsx`
- Crear: `src/components/catalogo/Buscador.tsx`, `src/components/catalogo/Paginacion.astro`
- Modificar: `src/components/Footer.astro`, `src/pages/index.astro`

---

### Task 1: El listado público gana modo completo, y los serializadores se unifican

**Files:**
- Modify: `apps/api/src/store-public/store-public.service.ts:215-236` (`list`), `:276-328` (`bySlug`), `:330-392` (serializadores)
- Modify: `apps/api/src/store-public/store-public.module.ts:46-50`
- Modify: `apps/api/src/store-public/store-public.service.spec.ts`

**Interfaces:**
- Produces: `GET /api/public/store/products?detail=full` → `{ products: PublicProductDetail[] }`. Sin el parámetro, la respuesta **no cambia** (`PublicProductCard[]`).
- Produces: un serializador único `detail(p)` que `listCard` y `bySlug` reusan.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
it('con detail=full cada producto trae description, specs, images y optionGroups');
it('⚠️ con detail=full NO se filtra nada interno: ni id, ni groupId, ni position, ni costAtPublish'); // Review Focus 5
it('sin el parámetro la respuesta sigue siendo la tarjeta de siempre (ni description ni optionGroups)');
it('detail=full respeta el filtro por categoría, incluidas las hijas');
it('la foto de la tarjeta sale de la galería base, no de una opción'); // la inconsistencia preexistente
```
El de lista blanca reusa `PROHIBIDOS` y `clavesDe` que ya están en ese spec (líneas ~121-135).

- [ ] **Step 2: Correr y verificar que fallan**

Run: `cd calc3d-api && pnpm --filter @calc3d/api test -- store-public`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Extraer `private detail(p): Omit<PublicProductDetail,'image'>` con la proyección que hoy está **inline en `bySlug`** (líneas 297-323), y hacer que `bySlug` la use. ⚠️ `requiresOptions` y `colors` están **duplicados** entre `listCard` y `bySlug`: unificarlos ahí mismo.

En `list(categorySlug?, detalle?)`: cuando se pide el modo completo, el `include` sube `images` de `take: 1` a la galería entera y suma `include: { images: … }` dentro de `options`. ⚠️ **En los dos modos**, `images` filtra `where: { optionId: null }` para la foto de la tarjeta — hoy el listado no lo hace y la ficha sí, así que la tarjeta puede estar mostrando la foto de un color.

⚠️ **No agregues consultas**: los `optionGroups` con sus `priceDeltaUsd` **ya vienen** del `include` actual y se descartan. El comentario de las líneas 229-230 dice "Solo el grupo de COLOR" y es **falso** — corregilo.

En el controller: `@Query('detail') detail?: string`, tratando `'full'` como el único valor que activa el modo.

- [ ] **Step 4: Correr y verificar que pasan**

Run: `cd calc3d-api && pnpm --filter @calc3d/api test`
Expected: PASS, y los 901 anteriores siguen verdes.

- [ ] **Step 5: Validar por mutación**

Pasar las `options` de Prisma sin proyectar. La mutación **tiene que compilar**. Expected: el test de lista blanca en rojo. Restaurar con **copia `cp`**, nunca con `git checkout --`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/store-public
git commit -m "feat(api): el listado publico tiene modo completo y un solo serializador"
```

---

### Task 2: El catálogo sintético

**Files:**
- Create: `apps/api/prisma/seed-catalogo-sintetico.ts`
- Modify: `apps/api/prisma/seed.ts:138-142`

**Interfaces:**
- Produces: `export async function seedCatalogoSintetico(organizationId: string): Promise<void>`, detrás de la bandera `SEED_CATALOGO_SINTETICO` (`'1'` o `'true'`, igual que `SEED_DEMO`).

- [ ] **Step 1: Implementar la siembra**

~1.000 `StoreProduct` repartidos en un árbol real de categorías (6 madres con 3–5 hijas cada una), **todos con `visible: true`** (⚠️ el default es `false` y sin eso no salen por la API pública). Variados: con y sin foto, precios de $2 a $60, `leadTimeDays` de 2 a 8, `minQty` 1/2/10, algunos con `priceTiers`, algunos con un grupo «Color» con `swatchHex` y otros sin opciones.

⚠️ **Usar `createMany({ skipDuplicates: true })`**, apoyándose en `@@unique([organizationId, slug])`. El seed de hoy hace `findFirst` + `create` uno por uno; con 1.000 eso serían 2.000 viajes. Es un patrón nuevo en este archivo: decilo en el reporte.

⚠️ **Los datos sintéticos NO se versionan.** El script sí.

- [ ] **Step 2: Engancharla en `main()`**

Con el mismo doble chequeo que `SEED_DEMO`, sin tocar el camino existente.

- [ ] **Step 3: Correr contra la base LOCAL y verificar**

Run: `cd calc3d-api && SEED_CATALOGO_SINTETICO=1 pnpm --filter @calc3d/api seed`
Expected: informa cuántos creó; una segunda corrida informa que ya están (idempotente).
⚠️ **Nunca contra producción.**

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(api): siembra de catalogo sintetico para medir con mil productos"
```

---

### Task 3: La medición

**Files:** ninguno de código. Produce números.

- [ ] **Step 1: Medir el build contra los mil productos**

Con la API local arriba y la base sembrada, desde `calc3d-landing`:
`PUBLIC_API_URL=http://localhost:3001/api pnpm build`

Anotar: **duración del build**, **cantidad de archivos del `dist`**, **peso de `/tienda/index.html`** y el de una ficha, y **cuántas peticiones recibió la API** (contar en sus logs).

- [ ] **Step 2: Dejar la línea de base en el reporte**

Son los números de **ANTES** del rediseño: es contra ellos que se mide la mejora. Si el build falla acá, **eso es el resultado esperado** (es el bloqueo que las tareas siguientes arreglan): anotalo y seguí.

---

### Task 4: Las funciones puras de paginado e índice

**Files:**
- Create: `src/lib/paginacion.ts`, `src/lib/paginacion.spec.ts`
- Modify: `src/lib/catalogo.ts`, `src/lib/catalogo.spec.ts`

**Interfaces:**
- Consumes: `ProductoVitrina`, `Categoria` de `src/lib`.
- Produces:
  ```ts
  export const POR_PAGINA = 24;
  export interface EntradaIndice { id: string; name: string; price: number; colors: string[]; image: FotoApi | null }
  export function indiceDeCategoria(productos: readonly ProductoVitrina[]): EntradaIndice[]
  export function rutaDeCategoria(cat: string, sub?: string | null): string
  export function rutaDePagina(cat: string, sub: string | null, n: number): string
  ```
- Produces, en `catalogo.ts`: `Filtros` **pierde `cat` y `materials`**; `filtrar`, `filtrosDesdeUrl`, `sincronizarUrl`, `filtrosIniciales`, `hayFiltros` se ajustan; `materialesDe` **se borra**.

- [ ] **Step 1: Escribir los tests que fallan**

En `paginacion.spec.ts`:
```ts
it('el índice de categoría trae solo lo que los controles necesitan, y nada más'); // Review Focus 2
it('rutaDeCategoria arma /tienda/<cat>/ y /tienda/<cat>/<sub>/');
it('rutaDePagina pone el segmento `pagina` en el medio, para no chocar con una subcategoría');
it('la página 1 es la ruta sin `pagina`, no /pagina/1/');
```
En `catalogo.spec.ts`, **ajustar los que van a romper** (ya identificados: los que esperan `cat` y `mat` en la URL restaurada, y los `describe('filtrar')` de categoría y material) y agregar:
```ts
it('ya no existe el filtro de categoría: la categoría es la ruta');
it('ya no existe el filtro de material');
it('el tope del precio y los colores salen del índice de la CATEGORÍA, no de la página'); // Review Focus 2
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `cd calc3d-landing && pnpm test`
Expected: FAIL.

- [ ] **Step 3: Implementar**

⚠️ `EntradaIndice` es lo **mínimo** que los controles necesitan (~100–120 bytes por producto; ~24 KB para una categoría de 200). Meterle `summary` o `priceTiers` reintroduce el problema que esto vino a resolver.

⚠️ `rutaDePagina` pone `pagina/` **en el medio** (`/tienda/llaveros/pagina/2/`): con `/tienda/llaveros/2/` el segmento queda ocupado por el número y choca con una subcategoría.

- [ ] **Step 4: Correr y verificar que pasan**

Run: `cd calc3d-landing && pnpm test`
Expected: PASS.

- [ ] **Step 5: Validar por mutación**

Agregar `summary` a `EntradaIndice`. La mutación tiene que compilar. Expected: el test del índice mínimo en rojo. Restaurar con copia.

- [ ] **Step 6: Commit**

```bash
git add src/lib
git commit -m "feat(tienda): paginado, indice de categoria, y los filtros sin categoria ni material"
```

---

### Task 5: El build deja de pedir una ficha por producto

**Files:**
- Modify: `src/lib/api.ts:34`
- Modify: `src/pages/producto/[slug].astro:14-27`

**Interfaces:**
- Consumes: `?detail=full` de la Tarea 1.
- Produces: `export async function fetchProductosCompletos(): Promise<ProductoVitrina[]>`.

- [ ] **Step 1: Implementar**

`fetchProductosCompletos()` pega a `/public/store/products?detail=full` y mapea con `adapt`.

En `getStaticPaths`: **borrar** el `await Promise.all(lista.map((p) => fetchProducto(p.id)))` y usar la lista completa. `fetchProducto` se queda en `api.ts` (puede servir después), pero el build no la llama.

- [ ] **Step 2: Verificar que la ficha sigue completa**

Con la API local y la base sembrada: `PUBLIC_API_URL=http://localhost:3001/api pnpm build`, y comprobar **en el HTML generado** de una ficha que siguen estando la descripción, la ficha técnica, la galería y las opciones con sus recargos.

- [ ] **Step 3: Medir contra la línea de base de la Tarea 3**

Duración del build y **cantidad de peticiones a la API**. Es el número que justifica toda la tarea: tiene que pasar de ~1.000 a un puñado.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api.ts src/pages/producto
git commit -m "fix(tienda): el build trae las fichas en una sola peticion"
```

---

### Task 6: Las páginas por categoría y subcategoría, paginadas

**Files:**
- Create: `src/pages/tienda/[categoria]/index.astro`, `src/pages/tienda/[categoria]/pagina/[page].astro`, `src/pages/tienda/[categoria]/[subcategoria]/index.astro`, `src/pages/tienda/[categoria]/[subcategoria]/pagina/[page].astro`
- Create: `src/components/catalogo/Paginacion.astro`
- Modify: `src/pages/tienda/index.astro`

- [ ] **Step 1: Implementar las rutas**

Con `getStaticPaths({ paginate })` de Astro — ⚠️ **no se usa en ningún lado del repo todavía**. Cada página recibe **sus 24 productos** renderizados **y** el **índice de su categoría entera** (Tarea 4).

⚠️ Una página de categoría con subcategorías muestra **las subcategorías primero** y después sus productos paginados.

⚠️ Cada una con su `<title>`, `description` y **canónica propias**, y pasándole `categorias` al `<Base>` para que el pie tenga enlaces (hoy solo `/tienda/` lo hace).

`/tienda/` pasa a ser **índice de categorías** + destacados. No lista mil tarjetas.

- [ ] **Step 2: Verificar el caso de la madre**

Que `/tienda/<madre>/` muestre los productos de sus hijas (el `where` público ya lo hace; lo que se verifica es que la página lo pida bien). → Review Focus 3.

- [ ] **Step 3: Medir el peso**

El `dist/tienda/<cat>/index.html` tiene que quedar en **decenas de KB**, contra los ~4 MB que daría la página única con 1.000 productos.

- [ ] **Step 4: Commit**

```bash
git add src/pages/tienda src/components/catalogo/Paginacion.astro
git commit -m "feat(tienda): paginas por categoria y subcategoria, paginadas"
```

---

### Task 7: Los filtros, sobre la categoría entera

**Files:**
- Modify: `src/components/catalogo/Catalogo.tsx`, `src/components/catalogo/Filtros.tsx`

- [ ] **Step 1: Implementar**

La isla recibe **los productos de su página** + **el índice de su categoría**. Sin filtros activos manda el paginado estático; con un filtro activo, la isla trabaja sobre el índice y pagina del lado del cliente, reflejándolo en la URL.

⚠️ **El dominio de los controles (tope de precio, colores) sale SIEMPRE del índice**, nunca de la página: si no, cambia de página en página.

Fuera el bloque de **Material** y el select de **Categoría** (`Filtros.tsx:84-124`) y sus props.

⚠️ **Las dos reglas de la URL no se pueden perder** (`Catalogo.tsx:58-68`): no sincronizar antes de restaurar, y sincronizar también sin resultados.

- [ ] **Step 2: Verificar**

Build + revisar el HTML: con filtros apagados, la página 2 es un archivo propio; con un filtro puesto, la URL lo refleja y se restaura al recargar.

- [ ] **Step 3: Commit**

```bash
git add src/components/catalogo
git commit -m "feat(tienda): los filtros operan sobre la categoria entera"
```

---

### Task 8: El buscador

**Files:**
- Create: `src/lib/indice-busqueda.ts`, `src/lib/indice-busqueda.spec.ts`, `src/components/catalogo/Buscador.tsx`
- Modify: `src/layouts/Base.astro` o la portada, según dónde se monte

**Interfaces:**
- Produces:
  ```ts
  export interface EntradaBusqueda { id: string; name: string; cat: string; catLabel: string; desc: string }
  export function indiceDeBusqueda(productos: readonly ProductoVitrina[]): EntradaBusqueda[]
  export function buscar(indice: readonly EntradaBusqueda[], consulta: string, tope?: number): EntradaBusqueda[]
  ```

- [ ] **Step 1: Escribir los tests que fallan**

```ts
it('encuentra por nombre aproximado');
it('encuentra por el resumen: «soporte de celular» encuentra «Base Anti-Slip»'); // el objetivo 1 del spec
it('ignora acentos y mayúsculas');
it('una consulta vacía no devuelve nada');
it('respeta el tope de resultados');
```

- [ ] **Step 2: Correr y verificar que fallan** · **Step 3: Implementar**

⚠️ El índice lleva `id`, `name`, `cat`, `catLabel` y `desc` (el `summary`): **con solo el nombre, buscar «soporte de celular» no encuentra «Base Anti-Slip»**, que es el objetivo. Quedan ~120 bytes por producto (~120 KB con mil), aceptable. Se genera en el build.

- [ ] **Step 4: Correr y verificar que pasan** · **Step 5: Commit**

```bash
git add src/lib/indice-busqueda.ts src/lib/indice-busqueda.spec.ts src/components/catalogo/Buscador.tsx
git commit -m "feat(tienda): buscador sobre indice liviano del build"
```

---

### Task 9: Los enlaces viejos, el sitemap y la verificación final

**Files:**
- Modify: `src/lib/banner.ts:29`, `src/lib/banner.spec.ts:5-7`
- Modify: `src/components/Footer.astro:41`, `src/pages/index.astro:106`, `src/pages/producto/[slug].astro:74`
- Modify: `src/lib/catalogo.spec.ts` (las URLs base con `?cat=`)

- [ ] **Step 1: Migrar los cuatro generadores**

Todos a `/tienda/<slug>/`. Verificado: **ninguna de esas URLs se referencia desde `calc3d-web` ni `calc3d-api`**, así que el cambio no sale de este repo. → Review Focus 4.

- [ ] **Step 2: Verificar el sitemap**

Que `sitemap-0.xml` incluya las páginas de categoría y de paginación nuevas, además de las fichas.

- [ ] **Step 3: Verificación final**

Run: `cd calc3d-landing && pnpm check && pnpm test && pnpm build`
Expected: todo verde, y **ningún enlace `?cat=` en el `dist`**.

- [ ] **Step 4: Commit**

```bash
git add src/lib src/components src/pages
git commit -m "feat(tienda): los enlaces de categoria apuntan a su ruta propia"
```

---

## Lo que queda a criterio de quien construya

- Dónde se monta el buscador (portada, cabecera, o las dos) y si la navegación por teclado usa el mismo patrón que el `Select` del panel.
- Si la paginación es numerada o «anterior/siguiente» en móvil.
- La forma exacta del `getStaticPaths` anidado (un archivo por nivel o un `[...ruta]`), mientras las URLs sean las del spec.
- Si `/tienda/` muestra destacados además del índice de categorías.
- Todo lo de espaciado y grilla dentro de los tokens de marca ya fijados.

## Lo que este plan NO hace

- **No toca la portada ni los materiales**: son las fases 2 y 3, con su propio plan.
- **No agrega movimiento**: es la fase 4.
- **No ordena categorías**: `position` sigue siendo una secuencia global y no hay forma de reordenar. Declarado fuera de alcance en el plan anterior y sigue afuera.
- **No genera variantes de las fotos.** Sin `sharp`, se sirve la imagen tal como se subió a R2. Con mil fichas se nota, y merece su propio documento.
