// Assistant d'agencement : à partir de l'esprit du stand, des produits et des options,
// génère deux propositions (A « Galerie » et B « Îlots par univers »).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CATALOG, fromCatalog, buildObject } from './objects.js';
import { STYLES, STYLE_GROUPS } from './planner.js';
import { emptyProject } from './templates.js';
import { floorMaterial } from './materials.js';
import { uid } from './util.js';

export const SPIRIT_CHIPS = ['Convivial et chaleureux', 'Premium / haut de gamme', 'Médical épuré', 'Innovation et digital', 'Démonstrations produits', 'Rencontres clients', 'Nature / bois', 'Forte visibilité de marque'];

const KEYWORDS = {
  convivial: /convivi|chaleur|accueil|échange|echange|lounge|café|cafe|détente|detente|rencontre|discussion/i,
  premium: /premium|haut de gamme|luxe|prestige|élégan|elegan|chic|sombre/i,
  epure: /épur|epur|clinique|minimal|sobre|blanc|médical|medical|propre/i,
  digital: /digital|innovation|écran|ecran|tech|vidéo|video|connect/i,
  demo: /démo|demo|essai|tester|atelier|manipul|prise en main/i,
  nature: /nature|bois|naturel|vert|écolo|eco|chaleureux/i,
  visibilite: /visibilit|marque|impact|signalétique|signaletique|voir de loin|attir/i,
};

/** Interprète le texte libre */
export function readSpirit(text = '') {
  const f = {};
  for (const [k, re] of Object.entries(KEYWORDS)) f[k] = re.test(text);
  let style = 'spengler';
  if (f.premium) style = 'premium';
  else if (f.nature) style = 'nature';
  else if (f.epure) style = 'clinique';
  return { features: f, style };
}

const FLOOR_MODELS = new Set(['tensioSocle', 'easyPumpPied', 'divan']);
const sizeCache = new Map();
function sizeOf(o) {
  const k = JSON.stringify(o);
  if (!sizeCache.has(k)) {
    const g = buildObject({ id: 'sz', x: 0, y: 0, z: 0, rot: 0, ...o });
    const s = g.userData.box.getSize(new THREE.Vector3());
    sizeCache.set(k, { w: s.x, d: s.z, h: s.y });
  }
  return sizeCache.get(k);
}

function mk(type, label, props = {}) {
  const e = CATALOG.find((c) => c.type === type && (!label || c.label === label)) || CATALOG.find((c) => c.type === type);
  return { ...(e ? fromCatalog(e) : { type, name: label, x: 0, y: 0, z: 0, rot: 0, zone: '' }), id: uid('o'), ...props };
}

function styled(o, style) {
  for (const [k, types] of Object.entries(STYLE_GROUPS)) {
    if (!types.includes(o.type)) continue;
    o.finish = style[k];
    o.color = null;
    if (k === 'seat' && style.legs) o.legs = style.legs;
  }
  return o;
}

const r3 = (v) => Math.round(v * 1000) / 1000;

/* ---------- éléments communs aux deux propositions ---------- */

