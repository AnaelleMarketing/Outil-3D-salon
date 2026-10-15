import './style.css';

// mode clair / sombre choisi dans le menu du compte (mémorisé sur ce navigateur)
try {
  if (localStorage.getItem('stand3d:theme') === 'dark') document.documentElement.dataset.theme = 'dark';
} catch (e) {
  /* stockage indisponible */
}
import { App } from './app.js';
import { showSplash } from './splash.js';

import { setUser } from './store.js';

const root = document.getElementById('app');
const app = new App(root);
root.replaceChildren();

/** Compte connecté (version en ligne) ; en local, pas de compte : mode personnel */
async function whoami() {
  try {
    const r = await fetch('api/collab.php?a=me', { cache: 'no-store' });
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) return await r.json();
  } catch (e) {
    /* hors ligne ou version locale */
  }
  return null;
}

// l'outil se charge en arrière-plan pendant l'affichage de la page d'accueil
const ready = whoami().then((me) => {
  app.me = me;
  setUser(me?.user);
  return app.init();
}).catch((e) => {
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
