import { defineConfig } from 'vite';

// Landing estática de marca (sin React): el contenido vive en index.html para SEO.
export default defineConfig({
  server: { port: 5181 },
  build: { target: 'es2019' },
});
