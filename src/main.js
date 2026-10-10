import './style.css';
import { App } from './app.js';
import { showSplash } from './splash.js';

const root = document.getElementById('app');
const app = new App(root);
root.replaceChildren();
// l'outil se charge en arrière-plan pendant l'affichage de la page d'accueil
const ready = app.init().catch((e) => {
  console.error(e);
  root.innerHTML = `<div class="boot error">Erreur au démarrage : ${e.message}</div>`;
});
// page d'accueil uniquement au premier lancement de la session (pas à chaque rafraîchissement)
let started = false;
try {
  started = sessionStorage.getItem('stand3d:started') === '1';
} catch (e) {
  /* stockage indisponible */
}
if (!started)
  showSplash({ ready, visite: new URLSearchParams(location.search).has('visite') }).then(() => {
    try {
      sessionStorage.setItem('stand3d:started', '1');
    } catch (e) {
      /* stockage indisponible */
    }
    app.viewer?.resize();
  });
window.standApp = app; // pratique pour le débogage