function shell(inp, style, storageSide, totemFront = false) {
  const { w: W, d: D, hMax, open } = inp;
  const objs = [];
  const H = hMax >= 3.5 ? 3 : Math.min(2.5, hMax);
  const dark = ['anthracite', 'noir_mat'].includes(style.walls);
  const T = 0.1;
  const closed = (s) => !open.includes(s);
  let x0 = closed('left') ? T : 0;
  let x1 = closed('right') ? W - T : W;
  // réserve dans un angle arrière
  let storage = null;
  if (inp.options.reserve && closed('back') && W >= 4 && D >= (storageSide === 'left' ? 4 : 2.2)) {
    const sw = W >= 7 ? 1.6 : 1.2;
    const sd = 1.0;
    const sx = storageSide === 'right' ? W - sw / 2 : sw / 2;
    storage = mk('storage', null, { name: 'Réserve / vestiaire', x: sx, z: sd / 2, w: sw, d: sd, h: H, doorSide: 'front', doorPos: storageSide === 'right' ? 0.15 : 0.85, zone: 'Structure' });
    objs.push(storage);
    if (storageSide === 'right') x1 = W - sw;
    else x0 = sw;
  }
  if (closed('back')) objs.push(mk('wall', 'Cloison droite', { name: 'Cloison arrière', x: (x0 + x1) / 2, z: T / 2, w: x1 - x0, d: T, h: H, zone: 'Structure' }));
  if (closed('left')) objs.push(mk('wall', 'Cloison droite', { name: 'Cloison gauche', x: T / 2, z: (D + (storage && storageSide === 'left' ? 1 : 0)) / 2, w: D - (storage && storageSide === 'left' ? 1 : 0), d: T, h: H, rot: 90, zone: 'Structure' }));
  if (closed('right')) objs.push(mk('wall', 'Cloison droite', { name: 'Cloison droite', x: W - T / 2, z: (D + (storage && storageSide === 'right' ? 1 : 0)) / 2, w: D - (storage && storageSide === 'right' ? 1 : 0), d: T, h: H, rot: -90, zone: 'Structure' }));
  // fix : la cloison latérale démarre derrière la réserve
  for (const o of objs) if (o.type === 'wall' && o.rot) o.z = r3(D - o.w / 2);
  // stand en îlot : totem central double face
  if (!closed('back')) objs.push(mk('lightbox', null, { name: 'Totem Spengler Medical', x: W / 2, z: totemFront ? r3(D - 0.3) : 0.4, w: 1.2, d: 0.2, h: Math.min(2.8, hMax), doubleSided: true, image: 'builtin:lockup', imageBack: 'builtin:lockup', imageFit: 'contain', glow: 1, zone: 'Structure' }));
  // logo sur la cloison arrière
  if (closed('back')) objs.push(mk('visual', null, { name: 'Logo Spengler Medical', image: dark ? 'builtin:lockup-white' : 'builtin:lockup', x: (x0 + x1) / 2, z: T + 0.004, y: H - 0.95, w: 1.25, h: 0.79, zone: 'Structure' }));
  // spots en tête de cloison
  if (closed('back')) {
    const n = Math.max(2, Math.round((x1 - x0) / 1.5));
    for (let i = 0; i < n; i++) objs.push(mk('spot', null, { name: 'Spot ' + (i + 1), x: r3(x0 + ((x1 - x0) * (i + 0.5)) / n), z: 0.42, y: H + 0.02, rot: 180, tilt: 22, angle: 50, intensity: 8, kelvin: 4000, zone: 'Structure' }));
  }
  // bannière suspendue
  if (inp.options.banniere && hMax - H >= 1.7 && W >= 4) {
    const bw = Math.min(6, W - 1.5);
    objs.push(mk('banner', 'Bannière suspendue + truss', { name: 'Bannière Spengler', x: W / 2, z: D / 2, w: bw, h: 1.2, y: r3(hMax - 1.62), spots: 4, intensity: 6, image: 'builtin:banner', imageBack: 'builtin:banner', zone: 'Structure' }));
  }
  return { objs, H, x0, x1, dark, storage, T };
}

function productObjects(inp) {
  const items = [];
  for (const p of inp.products) for (let i = 0; i < (p.qty || 1); i++) items.push({ ...JSON.parse(JSON.stringify(p.obj)), gamme: p.obj.gamme || p.gamme || 'Produits' });
  const groups = new Map();
  for (const it of items) {
    if (!groups.has(it.gamme)) groups.set(it.gamme, []);
    groups.get(it.gamme).push(it);
  }
  let zones = [...groups.entries()].map(([name, list]) => ({ name, items: list })).sort((a, b) => b.items.length - a.items.length);
  if (zones.length > 4) {
    const rest = zones.slice(3).flatMap((z) => z.items);
    zones = [...zones.slice(0, 3), { name: 'Autres produits', items: rest }];
  }
  return zones;
}

