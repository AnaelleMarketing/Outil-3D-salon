// Catalogue Spengler Medical : produits modélisés en 3D (dimensions réelles approximatives),
// à poser sur les socles, comptoirs et tables du stand.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getMaterial } from './materials.js';

/* ---------- catalogue ---------- */
export const DEVICE_CATALOG = [
  { model: 'manopoire', label: 'Tensiomètre manopoire Lian Nano', brand: 'Spengler', gamme: 'Tension artérielle', color: '#1f3b73' },
  { model: 'tensioSocle', label: 'Tensiomètre MAXI+3 sur socle à roulettes', brand: 'Spengler', gamme: 'Tension artérielle', ref: '522705', color: '#1f3b73' },
  { model: 'neotens', label: 'Neotens® – tensiomètre électronique au bras', brand: 'Spengler', gamme: 'Tension artérielle', color: '#1f2d52' },
  { model: 'nomad', label: 'Neotens® Nomad – tensiomètre poignet', brand: 'Spengler', gamme: 'Tension artérielle', color: '#2b3a63' },
  { model: 'dessillons', label: 'Lian® Dessillons – manopoire Made in France', brand: 'Spengler', gamme: 'Tension artérielle', color: '#c8102e' },
  { model: 'mobi', label: 'Mobi – bleu marine', brand: 'Spengler', gamme: 'Tension artérielle', color: '#27386b' },
  { model: 'mobi', label: 'Mobi – orange', brand: 'Spengler', gamme: 'Tension artérielle', color: '#ee6a3c' },
  { model: 'mobi', label: 'Mobi – noir', brand: 'Spengler', gamme: 'Tension artérielle', color: '#1c1c1f' },
  { model: 'mobi', label: 'Mobi – blanc', brand: 'Spengler', gamme: 'Tension artérielle', color: '#f1f1ef' },
  { model: 'mobi4', label: 'Présentoir Mobi – les 4 coloris', brand: 'Spengler', gamme: 'Tension artérielle', color: '#ffffff' },
  { model: 'tensioElec', label: 'Tensiomètre électronique au bras (générique)', brand: 'Spengler', gamme: 'Tension artérielle', color: '#1f3b73' },
  { model: 'stetho', label: 'Stéthoscope Cardio Prestige II double pavillon', brand: 'Spengler', gamme: 'Stéthoscopes', ref: '506011', color: '#1d2f5a' },
  { model: 'stethoPedia', label: 'Stéthoscope Pulse II pédiatrique', brand: 'Spengler', gamme: 'Stéthoscopes', ref: '507704', color: '#2aa7c9' },
  { model: 'stethoStand', label: 'Présentoir de stéthoscopes (4 coloris)', brand: 'Spengler', gamme: 'Stéthoscopes', color: '#ffffff' },
  { model: 'easyPump', label: 'Garrot électronique Easy Pump® Dual', brand: 'DDM', gamme: 'Garrots', color: '#ffffff' },
  { model: 'easyPumpPied', label: 'Garrot Easy Pump® Dual sur pied à roulettes', brand: 'DDM', gamme: 'Garrots', color: '#ffffff' },
  { model: 'garrotDTS', label: 'Garrot pneumatique DTS 3000', brand: 'Spengler', gamme: 'Garrots', color: '#1f3b73' },
  { model: 'couverture', label: 'Couverture chauffante + boîtier de commande', brand: 'ECM', gamme: 'Réchauffement patient', color: '#d9e3ea' },
  { model: 'thermo', label: 'Thermomètre temporal sans contact', brand: 'Spengler', gamme: 'Diagnostic', color: '#ffffff' },
  { model: 'oxymetre', label: 'Oxymètre de pouls', brand: 'Spengler', gamme: 'Diagnostic', color: '#2a6fb5' },
  { model: 'otoscope', label: 'Otoscope LED', brand: 'Luxamed', gamme: 'Diagnostic', color: '#1d1e21' },
  { model: 'dermatoscope', label: 'Dermatoscope LuxaScope LED', brand: 'Luxamed', gamme: 'Diagnostic', color: '#1d1e21' },
  { model: 'monitor', label: 'Vitalimate MINI – moniteur PNI + SpO2', brand: 'Spengler', gamme: 'Monitoring & ECG', ref: 'MON002', color: '#ffffff' },
  { model: 'ecgTablet', label: 'Cardiomate EVI 10" – tablette ECG + base imprimante', brand: 'Spengler', gamme: 'Monitoring & ECG', ref: '260051', color: '#ffffff' },
  { model: 'defib', label: 'Défibrillateur FRED PA-1', brand: 'Spengler', gamme: 'Monitoring & ECG', ref: 'SSDEFI04', color: '#c8102e' },
  { model: 'negatoscope', label: 'Négatoscope 3 plages', brand: 'Holtex', gamme: 'Mobilier médical', ref: 'OTA1003', color: '#ffffff' },
  { model: 'divan', label: "Divan d'examen inox / noir", brand: 'Holtex', gamme: 'Mobilier médical', ref: 'OSA003_N', color: '#1d1e21' },
];
/** Coloris proposés en un clic dans les propriétés */
export const DEVICE_PALETTES = {
  mobi: { 'Bleu marine': '#27386b', Orange: '#ee6a3c', Noir: '#1c1c1f', Blanc: '#f1f1ef' },
  dessillons: { Rouge: '#c8102e', Bleu: '#27386b', Noir: '#1c1c1f', Blanc: '#f1f1ef' },
  stetho: { Marine: '#1d2f5a', Noir: '#1c1c1f', Bordeaux: '#7a1730', Bleu: '#2aa7c9', Violet: '#6a3f9a', Rouge: '#c8102e' },
  stethoPedia: { Turquoise: '#2aa7c9', Rose: '#e04b8a', Vert: '#33b26b', Violet: '#6a3f9a' },
};
export const DEVICE_GAMMES = [...new Set(DEVICE_CATALOG.map((d) => d.gamme))];

