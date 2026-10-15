# Imagen del contenedor (opción de despliegue alternativa). En producción la tienda
# va en Cloudflare Pages, NO en este Dockerfile — se conserva por si hace falta un
# contenedor. Astro genera un sitio ESTÁTICO: se buildea y se sirve `dist/` con nginx.
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.6.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile
COPY . .
# Variables horneadas en el build (Astro las resuelve al compilar): van como build-arg.
ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=$PUBLIC_API_URL
# Dominio del sitio: sin él, el build NO emite sitemap ni canónicas absolutas.
ARG PUBLIC_SITE_URL
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL
RUN pnpm build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