function zoneTitle(name, x, y, z, dark, rot = 0, width = 2) {
  // taille du lettrage adaptée à la largeur disponible (≈ 0,62 × hauteur par caractère)
  const hh = Math.max(0.07, Math.min(0.17, width / (name.length * 0.62)));
  return mk('text', null, { name: 'Titre ' + name, text: name.toUpperCase(), font: 'Gill Sans', bold: false, color: dark ? '#ffffff' : '#27365a', h: r3(hh), x: r3(x), y, z: r3(z), rot, zone: 'Structure' });
}

function plinthFor(item, s, style, h, zone, led) {
  return mk('plinth', null, { name: 'Socle ' + zone, w: r3(Math.max(0.36, s.w + 0.08)), d: r3(Math.max(0.36, s.d + 0.08)), h, finish: style.furniture, led: led ? 'gauche' : 'aucune', zone });
}

function meeting(inp, style, cx, cz, rotFace, f) {
  const objs = [];
  if (f.convivial && inp.d >= 4) {
    objs.push(styled(mk('sofa', null, { name: 'Canapé', x: cx, z: cz - 0.45, rot: 0, zone: 'Rencontre' }), style));
    objs.push(styled(mk('lowTable', null, { name: 'Table basse', x: cx, z: cz + 0.35, zone: 'Rencontre' }), style));
    return objs;
  }
  const housse = f.convivial || f.premium;
  const t = housse ? mk('mangeDebout', 'Mange-debout avec housse lycra', { color: style.id === 'premium' ? '#34373c' : '#ffffff' }) : styled(mk('mangeDebout', 'Mange-debout rond'), style);
  objs.push({ ...t, name: 'Mange-debout', x: cx, z: cz, zone: 'Rencontre' });
  const n = inp.w >= 6 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const a = rotFace + (i - (n - 1) / 2) * 1.25;
    const chair = styled(mk('barChair', f.premium ? 'Chaise haute coque design' : 'Chaise haute à dossier'), style);
    objs.push({ ...chair, name: 'Chaise haute', x: r3(cx + Math.sin(a) * 0.78), z: r3(cz + Math.cos(a) * 0.78), rot: Math.round(((a * 180) / Math.PI + 180 + 540) % 360 - 180), zone: 'Rencontre' });
  }
  return objs;
}

function counter(style, x, z, dark) {
  return [mk('counter', null, { name: "Comptoir d'accueil", x, z, w: 1.2, d: 0.6, h: 1.05, finish: style.furniture, led: 'deux', doors: 'deux', doorOpen: 0, image: dark ? 'builtin:lockup-white' : 'builtin:lockup', imageFit: 'contain', gMargin: 0.1, zone: 'Accueil' })];
}

function person(label, x, z, rot, extra = {}) {
  return mk('person', label, { x: r3(x), z: r3(z), rot, zone: 'Personnages', ...extra });
}

