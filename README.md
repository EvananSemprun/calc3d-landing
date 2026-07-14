# Cotiza3D — Landing

Landing comercial estática (Vite + Tailwind, sin React). Tema oscuro forzado.

## Desarrollo
    pnpm install
    pnpm dev        # http://localhost:5173 (o 5181 con el launch de Claude)

## Build
    pnpm build      # genera dist/ (estático)
    pnpm preview

## Deploy
Estática pura: subir `dist/` a cualquier CDN (Netlify/Vercel/Cloudflare Pages)
o usar el `Dockerfile` (nginx). Editar los placeholders marcados `⚠️` en
`index.html` (nombre comercial, URL de la app, precios, WhatsApp) antes de publicar.