/* ---------- utilitaires ---------- */
const mcache = new Map();
function M(color, rough = 0.45, metal = 0, extra = {}) {
  const k = color + rough + metal + JSON.stringify(extra);
  if (!mcache.has(k)) mcache.set(k, new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: metal, ...extra }));
  return mcache.get(k);
}
const CHROME = () => getMaterial('chrome');
const BLACK = () => M('#1b1c1f', 0.6);
const RUBBER = () => M('#232427', 0.85);
const WHITE = () => M('#f2f4f5', 0.3, 0, { clearcoat: 0.5 });

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
const box = (w, h, d, mat, x, y, z, r = 0) => mesh(r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const cyl = (rt, rb, h, mat, x, y, z, seg = 32) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
function tube(points, radius, mat, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), radius, 10, closed), mat);
}

const texCache = new Map();
function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}
const screenMat = (tex) => new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.8, roughness: 0.2 });

/** Cadran de manomètre 0–300 mmHg */
function gaugeTex() {
  return canvasTex('gauge', 512, 512, (g, s) => {
    const c = s / 2;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(c, c, c, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#111';
    g.fillStyle = '#111';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let v = 0; v <= 300; v += 10) {
      const a = -Math.PI / 2 + (v / 320) * Math.PI * 2;
      const big = v % 50 === 0;
      g.lineWidth = big ? 6 : 3;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * c * 0.92, c + Math.sin(a) * c * 0.92);
      g.lineTo(c + Math.cos(a) * c * (big ? 0.76 : 0.83), c + Math.sin(a) * c * (big ? 0.76 : 0.83));
      g.stroke();
      if (big) {
        g.font = 'bold 40px Helvetica';
        g.fillText(String(v), c + Math.cos(a) * c * 0.6, c + Math.sin(a) * c * 0.6);
      }
    }
    g.font = 'bold 30px Helvetica';
    g.fillStyle = '#1f3b73';
    g.fillText('SPENGLER', c, c + c * 0.32);
    g.font = '22px Helvetica';
    g.fillStyle = '#444';
    g.fillText('mmHg', c, c - c * 0.28);
    // aiguille
    const a = -Math.PI / 2 + (120 / 320) * Math.PI * 2;
    g.strokeStyle = '#c8102e';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(c, c);
    g.lineTo(c + Math.cos(a) * c * 0.8, c + Math.sin(a) * c * 0.8);
    g.stroke();
    g.fillStyle = '#222';
    g.beginPath();
    g.arc(c, c, 16, 0, Math.PI * 2);
    g.fill();
  });
}

function lcdTex(kind) {
  return canvasTex('lcd-' + kind, 512, 320, (g, w, h) => {
    g.fillStyle = kind === 'bp' ? '#cfe3d6' : kind === 'bpg' ? '#dde2e5' : '#0b1220';
    g.fillRect(0, 0, w, h);
    if (kind === 'bp' || kind === 'bpg') {
      g.fillStyle = '#1d2a22';
      g.textAlign = 'right';
      g.font = 'bold 120px Helvetica';
      g.fillText('120', 330, 130);
      g.font = 'bold 90px Helvetica';
      g.fillText('80', 330, 240);
      g.font = 'bold 60px Helvetica';
      g.fillText('72', 490, 240);
      g.font = '28px Helvetica';
      g.textAlign = 'left';
      g.fillText('SYS', 350, 60);
      g.fillText('DIA', 350, 170);
      g.fillText('♥', 420, 170);
      return;
    }
    const wave = (y0, color, amp, fn) => {
      g.strokeStyle = color;
      g.lineWidth = 4;
      g.beginPath();
      for (let x = 10; x < w * 0.68; x++) {
        const y = y0 + fn(x) * amp;
        x === 10 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    };
    const ecg = (x) => {
      const p = (x % 110) / 110;
      return p > 0.42 && p < 0.46 ? -1 : p > 0.46 && p < 0.5 ? 0.45 : p > 0.62 && p < 0.72 ? -0.18 * Math.sin(((p - 0.62) / 0.1) * Math.PI) : 0;
    };
    const spo2 = (x) => -Math.max(0, Math.sin((x % 110) / 110 * Math.PI * 2)) * 0.9 + 0.3;
    if (kind === 'ecg') {
      g.strokeStyle = 'rgba(255,120,120,.18)';
      for (let x = 0; x < w; x += 20) g.strokeRect(x, 0, 20, h);
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(230,80,80,.25)';
      g.lineWidth = 1;
      for (let x = 0; x < w; x += 16) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, h);
        g.stroke();
      }
      for (let y = 0; y < h; y += 16) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
      }
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = '#111';
        g.lineWidth = 2.5;
        g.beginPath();
        for (let x = 0; x < w; x++) {
          const y = 45 + i * 75 + ecg(x + i * 30) * 32;
          x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
      }
      return;
    }
    wave(80, '#36e07a', 50, ecg);
    wave(185, '#4fd2ff', 45, spo2);
    g.textAlign = 'left';
    g.font = 'bold 70px Helvetica';
    g.fillStyle = '#36e07a';
    g.fillText('72', w * 0.72, 100);
    g.fillStyle = '#4fd2ff';
    g.fillText('98', w * 0.72, 205);
    g.fillStyle = '#ffffff';
    g.font = 'bold 46px Helvetica';
    g.fillText('120/80', w * 0.05, 290);
    g.font = '22px Helvetica';
    g.fillStyle = '#9fb3c8';
    g.fillText('HR', w * 0.72, 40);
    g.fillText('SpO2 %', w * 0.72, 145);
    g.fillText('PNI mmHg', w * 0.45, 285);
  });
}