/* ---------- Proposition A : Galerie ---------- */
function galerie(inp, style, f) {
  const { w: W, d: D } = inp;
  const sh = shell(inp, style, 'right', true);
  const objs = [...sh.objs];
  const zones = productObjects(inp);
  const unplaced = [];
  const rowZ = sh.T + 0.06;
  let cur = sh.x0 + 0.2;
  const heights = [1.0, 1.1, 0.9];
  const placedZones = [];
  const overflow = [];
  for (const zn of zones) {
    const start = cur;
    let k = 0;
    for (const it of zn.items) {
      const s = sizeOf(it);
      const floor = FLOOR_MODELS.has(it.model) || s.h > 0.7;
      const fw = floor ? s.w : Math.max(0.36, s.w + 0.08);
      if (cur + fw > sh.x1 - 0.15) {
        overflow.push({ it, zone: zn.name });
        continue;
      }
      const x = cur + fw / 2;
      if (floor) objs.push({ ...it, id: uid('o'), name: it.name, x: r3(x), z: r3(rowZ + s.d / 2 + 0.04), y: 0, rot: 0, zone: zn.name });
      else {
        const h = heights[k % 3];
        const pl = plinthFor(it, s, style, h, zn.name, k % 2 === 0);
        const pd = pl.d;
        objs.push({ ...pl, x: r3(x), z: r3(rowZ + pd / 2) }, { ...it, id: uid('o'), x: r3(x), z: r3(rowZ + pd / 2), y: h, rot: 0, zone: zn.name });
      }
      cur += fw + 0.14;
      k++;
    }
    if (cur > start) placedZones.push({ name: zn.name, a: start, b: cur - 0.14 });
    cur += 0.3;
  }
  if (inp.open.includes('back') === false) for (const z of placedZones) objs.push(zoneTitle(z.name, (z.a + z.b) / 2, 1.75, sh.T + 0.006, sh.dark, 0, z.b - z.a + 0.2));
  // rangée centrale si débordement et profondeur suffisante
  if (overflow.length && D >= 3.5) {
    const row = overflow.map((o) => ({ ...o, s: sizeOf(o.it) }));
    const total = row.reduce((t, o) => t + Math.max(0.36, o.s.w + 0.08), 0);
    let x = W / 2 - total / 2;
    const z = D * 0.52;
    for (const [i, o] of row.entries()) {
      const pw = Math.max(0.36, o.s.w + 0.08);
      if (x < 1.4 || x + pw > W - 1.4) {
        unplaced.push(o.it);
        continue;
      }
      const h = heights[i % 3];
      const pl = plinthFor(o.it, o.s, style, h, o.zone, i % 2);
      objs.push({ ...pl, x: r3(x + pw / 2), z }, { ...o.it, id: uid('o'), x: r3(x + pw / 2), z, y: h, rot: 0, zone: o.zone });
      x += pw;
    }
  } else unplaced.push(...overflow.map((o) => o.it));
  // accueil (avant droit) et rencontre (avant gauche)
  if (inp.options.accueil) objs.push(...counter(style, r3(W - 0.85), r3(D - 0.42), sh.dark));
  if (inp.options.rencontre && W >= 3.5 && D >= 2.5) objs.push(...meeting(inp, style, 1.15, r3(D - 1.15), 0, f));
  if ((inp.options.ecran || f.digital || f.demo) && W >= 7) objs.push(mk('tv', 'Écran TV sur pied', { name: 'Écran vidéo', x: r3(W - 2.3), z: r3(D - 0.45), rot: 0, inches: 55, zone: 'Accueil' }));
  if (D >= 2.5) objs.push(mk('brochure', null, { name: 'Porte-catalogues', x: r3(W - (inp.open.includes('right') ? 0.2 : 0.3)), z: r3(D - 1.05), rot: -90, zone: 'Accueil' }));
  if (W >= 5 && !inp.options.rencontre) objs.push(styled(mk('plant', null, { name: 'Plante', x: 0.4, z: r3(D - 0.4) }), style));
  if (inp.options.personnages) {
    objs.push(person('Commerciale en discussion', W - 0.85, D - 1.0, 180));
    objs.push(person('Visiteur', W - 0.85, D + 0.0, 180));
    if (placedZones[0]) objs.push(person('Visiteuse', (placedZones[0].a + placedZones[0].b) / 2, 1.25, 180));
    const ch = objs.find((o) => o.type === 'barChair');
    if (ch) objs.push(person('Personne sur chaise haute', ch.x, ch.z, ch.rot));
  }
  return { objs, unplaced, zones: placedZones.map((z) => z.name) };
}

