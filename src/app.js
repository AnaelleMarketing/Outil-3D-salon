// Cœur de l'application : état du projet, synchronisation 3D, interactions, alertes, persistance.
import * as THREE from 'three';
import { get, set, del } from './store.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Viewer } from './viewer.js';
import * as assets from './assets.js';
import { TYPES, buildObject, fromCatalog, isSupport, isStackable, noCollide } from './objects.js';
import { floorMaterial } from './materials.js';
import { medicaProject, tradexProject, registerBuiltins, emptyProject } from './templates.js';
import { uid, rad, deg, h } from './util.js';
import { UI } from './ui.js';
import { Collab } from './collab.js';

const STAND_KEYS = ['w', 'd', 'hMax', 'open', 'floor', 'grid', 'snap', 'dims', 'env', 'aisle', 'plan'];

export class App {
  constructor(root) {
    this.root = root;
    this.cache = new Map(); // id -> { key, group }
    this.selected = null;
    this.tool = null; // 'measure' | 'comment' | 'calibrate'
    this.toolPts = [];
    this.history = [];
    this.hIndex = -1;
    this.alerts = [];
    this.bad = new Set();
    this.readOnly = false;
    this.saveState = 'saved';
  }

  async init() {
    await assets.initAssets();
    await registerBuiltins();
    this.settings = { unit: 'mm', author: '', ...((await get('settings')) || {}) };
    if (!this.settings.author && this.me?.name) this.settings.author = this.me.name;
    this.library = (await get('library')) || [];
    this.projectsIndex = (await get('projects')) || [];

    this.ui = new UI(this);
    this.ui.mount();
    this.viewer = new Viewer(this.ui.viewport);
    this.viewer.onFps = (f) => this.ui.setFps(f);
    this.bindInput();

    const params = new URLSearchParams(location.search);
    // stands fournis par défaut à chaque compte (ajoutés une seule fois)
    const SEEDS = { anaelle: ['tradex'], local: ['tradex'], alicia: ['medica', 'tradex'] };
    const makers = { medica: medicaProject, tradex: tradexProject };
    if (!params.has('visite')) {
      for (const key of SEEDS[this.me?.user || 'local'] || []) {
        if (await get('seed:' + key)) continue;
        const seeded = makers[key]();
        await set('project:' + seeded.id, seeded);
        await this.indexProject(seeded, null);
        await set('seed:' + key, true);
        await set('lastProject', seeded.id);
      }
    }
    const pid = params.get('visite') || params.get('p') || (await get('lastProject'));
    let p = pid ? await get('project:' + pid) : null;
    if (!p) p = medicaProject();
    this.readOnly = params.has('visite');
    document.body.classList.toggle('readonly', this.readOnly);
    // la collaboration doit exister avant le premier affichage (un projet partagé peut s'ouvrir au démarrage)
    this.collab = new Collab(this, this.readOnly ? null : this.me);
    await this.loadProject(p, { fresh: !pid });
    if (this.readOnly) this.ui.toast('Mode visite : lecture et commentaires uniquement.');
    this.collab.start();
    this.ui.renderTop();
  }

  /* ---------------- projets partagés ---------------- */

  /** Enregistre localement un projet (sans repasser par l'historique) et met à jour la liste des projets */
  async persistShared(p) {
    await set('project:' + p.id, p);
    await this.indexProject(p, p.shared && p.shared.owner !== this.me?.user ? p.shared.owner : null);
    if (p === this.project) this.ui.refresh();
  }

  async indexProject(p, sharedFrom) {
    let meta = this.projectsIndex.find((m) => m.id === p.id);
    if (!meta) {
      meta = { id: p.id };
      this.projectsIndex.unshift(meta);
    }
    Object.assign(meta, { name: p.name, salon: p.salon, updated: p.updated || Date.now(), w: p.stand.w, d: p.stand.d, status: p.status, shared: !!p.shared, sharedFrom: sharedFrom || null });
    await set('projects', this.projectsIndex);
  }

  /** Remplace le projet ouvert par sa version en ligne, sans bouger la caméra */
  async replaceProject(p) {
    const base = emptyProject();
    this.project = { ...base, ...p, stand: { ...base.stand, ...p.stand } };
    if (this.selected && !this.obj(this.selected)) this.selected = null;
    await this.preloadAssets();
    this.history = [JSON.stringify(this.project)];
    this.hIndex = 0;
    this.sync();
    this.ui.refreshAll();
    this.ui.setSyncState('ok');
  }

  /* ---------------- projet ---------------- */

  async loadProject(p, { fresh = false } = {}) {
    const prev = this.project;
    if (prev && this._timers?.[prev.id]) {
      clearTimeout(this._timers[prev.id]);
      delete this._timers[prev.id];
      await this.saveNow(prev);
    }
    const base = emptyProject();
    p = { ...base, ...p, stand: { ...base.stand, ...p.stand } };
    this.project = p;
    for (const [, e] of this.cache) this.disposeGroup(e.group);
    this.cache.clear();
    this._standKey = null;
    this.selected = null;
    await this.preloadAssets();
    this.history = [JSON.stringify(p)];
    this.hIndex = 0;
    this.sync();
    this.viewer.setMode('orbit');
    if (p.views?.[0] && p.views[0].mode === 'orbit') this.viewer.setView(p.views[0]);
    else this.viewer.homeOrbit();
    this.ui.setMode('orbit');
    this.ui.refreshAll();
    if (!this.readOnly) await set('lastProject', p.id);
    if (fresh) this.save();
  }

  async preloadAssets() {
    const ids = new Set();
    for (const o of this.project.objects) {
      for (const k of ['image', 'imageBack', 'imageSide', 'model']) if (o[k]) ids.add(o[k]);
    }
    const st = this.project.stand;
    if (st.plan?.asset) ids.add(st.plan.asset);
    if (st.floor?.asset) ids.add(st.floor.asset);
    for (const f of assets.listAssets('font')) ids.add(f.id);
    await Promise.all([...ids].map((id) => assets.ensure(id).catch((e) => console.warn('asset', id, e))));
  }

  get stand() {
    return this.project.stand;
  }
  obj(id) {
    return this.project.objects.find((o) => o.id === id);
  }
  get sel() {
    return this.selected ? this.obj(this.selected) : null;
  }

  /** Enregistre une étape dans l'historique (annuler/rétablir illimité) */
  commit(label = '') {
    const s = JSON.stringify(this.project);
    if (s === this.history[this.hIndex]) {
      this.sync();
      this.ui.refresh();
      return;
    }
    this.history.length = this.hIndex + 1;
    this.history.push(s);
    this.hIndex++;
    this.lastLabel = label;
    this.sync();
    this.ui.refresh();
    this.save();
  }

  undo() {
    if (this.placing) return this.cancelPlacing();
    if (this.hIndex <= 0) return;
    this.hIndex--;
    this.restore();
  }
  redo() {
    if (this.placing) this.cancelPlacing();
    if (this.hIndex >= this.history.length - 1) return;
    this.hIndex++;
    this.restore();
  }
  restore() {
    this.project = JSON.parse(this.history[this.hIndex]);
    if (this.selected && !this.obj(this.selected)) this.selected = null;
    this.sync();
    this.ui.refreshAll();
    this.save();
  }

  /** Sauvegarde différée, par projet (aucune perte si l'on change de projet entre-temps) */
  save() {
    if (this.readOnly) return;
    const p = this.project;
    this._timers ||= {};
    clearTimeout(this._timers[p.id]);
    this.ui.setSaveState('saving');
    this._timers[p.id] = setTimeout(() => {
      delete this._timers[p.id];
      this.saveNow(p);
    }, 700);
  }

