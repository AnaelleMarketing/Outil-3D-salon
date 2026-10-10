// Visuels de démonstration et modèles de stand prêts à l'emploi.
import * as assets from './assets.js';
import { uid, canvasToBlob } from './util.js';

const SAGE = '#b6c8cd';
const CONDENSED = '"Avenir Next Condensed", "Arial Narrow", "Helvetica Neue", sans-serif';
const SANS = '"Avenir Next", "Helvetica Neue", Arial, sans-serif';

function loadImg(src) {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function drawCover(g, img, x, y, w, h, r) {
  g.save();
  roundRect(g, x, y, w, h, r);
  g.clip();
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s;
  const ih = img.height * s;
  g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  g.restore();
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function spenglerGroup(g, cx, cy, size, color = '#ffffff') {
  g.fillStyle = color;
  g.textBaseline = 'alphabetic';
  g.font = `500 ${size}px ${CONDENSED}`;
  const w1 = g.measureText('SPENGLER').width;
  g.font = `500 ${size * 0.62}px ${CONDENSED}`;
  const w2 = g.measureText('GROUP').width;
  const x0 = cx - (w1 + w2 + size * 0.04) / 2;
  g.font = `500 ${size}px ${CONDENSED}`;
  g.fillText('SPENGLER', x0, cy);
  g.font = `500 ${size * 0.62}px ${CONDENSED}`;
  g.fillText('GROUP', x0 + w1 + size * 0.04, cy);
  g.fillRect(x0 + w1 + size * 0.04, cy + size * 0.08, w2, size * 0.05);
}

const LOGOS = [
  ['spengler', '♡ Spengler', SANS, '500'],
  ['ddm', 'DDM', SANS, '700'],
  ['ecm', '⫽ECM', SANS, '600'],
  ['deboissy', 'De Boissy', 'Snell Roundhand, "Brush Script MT", cursive', '700'],
  ['luxamed', 'LUXAMED®', SANS, '700'],
  ['holtex', '✚ Holtex', SANS, '700'],
  ['cardionet', '♡ cardionet', SANS, '400'],
  ['biomed', 'BIOMED', SANS, '700'],
];

/** Génère les visuels de démo (non enregistrés en base, recréés à chaque lancement) */
export async function registerBuiltins() {
  const [pc, pd] = await Promise.all([loadImg('medica/photo-cardio.jpg'), loadImg('medica/photo-diagnostic.jpg')]);
  const add = async (id, c, name, brand = 'Spengler', alpha) =>
    assets.addAsset(await canvasToBlob(c), { id: 'builtin:' + id, name, kind: 'image', brand, builtin: true, demo: true, alpha });

  // Panneau Cardiology / Hospital (4,2 × 3,6 m)
  {
    const [c, g] = canvas(2100, 1800);
    g.fillStyle = SAGE;
    g.fillRect(0, 0, 2100, 1800);
    if (pc) drawCover(g, pc, 240, 400, 1860, 740, 90);
    g.fillStyle = '#ffffff';
    g.font = `400 112px ${SANS}`;
    g.textAlign = 'center';
    g.fillText('CARDIOLOGY', 720, 300);
    g.fillText('HOSPITAL', 1560, 300);
    await add('cardio', c, 'Medica – Cardiology / Hospital');
  }
  // Panneau Diagnostic (2,6 × 3,6 m)
  {
    const [c, g] = canvas(1300, 1800);
    g.fillStyle = SAGE;
    g.fillRect(0, 0, 1300, 1800);
    if (pd) drawCover(g, pd, 0, 400, 1080, 740, 90);
    g.fillStyle = '#ffffff';
    g.font = `400 112px ${SANS}`;
    g.textAlign = 'center';
    g.fillText('DIAGNOSTIC', 660, 300);
    await add('diagnostic', c, 'Medica – Diagnostic');
  }
  // Bannière Spengler Group (5,84 × 1,24 m)
  {
    const [c, g] = canvas(2920, 620);
    g.fillStyle = SAGE;
    g.fillRect(0, 0, 2920, 620);
    spenglerGroup(g, 1460, 300, 230);
    g.font = `500 64px ${SANS}`;
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    const names = ['♡ cardionet', 'DDM', 'De Boissy', '⫽ECM', '✚ Holtex', 'LUXAMED®', '♡ Spengler'];
    names.forEach((n, i) => g.fillText(n, 300 + i * 386, 480));
    await add('banner', c, 'Bannière Spengler Group');
  }
  // Caisson vertical Spengler Group
  {
    const [c, g] = canvas(400, 1800);
    g.fillStyle = SAGE;
    g.fillRect(0, 0, 400, 1800);
    g.save();
    g.translate(220, 900);
    g.rotate(-Math.PI / 2);
    spenglerGroup(g, 0, 60, 200);
    g.restore();
    await add('vertical', c, 'Caisson vertical Spengler Group');
  }
  // Côté du pilier
  {
    const [c, g] = canvas(900, 3900);
    g.fillStyle = SAGE;
    g.fillRect(0, 0, 900, 3900);
    g.fillStyle = '#ffffff';
    g.font = `500 80px ${SANS}`;
    g.textAlign = 'center';
    g.fillText('♡ Spengler', 450, 420);
    g.save();
    g.translate(520, 2300);
    g.rotate(-Math.PI / 2);
    spenglerGroup(g, 0, 90, 300);
    g.restore();
    await add('pillar', c, 'Pilier – Spengler Group');
  }
  // Logo Spengler Medical (S + SPENGLER MEDICAL), versions grise et blanche
  const sLogo = await loadImg('brand/logo-s.png');
  for (const [id, ink, ink2] of [
    ['lockup', '#6d6e70', '#6d6e70'],
    ['lockup-white', '#ffffff', '#e6e8ea'],
  ]) {
    const [c, g] = canvas(1200, 760);
    if (sLogo) g.drawImage(sLogo, 600 - 150, 20, 300, 300 * (sLogo.height / sLogo.width));
    g.textAlign = 'center';
    g.fillStyle = ink;
    g.font = '400 190px "Gill Sans", "Gill Sans MT", Calibri, sans-serif';
    g.fillText('SPENGLER', 600, 560);
    g.fillStyle = ink2;
    g.font = '400 78px "Gill Sans", "Gill Sans MT", Calibri, sans-serif';
    g.letterSpacing = '30px';
    g.fillText('MEDICAL', 615, 690);
    await add(id, c, id === 'lockup' ? 'Logo Spengler Medical' : 'Logo Spengler Medical (blanc)', 'Spengler', true);
  }
  // Logos (texte, fond transparent)
  for (const [id, text, font, weight] of LOGOS) {
    const [c, g] = canvas(800, 260);
    g.fillStyle = '#6f8790';
    g.font = `${weight} 130px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 400, 135, 760);
    await add('logo-' + id, c, 'Logo ' + text.replace(/[♡⫽✚®]/g, '').trim(), text.replace(/[♡⫽✚®]/g, '').trim(), true);
  }
}

/* ---------- modèles de stand ---------- */

let n = 0;
const o = (type, name, props) => ({ id: uid('o') + n++, type, name, x: 0, z: 0, y: 0, rot: 0, zone: '', ...props });

export function emptyProject(extra = {}) {
  return {
    id: uid('p'),
    version: 1,
    name: 'Nouveau stand',
    salon: '',
    lieu: '',
    hall: '',
    dates: '',
    status: 'brouillon',
    created: Date.now(),
    stand: {
      w: 6,
      d: 3,
      hMax: 4,
      open: ['front'],
      floor: { type: 'moquette', color: '#5a97b0' },
      grid: 0.1,
      snap: true,
      dims: true,
      env: false,
      aisle: 3,
      plan: null,
    },
    objects: [],
    views: [],
    comments: [],
    measures: [],
    hiddenZones: [],
    ...extra,
  };
}

function plinthCluster(cx, cz, zone, logos) {
  const s = 0.36;
  const p = (dx, dz, h, led, logo) =>
    o('plinth', 'Socle ' + zone, { x: cx + dx, z: cz + dz, w: s, d: s, h, finish: 'blanc_laque', led: led || 'aucune', zone, image: logo || null, gMargin: 0.04, imageFit: 'contain', imageOy: 0.85 });
  return [
    p(0, -0.37, 1.0, 'aucune'),
    p(0, 0, 1.1, 'aucune'),
    p(0, 0.36, 0.9, 'gauche', logos[0]),
    p(-0.37, 0.18, 0.8, 'droite', logos[1]),
    p(0.37, 0.18, 0.8, 'aucune', logos[2]),
    p(0.37, -0.18, 0.9, 'aucune'),
  ];
}

/** Recréation du stand Medica 2026 (Prima Design, plan 1:40) */
export function medicaProject() {
  const objs = [
    // structure
    o('wall', 'Pilier Spengler (côté gauche)', { x: 0.2, z: 0.47, w: 0.94, d: 0.4, h: 4, rot: -90, finish: 'blanc_laque', image: 'builtin:pillar', imageBack: null, gMargin: 0.06, gRadius: 0.25, zone: 'Structure' }),
    o('lightbox', 'Caisson vertical pilier', { x: 0.2, z: 0.97, w: 0.28, d: 0.05, h: 2.0, y: 0.9, image: 'builtin:vertical', glow: 0.9, zone: 'Structure' }),
    o('wall', 'Cloison Cardiology / Hospital', { x: 2.7, z: 0.05, w: 4.6, d: 0.1, h: 4, finish: 'blanc_laque', image: 'builtin:cardio', gMargin: 0.2, gRadius: 0.5, zone: 'Structure' }),
    o('storage', 'Réserve / vestiaire (Diagnostic)', { x: 6.5, z: 0.47, w: 3.0, d: 0.94, h: 4, finish: 'blanc_laque', doorSide: 'left', doorPos: 0.5, image: 'builtin:diagnostic', gMargin: 0.2, gRadius: 0.5, zone: 'Diagnostic' }),
    o('lightbox', 'Caisson latéral Spengler Group', { x: 7.975, z: 0.47, w: 0.8, d: 0.05, h: 3.4, y: 0.3, rot: 90, attached: true, image: 'builtin:vertical', glow: 0.9, zone: 'Structure' }),
    o('banner', 'Bannière Spengler Group', { x: 4, z: 1.5, w: 6, d: 0.08, h: 1.4, y: 4.25, radius: 0.25, finish: 'blanc_laque', truss: true, spots: 5, kelvin: 4000, intensity: 6, image: 'builtin:banner', imageBack: 'builtin:banner', gMargin: 0.08, gRadius: 0.22, zone: 'Structure' }),
    // spots en tête de cloison
    ...[1.0, 2.6, 4.2].map((x, i) => o('spot', 'Spot cloison ' + (i + 1), { x, z: 0.42, y: 4.02, rot: 180, tilt: 22, angle: 50, intensity: 9, kelvin: 4000, zone: 'Structure' })),
    ...[5.8, 7.3].map((x, i) => o('spot', 'Spot réserve ' + (i + 1), { x, z: 1.31, y: 4.02, rot: 180, tilt: 22, angle: 50, intensity: 9, kelvin: 4000, zone: 'Diagnostic' })),
    // Cardio
    o('brochure', 'Porte-catalogues', { x: 0.2, z: 1.2, w: 0.3, d: 0.3, h: 1.5, rot: 90, zone: 'Cardio' }),
    o('tableHaute', 'Table haute Cardio', { x: 1.5, z: 0.72, w: 0.6, d: 1.2, h: 1.1, finish: 'blanc_laque', zone: 'Cardio' }),
    ...[
      [0.93, 0.37, 90],
      [0.93, 0.85, 90],
      [2.07, 0.37, -90],
      [2.07, 0.85, -90],
    ].map(([x, z, rot]) => o('stool', 'Tabouret', { x, z, rot, w: 0.42, d: 0.42, h: 0.76, finish: 'blanc_laque', legs: 'blanc_laque', zone: 'Cardio' })),
    ...plinthCluster(1.13, 2.42, 'Cardio', ['builtin:logo-spengler', null, null]),
    // Hospital
    o('tableHaute', 'Table haute Hospital', { x: 3.3, z: 0.72, w: 0.6, d: 1.2, h: 1.1, finish: 'blanc_laque', zone: 'Hospital' }),
    ...[
      [2.72, 0.37, 90],
      [2.72, 0.85, 90],
      [3.88, 0.37, -90],
      [3.88, 0.85, -90],
    ].map(([x, z, rot]) => o('stool', 'Tabouret', { x, z, rot, w: 0.42, d: 0.42, h: 0.76, finish: 'blanc_laque', legs: 'blanc_laque', zone: 'Hospital' })),
    ...plinthCluster(4.13, 2.42, 'Hospital', ['builtin:logo-ecm', 'builtin:logo-ddm', 'builtin:logo-deboissy']),
    // produits Spengler Medical posés sur les socles
    o('device', 'Stéthoscope Cardio Prestige II', { x: 1.13, z: 2.05, y: 1.0, rot: 90, model: 'stetho', color: '#1d2f5a', brand: 'Spengler', gamme: 'Stéthoscopes', ref: '506011', zone: 'Cardio' }),
    o('device', 'Tensiomètre manopoire Lian Nano', { x: 1.13, z: 2.42, y: 1.1, model: 'manopoire', color: '#1f3b73', brand: 'Spengler', gamme: 'Tension artérielle', zone: 'Cardio' }),
    o('device', 'Oxymètre de pouls', { x: 0.76, z: 2.6, y: 0.8, model: 'oxymetre', color: '#2a6fb5', brand: 'Spengler', gamme: 'Diagnostic', zone: 'Cardio' }),
    o('device', 'Tensiomètre MAXI+3 sur socle', { x: 2.75, z: 2.45, model: 'tensioSocle', color: '#1f3b73', brand: 'Spengler', gamme: 'Tension artérielle', ref: '522705', zone: 'Cardio' }),
    o('device', 'Garrot Easy Pump® Dual', { x: 4.13, z: 2.42, y: 1.1, model: 'easyPump', color: '#ffffff', brand: 'DDM', gamme: 'Garrots', zone: 'Hospital' }),
    o('device', 'Couverture chauffante ECM', { x: 4.13, z: 2.78, y: 0.9, rot: 0, model: 'couverture', color: '#d9e3ea', brand: 'ECM', gamme: 'Réchauffement patient', zone: 'Hospital' }),
    o('device', 'Vitalimate MINI', { x: 3.76, z: 2.6, y: 0.8, model: 'monitor', color: '#ffffff', brand: 'Spengler', gamme: 'Monitoring & ECG', zone: 'Hospital' }),
    // Diagnostic
    o('counter', 'Comptoir Luxamed', { x: 6.99, z: 2.3, w: 0.8, d: 1.3, h: 0.9, finish: 'blanc_laque', led: 'gauche', image: 'builtin:logo-luxamed', gMargin: 0.06, imageFit: 'contain', imageOy: 0.5, zone: 'Diagnostic' }),
    o('display', 'Présentoir Luxamed', { x: 6.99, z: 2.3, y: 0.9, w: 1.1, d: 0.3, h: 1.0, rot: 90, shelves: 3, finish: 'blanc_laque', zone: 'Diagnostic' }),
    o('product', "Lampe d'examen (exemple)", { x: 5.75, z: 2.35, w: 0.6, d: 0.6, h: 1.7, shape: 'lampe', finish: 'blanc_laque', brand: 'Luxamed', gamme: 'Éclairage d’examen', zone: 'Diagnostic' }),
    // réserve
    o('coatRack', 'Portemanteau', { x: 5.5, z: 0.4, h: 1.75, finish: 'metal_brosse', zone: 'Diagnostic' }),
    o('bin', 'Poubelle', { x: 6.96, z: 0.3, w: 0.32, h: 0.6, finish: 'blanc_mat', zone: 'Diagnostic' }),
    o('plinth', 'Réfrigérateur 200 L', { x: 7.6, z: 0.42, w: 0.6, d: 0.6, h: 0.85, finish: 'blanc_mat', zone: 'Diagnostic' }),
  ];
  return emptyProject({
    name: 'Medica 2026 – Spengler Group',
    salon: 'Medica 2026',
    lieu: 'Düsseldorf',
    hall: 'Hall 10 – stand C42',
    dates: '16.11. – 19.11.2026',
    stand: { ...emptyProject().stand, w: 8, d: 3, hMax: 6, floor: { type: 'moquette', color: '#5b98b2' } },
    objects: objs,
    views: [
      { id: uid('v'), name: 'Vue ¾ gauche', mode: 'orbit', pos: [-3.2, 4.6, 9.4], target: [4, 2, 1.5] },
      { id: uid('v'), name: 'Vue ¾ droite', mode: 'orbit', pos: [11.6, 4.4, 9.2], target: [4, 2, 1.5] },
      { id: uid('v'), name: 'Face', mode: 'orbit', pos: [4, 2.6, 11.5], target: [4, 2.2, 1.5] },
      { id: uid('v'), name: 'Visiteur – entrée', mode: 'visitor', pos: [4, 1.65, 4.6], yaw: -0.15, pitch: -0.05 },
    ],
  });
}

/** Stand vide avec cloisons sur les côtés fermés */
export function basicProject(w, d, open = ['front'], extra = {}) {
  const p = emptyProject({ name: `Stand ${w} × ${d} m`, ...extra });
  p.stand = { ...p.stand, w, d, open, hMax: 4 };
  const h = 2.5;
  if (!open.includes('back')) p.objects.push(o('wall', 'Cloison arrière', { x: w / 2, z: 0.05, w, d: 0.1, h, finish: 'blanc_laque', gMargin: 0.15, gRadius: 0.3 }));
  if (!open.includes('left')) p.objects.push(o('wall', 'Cloison gauche', { x: 0.05, z: d / 2 + 0.05, w: d - 0.1, d: 0.1, h, rot: 90, finish: 'blanc_laque' }));
  if (!open.includes('right')) p.objects.push(o('wall', 'Cloison droite', { x: w - 0.05, z: d / 2 + 0.05, w: d - 0.1, d: 0.1, h, rot: -90, finish: 'blanc_laque' }));
  p.objects.push(o('counter', "Comptoir d'accueil", { x: w - 1, z: d - 0.6, w: 1.2, d: 0.6, h: 1.05, finish: 'blanc_laque', led: 'deux' }));
  return p;
}

export const TEMPLATES = [
  { id: 'medica', label: 'Medica 2026 – Spengler Group (8 × 3 m)', make: () => medicaProject() },
  { id: '3x3', label: 'Stand en ligne 3 × 3 m', make: () => basicProject(3, 3) },
  { id: '6x3', label: 'Stand en ligne 6 × 3 m', make: () => basicProject(6, 3) },
  { id: '8x3', label: 'Stand en ligne 8 × 3 m', make: () => basicProject(8, 3) },
  { id: '6x6', label: 'Stand en angle 6 × 6 m', make: () => basicProject(6, 6, ['front', 'right']) },
  { id: '9x6', label: 'Péninsule 9 × 6 m', make: () => basicProject(9, 6, ['front', 'left', 'right']) },
  { id: 'vide', label: 'Stand vierge (dimensions libres)', make: (w = 6, d = 3) => basicProject(w, d, ['front', 'left', 'right', 'back']) },
];

export const OPEN_TYPES = {
  ligne: { label: 'En ligne (1 face ouverte)', open: ['front'] },
  angleG: { label: 'En angle – ouvert à gauche (2 faces)', open: ['front', 'left'] },
  angleD: { label: 'En angle – ouvert à droite (2 faces)', open: ['front', 'right'] },
  peninsule: { label: 'Péninsule (3 faces)', open: ['front', 'left', 'right'] },
  ilot: { label: 'Îlot (4 faces)', open: ['front', 'left', 'right', 'back'] },
};

export function openTypeOf(open) {
  const k = [...open].sort().join(',');
  for (const [id, t] of Object.entries(OPEN_TYPES)) if ([...t.open].sort().join(',') === k) return id;
  return 'ligne';
}
