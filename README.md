# Calc3D — Landing

> Landing estática de **Calc3D** (Cotiza3D), la calculadora de precios para impresión 3D.

![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-vanilla-3178C6?logo=typescript&logoColor=white)

Página de marketing **100 % estática**: Vite + Tailwind **sin React** — todo el
contenido vive en `index.html` para SEO. Tema oscuro forzado con la identidad
visual "panel de precisión" (oro sobre navy, paleta estricta de 5 colores de
marca + verde/rojo semánticos), animaciones de entrada con
`IntersectionObserver` y respeto a `prefers-reduced-motion`.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html` | Las 15 secciones del embudo (héroe → problema → cómo funciona → módulos → comparativa → FAQ → CTA → footer) |
| `src/main.ts` | Menú móvil, acordeón del FAQ, reveal on-scroll y año del footer |
| `src/styles.css` | Design tokens de marca (valores del tema oscuro directo) |

## Desarrollo

```bash
pnpm install
pnpm dev        # http://localhost:5181 (puerto fijado en vite.config.ts)
```

## Build y deploy

```bash
pnpm build      # genera dist/ (estático puro)
pnpm preview    # sirve el build para revisarlo
```

Deploy: subir `dist/` a cualquier CDN (Netlify / Vercel / Cloudflare Pages) o
usar el `Dockerfile` incluido (nginx).

## Estado y pendientes antes de publicar

- El producto pasó a ser una **app de un solo dueño** — el copy de planes y
  "prueba gratis" de la landing quedó heredado del enfoque SaaS y está
  **pendiente de adaptar**.
- Placeholders marcados con `⚠️` en `index.html`: nombre comercial provisional
  (**Cotiza3D**), URL de la app, WhatsApp de contacto, botón "Ver demo" y
  testimonios. También falta el dominio real en `canonical`/OpenGraph y los
  enlaces legales del footer.

## Ecosistema Calc3D

| Repo | Qué es |
|---|---|
| [calc3d-api](https://github.com/EvananSemprun/calc3d-api) | Backend + motor de cálculo canónico |
| [calc3d-web](https://github.com/EvananSemprun/calc3d-web) | Panel web (React + Vite) |
| **calc3d-landing** (este) | Landing estática |
