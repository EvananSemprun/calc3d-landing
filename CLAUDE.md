# CLAUDE.md — `calc3d-landing` (la tienda pública de Banano Lab)

Vitrina pública del catálogo de **Banano Lab**. Cuarto repo del proyecto, hermano
de `calc3d-api` y `calc3d-web` (`calc3d`, el monorepo viejo, está archivado).
Idioma de UI y respuestas: **español**.

## ⚠️ El nombre miente: esto NO es una landing

**El repo y la carpeta se llaman `calc3d-landing`, pero el contenido es la tienda
(el ex `calc3d-store`).** Es una incoherencia deliberada, no un descuido: se
fusionaron los dos repos y el dueño decidió **no renombrar**, para conservar la
historia git y el remoto ya existentes
(`https://github.com/EvananSemprun/calc3d-landing.git`). La mecánica fue mover el
`.git` de la landing dentro de la carpeta del store y renombrarla. Por eso también
el `package.json` sigue diciendo `@calc3d/store`.

- **La landing comercial del SaaS "Cotiza3D" se descartó por completo** (decisión
  del dueño): su `index.html` con Tailwind ya no existe en el árbol de trabajo, y
  **Tailwind, PostCSS y `tsconfig.json` dejaron de ser dependencias de este repo**.
- **Nada se perdió.** El commit `925c532` es el último estado de la landing vieja y
  sigue en la historia. Si el SaaS vuelve, se recupera con
  `git show 925c532:index.html` (ídem `925c532:src/styles.css` y
  `925c532:tailwind.config.js`). No hace falta reconstruirla de cero.
- Con esto el proyecto pasó de 5 repos a 4: `calc3d-api`, `calc3d-web`,
  `calc3d-landing` (este) y `calc3d` (archivado).

## Qué es y qué NO es

- **Es** un catálogo de **solo lectura** que consume la API pública de
  `calc3d-api` (`/api/public/store/*`). No tiene sesión, no escribe nada y no
  guarda datos personales.
- **NO es** un ecommerce con pago. El pedido se **registra** en la bandeja del
  panel y se **cierra por WhatsApp**: el carrito arma la selección, el formulario
  la manda al negocio y el botón abre el chat con el detalle. Fue una decisión
  explícita, no una etapa pendiente — evita pasarela, conciliación en bolívares y
  toda la superficie de seguridad de los pagos.
- **NO hay cuentas de cliente.** Se pide como invitado: nombre + WhatsApp. Ver
  "Enviar el pedido" para el porqué.

## Las páginas del sitio

| Ruta | Archivo | Qué es |
|---|---|---|
| `/` | `index.html` | Inicio: las dos mitades del negocio, destacados reales, proceso, FAQ |
| `/tienda/` | `tienda/index.html` | El catálogo (vivía en la raíz hasta que apareció el inicio) |
| `/producto/{slug}` | `producto/index.html` | Ficha; un solo HTML para todos los productos |
| `/impresion-3d/` | | Servicio físico: materiales, proceso, qué se puede hacer |
| `/programacion/` | | Servicio digital: qué se desarrolla, con qué, cómo se trabaja |
| `/calculadora/` | | Estimador de proyectos de programación |

**El header y el pie son UN solo archivo** (`partials/`), inyectado por el plugin
`parciales()` de `vite.config.ts` donde cada página pone su marca de inclusión.
Antes estaban copiados en cada HTML: con dos páginas se toleraba, con seis
cambiar un enlace del menú serían seis ediciones y la primera que se olvide deja
el sitio incoherente.

- Se resuelve en el **build**, no en JavaScript, porque los enlaces internos son
  el camino por el que un buscador descubre las demás páginas. Un menú pintado
  con JS dejaría cada página aislada.
- ⚠️ **No escribir la marca de inclusión literal dentro de un comentario HTML**:
  un comentario anidado dentro de otro rompe el parser de Vite, y el error que
  tira no menciona el parcial.
- `blPintarNegocio()`, `blMarcarNav()` y `blTarjetaProducto()` (en `app.js`) son
  lo compartido del lado del cliente. Cada página los tenía duplicados y ya
  habían empezado a divergir (la tarjeta de "relacionados" no mostraba ni las
  insignias ni el material).

## El estimador (`/calculadora/`)

**No es la calculadora de Calc3D, y no puede serlo.** El motor real necesita
gramos de filamento y horas de impresión —datos del slicer— que un visitante no
tiene; y para software directamente no aplica. Así que es otra cosa: un
estimador por **rangos** de proyectos de programación que termina en una
cotización de verdad.