/* ---------- Proposition B : Îlots par univers ---------- */
function ilots(inp, style, f) {
  const { w: W, d: D } = inp;
  const sh = shell(inp, style, 'left');
  const objs = [...sh.objs];
  let zones = productObjects(inp);
  const unplaced = [];
  const meetingBack = inp.options.rencontre && D >= 2.5 && W >= 5;
  const xa = 0.3 + (sh.storage && D < 4.6 ? 0 : 0);
  const xb = W - 0.3 - (meetingBack ? 2.0 : 0);
  const minTotemZ = (sh.storage ? 1.12 : 0.3) + 0.06;
  // nombre d'îlots possibles sur la largeur (îlot ≈ 1 m + 0,9 m de circulation)
  const maxIslands = Math.max(1, Math.floor((xb - xa) / 1.7));
  if (zones.length > maxIslands) {
    const keep = zones.slice(0, maxIslands - 1);
    const rest = zones.slice(maxIslands - 1).flatMap((z) => z.items);
    zones = [...keep, { name: maxIslands === 1 ? 'Nos produits' : 'Autres produits', items: rest }];
  }
  const n = zones.length || 1;
  const zcBase = D >= 4 ? D * 0.5 : Math.max(1.25, D * 0.5);
  const heights = [1.1, 0.9, 1.0, 0.8];
  zones.forEach((zn, i) => {
    const cx = r3(xa + ((xb - xa) * (i + 0.5)) / n);
    // grille de socles jointifs (2 colonnes)
    const cells = zn.items.map((it) => ({ it, s: sizeOf(it) }));
    const tableItems = cells.filter((c) => !(FLOOR_MODELS.has(c.it.model) || c.s.h > 0.7));
    const floorItems = cells.filter((c) => FLOOR_MODELS.has(c.it.model) || c.s.h > 0.7);
    const cw = Math.max(0.4, ...tableItems.map((c) => c.s.w + 0.08));
    const cd = Math.max(0.4, ...tableItems.map((c) => c.s.d + 0.08));
    const cols = tableItems.length > 1 ? 2 : 1;
    const rows = Math.ceil(tableItems.length / cols);
    const maxRows = Math.max(1, Math.floor((D - 0.9 - minTotemZ - 0.2) / cd));
    const half0 = (Math.min(Math.ceil(tableItems.length / (tableItems.length > 1 ? 2 : 1)), maxRows) * cd) / 2;
    const zc = r3(Math.max(zcBase, minTotemZ + 0.12 + half0 + 0.04));
    tableItems.forEach((c, k) => {
      const col = k % cols;
      const row = Math.floor(k / cols);
      if (row >= maxRows) return unplaced.push(c.it);
      const x = cx + (col - (cols - 1) / 2) * cw;
      const z = zc + (row - (Math.min(rows, maxRows) - 1) / 2) * cd;
      const h = heights[k % 4];
      objs.push({ ...plinthFor(c.it, c.s, style, h, zn.name, k === 0), x: r3(x), z: r3(z), w: r3(cw), d: r3(cd) }, { ...c.it, id: uid('o'), x: r3(x), z: r3(z), y: h, rot: 0, zone: zn.name });
    });
    const islandHalf = (Math.min(rows, maxRows) * cd) / 2;
    const slot = (xb - xa) / n;
    floorItems.forEach((c, k) => {
      // à côté de l'îlot si la place le permet, sinon devant
      const x = cx + (k % 2 ? -1 : 1) * ((cols * cw) / 2 + c.s.w / 2 + 0.15);
      if (Math.abs(x - cx) + c.s.w / 2 <= slot / 2 - 0.05 && x - c.s.w / 2 > 0.15 && x + c.s.w / 2 < W - 0.15) {
        objs.push({ ...c.it, id: uid('o'), x: r3(x), z: r3(zc), y: 0, rot: 0, zone: zn.name });
        return;
      }
      const zf = zc + (Math.min(rows, maxRows) * cd) / 2 + c.s.d / 2 + 0.1;
      if (zf + c.s.d / 2 < D - 1.0) objs.push({ ...c.it, id: uid('o'), x: cx, z: r3(zf), y: 0, rot: 0, zone: zn.name });
      else unplaced.push(c.it);
    });
    // totem lumineux avec le nom de l'univers, derrière l'îlot
    const tz = r3(zc - islandHalf - 0.12);
    objs.push(mk('lightbox', null, { name: 'Totem ' + zn.name, x: cx, z: tz, w: 0.8, d: 0.1, h: 2.2, y: 0, glow: 0.9, image: sh.dark ? 'builtin:lockup-white' : 'builtin:lockup', imageFit: 'contain', imageOy: 0.7, zone: zn.name }));
    objs.push(zoneTitle(zn.name, cx, 1.15, tz + 0.056, sh.dark, 0, 0.74));
  });
  // accueil (avant gauche) et rencontre (contre la cloison du fond, côté droit)
  if (inp.options.accueil) objs.push(...counter(style, 0.85, r3(D - 0.38), sh.dark));
  if (meetingBack) {
    if (f.convivial && D >= 4) objs.push(...meeting(inp, style, r3(W - 1.1), 1.1, Math.PI, f));
    else {
      const t = styled(mk('tableHaute', null, { name: 'Table haute', x: r3(W - 0.9), z: r3(sh.T + 0.62), w: 1.2, d: 0.6, rot: 90 }), style);
      t.rot = 0;
      t.w = 1.2;
      t.d = 0.6;
      t.z = r3(sh.T + 0.32);
      objs.push({ ...t, zone: 'Rencontre' });
      for (const dx of [-0.35, 0.35]) objs.push({ ...styled(mk('barChair', 'Chaise haute à dossier'), style), name: 'Chaise haute', x: r3(W - 0.9 + dx), z: r3(sh.T + 0.95), rot: 180, zone: 'Rencontre' });
    }
  }
  if ((inp.options.ecran || f.digital || f.demo) && !inp.open.includes('back')) objs.push(mk('tv', 'Écran TV mural', { name: 'Écran vidéo', x: r3(W / 2), z: r3(sh.T + 0.03), y: 1.35, inches: 55, zone: 'Structure' }));
  else if ((inp.options.ecran || f.digital || f.demo) && W >= 5) objs.push(mk('tv', 'Écran TV sur pied', { name: 'Écran vidéo', x: r3(W - 0.8), z: r3(D - 0.45), zone: 'Accueil' }));
  if (inp.options.personnages) {
    objs.push(person('Commercial en discussion', 0.85, D - 0.95, 180));
    if (zones[0]) objs.push(person('Visiteuse', xa + (xb - xa) / n / 2 + 0.75, Math.min(D - 0.3, zcBase + 0.9), -150));
    objs.push(person('Visiteur qui marche', W * 0.55, D + 0.6, 170));
  }
  return { objs, unplaced, zones: zones.map((z) => z.name) };
}

