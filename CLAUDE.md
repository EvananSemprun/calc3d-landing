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
secciones con embudo emocional (problema → cómo funciona → función estrella/alerta
→ módulos → comparativa vs Excel → para Venezuela → dashboard → casos → tus datos →
prueba social → planes → FAQ → CTA final → footer).

**2 reglas de diseño del brief:**
1. CTA idéntico en sus 3 apariciones = **"Probar gratis 14 días"**.
2. **Oro SOLO en botones y números clave** (íconos/badges en azul).

## Placeholders a editar (marcados con `⚠️` en `index.html`)
- Nombre comercial provisional **Cotiza3D** (Ctrl+H para renombrar).
- URL de la app (`http://localhost:5180` → dominio real).
- Precios de ejemplo ($8 Taller / $15 Pro).
- Número de WhatsApp.
- Enlaces legales.

**NO** apunta a producción todavía (hosting/dominio sin decidir).

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
