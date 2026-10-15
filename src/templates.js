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
    const names = ['DDM', 'De Boissy', '⫽ECM', '✚ Holtex', 'LUXAMED®', '♡ Spengler'];
    names.forEach((n, i) => g.fillText(n, 340 + i * 448, 480));
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
  // Visuels du stand WHX Dubai 2027 (Tradex), redressés à partir de la projection du standiste
  for (const [id, file, name] of [
    ['tradex-rear', 'rear.jpg', 'WHX Dubai – cloison du fond'],
    ['tradex-side', 'side.jpg', 'WHX Dubai – cloison latérale'],
    ['tradex-lightbox', 'lightbox.jpg', 'WHX Dubai – caisson lumineux'],
    ['tradex-logo-sm', 'logo-spengler-medical.jpg', 'Logo Spengler Medical (comptoir)'],
    ['tradex-logo-spengler', 'logo-spengler-heart.jpg', 'Logo Spengler (vitrine)'],
    ['tradex-logo-luxamed', 'logo-luxamed.jpg', 'Logo Luxamed (vitrine)'],
  ]) {
    try {
      const r = await fetch('tradex/' + file);
      if (r.ok) await assets.addAsset(await r.blob(), { id: 'builtin:' + id, name, kind: 'image', brand: 'Spengler', builtin: true, demo: true, library: false });
    } catch (e) {
      /* visuel facultatif */
    }
  }
  {
    const [c, g] = canvas(600, 330);
    ['#111111', '#dd0000', '#ffcc00'].forEach((col, i) => ((g.fillStyle = col), g.fillRect(0, i * 110, 600, 110)));
    await add('tradex-flag', c, 'Drapeau allemand');
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

/** Stand WHX Dubai 2027 – German Healthcare Pavilion (Tradex), Luxamed / Spengler, stand S11.B70 */
export function tradexProject() {
  const W = 6.95;
  const D = 2.95;
  const objs = [
    // structure
    o('wall', 'Cloison du fond (visuel complet)', { x: W / 2, z: 0.05, w: W, d: 0.1, h: 3.6, finish: 'blanc_mat', image: 'builtin:tradex-rear', imageFit: 'stretch', gMargin: 0, zone: 'Structure' }),
    o('wall', 'Cloison gauche Spengler Medical', { x: 0.05, z: 1.3, w: 2.4, d: 0.1, h: 2.3, rot: 90, finish: 'blanc_mat', image: 'builtin:tradex-side', imageFit: 'stretch', gMargin: 0, zone: 'Structure' }),
    o('lightbox', 'Caisson lumineux Luxamed (S11.B70)', { x: 0.2, z: 2.58, w: 0.4, d: 0.16, h: 2.43, finish: 'noir_mat', image: 'builtin:tradex-lightbox', imageFit: 'stretch', glow: 0.9, zone: 'Structure' }),
    o('wall', 'Bandeau du pavillon', { x: W / 2, z: 0.2, y: 3.6, w: W, d: 0.4, h: 0.3, finish: 'gris_clair', attached: true, zone: 'Structure' }),
    o('visual', 'Drapeau allemand', { x: W - 0.32, z: 0.403, y: 3.6, w: 0.55, h: 0.3, image: 'builtin:tradex-flag', imageFit: 'stretch', zone: 'Structure' }),
    ...[0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.45].map((x, i) => o('spot', 'Spot LED cloison ' + (i + 1), { x, z: 0.5, y: 3.58, rot: 180, tilt: 25, angle: 55, intensity: 8, kelvin: 4500, zone: 'Structure' })),
    o('spot', 'Spot LED cloison gauche', { x: 0.45, z: 1.3, y: 2.32, rot: -90, tilt: 25, angle: 55, intensity: 7, kelvin: 4500, zone: 'Structure' }),
    // espace rencontre
    o('mangeDebout', 'Table ronde en bois', { x: 1.75, z: 1.15, w: 0.8, d: 0.8, h: 0.75, finish: 'bois_chene', zone: 'Rencontre' }),
    o('chair', 'Chaise de réunion bois', { w: 0.46, d: 0.5, h: 0.84, x: 1.75, z: 0.55, rot: 0, finish: 'bois_chene', legs: 'metal_brosse', zone: 'Rencontre' }),
    o('chair', 'Chaise de réunion bois', { w: 0.46, d: 0.5, h: 0.84, x: 1.75, z: 1.75, rot: 180, finish: 'bois_chene', legs: 'metal_brosse', zone: 'Rencontre' }),
    o('chair', 'Chaise de réunion bois', { w: 0.46, d: 0.5, h: 0.84, x: 1.12, z: 1.15, rot: 90, finish: 'bois_chene', legs: 'metal_brosse', zone: 'Rencontre' }),
    o('chair', 'Chaise de réunion bois', { w: 0.46, d: 0.5, h: 0.84, x: 2.38, z: 1.15, rot: -90, finish: 'bois_chene', legs: 'metal_brosse', zone: 'Rencontre' }),
    o('bin', 'Poubelle', { x: 2.75, z: 0.42, w: 0.3, h: 0.6, finish: 'blanc_mat', zone: 'Rencontre' }),
    o('mangeDebout', 'Mange-debout (bistro)', { x: 5.0, z: 1.05, w: 0.6, d: 0.6, h: 1.1, finish: 'blanc_laque', zone: 'Rencontre' }),
    o('barChair', 'Tabouret de bar cuir', { x: 4.38, z: 1.0, rot: 90, w: 0.44, d: 0.48, h: 1.05, seatH: 0.76, style: 'classique', finish: 'blanc_laque', legs: 'chrome', zone: 'Rencontre' }),
    o('barChair', 'Tabouret de bar cuir', { x: 5.55, z: 1.45, rot: -120, w: 0.44, d: 0.48, h: 1.05, seatH: 0.76, style: 'classique', finish: 'blanc_laque', legs: 'chrome', zone: 'Rencontre' }),
    // présentation produits
    o('vitrine', 'Vitrine en verre à étagères', { x: 0.42, z: 0.47, w: 0.5, d: 0.5, h: 2.0, shelves: 4, finish: 'blanc_laque', zone: 'Produits' }),
    o('vitrineBasse', 'Vitrine fermant à clé Spengler', { x: 0.78, z: 2.05, w: 0.8, d: 0.5, h: 1.05, finish: 'blanc_laque', image: 'builtin:tradex-logo-spengler', imageFit: 'contain', imageOy: 0.4, gMargin: 0.1, zone: 'Produits' }),
    o('vitrineBasse', 'Vitrine fermant à clé Luxamed', { x: 6.5, z: 1.9, w: 0.8, d: 0.5, h: 1.05, finish: 'blanc_laque', image: 'builtin:tradex-logo-luxamed', imageFit: 'contain', imageOy: 0.4, gMargin: 0.1, zone: 'Produits' }),
    o('counter', 'Comptoir Spengler Medical', { x: 4.05, z: 1.78, w: 1.0, d: 0.5, h: 1.0, finish: 'blanc_mat', led: 'aucune', doors: 'deux', doorOpen: 0, image: 'builtin:tradex-logo-sm', imageFit: 'contain', imageOy: 0.5, gMargin: 0.1, zone: 'Produits' }),
    o('plinth', 'Podium bois 1', { x: 2.62, z: 1.97, w: 0.5, d: 0.5, h: 0.8, finish: 'blanc_mat', zone: 'Produits' }),
    o('plinth', 'Podium bois 2', { x: 3.12, z: 1.97, w: 0.5, d: 0.5, h: 1.0, finish: 'blanc_mat', zone: 'Produits' }),
    o('plinth', 'Podium bois 2', { x: 2.87, z: 2.5, w: 0.5, d: 0.5, h: 0.5, finish: 'blanc_mat', zone: 'Produits' }),
    o('plinth', 'Podium bois 3', { x: 5.55, z: 2.5, w: 0.5, d: 0.5, h: 0.7, finish: 'blanc_mat', zone: 'Produits' }),
    o('brochure', 'Grand porte-brochures', { x: 6.72, z: 2.62, w: 0.35, d: 0.35, h: 1.6, finish: 'plexi_depoli', zone: 'Produits' }),
    // écrans
    o('tv', 'Écran LED 43" (mural)', { x: 2.95, z: 0.13, y: 2.55, inches: 43, mount: 'mural', finish: 'noir_mat', zone: 'Structure' }),
    o('tv', 'Écran LED 43" sur pied', { x: 1.76, z: 2.5, inches: 43, mount: 'pied', screenY: 1.0, finish: 'noir_mat', zone: 'Produits' }),
  ];
  return emptyProject({
    name: 'WHX Dubai 2027 – Luxamed / Spengler (S11.B70)',
    salon: 'WHX Dubai 2027',
    lieu: 'Dubaï',
    hall: 'German Healthcare Pavilion (Tradex) – stand S11.B70',
    dates: '25 – 28 janvier 2027',
    stand: { ...emptyProject().stand, w: W, d: D, hMax: 4.0, open: ['front', 'right'], floor: { type: 'moquette', color: '#3a3d42' } },
    objects: objs,
    views: [
      { id: uid('v'), name: 'Vue ISO (projection)', mode: 'orbit', pos: [6.4, 4.6, 7.6], target: [2.9, 1.2, 1.1] },
      { id: uid('v'), name: 'Face', mode: 'orbit', pos: [3.5, 2.2, 8.2], target: [3.5, 1.7, 1.2] },
      { id: uid('v'), name: 'Visiteur – entrée', mode: 'visitor', pos: [3.6, 1.65, 4.2], yaw: -0.05, pitch: -0.05 },
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
  { id: 'tradex', label: 'WHX Dubai 2027 – Luxamed / Spengler (6,95 × 2,95 m)', make: () => tradexProject() },
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