/** Écran tactile Easy Pump Dual : voie bleue / voie rouge */
function easyPumpTex() {
  return canvasTex('easypump', 640, 420, (g, w, h) => {
    g.fillStyle = '#0d1b33';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#16294a';
    g.fillRect(0, 0, w, 34);
    g.fillStyle = '#b8c6dc';
    g.font = '20px Helvetica';
    g.fillText('02/02/2026', 16, 24);
    g.fillText('14:47', w / 2 - 24, 24);
    const lane = (x, color, p, t) => {
      g.strokeStyle = color;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x, 70);
      g.lineTo(x, 300);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 4; i++) g.fillRect(x + 18 + i * 52, 140, 44, 7);
      for (let i = 0; i < 4; i++) g.fillRect(x + 18 + i * 52, 255, 44, 7);
      g.fillStyle = color;
      g.fillRect(x + 140, 160, 96, 48);
      g.fillRect(x + 140, 300, 96, 48);
      g.fillStyle = '#fff';
      g.font = 'bold 38px Helvetica';
      g.textAlign = 'right';
      g.fillText(p, x + 230, 198);
      g.fillText(t, x + 230, 338);
      g.font = '18px Helvetica';
      g.textAlign = 'left';
      g.fillStyle = '#b8c6dc';
      g.fillText('mmHg', x + 18, 198);
      g.fillText('min', x + 18, 338);
    };
    lane(30, '#2f7de1', '300', '30');
    lane(350, '#e0393e', '0', '60');
    // silhouette
    g.strokeStyle = '#d7deea';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(w / 2, 220, 14, 0, Math.PI * 2);
    g.moveTo(w / 2, 236);
    g.lineTo(w / 2, 300);
    g.moveTo(w / 2 - 24, 250);
    g.lineTo(w / 2 + 24, 250);
    g.moveTo(w / 2, 300);
    g.lineTo(w / 2 - 16, 345);
    g.moveTo(w / 2, 300);
    g.lineTo(w / 2 + 16, 345);
    g.stroke();
    g.fillStyle = '#2f7de1';
    g.fillRect(40, 370, 70, 30);
    g.fillStyle = '#e0393e';
    g.fillRect(360, 370, 70, 30);
  });
}

function labelTex() {
  return canvasTex('easypump-label', 512, 96, (g, w, h) => {
    g.fillStyle = '#d9dde2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a4f57';
    g.font = 'bold 34px Helvetica';
    g.fillText('DDM', 18, 58);
    g.font = 'italic 32px Helvetica';
    g.fillStyle = '#5b6068';
    g.fillText('Easy Pump® Dual', 150, 62);
  });
}

function quiltTex() {
  return canvasTex('quilt', 256, 256, (g, s) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(0,0,0,.16)';
    g.lineWidth = 3;
    for (let x = 0; x <= s; x += 32) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, s);
      g.stroke();
    }
    g.setLineDash([6, 6]);
    for (let y = 16; y <= s; y += 64) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(s, y);
      g.stroke();
    }
  });
}

function cuff(color, w = 0.15, d = 0.09, t = 0.028) {
  const g = new THREE.Group();
  g.add(box(w, t, d, M(color, 0.9, 0, { sheen: 0.6 }), 0, t / 2, 0, 0.008));
  g.add(box(w * 0.98, 0.004, d * 0.35, M('#b9bfc7', 0.9), 0, t + 0.001, -d * 0.2));
  return g;
}

function gaugeHead(r, depth, faceUp = true) {
  const g = new THREE.Group();
  const body = cyl(r, r, depth, CHROME(), 0, 0, 0, 40);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 48), new THREE.MeshStandardMaterial({ map: gaugeTex(), roughness: 0.3 }));
  face.rotation.x = -Math.PI / 2;
  face.position.y = depth / 2 + 0.0005;
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 48), getMaterial('verre'));
  glass.rotation.x = -Math.PI / 2;
  glass.position.y = depth / 2 + 0.002;
  g.add(body, face, glass);
  if (!faceUp) g.rotation.x = Math.PI / 2;
  return g;
}

