// Collaboration (version en ligne) : comptes, demandes d'invitation / de participation, projets partagés synchronisés.
import * as assets from './assets.js';
import { set } from './store.js';
import { ALL_IMAGE_KEYS } from './objects.js';

const API = 'api/collab.php';
const MAX_UPLOAD = 4.2e6;
// suivi sobre : seulement quand l'onglet est affiché et que la personne est active
const INBOX_EVERY = 60000; // demandes et projets partagés
const REMOTE_EVERY = 20000; // modifications du projet partagé ouvert
const IDLE_AFTER = 10 * 60000; // pause du suivi après 10 min sans activité
const PUSH_DELAY = 4000; // regroupe les modifications rapprochées avant l'envoi

export class Collab {
  constructor(app, me) {
    this.app = app;
    this.me = me; // { user, name, users: [{id, name}] } ou null en local
    this.enabled = !!me;
    this.requests = [];
    this.shared = [];
    this.uploaded = new Map(); // pid -> Set(assetId)
    this.pushTimer = null;
    this.pushing = false;
  }

  name(id) {
    if (!id) return '';
    if (id === this.me?.user) return 'vous';
    return this.me?.users.find((u) => u.id === id)?.name || id.charAt(0).toUpperCase() + id.slice(1);
  }

  async api(action, { method = 'GET', body, query = {}, raw, type } = {}) {
    const qs = new URLSearchParams({ a: action, ...query }).toString();
    const opt = { method, cache: 'no-store', headers: {} };
    if (raw) {
      opt.body = raw;
      opt.headers['content-type'] = type || 'application/octet-stream';
    } else if (body) {
      opt.body = JSON.stringify(body);
      opt.headers['content-type'] = 'application/json';
    }
    const r = await fetch(`${API}?${qs}`, opt);
    if (r.status === 401) throw new Error('Session expirée : reconnectez-vous.');
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('json') ? await r.json() : r;
    if (!r.ok) {
      const e = new Error(data?.error || 'Erreur ' + r.status);
      e.status = r.status;
      e.data = data;
      throw e;
    }
    return data;
  }

  /* ---------- démarrage et suivi ---------- */

