import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // chemins relatifs : le site fonctionne dans un sous-dossier (OVH : stand3d/)
  server: { port: 5180, strictPort: true },
  build: { chunkSizeWarningLimit: 2000 },
});