/** Génère les deux propositions (projets complets) */
export function generateProposals(inp) {
  const spirit = readSpirit(inp.text);
  const f = spirit.features;
  if (inp.chips?.length) Object.assign(f, readSpirit(inp.chips.join(' ')).features);
  const style = STYLES.find((s) => s.id === (inp.style === 'auto' ? spirit.style : inp.style)) || STYLES[0];
  const make = (fn, letter, title, concept) => {
    const r = fn(inp, style, f);
    const p = emptyProject({
      name: `${inp.name || 'Stand'} – Proposition ${letter} (${title})`,
      salon: inp.salon || '',
      stand: { ...emptyProject().stand, w: inp.w, d: inp.d, hMax: inp.hMax, open: inp.open, floor: { type: style.floor.type, color: style.floor.color || '#5b98b2', wood: style.floor.wood || 'chene' } },
      objects: r.objs.map((o) => ({ ...o, id: o.id || uid('o') })),
    });
    p.views = [{ id: uid('v'), name: 'Vue ¾', mode: 'orbit', pos: [inp.w / 2 - Math.max(inp.w, inp.d) * 0.7, 3.2, inp.d + Math.max(inp.w, inp.d) * 0.9], target: [inp.w / 2, 1.2, inp.d / 2] }];
    const nProducts = r.objs.filter((o) => o.type === 'device' || o.type === 'product' || o.type === 'model').length;
    const seats = r.objs.filter((o) => ['barChair', 'stool', 'chair', 'sofa'].includes(o.type)).length;
    const noReserve = inp.options.reserve && !r.objs.some((o) => o.type === 'storage');
    return { project: p, letter, title, concept, style, unplaced: r.unplaced, zones: r.zones, nProducts, seats, noReserve };
  };
  const tone = [f.convivial && 'conviviale', f.premium && 'premium', f.epure && 'épurée', f.digital && 'digitale'].filter(Boolean).join(', ');
  return [
    make(galerie, 'A', 'Galerie', `Vitrine linéaire : les produits sont alignés sur socles le long des cloisons, regroupés par gamme avec leur titre. Le centre reste dégagé pour circuler ; accueil côté allée, espace rencontre à l’avant${tone ? ' — ambiance ' + tone : ''}.`),
    make(ilots, 'B', 'Îlots par univers', `Parcours : un îlot de socles par gamme, signalé par un totem lumineux, que les visiteurs contournent. Espace rencontre au fond du stand, accueil à l’avant${tone ? ' — ambiance ' + tone : ''}.`),
  ];
}

