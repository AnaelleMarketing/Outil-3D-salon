// Page « accès réservé » (erreur 403 hors réseau Spengler) : construite à part dans dist/acces/,
// pour pouvoir l'autoriser à tous sans exposer le code de l'outil. Elle est servie à l'adresse demandée,
// d'où les chemins absolus. Ne rien y écrire qui renseigne sur la façon d'obtenir l'accès (demande de l'IT).
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('./acces', import.meta.url)),
  base: '/acces/', // chemins absolus : la page est servie à n'importe quelle adresse refusée
  publicDir: false,
  build: { outDir: fileURLToPath(new URL('./dist/acces', import.meta.url)), emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
