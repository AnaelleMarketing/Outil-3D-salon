// Page d'accueil : « S » Spengler en 3D qui tourne en fond + bouton Démarrer.
import { h } from './util.js';
import { mountLogoScene } from './logo-scene.js';

export function showSplash({ ready, visite = false }) {
  const canvasWrap = h('div', { class: 'splash-3d' });
  const btn = h('button', { class: 'splash-btn', disabled: true }, h('span', { class: 'spin' }), 'Chargement…');
  const el = h(
    'div',
    { class: 'splash' },
    canvasWrap,
    h(
      'div',
      { class: 'splash-content' },
      h('div', { class: 'splash-brand' }, h('img', { src: 'brand/logo-s.png', alt: '' }), h('span', { class: 'b1' }, 'SPENGLER'), h('span', { class: 'b2' }, 'MEDICAL')),
      h('h1', {}, 'Conception de stand 3D'),
      h('p', {}, 'Concevez, aménagez et visitez vos stands de salon avant de les valider avec le standiste.'),
      btn,
    ),
    h('footer', { class: 'splash-foot' }, '© 2026 Outil de conception 3D – Propriétaire : Anaelle Cintract · ', h('a', { href: 'mentions-legales.html', target: '_blank', rel: 'noopener' }, 'Mentions légales et conditions d’utilisation')),
  );
  document.body.append(el);
  const stop = mountLogoScene(canvasWrap, el);

  return new Promise((resolve) => {
    ready.then(() => {
      btn.disabled = false;
      btn.replaceChildren(visite ? 'Visiter le stand' : 'Démarrer', h('span', { class: 'arrow' }, '→'));
      btn.focus();
    });
    btn.addEventListener('click', () => {
      el.classList.add('out');
      setTimeout(() => {
        stop();
        el.remove();
        resolve();
      }, 650);
    });
  });
}
