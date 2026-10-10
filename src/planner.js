// Logique « configurateur » (comme un concepteur de cuisine) : étapes guidées, ambiances, tailles standard, budget.
import * as THREE from 'three';
import { TYPES } from './objects.js';

export const STEPS = [
  { id: 'stand', label: 'Stand', left: 'stand', tip: 'Indiquez les dimensions au sol, la hauteur maximale autorisée par le salon et les côtés ouverts sur l’allée. Pour repartir de zéro : Projets → Nouveau stand (modèles 3×3, 6×3, 8×3…).' },
  { id: 'style', label: 'Style', left: 'style', tip: 'Choisissez une ambiance : elle applique d’un coup les finitions des cloisons, du mobilier, des assises et du sol. Vous pourrez ensuite ajuster objet par objet.' },
  { id: 'structure', label: 'Structure', left: 'add', cats: ['Structure'], tip: 'Cliquez une cloison, une réserve, un caisson ou une bannière, puis cliquez dans le stand pour la poser. Elle s’aimante aux bords fermés du stand et aux autres cloisons.' },
  { id: 'mobilier', label: 'Mobilier', left: 'add', cats: ['Mobilier', 'PLV & écrans', 'Éclairage', 'Décor', 'Personnages', 'Mes éléments'], tip: 'Comptoirs, tables hautes, socles, écrans… Approchez-les d’une cloison : ils s’y collent dos au mur et s’alignent bord à bord avec leurs voisins. Les cotes s’affichent en vert pendant le déplacement.' },
  { id: 'produits', label: 'Produits', left: 'add', cats: ['Catalogue Spengler Medical', 'Produits Spengler', 'Gabarits produits'], tip: 'Catalogue Spengler Medical en 3D (tensiomètres, stéthoscopes, garrot Easy Pump® Dual DDM, couverture chauffante ECM…) : cliquez un produit puis posez-le sur un socle, un comptoir ou une table, il se place automatiquement sur le dessus. « + Nouveau produit » pour créer un produit à partir d’une photo ou d’un modèle 3D.' },
  { id: 'visuels', label: 'Visuels', left: 'visuals', tip: 'Glissez vos visuels sur les cloisons, comptoirs, caissons et bannières. La résolution est contrôlée (100 dpi minimum à taille réelle).' },
  { id: 'verifier', label: 'Vérifier', right: 'alerts', mode: 'visitor', tip: 'Parcourez le stand à hauteur d’yeux (ZQSD ou flèches, glisser pour regarder) et corrigez les alertes : collisions, dépassements, visuels trop légers.' },
  { id: 'budget', label: 'Budget & export', right: 'budget', mode: 'orbit', tip: 'Consultez l’estimation budgétaire, puis exportez les images 4K, le plan coté et la liste des éléments pour le standiste (menu Exporter).' },
];

/** Ambiances : finitions appliquées en bloc */
export const STYLES = [
  { id: 'spengler', label: 'Spengler', desc: 'Blanc laqué, gris-bleu, moquette bleue', walls: 'blanc_laque', furniture: 'blanc_laque', seat: 'blanc_laque', legs: 'blanc_laque', floor: { type: 'moquette', color: '#5b98b2' } },
  { id: 'nature', label: 'Nature', desc: 'Bois chêne, blanc mat, parquet', walls: 'blanc_mat', furniture: 'bois_chene', seat: 'textile', legs: 'noir_mat', floor: { type: 'parquet' } },
  { id: 'premium', label: 'Premium', desc: 'Anthracite, noyer, moquette sombre', walls: 'anthracite', furniture: 'bois_noyer', seat: 'noir_mat', legs: 'metal_brosse', floor: { type: 'moquette', color: '#34373c' } },
  { id: 'clinique', label: 'Clinique', desc: 'Tout blanc, sol PVC clair', walls: 'blanc_laque', furniture: 'blanc_mat', seat: 'gris_clair', legs: 'chrome', floor: { type: 'pvc', color: '#e3e8ea' } },
  { id: 'sauge', label: 'Sauge', desc: 'Gris-bleu Spengler et blanc, moquette grise', walls: 'gris_sauge', furniture: 'blanc_laque', seat: 'gris_sauge', legs: 'metal_brosse', floor: { type: 'moquette', color: '#8f989e' } },
];
export const STYLE_GROUPS = {
  walls: ['wall', 'curvedWall', 'storage', 'banner', 'lightbox'],
  furniture: ['counter', 'plinth', 'tableHaute', 'mangeDebout', 'lowTable', 'display', 'shelf', 'niche', 'podium', 'steps'],
  seat: ['stool', 'chair', 'sofa', 'barChair'],
};