- **Nunca sale un precio cerrado.** Salen dos números y una advertencia.
  Comprometer un monto sin ver el alcance es prometer lo que no se sabe si se
  puede cumplir.
- ⚠️ **Los precios base son PROVISIONALES.** Viven en la constante `PRECIOS` al
  tope del `<script>` de esa página, marcada. Hay que ajustarlos a lo que de
  verdad se cobra **antes** de publicar el sitio: un visitante los va a tomar
  como referencia.
- "Pedir cotización exacta" abre el modal de pieza a medida con la descripción
  **ya redactada** (tipo, secciones, extras, plazo y el rango que vio), y cae en
  la misma bandeja. Nadie reescribe lo que acaba de elegir.

## Qué se tomó de Lovable y qué no

Ese diseño es **una sola pagina de ~7.000 px** con todo adentro: su menu no
lleva a paginas sino a anclas (`/#impresion3d`, `/#programacion`). La paleta, en
cambio, es casi la misma que la nuestra (su azul de seccion es `rgb(0,28,61)`,
el nuestro `#001D3D`).

**Se tomo el RITMO, no la arquitectura:**
- Rejilla densa de soluciones a 3 columnas (`.solutions`), fondos que **alternan**
  seccion por seccion, bloques de servicio a dos columnas (`.svc`, con
  `.svc--flip` para invertir y romper el patron) y proceso de 5 pasos.
- `.steps` usa `auto-fit` y no un numero fijo de columnas: la misma clase sirve
  para los 5 pasos del inicio y los 4 de las paginas de servicio.

**NO se copio su pagina unica con anclas.** Fundir `/impresion-3d/` y
`/programacion/` en secciones del inicio borraria dos URL que pueden
posicionarse — una pagina rankea para un tema, no para cuatro. El inicio las
**resume y enlaza**: cuenta el "que" y la pagina cuenta el "como".

## Lo que NO se copió de Lovable, a propósito

- **Los contadores** ("500+ proyectos", "150+ clientes", "4.8★"). Son inventados.
  Es la misma razón por la que ya se había rechazado la calificación en la ficha.
- **El portafolio de seis proyectos.** Sin trabajos reales, es inventar
  credenciales.
- **"Ciudad de México"** como ubicación: el negocio es venezolano.

En su lugar va contenido que sí es verdad — materiales, proceso y tiempos.

## Stack: estático, SIN React (a propósito)

Vite + HTML + CSS + JS de navegador. React no aporta nada a una vitrina de solo
lectura y el HTML plano se indexa mejor. El bundle completo pesa ~20 KB (10 KB
gzip). Tampoco hay Tailwind: el CSS es una copia del diseño (ver más abajo), y el
Tailwind que quedaba era el de la landing descartada.

```
pnpm dev        # http://localhost:5182
pnpm build      # dist/
```

El **puerto 5182 está fijado en dos lugares y deben coincidir**: `server.port` en
`vite.config.ts` y la entrada `sitio` de `.claude/launch.json` (que además pasa
`--strictPort`, para que un 5182 ocupado falle en vez de saltar a otro puerto en
silencio). Importa porque la API valida este origen exacto en `STORE_ORIGIN`
(CORS): si el sitio arranca en 5183, el navegador bloquea las peticiones y el
error que se ve no menciona el puerto.

`pnpm-workspace.yaml` autoriza el postinstall de **esbuild**; sin eso `pnpm`
aborta la instalación.

## El diseño viene de Claude Design

Proyecto **"banano"** (`claude.ai/design/p/081cd977-…`), archivo `tienda.html`.

- **`assets/styles.css` es una COPIA LITERAL** del diseño. Si hay que cambiar el
  aspecto, se cambia **allá** y se vuelve a copiar acá; editar solo este archivo
  hace que las dos versiones se separen en silencio. Incluye estilos de páginas
  que este repo todavía no tiene (inicio, calculadora, cotizador), conservados a
  propósito para cuando se sumen.
- `index.html` es la `tienda.html` del diseño montada en la raíz. Del nav quedan
  solo los enlaces que existen: las otras tres páginas del diseño **no están en
  este repo**, y un enlace a una página inexistente es peor que no tenerlo.