  async saveNow(p = this.project) {
    if (this.readOnly) return;
    this.saveState = 'saving';
    p.updated = Date.now();
    await set('project:' + p.id, p);
    let meta = this.projectsIndex.find((m) => m.id === p.id);
    if (!meta) {
      meta = { id: p.id };
      this.projectsIndex.unshift(meta);
    }
    Object.assign(meta, { name: p.name, salon: p.salon, updated: p.updated, w: p.stand.w, d: p.stand.d, status: p.status });
    if (p === this.project && (!meta.thumbAt || Date.now() - meta.thumbAt > 30000)) {
      try {
        const b = await this.viewer.capture(320, 180, 'image/jpeg', 0.75);
        meta.thumb = await new Promise((r) => {
          const fr = new FileReader();
          fr.onload = () => r(fr.result);
          fr.readAsDataURL(b);
        });
        meta.thumbAt = Date.now();
      } catch (e) {
        /* miniature facultative */
      }
    }
    await set('projects', this.projectsIndex);
    // historique des versions (auto toutes les 10 min)
    const vk = 'versions:' + p.id;
    const versions = (await get(vk)) || [];
    if (!versions.length || Date.now() - versions[0].ts > 10 * 60000) {
      versions.unshift({ ts: Date.now(), label: 'Sauvegarde automatique', data: JSON.stringify(p) });
      await set(vk, versions.slice(0, 40));
    }
    this.saveState = 'saved';
    if (p === this.project) this.ui.setSaveState('saved');
    if (p === this.project && p.shared) this.collab?.schedulePush();
    this.collab?.directoryLater();
  }

  async snapshot(label) {
    const vk = 'versions:' + this.project.id;
    const versions = (await get(vk)) || [];
    versions.unshift({ ts: Date.now(), label: label || 'Version manuelle', data: JSON.stringify(this.project) });
    await set(vk, versions.slice(0, 40));
  }

  async saveSettings() {
    await set('settings', this.settings);
  }
  async saveLibrary() {
    await set('library', this.library);
  }

  async deleteProject(id) {
    this.projectsIndex = this.projectsIndex.filter((m) => m.id !== id);
    await set('projects', this.projectsIndex);
    await del('project:' + id);
    await del('versions:' + id);
  }

  async duplicateProject(id, name) {
    const src = id === this.project.id ? this.project : await get('project:' + id);
    if (!src) return;
    const p = JSON.parse(JSON.stringify(src));
    p.id = uid('p');
    p.name = name || src.name + ' (copie)';
    p.created = Date.now();
    p.comments = [];
    p.status = 'brouillon';
    await this.loadProject(p, { fresh: true });
  }

  /* ---------------- scène ---------------- */