/** Tailles standard proposées en un clic (en mètres) */
export const SIZE_PRESETS = {
  wall: { w: [1, 2, 3, 4, 5], h: [2.5, 3, 4] },
  curvedWall: { radius: [1, 1.5, 2, 3] },
  lightbox: { w: [1, 2, 3], h: [2, 2.5, 3] },
  banner: { w: [3, 4, 6, 8], h: [1, 1.4, 2] },
  storage: { w: [1, 1.5, 2, 3], d: [1, 1.5, 2] },
  podium: { w: [1, 2, 3], d: [1, 2, 3] },
  counter: { w: [1, 1.2, 1.5, 2], h: [0.9, 1.05] },
  plinth: { w: [0.3, 0.4, 0.5, 0.6], h: [0.8, 0.9, 1, 1.1] },
  tableHaute: { w: [0.6, 0.8, 1], d: [0.6, 0.8, 1.2] },
  lowTable: { w: [0.6, 0.8, 1.2] },
  display: { w: [0.6, 0.8, 1.2], h: [1.5, 1.8, 2] },
  rollup: { w: [0.85, 1, 1.2] },
  kakemono: { h: [1.6, 1.8, 2, 2.2] },
  tv: { inches: [43, 55, 65, 75, 86] },
  shelf: { w: [0.6, 1, 1.5] },
};

/** Tarifs indicatifs de location salon (€ HT), modifiables dans l’outil */
export const DEFAULT_PRICES = {
  wall: { label: 'Cloison', unit: 'm²', price: 45, group: 'Structure' },
  curvedWall: { label: 'Cloison courbe', unit: 'm²', price: 75, group: 'Structure' },
  lightbox: { label: 'Caisson lumineux', unit: 'm²', price: 220, group: 'Structure' },
  banner: { label: 'Bannière suspendue', unit: 'm²', price: 120, group: 'Structure' },
  truss: { label: 'Structure truss', unit: 'ml', price: 45, group: 'Structure' },
  storage: { label: 'Réserve avec porte', unit: 'u', price: 380, group: 'Structure' },
  podium: { label: 'Estrade', unit: 'm²', price: 35, group: 'Structure' },
  steps: { label: 'Marches', unit: 'u', price: 120, group: 'Structure' },
  shelf: { label: 'Étagère murale', unit: 'u', price: 40, group: 'Structure' },
  niche: { label: 'Niche murale', unit: 'u', price: 90, group: 'Structure' },
  counter: { label: "Comptoir d'accueil", unit: 'u', price: 320, group: 'Mobilier' },
  tableHaute: { label: 'Table haute', unit: 'u', price: 110, group: 'Mobilier' },
  mangeDebout: { label: 'Mange-debout', unit: 'u', price: 70, group: 'Mobilier' },
  stool: { label: 'Tabouret haut', unit: 'u', price: 35, group: 'Mobilier' },
  chair: { label: 'Chaise', unit: 'u', price: 30, group: 'Mobilier' },
  barChair: { label: 'Chaise haute', unit: 'u', price: 45, group: 'Mobilier' },
  lowTable: { label: 'Table basse', unit: 'u', price: 60, group: 'Mobilier' },
  sofa: { label: 'Fauteuil / canapé', unit: 'u', price: 220, group: 'Mobilier' },
  coatRack: { label: 'Portemanteau', unit: 'u', price: 25, group: 'Mobilier' },
  bin: { label: 'Poubelle', unit: 'u', price: 15, group: 'Mobilier' },
  plinth: { label: 'Socle / podium produit', unit: 'u', price: 90, group: 'PLV & écrans' },
  display: { label: 'Présentoir', unit: 'u', price: 180, group: 'PLV & écrans' },
  brochure: { label: 'Porte-catalogues', unit: 'u', price: 45, group: 'PLV & écrans' },
  rollup: { label: 'Roll-up', unit: 'u', price: 120, group: 'PLV & écrans' },
  kakemono: { label: 'Kakémono (structure)', unit: 'u', price: 70, group: 'PLV & écrans' },
  tv: { label: 'Écran TV', unit: 'u', price: 290, group: 'PLV & écrans' },
  spot: { label: 'Spot', unit: 'u', price: 40, group: 'Éclairage' },
  led: { label: 'Bande LED', unit: 'ml', price: 30, group: 'Éclairage' },
  plant: { label: 'Plante', unit: 'u', price: 60, group: 'Décor' },
  print: { label: 'Impression des visuels', unit: 'm²', price: 35, group: 'Impression' },
  floor_moquette: { label: 'Sol – moquette', unit: 'm²', price: 14, group: 'Sol' },
  floor_parquet: { label: 'Sol – parquet', unit: 'm²', price: 38, group: 'Sol' },
  floor_pvc: { label: 'Sol – PVC', unit: 'm²', price: 22, group: 'Sol' },
  floor_couleur: { label: 'Sol – couleur unie', unit: 'm²', price: 14, group: 'Sol' },
  floor_texture: { label: 'Sol – imprimé', unit: 'm²', price: 30, group: 'Sol' },
};