- **`assets/app.js` sí cambió** respecto del prototipo, por tres razones que
  conviene no revertir:
  1. El catálogo **no está escrito en el front**. Un catálogo duplicado se
     desactualiza el primer día.
  2. Se quitó **"Finalizar compra"**, que en el prototipo era un `alert()`
     prometiendo una pasarela. Ofrecerle al cliente un botón que no cobra es peor
     que no tenerlo.
  3. Los colores del filtro salen de los productos reales, no de una lista fija.

## Mezcla con el diseño de Lovable

Hay un SEGUNDO diseño (`banano-lab-studio.lovable.app`) con la misma paleta y otra
estructura. De ahí se tomó lo que le faltaba al primero:

- **La ficha `/producto/{slug}`** — migas, galería con miniaturas, selectores de
  variante y color, especificaciones, cantidad y productos relacionados. Es el
  aporte grande: para impresión a pedido, el cliente necesita ver material y
  medidas antes de encargar.
- **"Ver detalle" como acción de la tarjeta**, junto a "Agregar".
- **La línea técnica "Categoría • Material"** y la insignia de esquina.

Del primero se conservó el **carrito → WhatsApp** (Lovable tiene "Comprar", que
implica una pasarela que no existe) y el **selector de orden** (Lovable no tiene).

**Dos cosas de Lovable se rechazaron a propósito**: la *calificación* (4.8★) —
no hay reseñas, e inventarlas es prueba social falsa — y **"En stock"**, que
contradice el modelo: se produce bajo pedido, por eso se muestra "Listo en N días".

## Precio y opciones: el detalle que se rompe fácil

Los recargos por opción ("Grande +$1.50") **solo los conoce la ficha**: el listado
público no devuelve los grupos de opciones. Por eso:

- `Cart.add(id, qty, opts, unit)` recibe el precio unitario YA calculado desde la
  ficha. Si se calculara dentro del carrito con `BL.find()`, saldría siempre el
  precio base y el cliente recibiría un total equivocado.
- Cada renglón guarda las opciones elegidas y su precio; dos renglones del mismo
  producto con opciones distintas son cosas distintas (`claveDeItem`).
- En la vitrina, un producto con opciones **obligatorias** muestra "Elegir" y
  lleva a la ficha en vez de agregar a ciegas. Lo indica `requiresOptions`, que
  publica la API.

## Filtros: por qué la categoría está en un lugar y el material en otro