function stethoscope(color, s = 1, single = false) {
  const g = new THREE.Group();
  const tm = M(color, 0.45, 0, { clearcoat: 0.4 });
  // pavillon
  g.add(cyl(0.022 * s, 0.022 * s, 0.012 * s, CHROME(), 0, 0.006 * s, 0.17 * s));
  if (!single) g.add(cyl(0.014 * s, 0.016 * s, 0.01 * s, CHROME(), 0, 0.017 * s, 0.17 * s));
  const mem = new THREE.Mesh(new THREE.CircleGeometry(0.019 * s, 32), M('#e8e9ea', 0.5));
  mem.rotation.x = -Math.PI / 2;
  mem.position.set(0, single ? 0.0125 * s : 0.0225 * s, 0.17 * s);
  g.add(mem);
  // tubulure
  const y = 0.006 * s;
  g.add(tube([[0, y, 0.15 * s], [0.03 * s, y, 0.08 * s], [-0.02 * s, y, 0.0], [0, y, -0.06 * s]], 0.0045 * s, tm));
  for (const k of [-1, 1]) {
    g.add(tube([[0, y, -0.06 * s], [k * 0.02 * s, y, -0.09 * s], [k * 0.035 * s, y, -0.12 * s]], 0.0045 * s, tm));
    g.add(tube([[k * 0.035 * s, y, -0.12 * s], [k * 0.05 * s, y, -0.17 * s], [k * 0.035 * s, y, -0.21 * s], [k * 0.02 * s, y, -0.23 * s]], 0.0022 * s, CHROME()));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.007 * s, 16, 12), RUBBER());
    tip.position.set(k * 0.018 * s, y, -0.235 * s);
    g.add(tip);
  }
  return g;
}

function screenPlane(w, h, kind) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat(lcdTex(kind)));
  p.userData.emissive = true;
  return p;
}

/* ---------- constructeurs ---------- */
const D = {};

D.manopoire = (o) => {
  const g = new THREE.Group();
  const c = cuff(o.color, 0.15, 0.09);
  c.position.set(-0.06, 0, 0);
  g.add(c);
  const head = gaugeHead(0.03, 0.022);
  head.position.set(0.09, 0.034, -0.015);
  g.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), RUBBER());
  bulb.scale.set(0.028, 0.024, 0.045);
  bulb.position.set(0.09, 0.024, 0.045);
  g.add(bulb, cyl(0.006, 0.006, 0.02, CHROME(), 0.09, 0.024, 0.0));
  g.add(tube([[0.07, 0.03, -0.02], [0.03, 0.035, -0.05], [-0.02, 0.03, -0.035]], 0.0035, BLACK()));
  return g;
};

D.tensioSocle = (o) => {
  const g = new THREE.Group();
  const base = getMaterial('noir_mat');
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const leg = box(0.27, 0.02, 0.035, base, Math.cos(a) * 0.135, 0.05, Math.sin(a) * 0.135);
    leg.rotation.y = -a;
    g.add(leg, cyl(0.022, 0.022, 0.04, RUBBER(), Math.cos(a) * 0.27, 0.02, Math.sin(a) * 0.27, 12));
  }
  g.add(cyl(0.014, 0.014, 0.9, getMaterial('chrome'), 0, 0.5, 0, 16));
  const head = gaugeHead(0.075, 0.05, false);
  head.position.set(0, 1.0, 0.02);
  g.add(head, box(0.12, 0.05, 0.08, M('#e9ecef', 0.5), 0, 0.92, 0.0, 0.01));
  // panier + brassard
  const basket = box(0.16, 0.08, 0.1, M('#d7dbe0', 0.6), 0, 0.8, -0.02, 0.01);
  const c = cuff(o.color, 0.14, 0.08);
  c.position.set(0, 0.84, -0.02);
  g.add(basket, c);
  // tuyau spiralé
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    pts.push([0.05 + Math.cos(t * Math.PI * 14) * 0.018, 0.96 - t * 0.28, 0.06 + Math.sin(t * Math.PI * 14) * 0.018]);
  }
  g.add(tube(pts, 0.004, BLACK()));
  return g;
};

D.tensioElec = (o) => {
  const g = new THREE.Group();
  g.add(box(0.13, 0.055, 0.12, WHITE(), 0.03, 0.0275, 0, 0.015));
  const scr = screenPlane(0.07, 0.045, 'bp');
  scr.rotation.x = -Math.PI / 2 + 0.25;
  scr.position.set(0.03, 0.057, -0.01);
  g.add(scr);
  g.add(cyl(0.012, 0.012, 0.006, M('#1f6fd1', 0.4), 0.03, 0.057, 0.04, 24));
  const c = cuff(o.color, 0.13, 0.08, 0.025);
  c.position.set(-0.11, 0, 0.01);
  g.add(c, tube([[0.0, 0.03, -0.05], [-0.04, 0.04, -0.06], [-0.09, 0.03, -0.03]], 0.003, M('#e0e3e6', 0.5)));
  return g;
};

D.stetho = (o) => stethoscope(o.color || '#1d2f5a', 1);
D.stethoPedia = (o) => stethoscope(o.color || '#2aa7c9', 0.82, true);

