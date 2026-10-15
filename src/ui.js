// Interface utilisateur : barre d'outils, bibliothèque, propriétés, dialogues.
import { h, fmtDate, uid, debounce } from './util.js';
import * as assets from './assets.js';
import { CATALOG, CATEGORIES, TYPES, FIELD, SPOT_ANGLE, IMAGE_LABELS, BRANDS, fromCatalog } from './objects.js';
import { FINISHES, FLOORS, FLOOR_PRESETS, floorSwatch, sameFloor, WOOD_LABELS } from './materials.js';
import { STEPS, STYLES, STYLE_GROUPS, SIZE_PRESETS, budget, prices, fmtEUR, fmtQty } from './planner.js';
import { TEMPLATES, OPEN_TYPES, openTypeOf, basicProject } from './templates.js';
import { thumbFor } from './thumbs.js';
import { DEVICE_PALETTES } from './devices.js';
import { SPIRIT_CHIPS, generateProposals, renderPreview } from './assistant.js';
import { showSplash } from './splash.js';
import * as X from './exporters.js';
import { get } from './store.js';
import { restoreBackup } from './restore.js';

const SYSTEM_FONTS = ['Helvetica Neue', 'Avenir Next', 'Avenir Next Condensed', 'Arial', 'Futura', 'Gill Sans', 'Georgia', 'Times New Roman', 'Verdana'];
const ICON = {
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  redo: '<svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>',
  ruler: '<svg viewBox="0 0 24 24"><path d="M21.3 15.3 8.7 2.7a1 1 0 0 0-1.4 0L2.7 7.3a1 1 0 0 0 0 1.4l12.6 12.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4Z"/><path d="m7.5 10.5 2-2M10.5 13.5l2-2M13.5 16.5l2-2"/></svg>',
  comment: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24"><path d="M9.9 4.2A10 10 0 0 1 12 4c6.4 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 8 10 8a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20"/></svg>',
  rotL: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  rotR: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5-5 5 5M5 3h14"/></svg>',
};
const icon = (n) => h('span', { class: 'ic', html: ICON[n] });

/** Mode clair / sombre, mémorisé sur ce navigateur (appliqué au démarrage par main.js) */
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem('stand3d:theme', t);
  } catch (e) {
    /* stockage indisponible : le choix vaut pour la session */
  }
}

/** Favoris du catalogue (produits posés souvent), mémorisés sur ce navigateur */
const favKey = (e) => e.cat + '|' + (e.d?.ref || e.label);
function getFavs() {
  try {
    return JSON.parse(localStorage.getItem('stand3d:favoris') || '[]');
  } catch (e) {
    return [];
  }
}
function setFavs(list) {
  try {
    localStorage.setItem('stand3d:favoris', JSON.stringify(list));
  } catch (e) {
    /* stockage indisponible */
  }
}

/** Entrée de menu « Mode sombre » / « Mode clair », qui suit le mode en cours */
function themeItem() {
  const btn = h('button', {});
  const draw = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    btn.replaceChildren(icon(dark ? 'sun' : 'moon'), dark ? 'Mode clair' : 'Mode sombre');
  };
  btn.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    draw();
  });
  draw();
  return btn;
}

function pickFile(accept, multiple = false) {
  return new Promise((res) => {
    const i = h('input', { type: 'file', accept, multiple, style: { display: 'none' } });
    i.onchange = () => {
      res(multiple ? [...i.files] : i.files[0]);
      i.remove();
    };
    document.body.append(i);
    i.click();
  });
}

export class UI {
  constructor(app) {
    this.app = app;
    this.ltab = 'add';
    this.rtab = 'props';
    this.search = '';
    this.brand = '';
    this.openSections = new Set(['Produits Medica 2026', 'Catalogue Spengler Medical','Structure', 'Mobilier', 'Produits Spengler']);
  }

