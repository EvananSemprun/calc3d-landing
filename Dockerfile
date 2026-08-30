FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.6.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile
COPY . .
# La URL de la API se hornea en el bundle (Vite la resuelve en build), así que
# hay que pasarla como build-arg en el despliegue.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# Dominio del sitio: sin el, el build no emite sitemap.xml (y avisa).
ARG VITE_SITE_URL
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN pnpm build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