D.stethoStand = () => {
  const g = new THREE.Group();
  const acr = getMaterial('plexi_depoli');
  g.add(box(0.36, 0.015, 0.2, acr, 0, 0.0075, 0), box(0.36, 0.42, 0.012, acr, 0, 0.21, -0.094));
  ['#1d2f5a', '#c8102e', '#2aa7c9', '#7a3fa0'].forEach((c, i) => {
    const s = stethoscope(c, 0.85);
    s.rotation.x = -Math.PI / 2;
    s.position.set(-0.13 + i * 0.087, 0.26, -0.075);
    s.scale.set(0.42, 1, 1);
    g.add(s);
  });
  return g;
};

/** Garrot électronique DDM Easy Pump Dual (boîtier ≈ 30 × 30 × 20 cm) */
function easyPumpUnit(color) {
  const g = new THREE.Group();
  const shell = M(color || '#f4f5f6', 0.3, 0, { clearcoat: 0.6, clearcoatRoughness: 0.15 });
  g.add(box(0.3, 0.29, 0.2, shell, 0, 0.145, 0, 0.04));
  // façade grise inclinée
  const face = new THREE.Group();
  face.add(box(0.255, 0.25, 0.012, M('#d9dde2', 0.45), 0, 0, 0, 0.02));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.138), screenMat(easyPumpTex()));
  scr.position.set(0, -0.005, 0.0085);
  scr.userData.emissive = true;
  const bezel = box(0.222, 0.15, 0.004, BLACK(), 0, -0.005, 0.005, 0.006);
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.032), new THREE.MeshStandardMaterial({ map: labelTex(), roughness: 0.5 }));
  lbl.position.set(-0.02, 0.098, 0.0065);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 0.012), new THREE.MeshStandardMaterial({ color: '#7cff7c', emissive: '#4cff4c', emissiveIntensity: 2 }));
  led.position.set(0.095, 0.098, 0.0066);
  led.userData.emissive = true;
  face.add(bezel, scr, lbl, led);
  face.position.set(0, 0.165, 0.101);
  face.rotation.x = -0.08;
  g.add(face);
  // boutons voie bleue / voie rouge + connecteurs
  g.add(box(0.07, 0.04, 0.012, M('#2f7de1', 0.35), -0.095, 0.025, 0.098, 0.01));
  g.add(box(0.07, 0.04, 0.012, M('#e0393e', 0.35), 0.095, 0.025, 0.098, 0.01));
  for (const x of [-0.02, 0.03]) {
    const c = cyl(0.009, 0.009, 0.015, CHROME(), x, 0.022, 0.105, 20);
    c.rotation.x = Math.PI / 2;
    g.add(c);
  }
  // poignée latérale
  for (const k of [-1, 1]) g.add(box(0.006, 0.08, 0.1, M('#c9ced4', 0.4), k * 0.152, 0.2, -0.01, 0.003));
  return g;
}

D.easyPump = (o) => {
  const g = easyPumpUnit(o.color);
  // brassard double posé à côté avec ses deux tuyaux (bleu / rouge)
  const c = cuff('#3a3f47', 0.2, 0.09, 0.03);
  c.position.set(0.28, 0, 0.06);
  g.add(c);
  g.add(tube([[0.02, 0.022, 0.12], [0.08, 0.02, 0.17], [0.2, 0.025, 0.1]], 0.003, M('#2f7de1', 0.4)));
  g.add(tube([[0.03, 0.022, 0.12], [0.11, 0.018, 0.15], [0.22, 0.025, 0.08]], 0.003, M('#e0393e', 0.4)));
  return g;
};

D.easyPumpPied = (o) => {
  const g = new THREE.Group();
  const base = getMaterial('blanc_laque');
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const leg = box(0.27, 0.025, 0.04, base, Math.cos(a) * 0.135, 0.055, Math.sin(a) * 0.135);
    leg.rotation.y = -a;
    g.add(leg, cyl(0.024, 0.024, 0.045, RUBBER(), Math.cos(a) * 0.27, 0.022, Math.sin(a) * 0.27, 12));
  }
  g.add(cyl(0.017, 0.017, 0.86, CHROME(), 0, 0.49, 0, 16));
  const basket = box(0.26, 0.1, 0.16, M('#d7dbe0', 0.6), 0, 0.62, 0.02, 0.01);
  const unit = easyPumpUnit(o.color);
  unit.position.set(0, 0.92, 0.02);
  g.add(basket, box(0.2, 0.02, 0.16, M('#c9ced4', 0.4), 0, 0.91, 0.02), unit);
  return g;
};

D.garrotDTS = (o) => {
  const g = new THREE.Group();
  g.add(box(0.2, 0.13, 0.15, WHITE(), 0, 0.065, 0, 0.012));
  const head = gaugeHead(0.045, 0.02, false);
  head.position.set(-0.04, 0.075, 0.08);
  g.add(head, box(0.05, 0.02, 0.01, M('#1f3b73', 0.4), 0.055, 0.09, 0.076));
  const c = cuff(o.color, 0.22, 0.1, 0.03);
  c.position.set(0, 0, 0.17);
  g.add(c);
  return g;
};