  mount() {
    const a = this.app;
    this.top = h('header', { class: 'topbar' });
    this.left = h('aside', { class: 'left' });
    this.right = h('aside', { class: 'right' });
    // pas de menu du navigateur sur la vue 3D (cotes, étiquettes…) : le clic droit ouvre le menu de l'outil
    this.viewport = h('main', { class: 'viewport', onContextmenu: (e) => e.preventDefault() });
    this.hud = h('div', { class: 'hud' });
    this.status = h('div', { class: 'status' });
    this.toolHint = h('div', { class: 'tool-hint' });
    this.coach = h('div', { class: 'coach' });
    // boutons pour replier les panneaux latéraux et agrandir la vue
    const pref = (() => {
      try {
        return JSON.parse(localStorage.getItem('stand3d:panels') || '{}');
      } catch (e) {
        return {};
      }
    })();
    this.panels = { left: !!pref.left, right: !!pref.right };
    this.toggleL = h('button', { class: 'panel-toggle tl', onClick: () => this.togglePanel('left') });
    this.toggleR = h('button', { class: 'panel-toggle tr', onClick: () => this.togglePanel('right') });
    this.fullBtn = h('button', { class: 'panel-toggle full', title: 'Agrandir / réduire la vue 3D (F)', onClick: () => this.togglePanel('both') });
    this.viewport.append(this.hud, this.status, this.toolHint, this.coach, this.toggleL, this.toggleR, this.fullBtn);
    window.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && this.app.viewer?.mode !== 'visitor') this.togglePanel('both');
    });
    this.stepbar = h('nav', { class: 'stepbar' });
    this.toasts = h('div', { class: 'toasts' });
    this.step = 0;
    this.coachOpen = false;
    a.root.append(this.top, h('div', { class: 'body' }, this.left, h('div', { class: 'center' }, this.stepbar, this.viewport), this.right), this.toasts);
  }

  togglePanel(side) {
    if (side === 'both') {
      const hide = !(this.panels.left && this.panels.right);
      this.panels = { left: hide, right: hide };
    } else this.panels[side] = !this.panels[side];
    try {
      localStorage.setItem('stand3d:panels', JSON.stringify(this.panels));
    } catch (e) {
      /* préférence facultative */
    }
    this.applyPanels();
  }

  /** Vue Visiteur ou mode Rendu : panneaux repliés pour profiter de la 3D ; rouverts comme avant au retour */
  updateImmersive() {
    const v = this.app.viewer;
    const immersive = v?.mode === 'visitor' || v?.quality === 'render';
    if (immersive && !this.savedPanels) {
      this.savedPanels = { ...this.panels };
      this.panels = { left: true, right: true };
      this.applyPanels();
    } else if (!immersive && this.savedPanels) {
      this.panels = this.savedPanels;
      this.savedPanels = null;
      this.applyPanels();
    }
  }

  applyPanels() {
    document.body.classList.toggle('hide-left', this.panels.left);
    document.body.classList.toggle('hide-right', this.panels.right);
    this.toggleL.textContent = this.panels.left ? '›' : '‹';
    this.toggleL.title = this.panels.left ? 'Afficher la bibliothèque' : 'Replier la bibliothèque';
    this.toggleR.textContent = this.panels.right ? '‹' : '›';
    this.toggleR.title = this.panels.right ? 'Afficher les propriétés' : 'Replier les propriétés';
    this.fullBtn.textContent = this.panels.left && this.panels.right ? '⤡' : '⤢';
    this.app.viewer?.invalidate();
  }

  refreshAll() {
    this.applyPanels();
    this.renderSteps();
    this.renderTop();
    this.renderLeft();
    this.renderRight();
    this.renderHud();
  }
  refresh() {
    this.renderTopState();
    this.renderRight();
    this.renderHud();
    if (this.ltab === 'stand' || this.ltab === 'layers' || this.ltab === 'content' || this.ltab === 'style') this.renderLeft();
  }
  refreshLeft() {
    this.renderLeft();
  }
  refreshTools() {
    this.renderTopState();
    const t = this.app.placing ? 'placing' : this.app.tool;
    const msg = {
      placing: 'Déplacez la souris puis cliquez pour poser · R pour pivoter · Échap pour annuler · Maj : sans aimantation',
      measure: 'Mesure : cliquez sur deux points · × sur une cote ou Suppr pour l’effacer · Échap pour quitter.',
      comment: 'Commentaire : cliquez sur un objet ou un point du stand.',
      calibrate: 'Calibrage : cliquez sur deux points du plan dont vous connaissez la distance.',
      poseSur: 'Poser sur : cliquez sur le meuble (comptoir, socle, table…) · Échap pour annuler.',
    }[t];
    this.toolHint.textContent = msg || '';
    const n = this.app.project?.measures?.length || 0;
    if (t === 'measure' && n) this.toolHint.append(h('button', { class: 'hint-btn', onClick: () => this.app.removeMeasure(null) }, `Tout effacer (${n})`));
    this.toolHint.style.display = msg ? 'block' : 'none';
  }

  /* ---------------- barre supérieure ---------------- */

  renderTop() {
    const a = this.app;
    const p = a.project;
    this.top.replaceChildren();
    const name = h('input', {
      class: 'pname',
      value: p.name,
      title: 'Nom du projet',
      disabled: a.readOnly,
      onChange: (e) => {
        p.name = e.target.value;
        a.commit('Nom');
      },
    });
    this.btn = {};
    const b = (key, label, ic, onClick, title) => (this.btn[key] = h('button', { class: 'tb', onClick, title: title || label }, ic ? icon(ic) : null, label ? h('span', {}, label) : null));
    const seg = (key, items, cur, on) =>
      (this.btn[key] = h(
        'div',
        { class: 'seg' },
        items.map(([v, l, t]) => h('button', { class: v === cur ? 'on' : '', 'data-v': v, title: t || l, onClick: () => on(v) }, l)),
      ));
    this.top.append(
      ...[
      h('div', { class: 'brand', title: 'Revenir à la page d’accueil', onClick: () => showSplash({ ready: Promise.resolve(), visite: a.readOnly }).then(() => a.viewer.resize()) }, h('img', { class: 'logo', src: 'brand/logo-s.png', alt: 'Spengler Medical' }), h('div', {}, h('b', {}, 'Stand 3D'), h('small', {}, 'SPENGLER MEDICAL'))),
      b('projects', '', 'folder', () => this.projectsDialog(), 'Projets'),
      a.readOnly ? null : h('button', { class: 'tb assist', title: 'Assistant : décrivez l’esprit du stand et vos produits, il propose deux agencements', onClick: () => this.assistantDialog() }, h('span', { class: 'ic', html: ICON.spark })),
      // nom du projet, avec en dessous le salon, la taille et le statut de validation
      h('div', { class: 'pinfo' }, name, h('div', { class: 'pmeta-line' }, h('small', {}, [p.salon, `${p.stand.w} × ${p.stand.d} m`].filter(Boolean).join(' · ')), this.statusSelect())),
      h('div', { class: 'grp' }, b('undo', '', 'undo', () => a.undo(), 'Annuler (⌘Z)'), b('redo', '', 'redo', () => a.redo(), 'Rétablir (⇧⌘Z)')),
      seg(
        'mode',
        [
          ['plan', 'Plan 2D', 'Vue de dessus (1)'],
          ['orbit', '3D', 'Vue 3D orbitale (2)'],
          ['visitor', 'Visiteur', 'Vue à hauteur d’yeux 1,65 m (3)'],
        ],
        a.viewer?.mode || 'orbit',
        (v) => this.setMode(v),
      ),
      // rendu réaliste : un seul bouton qui s'allume / s'éteint (au lieu de Travail / Rendu)
      b(
        'quality',
        '',
        'sun',
        () => {
          a.viewer.setQuality(a.viewer.quality === 'render' ? 'work' : 'render');
          this.renderTopState();
          this.updateImmersive();
        },
        'Rendu réaliste : ombres des spots, occlusion, halos lumineux (cliquer pour activer / désactiver)',
      ),
      h('div', { class: 'grp' }, b('measure', '', 'ruler', () => a.setTool('measure'), 'Mesurer entre deux points (M)'), b('comment', '', 'comment', () => a.startComment(), 'Commenter')),
      h('div', { class: 'spacer' }),
      this.exportMenu(),
      a.collab?.enabled ? (this.collabBtn = h('button', { class: 'tb collab-btn', title: 'Collaborer', onClick: () => this.collabDialog() }, icon('users'), h('span', { class: 'cbadge' }))) : null,
      this.accountMenu(),
      ].filter(Boolean),
    );
    this.renderTopState();
    this.renderCollabBadge();
  }

  /** Statut de validation (Brouillon / À valider / Validé), affiché sous le nom du projet */
  statusSelect() {
    const a = this.app;
    const p = a.project;
    return (this.statusSel = h(
      'select',
      {
        class: 'status-sel',
        title: 'Statut de validation du projet',
        value: p.status || 'brouillon',
        disabled: a.readOnly,
        onChange: (e) => {
          p.status = e.target.value;
          a.commit('Statut');
        },
      },
      h('option', { value: 'brouillon' }, '● Brouillon'),
      h('option', { value: 'avalider' }, '● À valider'),
      h('option', { value: 'valide' }, '● Validé'),
    ));
  }

  renderCollabBadge() {
    const el = this.collabBtn?.querySelector('.cbadge');
    if (!el) return;
    const n = this.app.collab?.incoming.length || 0;
    el.textContent = n ? String(n) : '';
    el.style.display = n ? '' : 'none';
  }

  setSyncState(state) {
    this.syncState = state;
    if (!this.syncEl) return;
    const p = this.app.project;
    const others = (p?.shared?.members || []).filter((m) => m !== this.app.me?.user).map((m) => this.app.collab?.name(m) || m);
    const txt = !p?.shared ? '' : { pending: 'Synchronisation…', error: 'Synchronisation en échec – nouvel essai à la prochaine modification' }[state] || 'Partagé' + (others.length ? ' avec ' + others.join(', ') : '') + ' · synchronisé ✓';
    this.syncEl.textContent = txt;
    this.syncEl.style.display = txt ? '' : 'none';
  }

  renderTopState() {
    const a = this.app;
    if (!this.btn) return;
    this.btn.undo.disabled = a.hIndex <= 0 || a.readOnly;
    this.btn.redo.disabled = a.hIndex >= a.history.length - 1 || a.readOnly;
    this.btn.measure.classList.toggle('on', a.tool === 'measure');
    this.btn.comment.classList.toggle('on', a.tool === 'comment');
    this.btn.mode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.v === a.viewer.mode));
    this.btn.quality.classList.toggle('on', a.viewer.quality === 'render');
    if (this.statusSel) this.statusSel.dataset.s = a.project.status || 'brouillon';
    if (this.budgetChip) this.budgetChip.textContent = '≈ ' + fmtEUR(budget(a).total) + ' HT';
  }

  exportMenu() {
    const a = this.app;
    const items = [
      ['Image HD de la vue actuelle…', () => this.exportImageDialog()],
      ['Images des vues enregistrées', () => this.exportViews()],
      ['Panorama 360° (JPG)', () => this.run('Panorama 360°', () => X.export360(a))],
      null,
      ['Plan coté PDF – 1:40', () => this.run('Plan PDF', () => X.exportPlanPDF(a, 40))],
      ['Plan coté PDF – 1:50', () => this.run('Plan PDF', () => X.exportPlanPDF(a, 50))],
      ['Liste des éléments (Excel / CSV)', () => X.exportCSV(a)],
      null,
      ['Modèle 3D du stand (GLB)', () => this.run('Export GLB', () => X.exportGLB(a))],
      ['Fichier projet (.stand3d.json)', () => this.run('Export projet', () => X.exportProject(a))],
    ];
    // le menu est attaché au document (et non à la barre, qui peut défiler et le masquerait)
    this.exportMenuEl?.remove();
    const menu = (this.exportMenuEl = h(
      'div',
      { class: 'menu floating' },
      items.map((it) => (it ? h('button', { onClick: () => (menu.classList.remove('open'), it[1]()) }, it[0]) : h('hr'))),
    ));
    document.body.append(menu);
    const btn = h(
      'button',
      {
        class: 'tb primary',
        onClick: (e) => {
          e.stopPropagation();
          const r = btn.getBoundingClientRect();
          menu.style.top = r.bottom + 6 + 'px';
          menu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
          menu.classList.toggle('open');
        },
      },
      icon('download'),
      h('span', {}, 'Exporter'),
    );
    if (!this._menuClose) {
      this._menuClose = true;
      document.addEventListener('click', () => this.exportMenuEl?.classList.remove('open'));
      window.addEventListener('resize', () => this.exportMenuEl?.classList.remove('open'));
    }
    return h('div', { class: 'dd' }, btn);
  }

  /** Menu de compte : nom, partager, aide, mentions légales, déconnexion */
  accountMenu() {
    const a = this.app;
    const online = !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    const name = a.me?.name || (online ? 'Compte' : 'Mode local');
    this.accountMenuEl?.remove();
    const item = (ic, label, fn) => h('button', { onClick: () => (menu.classList.remove('open'), fn()) }, icon(ic), label);
    const menu = (this.accountMenuEl = h(
      'div',
      { class: 'menu floating account' },
      h('div', { class: 'menu-head' }, h('b', {}, name), h('small', {}, a.me ? 'Connectée à Stand 3D' : online ? '' : 'Version locale (sans compte)')),
      h('hr'),
      item('share', 'Partager le stand…', () => this.shareDialog()),
      item('help', 'Aide et raccourcis', () => this.helpDialog()),
      themeItem(),
      h('button', { onClick: () => (menu.classList.remove('open'), window.open('mentions-legales.html', '_blank')) }, h('span', { class: 'ic' }), 'Mentions légales'),
      online ? h('hr') : null,
      online ? h('a', { class: 'menu-link danger', href: '__logout' }, 'Se déconnecter') : null,
    ));
    document.body.append(menu);
    const initial = (a.me?.name || (online ? '?' : 'L')).charAt(0).toUpperCase();
    const btn = h(
      'button',
      {
        class: 'avatar-btn',
        title: name + ' – compte, aide et déconnexion',
        onClick: (e) => {
          e.stopPropagation();
          this.exportMenuEl?.classList.remove('open');
          const r = btn.getBoundingClientRect();
          menu.style.top = r.bottom + 6 + 'px';
          menu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
          menu.classList.toggle('open');
        },
      },
      h('span', { class: 'avatar' }, initial),
      h('span', { class: 'avatar-name' }, name),
    );
    if (!this._accClose) {
      this._accClose = true;
      document.addEventListener('click', () => this.accountMenuEl?.classList.remove('open'));
      window.addEventListener('resize', () => this.accountMenuEl?.classList.remove('open'));
    }
    return btn;
  }

  async run(label, fn) {
    const t = this.toast(label + ' en cours…', 'info', 0);
    try {
      await fn();
      t.remove();
      this.toast(label + ' : terminé.');
    } catch (e) {
      console.error(e);
      t.remove();
      this.toast(label + ' : ' + e.message, 'error');
    }
  }

  setMode(m) {
    const a = this.app;
    a.viewer.setMode(m);
    a.sync();
    this.renderTopState();
    this.renderHud();
    this.updateImmersive();
  }

  renderHud() {
    const a = this.app;
    const m = a.viewer?.mode;
    const hint = {
      plan: 'Plan 2D · glisser un objet pour le déplacer · clic droit/gauche dans le vide pour faire glisser la vue · molette pour zoomer',
      orbit: 'Vue 3D · glisser dans le vide (ou Alt + glisser n’importe où) pour tourner autour · trackpad : balayer à deux doigts · boutons Face / Dos en bas pour changer de côté · glisser un objet pour le déplacer',
      visitor: 'Vue visiteur (1,65 m) · ZQSD / WASD ou flèches pour marcher · glisser pour regarder · Maj pour courir',
    }[m];
    const errs = a.alerts.filter((x) => x.level === 'error').length;
    const warns = a.alerts.length - errs;
    this.hud.replaceChildren(
      h(
        'button',
        { class: 'alert-badge ' + (errs ? 'err' : warns ? 'warn' : 'ok'), onClick: () => this.showTab('alerts', true) },
        errs || warns ? `${errs ? errs + ' alerte' + (errs > 1 ? 's' : '') : ''}${errs && warns ? ' · ' : ''}${warns ? warns + ' avertissement' + (warns > 1 ? 's' : '') : ''}` : '✓ Aucune collision',
      ),
      m === 'visitor' ? null : h('button', { class: 'hud-btn', onClick: () => (m === 'plan' ? this.setMode('plan') : a.viewer.homeOrbit()) }, 'Recentrer'),
    );
    // navigation 3D en un clic (utile au trackpad ou quand le stand est rempli d'objets)
    this.nav ||= h('div', { class: 'nav3d' });
    if (!this.nav.isConnected) this.viewport.append(this.nav);
    this.nav.hidden = m !== 'orbit';
    if (m === 'orbit' && !this.nav.childElementCount) {
      const b = (label, title, fn, cls = '') => h('button', { class: cls, title, onClick: fn }, label);
      this.nav.append(
        b('⟲', 'Tourner autour du stand vers la gauche (45°)', () => a.viewer.turn(-45), 'rot'),
        b('Face', 'Voir le stand depuis l’allée (face)', () => a.viewer.sideView('face')),
        b('Dos', 'Voir l’arrière du stand', () => a.viewer.sideView('dos')),
        b('Gauche', 'Voir le côté gauche', () => a.viewer.sideView('gauche')),
        b('Droite', 'Voir le côté droit', () => a.viewer.sideView('droite')),
        b('Dessus', 'Vue plongeante de dessus', () => a.viewer.sideView('dessus')),
        b('⟳', 'Tourner autour du stand vers la droite (45°)', () => a.viewer.turn(45), 'rot'),
      );
    }
    // barre d'état discrète : l'aide de navigation au survol du « ? », l'état d'enregistrement à droite
    const [titre, ...gestes] = (hint || '').split(' · ');
    const helpPop = h('div', { class: 'help-pop', hidden: !this.helpOpen }, h('b', {}, titre), h('ul', {}, gestes.map((g) => h('li', {}, g.charAt(0).toUpperCase() + g.slice(1)))), h('button', { class: 'btn sm', onClick: () => ((this.helpOpen = false), this.renderHud(), this.helpDialog()) }, 'Tous les raccourcis'));
    this.status.replaceChildren(
      h('span', { class: 'help-wrap' }, h('button', { class: 'help' + (this.helpOpen ? ' on' : ''), title: 'Aide à la navigation', onClick: () => ((this.helpOpen = !this.helpOpen), this.renderHud()) }, '?'), helpPop),
      h('span', { class: 'sp' }), (this.syncEl = h('span', { class: 'sync' })), (this.saveEl = h('span', { class: 'save' }, a.readOnly ? 'Lecture seule' : 'Enregistré ✓')));
    this.setSyncState(this.syncState);
  }

  setFps(f) {
    const el = this.status.querySelector('.fps');
    if (el) el.textContent = f + ' img/s';
  }
  setSaveState(s) {
    if (this.saveEl) this.saveEl.textContent = s === 'saving' ? 'Enregistrement…' : 'Enregistré ✓';
  }

  /* ---------------- panneau gauche ---------------- */

  renderLeft() {
    const tabs = [
      ['add', 'Ajouter'],
      ['visuals', 'Visuels'],
      ['stand', 'Stand'],
      ['style', 'Style'],
      ['layers', 'Calques'],
      ['content', 'Contenu'],
    ];
    const scroll = this.left.querySelector('.scroll')?.scrollTop || 0;
    this.left.replaceChildren(
      h(
        'nav',
        { class: 'tabs' },
        tabs.map(([k, l]) => h('button', { class: this.ltab === k ? 'on' : '', onClick: () => ((this.ltab = k), this.renderLeft()) }, l)),
      ),
    );
    const body = h('div', { class: 'scroll' });
    this.left.append(body);
    if (this.ltab === 'add') this.renderLibrary(body);
    if (this.ltab === 'visuals') this.renderVisuals(body);
    if (this.ltab === 'stand') this.renderStand(body);
    if (this.ltab === 'layers') this.renderLayers(body);
    if (this.ltab === 'content') this.renderContent(body);
    if (this.ltab === 'style') this.renderStyle(body);
    body.scrollTop = scroll;
  }

  card(label, objData, sub, photo) {
    // vignette : la photo du produit si elle existe (chargée à l'affichage), sinon un rendu 3D
    const img = h('img', { alt: '' });
    if (photo) Object.assign(img, { loading: 'lazy', className: 'photo', src: photo });
    else thumbFor(objData, img);
    const el = h(
      'div',
      {
        class: 'card',
        draggable: 'true',
        title: label + ' — cliquer puis poser dans le stand, ou glisser dans la scène',
        onClick: () => this.app.startPlacing({ ...objData }),
        onDragstart: (e) => e.dataTransfer.setData('text/x-object', JSON.stringify(objData)),
      },
      h('div', { class: 'thumb' }, img),
      h('div', { class: 'lbl' }, label, sub ? h('small', {}, sub) : null),
    );
    return el;
  }

  renderLibrary(body) {
    const a = this.app;
    const q = this.search.toLowerCase();
    // recherche par mot ou par référence, sans tenir compte des points ni des espaces (« A1416184 » trouve « A1.416.184 »)
    const flat = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const qf = flat(q);
    const match = (s) => !q || s.toLowerCase().includes(q) || (qf.length > 2 && flat(s).includes(qf));
    const search = h('input', {
      class: 'search',
      placeholder: 'Rechercher (comptoir, stéthoscope, réf. 507710…)',
      value: this.search,
      onInput: debounce((e) => {
        this.search = e.target.value;
        this.renderLeft();
        this.left.querySelector('.search')?.focus();
      }, 250),
    });
    body.append(
      search,
      h(
        'div',
        { class: 'row gap' },
        h('button', { class: 'btn sm', onClick: () => this.importModel() }, icon('upload'), 'Modèle 3D'),
        h('button', { class: 'btn sm', onClick: () => this.productDialog() }, '+ Nouveau produit'),
      ),
    );
    const F = this.libFilter;
    if (F) body.append(h('div', { class: 'filter-chip' }, 'Étape « ' + STEPS[this.step].label + ' »', h('button', { onClick: () => ((this.libFilter = null), this.renderLeft()) }, 'Tout afficher ×')));
    const section = (title, cards) => {
      if (!cards.length) return;
      if (F && !F.includes(title)) return;
      const open = q || this.openSections.has(title);
      const n = cards.filter((c) => c.classList?.contains('card')).length; // sans les intertitres de gamme
      const det = h('details', { open }, h('summary', {}, title, h('span', { class: 'count' }, n)), h('div', { class: 'cards' }, cards));
      det.addEventListener('toggle', () => (det.open ? this.openSections.add(title) : this.openSections.delete(title)));
      body.append(det);
    };
    // Produits Spengler (bibliothèque partagée, par marque puis gamme)
    const prods = a.library.filter((it) => it.kind === 'produit' && match(it.label + ' ' + it.brand + ' ' + (it.gamme || '')));
    const byBrand = {};
    for (const it of prods) (byBrand[it.brand || 'Sans marque'] ||= []).push(it);
    const brandCards = [];
    for (const br of Object.keys(byBrand).sort()) {
      brandCards.push(h('div', { class: 'brand-sep' }, br));
      for (const it of byBrand[br].sort((x, y) => (x.gamme || '').localeCompare(y.gamme || ''))) {
        const c = this.card(it.label, it.obj, it.gamme);
        c.append(this.libDel(it));
        brandCards.push(c);
      }
    }
    if (prods.length) section('Produits Spengler', brandCards);
    const mine = a.library.filter((it) => it.kind !== 'produit' && match(it.label));
    section(
      'Mes éléments',
      mine.map((it) => {
        const c = this.card(it.label, it.obj, it.brand);
        c.append(this.libDel(it));
        return c;
      }),
    );
    // carte d'une entrée du catalogue, avec son étoile « favori »
    const favs = getFavs();
    const catCard = (e) => {
      const sub = e.d.ref || e.d.brand ? [e.d.brand, e.d.ref ? 'réf. ' + e.d.ref : ''].filter(Boolean).join(' · ') : undefined;
      const c = this.card(e.label, fromCatalog(e), sub, e.photo);
      const key = favKey(e);
      c.append(
        h('button', {
          class: 'fav' + (favs.includes(key) ? ' on' : ''),
          title: favs.includes(key) ? 'Retirer des favoris' : 'Ajouter aux favoris',
          onClick: (ev) => {
            ev.stopPropagation();
            setFavs(favs.includes(key) ? favs.filter((k) => k !== key) : [...favs, key]);
            this.renderLeft();
          },
        }, favs.includes(key) ? '★' : '☆'),
      );
      return c;
    };
    // favoris en tête (produits posés souvent)
    const favItems = CATALOG.filter((e) => favs.includes(favKey(e)) && match(e.label + ' ' + (e.kw || '')));
    if (favItems.length && !F) {
      const det = h('details', { open: true }, h('summary', {}, '★ Favoris', h('span', { class: 'count' }, favItems.length)), h('div', { class: 'cards' }, favItems.map(catCard)));
      body.insertBefore(det, body.querySelector('details'));
    }
    for (const cat of CATEGORIES) {
      const items = CATALOG.filter((e) => e.cat === cat && match(e.label + ' ' + (e.kw || '')));
      if (cat === 'Catalogue Spengler Medical' || cat === 'Produits Medica 2026') {
        // regroupé par gamme, comme sur gsh-med.fr
        const cards = [];
        for (const g of [...new Set(items.map((e) => e.gamme))]) {
          cards.push(h('div', { class: 'brand-sep' }, g));
          for (const e of items.filter((x) => x.gamme === g)) cards.push(catCard(e));
        }
        if (items.length) section(cat, cards);
      } else section(cat, items.map(catCard));
    }
  }

  libDel(it) {
    return h(
      'button',
      {
        class: 'x',
        title: 'Retirer de la bibliothèque',
        onClick: async (e) => {
          e.stopPropagation();
          if (!(await this.confirm('Retirer « ' + it.label + ' » de la bibliothèque ?'))) return;
          this.app.library = this.app.library.filter((x) => x.id !== it.id);
          await this.app.saveLibrary();
          this.renderLeft();
        },
      },
      '×',
    );
  }

  async importModel() {
    const f = await pickFile(assets.ACCEPT_MODELS + ',.step,.stp');
    if (!f) return;
    const t = this.toast('Import de ' + f.name + '…', 'info', 0);
    try {
      const id = await assets.importFile(f);
      t.remove();
      this.app.addModel(id);
      this.toast('Modèle importé. Ajustez ses dimensions puis « Ajouter à la bibliothèque » pour le réutiliser.');
    } catch (e) {
      t.remove();
      this.toast(e.message, 'error');
    }
  }

  renderVisuals(body) {
    const a = this.app;
    const brandSel = h(
      'select',
      { value: this.brand, onChange: (e) => ((this.brand = e.target.value), this.renderLeft()) },
      h('option', { value: '' }, 'Toutes les marques'),
      BRANDS.map((b) => h('option', { value: b }, b)),
    );
    body.append(
      h('div', { class: 'row gap' }, brandSel, h('button', { class: 'btn sm primary', onClick: () => this.importVisuals() }, icon('upload'), 'Importer')),
      h('p', { class: 'muted' }, 'Cliquez un visuel pour en faire un kakémono, ou glissez-le sur une cloison, un comptoir, un caisson, une bannière ou un kakémono. Formats : JPG, PNG, SVG, PDF, vidéo MP4 (écrans). Vous pouvez aussi déposer un fichier directement dans la scène.'),
    );
    const list = assets.listAssets().filter((m) => (m.kind === 'image' || m.kind === 'video') && (!this.brand || m.brand === this.brand));
    const grid = h('div', { class: 'cards visuals' });
    for (const m of list) {
      const img = h('img', { alt: '' });
      const th = assets.thumb(m.id);
      if (th) img.src = th;
      else if (m.kind === 'image') assets.ensure(m.id).then(() => (img.src = assets.thumb(m.id) || ''));
      const c = h(
        'div',
        {
          class: 'card',
          draggable: 'true',
          title: m.name + (m.w ? ` — ${m.w} × ${m.h} px` : ''),
          onDragstart: (e) => e.dataTransfer.setData('text/x-asset', m.id),
          onClick: async () => {
            await assets.ensure(m.id);
            if (a.selected && TYPES[a.sel.type]?.images) a.applyImage(a.selected, m.id);
            else {
              const meta = assets.getMeta(m.id);
              const ratio = (meta.w || 1) / (meta.h || 1);
              const hh = 2;
              const ww = Math.round(Math.min(1.5, Math.max(0.6, hh * ratio)) * 100) / 100;
              a.startPlacing({ type: 'kakemono', name: 'Kakémono – ' + m.name.replace(/\.[^.]+$/, ''), w: ww, h: hh, mount: 'enrouleur', image: m.id, imageFit: 'cover', x: 0, y: 0, z: 0, rot: 0, zone: '' });
              this.toast('Kakémono créé avec ce visuel : cliquez dans le stand pour le poser (ou sélectionnez d’abord une cloison pour y appliquer le visuel).');
            }
          },
        },
        h('div', { class: 'thumb' + (m.alpha ? ' checker' : '') }, m.kind === 'video' ? h('div', { class: 'video-ph' }, '▶ vidéo') : img),
        h('div', { class: 'lbl' }, m.name, h('small', {}, (m.brand || '—') + (m.builtin ? ' · démo' : ''))),
      );
      if (!m.builtin) {
        c.append(
          h(
            'button',
            {
              class: 'x',
              title: 'Supprimer',
              onClick: async (e) => {
                e.stopPropagation();
                if (!(await this.confirm('Supprimer le visuel « ' + m.name + ' » de la bibliothèque ?'))) return;
                await assets.removeAsset(m.id);
                this.renderLeft();
              },
            },
            '×',
          ),
          h(
            'button',
            {
              class: 'x edit',
              title: 'Marque',
              onClick: async (e) => {
                e.stopPropagation();
                const b = await this.choose('Marque du visuel', ['', ...BRANDS], m.brand);
                if (b === null) return;
                await assets.updateMeta(m.id, { brand: b });
                this.renderLeft();
              },
            },
            '✎',
          ),
        );
      }
      grid.append(c);
    }
    body.append(grid);
    // polices de la charte
    const fonts = assets.listAssets('font');
    body.append(
      h('h4', {}, 'Polices de la charte'),
      h('div', { class: 'chips' }, fonts.length ? fonts.map((f) => h('span', { class: 'chip', style: { fontFamily: `"${f.family}"` } }, f.family)) : h('span', { class: 'muted' }, 'Aucune police importée')),
      h(
        'button',
        {
          class: 'btn sm',
          onClick: async () => {
            const f = await pickFile(assets.ACCEPT_FONTS);
            if (!f) return;
            await assets.importFile(f);
            this.toast('Police ajoutée : utilisable dans les objets « Texte ».');
            this.renderLeft();
          },
        },
        '+ Importer une police (TTF, OTF, WOFF)',
      ),
    );
  }

  async importVisuals() {
    const files = await pickFile(assets.ACCEPT_IMAGES, true);
    if (!files?.length) return;
    const t = this.toast(`Import de ${files.length} fichier(s)…`, 'info', 0);
    for (const f of files) {
      try {
        await assets.importFile(f, { brand: this.brand });
      } catch (e) {
        this.toast(f.name + ' : ' + e.message, 'error');
      }
    }
    t.remove();
    this.renderLeft();
  }

  renderStand(body) {
    const a = this.app;
    const p = a.project;
    const st = p.stand;
    const ro = a.readOnly;
    const len = (label, val, on) =>
      field(
        label,
        h('div', { class: 'unit-in' }, h('input', { value: a.toUnit(val), disabled: ro, inputmode: 'decimal', onChange: (e) => { const v = a.fromUnit(e.target.value); if (v != null && v > 0) on(v); else e.target.value = a.toUnit(val); } }), h('span', {}, a.settings.unit)),
      );
    const txt = (label, key) => field(label, h('input', { value: p[key] || '', disabled: ro, onChange: (e) => ((p[key] = e.target.value), a.commit('Projet'), this.renderTop()) }));
    body.append(
      h('h4', {}, 'Projet'),
      txt('Salon', 'salon'),
      txt('Lieu', 'lieu'),
      txt('Hall / n° de stand', 'hall'),
      txt('Dates', 'dates'),
      field(
        'Unité des cotes',
        h(
          'select',
          { value: a.settings.unit, onChange: (e) => ((a.settings.unit = e.target.value), a.saveSettings(), (a._standKey = null), a.sync(), this.refreshAll()) },
          h('option', { value: 'mm' }, 'millimètres (mm)'),
          h('option', { value: 'cm' }, 'centimètres (cm)'),
          h('option', { value: 'm' }, 'mètres (m)'),
        ),
      ),
      h('h4', {}, 'Dimensions'),
      len('Longueur (façade)', st.w, (v) => (a.setStand({ w: v }), this.renderTop())),
      len('Profondeur', st.d, (v) => (a.setStand({ d: v }), this.renderTop())),
      len('Hauteur max autorisée', st.hMax, (v) => a.setStand({ hMax: v })),
      field(
        'Type d’ouverture',
        h(
          'select',
          { value: openTypeOf(st.open), disabled: ro, onChange: (e) => a.setStand({ open: OPEN_TYPES[e.target.value].open }) },
          Object.entries(OPEN_TYPES).map(([k, t]) => h('option', { value: k }, t.label)),
        ),
      ),
      h('h4', {}, 'Revêtement de sol'),
      this.floorPicker(),
      field(
        'Type (avancé)',
        h(
          'select',
          {
            value: st.floor.type,
            disabled: ro,
            onChange: async (e) => {
              const type = e.target.value;
              if (type === 'texture' && !st.floor.asset) {
                const f = await pickFile('.jpg,.jpeg,.png,.webp');
                if (!f) return this.renderLeft();
                st.floor.asset = await assets.importFile(f, { library: false });
              }
              a.setStand({ floor: { ...st.floor, type } });
            },
          },
          Object.entries(FLOORS).map(([k, l]) => h('option', { value: k }, l)),
        ),
      ),
      st.floor.type === 'parquet'
        ? field('Essence', h('select', { value: st.floor.wood || 'chene', disabled: ro, onChange: (e) => a.setStand({ floor: { ...st.floor, wood: e.target.value } }) }, Object.entries(WOOD_LABELS).map(([k, l]) => h('option', { value: k }, l))))
        : null,
      st.floor.type !== 'parquet' && st.floor.type !== 'texture'
        ? field('Couleur personnalisée', h('input', { type: 'color', value: st.floor.color || '#5a97b0', disabled: ro, onChange: (e) => a.setStand({ floor: { ...st.floor, color: e.target.value } }) }))
        : null,
      st.floor.type === 'texture'
        ? h(
            'div',
            { class: 'row gap' },
            h('button', { class: 'btn sm', onClick: async () => { const f = await pickFile('.jpg,.jpeg,.png,.webp'); if (!f) return; const id = await assets.importFile(f, { library: false }); a.setStand({ floor: { ...st.floor, asset: id } }); } }, 'Changer la texture'),
            len('Taille du motif', st.floor.tile || 1, (v) => a.setStand({ floor: { ...st.floor, tile: v } })),
          )
        : null,
      h('h4', {}, 'Grille et cotes'),
      check('Aimantation à la grille', st.snap !== false, (v) => a.setStand({ snap: v }), ro),
      field(
        'Pas de la grille',
        h(
          'select',
          { value: String(st.grid), disabled: ro, onChange: (e) => a.setStand({ grid: parseFloat(e.target.value) }) },
          [0.01, 0.05, 0.1, 0.2, 0.25, 0.5, 1].map((g) => h('option', { value: String(g) }, g * 100 + ' cm')),
        ),
      ),
      check('Afficher les cotes du stand', st.dims !== false, (v) => a.setStand({ dims: v }), ro),
      h('p', { class: 'muted' }, 'Maintenez Maj pendant un déplacement pour désactiver l’aimantation.'),
      h('h4', {}, 'Environnement du hall'),
      check('Allées et stands voisins', !!st.env, (v) => a.setStand({ env: v }), ro),
      st.env ? len('Largeur des allées', st.aisle || 3, (v) => a.setStand({ aisle: v })) : null,
      h('h4', {}, 'Plan de fond (plan du standiste)'),
      st.plan
        ? h(
            'div',
            {},
            field('Opacité', h('input', { type: 'range', min: 0.1, max: 1, step: 0.05, value: st.plan.opacity ?? 0.6, disabled: ro, onChange: (e) => a.setStand({ plan: { ...st.plan, opacity: parseFloat(e.target.value) } }) })),
            len('Largeur du plan', st.plan.width, (v) => a.setStand({ plan: { ...st.plan, width: v } })),
            len('Position X (centre)', st.plan.x, (v) => a.setStand({ plan: { ...st.plan, x: v } })),
            len('Position Z (centre)', st.plan.z, (v) => a.setStand({ plan: { ...st.plan, z: v } })),
            field('Rotation (°)', h('input', { type: 'number', step: 1, value: st.plan.rot || 0, disabled: ro, onChange: (e) => a.setStand({ plan: { ...st.plan, rot: parseFloat(e.target.value) || 0 } }) })),
            h(
              'div',
              { class: 'row gap' },
              h('button', { class: 'btn sm primary', onClick: () => (this.setMode('plan'), a.setTool('calibrate')) }, 'Mettre à l’échelle (2 points)'),
              h('button', { class: 'btn sm', onClick: () => a.setStand({ plan: null }) }, 'Retirer'),
            ),
          )
        : h(
            'button',
            {
              class: 'btn sm',
              disabled: ro,
              onClick: async () => {
                const f = await pickFile('.pdf,.png,.jpg,.jpeg,.dxf,.dwg');
                if (!f) return;
                try {
                  const id = await assets.importFile(f, { library: false });
                  a.setStand({ plan: { asset: id, width: st.w * 1.2, x: st.w / 2, z: st.d / 2, rot: 0, opacity: 0.6 } });
                  this.setMode('plan');
                  this.toast('Plan importé. Utilisez « Mettre à l’échelle » avec deux points de cote connue.');
                } catch (e) {
                  this.toast(e.message, 'error');
                }
              },
            },
            icon('upload'),
            'Importer un plan (PDF, image)',
          ),
    );
  }

  renderLayers(body) {
    const a = this.app;
    const p = a.project;
    const zones = {};
    for (const o of p.objects) (zones[o.zone || ''] ||= []).push(o);
    body.append(h('p', { class: 'muted' }, 'Les zones servent de calques : masquez-les pour comparer des implantations. Affectez une zone dans les propriétés d’un objet.'));
    for (const z of Object.keys(zones).sort((x, y) => (x === '' ? 1 : y === '' ? -1 : x.localeCompare(y)))) {
      const hidden = p.hiddenZones.includes(z);
      const det = h(
        'details',
        { open: !hidden && Object.keys(zones).length < 7 },
        h(
          'summary',
          { class: 'zone' },
          h('span', { class: 'zname' }, z || 'Sans zone'),
          h('span', { class: 'count' }, zones[z].length),
          h(
            'button',
            {
              class: 'eye' + (hidden ? ' off' : ''),
              title: hidden ? 'Afficher' : 'Masquer',
              onClick: (e) => {
                e.preventDefault();
                p.hiddenZones = hidden ? p.hiddenZones.filter((x) => x !== z) : [...p.hiddenZones, z];
                a.commit('Calques');
              },
              html: hidden ? ICON.eyeOff : ICON.eye,
            },
          ),
        ),
        h(
          'ul',
          { class: 'outliner' },
          zones[z].map((o) => h('li', { class: (a.selected === o.id ? 'on ' : '') + (a.bad.has(o.id) ? 'bad' : ''), onClick: () => a.select(o.id) }, o.name, h('small', {}, TYPES[o.type]?.label || o.type))),
        ),
      );
      body.append(det);
    }
  }

  /** Contenu du stand : tous les éléments posés, par catégorie, avec quantités ; mesures */
  renderContent(body) {
    const a = this.app;
    const p = a.project;
    // catégorie d'un objet : celle de son type dans le catalogue (produits regroupés)
    const catOfType = {};
    for (const e of CATALOG) catOfType[e.type] ||= e.cat;
    const catOf = (o) => (['product', 'device', 'model'].includes(o.type) ? 'Produits' : { 'Catalogue Spengler Medical': 'Produits', 'Produits Medica 2026': 'Produits', 'Gabarits produits': 'Produits' }[catOfType[o.type]] || catOfType[o.type] || 'Autres');
    const ORDER = ['Produits', 'Mobilier', 'Structure', 'PLV & écrans', 'Éclairage', 'Décor', 'Personnages', 'Autres'];
    const groups = {};
    for (const o of p.objects) {
      const cat = catOf(o);
      const key = [o.name, o.ref || '', o.brand || ''].join('|');
      const g = ((groups[cat] ||= {})[key] ||= { name: o.name, ref: o.ref, brand: o.brand, type: o.type, ids: [] });
      g.ids.push(o.id);
    }
    const nProd = Object.values(groups.Produits || {}).reduce((n, g) => n + g.ids.length, 0);
    body.append(
      h('p', { class: 'muted' }, `${p.objects.length} élément(s) dans le stand, dont ${nProd} produit(s). Cliquez une ligne pour sélectionner l’élément (cliquez à nouveau pour passer au suivant).`),
      h('button', { class: 'btn sm', onClick: () => X.exportCSV(a) }, 'Exporter la liste (Excel / CSV)'),
    );
    for (const cat of ORDER.filter((c) => groups[c])) {
      const items = Object.values(groups[cat]).sort((x, y) => (x.brand || '').localeCompare(y.brand || '') || x.name.localeCompare(y.name));
      const count = items.reduce((n, g) => n + g.ids.length, 0);
      body.append(
        h(
          'details',
          { open: true },
          h('summary', { class: 'zone' }, h('span', { class: 'zname' }, cat), h('span', { class: 'count' }, count)),
          h(
            'ul',
            { class: 'outliner content-list' },
            items.map((g) => {
              const sel = g.ids.indexOf(a.selected);
              const hidden = g.ids.every((id) => p.hiddenZones.includes(a.obj(id)?.zone || ''));
              return h(
                'li',
                { class: (sel >= 0 ? 'on ' : '') + (hidden ? 'hidden' : ''), title: hidden ? 'Élément masqué (calque)' : '', onClick: () => a.select(g.ids[(sel + 1) % g.ids.length]) },
                h('span', { class: 'cname' }, g.name),
                g.ids.length > 1 ? h('b', { class: 'qty' }, '× ' + g.ids.length) : null,
                h('small', {}, [g.brand, g.ref ? 'réf. ' + g.ref : '', !g.brand && !g.ref ? TYPES[g.type]?.label || g.type : ''].filter(Boolean).join(' · ')),
              );
            }),
          ),
        ),
      );
    }
    // mesures prises avec l'outil Mesurer
    const ms = p.measures || [];
    if (ms.length) {
      body.append(
        h(
          'details',
          { open: true },
          h('summary', { class: 'zone' }, h('span', { class: 'zname' }, 'Mesures'), h('span', { class: 'count' }, ms.length)),
          h(
            'ul',
            { class: 'outliner content-list' },
            ms.map((m, i) => {
              const d = Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1], m.b[2] - m.a[2]);
              return h('li', {}, h('span', { class: 'cname' }, 'Mesure ' + (i + 1) + ' : ' + a.fmtLen(d)), h('button', { class: 'li-del', title: 'Supprimer cette mesure', onClick: (e) => (e.stopPropagation(), a.removeMeasure(i)) }, '×'));
            }),
          ),
          h('button', { class: 'btn sm', onClick: () => a.removeMeasure(null) }, 'Effacer toutes les mesures'),
        ),
      );
    }
    if (!p.objects.length && !ms.length) body.append(h('p', { class: 'muted' }, 'Le stand est vide : ajoutez des éléments depuis l’onglet « Ajouter ».'));
  }

  /* ---------------- panneau droit ---------------- */

  showTab(t, open = false) {
    this.rtab = t;
    // un clic explicite (alertes, budget, commentaires…) rouvre le panneau de droite s'il est replié
    if (open && this.panels?.right) {
      this.panels.right = false;
      this.applyPanels();
    }
    this.renderRight();
  }

  renderRight() {
    const a = this.app;
    const nA = a.alerts.length;
    const nC = a.project.comments.filter((c) => !c.resolved).length;
    const focusKey = document.activeElement?.dataset?.key;
    const scroll = this.right.querySelector('.scroll')?.scrollTop || 0;
    const tabs = [
      ['props', 'Objet'],
      ['alerts', 'Alertes' + (nA ? ` (${nA})` : '')],
      ['comments', 'Commentaires' + (nC ? ` (${nC})` : '')],
      ['views', 'Vues'],
      ['budget', 'Budget'],
    ];
    const body = h('div', { class: 'scroll' });
    this.right.replaceChildren(h('nav', { class: 'tabs' }, tabs.map(([k, l]) => h('button', { class: this.rtab === k ? 'on' : '', onClick: () => this.showTab(k) }, l))), body);
    if (this.rtab === 'props') this.renderProps(body);
    if (this.rtab === 'alerts') this.renderAlerts(body);
    if (this.rtab === 'comments') this.renderComments(body);
    if (this.rtab === 'views') this.renderViews(body);
    if (this.rtab === 'budget') this.renderBudget(body);
    body.scrollTop = scroll;
    if (focusKey) body.querySelector(`[data-key="${focusKey}"]`)?.focus();
  }

  /** Menu du clic droit sur un élément (ou une sélection multiple) */
  contextMenu(x, y) {
    const a = this.app;
    this.ctxEl?.remove();
    const n = a.selection.length;
    const close = () => {
      this.ctxEl?.remove();
      this.ctxEl = null;
      window.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('keydown', esc, true);
    };
    const outside = (e) => !this.ctxEl?.contains(e.target) && close();
    const esc = (e) => e.key === 'Escape' && close();
    const item = (ic, label, fn, cls = '') => h('button', { class: cls, onClick: () => (close(), fn()) }, ic ? icon(ic) : h('span', { class: 'ic' }), label);
    const menu = h(
      'div',
      { class: 'menu ctx open' },
      h('div', { class: 'menu-head' }, h('b', {}, n > 1 ? `${n} éléments` : a.sel?.name || '')),
      h('hr'),
      item('copy', n > 1 ? 'Dupliquer la sélection' : 'Dupliquer', () => a.duplicate()),
      item('rotL', 'Pivoter de −90°', () => a.rotate(-90)),
      item('rotR', 'Pivoter de +90°', () => a.rotate(90)),
      item(null, 'Poser sur un meuble…', () => a.setTool('poseSur')),
      n > 1 ? h('hr') : null,
      n > 1 ? item(null, 'Aligner sur une ligne', () => a.alignSelection()) : null,
      n > 2 ? item(null, 'Espacer régulièrement', () => a.distributeSelection()) : null,
      n > 1 ? item(null, 'Même orientation', () => a.sameRotation()) : null,
      h('hr'),
      item(null, 'Voir dans « Contenu »', () => this.showInContent()),
      item('trash', n > 1 ? `Supprimer les ${n} éléments` : 'Supprimer', () => a.remove(), 'danger'),
    );
    // sous Windows, le menu du navigateur s'ouvre au relâchement du clic droit, sur l'élément sous le curseur
    // (ce menu-ci) : on l'empêche
    menu.addEventListener('contextmenu', (e) => e.preventDefault());
    document.body.append(menu);
    // dans la fenêtre, près du curseur
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.min(x, innerWidth - r.width - 8) + 'px';
    menu.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
    this.ctxEl = menu;
    setTimeout(() => {
      window.addEventListener('pointerdown', outside, true);
      window.addEventListener('keydown', esc, true);
    });
  }

  /** Ouvre l'onglet « Contenu » sur l'élément sélectionné */
  showInContent() {
    this.ltab = 'content';
    if (this.panels.left) this.togglePanel('left');
    this.renderLeft();
    this.left.querySelector('.content-list li.on')?.scrollIntoView({ block: 'center' });
  }

  /** Panneau de droite pour une sélection multiple */
  renderMultiProps(body) {
    const a = this.app;
    const ids = a.selection;
    const n = ids.length;
    const act = (label, fn, title, disabled = false) => h('button', { class: 'btn sm', title, disabled, onClick: fn }, label);
    body.append(
      h('div', { class: 'ptitle' }, h('small', {}, 'Sélection multiple'), h('b', { class: 'multi-n' }, `${n} éléments sélectionnés`)),
      h('div', { class: 'actions' },
        h('button', { class: 'ibtn', title: 'Pivoter −15° (Maj+R)', onClick: () => a.rotate(-15) }, icon('rotL')),
        h('button', { class: 'ibtn', title: 'Pivoter +15° (R)', onClick: () => a.rotate(15) }, icon('rotR')),
        h('button', { class: 'ibtn', title: 'Dupliquer la sélection (⌘D)', onClick: () => a.duplicate() }, icon('copy')),
        h('button', { class: 'ibtn danger', title: 'Supprimer la sélection (Suppr)', onClick: () => a.remove() }, icon('trash')),
      ),
      h('h4', {}, 'Disposer'),
      h('div', { class: 'multi-acts' },
        act('Aligner sur une ligne', () => a.alignSelection(), 'Place les éléments sur la ligne qui joint les deux plus éloignés'),
        act('Espacer régulièrement', () => a.distributeSelection(), 'Même écart entre les éléments, du premier au dernier (3 éléments minimum)', n < 3),
        act('Même orientation', () => a.sameRotation(), 'Tous orientés comme l’élément principal (cadre bleu foncé)'),
        act('Poser sur un meuble…', () => a.setTool('poseSur'), 'Puis cliquez sur le comptoir, le socle ou la table : les éléments sont répartis sur sa largeur'),
      ),
      h('h4', {}, 'Éléments'),
      h('ul', { class: 'outliner content-list' }, ids.map((id) => {
        const o = a.obj(id);
        return h('li', { class: id === a.selected ? 'on' : '' }, h('span', { class: 'cname' }, o.name), h('button', { class: 'li-del', title: 'Retirer de la sélection', onClick: () => a.select(id, { toggle: true }) }, '×'));
      })),
      h('p', { class: 'muted' }, 'Maj + clic pour ajouter ou retirer un élément · Maj + glisser dans le vide pour sélectionner une zone · glissez un des éléments pour déplacer tout le groupe.'),
      act('Tout désélectionner', () => a.select(null)),
    );
  }

  renderProps(body) {
    const a = this.app;
    if (a.selection.length > 1) return this.renderMultiProps(body);
    const o = a.sel;
    if (!o) {
      const p = a.project;
      const st = p.stand;
      body.append(
        h('div', { class: 'empty' }, h('b', {}, 'Aucun objet sélectionné'), h('p', {}, 'Cliquez sur un élément du stand pour le modifier.')),
        h(
          'div',
          { class: 'stats' },
          stat('Surface', (st.w * st.d).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' m²'),
          stat('Objets', p.objects.length),
          stat('Hauteur max', a.fmtLen(st.hMax)),
          stat('Ouverture', OPEN_TYPES[openTypeOf(st.open)].label.split(' (')[0]),
        ),
        h('h4', {}, 'Taille du stand'),
        this.standSizeFields(),
        h('p', { class: 'muted' }, 'Astuce : tirez les poignées bleues ⟷ sur les bords du stand. Les cloisons collées au bord suivent et celles qui font toute la longueur s’étirent.'),
        h('h4', {}, 'Sol du stand'),
        this.floorPicker(),
      );
      return;
    }
    const ro = a.readOnly;
    const T = TYPES[o.type] || { fields: [] };
    const upd = (patch, commit = true) => a.update(o.id, patch, { commit });
    body.append(
      h('div', { class: 'ptitle' }, h('small', {}, T.label || o.type), h('input', { class: 'oname', 'data-key': 'name', value: o.name, disabled: ro, onChange: (e) => upd({ name: e.target.value }) })),
      ro
        ? null
        : h(
            'div',
            { class: 'actions' },
            h('button', { class: 'ibtn', title: 'Pivoter −15° (Maj+R)', onClick: () => a.rotate(-15) }, icon('rotL')),
            h('button', { class: 'ibtn', title: 'Pivoter +15° (R)', onClick: () => a.rotate(15) }, icon('rotR')),
            h('button', { class: 'ibtn', title: 'Dupliquer (⌘D)', onClick: () => a.duplicate() }, icon('copy')),
            h('button', { class: 'ibtn', title: 'Commenter', onClick: () => a.startComment() }, icon('comment')),
            h('button', { class: 'ibtn', title: 'Ajouter à la bibliothèque', onClick: () => this.saveToLibrary(o) }, icon('star')),
            h('button', { class: 'ibtn danger', title: 'Supprimer (Suppr)', onClick: () => a.remove() }, icon('trash')),
          ),
    );
    // bouton d'ouverture des portes (réserve, comptoir avec rangement)
    const hasDoors = T.doors && !(o.type === 'counter' && (!o.doors || o.doors === 'aucune')) && !(o.type === 'storage' && o.doorSide === 'none');
    if (hasDoors) {
      const isOpen = (o.doorOpen || 0) > 0;
      body.append(
        h(
          'button',
          { class: 'btn full door-btn' + (isOpen ? '' : ' primary'), onClick: () => a.update(o.id, { doorOpen: isOpen ? 0 : 90 }) },
          isOpen ? 'Fermer les portes' : 'Ouvrir les portes',
        ),
        h('p', { class: 'muted', style: { marginTop: '4px' } }, 'Ou double-cliquez sur le meuble dans la vue 3D. ' + (o.type === 'counter' ? 'Les portes sont à l’arrière, côté exposant.' : '')),
      );
    } else if (o.type === 'counter') {
      body.append(h('p', { class: 'muted' }, 'Ce comptoir est plein : choisissez « 1 porte » ou « 2 portes » dans « Rangement » pour pouvoir l’ouvrir.'));
    }
    const alerts = a.alerts.filter((x) => x.ids.includes(o.id));
    if (alerts.length) body.append(h('div', { class: 'obj-alerts' }, alerts.map((x) => h('div', { class: x.level }, x.msg))));

    const lenIn = (key, label, val, min = -100) =>
      field(
        label,
        h(
          'div',
          { class: 'unit-in' },
          h('input', {
            'data-key': key,
            value: a.toUnit(val || 0),
            inputmode: 'decimal',
            disabled: ro,
            onChange: (e) => {
              const v = a.fromUnit(e.target.value);
              if (v == null || v < min) return (e.target.value = a.toUnit(val || 0));
              upd({ [key]: v });
            },
          }),
          h('span', {}, a.settings.unit),
        ),
      );

    // position
    const pos = h('div', { class: 'grid2' });
    pos.append(lenIn('x', 'X (depuis la gauche)', o.x), lenIn('z', 'Z (depuis le fond)', o.z));
    if (!T.fields.includes('y')) pos.append(lenIn('y', 'Élévation', o.y || 0));
    pos.append(
      field(
        'Rotation (°)',
        h('input', { type: 'number', step: 15, 'data-key': 'rot', value: o.rot || 0, disabled: ro, onChange: (e) => upd({ rot: ((((parseFloat(e.target.value) || 0) % 360) + 540) % 360) - 180 }) }),
      ),
    );
    this.posInputs = pos;
    // trois onglets : Dimensions (position + taille) · Finition · Visuel
    const paneDims = h('div', {});
    const paneFin = h('div', {});
    const paneVis = h('div', {});
    paneDims.append(h('h4', {}, 'Position'), pos);
    const zones = [...new Set(a.project.objects.map((x) => x.zone).filter(Boolean))];
    paneDims.append(
      field('Zone / calque', h('input', { list: 'zones-dl', 'data-key': 'zone', value: o.zone || '', placeholder: 'ex. Cardio', disabled: ro, onChange: (e) => upd({ zone: e.target.value.trim() }) })),
      h('datalist', { id: 'zones-dl' }, zones.map((z) => h('option', { value: z }))),
    );

    // dimensions & finitions
    const dimsBox = h('div', { class: 'grid2' });
    const other = h('div', {});
    for (const k of T.fields) {
      const F = o.type === 'spot' && k === 'angle' ? SPOT_ANGLE : FIELD[k];
      if (!F) continue;
      const v = o[k];
      if (F.kind === 'len') {
        dimsBox.append(lenIn(k, F.label, v ?? 0, F.min ?? 0));
      } else if (F.kind === 'num') {
        dimsBox.append(field(F.label, h('input', { type: 'number', 'data-key': k, min: F.min, max: F.max, step: F.step || 1, value: v ?? F.min, disabled: ro, onChange: (e) => upd({ [k]: parseFloat(e.target.value) }) })));
      } else if (F.kind === 'range') {
        const out = h('span', { class: 'rv' }, fmtRange(k, v ?? (k === 'doorOpen' ? 0 : v)));
        other.append(
          field(
            F.label,
            h(
              'div',
              { class: 'range' },
              h('input', {
                type: 'range',
                min: F.min,
                max: F.max,
                step: F.step,
                value: v ?? F.min,
                disabled: ro,
                onInput: (e) => {
                  out.textContent = fmtRange(k, parseFloat(e.target.value));
                  upd({ [k]: parseFloat(e.target.value) }, false);
                },
                onChange: () => a.commit('Réglage'),
              }),
              out,
            ),
          ),
        );
      } else if (F.kind === 'bool') {
        other.append(check(F.label, !!v, (val) => upd({ [k]: val }), ro));
      } else if (F.kind === 'select') {
        other.append(field(F.label, h('select', { value: v ?? Object.keys(F.options)[0], disabled: ro, onChange: (e) => upd({ [k]: e.target.value }) }, Object.entries(F.options).map(([ov, ol]) => h('option', { value: ov }, ol)))));
      } else if (F.kind === 'kformat') {
        const cur = Object.keys(F.options).find((k) => k !== 'libre' && k === `${o.w}x${o.h}`) || 'libre';
        other.append(
          field(
            F.label,
            h(
              'select',
              {
                value: cur,
                disabled: ro,
                onChange: (e) => {
                  if (e.target.value === 'libre') return;
                  const [w, hh] = e.target.value.split('x').map(Number);
                  upd({ w, h: hh });
                },
              },
              Object.entries(F.options).map(([ov, ol]) => h('option', { value: ov }, ol)),
            ),
          ),
        );
      } else if (F.kind === 'finish') {
        other.append(field(F.label, h('select', { value: v || '', disabled: ro, onChange: (e) => upd({ [k]: e.target.value || null }) }, k !== 'finish' ? h('option', { value: '' }, '— identique —') : null, Object.entries(FINISHES).map(([fk, f]) => h('option', { value: fk }, f.label)))));
      } else if (F.kind === 'color') {
        const pal = o.type === 'device' && DEVICE_PALETTES[o.model];
        if (pal)
          other.append(
            field(
              'Coloris',
              h(
                'div',
                { class: 'swatches' },
                Object.entries(pal).map(([nm, c]) =>
                  h('button', { class: 'swatch color' + ((v || '').toLowerCase() === c ? ' on' : ''), title: nm, disabled: ro, style: { background: c }, onClick: () => upd({ color: c, name: o.name.replace(/–\s*[^–]+$/, '– ' + nm.toLowerCase()) }) }),
                ),
              ),
            ),
          );
        other.append(
          field(
            F.label,
            h(
              'div',
              { class: 'row gap' },
              h('input', { type: 'color', value: v || '#ffffff', disabled: ro, onChange: (e) => upd({ color: e.target.value }) }),
              o.type !== 'text' && v ? h('button', { class: 'btn sm', disabled: ro, onClick: () => upd({ color: null }) }, 'Couleur de la finition') : null,
            ),
          ),
        );
      } else if (F.kind === 'text') {
        const multi = k === 'text';
        other.append(field(F.label, h(multi ? 'textarea' : 'input', { 'data-key': k, value: v || '', rows: 2, disabled: ro, onChange: (e) => upd({ [k]: e.target.value }) })));
      } else if (F.kind === 'font') {
        const list = [...SYSTEM_FONTS, ...assets.fonts()];
        other.append(field(F.label, h('select', { value: v, disabled: ro, onChange: (e) => upd({ font: e.target.value }) }, list.map((f) => h('option', { value: f, style: { fontFamily: f } }, f)))));
      } else if (F.kind === 'brand') {
        other.append(field(F.label, h('select', { value: v || '', disabled: ro, onChange: (e) => upd({ brand: e.target.value }) }, h('option', { value: '' }, '—'), BRANDS.map((b) => h('option', { value: b }, b)))));
      }
    }
    if (T.fields.includes('finish') && !['spot', 'led', 'visual', 'text', 'model', 'wall', 'curvedWall', 'storage'].includes(o.type) && !T.mounted && !T.hanging) other.append(check(FIELD.attached.label, !!o.attached, (val) => upd({ attached: val }), ro));
    const presets = SIZE_PRESETS[o.type];
    const chips = presets
      ? h(
          'div',
          { class: 'sizes' },
          Object.entries(presets).map(([k, vals]) =>
            h(
              'div',
              { class: 'size-row' },
              h('span', {}, (k === 'inches' ? 'Diagonale' : FIELD[k]?.label.split(' /')[0]) + ' :'),
              vals.map((v) =>
                h(
                  'button',
                  { class: 'chip-btn' + (Math.abs((o[k] || 0) - v) < 1e-6 ? ' on' : ''), disabled: ro, onClick: () => upd({ [k]: v }) },
                  k === 'inches' ? v + '"' : a.fmtLen(v).replace(' mm', ''),
                ),
              ),
            ),
          ),
        )
      : null;
    if (chips || dimsBox.childElementCount) paneDims.append(...[h('h4', {}, 'Dimensions'), chips, dimsBox].filter(Boolean));
    if (o.type === 'model') {
      const m = assets.getMeta(o.model);
      if (m) paneDims.append(h('p', { class: 'muted' }, `Fichier : ${m.name} · ${(m.tris || 0).toLocaleString('fr-FR')} triangles`));
    }
    if (other.childElementCount) paneFin.append(other);

    // visuels
    for (const key of T.images || []) {
      if (key === 'imageBack' && o.type === 'lightbox' && !o.doubleSided && !o.imageBack) continue;
      paneVis.append(this.imageField(o, key, ro));
    }
    if (T.graphic && (o.image || o.imageBack)) {
      const g = h('div', { class: 'grid2' });
      g.append(lenIn('gMargin', 'Marge du visuel', o.gMargin || 0, 0), lenIn('gRadius', 'Rayon des angles', o.gRadius || 0, 0));
      paneVis.append(g);
    }

    // onglets présents pour cet objet ; le dernier choisi reste ouvert d'un objet à l'autre
    const panes = [
      ['dims', 'Dimensions', paneDims],
      ['fin', 'Finition', paneFin],
      ['vis', 'Visuel', paneVis],
    ].filter(([, , el]) => el.childElementCount);
    if (!panes.some(([k]) => k === this.propTab)) this.propTab = panes[0]?.[0];
    const show = (k) => {
      this.propTab = k;
      for (const [pk, , el] of panes) el.hidden = pk !== k;
      nav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
    };
    const nav = h('nav', { class: 'ptabs' }, panes.map(([k, l]) => h('button', { 'data-k': k, onClick: () => show(k) }, l)));
    if (panes.length > 1) body.append(nav);
    body.append(...panes.map(([, , el]) => el));
    show(this.propTab);

    // commentaires liés
    const cs = a.project.comments.filter((c) => c.objId === o.id);
    if (cs.length) {
      body.append(h('h4', {}, 'Commentaires'), cs.map((c) => this.commentEl(c)));
    }
  }

  livePos(o) {
    if (!this.posInputs) return;
    const set = (k, v) => {
      const i = this.posInputs.querySelector(`[data-key="${k}"]`);
      if (i) i.value = v;
    };
    set('x', this.app.toUnit(o.x));
    set('z', this.app.toUnit(o.z));
    set('y', this.app.toUnit(o.y || 0));
  }
  liveRot(r) {
    const i = this.posInputs?.querySelector('[data-key="rot"]');
    if (i) i.value = r;
  }

  imageField(o, key, ro) {
    const a = this.app;
    const id = o[key];
    const meta = id && assets.getMeta(id);
    const dpi = a.cache.get(o.id)?.group.userData.dpi?.[key];
    const set = (patch) => a.update(o.id, patch);
    const thumb = h('div', { class: 'img-drop' + (meta?.alpha ? ' checker' : '') });
    if (meta) {
      const t = assets.thumb(id);
      if (meta.kind === 'video') thumb.append(h('div', { class: 'video-ph' }, '▶ ' + meta.name));
      else if (t) thumb.append(h('img', { src: t }));
    } else thumb.append(h('span', {}, 'Déposez une image ici'));
    if (!ro) {
      thumb.addEventListener('dragover', (e) => (e.preventDefault(), thumb.classList.add('over')));
      thumb.addEventListener('dragleave', () => thumb.classList.remove('over'));
      thumb.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        let aid = e.dataTransfer.getData('text/x-asset');
        if (!aid && e.dataTransfer.files[0]) {
          try {
            aid = await assets.importFile(e.dataTransfer.files[0]);
          } catch (err) {
            return this.toast(err.message, 'error');
          }
        }
        if (aid) set({ [key]: aid });
      });
    }
    const box = h(
      'div',
      { class: 'imgfield' },
      h('h4', {}, IMAGE_LABELS[key] || key),
      thumb,
      meta
        ? h(
            'div',
            { class: 'imeta' },
            h('span', {}, meta.name),
            meta.w ? h('span', {}, `${meta.w} × ${meta.h} px`) : null,
            dpi != null ? h('span', { class: 'dpi ' + (dpi < 100 ? 'bad' : 'ok') }, `${dpi} dpi à taille réelle${dpi < 100 ? ' — insuffisant' : ''}`) : meta.demo ? h('span', { class: 'dpi' }, 'visuel de démonstration') : null,
          )
        : null,
      ro
        ? null
        : h(
            'div',
            { class: 'row gap' },
            h('button', { class: 'btn sm', onClick: async () => { const pick = await this.pickAsset(); if (pick) set({ [key]: pick }); } }, 'Bibliothèque…'),
            h('button', { class: 'btn sm', onClick: async () => { const f = await pickFile(assets.ACCEPT_IMAGES); if (!f) return; try { set({ [key]: await assets.importFile(f, { brand: o.brand || '' }) }); } catch (e) { this.toast(e.message, 'error'); } } }, 'Importer…'),
            id ? h('button', { class: 'btn sm', onClick: () => set({ [key]: null }) }, 'Retirer') : null,
          ),
    );
    if (id && !ro) {
      const fit = o[key + 'Fit'] || 'cover';
      box.append(
        h(
          'div',
          { class: 'grid2' },
          field('Cadrage', h('select', { value: fit, onChange: (e) => set({ [key + 'Fit']: e.target.value }) }, h('option', { value: 'cover' }, 'Remplir (recadrer)'), h('option', { value: 'contain' }, 'Ajuster (sans recadrer)'), h('option', { value: 'stretch' }, 'Étirer'))),
          rangeField('Zoom', o[key + 'Zoom'] || 1, 1, 4, 0.05, (v, c) => a.update(o.id, { [key + 'Zoom']: v }, { commit: c })),
          rangeField('Décalage horizontal', o[key + 'Ox'] || 0, -1, 1, 0.02, (v, c) => a.update(o.id, { [key + 'Ox']: v }, { commit: c })),
          rangeField('Décalage vertical', o[key + 'Oy'] || 0, -1, 1, 0.02, (v, c) => a.update(o.id, { [key + 'Oy']: v }, { commit: c })),
        ),
      );
    }
    return box;
  }

  async pickAsset() {
    const list = assets.listAssets().filter((m) => m.kind === 'image' || m.kind === 'video');
    let chosen = null;
    const grid = h('div', { class: 'cards visuals picker' });
    for (const m of list) {
      const img = h('img', {});
      if (assets.thumb(m.id)) img.src = assets.thumb(m.id);
      else if (m.kind === 'image') assets.ensure(m.id).then(() => (img.src = assets.thumb(m.id) || ''));
      grid.append(h('div', { class: 'card', onClick: () => ((chosen = m.id), close()) }, h('div', { class: 'thumb' }, m.kind === 'video' ? h('div', { class: 'video-ph' }, '▶') : img), h('div', { class: 'lbl' }, m.name, h('small', {}, m.brand || '—'))));
    }
    const { close, done } = this.modal('Choisir un visuel', grid, [['Annuler', null]]);
    await done;
    if (chosen) await assets.ensure(chosen);
    return chosen;
  }

  async saveToLibrary(o) {
    const a = this.app;
    const isProd = o.type === 'product' || o.type === 'model' || !!o.brand;
    const name = h('input', { value: o.name });
    const kind = h('select', { value: isProd ? 'produit' : 'element' }, h('option', { value: 'produit' }, 'Produits Spengler (par marque)'), h('option', { value: 'element' }, 'Mes éléments (mobilier, PLV…)'));
    const brand = h('select', { value: o.brand || '' }, h('option', { value: '' }, '—'), BRANDS.map((b) => h('option', { value: b }, b)));
    const gamme = h('input', { value: o.gamme || '', placeholder: 'ex. Tensiomètres' });
    const { done } = this.modal('Ajouter à la bibliothèque', h('div', { class: 'form' }, field('Nom', name), field('Rayon', kind), field('Marque', brand), field('Gamme', gamme)), [
      ['Annuler', null],
      ['Ajouter', 'ok', 'primary'],
    ]);
    if ((await done) !== 'ok') return;
    const obj = JSON.parse(JSON.stringify(o));
    for (const k of ['id', 'x', 'z', 'rot']) delete obj[k];
    obj.y = TYPES[o.type]?.stack ? 0 : obj.y;
    obj.name = name.value;
    obj.brand = brand.value;
    obj.gamme = gamme.value;
    a.library.push({ id: uid('l'), label: name.value, kind: kind.value, brand: brand.value, gamme: gamme.value, obj });
    await a.saveLibrary();
    this.ltab = 'add';
    this.openSections.add(kind.value === 'produit' ? 'Produits Spengler' : 'Mes éléments');
    this.renderLeft();
    this.toast('Ajouté à la bibliothèque : réutilisable dans tous vos stands.');
  }

  async productDialog() {
    const a = this.app;
    const name = h('input', { placeholder: 'ex. Tensiomètre Lian Nano' });
    const brand = h('select', {}, BRANDS.map((b) => h('option', { value: b }, b)));
    const gamme = h('input', { placeholder: 'ex. Tensiomètres' });
    const ref = h('input', { placeholder: 'Référence' });
    const W = h('input', { value: a.toUnit(0.3), inputmode: 'decimal' });
    const D = h('input', { value: a.toUnit(0.2), inputmode: 'decimal' });
    const H = h('input', { value: a.toUnit(0.25), inputmode: 'decimal' });
    const shape = h('select', {}, Object.entries(FIELD.shape.options).map(([k, l]) => h('option', { value: k }, l)));
    let front = null;
    let side = null;
    let model = null;
    const fl = h('span', { class: 'muted' }, 'aucune');
    const sl = h('span', { class: 'muted' }, 'aucune');
    const ml = h('span', { class: 'muted' }, 'aucun');
    const u = a.settings.unit;
    const body = h(
      'div',
      { class: 'form' },
      field('Nom du produit', name),
      h('div', { class: 'grid2' }, field('Marque', brand), field('Gamme', gamme)),
      field('Référence', ref),
      h('div', { class: 'grid3' }, field(`Largeur (${u})`, W), field(`Profondeur (${u})`, D), field(`Hauteur (${u})`, H)),
      h('h4', {}, 'Option A — modèle 3D (GLB, glTF, OBJ, FBX) à l’échelle 1:1'),
      h('div', { class: 'row gap' }, h('button', { class: 'btn sm', onClick: async () => { const f = await pickFile(assets.ACCEPT_MODELS); if (f) { model = f; ml.textContent = f.name; } } }, 'Choisir un modèle…'), ml),
      h('h4', {}, 'Option B — sans 3D : photo(s) plaquée(s) sur un volume aux bonnes dimensions'),
      field('Forme', shape),
      h('div', { class: 'row gap' }, h('button', { class: 'btn sm', onClick: async () => { const f = await pickFile('.png,.jpg,.jpeg,.webp,.svg,.pdf'); if (f) { front = f; fl.textContent = f.name; } } }, 'Photo de face…'), fl),
      h('div', { class: 'row gap' }, h('button', { class: 'btn sm', onClick: async () => { const f = await pickFile('.png,.jpg,.jpeg,.webp'); if (f) { side = f; sl.textContent = f.name; } } }, 'Photo de côté (facultatif)…'), sl),
      h('p', { class: 'muted' }, 'Astuce : pour une photo détourée (PNG transparent), choisissez la forme « Photo détourée ».'),
    );
    const { done } = this.modal('Nouveau produit', body, [
      ['Annuler', null],
      ['Créer et placer', 'ok', 'primary'],
    ]);
    if ((await done) !== 'ok') return;
    const t = this.toast('Création du produit…', 'info', 0);
    try {
      const common = { name: name.value || 'Produit', brand: brand.value, gamme: gamme.value, ref: ref.value, w: a.fromUnit(W.value) || 0.3, d: a.fromUnit(D.value) || 0.2, h: a.fromUnit(H.value) || 0.25, y: 0 };
      let obj;
      if (model) {
        const id = await assets.importFile(model, { brand: brand.value, library: false });
        obj = { type: 'model', model: id, ...common };
      } else {
        obj = { type: 'product', shape: shape.value, finish: 'blanc_mat', ...common };
        if (front) obj.image = await assets.importFile(front, { brand: brand.value });
        if (side) obj.imageSide = await assets.importFile(side, { brand: brand.value });
        if (front && obj.shape !== 'boite') obj.imageFit = 'stretch';
      }
      a.library.push({ id: uid('l'), label: common.name, kind: 'produit', brand: common.brand, gamme: common.gamme, obj });
      await a.saveLibrary();
      t.remove();
      this.openSections.add('Produits Spengler');
      this.renderLeft();
      a.addObject(obj);
    } catch (e) {
      t.remove();
      this.toast(e.message, 'error');
    }
  }

  renderAlerts(body) {
    const a = this.app;
    if (!a.alerts.length) {
      body.append(h('div', { class: 'empty ok' }, h('b', {}, '✓ Aucune alerte'), h('p', {}, 'Pas de collision, rien ne dépasse du stand ni de la hauteur maximale, et les visuels ont une résolution suffisante.')));
      return;
    }
    body.append(
      h(
        'ul',
        { class: 'alerts' },
        a.alerts.map((x) => h('li', { class: x.level, onClick: () => a.select(x.ids[0]) }, h('span', { class: 'dot' }), x.msg)),
      ),
    );
  }

  commentEl(c) {
    const a = this.app;
    const o = c.objId && a.obj(c.objId);
    const i = a.project.comments.indexOf(c) + 1;
    return h(
      'div',
      { class: 'comment' + (c.resolved ? ' resolved' : '') + (this.focusComment === c.id ? ' focus' : ''), id: 'c-' + c.id },
      h('div', { class: 'chead' }, h('span', { class: 'pin static' }, String(i)), h('b', {}, c.author || 'Anonyme'), h('small', {}, fmtDate(c.date))),
      h('p', {}, c.text),
      h(
        'div',
        { class: 'cfoot' },
        o ? h('a', { href: '#', onClick: (e) => (e.preventDefault(), a.select(o.id)) }, '→ ' + o.name) : h('span', {}),
        h(
          'label',
          { class: 'chk' },
          h('input', {
            type: 'checkbox',
            checked: !!c.resolved,
            onChange: (e) => {
              c.resolved = e.target.checked;
              a.commit('Commentaire');
            },
          }),
          'Résolu',
        ),
        a.readOnly ? null : h('button', { class: 'link', onClick: () => ((a.project.comments = a.project.comments.filter((x) => x !== c)), a.commit('Commentaire')) }, 'Supprimer'),
      ),
    );
  }

  renderComments(body) {
    const a = this.app;
    body.append(
      field(
        'Votre nom (auteur des commentaires)',
        h('input', { value: a.settings.author, placeholder: 'ex. Anaëlle', onChange: (e) => ((a.settings.author = e.target.value), a.saveSettings()) }),
      ),
      h('button', { class: 'btn primary full', onClick: () => a.startComment() }, icon('comment'), 'Nouveau commentaire'),
    );
    const cs = a.project.comments;
    if (!cs.length) body.append(h('p', { class: 'muted' }, 'Aucun commentaire. Les commentaires sont épinglés sur les objets et visibles par tous ceux qui ouvrent le projet.'));
    for (const c of [...cs].reverse()) body.append(this.commentEl(c));
  }

  showComments(id) {
    this.focusComment = id;
    this.showTab('comments', true);
    setTimeout(() => document.getElementById('c-' + id)?.scrollIntoView({ block: 'center' }), 30);
  }

  async addCommentDialog(objId, pos) {
    const a = this.app;
    const o = objId && a.obj(objId);
    if (!a.settings.author) {
      const n = await this.prompt('Votre nom', 'Nom affiché avec vos commentaires :', '');
      if (n) {
        a.settings.author = n;
        a.saveSettings();
      }
    }
    const text = await this.prompt('Nouveau commentaire', o ? 'Sur « ' + o.name + ' »' : 'Épinglé à cet endroit du stand', '', true);
    if (!text) return;
    a.addComment(objId, pos, text);
    this.showTab('comments', true);
  }

  renderViews(body) {
    const a = this.app;
    const p = a.project;
    body.append(
      h(
        'div',
        { class: 'col gap' },
        h(
          'button',
          {
            class: 'btn primary full',
            onClick: async () => {
              const name = await this.prompt('Enregistrer la vue', 'Nom de la vue :', 'Vue ' + (p.views.length + 1));
              if (!name) return;
              p.views.push({ id: uid('v'), name, ...a.viewer.getView() });
              a.commit('Vue');
            },
          },
          icon('camera'),
          'Enregistrer la vue actuelle',
        ),
        h('button', { class: 'btn full', disabled: a.readOnly, onClick: () => this.generate4Views() }, 'Générer 4 vues pour la direction (4K)'),
      ),
    );
    if (!p.views.length) body.append(h('p', { class: 'muted' }, 'Aucune vue enregistrée.'));
    for (const v of p.views) {
      body.append(
        h(
          'div',
          { class: 'view-item' },
          h('button', { class: 'vname', onClick: () => (a.viewer.setView(v), a.sync(), this.renderTopState(), this.renderHud()) }, h('b', {}, v.name), h('small', {}, { plan: 'Plan 2D', orbit: '3D', visitor: 'Visiteur' }[v.mode])),
          h('button', { class: 'ibtn', title: 'Exporter cette vue en image', onClick: () => (a.viewer.setView(v), this.renderTopState(), this.exportImageDialog(v.name)) }, icon('download')),
          a.readOnly ? null : h('button', { class: 'ibtn', title: 'Supprimer', onClick: () => ((p.views = p.views.filter((x) => x !== v)), a.commit('Vue')) }, icon('trash')),
        ),
      );
    }
  }

  async generate4Views() {
    const a = this.app;
    const p = a.project;
    const { w: W, d: D } = p.stand;
    const L = Math.max(W, D);
    const c = [W / 2, 1.8, D / 2];
    const auto = [
      { name: 'Auto – ¾ gauche', mode: 'orbit', pos: [W / 2 - L * 0.75, 3 + L * 0.15, D + L * 0.95], target: c },
      { name: 'Auto – face', mode: 'orbit', pos: [W / 2, 2.4 + L * 0.06, D + L * 1.25], target: c },
      { name: 'Auto – ¾ droite', mode: 'orbit', pos: [W / 2 + L * 0.75, 3 + L * 0.15, D + L * 0.95], target: c },
      { name: 'Auto – visiteur', mode: 'visitor', pos: [W / 2 - W * 0.15, 1.65, D + 1.2], yaw: 0.25, pitch: -0.06 },
    ].map((v) => ({ id: uid('v'), auto: true, ...v }));
    p.views = [...p.views.filter((v) => !v.auto), ...auto];
    a.commit('Vues auto');
    await this.exportViews(auto);
  }

  async exportViews(views) {
    const a = this.app;
    views = views || a.project.views;
    if (!views.length) return this.toast('Aucune vue enregistrée.', 'error');
    await this.run(`Export de ${views.length} image(s) 4K`, () => X.exportViews(a, views, 3840, 2160, 'image/jpeg'));
    this.renderTopState();
  }

  exportImageDialog(name) {
    const a = this.app;
    const res = h('select', {}, h('option', { value: '1920x1080' }, 'Full HD – 1920 × 1080'), h('option', { value: '2560x1440' }, '2K – 2560 × 1440'), h('option', { value: '3840x2160', selected: true }, '4K – 3840 × 2160'), h('option', { value: '2160x2160' }, 'Carré – 2160 × 2160'), h('option', { value: '2160x3840' }, 'Portrait – 2160 × 3840'));
    res.value = '3840x2160';
    const fmt = h('select', {}, h('option', { value: 'image/jpeg' }, 'JPG'), h('option', { value: 'image/png' }, 'PNG'));
    const q = h('select', {}, h('option', { value: 'render' }, 'Rendu réaliste (recommandé)'), h('option', { value: 'work' }, 'Rendu rapide'));
    const { done } = this.modal('Exporter une image', h('div', { class: 'form' }, field('Résolution', res), field('Format', fmt), field('Qualité', q), h('p', { class: 'muted' }, 'L’image reprend le cadrage de la vue actuelle, sans grille ni cotes.')), [
      ['Annuler', null],
      ['Exporter', 'ok', 'primary'],
    ]);
    done.then((r) => {
      if (r !== 'ok') return;
      const [w, hh] = res.value.split('x').map(Number);
      this.run('Export image', () => X.exportImage(a, w, hh, fmt.value, q.value, name));
    });
  }

  async shareDialog() {
    const a = this.app;
    const url = `${location.origin}${location.pathname}?visite=${a.project.id}`;
    const body = h(
      'div',
      { class: 'form' },
      h('h4', {}, 'Lien de visite 3D (lecture seule + commentaires)'),
      h('div', { class: 'row gap' }, h('input', { value: url, readonly: true, onFocus: (e) => e.target.select() }), h('button', { class: 'btn sm', onClick: () => (navigator.clipboard.writeText(url), this.toast('Lien copié.')) }, 'Copier')),
      h('p', { class: 'muted' }, 'En local, ce lien fonctionne sur ce poste. Une fois l’outil hébergé (cloud européen), le même lien sera partageable avec la direction, les commerciaux et le standiste, avec révocation possible.'),
      h('h4', {}, 'Envoyer le projet'),
      h('p', { class: 'muted' }, 'Le fichier projet contient le stand, les visuels et les modèles : il s’ouvre dans l’outil via Projets → Importer.'),
      h('div', { class: 'row gap' }, h('button', { class: 'btn sm primary', onClick: () => this.run('Export projet', () => X.exportProject(a)) }, 'Télécharger le fichier projet'), h('button', { class: 'btn sm', onClick: () => window.open(url, '_blank') }, 'Ouvrir en mode visite')),
      h('h4', {}, 'Pour le standiste'),
      h('div', { class: 'row gap wrap' }, h('button', { class: 'btn sm', onClick: () => this.run('Plan PDF', () => X.exportPlanPDF(a, 40)) }, 'Plan coté PDF 1:40'), h('button', { class: 'btn sm', onClick: () => X.exportCSV(a) }, 'Liste des éléments (CSV)'), h('button', { class: 'btn sm', onClick: () => this.run('Export GLB', () => X.exportGLB(a)) }, 'Fichier 3D (GLB)')),
    );
    this.modal('Partager le stand', body, [['Fermer', null]]);
  }

  helpDialog() {
    const k = (keys, desc) => h('tr', {}, h('td', {}, keys.split(' ').map((x) => h('kbd', {}, x))), h('td', {}, desc));
    const body = h(
      'div',
      { class: 'help' },
      h('h4', {}, 'Prise en main en 5 étapes'),
      h(
        'ol',
        {},
        h('li', {}, h('b', {}, 'Stand : '), 'onglet « Stand » à gauche → dimensions, hauteur max, ouverture, sol.'),
        h('li', {}, h('b', {}, 'Structure et mobilier : '), 'onglet « Bibliothèque » → cliquez ou glissez un élément dans la scène. Déplacez-le à la souris (aimantation 10 cm), pivotez avec l’anneau bleu ou la touche R.'),
        h('li', {}, h('b', {}, 'Visuels : '), 'onglet « Visuels » → importez vos fichiers puis glissez-les sur une cloison, un comptoir ou une bannière. La résolution est vérifiée (100 dpi min.).'),
        h('li', {}, h('b', {}, 'Vérifier : '), 'vue « Visiteur » pour marcher dans le stand ; les collisions et dépassements apparaissent en rouge (onglet « Alertes »).'),
        h('li', {}, h('b', {}, 'Partager : '), '« Rendu » pour la qualité finale, puis « Exporter » (images 4K, 360°, plan coté PDF, liste CSV) ou « Partager ».'),
      ),
      h('h4', {}, 'Raccourcis'),
      h(
        'table',
        {},
        k('1 2 3', 'Plan 2D / 3D / Visiteur'),
        k('R', 'Pivoter de 15° (Maj+R : −15°)'),
        k('← → ↑ ↓', 'Déplacer d’un pas de grille (Maj : ×5)'),
        k('⌘D', 'Dupliquer'),
        k('Suppr', 'Supprimer'),
        k('⌘Z ⇧⌘Z', 'Annuler / rétablir'),
        k('M', 'Mesurer entre deux points'),
        k('Maj', 'Pendant un déplacement : sans aimantation'),
        k('Z Q S D', 'Vue visiteur : marcher (ou W A S D, flèches)'),
        k('Échap', 'Désélectionner / quitter un outil'),
      ),
      h('p', { class: 'muted', style: { marginTop: '16px' } }, '© 2026 Anaelle Cintract – Tous droits réservés. Usage réservé à Spengler Medical. ', h('a', { href: 'mentions-legales.html', target: '_blank', rel: 'noopener' }, 'Mentions légales et conditions d’utilisation')),
    );
    this.modal('Aide', body, [['Fermer', null]]);
  }

  /* ---------------- projets ---------------- */

  async projectsDialog() {
    const a = this.app;
    const list = h('div', { class: 'projects' });
    const render = () => {
      list.replaceChildren();
      for (const m of a.projectsIndex) {
        const cur = m.id === a.project.id;
        list.append(
          h(
            'div',
            { class: 'project' + (cur ? ' current' : '') },
            h('div', { class: 'pthumb' }, m.thumb ? h('img', { src: m.thumb }) : null),
            h('div', { class: 'pmeta' }, h('b', {}, m.name), h('small', {}, [m.salon, m.w && `${m.w} × ${m.d} m`, fmtDate(m.updated)].filter(Boolean).join(' · ')), h('span', { class: 'st ' + (m.status || 'brouillon') }, { brouillon: 'Brouillon', avalider: 'À valider', valide: 'Validé' }[m.status || 'brouillon']), m.shared ? h('span', { class: 'shared-tag' }, m.sharedFrom ? 'Partagé par ' + (a.collab?.name(m.sharedFrom) || m.sharedFrom) : 'Partagé') : null),
            h(
              'div',
              { class: 'pact' },
              cur ? h('span', { class: 'muted' }, 'ouvert') : h('button', { class: 'btn sm primary', onClick: async () => { close(); const p = await get('project:' + m.id); if (p) a.loadProject(p); } }, 'Ouvrir'),
              h('button', { class: 'btn sm', onClick: async () => { close(); await a.duplicateProject(m.id); this.toast('Projet dupliqué : adaptez-le au nouveau salon.'); } }, 'Dupliquer'),
              cur ? null : h('button', { class: 'btn sm', onClick: async () => { if (await this.confirm('Supprimer définitivement « ' + m.name + ' » ?')) { await a.deleteProject(m.id); render(); } } }, 'Supprimer'),
            ),
          ),
        );
      }
    };
    render();
    // projets partagés avec moi pas encore présents sur cet ordinateur
    if (a.collab?.enabled) {
      const remote = a.collab.shared.filter((s) => !a.projectsIndex.some((m) => m.id === s.id));
      if (remote.length)
        list.prepend(
          h('h4', {}, 'Partagés avec vous'),
          ...remote.map((s) =>
            h(
              'div',
              { class: 'project' },
              h('div', { class: 'pthumb' }),
              h('div', { class: 'pmeta' }, h('b', {}, s.name || 'Projet'), h('small', {}, [s.salon, 'propriétaire : ' + a.collab.name(s.owner)].filter(Boolean).join(' · ')), h('span', { class: 'shared-tag' }, 'Partagé')),
              h('div', { class: 'pact' }, h('button', { class: 'btn sm primary', onClick: () => (close(), this.run('Ouverture du projet partagé', async () => a.loadProject(await a.collab.pull(s.id)))) }, 'Ouvrir')),
            ),
          ),
          h('h4', {}, 'Mes projets'),
        );
    }
    const { close, done } = this.modal(
      'Projets',
      h(
        'div',
        {},
        h(
          'div',
          { class: 'row gap' },
          h('button', { class: 'btn primary', onClick: () => (close(), this.newProjectDialog()) }, '+ Nouveau stand'),
          h('button', { class: 'btn', onClick: async () => { const f = await pickFile('.json'); if (!f) return; close(); this.run('Import du projet', () => X.importProject(a, f)); } }, 'Importer un fichier projet'),
          h('button', { class: 'btn', onClick: () => (close(), this.versionsDialog()) }, 'Versions du projet ouvert'),
          h('button', { class: 'btn', title: 'Fichier sauvegarde-stand3d.json récupéré sur l’ancienne adresse Vercel', onClick: async () => {
            const f = await pickFile('.json');
            if (!f) return;
            close();
            this.run('Restauration de la sauvegarde', async () => {
              const n = await restoreBackup(f);
              this.toast(`${n} projet(s) récupéré(s). Rechargement…`);
              setTimeout(() => location.reload(), 1500);
            });
          } }, 'Restaurer une sauvegarde de l’ancien site'),
        ),
        list,
      ),
      [['Fermer', null]],
      'wide',
    );
    await done;
  }

  async newProjectDialog() {
    const a = this.app;
    const name = h('input', { placeholder: 'ex. Arab Health 2027' });
    const salon = h('input', { placeholder: 'Salon' });
    const tpl = h('select', {}, TEMPLATES.filter((t) => !t.owners || !a.me || t.owners.includes(a.me.user)).map((t) => h('option', { value: t.id }, t.label)));
    tpl.value = '6x3';
    const W = h('input', { value: a.toUnit(6), inputmode: 'decimal' });
    const D = h('input', { value: a.toUnit(3), inputmode: 'decimal' });
    const open = h('select', {}, Object.entries(OPEN_TYPES).map(([k, t]) => h('option', { value: k }, t.label)));
    const free = h('div', { class: 'grid3' }, field(`Longueur (${a.settings.unit})`, W), field(`Profondeur (${a.settings.unit})`, D), field('Ouverture', open));
    const sync = () => (free.style.display = tpl.value === 'vide' ? '' : 'none');
    tpl.addEventListener('change', sync);
    sync();
    const { done } = this.modal('Nouveau stand', h('div', { class: 'form' }, field('Nom du projet', name), field('Salon', salon), field('Modèle de départ', tpl), free), [
      ['Annuler', null],
      ['Créer', 'ok', 'primary'],
    ]);
    if ((await done) !== 'ok') return;
    const t = TEMPLATES.find((x) => x.id === tpl.value);
    let p;
    if (t.id === 'vide') {
      p = basicProject(a.fromUnit(W.value) || 6, a.fromUnit(D.value) || 3, OPEN_TYPES[open.value].open);
    } else p = t.make();
    if (name.value) p.name = name.value;
    if (salon.value) p.salon = salon.value;
    await a.loadProject(p, { fresh: true });
  }

  async versionsDialog() {
    const a = this.app;
    const vs = (await get('versions:' + a.project.id)) || [];
    const list = h(
      'div',
      { class: 'versions' },
      vs.length
        ? vs.map((v) =>
            h(
              'div',
              { class: 'view-item' },
              h('div', { class: 'vname' }, h('b', {}, v.label), h('small', {}, fmtDate(v.ts))),
              h(
                'button',
                {
                  class: 'btn sm',
                  onClick: async () => {
                    if (!(await this.confirm('Restaurer cette version ? (l’état actuel reste récupérable avec Annuler)'))) return;
                    close();
                    const data = JSON.parse(v.data);
                    a.project = { ...data, id: a.project.id };
                    await a.preloadAssets();
                    a.commit('Restaurer version');
                    a.ui.refreshAll();
                  },
                },
                'Restaurer',
              ),
            ),
          )
        : h('p', { class: 'muted' }, 'Pas encore de version. Une version est créée automatiquement toutes les 10 minutes de travail.'),
    );
    const { close } = this.modal(
      'Historique des versions',
      h('div', {}, h('button', { class: 'btn sm primary', onClick: async () => { const l = await this.prompt('Créer une version', 'Libellé :', 'Version du ' + fmtDate(Date.now())); if (l) { await a.snapshot(l); close(); this.versionsDialog(); } } }, '+ Créer une version maintenant'), list),
      [['Fermer', null]],
    );
  }

  /* ---------------- configurateur : étapes, style, sol, budget ---------------- */

  renderSteps() {
    const a = this.app;
    this.stepbar.replaceChildren(
      ...STEPS.map((st, i) => h('button', { class: 'step' + (i === this.step ? ' on' : '') + (i < this.step ? ' done' : ''), onClick: () => this.goStep(i) }, st.label)),
      h('span', { class: 'sp' }),
      h('button', { class: 'btn sm coach-toggle' + (this.coachOpen ? ' on' : ''), title: 'Afficher ou masquer le conseil de l’étape', onClick: () => ((this.coachOpen = !this.coachOpen), this.renderSteps()) }, 'ⓘ'),
      this.step < STEPS.length - 1 ? h('button', { class: 'btn sm primary', title: 'Étape suivante : ' + STEPS[this.step + 1].label, onClick: () => this.goStep(this.step + 1) }, 'Suivante →') : null,
    );
    const st = STEPS[this.step];
    this.coach.style.display = this.coachOpen && !a.readOnly ? 'block' : 'none';
    this.coach.replaceChildren(
      h('div', { class: 'coach-h' }, h('b', {}, st.label), h('button', { class: 'x', title: 'Masquer les conseils', onClick: () => ((this.coachOpen = false), this.renderSteps()) }, '×')),
      h('p', {}, st.tip),
    );
  }

  goStep(i) {
    const a = this.app;
    this.step = i;
    const st = STEPS[i];
    this.libFilter = st.cats || null;
    if (st.left) this.ltab = st.left;
    if (st.mode && a.viewer.mode !== st.mode) this.setMode(st.mode);
    if (st.right) this.rtab = st.right;
    if (st.right && this.panels?.right) {
      this.panels.right = false;
      this.applyPanels();
    }
    if (st.left && this.panels?.left) {
      this.panels.left = false;
      this.applyPanels();
    }
    this.renderLeft();
    this.renderRight();
    this.renderSteps();
  }

  standSizeFields() {
    const a = this.app;
    const st = a.stand;
    const mk = (label, key) =>
      field(
        label,
        h('div', { class: 'unit-in' }, h('input', { value: a.toUnit(st[key]), inputmode: 'decimal', disabled: a.readOnly, onChange: (e) => { const v = a.fromUnit(e.target.value); if (v && v >= 1) (a.setStand({ [key]: v }), this.renderTop()); else e.target.value = a.toUnit(st[key]); } }), h('span', {}, a.settings.unit)),
      );
    return h('div', { class: 'grid2' }, mk('Longueur (façade)', 'w'), mk('Profondeur', 'd'));
  }

  floorPicker() {
    const a = this.app;
    const st = a.stand;
    const groups = [
      ['Moquette', FLOOR_PRESETS.filter((f) => f.floor.type === 'moquette')],
      ['Parquet', FLOOR_PRESETS.filter((f) => f.floor.type === 'parquet')],
      ['PVC / sol souple', FLOOR_PRESETS.filter((f) => f.floor.type === 'pvc')],
    ];
    return h(
      'div',
      { class: 'floor-picker' },
      groups.map(([g, list]) =>
        h(
          'div',
          {},
          h('small', {}, g),
          h(
            'div',
            { class: 'swatches' },
            list.map((f) =>
              h(
                'button',
                { class: 'swatch' + (sameFloor(st.floor, f.floor) ? ' on' : ''), title: f.label, disabled: a.readOnly, onClick: () => a.setStand({ floor: { ...st.floor, ...f.floor } }) },
                h('img', { src: floorSwatch(f.floor), alt: f.label }),
              ),
            ),
          ),
        ),
      ),
    );
  }

  renderStyle(body) {
    const a = this.app;
    const ro = a.readOnly;
    const color = (k) => (FINISHES[k]?.tex === 'wood' ? '#c9a273' : FINISHES[k]?.tex === 'walnut' ? '#5b3b26' : FINISHES[k]?.color || '#ccc');
    body.append(
      h('h4', {}, 'Ambiances'),
      h('p', { class: 'muted' }, 'Comme pour une cuisine : choisissez un style, il s’applique à toutes les cloisons, au mobilier, aux assises et au sol. Annulable avec ⌘Z.'),
      h(
        'div',
        { class: 'styles' },
        STYLES.map((s) =>
          h(
            'button',
            {
              class: 'style-card',
              disabled: ro,
              onClick: () => {
                a.applyStyle(s, STYLE_GROUPS);
                this.toast('Ambiance « ' + s.label + ' » appliquée.');
              },
            },
            h('div', { class: 'dots' }, [s.walls, s.furniture, s.seat].map((k) => h('span', { style: { background: color(k) } })), h('img', { src: floorSwatch(s.floor.type === 'parquet' ? { type: 'parquet', wood: s.floor.wood || 'chene' } : s.floor) })),
            h('b', {}, s.label),
            h('small', {}, s.desc),
          ),
        ),
      ),
      h('h4', {}, 'Sol'),
      this.floorPicker(),
    );
    const used = [...new Set(a.project.objects.flatMap((o) => [o.finish, o.top, o.legs]).filter((f) => f && FINISHES[f]))];
    const from = h('select', {}, used.map((f) => h('option', { value: f }, FINISHES[f].label)));
    const to = h('select', {}, Object.entries(FINISHES).map(([k, f]) => h('option', { value: k }, f.label)));
    body.append(
      h('h4', {}, 'Remplacer une finition partout'),
      h('div', { class: 'grid2' }, field('Finition actuelle', from), field('Nouvelle finition', to)),
      h('button', { class: 'btn sm', disabled: ro || !used.length, onClick: () => { const n = a.replaceFinish(from.value, to.value); this.toast(n + ' élément(s) modifié(s).'); } }, 'Remplacer'),
      h('h4', {}, 'Aimantation'),
      check('Aimantation intelligente (murs, bords du stand, objets voisins)', a.stand.smart !== false, (v) => a.setStand({ smart: v }), ro),
      h('p', { class: 'muted' }, 'Les éléments se collent dos aux cloisons et aux côtés fermés du stand, s’orientent face à l’allée et s’alignent bord à bord. Maintenez Maj pour placer librement.'),
    );
  }

  renderBudget(body) {
    const a = this.app;
    const B = budget(a);
    body.append(
      h('div', { class: 'budget-total' }, h('small', {}, 'Estimation totale'), h('b', {}, fmtEUR(B.total) + ' HT'), h('small', {}, `soit ${fmtEUR(B.total / B.area)} / m² · ${B.area.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} m²`)),
    );
    let group = null;
    const tbl = h('div', { class: 'budget' });
    for (const l of B.lines) {
      if (l.group !== group) {
        group = l.group;
        const sub = B.lines.filter((x) => x.group === group).reduce((t, x) => t + x.total, 0);
        tbl.append(h('div', { class: 'bgroup' }, h('span', {}, group), h('span', {}, fmtEUR(sub))));
      }
      tbl.append(h('div', { class: 'bline' }, h('span', {}, l.label, h('small', {}, `${fmtQty(l.qty, l.unit)} × ${fmtEUR(l.price)}`)), h('span', {}, fmtEUR(l.total))));
    }
    body.append(
      tbl,
      h('div', { class: 'row gap wrap', style: { marginTop: '12px' } }, h('button', { class: 'btn sm', onClick: () => this.pricesDialog() }, 'Modifier les tarifs'), h('button', { class: 'btn sm primary', onClick: () => X.exportBudgetCSV(a) }, 'Exporter le devis (CSV)')),
      h('p', { class: 'muted' }, 'Tarifs indicatifs de location pour un salon (€ HT), hors produits Spengler, transport et montage. Remplacez-les par ceux de votre standiste : ils sont mémorisés pour tous vos projets.'),
    );
  }

  async pricesDialog() {
    const a = this.app;
    const P = prices(a.settings);
    const inputs = {};
    const rows = Object.entries(P).map(([k, v]) => {
      inputs[k] = h('input', { type: 'number', min: 0, step: 1, value: v.price });
      return h('div', { class: 'price-row' }, h('span', {}, v.label, h('small', {}, ' / ' + v.unit)), inputs[k]);
    });
    const { done } = this.modal('Tarifs (€ HT)', h('div', { class: 'prices' }, rows), [
      ['Réinitialiser', 'reset'],
      ['Annuler', null],
      ['Enregistrer', 'ok', 'primary'],
    ]);
    const r = await done;
    if (r === 'reset') a.settings.prices = {};
    else if (r === 'ok') {
      a.settings.prices = {};
      for (const [k, i] of Object.entries(inputs)) a.settings.prices[k] = parseFloat(i.value) || 0;
    } else return;
    await a.saveSettings();
    this.renderTopState();
    this.renderRight();
  }

  /* ---------------- assistant d'agencement ---------------- */

  assistantDialog() {
    const a = this.app;
    const p = a.project;
    const st = p.stand;
    const u = a.settings.unit;
    const S = this._assist || (this._assist = { text: '', chips: [], style: 'auto', qty: {}, options: { accueil: true, rencontre: true, reserve: true, ecran: false, banniere: false, personnages: true } });
    const name = h('input', { value: S.name ?? '', placeholder: 'ex. Medica 2027' });
    const salon = h('input', { value: S.salon ?? p.salon ?? '', placeholder: 'Salon' });
    const W = h('input', { value: a.toUnit(S.w ?? st.w), inputmode: 'decimal' });
    const D = h('input', { value: a.toUnit(S.d ?? st.d), inputmode: 'decimal' });
    const HM = h('input', { value: a.toUnit(S.hMax ?? st.hMax), inputmode: 'decimal' });
    const open = h('select', {}, Object.entries(OPEN_TYPES).map(([k, t]) => h('option', { value: k }, t.label)));
    open.value = S.openType || openTypeOf(st.open);
    const text = h('textarea', { rows: 3, placeholder: 'Décrivez l’esprit du stand : ex. « Un stand convivial et lumineux pour rencontrer les cardiologues, mettre en avant la gamme tension et faire des démonstrations du Neotens. »', value: S.text });
    const chips = h(
      'div',
      { class: 'chips' },
      SPIRIT_CHIPS.map((c) => {
        const el = h('button', { class: 'chip-btn' + (S.chips.includes(c) ? ' on' : ''), onClick: () => { S.chips = S.chips.includes(c) ? S.chips.filter((x) => x !== c) : [...S.chips, c]; el.classList.toggle('on'); } }, c);
        return el;
      }),
    );
    const style = h('select', {}, h('option', { value: 'auto' }, 'Automatique (d’après la description)'), STYLES.map((s) => h('option', { value: s.id }, s.label + ' — ' + s.desc)));
    style.value = S.style;
    // produits : catalogue Spengler Medical + bibliothèque
    const prods = [
      ...CATALOG.filter((e) => e.type === 'device').map((e) => ({ key: 'c:' + e.label, label: e.label, gamme: e.gamme, obj: fromCatalog(e) })),
      ...a.library.filter((it) => it.kind === 'produit').map((it) => ({ key: 'l:' + it.id, label: it.label, gamme: it.gamme || it.brand || 'Mes produits', obj: { ...it.obj, gamme: it.gamme || it.brand || 'Mes produits' } })),
    ];
    const count = h('span', { class: 'count' });
    const upd = () => (count.textContent = Object.values(S.qty).reduce((t, q) => t + q, 0) + ' produit(s)');
    const list = h('div', { class: 'assist-prods' });
    for (const g of [...new Set(prods.map((x) => x.gamme))]) {
      list.append(h('div', { class: 'brand-sep' }, g));
      for (const pr of prods.filter((x) => x.gamme === g)) {
        const q = h('select', { class: 'qty' }, [1, 2, 3, 4].map((n) => h('option', { value: n }, '× ' + n)));
        q.value = S.qty[pr.key] || 1;
        const cb = h('input', { type: 'checkbox', checked: !!S.qty[pr.key] });
        const sync = () => {
          if (cb.checked) S.qty[pr.key] = +q.value;
          else delete S.qty[pr.key];
          upd();
        };
        cb.addEventListener('change', sync);
        q.addEventListener('change', () => ((cb.checked = true), sync()));
        list.append(h('label', { class: 'assist-prod' }, cb, h('span', {}, pr.label), q));
      }
    }
    upd();
    const opt = (k, label) => check(label, S.options[k], (v) => (S.options[k] = v));
    const form = h(
      'div',
      { class: 'assist' },
      h('p', { class: 'muted' }, 'Décrivez votre stand comme à un standiste : l’assistant en déduit le style, les zones et le mobilier, puis vous propose deux agencements à comparer.'),
      h('h4', {}, '1 · Le stand'),
      h('div', { class: 'grid2' }, field('Nom du projet', name), field('Salon', salon)),
      h('div', { class: 'grid4' }, field(`Longueur (${u})`, W), field(`Profondeur (${u})`, D), field(`Hauteur max (${u})`, HM), field('Ouverture', open)),
      h('h4', {}, '2 · L’esprit du stand'),
      text,
      chips,
      field('Style', style),
      h('h4', {}, '3 · Les produits à exposer ', count),
      list,
      h('h4', {}, '4 · Les espaces souhaités'),
      h('div', { class: 'grid2' }, opt('accueil', "Comptoir d'accueil"), opt('rencontre', 'Espace rencontre (tables et chaises hautes)'), opt('reserve', 'Réserve / vestiaire'), opt('ecran', 'Écran vidéo'), opt('banniere', 'Bannière suspendue'), opt('personnages', 'Personnages pour l’ambiance')),
    );
    const wrap = h('div', {}, form);
    const { close } = this.modal('Assistant d’agencement', wrap, [['Fermer', null]], 'wide');
    const footer = wrap.closest('.modal').querySelector('footer');
    const genBtn = h(
      'button',
      {
        class: 'btn primary',
        onClick: () => {
          Object.assign(S, { name: name.value, salon: salon.value, text: text.value, style: style.value, w: a.fromUnit(W.value) || st.w, d: a.fromUnit(D.value) || st.d, hMax: a.fromUnit(HM.value) || st.hMax, openType: open.value });
          if (!Object.keys(S.qty).length) return this.toast('Cochez au moins un produit à exposer.', 'error');
          const input = {
            name: S.name || p.name.split(' – ')[0],
            salon: S.salon,
            text: S.text,
            chips: S.chips,
            style: S.style,
            w: S.w,
            d: S.d,
            hMax: S.hMax,
            open: OPEN_TYPES[S.openType].open,
            options: S.options,
            products: prods.filter((x) => S.qty[x.key]).map((x) => ({ obj: x.obj, gamme: x.gamme, qty: S.qty[x.key] })),
          };
          genBtn.disabled = true;
          genBtn.textContent = 'Composition en cours…';
          setTimeout(() => {
            try {
              this.showProposals(wrap, generateProposals(input), close, () => {
                wrap.replaceChildren(form);
                genBtn.style.display = '';
              });
              genBtn.style.display = 'none';
            } catch (e) {
              console.error(e);
              this.toast('Erreur : ' + e.message, 'error');
            }
            genBtn.disabled = false;
            genBtn.replaceChildren(h('span', { class: 'ic', html: ICON.spark }), 'Générer 2 propositions');
          }, 30);
        },
      },
      h('span', { class: 'ic', html: ICON.spark }),
      'Générer 2 propositions',
    );
    footer.prepend(genBtn);
  }

  showProposals(wrap, props, close, back) {
    const a = this.app;
    const cards = props.map((pr) => {
      const img = h('img', { src: renderPreview(pr.project), alt: '' });
      const placed = pr.nProducts;
      return h(
        'div',
        { class: 'proposal' },
        img,
        h('div', { class: 'ptag' }, 'Proposition ' + pr.letter),
        h('h3', {}, pr.title),
        h('p', {}, pr.concept),
        h(
          'ul',
          {},
          h('li', {}, 'Style : ' + pr.style.label + ' (' + pr.style.desc.toLowerCase() + ')'),
          h('li', {}, 'Univers : ' + (pr.zones.join(', ') || '—')),
          h('li', {}, placed + ' produit(s) présenté(s)' + (pr.seats ? ' · ' + pr.seats + ' place(s) assise(s)' : '')),
          pr.noReserve ? h('li', { class: 'warn' }, 'Pas de réserve dans cette implantation (stand trop petit ou ouvert à l’arrière)') : null,
          pr.unplaced.length ? h('li', { class: 'warn' }, pr.unplaced.length + ' produit(s) non placé(s) faute de place — agrandissez le stand ou réduisez les quantités') : null,
        ),
        h(
          'div',
          { class: 'row gap wrap' },
          h('button', { class: 'btn primary', onClick: async () => { close(); await a.loadProject(pr.project, { fresh: true }); this.toast('Proposition ' + pr.letter + ' créée comme nouveau projet. Ajustez-la librement !'); } }, 'Créer un projet avec cette proposition'),
          h('button', { class: 'btn', onClick: async () => { if (!(await this.confirm('Remplacer l’agencement du projet actuel par la proposition ' + pr.letter + ' ? (annulable avec ⌘Z)'))) return; close(); a.project.objects = pr.project.objects; a.project.stand = { ...a.project.stand, ...pr.project.stand }; a.selected = null; a.commit('Assistant – proposition ' + pr.letter); this.refreshAll(); } }, 'Remplacer le projet actuel'),
        ),
      );
    });
    wrap.replaceChildren(h('div', { class: 'row gap', style: { marginBottom: '10px' } }, h('button', { class: 'btn sm', onClick: back }, '← Modifier la demande'), h('span', { class: 'muted', style: { margin: 0 } }, 'Deux implantations calculées à partir de votre description. Chacune reste entièrement modifiable.')), h('div', { class: 'proposals' }, cards));
  }

  /* ---------------- collaboration ---------------- */

  /** Fenêtre affichée à l'arrivée d'une invitation ou d'une demande de collaboration */
  requestPopup(r) {
    this._popQueue ||= [];
    this._popQueue.push(r);
    if (this._popOpen) return;
    const next = async () => {
      const req = this._popQueue.shift();
      if (!req) return (this._popOpen = false);
      this._popOpen = true;
      const c = this.app.collab;
      if (!c.incoming.some((x) => x.id === req.id)) return next();
      const who = c.name(req.from);
      const body = h(
        'div',
        { class: 'invite-pop' },
        h('div', { class: 'invite-ic', html: ICON.users }),
        h('p', { class: 'invite-title' }, req.type === 'invite' ? `${who} vous invite à collaborer` : `${who} demande à collaborer avec vous`),
        h('p', {}, 'Projet : ', h('b', {}, '« ' + req.projectName + ' »')),
        req.message ? h('p', { class: 'muted' }, '« ' + req.message + ' »') : null,
        h('p', { class: 'muted' }, req.type === 'invite' ? 'En acceptant, le projet s’ajoute à vos projets et vos modifications seront partagées.' : 'En acceptant, votre projet est partagé en ligne avec ' + who + ' et vos modifications se synchronisent.'),
      );
      const { done } = this.modal(req.type === 'invite' ? 'Invitation à collaborer' : 'Demande de collaboration', body, [
        ['Plus tard', 'later'],
        ['Refuser', 'no'],
        ['Accepter', 'yes', 'primary'],
      ]);
      const ans = await done;
      if (ans === 'yes' || ans === 'no') {
        await this.run(ans === 'yes' ? 'Acceptation' : 'Refus', async () => {
          const opened = await c.respond(req, ans === 'yes');
          if (opened) await this.app.loadProject(opened);
        });
      } else this.toast('Demande gardée pour plus tard : bouton « Collaborer » (pastille rouge).');
      next();
    };
    next();
  }

  async collabDialog() {
    const a = this.app;
    const c = a.collab;
    const body = h('div', { class: 'collab' }, h('p', { class: 'muted' }, 'Chargement…'));
    const { close } = this.modal('Collaborer', body, [['Fermer', null]], 'wide');
    let directory = [];
    const draw = () => {
      const p = a.project;
      const me = c.me.user;
      const label = (r) => (r.type === 'invite' ? `${c.name(r.from)} vous invite à collaborer sur « ${r.projectName} »` : `${c.name(r.from)} demande à collaborer sur « ${r.projectName} »`);
      const incoming = c.incoming;
      const sent = c.requests.filter((r) => r.from === me).slice(0, 10);
      const userSel = h('select', {}, c.me.users.map((u) => h('option', { value: u.id }, u.name)));
      const msg = h('input', { placeholder: 'Message (facultatif)' });
      const isOwner = !p.shared || p.shared.owner === me;
      body.replaceChildren(
        h('p', { class: 'muted' }, `Connectée en tant que ${c.me.name}. Un projet partagé est enregistré en ligne (stockage privé, Paris) et se met à jour chez chaque membre ; les autres projets restent personnels.`),
        h('h4', {}, 'Demandes reçues'),
        incoming.length
          ? incoming.map((r) =>
              h(
                'div',
                { class: 'creq' },
                h('div', {}, h('b', {}, label(r)), r.message ? h('small', {}, '« ' + r.message + ' »') : null, h('small', {}, fmtDate(r.created))),
                h(
                  'div',
                  { class: 'row gap' },
                  h('button', { class: 'btn sm primary', onClick: () => this.run('Réponse', async () => { const opened = await c.respond(r, true); if (opened) { close(); await a.loadProject(opened); this.toast('Projet partagé ouvert : vos modifications sont visibles par ' + c.name(r.from) + '.'); } else draw(); }) }, 'Accepter'),
                  h('button', { class: 'btn sm', onClick: () => this.run('Réponse', async () => { await c.respond(r, false); draw(); }) }, 'Refuser'),
                ),
              ),
            )
          : h('p', { class: 'muted' }, 'Aucune demande en attente.'),
        h('h4', {}, `Projet ouvert : « ${p.name} »`),
        p.shared
          ? h('p', {}, 'Partagé – membres : ' + p.shared.members.map((m) => c.name(m) + (m === p.shared.owner ? ' (propriétaire)' : '')).join(', '))
          : h('p', { class: 'muted' }, 'Ce projet est personnel.'),
        isOwner
          ? h('div', { class: 'row gap wrap' }, field('Inviter', userSel), msg, h('button', { class: 'btn sm primary', onClick: () => this.run('Invitation', async () => { await c.invite(userSel.value, msg.value); this.toast('Invitation envoyée à ' + c.name(userSel.value) + '.'); draw(); }) }, 'Inviter à collaborer'))
          : null,
        p.shared ? h('button', { class: 'btn sm', onClick: async () => { const own = p.shared.owner === me; if (!(await this.confirm(own ? 'Arrêter le partage ? La copie en ligne sera supprimée ; chacun garde sa copie locale.' : 'Quitter ce projet partagé ? Vous en gardez une copie locale.'))) return; await this.run('Partage', () => c.leave(p.id)); draw(); } }, p.shared.owner === me ? 'Arrêter le partage' : 'Quitter le projet partagé') : null,
        h('h4', {}, 'Demander à collaborer sur un projet'),
        directory.some((d) => d.projects.length)
          ? directory.map((d) =>
              h(
                'div',
                {},
                h('div', { class: 'brand-sep' }, 'Projets de ' + d.name),
                d.projects.length
                  ? d.projects.map((pr) => {
                      const member = c.shared.some((s) => s.id === pr.id);
                      const pending = c.requests.some((r) => r.projectId === pr.id && r.from === me && r.status === 'pending');
                      return h('div', { class: 'creq' }, h('div', {}, h('b', {}, pr.name), h('small', {}, [pr.salon, pr.updated && fmtDate(pr.updated)].filter(Boolean).join(' · '))), member ? h('span', { class: 'shared-tag' }, 'Vous collaborez') : pending ? h('span', { class: 'muted' }, 'Demande envoyée') : h('button', { class: 'btn sm', onClick: () => this.run('Demande', async () => { await c.requestJoin(d.user, pr.id, pr.name); this.toast('Demande envoyée à ' + d.name + '.'); draw(); }) }, 'Demander à collaborer'));
                    })
                  : h('p', { class: 'muted' }, 'Aucun projet.'),
              ),
            )
          : h('p', { class: 'muted' }, 'Aucun projet disponible pour le moment.'),
        h('h4', {}, 'Projets partagés'),
        c.shared.length
          ? c.shared.map((s) => h('div', { class: 'creq' }, h('div', {}, h('b', {}, s.name || 'Projet'), h('small', {}, 'Propriétaire : ' + c.name(s.owner) + ' · membres : ' + s.members.map((m) => c.name(m)).join(', '))), s.id === p.id ? h('span', { class: 'muted' }, 'ouvert') : h('button', { class: 'btn sm primary', onClick: () => (close(), this.run('Ouverture', async () => a.loadProject(await c.pull(s.id)))) }, 'Ouvrir')))
          : h('p', { class: 'muted' }, 'Aucun projet partagé.'),
        sent.length ? h('h4', {}, 'Demandes envoyées') : null,
        sent.map((r) => h('div', { class: 'creq' }, h('div', {}, h('b', {}, (r.type === 'invite' ? 'Invitation à ' : 'Demande à ') + c.name(r.to) + ' – « ' + r.projectName + ' »'), h('small', {}, fmtDate(r.created))), h('span', { class: 'rstatus ' + r.status }, { pending: 'En attente', accepted: 'Acceptée', declined: 'Refusée' }[r.status]))),
      );
    };
    try {
      await c.refresh();
      directory = await c.api('directory');
    } catch (e) {
      this.toast(e.message, 'error');
    }
    draw();
  }

  /* ---------------- dialogues génériques ---------------- */

  modal(title, content, buttons = [['OK', 'ok', 'primary']], cls = '') {
    let resolve;
    const done = new Promise((r) => (resolve = r));
    const close = (v = null) => {
      ov.remove();
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(null);
    };
    document.addEventListener('keydown', onKey);
    const ov = h(
      'div',
      { class: 'overlay', onMousedown: (e) => e.target === ov && close(null) },
      h(
        'div',
        { class: 'modal ' + cls },
        h('header', {}, h('h3', {}, title), h('button', { class: 'x', onClick: () => close(null) }, '×')),
        h('div', { class: 'mbody' }, content),
        h(
          'footer',
          {},
          buttons.map(([l, v, c]) => h('button', { class: 'btn ' + (c || ''), onClick: () => close(v) }, l)),
        ),
      ),
    );
    document.body.append(ov);
    setTimeout(() => ov.querySelector('input:not([readonly]),textarea')?.focus(), 30);
    return { close, done };
  }

  async prompt(title, label, value = '', multi = false) {
    const i = h(multi ? 'textarea' : 'input', { value, rows: 4 });
    i.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (!multi || e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        close('ok');
      }
    });
    const { close, done } = this.modal(title, h('div', { class: 'form' }, field(label, i)), [
      ['Annuler', null],
      ['Valider', 'ok', 'primary'],
    ]);
    return (await done) === 'ok' ? i.value : null;
  }

  async confirm(msg) {
    const { done } = this.modal('Confirmation', h('p', {}, msg), [
      ['Annuler', null],
      ['Confirmer', 'ok', 'primary'],
    ]);
    return (await done) === 'ok';
  }

  async choose(title, options, value) {
    const s = h('select', { value }, options.map((o) => h('option', { value: o }, o || '—')));
    const { done } = this.modal(title, s, [
      ['Annuler', null],
      ['OK', 'ok', 'primary'],
    ]);
    return (await done) === 'ok' ? s.value : null;
  }

  toast(msg, level = 'info', ms = 3500) {
    const t = h('div', { class: 'toast ' + level }, msg);
    this.toasts.append(t);
    if (ms) setTimeout(() => t.remove(), ms);
    return t;
  }
}

/* ---------------- petits composants ---------------- */

function field(label, input) {
  return h('label', { class: 'field' }, h('span', {}, label), input);
}

function check(label, val, on, disabled) {
  return h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: val, disabled, onChange: (e) => on(e.target.checked) }), label);
}

function stat(label, val) {
  return h('div', { class: 'stat' }, h('small', {}, label), h('b', {}, String(val)));
}

function rangeField(label, val, min, max, step, on) {
  const out = h('span', { class: 'rv' }, (+val).toFixed(2));
  return field(
    label,
    h(
      'div',
      { class: 'range' },
      h('input', {
        type: 'range',
        min,
        max,
        step,
        value: val,
        onInput: (e) => {
          out.textContent = (+e.target.value).toFixed(2);
          on(parseFloat(e.target.value), false);
        },
        onChange: (e) => on(parseFloat(e.target.value), true),
      }),
      out,
    ),
  );
}

function fmtRange(k, v) {
  if (v == null) return '';
  if (k === 'kelvin') return v + ' K';
  if (k === 'doorPos') return Math.round(v * 100) + ' %';
  if (k === 'tilt' || k === 'angle' || k === 'doorOpen') return v + '°';
  return String(v);
}
