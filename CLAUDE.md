# CLAUDE.md — Calc3D Landing

Landing comercial estática de Calc3D (Calculadora de Precios para Impresión 3D).
Idioma de UI/errores y respuestas: **español**.

## Qué es
- **Vite + Tailwind SIN React** — el contenido vive en `index.html` (para SEO),
  no en componentes. **Tema oscuro forzado** (`class="dark"`). Marca "panel de
  precisión" calcada del frontend (mismos tokens/fuentes, **paleta ESTRICTA de 5
  colores**); los tokens viven en `src/styles.css` con valores del tema oscuro
  directo.
- `src/main.ts` = menú móvil + acordeón FAQ + reveal por `IntersectionObserver` +
  año. SEO (title/description/canonical/OG), favicon SVG inline,
  `prefers-reduced-motion`.

## Estructura del contenido (esquema del dueño)
La estructura sigue el esquema del dueño (`Downloads/Cotiza3D-Landing.docx`): 15
bloques numerados (`01 HERO` … `15 FOOTER`) con embudo emocional (héroe → problema →
cómo funciona → función estrella/alerta → módulos → comparativa vs Excel → para
Venezuela → dashboard → casos → tus datos → prueba social → planes → FAQ → CTA final
→ footer).

**2 reglas de diseño del brief:**
1. CTA **"Probar gratis 14 días"** idéntico en sus **4** apariciones (menú móvil,
   héroe, planes, CTA final); el nav de escritorio usa la versión corta "Probar gratis".
2. **Oro SOLO en botones y números clave** (íconos/badges en azul).

## Placeholders a editar
Marcados con `⚠️` en `index.html`:
- Nombre comercial provisional **Cotiza3D** (Ctrl+H para renombrar).
- URL de la app (`http://localhost:5180` → dominio real).
- Número de WhatsApp / correo bajo `⚠️ CONTACTO`. (OJO: el correo del footer
  `paginaswebstop@gmail.com` es un valor **real**, no placeholder.)
- Botón **"Ver demo"** (aún sin destino).
- **Testimonios / prueba social** (contenido de ejemplo).

Pendientes SIN marca `⚠️`:
- **Enlaces legales** del footer (`href="#"`, "pendiente").
- Dominio de `canonical` / OpenGraph: `https://tudominio.com/` (falta además `og:image`).

**Precio:** el brief **NO fija precio**. Hay **un solo "Plan Taller"** ("14 días
gratis · luego un precio plano por taller"); **NO existe** un plan "Pro" ni montos
$8/$15 — eso fue un error arrastrado del monorepo archivado.

**NO** apunta a producción todavía (hosting/dominio sin decidir).

## Detalles técnicos
- **Fuentes por CDN de Google Fonts** (`<link>` + preconnect en `index.html`):
  Bricolage Grotesque (display), Hanken Grotesk (texto), JetBrains Mono (cifras).
- **Utilidades/efectos** calcados del front: `.glass`, `.surface-grid`,
  `.text-gold-sheen` (animación `shine`), sombras `glow`/`glow-lg`/`glow-blue`, fondo
  blueprint `--app-gradient` (en `src/styles.css` / `tailwind.config.js`).
- **Colores semánticos** (aparte de los 5 de marca, igual que en `apps/web`): verde
  `--success` (éxito) y rojo `--destructive` (error/alerta — tarjetas de alerta por
  devaluación). Ambos registrados en `tailwind.config.js`; la "paleta estricta de 5"
  aplica a los colores de MARCA, no a estos estados.
- **Deploy**: `Dockerfile` (nginx sirviendo `dist/`) + `README.md` (alternativa: subir
  `dist/` a un CDN). El puerto de dev (5181) lo fijan `vite.config.ts` y
  `.claude/launch.json` (entrada `landing`).

## Comandos (desde la raíz de este repo)
- `pnpm install`
- `pnpm dev` — servidor de desarrollo (puerto 5181).
- `pnpm build` — build de producción.
- `pnpm preview` — sirve el build para revisarlo.

## Entorno
- Windows / PowerShell: usar su sintaxis (`$env:VAR` no `$VAR`, `$null` no
  `/dev/null`, backtick para continuar línea). Rutas con backslash de Windows.
- pnpm vía `npm install -g pnpm`.
- `.env` reales NO se versionan ni se editan; usar los `.env.example`.

## Seguridad y secretos
- NUNCA modificar archivos `.env` (ni `.env.*`) salvo que se pida explícitamente
  en ese mismo mensaje.
- Nunca exponer valores reales de secretos/credenciales en código, logs ni docs.

## Git
- No hacer commit ni push salvo que se pida.
- No usar flags interactivos (`-i`) ni `--no-verify`.
- Cuando sí se pida commit, usar mensajes limpios y consistentes.