D.couverture = (o) => {
  const g = new THREE.Group();
  const t = quiltTex();
  const m = new THREE.MeshStandardMaterial({ color: o.color || '#d9e3ea', map: t, roughness: 0.95 });
  g.add(box(0.42, 0.035, 0.3, m, -0.05, 0.0175, 0, 0.015), box(0.4, 0.035, 0.29, m, -0.05, 0.052, 0, 0.015));
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.03), M('#2b6cb0', 0.5));
  lbl.rotation.x = -Math.PI / 2;
  lbl.position.set(-0.05, 0.0705, 0.1);
  g.add(lbl);
  // boîtier de commande
  g.add(box(0.07, 0.035, 0.11, WHITE(), 0.22, 0.0175, 0.03, 0.01));
  const scr = screenPlane(0.045, 0.03, 'bp');
  scr.rotation.x = -Math.PI / 2;
  scr.position.set(0.22, 0.0355, 0.015);
  g.add(scr, cyl(0.009, 0.009, 0.005, M('#e0533d', 0.4), 0.22, 0.037, 0.065, 20));
  g.add(tube([[0.19, 0.012, -0.02], [0.17, 0.012, -0.08], [0.12, 0.02, -0.12]], 0.0035, M('#e7eaee', 0.5)));
  return g;
};

D.thermo = (o) => {
  const g = new THREE.Group();
  const w = M(o.color || '#ffffff', 0.3, 0, { clearcoat: 0.5 });
  const handle = box(0.035, 0.03, 0.12, w, 0, 0.015, 0.02, 0.012);
  const head = cyl(0.022, 0.016, 0.06, w, 0, 0.022, -0.065, 24);
  head.rotation.x = Math.PI / 2;
  const lens = cyl(0.012, 0.012, 0.004, M('#2a3a55', 0.1), 0, 0.022, -0.096, 20);
  lens.rotation.x = Math.PI / 2;
  const scr = screenPlane(0.024, 0.016, 'bp');
  scr.rotation.x = -Math.PI / 2;
  scr.position.set(0, 0.0305, 0.01);
  g.add(handle, head, lens, scr);
  return g;
};

D.oxymetre = (o) => {
  const g = new THREE.Group();
  g.add(box(0.035, 0.016, 0.06, M(o.color || '#2a6fb5', 0.35, 0, { clearcoat: 0.6 }), 0, 0.008, 0, 0.007));
  g.add(box(0.033, 0.014, 0.056, M('#e9ecef', 0.4), 0, 0.023, 0, 0.007));
  const scr = screenPlane(0.024, 0.02, 'monitor');
  scr.rotation.x = -Math.PI / 2;
  scr.position.set(0, 0.0303, 0.008);
  g.add(scr);
  return g;
};

D.otoscope = (o) => {
  const g = new THREE.Group();
  const h = cyl(0.014, 0.014, 0.13, M(o.color || '#1d1e21', 0.5), 0, 0.014, 0.03, 24);
  h.rotation.x = Math.PI / 2;
  const neck = cyl(0.016, 0.014, 0.02, CHROME(), 0, 0.016, -0.045, 24);
  neck.rotation.x = Math.PI / 2;
  const headM = cyl(0.014, 0.02, 0.035, M('#2b2d31', 0.4), 0, 0.022, -0.072, 24);
  headM.rotation.z = Math.PI / 2;
  const spec = cyl(0.004, 0.009, 0.03, M('#f2f4f5', 0.5), -0.032, 0.022, -0.072, 16);
  spec.rotation.z = Math.PI / 2;
  g.add(h, neck, headM, spec);
  return g;
};

D.dermatoscope = (o) => {
  const g = new THREE.Group();
  const h = box(0.03, 0.022, 0.12, M(o.color || '#1d1e21', 0.45), 0, 0.011, 0.03, 0.009);
  const head = cyl(0.03, 0.03, 0.025, M('#2b2d31', 0.35), 0, 0.0125, -0.055, 32);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 32), getMaterial('verre'));
  lens.rotation.x = -Math.PI / 2;
  lens.position.set(0, 0.0255, -0.055);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.002, 8, 32), new THREE.MeshStandardMaterial({ emissive: '#bfe8ff', emissiveIntensity: 2, color: '#fff' }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.026, -0.055);
  ring.userData.emissive = true;
  g.add(h, head, lens, ring);
  return g;
};

D.monitor = (o) => {
  const g = new THREE.Group();
  g.add(box(0.2, 0.16, 0.1, M(o.color || '#ffffff', 0.35, 0, { clearcoat: 0.5 }), 0, 0.08, 0, 0.012));
  const scr = screenPlane(0.15, 0.1, 'monitor');
  scr.position.set(-0.012, 0.09, 0.0505);
  g.add(scr, box(0.02, 0.1, 0.004, M('#1f3b73', 0.4), 0.083, 0.09, 0.05), box(0.08, 0.012, 0.02, BLACK(), 0, 0.172, 0, 0.004));
  return g;
};

D.ecgTablet = (o) => {
  const g = new THREE.Group();
  const w = M(o.color || '#ffffff', 0.35, 0, { clearcoat: 0.5 });
  g.add(box(0.3, 0.06, 0.22, w, 0, 0.03, 0, 0.015));
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.08), new THREE.MeshStandardMaterial({ map: lcdTex('ecg'), roughness: 0.8 }));
  paper.rotation.x = -Math.PI / 2 + 0.2;
  paper.position.set(-0.06, 0.07, 0.13);
  const tab = new THREE.Group();
  tab.add(box(0.26, 0.17, 0.012, BLACK(), 0, 0, 0, 0.008));
  const scr = screenPlane(0.235, 0.15, 'ecg');
  scr.position.z = 0.0065;
  tab.add(scr);
  tab.position.set(0, 0.14, -0.03);
  tab.rotation.x = -0.35;
  g.add(paper, tab);
  return g;
};