  start() {
    if (!this.enabled) return;
    this.refresh();
    this.publishDirectory();
    this.lastActive = Date.now();
    this.lastInbox = Date.now();
    this.lastRemote = Date.now();
    const awake = () => {
      const idle = Date.now() - this.lastActive > IDLE_AFTER;
      this.lastActive = Date.now();
      if (idle) this.tick(true); // retour après une pause : mise à jour immédiate
    };
    for (const ev of ['pointerdown', 'keydown', 'wheel']) window.addEventListener(ev, awake, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.tick(true);
    });
    setInterval(() => this.tick(), 5000);
  }

  /** Planificateur : rien quand l'onglet est caché ou la personne inactive */
  tick(force = false) {
    if (document.visibilityState !== 'visible') return;
    if (!force && Date.now() - this.lastActive > IDLE_AFTER) return;
    const now = Date.now();
    if (force || now - this.lastInbox >= INBOX_EVERY) {
      this.lastInbox = now;
      this.refresh();
    }
    if (force || now - this.lastRemote >= REMOTE_EVERY) {
      this.lastRemote = now;
      this.checkRemote();
    }
  }

  get incoming() {
    return this.requests.filter((r) => r.to === this.me.user && r.status === 'pending');
  }

  async refresh() {
    if (!this.enabled) return;
    try {
      ({ requests: this.requests, shared: this.shared } = await this.api('inbox'));
      this.app.ui.renderCollabBadge?.();
      // fenêtre d'alerte pour chaque nouvelle demande reçue (une seule fois par session)
      this.notified ||= new Set(JSON.parse(sessionStorage.getItem('stand3d:notified') || '[]'));
      for (const r of this.incoming) {
        if (this.notified.has(r.id)) continue;
        this.notified.add(r.id);
        sessionStorage.setItem('stand3d:notified', JSON.stringify([...this.notified]));
        this.app.ui.requestPopup?.(r);
      }
    } catch (e) {
      console.warn('collab', e);
    }
  }

  /** Liste de mes projets visible par les autres comptes (pour qu'ils puissent demander à collaborer) */
  async publishDirectory() {
    if (!this.enabled) return;
    const own = this.app.projectsIndex.filter((m) => !m.sharedFrom);
    // noms et salons seulement : on n'envoie rien si la liste n'a pas changé
    const projects = own.map((m) => ({ id: m.id, name: m.name, salon: m.salon }));
    const key = 'stand3d:dir:' + this.me.user;
    const sig = JSON.stringify(projects);
    try {
      if (localStorage.getItem(key) === sig) return;
    } catch (e) {
      /* stockage indisponible : on publie */
    }
    try {
      await this.api('directory', { method: 'POST', body: { projects: own.map((m) => ({ id: m.id, name: m.name, salon: m.salon, updated: m.updated })) } });
      try {
        localStorage.setItem(key, sig);
      } catch (e) {
        /* ignoré */
      }
    } catch (e) {
      console.warn('directory', e);
    }
  }

  directoryLater() {
    clearTimeout(this._dirT);
    this._dirT = setTimeout(() => this.publishDirectory(), 5000);
  }

  /* ---------- partage d'un projet ---------- */

  referencedAssets(p) {
    const ids = new Set();
    for (const o of p.objects) for (const k of [...ALL_IMAGE_KEYS, 'model']) if (o[k]) ids.add(o[k]);
    if (p.stand.plan?.asset) ids.add(p.stand.plan.asset);
    if (p.stand.floor?.asset) ids.add(p.stand.floor.asset);
    return [...ids].filter((id) => !id.startsWith('builtin:'));
  }

  async shrink(blob, meta) {
    if (blob.size <= MAX_UPLOAD || meta.kind !== 'image') return blob;
    const img = await createImageBitmap(blob);
    const s = Math.min(1, 4096 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise((r) => c.toBlob(r, meta.alpha ? 'image/png' : 'image/jpeg', 0.88));
  }

  /** Envoie les fichiers du projet (visuels, modèles) pas encore en ligne */
  async uploadAssets(p) {
    const pid = p.id;
    // fichiers déjà en ligne : mémorisés avec le projet (pas de nouvel envoi après un rechargement)
    const done = this.uploaded.get(pid) || new Set(p.shared?.uploaded || []);
    const metas = [];
    const skipped = [];
    for (const id of this.referencedAssets(p)) {
      const meta = assets.getMeta(id);
      if (!meta) continue;
      metas.push(meta);
      if (done.has(id)) continue;
      const blob = await assets.getBlob(id);
      if (!blob) continue;
      const b = await this.shrink(blob, meta);
      if (b.size > MAX_UPLOAD) {
        skipped.push(meta.name);
        continue;
      }
      try {
        await this.api('asset', { method: 'POST', query: { pid, aid: id }, raw: b, type: b.type || 'application/octet-stream' });
        done.add(id);
      } catch (e) {
        console.warn('envoi', meta.name, e);
        skipped.push(meta.name);
      }
    }
    this.uploaded.set(pid, done);
    if (p.shared) p.shared.uploaded = [...done];
    if (skipped.length) this.app.ui.toast(`Fichier(s) non partagé(s) (trop lourd ou erreur réseau, réessai à la prochaine modification) : ${skipped.join(', ')}`, 'warn', 6000);
    return metas;
  }

  clean(p) {
    const c = JSON.parse(JSON.stringify(p));
    delete c.shared;
    return c;
  }

  /** Fiches des fichiers utilisés par le projet (sans les envoyer) */
  assetMetas(p) {
    return this.referencedAssets(p)
      .map((id) => assets.getMeta(id))
      .filter(Boolean);
  }

  /** Met le projet en ligne (premier partage) : le projet d'abord, ses fichiers ensuite */
  async share(p) {
    const meta = await this.api('share', { method: 'POST', body: { project: this.clean(p), assets: this.assetMetas(p) } });
    p.shared = { owner: meta.owner, rev: meta.rev, members: meta.members, uploaded: [] };
    await this.app.persistShared(p);
    await this.uploadAssets(p);
    await this.app.persistShared(p);
    return meta;
  }

  /** Enregistrement en ligne d'un projet partagé (appelé après chaque sauvegarde locale) */
  schedulePush() {
    if (!this.enabled || !this.app.project.shared) return;
    clearTimeout(this.pushTimer);
    this.app.ui.setSyncState('pending');
    this.pushTimer = setTimeout(() => this.push(), PUSH_DELAY);
  }

  async push() {
    const p = this.app.project;
    if (!p.shared || this.pushing) return;
    this.pushing = true;
    this.pushTimer = null;
    try {
      const metas = await this.uploadAssets(p);
      const meta = await this.api('save', { method: 'POST', body: { project: this.clean(p), baseRev: p.shared.rev, assets: metas } });
      p.shared.rev = meta.rev;
      p.shared.members = meta.members;
      await this.app.persistShared(p);
      this.app.ui.setSyncState('ok');
    } catch (e) {
      if (e.status === 409) {
        this.app.ui.toast(`${this.name(e.data.updatedBy)} a modifié ce projet en même temps : la version la plus récente est chargée.`, 'warn', 6000);
        await this.pull(p.id, true);
      } else if (e.status === 404 || e.status === 403) {
        this.app.ui.toast('Ce projet n’est plus partagé avec vous : il reste disponible en copie locale.', 'warn', 6000);
        delete p.shared;
        await this.app.persistShared(p);
        this.app.ui.setSyncState(null);
      } else {
        this.app.ui.setSyncState('error');
        console.warn('push', e);
      }
    } finally {
      this.pushing = false;
    }
  }

  /** Récupère la version en ligne d'un projet partagé (et ses fichiers manquants) */
  async pull(pid, reload = false) {
    const s = await this.api('project', { query: { id: pid } });
    for (const meta of s.assets || []) {
      if (assets.getMeta(meta.id)) continue;
      try {
        const r = await fetch(`${API}?a=asset&pid=${pid}&aid=${meta.id}`, { cache: 'no-store' });
        if (r.ok) await assets.addAsset(await r.blob(), { ...meta, library: true });
      } catch (e) {
        console.warn('asset', meta.id, e);
      }
    }
    const online = (s.assets || []).map((m) => m.id);
    this.uploaded.set(pid, new Set(online));
    const p = { ...s.project, id: pid, shared: { owner: s.owner, rev: s.rev, members: s.members, uploaded: online } };
    await set('project:' + pid, p);
    await this.app.indexProject(p, s.owner !== this.me.user ? s.owner : null);
    if (reload && this.app.project.id === pid) await this.app.replaceProject(p);
    return p;
  }

  /** Vérifie régulièrement si l'autre personne a modifié le projet ouvert */
  async checkRemote() {
    const p = this.app.project;
    if (!this.enabled || !p?.shared || this.pushTimer || this.pushing || this.app.drag || this.app.placing) return;
    try {
      const meta = await this.api('meta', { query: { id: p.id } });
      p.shared.members = meta.members;
      if (meta.rev > p.shared.rev) {
        await this.pull(p.id, true);
        this.app.ui.toast(`Projet mis à jour par ${this.name(meta.updatedBy)}.`);
      }
    } catch (e) {
      if (e.status === 403 || e.status === 404) {
        delete p.shared;
        await this.app.persistShared(p);
        this.app.ui.setSyncState(null);
      }
    }
  }

  /* ---------- demandes ---------- */

  async invite(to, message) {
    const p = this.app.project;
    if (!p.shared) await this.share(p);
    else if (p.shared.owner !== this.me.user) throw new Error('Seule la propriétaire du projet peut inviter.');
    const r = await this.api('request', { method: 'POST', body: { type: 'invite', to, projectId: p.id, projectName: p.name, message } });
    await this.refresh();
    return r;
  }

  async requestJoin(owner, projectId, projectName, message) {
    const r = await this.api('request', { method: 'POST', body: { type: 'join', to: owner, projectId, projectName, message } });
    await this.refresh();
    return r;
  }

  async respond(r, accept) {
    if (accept && r.type === 'join') {
      // je suis propriétaire : je mets le projet en ligne avant d'ajouter la personne
      const { get } = await import('./store.js');
      const p = r.projectId === this.app.project.id ? this.app.project : await get('project:' + r.projectId);
      if (!p) throw new Error('Ce projet n’existe plus sur cet ordinateur.');
      if (!p.shared) await this.share(p);
    }
    await this.api('respond', { method: 'POST', body: { id: r.id, accept } });
    await this.refresh();
    if (accept && r.type === 'invite') return this.pull(r.projectId);
    if (accept && r.type === 'join' && this.app.project.id === r.projectId) {
      const meta = await this.api('meta', { query: { id: r.projectId } });
      this.app.project.shared.members = meta.members;
      this.app.ui.refresh();
    }
    return null;
  }

  async leave(pid) {
    const res = await this.api('leave', { method: 'POST', body: { id: pid } });
    const p = this.app.project.id === pid ? this.app.project : null;
    if (p) {
      delete p.shared;
      await this.app.persistShared(p);
    }
    await this.refresh();
    return res;
  }
}