/* ---------- aperçu 3D d'une proposition ---------- */
let pr;
export function renderPreview(project, w = 720, h = 450) {
  if (!pr) {
    pr = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    pr.toneMapping = THREE.ACESFilmicToneMapping;
    pr.outputColorSpace = THREE.SRGBColorSpace;
    pr.userData = { env: new THREE.PMREMGenerator(pr).fromScene(new RoomEnvironment(), 0.04).texture };
  }
  pr.setSize(w, h);
  const sc = new THREE.Scene();
  sc.background = new THREE.Color('#5d7690');
  sc.environment = pr.userData.env;
  sc.environmentIntensity = 0.4;
  sc.add(new THREE.HemisphereLight('#e8eef4', '#7d848c', 1.0));
  const sun = new THREE.DirectionalLight('#ffffff', 1.0);
  sun.position.set(-4, 10, 8);
  sc.add(sun);
  const st = project.stand;
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#c3c7cc', roughness: 0.9 }));
  hall.rotation.x = -Math.PI / 2;
  hall.position.y = -0.031;
  sc.add(hall);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(st.w, 0.03, st.d), floorMaterial(st.floor, st.w, st.d));
  floor.position.set(st.w / 2, -0.015, st.d / 2);
  sc.add(floor);
  for (const o of project.objects) {
    try {
      const g = buildObject(o);
      g.position.set(o.x, o.y || 0, o.z);
      g.rotation.y = ((o.rot || 0) * Math.PI) / 180;
      g.traverse((m) => {
        if (m.isSpotLight) m.intensity *= 0.6;
      });
      sc.add(g);
    } catch (e) {
      /* objet ignoré dans l'aperçu */
    }
  }
  const L = Math.max(st.w, st.d);
  const cam = new THREE.PerspectiveCamera(40, w / h, 0.05, 200);
  cam.position.set(st.w / 2 - L * 0.6, 3 + L * 0.3, st.d + L * 1.0);
  cam.lookAt(st.w / 2, 1.3, st.d / 2);
  pr.render(sc, cam);
  const url = pr.domElement.toDataURL('image/jpeg', 0.88);
  sc.traverse((m) => m.geometry?.dispose());
  return url;
}