D.defib = (o) => {
  const g = new THREE.Group();
  g.add(box(0.26, 0.09, 0.22, M('#6b7178', 0.5), 0, 0.045, 0, 0.02));
  g.add(box(0.255, 0.012, 0.215, M(o.color || '#c8102e', 0.4), 0, 0.094, 0, 0.006));
  const btn = cyl(0.02, 0.02, 0.01, M('#f0b400', 0.3), 0.06, 0.102, 0.03, 24);
  const handle = box(0.12, 0.02, 0.02, BLACK(), 0, 0.11, -0.08, 0.008);
  g.add(btn, handle);
  return g;
};

D.negatoscope = (o) => {
  const g = new THREE.Group();
  const frame = M(o.color || '#ffffff', 0.4);
  g.add(box(1.28, 0.5, 0.07, frame, 0, 0.3, 0, 0.01));
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.42), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#eaf4ff', emissiveIntensity: 1.6 }));
    p.position.set(-0.41 + i * 0.41, 0.3, 0.0355);
    p.userData.emissive = true;
    g.add(p);
  }
  for (const k of [-1, 1]) g.add(box(0.05, 0.05, 0.25, frame, k * 0.55, 0.025, 0));
  return g;
};

D.divan = (o) => {
  const g = new THREE.Group();
  const inox = getMaterial('metal_brosse');
  const pad = M(o.color || '#1d1e21', 0.6, 0, { sheen: 0.4 });
  for (const x of [-0.85, 0.85]) for (const z of [-0.26, 0.26]) g.add(cyl(0.015, 0.015, 0.62, inox, x, 0.31, z, 12));
  g.add(box(1.75, 0.03, 0.56, inox, 0, 0.62, 0), box(1.25, 0.08, 0.6, pad, 0.25, 0.68, 0, 0.02));
  const head = box(0.6, 0.08, 0.6, pad, 0, 0, 0, 0.02);
  head.position.set(-0.62, 0.78, 0);
  head.rotation.z = -0.35;
  g.add(head);
  for (const y of [0.2]) g.add(box(1.7, 0.02, 0.02, inox, 0, y, 0.26), box(1.7, 0.02, 0.02, inox, 0, y, -0.26));
  return g;
};

/* ---------- tensiomètres Spengler : Mobi, Lian Dessillons, Neotens ---------- */

/** Manomètre face avant (+z) avec bague de couleur */
function dialFront(r, depth, ring, back) {
  const g = new THREE.Group();
  const body = cyl(r, r * 0.92, depth, M(back, 0.45, 0, { clearcoat: 0.4 }), 0, 0, 0, 48);
  body.rotation.x = Math.PI / 2;
  const bumper = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.16, 16, 48), M(ring, 0.4, 0, { clearcoat: 0.5 }));
  bumper.position.z = depth / 2;
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.86, 48), new THREE.MeshStandardMaterial({ map: gaugeTex(), roughness: 0.3 }));
  face.position.z = depth / 2 + 0.001;
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 48), getMaterial('verre'));
  glass.position.z = depth / 2 + 0.004;
  g.add(body, bumper, face, glass);
  return g;
}

function valve(x, y, z, side = -1) {
  const g = new THREE.Group();
  const stem = cyl(0.004, 0.004, 0.014, CHROME(), 0, 0, 0, 12);
  stem.rotation.z = Math.PI / 2;
  const knob = cyl(0.008, 0.008, 0.01, CHROME(), side * 0.011, 0, 0, 18);
  knob.rotation.z = Math.PI / 2;
  g.add(stem, knob);
  g.position.set(x, y, z);
  return g;
}

/** Mobi : manopoire vertical, cuillère de maintien et bague de couleur (≈ 17 cm) */
function mobiUnit(color) {
  const g = new THREE.Group();
  const col = M(color, 0.4, 0, { clearcoat: 0.5 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), RUBBER());
  bulb.scale.set(0.024, 0.04, 0.022);
  bulb.position.y = 0.042;
  // cuillère de maintien (demi-coque colorée derrière la poire)
  const spoon = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, Math.PI * 0.5, Math.PI, 0, Math.PI * 0.62), new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.5, side: THREE.DoubleSide }));
  spoon.scale.set(0.026, 0.045, 0.025);
  spoon.position.y = 0.046;
  spoon.rotation.y = Math.PI;
  const neck = cyl(0.012, 0.017, 0.03, col, 0, 0.092, -0.004, 24);
  const dial = dialFront(0.034, 0.024, color, color);
  dial.position.set(0, 0.135, 0);
  const conn = cyl(0.004, 0.004, 0.018, CHROME(), 0.022, 0.1, 0, 12);
  conn.rotation.z = Math.PI / 2;
  g.add(bulb, spoon, neck, dial, valve(-0.02, 0.1, 0), conn);
  g.add(tube([[0.031, 0.1, 0], [0.06, 0.09, 0.005], [0.08, 0.05, 0.02], [0.09, 0.006, 0.04]], 0.003, BLACK()));
  return g;
}

D.mobi = (o) => mobiUnit(o.color || '#ee6a3c');