export function prices(settings) {
  const out = {};
  for (const [k, v] of Object.entries(DEFAULT_PRICES)) out[k] = { ...v, price: settings.prices?.[k] ?? v.price };
  return out;
}

/** Estimation budgétaire du stand (lignes regroupées + total HT) */
export function budget(app) {
  const P = prices(app.settings);
  const q = {};
  const add = (k, n) => {
    if (!P[k] || !n) return;
    q[k] = (q[k] || 0) + n;
  };
  let printArea = 0;
  for (const o of app.project.objects) {
    if (!app.isVisible(o)) continue;
    const t = o.type;
    if (t === 'wall' || t === 'lightbox' || t === 'banner') add(t, o.w * o.h);
    else if (t === 'curvedWall') add(t, (Math.PI * o.radius * o.angle) / 180 * o.h);
    else if (t === 'podium') add(t, o.w * o.d);
    else if (t === 'truss') add('truss', o.w);
    else if (t === 'led') add('led', Math.max(o.w, o.h));
    else if (DEFAULT_PRICES[t]) add(t, 1);
    if (t === 'banner' && o.truss) {
      add('truss', o.w);
      add('spot', (o.spots || 0) * (o.imageBack ? 2 : 1));
    }
    // surface de visuels imprimés
    if (t !== 'tv') {
      app.cache.get(o.id)?.group.traverse((m) => {
        if (!m.userData.imageKey || !m.geometry || !o[m.userData.imageKey]) return;
        if (app.assetKind?.(o[m.userData.imageKey]) === 'video') return;
        m.geometry.computeBoundingBox();
        const s = m.geometry.boundingBox.getSize(new THREE.Vector3());
        printArea += Math.max(s.x, s.z) * s.y * (t === 'brochure' ? 0 : 1);
      });
    }
    if (t === 'visual' || t === 'text') {
      const b = app.cache.get(o.id)?.group.userData.box;
      if (b && t === 'text') printArea += (b.max.x - b.min.x) * (b.max.y - b.min.y);
    }
  }
  add('print', printArea);
  const st = app.project.stand;
  add('floor_' + st.floor.type, st.w * st.d);
  const lines = Object.entries(q).map(([k, n]) => ({ key: k, ...P[k], qty: n, total: n * P[k].price }));
  const order = ['Structure', 'Mobilier', 'PLV & écrans', 'Éclairage', 'Décor', 'Impression', 'Sol'];
  lines.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || b.total - a.total);
  const total = lines.reduce((s, l) => s + l.total, 0);
  return { lines, total, area: st.w * st.d };
}

export const fmtEUR = (v) => Math.round(v).toLocaleString('fr-FR') + ' €';
export const fmtQty = (n, unit) => (unit === 'u' ? String(Math.round(n)) : n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })) + ' ' + unit;

// mémorisation pour l'affichage des types
export { TYPES };