  disposeGroup(g) {
    g.removeFromParent();
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.isCSS2DObject) o.element.remove();
    });
  }

  sync() {
    const p = this.project;
    const sk = JSON.stringify(STAND_KEYS.map((k) => p.stand[k]));
    if (sk !== this._standKey) {
      this._standKey = sk;
      this.buildStand();
    }
    const seen = new Set();
    let rebuilt = false;
    let videos = 0;
    for (const o of p.objects) {
      seen.add(o.id);
      const { x, y, z, rot, ...rest } = o;
      const key = JSON.stringify(rest);
      let e = this.cache.get(o.id);
      if (!e || e.key !== key) {
        if (e) this.disposeGroup(e.group);
        let g;
        try {
          g = buildObject(o);
        } catch (err) {
          console.error('build', o, err);
          g = buildObject({ ...o, type: 'visual' });
        }
        this.viewer.root.add(g);
        e = { key, group: g };
        this.cache.set(o.id, e);
        rebuilt = true;
      }
      const g = e.group;
      g.position.set(o.x, o.y || 0, o.z);
      g.rotation.set(0, rad(o.rot || 0), 0);
      g.visible = !p.hiddenZones.includes(o.zone || '') && !(this.viewer.mode === 'plan' && TYPES[o.type]?.hanging);
      if (g.visible) for (const k of ['image', 'imageBack', 'imageSide']) if (o[k] && assets.getMeta(o[k])?.kind === 'video') videos++;
    }
    for (const [id, e] of this.cache) {
      if (!seen.has(id)) {
        this.disposeGroup(e.group);
        this.cache.delete(id);
        rebuilt = true;
      }
    }
    this.viewer.videos = videos;
    if (rebuilt) this.viewer.applyShadows();
    this.viewer.root.updateMatrixWorld(true);
    this.computeAlerts();
    this.attachGizmo();
    this.updateHelpers();
    this.viewer.invalidate();
  }

  buildStand() {
    const v = this.viewer;
    const st = this.stand;
    const { w: W, d: D } = st;
    clearGroup(v.standGroup);
    v.setStandSize(W, D);

    const fm = floorMaterial(st.floor, W, D, st.floor.asset ? assets.texture(st.floor.asset) : null);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.03, D), fm);
    floor.position.set(W / 2, -0.015, D / 2);
    floor.receiveShadow = true;
    floor.userData.ground = true;
    v.standGroup.add(floor);

    // calque de plan importé
    if (st.plan?.asset && assets.texture(st.plan.asset)) {
      const info = assets.imageInfo(st.plan.asset);
      const pw = st.plan.width;
      const ph = (pw * info.h) / info.w;
      const t = assets.texture(st.plan.asset);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: st.plan.opacity ?? 0.6, depthWrite: false, toneMapped: false }));
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -rad(st.plan.rot || 0);
      m.position.set(st.plan.x, 0.004, st.plan.z);
      m.userData.ground = true;
      m.userData.plan = true;
      m.renderOrder = 1;
      v.standGroup.add(m);
    }

    // grille aimantée
    const grid = new THREE.Group();
    grid.name = 'grid';
    const step = st.grid || 0.1;
    const minor = [];
    const major = [];
    const pushLine = (arr, a, b) => arr.push(a.x, 0.003, a.z, b.x, 0.003, b.z);
    for (let x = 0; x <= W + 1e-6; x += step) {
      const isMajor = Math.abs(x - Math.round(x)) < 1e-6;
      pushLine(isMajor ? major : minor, { x, z: 0 }, { x, z: D });
    }
    for (let z = 0; z <= D + 1e-6; z += step) {
      const isMajor = Math.abs(z - Math.round(z)) < 1e-6;
      pushLine(isMajor ? major : minor, { x: 0, z }, { x: W, z });
    }
    const mk = (arr, op) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: op, depthWrite: false }));
    };
    if (step >= 0.05 && W / step < 400) grid.add(mk(minor, 0.1));
    grid.add(mk(major, 0.3));
    grid.visible = st.snap !== false;
    v.standGroup.add(grid);

    // cotes du stand
    const dims = new THREE.Group();
    dims.name = 'dims';
    if (st.dims !== false) {
      dims.add(dimLine(v, new THREE.Vector3(0, 0.01, D + 0.75), new THREE.Vector3(W, 0.01, D + 0.75), this.fmtLen(W)));
      dims.add(dimLine(v, new THREE.Vector3(W + 0.75, 0.01, 0), new THREE.Vector3(W + 0.75, 0.01, D), this.fmtLen(D)));
      const hm = dimLine(v, new THREE.Vector3(-0.35, 0, 0), new THREE.Vector3(-0.35, st.hMax, 0), 'H max ' + this.fmtLen(st.hMax), true);
      dims.add(hm);
      // plafond autorisé (cadre)
      const pts = [
        [0, 0],
        [W, 0],
        [W, D],
        [0, D],
        [0, 0],
      ].map(([x, z]) => new THREE.Vector3(x, st.hMax, z));
      const frame = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#ffb347', dashSize: 0.2, gapSize: 0.12, transparent: true, opacity: 0.6 }));
      frame.computeLineDistances();
      dims.add(frame);
      // côtés ouverts
      for (const side of st.open) {
        const c = { front: [W / 2, D + 1.25], back: [W / 2, -1.0], left: [-1.0, D / 2 + 0.6], right: [W + 1.25, D / 2 + 0.6] }[side];
        const l = v.label('allée', 'aisle-label');
        l.position.set(c[0], 0.02, c[1]);
        dims.add(l);
      }
    }
    v.standGroup.add(dims);

    // poignées de redimensionnement (tirer un bord du stand)
    if (!this.readOnly) {
      const hg = new THREE.Group();
      hg.name = 'handles';
      const mat = new THREE.MeshBasicMaterial({ color: '#2f8fd8', depthTest: false, transparent: true, opacity: 0.95 });
      const white = new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false, transparent: true });
      const mk = (side, x, z, rotY) => {
        const g = new THREE.Group();
        const pill = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 28), mat);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.035), white);
        for (const k of [-1, 1]) {
          const c = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.08, 12), white);
          c.rotation.z = -k * Math.PI / 2;
          c.position.x = k * 0.12;
          g.add(c);
        }
        g.add(pill, bar);
        g.children.forEach((m) => (m.renderOrder = 20));
        g.position.set(x, 0.05, z);
        g.rotation.y = rotY;
        g.userData.handle = side;
        hg.add(g);
      };
      mk('right', W + 0.32, D / 2, 0);
      mk('left', -0.32, D / 2, 0);
      mk('front', W / 2, D + 0.32, Math.PI / 2);
      mk('back', W / 2, -0.32, Math.PI / 2);
      v.standGroup.add(hg);
    }

    // environnement du hall : allées et stands voisins
    if (st.env) {
      const env = new THREE.Group();
      const A = st.aisle || 3;
      const aisleMat = new THREE.MeshStandardMaterial({ color: '#9ea6ae', roughness: 1 });
      const neighMat = new THREE.MeshStandardMaterial({ color: '#e4e6e8', roughness: 0.9, transparent: true, opacity: 0.85 });
      const sides = {
        front: { x: W / 2, z: D + A / 2, w: W + 2 * A, d: A },
        back: { x: W / 2, z: -A / 2, w: W + 2 * A, d: A },
        left: { x: -A / 2, z: D / 2, w: A, d: D },
        right: { x: W + A / 2, z: D / 2, w: A, d: D },
      };
      for (const [side, r] of Object.entries(sides)) {
        if (st.open.includes(side)) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.005, r.d), aisleMat);
          m.position.set(r.x, -0.027, r.z);
          m.receiveShadow = true;
          env.add(m);
        } else {
          const nb = { back: { x: W / 2, z: -1.5, w: W, d: 3 }, left: { x: -1.5, z: D / 2, w: 3, d: D }, right: { x: W + 1.5, z: D / 2, w: 3, d: D }, front: { x: W / 2, z: D + 1.5, w: W, d: 3 } }[side];
          const m = new THREE.Mesh(new THREE.BoxGeometry(nb.w - 0.05, 2.5, nb.d - 0.05), neighMat);
          m.position.set(nb.x, 1.25, nb.z);
          m.castShadow = m.receiveShadow = true;
          env.add(m);
        }
      }
      v.standGroup.add(env);
    }
    v.invalidate();
  }

  /* ---------------- géométrie & alertes ---------------- */

  footprint(o, box) {
    const e = this.cache.get(o.id);
    const b = box || e?.group.userData.box;
    if (!b) return null;
    const c = Math.cos(rad(o.rot || 0));
    const s = Math.sin(rad(o.rot || 0));
    const tr = (lx, lz) => ({ x: o.x + lx * c + lz * s, z: o.z - lx * s + lz * c });
    return {
      poly: [tr(b.min.x, b.min.z), tr(b.max.x, b.min.z), tr(b.max.x, b.max.z), tr(b.min.x, b.max.z)],
      y0: (o.y || 0) + b.min.y,
      y1: (o.y || 0) + b.max.y,
    };
  }

  parts(o) {
    const ud = this.cache.get(o.id)?.group.userData;
    if (ud?.parts) return ud.parts.map((b) => this.footprint(o, b));
    return [this.footprint(o)];
  }

  isVisible(o) {
    return !this.project.hiddenZones.includes(o.zone || '');
  }

  computeAlerts() {
    const st = this.stand;
    const alerts = [];
    const bad = new Set();
    const vis = this.project.objects.filter((o) => this.isVisible(o) && this.cache.has(o.id));
    const fps = new Map(vis.map((o) => [o.id, this.footprint(o)]));
    const T = 0.004;
    for (const o of vis) {
      if (TYPES[o.type]?.decor) continue;
      const f = fps.get(o.id);
      if (f.poly.some((p) => p.x < -T || p.x > st.w + T || p.z < -T || p.z > st.d + T)) {
        alerts.push({ level: 'error', ids: [o.id], msg: `« ${o.name} » dépasse de l’emprise du stand` });
        bad.add(o.id);
      }
      if (f.y1 > st.hMax + T) {
        alerts.push({ level: 'error', ids: [o.id], msg: `« ${o.name} » dépasse la hauteur max (${this.fmtLen(f.y1)} > ${this.fmtLen(st.hMax)})` });
        bad.add(o.id);
      }
      const dpi = this.cache.get(o.id).group.userData.dpi;
      for (const [k, v] of Object.entries(dpi)) {
        if (v < 100) alerts.push({ level: 'warn', ids: [o.id], msg: `Visuel de « ${o.name} » : ${v} dpi à taille réelle (< 100 dpi)` });
      }
    }
    const col = vis.filter((o) => !noCollide(o));
    for (let i = 0; i < col.length; i++) {
      for (let j = i + 1; j < col.length; j++) {
        const a = col[i];
        const b = col[j];
        const fa = fps.get(a.id);
        const fb = fps.get(b.id);
        if (Math.min(fa.y1, fb.y1) - Math.max(fa.y0, fb.y0) <= 0.005) continue;
        // un objet posé sur un support (plateau de guéridon…) n'est pas en collision avec lui
        if (isSupport(a) && fb.y0 >= this.supportSurface(a, fa) - 0.01) continue;
        if (isSupport(b) && fa.y0 >= this.supportSurface(b, fb) - 0.01) continue;
        if (!polyOverlap(fa.poly, fb.poly)) continue;
        const pa = this.parts(a);
        const pb = this.parts(b);
        let hit = false;
        for (const x of pa) {
          for (const y of pb) {
            if (Math.min(x.y1, y.y1) - Math.max(x.y0, y.y0) > 0.005 && polyOverlap(x.poly, y.poly)) {
              hit = true;
              break;
            }
          }
          if (hit) break;
        }
        if (!hit) continue;
        alerts.push({ level: 'error', ids: [a.id, b.id], msg: `Collision : « ${a.name} » ↔ « ${b.name} »` });
        bad.add(a.id);
        bad.add(b.id);
      }
    }
    this.alerts = alerts;
    this.bad = bad;
  }

  /** Hauteur du dessus du support (socle, comptoir…) sous un point */
  supportTop(x, z, exclude) {
    let top = 0;
    for (const o of this.project.objects) {
      if (o.id === exclude || !isSupport(o) || !this.isVisible(o)) continue;
      const f = this.footprint(o);
      if (f && pointInPoly(x, z, f.poly)) top = Math.max(top, this.supportSurface(o, f));
    }
    return top;
  }

  /** Hauteur de la surface de pose (plateau supérieur pour un guéridon, dessus pour le reste) */
  supportSurface(o, f) {
    if (o.type === 'device' && o.model === 'gueridon') {
      const topY = (o.h || 0.8) - (o.poignees === false ? 0.03 : 0.12);
      return (o.y || 0) + topY + (o.matiere === 'plastique' ? 0.0175 : 0.006);
    }
    return f.y1;
  }

  updateHelpers() {
    const v = this.viewer;
    clearGroup(v.helpers);
    const boxOf = (o) => {
      const e = this.cache.get(o.id);
      if (!e) return null;
      return e.group.userData.box.clone().applyMatrix4(e.group.matrixWorld);
    };
    for (const id of this.bad) {
      const o = this.obj(id);
      if (!o || !this.isVisible(o)) continue;
      const b = boxOf(o);
      if (b) v.helpers.add(new THREE.Box3Helper(b.expandByScalar(0.01), '#ff3b30'));
    }
    const s = this.sel;
    if (s && this.cache.has(s.id)) {
      const b = boxOf(s);
      v.helpers.add(new THREE.Box3Helper(b.clone().expandByScalar(0.006), '#2fa8ff'));
      const l = v.label(`${this.fmtLen(b.max.x - b.min.x)} × ${this.fmtLen(b.max.z - b.min.z)} × h ${this.fmtLen(b.max.y - b.min.y)}`, 'sel-label');
      l.position.set((b.min.x + b.max.x) / 2, b.max.y + 0.08, (b.min.z + b.max.z) / 2);
      v.helpers.add(l);
    }
    // éléments suspendus : contour en tirets en vue de dessus
    if (v.mode === 'plan') {
      for (const o of this.project.objects) {
        if (!TYPES[o.type]?.hanging || !this.isVisible(o) || !this.cache.has(o.id)) continue;
        const f = this.footprint(o);
        const pts = [...f.poly, f.poly[0]].map((q) => new THREE.Vector3(q.x, 0.02, q.z));
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: this.selected === o.id ? '#2fa8ff' : '#ffffff', dashSize: 0.12, gapSize: 0.08 }));
        line.computeLineDistances();
        v.helpers.add(line);
        const l = v.label(o.name + ' (suspendu)', 'aisle-label');
        l.position.set((f.poly[0].x + f.poly[2].x) / 2, 0.02, (f.poly[0].z + f.poly[2].z) / 2);
        v.helpers.add(l);
      }
    }
    // guides d’aimantation et cotes en direct
    for (const g of this.guides || []) {
      const pts = [new THREE.Vector3(g.a.x, 0.03, g.a.z), new THREE.Vector3(g.b.x, 0.03, g.b.z)];
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#2fa8ff', depthTest: false, transparent: true }));
      l.renderOrder = 6;
      v.helpers.add(l);
    }
    for (const g of this.gaps || []) {
      v.helpers.add(dimLine(v, new THREE.Vector3(g.a.x, 0.04, g.a.z), new THREE.Vector3(g.b.x, 0.04, g.b.z), this.fmtLen(g.len), false, '#30d158'));
    }
    // mesures
    for (const m of this.project.measures || []) {
      const a = new THREE.Vector3(...m.a);
      const b = new THREE.Vector3(...m.b);
      v.helpers.add(dimLine(v, a, b, this.fmtLen(a.distanceTo(b)), false, '#ffd60a'));
    }
    for (const p of this.toolPts) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffd60a', depthTest: false }));
      dot.position.copy(p);
      dot.renderOrder = 10;
      v.helpers.add(dot);
    }
    // commentaires épinglés
    (this.project.comments || []).forEach((c, i) => {
      if (c.resolved) return;
      let pos = new THREE.Vector3(...(c.pos || [0, 0, 0]));
      const o = c.objId && this.obj(c.objId);
      if (o) {
        const b = boxOf(o);
        if (b) pos = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y + 0.25, (b.min.z + b.max.z) / 2);
      }
      const el = h('div', { class: 'pin', title: `${c.author || 'Anonyme'} : ${c.text}`, onClick: () => this.ui.showComments(c.id) }, String(i + 1));
      const lbl = new CSS2DObject(el);
      lbl.position.copy(pos);
      v.helpers.add(lbl);
    });
    v.invalidate();
  }

  attachGizmo() {
    const v = this.viewer;
    const s = this.sel;
    const e = s && this.cache.get(s.id);
    if (e && !this.readOnly && v.mode !== 'visitor' && !this.tool && !this.placing) {
      if (v.tc.object !== e.group) v.tc.attach(e.group);
    } else v.tc.detach();
  }

  /* ---------------- édition ---------------- */

  select(id) {
    this.selected = id;
    this.attachGizmo();
    this.updateHelpers();
    this.ui.refresh();
    if (id) this.ui.showTab('props');
  }

  snap(v) {
    const st = this.stand;
    if (st.snap === false || this.shift) return Math.round(v * 1000) / 1000;
    const g = st.grid || 0.1;
    return Math.round(Math.round(v / g) * g * 1000) / 1000;
  }

  /** Ajoute un objet (depuis le catalogue, la bibliothèque, un import…) */
  addObject(data, at) {
    if (this.readOnly) return;
    this.cancelPlacing();
    const o = { x: 0, y: 0, z: 0, rot: 0, zone: '', ...JSON.parse(JSON.stringify(data)), id: uid('o') };
    const st = this.stand;
    o.x = this.snap(at ? at.x : st.w / 2);
    o.z = this.snap(at ? at.z : st.d / 2);
    this.project.objects.push(o);
    this.selected = o.id;
    this.sync();
    if (at) this.applyPlacement(o, at.x, at.z);
    else if (isStackable(o)) o.y = this.supportTop(o.x, o.z, o.id);
    this.guides = [];
    this.gaps = [];
    this.commit('Ajouter ' + o.name);
    this.ui.showTab('props');
    return o;
  }

  /* ----- pose « au clic » (comme un configurateur de cuisine) ----- */

  startPlacing(data) {
    if (this.readOnly) return;
    this.cancelPlacing();
    if (this.tool) this.setTool(null);
    const st = this.stand;
    const o = { x: st.w / 2, y: 0, z: st.d / 2, rot: 0, zone: '', ...JSON.parse(JSON.stringify(data)), id: uid('o') };
    this.project.objects.push(o);
    this.placing = o.id;
    this.selected = o.id;
    this.sync();
    if (this.lastPointer) this.applyPlacement(o, this.lastPointer.x, this.lastPointer.z);
    this.ui.refreshTools();
  }

  finishPlacing() {
    const o = this.obj(this.placing);
    this.placing = null;
    this.guides = [];
    this.gaps = [];
    this.ui.refreshTools();
    if (o) {
      this.commit('Ajouter ' + o.name);
      this.ui.showTab('props');
    }
  }

  cancelPlacing() {
    if (!this.placing) return;
    this.project.objects = this.project.objects.filter((o) => o.id !== this.placing);
    this.placing = null;
    this.selected = null;
    this.guides = [];
    this.gaps = [];
    this.sync();
    this.ui.refresh();
    this.ui.refreshTools();
  }

  /** Positionne un objet près d’un point : aimantation aux murs, aux voisins, puis à la grille */
  applyPlacement(o, cx, cz) {
    const smart = this.stand.smart !== false && !this.shift;
    this.guides = [];
    let r = null;
    const overSupport = isStackable(o) && this.supportTop(cx, cz, o.id) > 0;
    if (smart && !overSupport) r = this.wallSnap(o, cx, cz);
    if (r) {
      o.x = r.x;
      o.z = r.z;
      o.rot = r.rot;
      this.guides = r.guides;
    } else if (smart) {
      const f = this.neighborSnap(o, cx, cz);
      o.x = f.x;
      o.z = f.z;
      this.guides = f.guides;
    } else {
      o.x = this.snap(cx);
      o.z = this.snap(cz);
    }
    if (isStackable(o)) o.y = this.supportTop(o.x, o.z, o.id);
    const g = this.cache.get(o.id)?.group;
    if (g) {
      g.position.set(o.x, o.y || 0, o.z);
      g.rotation.set(0, rad(o.rot || 0), 0);
      g.updateMatrixWorld(true);
    }
    this.gaps = this.computeGaps(o);
    this.computeAlerts();
    this.updateHelpers();
    this.ui.livePos?.(o);
    this.ui.liveRot?.(o.rot);
  }

  /** Segments « mur » : côtés fermés du stand + faces des cloisons et réserves */
  wallSegments(o) {
    const st = this.stand;
    const W = st.w;
    const D = st.d;
    const segs = [];
    const edge = (side, a, b, n) => {
      if (!st.open.includes(side)) segs.push({ a, b, n, kind: 'edge' });
    };
    edge('back', { x: 0, z: 0 }, { x: W, z: 0 }, { x: 0, z: 1 });
    edge('front', { x: W, z: D }, { x: 0, z: D }, { x: 0, z: -1 });
    edge('left', { x: 0, z: D }, { x: 0, z: 0 }, { x: 1, z: 0 });
    edge('right', { x: W, z: 0 }, { x: W, z: D }, { x: -1, z: 0 });
    if (o.type === 'wall' || o.type === 'curvedWall' || o.type === 'storage') return segs;
    for (const w of this.project.objects) {
      if (w.id === o.id || !this.isVisible(w) || !['wall', 'storage'].includes(w.type)) continue;
      const b = this.cache.get(w.id)?.group.userData.box;
      if (!b) continue;
      const th = rad(w.rot || 0);
      const ux = { x: Math.cos(th), z: -Math.sin(th) };
      const nz = { x: Math.sin(th), z: Math.cos(th) };
      const P = (lx, lz) => ({ x: w.x + lx * ux.x + lz * nz.x, z: w.z + lx * ux.z + lz * nz.z });
      segs.push({ a: P(b.min.x, b.max.z), b: P(b.max.x, b.max.z), n: nz, kind: 'wall' });
      segs.push({ a: P(b.max.x, b.min.z), b: P(b.min.x, b.min.z), n: { x: -nz.x, z: -nz.z }, kind: 'wall' });
      if (w.type === 'storage') {
        segs.push({ a: P(b.min.x, b.min.z), b: P(b.min.x, b.max.z), n: { x: -ux.x, z: -ux.z }, kind: 'wall' });
        segs.push({ a: P(b.max.x, b.max.z), b: P(b.max.x, b.min.z), n: ux, kind: 'wall' });
      }
    }
    return segs;
  }

  wallSnap(o, cx, cz) {
    const T = TYPES[o.type] || {};
    const b = this.cache.get(o.id)?.group.userData.box;
    if (!b || T.hanging || T.light) return null;
    const depthBack = -b.min.z;
    const depth = b.max.z - b.min.z;
    let best = null;
    for (const sg of this.wallSegments(o)) {
      const n = sg.n;
      const d0 = sg.a.x * n.x + sg.a.z * n.z;
      const dist = cx * n.x + cz * n.z - d0;
      if (dist < -0.2 || dist > depthBack + 0.45) continue;
      const th = Math.atan2(n.x, n.z);
      const ux = { x: Math.cos(th), z: -Math.sin(th) };
      const sA = sg.a.x * ux.x + sg.a.z * ux.z;
      const sB = sg.b.x * ux.x + sg.b.z * ux.z;
      const s0 = Math.min(sA, sB);
      const s1 = Math.max(sA, sB);
      const s = cx * ux.x + cz * ux.z;
      if (s < s0 - 0.25 || s > s1 + 0.25) continue;
      const score = Math.abs(dist - depthBack);
      if (!best || score < best.score) best = { sg, n, th, ux, d0, s, s0, s1, score };
    }
    if (!best) return null;
    const { n, ux, s0, s1, d0, th } = best;
    let s = best.s;
    const wdt = b.max.x - b.min.x;
    if (s1 - s0 >= wdt) s = Math.min(Math.max(s, s0 - b.min.x), s1 - b.max.x);
    const cands = [s0 - b.min.x, s1 - b.max.x];
    for (const q of this.project.objects) {
      if (q.id === o.id || !this.isVisible(q) || noCollide(q) || !this.cache.has(q.id)) continue;
      const f = this.footprint(q).poly;
      const dd = f.map((p) => p.x * n.x + p.z * n.z);
      if (Math.max(...dd) < d0 + 0.01 || Math.min(...dd) > d0 + depth) continue;
      const ss = f.map((p) => p.x * ux.x + p.z * ux.z);
      cands.push(Math.min(...ss) - b.max.x, Math.max(...ss) - b.min.x);
    }
    let c = null;
    for (const v of cands) if (Math.abs(v - s) < 0.15 && (c == null || Math.abs(v - s) < Math.abs(c - s))) c = v;
    s = c != null ? c : this.snap(s);
    const dPlane = d0 + depthBack;
    const rot = Math.round(deg(th) * 10) / 10;
    return {
      x: Math.round((ux.x * s + n.x * dPlane) * 1000) / 1000,
      z: Math.round((ux.z * s + n.z * dPlane) * 1000) / 1000,
      rot: ((rot + 540) % 360) - 180,
      guides: [{ a: best.sg.a, b: best.sg.b }],
    };
  }

  /** Alignement bord à bord avec les objets de même orientation (comme des caissons de cuisine) */
  neighborSnap(o, cx, cz) {
    const b = this.cache.get(o.id)?.group.userData.box;
    let x = this.snap(cx);
    let z = this.snap(cz);
    const guides = [];
    if (!b) return { x, z, guides };
    const th = rad(o.rot || 0);
    const ux = { x: Math.cos(th), z: -Math.sin(th) };
    const n = { x: Math.sin(th), z: Math.cos(th) };
    let s = cx * ux.x + cz * ux.z;
    let d = cx * n.x + cz * n.z;
    let bs = null;
    let bd = null;
    const T = 0.12;
    for (const q of this.project.objects) {
      if (q.id === o.id || !this.isVisible(q) || noCollide(q) || !this.cache.has(q.id)) continue;
      if (Math.abs((((q.rot || 0) - (o.rot || 0)) % 90 + 90) % 90) > 0.5 && Math.abs((((q.rot || 0) - (o.rot || 0)) % 90 + 90) % 90 - 90) > 0.5) continue;
      const f = this.footprint(q).poly;
      const ss = f.map((p) => p.x * ux.x + p.z * ux.z);
      const dd = f.map((p) => p.x * n.x + p.z * n.z);
      const qs0 = Math.min(...ss);
      const qs1 = Math.max(...ss);
      const qd0 = Math.min(...dd);
      const qd1 = Math.max(...dd);
      const os0 = s + b.min.x;
      const os1 = s + b.max.x;
      const od0 = d + b.min.z;
      const od1 = d + b.max.z;
      const dOverlap = Math.min(od1, qd1) - Math.max(od0, qd0) > -0.02;
      const sOverlap = Math.min(os1, qs1) - Math.max(os0, qs0) > -0.02;
      const tryS = (v) => {
        if (Math.abs(v - s) < T && (bs == null || Math.abs(v - s) < Math.abs(bs - s))) bs = v;
      };
      const tryD = (v) => {
        if (Math.abs(v - d) < T && (bd == null || Math.abs(v - d) < Math.abs(bd - d))) bd = v;
      };
      if (dOverlap && Math.abs(os0 - qs1) < 0.4 + T) {
        tryS(qs1 - b.min.x);
      }
      if (dOverlap && Math.abs(os1 - qs0) < 0.4 + T) tryS(qs0 - b.max.x);
      if (sOverlap) {
        tryD(qd1 - b.min.z);
        tryD(qd0 - b.max.z);
      }
      if (Math.abs(os0 - qs1) < 0.6 || Math.abs(os1 - qs0) < 0.6) {
        tryD(qd1 - b.max.z); // fronts alignés
        tryD(qd0 - b.min.z); // dos alignés
      }
      if (Math.abs(od0 - qd1) < 0.6 || Math.abs(od1 - qd0) < 0.6) {
        tryS(qs0 - b.min.x);
        tryS(qs1 - b.max.x);
      }
    }
    if (bs == null && bd == null) return { x, z, guides };
    if (bs == null) bs = Math.round(s / (this.stand.grid || 0.1)) * (this.stand.grid || 0.1);
    if (bd == null) bd = Math.round(d / (this.stand.grid || 0.1)) * (this.stand.grid || 0.1);
    x = Math.round((ux.x * bs + n.x * bd) * 1000) / 1000;
    z = Math.round((ux.z * bs + n.z * bd) * 1000) / 1000;
    return { x, z, guides };
  }

  /** Distances (cotes vertes) entre l’objet et les murs / voisins, dans les 4 directions */
  computeGaps(o) {
    const f = this.footprint(o);
    if (!f || TYPES[o.type]?.hanging) return [];
    const bx0 = Math.min(...f.poly.map((p) => p.x));
    const bx1 = Math.max(...f.poly.map((p) => p.x));
    const bz0 = Math.min(...f.poly.map((p) => p.z));
    const bz1 = Math.max(...f.poly.map((p) => p.z));
    const st = this.stand;
    const lim = { l: 0, r: st.w, b: 0, f: st.d };
    for (const q of this.project.objects) {
      if (q.id === o.id || !this.isVisible(q) || noCollide(q) || !this.cache.has(q.id)) continue;
      const g = this.footprint(q);
      if (Math.min(g.y1, f.y1) - Math.max(g.y0, f.y0) <= 0) continue;
      const qx0 = Math.min(...g.poly.map((p) => p.x));
      const qx1 = Math.max(...g.poly.map((p) => p.x));
      const qz0 = Math.min(...g.poly.map((p) => p.z));
      const qz1 = Math.max(...g.poly.map((p) => p.z));
      if (Math.min(qz1, bz1) - Math.max(qz0, bz0) > 0.01) {
        if (qx1 <= bx0 + 0.001) lim.l = Math.max(lim.l, qx1);
        if (qx0 >= bx1 - 0.001) lim.r = Math.min(lim.r, qx0);
      }
      if (Math.min(qx1, bx1) - Math.max(qx0, bx0) > 0.01) {
        if (qz1 <= bz0 + 0.001) lim.b = Math.max(lim.b, qz1);
        if (qz0 >= bz1 - 0.001) lim.f = Math.min(lim.f, qz0);
      }
    }
    const zc = (bz0 + bz1) / 2;
    const xc = (bx0 + bx1) / 2;
    const out = [];
    const push = (a, b) => {
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len > 0.004 && len < 30) out.push({ a, b, len });
    };
    push({ x: lim.l, z: zc }, { x: bx0, z: zc });
    push({ x: bx1, z: zc }, { x: lim.r, z: zc });
    push({ x: xc, z: lim.b }, { x: xc, z: bz0 });
    push({ x: xc, z: bz1 }, { x: xc, z: lim.f });
    return out;
  }

  /* ----- redimensionnement du stand par les poignées ----- */

  handleObjects() {
    return this.viewer.standGroup.getObjectByName('handles')?.children || [];
  }

  startResize(side) {
    this.resizing = { side, w0: this.stand.w, d0: this.stand.d, objs0: JSON.parse(JSON.stringify(this.project.objects)), plan0: this.stand.plan ? { ...this.stand.plan } : null, started: false };
    this.viewer.orbit.enabled = false;
    this.viewer.planCtl.enabled = false;
  }

  /** Déplace un bord du stand ; les éléments collés au bord suivent, les cloisons pleine longueur s’étirent */
  resizeTo(p) {
    const R = this.resizing;
    const st = this.stand;
    const g = Math.max(0.05, st.grid || 0.1);
    const sn = (v) => Math.round(v / g) * g;
    const axis = R.side === 'left' || R.side === 'right' ? 'x' : 'z';
    const size0 = axis === 'x' ? R.w0 : R.d0;
    const isMax = R.side === 'right' || R.side === 'front';
    const p0 = isMax ? size0 : 0;
    let p1 = sn(axis === 'x' ? p.x : p.z);
    p1 = isMax ? Math.max(1, Math.min(60, p1)) : Math.min(size0 - 1, Math.max(size0 - 60, p1));
    const delta = Math.round((p1 - p0) * 1000) / 1000;
    const objs = JSON.parse(JSON.stringify(R.objs0));
    const T = 0.03;
    const aabb = (o) => {
      const f = this.footprint(o, this.cache.get(o.id).group.userData.box).poly;
      return { x0: Math.min(...f.map((q) => q.x)), x1: Math.max(...f.map((q) => q.x)), z0: Math.min(...f.map((q) => q.z)), z1: Math.max(...f.map((q) => q.z)) };
    };
    const movedBoxes = [];
    const moved = new Set();
    for (const o of objs) {
      const live = this.cache.get(o.id);
      if (!live) continue;
      const f = this.footprint(o, live.group.userData.box);
      const lo = Math.min(...f.poly.map((q) => q[axis]));
      const hi = Math.max(...f.poly.map((q) => q[axis]));
      const touches = isMax ? hi >= size0 - T : lo <= T;
      const spans = lo <= T && hi >= size0 - T;
      const rot = (((o.rot || 0) % 180) + 180) % 180;
      const along = axis === 'x' ? rot < 1 || rot > 179 : Math.abs(rot - 90) < 1;
      if (spans && ['wall', 'lightbox', 'banner', 'truss', 'shelf', 'led', 'podium'].includes(o.type)) {
        const key = o.type === 'podium' ? (along ? 'w' : 'd') : along ? 'w' : null;
        if (key) {
          o[key] = Math.max(0.2, Math.round((o[key] + (isMax ? delta : -delta)) * 1000) / 1000);
          o[axis] += delta / 2;
          continue;
        }
      }
      if (touches) {
        movedBoxes.push(aabb(o));
        moved.add(o.id);
        o[axis] += delta;
      }
    }
    // ce qui est posé dans, sur ou contre un élément déplacé le suit (contenu d’une réserve, produit sur un socle, caisson sur un pilier…)
    for (const o of objs) {
      if (moved.has(o.id) || !this.cache.has(o.id) || ['wall', 'curvedWall', 'storage'].includes(o.type)) continue;
      const a = aabb(o);
      if (movedBoxes.some((m) => Math.max(a.x0 - m.x1, m.x0 - a.x1, a.z0 - m.z1, m.z0 - a.z1) <= 0.02)) o[axis] += delta;
    }
    if (!isMax) for (const o of objs) o[axis] = Math.round((o[axis] - delta) * 1000) / 1000;
    for (const o of objs) o[axis] = Math.round(o[axis] * 1000) / 1000;
    this.project.objects = objs;
    if (axis === 'x') st.w = Math.round((isMax ? R.w0 + delta : R.w0 - delta) * 1000) / 1000;
    else st.d = Math.round((isMax ? R.d0 + delta : R.d0 - delta) * 1000) / 1000;
    if (R.plan0 && !isMax) st.plan = { ...R.plan0, [axis]: R.plan0[axis] - delta };
    R.started = true;
    this.sync();
  }

  /* ----- ambiances et finitions globales ----- */

  applyStyle(style, groups) {
    for (const o of this.project.objects) {
      for (const [k, types] of Object.entries(groups)) {
        if (!types.includes(o.type)) continue;
        o.finish = style[k];
        o.color = null;
        if (o.top) o.top = null;
        if (k === 'seat' && style.legs) o.legs = style.legs;
      }
    }
    this.project.stand.floor = { ...this.project.stand.floor, ...style.floor };
    this.commit('Ambiance ' + style.label);
  }

  replaceFinish(from, to) {
    let n = 0;
    for (const o of this.project.objects) {
      for (const k of ['finish', 'top', 'legs']) {
        if (o[k] === from) {
          o[k] = to;
          n++;
        }
      }
    }
    this.commit('Remplacer finition');
    return n;
  }

  assetKind(id) {
    return assets.getMeta(id)?.kind;
  }

  addFromCatalog(entry, at) {
    return this.addObject(fromCatalog(entry), at);
  }

  update(id, patch, { commit = true } = {}) {
    const o = this.obj(id);
    if (!o || this.readOnly) return;
    Object.assign(o, patch);
    if (commit) this.commit('Modifier');
    else {
      this.sync();
    }
  }

  remove(id = this.selected) {
    if (!id || this.readOnly) return;
    this.project.objects = this.project.objects.filter((o) => o.id !== id);
    for (const c of this.project.comments) if (c.objId === id) c.objId = null;
    if (this.selected === id) this.selected = null;
    this.commit('Supprimer');
  }

  duplicate(id = this.selected) {
    const o = this.obj(id);
    if (!o || this.readOnly) return;
    const c = JSON.parse(JSON.stringify(o));
    c.id = uid('o');
    const b = this.cache.get(o.id)?.group.userData.box;
    const dx = b ? Math.max(0.2, b.max.x - b.min.x + 0.1) : 0.5;
    c.x = this.snap(o.x + dx * Math.cos(rad(o.rot || 0)));
    c.z = this.snap(o.z - dx * Math.sin(rad(o.rot || 0)));
    this.project.objects.push(c);
    this.selected = c.id;
    this.commit('Dupliquer');
  }

  rotate(delta, id = this.selected) {
    const o = this.obj(id);
    if (!o || this.readOnly) return;
    o.rot = norm180((o.rot || 0) + delta);
    this.commit('Pivoter');
  }

  nudge(dx, dz) {
    const o = this.sel;
    if (!o || this.readOnly) return;
    const g = this.stand.grid || 0.1;
    o.x = Math.round((o.x + dx * g) * 1000) / 1000;
    o.z = Math.round((o.z + dz * g) * 1000) / 1000;
    if (isStackable(o)) o.y = this.supportTop(o.x, o.z, o.id);
    this.commit('Déplacer');
  }

  setStand(patch) {
    Object.assign(this.project.stand, patch);
    this.commit('Stand');
  }

  setTool(t) {
    this.tool = this.tool === t ? null : t;
    this.toolPts = [];
    this.attachGizmo();
    this.updateHelpers();
    this.ui.refreshTools();
  }

  /* ---------------- unités ---------------- */

  fmtLen(m) {
    const u = this.settings.unit;
    if (u === 'm') return (Math.round(m * 1000) / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 3 }) + ' m';
    if (u === 'cm') return (Math.round(m * 1000) / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' cm';
    return Math.round(m * 1000).toLocaleString('fr-FR') + ' mm';
  }
  toUnit(m) {
    const u = this.settings.unit;
    return u === 'm' ? Math.round(m * 1000) / 1000 : u === 'cm' ? Math.round(m * 1000) / 10 : Math.round(m * 1000);
  }
  fromUnit(v) {
    const n = parseFloat(String(v).replace(',', '.'));
    if (Number.isNaN(n)) return null;
    const u = this.settings.unit;
    return u === 'm' ? n : u === 'cm' ? n / 100 : n / 1000;
  }

  /* ---------------- entrées souris / clavier ---------------- */

  ray(e) {
    const r = this.viewer.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.viewer.camera);
    return rc;
  }

  hits(e, { objects = true, ground = true } = {}) {
    const v = this.viewer;
    const rc = this.ray(e);
    const targets = [];
    if (objects) targets.push(v.root);
    if (ground) targets.push(v.standGroup, v.hall);
    return rc.intersectObjects(targets, true).filter((hit) => {
      let o = hit.object;
      if (o.userData.noPick || o.isLine || o.isLineSegments) return false;
      while (o) {
        if (!o.visible) return false;
        o = o.parent;
      }
      return true;
    });
  }

  objIdOf(obj3d) {
    let o = obj3d;
    while (o && !o.userData?.objId) o = o.parent;
    return o?.userData.objId || null;
  }

  groundPoint(e) {
    const rc = this.ray(e);
    const p = new THREE.Vector3();
    return rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? p : null;
  }

  bindInput() {
    const v = this.viewer;
    const el = v.renderer.domElement;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => this.onDown(e));
    el.addEventListener('dblclick', (e) => {
      if (this.placing || this.tool) return;
      const hit = this.hits(e, { ground: false })[0];
      const id = hit && this.objIdOf(hit.object);
      const o = id && this.obj(id);
      if (!o || !TYPES[o.type]?.doors || (o.type === 'counter' && (!o.doors || o.doors === 'aucune')) || (o.type === 'storage' && o.doorSide === 'none')) return;
      const open = (o.doorOpen || 0) > 0 ? 0 : 90;
      if (this.readOnly) {
        // en mode visite : ouverture visuelle seulement (rien n'est enregistré)
        o.doorOpen = open;
        this.sync();
        return;
      }
      this.selected = id;
      this.update(id, { doorOpen: open });
      this.ui.toast(open ? 'Portes ouvertes (double-clic pour fermer).' : 'Portes fermées.');
    });
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    el.addEventListener(
      'wheel',
      (e) => {
        if (v.mode === 'visitor') {
          e.preventDefault();
          v.visitorStep(-Math.sign(e.deltaY) * 0.4, 0);
        }
      },
      { passive: false },
    );
    v.tc.addEventListener('objectChange', () => {
      const o = this.sel;
      if (!o) return;
      o.rot = norm180(Math.round(deg(v.tc.object.rotation.y) * 10) / 10);
      this.computeAlerts();
      this.updateHelpers();
      this.ui.liveRot?.(o.rot);
    });
    v.tc.addEventListener('dragging-changed', (e) => {
      if (!e.value) this.commit('Pivoter');
    });
    // masque l’anneau de rotation libre (« E ») : rotation au sol uniquement
    const kill = [];
    v.tcHelper.traverse((o) => {
      if (o.name === 'E') kill.push(o);
    });
    kill.forEach((o) => o.removeFromParent());

    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => v.visitor.keys.clear());

    // glisser-déposer : catalogue, visuels, fichiers
    const vp = this.ui.viewport;
    vp.addEventListener('dragover', (e) => {
      e.preventDefault();
      vp.classList.add('drop');
    });
    vp.addEventListener('dragleave', () => vp.classList.remove('drop'));
    vp.addEventListener('drop', (e) => this.onDrop(e));
  }

  onDown(e) {
    const v = this.viewer;
    this.down = { x: e.clientX, y: e.clientY, moved: false, button: e.button };
    if (this.placing) return;
    if (v.mode === 'visitor') {
      this.down.look = true;
      return;
    }
    if (e.button !== 0) return;
    if (v.tc.axis) return; // poignée de rotation
    if (this.tool || this.readOnly) return;
    const hh = this.ray(e).intersectObjects(this.handleObjects(), true)[0];
    if (hh) {
      let o = hh.object;
      while (o && !o.userData.handle) o = o.parent;
      this.startResize(o.userData.handle);
      return;
    }
    const hit = this.hits(e, { ground: false })[0];
    const id = hit && this.objIdOf(hit.object);
    if (id) {
      const o = this.obj(id);
      if (this.selected !== id) this.select(id);
      this.drag = {
        id,
        plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -hit.point.y),
        start: hit.point.clone(),
        ox: o.x,
        oz: o.z,
        started: false,
      };
      v.orbit.enabled = false;
      v.planCtl.enabled = false;
    }
  }

  onMove(e) {
    const v = this.viewer;
    this.shift = e.shiftKey;
    const onCanvas = e.target === v.renderer.domElement;
    if (onCanvas) this.lastPointer = this.groundPoint(e);
    // pose en cours : l’objet suit la souris
    if (this.placing && onCanvas && (!this.down || !this.down.moved)) {
      const o = this.obj(this.placing);
      if (o && this.lastPointer) this.applyPlacement(o, this.lastPointer.x, this.lastPointer.z);
    }
    if (!this.down) {
      // survol des poignées du stand
      if (onCanvas && !this.readOnly && v.mode !== 'visitor') {
        const hh = this.ray(e).intersectObjects(this.handleObjects(), true)[0];
        let side = null;
        if (hh) {
          let o = hh.object;
          while (o && !o.userData.handle) o = o.parent;
          side = o?.userData.handle;
        }
        v.renderer.domElement.style.cursor = side ? (side === 'left' || side === 'right' ? 'ew-resize' : 'ns-resize') : this.placing ? 'copy' : '';
      }
      return;
    }
    const dx = e.clientX - this.down.x;
    const dy = e.clientY - this.down.y;
    if (Math.hypot(dx, dy) > 3) this.down.moved = true;
    if (this.down.look) {
      v.visitorLook(e.movementX, e.movementY);
      return;
    }
    if (this.resizing) {
      if (this.down.moved) {
        const p = this.groundPoint(e);
        if (p) this.resizeTo(p);
      }
      return;
    }
    const d = this.drag;
    if (!d || !this.down.moved) return;
    const p = new THREE.Vector3();
    if (!this.ray(e).ray.intersectPlane(d.plane, p)) return;
    const o = this.obj(d.id);
    if (!o) return;
    d.started = true;
    this.applyPlacement(o, d.ox + p.x - d.start.x, d.oz + p.z - d.start.z);
    v.invalidate();
  }

  onUp(e) {
    const v = this.viewer;
    const down = this.down;
    this.down = null;
    if (!down) return;
    if (this.placing) {
      if (down.button === 2) this.cancelPlacing();
      else if (down.button === 0 && !down.moved && e.target === v.renderer.domElement) this.finishPlacing();
      return;
    }
    if (this.resizing) {
      const R = this.resizing;
      this.resizing = null;
      v.orbit.enabled = v.mode === 'orbit';
      v.planCtl.enabled = v.mode === 'plan';
      if (R.started) {
        this.commit('Redimensionner le stand');
        this.ui.renderTop();
        this.ui.toast(`Stand : ${this.fmtLen(this.stand.w)} × ${this.fmtLen(this.stand.d)}`);
      }
      return;
    }
    if (this.drag) {
      const d = this.drag;
      this.drag = null;
      v.orbit.enabled = v.mode === 'orbit';
      v.planCtl.enabled = v.mode === 'plan';
      if (d.started) {
        this.guides = [];
        this.gaps = [];
        this.commit('Déplacer');
        return;
      }
    }
    if (down.moved || down.button !== 0 || e.target !== v.renderer.domElement) return;
    if (v.tc.dragging) return;
    // clic simple
    if (this.tool === 'measure' || this.tool === 'calibrate') {
      const hit = this.hits(e)[0];
      if (!hit) return;
      this.toolPts.push(hit.point.clone());
      if (this.toolPts.length === 2) {
        const [a, b] = this.toolPts;
        this.toolPts = [];
        if (this.tool === 'measure') {
          this.project.measures.push({ a: a.toArray(), b: b.toArray() });
          this.commit('Mesure');
        } else this.finishCalibration(a, b);
      }
      this.updateHelpers();
      return;
    }
    if (this.tool === 'comment') {
      const hit = this.hits(e)[0];
      if (!hit) return;
      const id = this.objIdOf(hit.object);
      this.setTool(null);
      this.ui.addCommentDialog(id, hit.point.toArray());
      return;
    }
    if (v.tc.axis) return;
    const hit = this.hits(e, { ground: false })[0];
    const id = hit ? this.objIdOf(hit.object) : null;
    if (id !== this.selected) this.select(id);
  }

  async finishCalibration(a, b) {
    const st = this.stand;
    if (!st.plan) return;
    const measured = Math.hypot(b.x - a.x, b.z - a.z);
    const real = await this.ui.prompt('Calibrer le plan', `Distance réelle entre les deux points (${this.settings.unit}) :`, String(this.toUnit(measured)));
    this.setTool(null);
    const r = this.fromUnit(real);
    if (!r || r <= 0) return;
    const k = r / measured;
    // mise à l’échelle autour du premier point
    st.plan.width *= k;
    st.plan.x = a.x + (st.plan.x - a.x) * k;
    st.plan.z = a.z + (st.plan.z - a.z) * k;
    this.commit('Calibrer le plan');
    this.ui.toast('Plan mis à l’échelle (facteur ' + k.toFixed(3) + ').');
  }

  onKey(e, down) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const k = e.key.toLowerCase();
    const v = this.viewer;
    this.shift = e.shiftKey;
    if (v.mode === 'visitor' && ['w', 'z', 's', 'a', 'q', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
      if (down) v.visitor.keys.add(k);
      else v.visitor.keys.delete(k);
      e.preventDefault();
      return;
    }
    if (!down) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && k === 'z') {
      e.preventDefault();
      e.shiftKey ? this.redo() : this.undo();
    } else if (mod && k === 'y') {
      e.preventDefault();
      this.redo();
    } else if (mod && k === 'd') {
      e.preventDefault();
      this.duplicate();
    } else if (k === 'delete' || k === 'backspace') {
      if (this.placing) this.cancelPlacing();
      else if (this.selected) {
        e.preventDefault();
        this.remove();
      }
    } else if (k === 'escape') {
      if (this.placing) this.cancelPlacing();
      else if (this.tool) this.setTool(null);
      else this.select(null);
    } else if (k === 'r' && !mod && this.placing) {
      const o = this.obj(this.placing);
      o.rot = norm180((o.rot || 0) + (e.shiftKey ? -15 : 15));
      this.sync();
      if (this.lastPointer) this.applyPlacement(o, this.lastPointer.x, this.lastPointer.z);
    } else if (k === 'r' && !mod) this.rotate(e.shiftKey ? -15 : 15);
    else if (k.startsWith('arrow') && this.selected) {
      e.preventDefault();
      const m = e.shiftKey ? 5 : 1;
      if (k === 'arrowleft') this.nudge(-m, 0);
      if (k === 'arrowright') this.nudge(m, 0);
      if (k === 'arrowup') this.nudge(0, -m);
      if (k === 'arrowdown') this.nudge(0, m);
    } else if (k === '1') this.ui.setMode('plan');
    else if (k === '2') this.ui.setMode('orbit');
    else if (k === '3') this.ui.setMode('visitor');
    else if (k === 'm') this.setTool('measure');
  }

  async onDrop(e) {
    e.preventDefault();
    this.ui.viewport.classList.remove('drop');
    if (this.readOnly) return;
    const dt = e.dataTransfer;
    const cat = dt.getData('text/x-object');
    const asset = dt.getData('text/x-asset');
    const hit = this.hits(e)[0];
    const ground = this.groundPoint(e);
    if (cat) {
      this.addObject(JSON.parse(cat), ground || undefined);
      return;
    }
    let assetId = asset;
    if (!assetId && dt.files?.length) {
      const f = dt.files[0];
      try {
        this.ui.toast('Import de ' + f.name + '…');
        assetId = await assets.importFile(f);
      } catch (err) {
        this.ui.toast(err.message, 'error');
        return;
      }
      const m = assets.getMeta(assetId);
      if (m.kind === 'model') return this.addModel(assetId, ground);
      if (m.kind === 'font') return this.ui.toast('Police « ' + m.family + ' » ajoutée.');
      this.ui.refreshLeft();
    }
    if (!assetId) return;
    const id = hit && this.objIdOf(hit.object);
    if (id) this.applyImage(id, assetId, hit);
    else this.addObject({ type: 'visual', name: 'Visuel', w: 1, h: 1 * ((assets.getMeta(assetId).h || 1) / (assets.getMeta(assetId).w || 1)), y: 1, image: assetId }, ground);
  }

  /** Applique un visuel à l'objet visé (face avant ou arrière selon la face touchée) */
  applyImage(id, assetId, hit) {
    const o = this.obj(id);
    const keys = TYPES[o.type]?.images || [];
    if (!keys.length) {
      this.ui.toast('Cet objet ne reçoit pas de visuel.', 'error');
      return;
    }
    let key = keys[0];
    if (hit?.face && keys.includes('imageBack')) {
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      const front = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rad(o.rot || 0));
      if (hit.object.userData.imageKey) key = hit.object.userData.imageKey;
      else if (n.dot(front) < -0.5) key = 'imageBack';
    }
    o[key] = assetId;
    if (o.type === 'lightbox' && key === 'imageBack') o.doubleSided = true;
    this.selected = id;
    this.commit('Visuel');
    this.ui.showTab('props');
    this.ui.toast('Visuel appliqué sur « ' + o.name + ' ».');
  }

  addModel(assetId, at) {
    const e = assets.modelEntry(assetId);
    const m = assets.getMeta(assetId);
    const size = e.box.getSize(new THREE.Vector3()).multiplyScalar(m.unit || 1);
    const o = this.addObject({ type: 'model', name: m.name.replace(/\.[^.]+$/, ''), model: assetId, w: size.x, h: size.y, d: size.z, brand: m.brand || '' }, at);
    if (m.tris > 300000) this.ui.toast(`Modèle lourd (${m.tris.toLocaleString('fr-FR')} triangles) : pensez à l’alléger pour garder la fluidité.`, 'warn');
    return o;
  }

  async startComment() {
    if (this.selected) this.ui.addCommentDialog(this.selected, null);
    else {
      this.setTool('comment');
      this.ui.toast('Cliquez sur un objet ou un point du stand pour épingler le commentaire.');
    }
  }

  addComment(objId, pos, text) {
    const c = { id: uid('c'), objId, pos, text, author: this.settings.author || 'Anonyme', date: Date.now(), resolved: false };
    this.project.comments.push(c);
    // en mode visite, on enregistre quand même les commentaires
    const ro = this.readOnly;
    this.readOnly = false;
    this.commit('Commentaire');
    this.readOnly = ro;
    if (ro) set('project:' + this.project.id, this.project);
  }
}