- **Categoría → pestañas** arriba de la vitrina, de **selección única**. Eso es lo
  que significa una pestaña, y es como se busca en una tienda ("llaveros y
  soportes a la vez" no es una intención real). Antes era un chip multi-selección
  en el panel lateral; **no dejar los dos**: dos controles del mismo campo son dos
  estados que se desincronizan al primer toque.
- **Material y color → chips multi-selección** en el panel lateral. Ahí sí tiene
  sentido acumular ("PLA o PETG").
- Las dos listas salen de los **productos reales**, no de listas fijas. Una
  categoría **sin productos** no llega a ser pestaña ni enlace del pie: se vería,
  se tocaría y no mostraría nada. Con menos de 2 categorías las pestañas se ocultan
  enteras (no hay elección que ofrecer).
- El `material` es **texto libre** en el panel (el datalist solo sugiere), así que
  `materialesDe()` deduplica sin distinguir mayúsculas ni espacios y `adapt()`
  guarda un `materialKey` normalizado para comparar. Sin eso, "PLA" y "pla" serían
  dos botones y cada uno mostraría la mitad de los productos.
- La categoría elegida se refleja en la URL (`?cat=`) con `replaceState`: el pie y
  las migas de la ficha enlazan así, y la vista queda compartible. Un `?cat=` roto
  o apuntando a una categoría vacía se **ignora y se limpia de la URL**, en vez de
  dejar la vitrina llena y ninguna pestaña marcada.

## Enviar el pedido: la única escritura del repo

`Checkout` (pedido del carrito) y `Custom` (pieza a medida) son lo único que
**escribe** en la API — `POST /public/store/orders` y `/custom-requests`. Cuatro
cosas que no hay que romper:

1. **El precio NO se manda.** El cuerpo lleva `{slug, qty, options}` y nada más;
   el total lo calcula el servidor leyendo la ficha. Lo que muestra esta página
   es informativo. Agregarle un `unitPrice` al payload sería abrir la puerta a
   comprar a $0.01.
2. **Nunca se pierde la venta.** Si guardar falla, se muestra el motivo real del
   backend (suele ser corregible: "falta elegir Tamaño", "se pide de a 2") **y se
   ofrece igual el botón de WhatsApp**. Perder un pedido por un 500 es peor que
   quedarse sin el registro. Y al revés: el pedido queda guardado aunque el
   cliente cierre la pestaña sin llegar a WhatsApp.
3. **El carrito se vacía al CERRAR el cajón, no al enviar.** Vaciarlo antes
   dejaría el mensaje de WhatsApp sin renglones justo cuando el cliente lo va a
   tocar. Por eso `Cart.render()` mantiene el pie visible mientras
   `Checkout.hecho`.
4. **Pedido como INVITADO, sin registro.** Nombre + WhatsApp. Construir cuentas
   opcionales obliga igual al camino de invitado y suma registro, verificación de
   correo, recuperación y sesión pública: el doble de superficie de auth sin
   demanda medida. El historial por cliente ya lo da el teléfono — el backend
   enlaza con el contacto que tenga ese número.

El modal de **pieza a medida** intercepta los enlaces `[data-bl="cotizar"]` por
**delegación con `preventDefault`**, sin reescribir el `href`: si el JS falla, el
enlace original a WhatsApp sigue funcionando. Se enganchan así y no uno por uno
porque esos enlaces se pintan DESPUÉS, cuando llega la info del negocio.

**Del otro lado** (panel) nada de esto crea un pedido solo: cae en una bandeja
que el dueño confirma o descarta. Ver `calc3d-api/CLAUDE.md` → "Bandeja de la
tienda".

## Cómo se traducen los datos

`adapt()` en `assets/app.js` pasa del contrato de la API a la forma de la
vitrina. Lo que conviene recordar:

- **El precio vive en USD** (base del motor). Los bolívares son **presentación**:
  se calculan con `info.rate`, la tasa vigente que publica la API. Si el negocio
  no tiene tasa por defecto, simplemente no se muestran.
- `leadTimeDays` → "Listo en N días". **No hay stock**: se produce bajo pedido.
- `minQty` se respeta al agregar al carrito (si el mínimo es 2, agrega de a 2).
- El teléfono de WhatsApp se normaliza a internacional (0 inicial → 58), la misma
  regla que usa el panel.

## Seguridad

- Todo lo que se interpola en HTML se **escapa** (`esc` / `escapeHtml`). El texto
  lo escribe el dueño en el panel, pero la vitrina arma HTML con plantillas.
- La API pública **nunca** devuelve costos ni el origen de costeo; eso está
  fijado con tests en `calc3d-api` (`store-public.service.spec.ts`).
- `nginx.conf` manda las cabeceras de seguridad básicas.

**Accesibilidad:** el diseño importado **no define foco visible** en ningún lado
(la página entera se navegaba a ciegas con teclado). La regla `:focus-visible`
vive en la sección "AÑADIDOS DE ESTE REPO" de `styles.css`, no en la copia del
diseño, para no separarla del original.

## Entorno
- `VITE_API_URL` se **hornea en el build** (Vite la resuelve al compilar), así que
  en Docker va como `--build-arg`, no como variable de runtime.
- La API necesita `STORE_ORGANIZATION_ID` (de qué organización es la tienda) y
  este origen en `STORE_ORIGIN` (CORS).
- Windows / PowerShell para los comandos.

## Pendiente
- ⚠️ **Ajustar `PRECIOS` en `/calculadora/`** antes de publicar (ver arriba).
- **SEO**: las páginas nuevas (inicio, impresión 3D, programación, estimador)
  tienen su contenido **en el HTML** y se indexan bien. Lo que sigue sin verse
  son la **vitrina y las fichas**, que se pintan en el cliente: hay que
  pre-renderizarlas en el build o aceptar que no se indexen. `nginx.conf`
  devuelve **404** ante una dirección inexistente y no el inicio, para no generar
  "404 blandos" (páginas duplicadas a ojos de un buscador).
- `sitemap.xml` y `robots.txt` los **genera el build** (plugin `seo()` en
  `vite.config.ts`) a partir de la misma lista `PAGINAS` con la que se compila,
  para que una pagina nueva no pueda quedarse fuera sin que nadie lo note. Las
  fichas de producto NO estan listadas a proposito: se pintan en el cliente y un
  buscador que las visite ve una pagina vacia. **Necesitan `VITE_SITE_URL`**
  (dominio, sin barra final); sin ella el build avisa y no emite el sitemap.
- Dominio propio.

## Git
- No hacer commit ni push salvo que se pida.
