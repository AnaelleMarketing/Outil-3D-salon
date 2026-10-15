// Page « accès réservé » (erreur 403 hors réseau Spengler) : construite à part dans dist/acces/,
// pour pouvoir l'autoriser à tous sans exposer le code de l'outil.
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('./acces', import.meta.url)),
  base: '/acces/', // chemins absolus : la page est servie à n'importe quelle adresse refusée
  publicDir: false,
  build: { outDir: fileURLToPath(new URL('./dist/acces', import.meta.url)), emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