D.mobi4 = () => {
  const g = new THREE.Group();
  const acr = getMaterial('plexi_depoli');
  g.add(box(0.42, 0.012, 0.12, acr, 0, 0.006, 0, 0.004));
  ['#27386b', '#ee6a3c', '#1c1c1f', '#f1f1ef'].forEach((c, i) => {
    const m = mobiUnit(c);
    m.position.set(-0.15 + i * 0.1, 0.012, 0);
    g.add(m);
  });
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.03), new THREE.MeshStandardMaterial({ map: textLabel('MOBI · Red Dot Award', '#27386b'), transparent: true }));
  lbl.position.set(0, 0.006, 0.061);
  g.add(lbl);
  return g;
};

/** Lian Dessillons : manopoire Made in France, cadran incliné à lunette noire et dos de couleur */
D.dessillons = (o) => {
  const g = new THREE.Group();
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), RUBBER());
  bulb.scale.set(0.026, 0.026, 0.05);
  bulb.position.set(0, 0.026, 0.04);
  const neck = cyl(0.011, 0.015, 0.035, BLACK(), 0, 0.045, -0.012, 24);
  neck.rotation.x = -0.9;
  const dial = dialFront(0.033, 0.026, '#1c1c1f', o.color || '#c8102e');
  dial.position.set(0, 0.07, -0.035);
  dial.rotation.x = -0.75;
  g.add(bulb, neck, dial, valve(-0.016, 0.042, -0.006));
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.012), new THREE.MeshStandardMaterial({ map: textLabel('Made in France', '#c8102e'), transparent: true }));
  lbl.rotation.x = -Math.PI / 2;
  lbl.position.set(0, 0.0015, 0.1);
  g.add(lbl);
  return g;
};

function textLabel(text, color) {
  return canvasTex('lbl-' + text + color, 512, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = color;
    g.font = 'bold 40px Helvetica';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2);
  });
}

/** Neotens : boîtier blanc à socle bleu marine, grand écran LCD, brassard */
D.neotens = (o) => {
  const g = new THREE.Group();
  const navy = M(o.color || '#1f2d52', 0.45, 0, { clearcoat: 0.3 });
  g.add(box(0.132, 0.014, 0.122, navy, 0, 0.007, 0, 0.012));
  g.add(box(0.13, 0.04, 0.12, WHITE(), 0, 0.032, 0, 0.018));
  const top = new THREE.Group();
  const scr = screenPlane(0.062, 0.05, 'bpg');
  scr.rotation.x = -Math.PI / 2;
  scr.position.set(0, 0, -0.008);
  const btn = cyl(0.01, 0.01, 0.004, navy, 0.0, 0.0, 0.04, 24);
  const b2 = cyl(0.005, 0.005, 0.003, M('#c9ced4', 0.4), -0.035, 0, 0.04, 16);
  const b3 = cyl(0.005, 0.005, 0.003, M('#c9ced4', 0.4), 0.035, 0, 0.04, 16);
  top.add(scr, btn, b2, b3);
  top.position.y = 0.0525;
  g.add(top);
  // brassard enroulé (manchon) avec tubulure bleue
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.14, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: '#1e2a49', roughness: 0.9, sheen: 0.5, side: THREE.DoubleSide }));
  sleeve.scale.z = 0.75;
  sleeve.position.set(-0.07, 0.07, -0.13);
  sleeve.rotation.z = 0.12;
  const tag = box(0.03, 0.05, 0.004, M('#e7eaee', 0.6), -0.07, 0.08, -0.087);
  g.add(sleeve, tag, tube([[0.0, 0.03, -0.062], [-0.02, 0.025, -0.1], [-0.05, 0.03, -0.1]], 0.0035, M('#24427e', 0.4)));
  return g;
};

/** Neotens Nomad : tensiomètre poignet sur son bracelet */
D.nomad = (o) => {
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.062, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: o.color || '#2b3a63', roughness: 0.9, sheen: 0.5, side: THREE.DoubleSide }));
  band.rotation.z = Math.PI / 2;
  band.scale.set(1, 1, 0.85);
  band.position.y = 0.036;
  g.add(band);
  const unit = new THREE.Group();
  unit.add(box(0.07, 0.022, 0.062, WHITE(), 0, 0, 0, 0.01));
  const scr = screenPlane(0.04, 0.035, 'bpg');
  scr.rotation.x = -Math.PI / 2;
  scr.position.set(0.004, 0.0112, 0);
  const btn = cyl(0.006, 0.006, 0.003, M('#27386b', 0.4), -0.027, 0.011, 0.012, 16);
  unit.add(scr, btn);
  unit.position.y = 0.075;
  g.add(unit);
  return g;
};

export function buildDevice(o) {
  const fn = D[o.model];
  const g = fn ? fn(o) : new THREE.Group();
  // le point le plus bas du produit repose exactement sur son support
  const b = new THREE.Box3().setFromObject(g);
  if (!b.isEmpty()) {
    // produit centré sur son emprise au sol (pose et rotation naturelles)
    const cx = (b.min.x + b.max.x) / 2;
    const cz = (b.min.z + b.max.z) / 2;
    for (const c of g.children) {
      c.position.x -= cx;
      c.position.z -= cz;
      c.position.y -= b.min.y;
    }
  }
  return g;
}