/* ---------------- utilitaires ---------------- */

function clearGroup(g) {
  g.traverse((o) => {
    if (o.isCSS2DObject) o.element.remove();
  });
  for (const c of [...g.children]) {
    c.removeFromParent();
    c.traverse((o) => o.geometry?.dispose());
  }
}

function norm180(a) {
  a = ((a % 360) + 360) % 360;
  return a > 180 ? a - 360 : a;
}

function polyOverlap(A, B, tol = 0.003) {
  for (const P of [A, B]) {
    for (let i = 0; i < P.length; i++) {
      const p1 = P[i];
      const p2 = P[(i + 1) % P.length];
      const nx = p2.z - p1.z;
      const nz = p1.x - p2.x;
      const len = Math.hypot(nx, nz) || 1;
      let a0 = Infinity;
      let a1 = -Infinity;
      let b0 = Infinity;
      let b1 = -Infinity;
      for (const q of A) {
        const d = (q.x * nx + q.z * nz) / len;
        a0 = Math.min(a0, d);
        a1 = Math.max(a1, d);
      }
      for (const q of B) {
        const d = (q.x * nx + q.z * nz) / len;
        b0 = Math.min(b0, d);
        b1 = Math.max(b1, d);
      }
      if (a1 - tol <= b0 || b1 - tol <= a0) return false;
    }
  }
  return true;
}

function pointInPoly(x, z, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if (P[i].z > z !== P[j].z > z && x < ((P[j].x - P[i].x) * (z - P[i].z)) / (P[j].z - P[i].z) + P[i].x) inside = !inside;
  }
  return inside;
}

/** Ligne de cote avec étiquette */
function dimLine(v, a, b, text, vertical = false, color = '#ffffff') {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false });
  const pts = [a, b];
  const dir = b.clone().sub(a).normalize();
  const perp = vertical ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-dir.z, 0, dir.x);
  if (perp.lengthSq() < 0.1) perp.set(0, 1, 0);
  const t = 0.08;
  const lines = [a, b, a.clone().addScaledVector(perp, t), a.clone().addScaledVector(perp, -t), b.clone().addScaledVector(perp, t), b.clone().addScaledVector(perp, -t)];
  const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines), mat);
  l.renderOrder = 5;
  g.add(l);
  const lbl = v.label(text, color === '#ffffff' ? 'dim-label' : color === '#30d158' ? 'dim-label gap' : 'dim-label measure');
  lbl.position.copy(a.clone().add(b).multiplyScalar(0.5));
  g.add(lbl);
  return g;
}

export { polyOverlap, pointInPoly };
