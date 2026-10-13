// Catalogue (mobilier, structure, PLV, produits) et construction des objets 3D.
// Convention : origine d'un objet = centre de son emprise au sol, face avant vers +Z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getMaterial, emissiveMaterial } from './materials.js';
import * as assets from './assets.js';
import { kelvinToColor, rad, rng } from './util.js';
import { DEVICE_CATALOG, buildDevice } from './devices.js';
import { PEOPLE_CATALOG, buildPerson, SKINS } from './people.js';

export const BRANDS = ['Spengler', 'ECM', 'Maison de Boissy', 'Luxamed', 'Holtex', 'DDM'];
export const CATEGORIES = ['Catalogue Spengler Medical', 'Structure', 'Mobilier', 'PLV & écrans', 'Éclairage', 'Décor', 'Personnages', 'Gabarits produits'];

const G = { gMargin: 0, gRadius: 0 };
export const CATALOG = [
  { type: 'wall', label: 'Cloison droite', cat: 'Structure', kw: 'mur paroi panneau', d: { w: 3, d: 0.1, h: 2.5, finish: 'blanc_laque', radius: 0, ...G } },
  { type: 'wall', label: 'Cloison graphique (visuel arrondi)', cat: 'Structure', kw: 'mur visuel', d: { w: 3, d: 0.1, h: 3, finish: 'blanc_laque', radius: 0, gMargin: 0.15, gRadius: 0.4 } },
  { type: 'wall', label: 'Cloison aux angles arrondis', cat: 'Structure', kw: 'mur arrondi', d: { w: 2, d: 0.1, h: 2.5, finish: 'blanc_laque', radius: 0.3, ...G } },
  { type: 'curvedWall', label: 'Cloison courbe', cat: 'Structure', kw: 'mur arc', d: { radius: 2, angle: 70, d: 0.1, h: 2.5, finish: 'blanc_laque' } },
  { type: 'lightbox', label: 'Caisson lumineux (textile rétroéclairé)', cat: 'Structure', kw: 'lightbox led textile', d: { w: 2, d: 0.12, h: 2.5, y: 0, finish: 'blanc_laque', glow: 1.2, doubleSided: false } },
  { type: 'banner', label: 'Bannière suspendue + truss', cat: 'Structure', kw: 'bandeau enseigne suspendu', d: { w: 6, d: 0.08, h: 1.4, y: 4.2, finish: 'blanc_laque', radius: 0.25, truss: true, spots: 5, gMargin: 0.08, gRadius: 0.22, kelvin: 4000, intensity: 6 } },
  { type: 'kakemono', label: 'Kakémono suspendu', cat: 'Structure', kw: 'kakemono bannière textile suspendu visuel', d: { w: 0.85, h: 2, mount: 'suspendu', y: 1.6, imageFit: 'cover' } },
  { type: 'truss', label: 'Structure truss', cat: 'Structure', kw: 'poutre alu', d: { w: 4, y: 4, finish: 'metal_brosse' } },
  { type: 'storage', label: 'Réserve fermée avec porte', cat: 'Structure', kw: 'vestiaire stockage local', d: { w: 2, d: 1, h: 2.5, finish: 'blanc_laque', doorSide: 'front', doorPos: 0.25, doorOpen: 0, ...G } },
  { type: 'podium', label: 'Estrade', cat: 'Structure', kw: 'plancher scène', d: { w: 2, d: 2, h: 0.1, finish: 'bois_chene' } },
  { type: 'steps', label: 'Marches', cat: 'Structure', kw: 'escalier', d: { w: 1, d: 0.6, h: 0.3, finish: 'gris_clair', count: 2 } },
  { type: 'shelf', label: 'Étagère murale', cat: 'Structure', kw: 'tablette', d: { w: 1, d: 0.25, h: 0.03, y: 1.3, finish: 'blanc_laque' } },
  { type: 'niche', label: 'Niche murale', cat: 'Structure', kw: 'alcôve vitrine', d: { w: 0.6, d: 0.3, h: 0.8, y: 1, finish: 'blanc_laque', led: true } },

  { type: 'counter', label: "Comptoir d'accueil", cat: 'Mobilier', kw: 'banque accueil desk', d: { w: 1.2, d: 0.6, h: 1.05, finish: 'blanc_laque', led: 'deux', doors: 'deux', doorOpen: 0, gMargin: 0.08, gRadius: 0 } },
  { type: 'tableHaute', label: 'Table haute (mange-debout)', cat: 'Mobilier', kw: 'mange debout bar', d: { w: 0.6, d: 1.2, h: 1.1, finish: 'blanc_laque' } },
  { type: 'mangeDebout', label: 'Mange-debout rond', cat: 'Mobilier', kw: 'guéridon bar', d: { w: 0.7, d: 0.7, h: 1.1, finish: 'blanc_laque' } },
  { type: 'mangeDebout', label: 'Mange-debout avec housse lycra', cat: 'Mobilier', kw: 'cocktail bar housse tissu', d: { w: 0.8, d: 0.8, h: 1.1, finish: 'textile', color: '#ffffff', housse: true } },
  { type: 'barChair', label: 'Chaise haute à dossier', cat: 'Mobilier', kw: 'chaise de bar haute dossier', d: { w: 0.44, d: 0.48, h: 1.05, seatH: 0.76, style: 'classique', finish: 'blanc_laque', legs: 'metal_brosse' } },
  { type: 'barChair', label: 'Chaise haute coque design', cat: 'Mobilier', kw: 'chaise de bar haute coque', d: { w: 0.48, d: 0.5, h: 1.0, seatH: 0.75, style: 'coque', finish: 'couleur', color: '#2f6f8f', legs: 'noir_mat' } },
  { type: 'stool', label: 'Tabouret haut', cat: 'Mobilier', kw: 'chaise bar', d: { w: 0.42, d: 0.42, h: 0.76, finish: 'blanc_laque', legs: 'metal_brosse' } },
  { type: 'chair', label: 'Chaise', cat: 'Mobilier', kw: 'siège', d: { w: 0.46, d: 0.5, h: 0.84, finish: 'blanc_mat', legs: 'metal_brosse' } },
  { type: 'lowTable', label: 'Table basse', cat: 'Mobilier', kw: 'salon', d: { w: 0.8, d: 0.8, h: 0.42, finish: 'bois_chene', legs: 'noir_mat' } },
  { type: 'sofa', label: 'Fauteuil / canapé', cat: 'Mobilier', kw: 'salon lounge', d: { w: 1.4, d: 0.8, h: 0.8, finish: 'textile', color: '#6f8794', legs: 'noir_mat' } },
  { type: 'coatRack', label: 'Portemanteau', cat: 'Mobilier', kw: 'vestiaire', d: { w: 0.45, d: 0.45, h: 1.8, finish: 'metal_brosse' } },
  { type: 'bin', label: 'Poubelle', cat: 'Mobilier', kw: 'corbeille', d: { w: 0.3, d: 0.3, h: 0.6, finish: 'blanc_mat' } },

  { type: 'plinth', label: 'Socle / podium produit', cat: 'PLV & écrans', kw: 'colonne présentoir cube', d: { w: 0.4, d: 0.4, h: 1, finish: 'blanc_laque', led: 'aucune', gMargin: 0.04, gRadius: 0 } },
  { type: 'vitrine', label: 'Vitrine haute en verre (étagères)', cat: 'PLV & écrans', kw: 'showcase vitrine verre colonne', d: { w: 0.5, d: 0.5, h: 2, shelves: 4, finish: 'blanc_laque' } },
  { type: 'vitrineBasse', label: 'Vitrine basse fermant à clé (dessus verre)', cat: 'PLV & écrans', kw: 'showcase vitrine comptoir verre lockable', d: { w: 0.8, d: 0.5, h: 1.05, finish: 'blanc_laque', gMargin: 0.08 } },
  { type: 'display', label: 'Présentoir à étagères', cat: 'PLV & écrans', kw: 'vitrine étagère', d: { w: 0.8, d: 0.35, h: 1.8, finish: 'blanc_laque', shelves: 3 } },
  { type: 'brochure', label: 'Porte-catalogues', cat: 'PLV & écrans', kw: 'brochure flyers documentation', d: { w: 0.3, d: 0.35, h: 1.5, finish: 'plexi_depoli' } },
  { type: 'tribeca', label: 'Totem carton Tribeca (4 modules, 50 × 185 cm)', cat: 'PLV & écrans', kw: 'totem carton tribeca pixartprinting colonne cubes présentoir visuel', d: { w: 0.5, d: 0.58, h: 1.85, imageFit: 'cover' } },
  { type: 'kakemono', label: 'Kakémono enrouleur (roll-up)', cat: 'PLV & écrans', kw: 'kakemono rollup roll-up enrouleur visuel bannière', d: { w: 0.85, h: 2, mount: 'enrouleur', imageFit: 'cover' } },
  { type: 'kakemono', label: 'Kakémono sur pied en X', cat: 'PLV & écrans', kw: 'kakemono x-banner pied visuel', d: { w: 0.8, h: 1.8, mount: 'x', imageFit: 'cover' } },
  { type: 'kakemono', label: 'Kakémono sur pied', cat: 'Structure', kw: 'kakemono rollup visuel', d: { w: 1, h: 2, mount: 'enrouleur', imageFit: 'cover' } },
  { type: 'rollup', label: 'Roll-up', cat: 'PLV & écrans', kw: 'kakemono enrouleur', d: { w: 0.85, d: 0.25, h: 2, finish: 'metal_brosse' } },
  { type: 'tv', label: 'Écran TV sur pied', cat: 'PLV & écrans', kw: 'moniteur vidéo', d: { inches: 55, mount: 'pied', screenY: 1.1, finish: 'noir_mat' } },
  { type: 'tv', label: 'Écran TV mural', cat: 'PLV & écrans', kw: 'moniteur vidéo', d: { inches: 55, mount: 'mural', y: 1.4, finish: 'noir_mat' } },
  { type: 'visual', label: 'Visuel / logo adhésif', cat: 'PLV & écrans', kw: 'image sticker logo', d: { w: 1, h: 0.5, y: 1.5 } },
  { type: 'text', label: 'Texte / lettrage', cat: 'PLV & écrans', kw: 'enseigne lettres', d: { text: 'Spengler', font: 'Helvetica Neue', color: '#2f5f73', h: 0.25, y: 2, bold: true } },

  { type: 'spot', label: 'Spot orientable', cat: 'Éclairage', kw: 'projecteur lumière rail', d: { y: 3.9, intensity: 12, kelvin: 4000, angle: 40, tilt: 30, finish: 'blanc_laque' } },
  { type: 'led', label: 'Bande LED', cat: 'Éclairage', kw: 'lumière néon', d: { w: 0.02, d: 0.02, h: 1, kelvin: 5000, intensity: 4 } },

  ...PEOPLE_CATALOG.map((p) => ({ type: 'person', label: p.label, cat: 'Personnages', kw: 'personnage personne humain silhouette visiteur', d: { ...p.d } })),
  { type: 'plant', label: 'Plante', cat: 'Décor', kw: 'végétal', d: { w: 0.5, d: 0.5, h: 1.4, finish: 'blanc_mat' } },

  { type: 'product', label: 'Boîte produit (pack-shot)', cat: 'Gabarits produits', kw: 'packshot carton', d: { w: 0.3, d: 0.2, h: 0.25, shape: 'boite', finish: 'blanc_mat', brand: 'Spengler' } },
  { type: 'product', label: 'Produit détouré (photo)', cat: 'Gabarits produits', kw: 'silhouette photo', d: { w: 0.4, d: 0.3, h: 0.5, shape: 'silhouette', brand: 'Spengler' } },
  { type: 'product', label: 'Appareil de table', cat: 'Gabarits produits', kw: 'device', d: { w: 0.3, d: 0.25, h: 0.12, shape: 'appareil', finish: 'blanc_laque', brand: 'Spengler' } },
  { type: 'product', label: "Lampe d'examen sur pied", cat: 'Gabarits produits', kw: 'luxamed éclairage', d: { w: 0.6, d: 0.6, h: 1.7, shape: 'lampe', finish: 'blanc_laque', brand: 'Luxamed' } },
  { type: 'product', label: 'Produit cylindrique', cat: 'Gabarits produits', kw: 'flacon tube', d: { w: 0.12, d: 0.12, h: 0.3, shape: 'cylindre', finish: 'blanc_mat', brand: 'Spengler' } },
  ...DEVICE_CATALOG.map((p) => ({
    type: 'device',
    label: p.label,
    cat: 'Catalogue Spengler Medical',
    gamme: p.gamme,
    kw: [p.brand, p.gamme, p.ref].filter(Boolean).join(' '),
    d: { model: p.model, color: p.color, brand: p.brand, gamme: p.gamme, ref: p.ref || '', ...(p.params || {}) },
  })),
];

/** Description des types : champs éditables et comportements */
/** Totem Tribeca : 4 modules triangulaires (1 = bas … 4 = haut) × 3 faces imprimables */
const TRIBECA_FACES = { a: ['face avant', 'face arrière gauche', 'face arrière droite'], b: ['face avant gauche', 'face avant droite', 'face arrière'] };
const TRIBECA_KEYS = [4, 3, 2, 1].flatMap((m) => ['a', 'b', 'c'].map((f) => `imageT${m}${f}`));
const tribecaLabel = (k) => {
  const m = +k[6];
  const f = 'abc'.indexOf(k[7]);
  return `Module ${m}${m === 4 ? ' (haut)' : m === 1 ? ' (bas)' : ''} – ${TRIBECA_FACES[m % 2 ? 'a' : 'b'][f]}`;
};

export const TYPES = {
  wall: { label: 'Cloison', fields: ['w', 'h', 'd', 'radius', 'finish', 'color'], images: ['image', 'imageBack'], graphic: true },
  curvedWall: { label: 'Cloison courbe', fields: ['radius', 'angle', 'h', 'd', 'finish', 'color'], images: ['image'] },
  lightbox: { label: 'Caisson lumineux', fields: ['w', 'h', 'd', 'y', 'glow', 'doubleSided', 'finish', 'color'], images: ['image', 'imageBack'] },
  banner: { label: 'Bannière', fields: ['w', 'h', 'd', 'y', 'radius', 'truss', 'spots', 'kelvin', 'intensity', 'finish', 'color'], images: ['image', 'imageBack'], graphic: true, hanging: true },
  truss: { label: 'Truss', fields: ['w', 'y', 'finish'], hanging: true },
  storage: { label: 'Réserve', fields: ['w', 'd', 'h', 'doorSide', 'doorPos', 'doorOpen', 'finish', 'color'], doors: true, images: ['image'], graphic: true, hollow: true },
  podium: { label: 'Estrade', fields: ['w', 'd', 'h', 'finish', 'color'], support: true },
  steps: { label: 'Marches', fields: ['w', 'd', 'h', 'count', 'finish', 'color'] },
  shelf: { label: 'Étagère', fields: ['w', 'd', 'h', 'y', 'finish', 'color'], mounted: true, support: true },
  niche: { label: 'Niche', fields: ['w', 'd', 'h', 'y', 'led', 'finish', 'color'], mounted: true, support: true },
  counter: { label: 'Comptoir', fields: ['w', 'd', 'h', 'doors', 'doorOpen', 'led', 'finish', 'color', 'top'], doors: true, images: ['image'], graphic: true, support: true },
  tableHaute: { label: 'Table haute', fields: ['w', 'd', 'h', 'finish', 'color'], support: true },
  mangeDebout: { label: 'Mange-debout', fields: ['w', 'h', 'housse', 'finish', 'color'], support: true },
  barChair: { label: 'Chaise haute', fields: ['style', 'seatH', 'w', 'd', 'h', 'finish', 'color', 'legs'] },
  person: { label: 'Personnage', fields: ['pose', 'sexe', 'tenue', 'color', 'skin', 'badge', 'h'], decor: true },
  stool: { label: 'Tabouret', fields: ['w', 'd', 'h', 'finish', 'color', 'legs'] },
  chair: { label: 'Chaise', fields: ['w', 'd', 'h', 'finish', 'color', 'legs'] },
  lowTable: { label: 'Table basse', fields: ['w', 'd', 'h', 'finish', 'color', 'legs'], support: true },
  sofa: { label: 'Fauteuil', fields: ['w', 'd', 'h', 'finish', 'color', 'legs'] },
  coatRack: { label: 'Portemanteau', fields: ['h', 'finish'] },
  bin: { label: 'Poubelle', fields: ['w', 'h', 'finish', 'color'] },
  plinth: { label: 'Socle', fields: ['w', 'd', 'h', 'led', 'finish', 'color'], images: ['image'], graphic: true, support: true },
  vitrine: { label: 'Vitrine haute', fields: ['w', 'd', 'h', 'shelves', 'finish', 'color'], support: true },
  vitrineBasse: { label: 'Vitrine basse', fields: ['w', 'd', 'h', 'finish', 'color'], images: ['image'], support: true },
  display: { label: 'Présentoir', fields: ['w', 'd', 'h', 'y', 'shelves', 'finish', 'color'], images: ['image'], support: true },
  brochure: { label: 'Porte-catalogues', fields: ['w', 'd', 'h', 'finish'], images: ['image'] },
  tribeca: { label: 'Totem Tribeca', fields: [], images: TRIBECA_KEYS },
  kakemono: { label: 'Kakémono', fields: ['kformat', 'w', 'h', 'mount', 'y'], images: ['image', 'imageBack'] },
  rollup: { label: 'Roll-up', fields: ['w', 'h', 'finish'], images: ['image'] },
  tv: { label: 'Écran', fields: ['inches', 'mount', 'screenY', 'y', 'finish'], images: ['image'] },
  visual: { label: 'Visuel', fields: ['w', 'h', 'y'], images: ['image'], mounted: true },
  text: { label: 'Texte', fields: ['text', 'font', 'bold', 'color', 'h', 'y'], mounted: true },
  spot: { label: 'Spot', fields: ['y', 'intensity', 'kelvin', 'angle', 'tilt', 'finish'], mounted: true, light: true },
  led: { label: 'Bande LED', fields: ['w', 'h', 'd', 'y', 'kelvin', 'intensity'], mounted: true },
  plant: { label: 'Plante', fields: ['w', 'h', 'finish', 'color'], stack: true },
  product: { label: 'Produit', fields: ['shape', 'w', 'd', 'h', 'y', 'finish', 'color', 'brand', 'gamme', 'ref'], images: ['image', 'imageSide'], stack: true },
  device: { label: 'Produit Spengler Medical', fields: ['color', 'brand', 'gamme', 'ref'], stack: true },
  model: { label: 'Modèle 3D importé', fields: ['w', 'd', 'h', 'y', 'brand', 'gamme', 'ref'], stack: true },
};

export const FIELD = {
  w: { label: 'Largeur', kind: 'len', min: 0.01 },
  d: { label: 'Profondeur / épaisseur', kind: 'len', min: 0.005 },
  h: { label: 'Hauteur', kind: 'len', min: 0.005 },
  y: { label: 'Élévation (du sol)', kind: 'len', min: -1 },
  radius: { label: 'Rayon', kind: 'len', min: 0 },
  angle: { label: 'Angle d’arc (°)', kind: 'num', min: 5, max: 360, step: 5 },
  glow: { label: 'Luminosité', kind: 'range', min: 0, max: 4, step: 0.1 },
  doubleSided: { label: 'Visuel recto-verso', kind: 'bool' },
  truss: { label: 'Structure truss', kind: 'bool' },
  spots: { label: 'Spots sur truss', kind: 'num', min: 0, max: 12, step: 1 },
  kelvin: { label: 'Température (K)', kind: 'range', min: 2700, max: 6500, step: 100 },
  intensity: { label: 'Intensité', kind: 'range', min: 0, max: 60, step: 0.5 },
  attached: { label: 'Fixé sur une cloison (ignorer collisions)', kind: 'bool' },
  tilt: { label: 'Inclinaison (°)', kind: 'range', min: 0, max: 90, step: 5 },
  doorSide: { label: 'Porte', kind: 'select', options: { front: 'Face avant', left: 'Côté gauche', right: 'Côté droit', back: 'Arrière', none: 'Sans porte' } },
  doorPos: { label: 'Position de la porte', kind: 'range', min: 0, max: 1, step: 0.05 },
  housse: { label: 'Housse lycra', kind: 'bool' },
  doors: { label: 'Rangement (côté exposant)', kind: 'select', options: { aucune: 'Plein, sans portes', une: '1 porte', deux: '2 portes' } },
  doorOpen: { label: 'Ouverture des portes (°)', kind: 'range', min: 0, max: 110, step: 5 },
  kformat: { label: 'Format', kind: 'kformat', options: { '0.6x1.6': '60 × 160 cm', '0.8x2': '80 × 200 cm', '0.85x2': '85 × 200 cm', '1x2': '100 × 200 cm', '1.2x2': '120 × 200 cm', '1.5x2': '150 × 200 cm', libre: 'Sur mesure (largeur et hauteur ci-dessous)' } },
  style: { label: 'Modèle', kind: 'select', options: { classique: 'À dossier', coque: 'Coque design' } },
  seatH: { label: 'Hauteur d’assise', kind: 'len', min: 0.4 },
  pose: { label: 'Posture', kind: 'select', options: { debout: 'Debout', marche: 'Qui marche', discussion: 'En discussion', assis: 'Assis (chaise)', assisHaut: 'Assis (chaise haute)' } },
  sexe: { label: 'Silhouette', kind: 'select', options: { homme: 'Homme', femme: 'Femme' } },
  tenue: { label: 'Tenue', kind: 'select', options: { costume: 'Costume / tailleur', decontracte: 'Décontractée', blouse: 'Blouse médicale', soin: 'Tenue de soin' } },
  skin: { label: 'Carnation', kind: 'select', options: { clair: 'Claire', moyen: 'Moyenne', mat: 'Mate', fonce: 'Foncée' } },
  badge: { label: 'Badge salon', kind: 'bool' },
  count: { label: 'Nombre de marches', kind: 'num', min: 1, max: 6, step: 1 },
  led: { label: 'Bande LED', kind: 'select', options: { aucune: 'Aucune', gauche: 'Angle gauche', droite: 'Angle droit', deux: 'Deux angles' } },
  shelves: { label: 'Étagères', kind: 'num', min: 1, max: 6, step: 1 },
  inches: { label: 'Diagonale (pouces)', kind: 'num', min: 24, max: 98, step: 1 },
  mount: { label: 'Fixation', kind: 'select', options: { pied: 'Sur pied', mural: 'Murale', enrouleur: 'Enrouleur (roll-up)', x: 'Pied en X', suspendu: 'Suspendu (câbles)' } },
  screenY: { label: 'Bas de l’écran', kind: 'len', min: 0.3 },
  text: { label: 'Texte', kind: 'text' },
  font: { label: 'Police', kind: 'font' },
  bold: { label: 'Gras', kind: 'bool' },
  color: { label: 'Couleur', kind: 'color' },
  finish: { label: 'Finition', kind: 'finish' },
  top: { label: 'Finition plateau', kind: 'finish' },
  legs: { label: 'Finition piètement', kind: 'finish' },
  shape: { label: 'Forme', kind: 'select', options: { boite: 'Boîte + pack-shot', silhouette: 'Photo détourée', appareil: 'Appareil (arrondi)', cylindre: 'Cylindre', lampe: "Lampe d'examen" } },
  brand: { label: 'Marque', kind: 'brand' },
  gamme: { label: 'Gamme', kind: 'text' },
  ref: { label: 'Référence', kind: 'text' },
};
// le champ "angle" d'un spot = ouverture du faisceau
export const SPOT_ANGLE = { label: 'Ouverture faisceau (°)', kind: 'range', min: 10, max: 90, step: 5 };

export const IMAGE_LABELS = { image: 'Visuel face avant', imageBack: 'Visuel face arrière', imageSide: 'Photo de côté', ...Object.fromEntries(TRIBECA_KEYS.map((k) => [k, tribecaLabel(k)])) };
/** Toutes les clés de visuels possibles (pour les fichiers liés à un projet) */
export const ALL_IMAGE_KEYS = ['image', 'imageBack', 'imageSide', ...TRIBECA_KEYS];

/* ---------- utilitaires géométriques ---------- */

function rrShape(w, h, r, cy = 0) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = cy;
  r = Math.max(0, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4));
  if (r < 0.002) {
    s.moveTo(x, y);
    s.lineTo(x + w, y);
    s.lineTo(x + w, y + h);
    s.lineTo(x, y + h);
    s.lineTo(x, y);
    return s;
  }
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Panneau (largeur w, hauteur h, épaisseur d) posé sur y=0, centré en x et z */
function panelGeo(w, h, d, r = 0) {
  if (r > 0.002) {
    const g = new THREE.ExtrudeGeometry(rrShape(w, h, r), { depth: d, bevelEnabled: false, curveSegments: 14 });
    g.translate(0, 0, -d / 2);
    return g;
  }
  return new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
}

/** Plan centré (UV normalisés) avec coins arrondis facultatifs */
function planeGeo(w, h, r = 0) {
  if (r > 0.002) {
    const g = new THREE.ShapeGeometry(rrShape(w, h, r, -h / 2), 16);
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
    return g;
  }
  return new THREE.PlaneGeometry(w, h);
}

const boxAt = (w, h, d, x, y, z, mat) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
};
const cyl = (rt, rb, h, x, y, z, mat, seg = 24) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  return m;
};

/** Texture adaptée à une face (remplissage, zoom, décalage) + résolution effective */
export function fitTexture(id, fw, fh, o, key) {
  const base = assets.texture(id);
  const info = assets.imageInfo(id);
  if (!base || !info) return null;
  const t = base.clone();
  t.needsUpdate = true;
  const fit = o[key + 'Fit'] || 'cover';
  const zoom = o[key + 'Zoom'] || 1;
  const ox = o[key + 'Ox'] || 0;
  const oy = o[key + 'Oy'] || 0;
  let rx = 1;
  let ry = 1;
  const fa = fw / fh;
  const ia = info.w / info.h;
  if (fit === 'cover') {
    if (ia > fa) rx = fa / ia;
    else ry = ia / fa;
  } else if (fit === 'contain') {
    if (ia > fa) ry = ia / fa;
    else rx = fa / ia;
  }
  rx /= zoom;
  ry /= zoom;
  t.repeat.set(rx, ry);
  t.offset.set(((1 - rx) / 2) * (1 + ox), ((1 - ry) / 2) * (1 + oy));
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const dpi = info.video || info.demo ? null : Math.round((info.w * Math.min(1, rx)) / ((fw * Math.min(1, 1 / rx)) / 0.0254));
  return { tex: t, dpi, alpha: info.alpha };
}

function graphicMat(o, key, fw, fh, ud, glow = 0) {
  const id = o[key];
  if (!id) return null;
  const f = fitTexture(id, fw, fh, o, key);
  if (!f) return null;
  if (f.dpi != null) ud.dpi[key] = f.dpi;
  const m = new THREE.MeshStandardMaterial({ map: f.tex, roughness: 0.62 });
  if (f.alpha) Object.assign(m, { transparent: true, alphaTest: 0.02 });
  if (glow) {
    m.emissive.set('#ffffff');
    m.emissiveMap = f.tex;
    m.emissiveIntensity = glow;
    m.roughness = 0.9;
  }
  if (assets.imageInfo(id)?.video) {
    m.emissive.set('#ffffff');
    m.emissiveMap = f.tex;
    m.emissiveIntensity = 0.9;
  }
  return m;
}

/** Ajoute un visuel plan sur une face. pos/rotY en repère local. */
function addGraphic(g, o, key, w, h, r, pos, rotY, ud, glow = 0) {
  const m = graphicMat(o, key, w, h, ud, glow);
  if (!m) return null;
  const mesh = new THREE.Mesh(planeGeo(w, h, r), m);
  mesh.position.copy(pos);
  mesh.rotation.y = rotY;
  mesh.userData.imageKey = key;
  g.add(mesh);
  return mesh;
}

function makeSpot({ kelvin = 4000, intensity = 30, angle = 40, dir, finish = 'blanc_laque' }, ud) {
  const g = new THREE.Group();
  const d = dir.clone().normalize();
  const body = new THREE.Group();
  const mat = getMaterial(finish);
  const housing = cyl(0.045, 0.055, 0.16, 0, -0.08, 0, mat, 16);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), emissiveMaterial(kelvinToColor(kelvin), 3));
  lens.rotation.x = Math.PI / 2;
  lens.position.y = -0.161;
  body.add(housing, lens);
  body.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
  body.position.copy(d.clone().multiplyScalar(0.02));
  const arm = cyl(0.008, 0.008, 0.08, 0, 0.02, 0, getMaterial('metal_brosse'), 8);
  g.add(arm, body);
  const light = new THREE.SpotLight(kelvinToColor(kelvin), intensity, 0, rad(angle / 2), 0.55, 2);
  light.position.copy(d.clone().multiplyScalar(0.18));
  light.target.position.copy(d.clone().multiplyScalar(3));
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.02;
  light.userData.noPick = true;
  g.add(light, light.target);
  ud.lights.push(light);
  return g;
}

function trussGeo(len, s = 0.29) {
  const geos = [];
  const R = 0.024;
  const r = 0.008;
  const hs = s / 2 - R;
  const corners = [
    [-hs, -hs],
    [hs, -hs],
    [hs, hs],
    [-hs, hs],
  ];
  for (const [y, z] of corners) {
    const c = new THREE.CylinderGeometry(R, R, len, 10);
    c.rotateZ(Math.PI / 2);
    c.translate(0, y, z);
    geos.push(c);
  }
  const n = Math.max(1, Math.round(len / s));
  const step = len / n;
  const faces = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ];
  for (let i = 0; i < n; i++) {
    const x0 = -len / 2 + i * step;
    for (const [a, b] of faces) {
      const A = new THREE.Vector3(x0, corners[a][0], corners[a][1]);
      const B = new THREE.Vector3(x0 + step, corners[b][0], corners[b][1]);
      const L = A.distanceTo(B);
      const c = new THREE.CylinderGeometry(r, r, L, 6);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      c.applyQuaternion(q);
      const mid = A.clone().add(B).multiplyScalar(0.5);
      c.translate(mid.x, mid.y, mid.z);
      geos.push(c);
    }
  }
  return mergeGeometries(geos);
}

function ledStrips(g, o, w, h, d, y0 = 0.05) {
  const mode = o.led === true ? 'deux' : o.led;
  if (!mode || mode === 'aucune') return;
  const m = emissiveMaterial(kelvinToColor(o.ledKelvin || 5500), 4);
  const hh = h - y0 * 2;
  const s = [];
  if (mode === 'gauche' || mode === 'deux') s.push(-1);
  if (mode === 'droite' || mode === 'deux') s.push(1);
  for (const k of s) {
    const bar = boxAt(0.014, hh, 0.014, k * (w / 2 - 0.008), y0 + hh / 2, d / 2 - 0.008, m);
    bar.userData.emissive = true;
    g.add(bar);
  }
}

function textCanvas(o) {
  const fontPx = 200;
  const family = o.font || 'Helvetica Neue';
  const font = `${o.bold ? '700' : '400'} ${fontPx}px "${family}", Helvetica, Arial, sans-serif`;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = font;
  const lines = String(o.text || ' ').split('\n');
  const w = Math.max(...lines.map((l) => g.measureText(l).width), 10);
  c.width = Math.ceil(w + 40);
  c.height = Math.ceil(fontPx * 1.25 * lines.length + 20);
  g.font = font;
  g.fillStyle = o.color || '#222';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  lines.forEach((l, i) => g.fillText(l, c.width / 2, 10 + fontPx * 1.25 * (i + 0.5)));
  return c;
}

/* ---------- constructeurs ---------- */
const B = {};

B.wall = (o, ud) => {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish, o.color);
  g.add(new THREE.Mesh(panelGeo(o.w, o.h, o.d, o.radius || 0), mat));
  const m = o.gMargin || 0;
  const gw = Math.max(0.05, o.w - 2 * m);
  const gh = Math.max(0.05, o.h - 2 * m);
  addGraphic(g, o, 'image', gw, gh, o.gRadius || 0, new THREE.Vector3(0, o.h / 2, o.d / 2 + 0.002), 0, ud);
  addGraphic(g, o, 'imageBack', gw, gh, o.gRadius || 0, new THREE.Vector3(0, o.h / 2, -o.d / 2 - 0.002), Math.PI, ud);
  return g;
};

B.curvedWall = (o, ud) => {
  const g = new THREE.Group();
  const R = Math.max(0.2, o.radius);
  const a = rad(Math.min(359, o.angle));
  const t = Math.min(o.d, R * 0.9);
  const c = R * Math.cos(a / 2);
  const s = new THREE.Shape();
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const th = -a / 2 + (a * i) / N;
    const x = R * Math.sin(th);
    const z = R * Math.cos(th) - c;
    i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z);
  }
  for (let i = N; i >= 0; i--) {
    const th = -a / 2 + (a * i) / N;
    s.lineTo((R - t) * Math.sin(th), -((R - t) * Math.cos(th) - c));
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: o.h, bevelEnabled: false, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  g.add(new THREE.Mesh(geo, getMaterial(o.finish, o.color)));
  const arcLen = R * a;
  const m = graphicMat(o, 'image', arcLen, o.h, ud);
  if (m) {
    const gg = new THREE.CylinderGeometry(R + 0.002, R + 0.002, o.h, 64, 1, true, -a / 2, a);
    const mesh = new THREE.Mesh(gg, m);
    mesh.position.set(0, o.h / 2, -c);
    mesh.userData.imageKey = 'image';
    g.add(mesh);
  }
  return g;
};

B.lightbox = (o, ud) => {
  const g = new THREE.Group();
  const frame = getMaterial(o.finish, o.color);
  const fw = 0.025;
  g.add(new THREE.Mesh(panelGeo(o.w, o.h, o.d, 0), frame));
  const glow = o.glow ?? 1.2;
  const face = (key, side) => {
    const z = side * (o.d / 2 + 0.002);
    const mesh = addGraphic(g, o, key, o.w - 2 * fw, o.h - 2 * fw, 0, new THREE.Vector3(0, o.h / 2, z), side > 0 ? 0 : Math.PI, ud, glow);
    if (!mesh) {
      const blank = new THREE.Mesh(new THREE.PlaneGeometry(o.w - 2 * fw, o.h - 2 * fw), emissiveMaterial('#ffffff', glow * 0.8));
      blank.position.set(0, o.h / 2, z);
      blank.rotation.y = side > 0 ? 0 : Math.PI;
      blank.userData.imageKey = key;
      g.add(blank);
    } else mesh.userData.emissive = true;
  };
  face('image', 1);
  if (o.doubleSided) face('imageBack', -1);
  return g;
};

B.banner = (o, ud) => {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish, o.color);
  g.add(new THREE.Mesh(panelGeo(o.w, o.h, o.d, o.radius || 0), mat));
  const m = o.gMargin || 0;
  const gw = o.w - 2 * m;
  const gh = o.h - 2 * m;
  addGraphic(g, o, 'image', gw, gh, o.gRadius || 0, new THREE.Vector3(0, o.h / 2, o.d / 2 + 0.002), 0, ud);
  addGraphic(g, o, 'imageBack', gw, gh, o.gRadius || 0, new THREE.Vector3(0, o.h / 2, -o.d / 2 - 0.002), Math.PI, ud);
  if (o.truss) {
    const s = 0.29;
    const t = new THREE.Mesh(trussGeo(o.w, s), getMaterial('metal_brosse'));
    t.position.y = o.h + 0.05 + s / 2;
    g.add(t);
    const n = o.spots || 0;
    for (let i = 0; i < n; i++) {
      const x = -o.w / 2 + (o.w * (i + 0.5)) / n;
      for (const side of [1, -1]) {
        if (side < 0 && !o.imageBack) continue;
        const sp = makeSpot({ kelvin: o.kelvin, intensity: o.intensity ?? 6, angle: 50, dir: new THREE.Vector3(0, -(o.h / 2 + 0.25), -side * 0.34) }, ud);
        sp.position.set(x, o.h + 0.05, side * (s / 2 + 0.06));
        g.add(sp);
      }
    }
  }
  return g;
};

B.truss = (o) => {
  const g = new THREE.Group();
  const t = new THREE.Mesh(trussGeo(o.w), getMaterial(o.finish || 'metal_brosse'));
  t.position.y = 0.145;
  g.add(t);
  return g;
};

B.storage = (o, ud) => {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish, o.color);
  const t = 0.08;
  const { w, d, h } = o;
  const dw = Math.min(0.9, (o.doorSide === 'left' || o.doorSide === 'right' ? d : w) - 2 * t - 0.1);
  const dh = Math.min(2.1, h - 0.1);
  // mur le long de x (z fixe) ou de z (x fixe), avec trou de porte facultatif
  const run = (axis, from, to, fixed, hasDoor) => {
    const segs = [];
    if (hasDoor && dw > 0.3) {
      const c = from + dw / 2 + (to - from - dw) * (o.doorPos ?? 0.5);
      const a = c - dw / 2;
      const b = c + dw / 2;
      segs.push([from, a, 0, h], [b, to, 0, h], [a, b, dh, h]);
      // porte sur gonds (pivot au bord de l'ouverture), s'ouvre vers l'extérieur
      const hinge = new THREE.Group();
      const sgn = Math.sign(fixed) || 1;
      const lw = dw - 0.01;
      const out = sgn * 0.035;
      if (axis === 'x') {
        hinge.position.set(a, 0, fixed + sgn * 0.02);
        hinge.add(boxAt(lw, dh - 0.01, 0.04, lw / 2, dh / 2, 0, getMaterial('blanc_mat')));
        hinge.add(boxAt(0.12, 0.02, 0.02, lw - 0.1, 1.05, out, getMaterial('metal_brosse')));
        hinge.rotation.y = -sgn * rad(o.doorOpen || 0);
      } else {
        // porte latérale : gonds côté avant, elle s'ouvre vers l'allée
        hinge.position.set(fixed + sgn * 0.02, 0, b);
        hinge.add(boxAt(0.04, dh - 0.01, lw, 0, dh / 2, -lw / 2, getMaterial('blanc_mat')));
        hinge.add(boxAt(0.02, 0.02, 0.12, out, 1.05, -(lw - 0.1), getMaterial('metal_brosse')));
        hinge.rotation.y = -sgn * rad(o.doorOpen || 0);
      }
      hinge.userData.door = true;
      g.add(hinge);
    } else segs.push([from, to, 0, h]);
    for (const [a, b, y0, y1] of segs) {
      if (b - a < 0.001 || y1 - y0 < 0.001) continue;
      g.add(axis === 'x' ? boxAt(b - a, y1 - y0, t, (a + b) / 2, (y0 + y1) / 2, fixed, mat) : boxAt(t, y1 - y0, b - a, fixed, (y0 + y1) / 2, (a + b) / 2, mat));
    }
  };
  run('x', -w / 2, w / 2, -d / 2 + t / 2, o.doorSide === 'back');
  run('x', -w / 2, w / 2, d / 2 - t / 2, o.doorSide === 'front');
  run('z', -d / 2 + t, d / 2 - t, -w / 2 + t / 2, o.doorSide === 'left');
  run('z', -d / 2 + t, d / 2 - t, w / 2 - t / 2, o.doorSide === 'right');
  const m = o.gMargin || 0;
  if (o.doorSide !== 'front') addGraphic(g, o, 'image', w - 2 * m, h - 2 * m, o.gRadius || 0, new THREE.Vector3(0, h / 2, d / 2 + 0.002), 0, ud);
  else {
    const gw = w * (1 - (o.doorPos ?? 0.5)) - dw;
    if (gw > 0.4) addGraphic(g, o, 'image', gw - m, h - 2 * m, o.gRadius || 0, new THREE.Vector3(w / 2 - gw / 2 - m / 2, h / 2, d / 2 + 0.002), 0, ud);
  }
  return g;
};

B.podium = (o) => {
  const g = new THREE.Group();
  g.add(boxAt(o.w, o.h, o.d, 0, o.h / 2, 0, getMaterial(o.finish, o.color)));
  return g;
};

B.steps = (o) => {
  const g = new THREE.Group();
  const n = o.count || 2;
  const mat = getMaterial(o.finish, o.color);
  for (let i = 0; i < n; i++) {
    const sh = (o.h * (i + 1)) / n;
    const sd = (o.d * (n - i)) / n;
    g.add(boxAt(o.w, sh, sd, 0, sh / 2, -o.d / 2 + sd / 2, mat));
  }
  return g;
};

B.shelf = (o) => {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish, o.color);
  g.add(boxAt(o.w, o.h, o.d, 0, o.h / 2, 0, mat));
  for (const k of [-1, 1]) g.add(boxAt(0.02, 0.15, o.d * 0.8, k * (o.w / 2 - 0.1), -0.075, -o.d * 0.1, getMaterial('metal_brosse')));
  return g;
};

B.niche = (o) => {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish, o.color);
  const t = 0.02;
  g.add(boxAt(o.w, t, o.d, 0, t / 2, 0, mat), boxAt(o.w, t, o.d, 0, o.h - t / 2, 0, mat));
  g.add(boxAt(t, o.h, o.d, -o.w / 2 + t / 2, o.h / 2, 0, mat), boxAt(t, o.h, o.d, o.w / 2 - t / 2, o.h / 2, 0, mat));
  g.add(boxAt(o.w, o.h, t, 0, o.h / 2, -o.d / 2 + t / 2, mat));
  if (o.led) {
    const l = boxAt(o.w - 0.06, 0.01, 0.015, 0, o.h - t - 0.006, o.d / 2 - 0.04, emissiveMaterial(kelvinToColor(4500), 4));
    l.userData.emissive = true;
    g.add(l);
  }
  return g;
};

function blockWithGraphic(o, ud, withTop) {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish, o.color);
  const topT = withTop ? 0.03 : 0;
  const nd = o.doors === 'deux' ? 2 : o.doors === 'une' ? 1 : 0;
  if (!nd) g.add(boxAt(o.w, o.h - topT, o.d, 0, (o.h - topT) / 2, 0, mat));
  else {
    // caisson ouvert à l'arrière : façade, côtés, fond, étagère, portes sur gonds
    const t = 0.02;
    const bh = o.h - topT;
    const inside = getMaterial('gris_clair');
    g.add(boxAt(o.w, bh, t, 0, bh / 2, o.d / 2 - t / 2, mat));
    for (const k of [-1, 1]) g.add(boxAt(t, bh, o.d - t, k * (o.w / 2 - t / 2), bh / 2, -t / 2, mat));
    g.add(boxAt(o.w - 2 * t, t, o.d - t, 0, 0.06, -t / 2, inside), boxAt(o.w - 2 * t, t, o.d - 2 * t, 0, bh * 0.52, -t, inside));
    g.add(boxAt(o.w, 0.06, t, 0, 0.03, -o.d / 2 + t / 2, mat)); // plinthe arrière
    g.add(boxAt(o.w - 2 * t, t, o.d - t, 0, bh - t / 2, -t / 2, mat));
    const dwid = (o.w - 0.006 * (nd + 1)) / nd;
    const dhgt = bh - 0.08;
    for (let i = 0; i < nd; i++) {
      const left = nd === 1 || i === 0;
      const hinge = new THREE.Group();
      hinge.position.set(left ? -o.w / 2 + 0.003 : o.w / 2 - 0.003, 0.07, -o.d / 2 - 0.01);
      const dir = left ? 1 : -1;
      hinge.add(boxAt(dwid, dhgt, 0.018, (dir * dwid) / 2, dhgt / 2, 0, mat));
      hinge.add(boxAt(0.012, 0.12, 0.012, dir * (dwid - 0.05), dhgt * 0.75, -0.015, getMaterial('metal_brosse')));
      hinge.rotation.y = dir * rad(o.doorOpen || 0);
      hinge.userData.door = true;
      g.add(hinge);
    }
  }
  if (withTop) g.add(boxAt(o.w + 0.03, topT, o.d + 0.03, 0, o.h - topT / 2, 0, getMaterial(o.top || o.finish, o.top ? null : o.color)));
  ledStrips(g, o, o.w, o.h - topT, o.d);
  const m = o.gMargin ?? 0.05;
  const gh = o.h - topT - 2 * m;
  addGraphic(g, o, 'image', o.w - 2 * m - (o.led && o.led !== 'aucune' ? 0.04 : 0), gh, o.gRadius || 0, new THREE.Vector3(0, m + gh / 2, o.d / 2 + 0.002), 0, ud);
  return g;
}
B.counter = (o, ud) => blockWithGraphic(o, ud, true);

/** Vitrine haute : socle, colonne de verre et étagères en verre */
B.vitrine = (o) => {
  const g = new THREE.Group();
  const base = getMaterial(o.finish, o.color);
  const glass = getMaterial('verre');
  const bh = 0.12;
  g.add(boxAt(o.w, bh, o.d, 0, bh / 2, 0, base), boxAt(o.w, 0.04, o.d, 0, o.h - 0.02, 0, base));
  const gh = o.h - bh - 0.04;
  const t = 0.008;
  for (const k of [-1, 1]) g.add(boxAt(t, gh, o.d, k * (o.w / 2 - t / 2), bh + gh / 2, 0, glass), boxAt(o.w, gh, t, 0, bh + gh / 2, k * (o.d / 2 - t / 2), glass));
  const n = o.shelves || 4;
  for (let i = 1; i < n; i++) g.add(boxAt(o.w - 0.03, 0.008, o.d - 0.03, 0, bh + (gh * i) / n, 0, glass));
  const l = boxAt(o.w - 0.06, 0.01, 0.015, 0, o.h - 0.05, o.d / 2 - 0.03, emissiveMaterial(kelvinToColor(4500), 3));
  l.userData.emissive = true;
  g.add(l);
  return g;
};

/** Vitrine basse fermant à clé : caisson avec visuel + cloche de verre */
B.vitrineBasse = (o, ud) => {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish, o.color);
  const glass = getMaterial('verre');
  const ch = o.h - 0.3;
  g.add(boxAt(o.w, ch, o.d, 0, ch / 2, 0, mat));
  const gh = 0.3;
  const t = 0.006;
  g.add(boxAt(o.w, t, o.d, 0, o.h - t / 2, 0, glass));
  for (const k of [-1, 1]) g.add(boxAt(t, gh, o.d, k * (o.w / 2 - t / 2), ch + gh / 2, 0, glass), boxAt(o.w, gh, t, 0, ch + gh / 2, k * (o.d / 2 - t / 2), glass));
  const m = o.gMargin ?? 0.06;
  addGraphic(g, o, 'image', o.w - 2 * m, ch - 2 * m, 0, new THREE.Vector3(0, ch / 2, o.d / 2 + 0.002), 0, ud);
  return g;
};
B.plinth = (o, ud) => blockWithGraphic(o, ud, false);

B.tableHaute = (o) => {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish, o.color);
  const t = 0.04;
  g.add(boxAt(o.w, t, o.d, 0, o.h - t / 2, 0, mat));
  for (const k of [-1, 1]) g.add(boxAt(o.w, o.h - t, t, 0, (o.h - t) / 2, k * (o.d / 2 - t / 2 - 0.02), mat));
  return g;
};

B.mangeDebout = (o) => {
  const g = new THREE.Group();
  if (o.housse) {
    const r = o.w / 2;
    const H = o.h;
    const pts = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(r * 0.85, 0),
      new THREE.Vector2(r * 0.7, H * 0.1),
      new THREE.Vector2(r * 0.32, H * 0.42),
      new THREE.Vector2(r * 0.28, H * 0.55),
      new THREE.Vector2(r * 0.45, H * 0.8),
      new THREE.Vector2(r * 0.92, H * 0.975),
      new THREE.Vector2(r, H - 0.012),
      new THREE.Vector2(r * 0.98, H),
      new THREE.Vector2(0.001, H),
    ];
    const fabric = new THREE.MeshPhysicalMaterial({ color: o.color || '#ffffff', roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') });
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), fabric));
    return g;
  }
  const mat = getMaterial(o.finish, o.color);
  g.add(cyl(o.w / 2, o.w / 2, 0.03, 0, o.h - 0.015, 0, mat, 40));
  g.add(cyl(0.03, 0.03, o.h - 0.03, 0, (o.h - 0.03) / 2, 0, getMaterial('metal_brosse'), 12));
  g.add(cyl(0.25, 0.26, 0.02, 0, 0.01, 0, getMaterial('metal_brosse'), 32));
  return g;
};

B.stool = (o) => {
  const g = new THREE.Group();
  const r = Math.min(o.w, o.d) / 2;
  g.add(cyl(r * 0.92, r * 0.88, 0.05, 0, o.h - 0.025, 0, getMaterial(o.finish, o.color), 32));
  const lm = getMaterial(o.legs || 'metal_brosse');
  const lh = o.h - 0.05;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const top = new THREE.Vector3(Math.cos(a) * r * 0.6, lh, Math.sin(a) * r * 0.6);
    const bot = new THREE.Vector3(Math.cos(a) * r * 0.95, 0, Math.sin(a) * r * 0.95);
    const L = top.distanceTo(bot);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, L, 8), lm);
    leg.position.copy(top.clone().add(bot).multiplyScalar(0.5));
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize());
    g.add(leg);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.82, 0.008, 6, 32), lm);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = lh * 0.38;
  g.add(ring);
  return g;
};

B.barChair = (o) => {
  const g = new THREE.Group();
  const m = getMaterial(o.finish, o.color);
  const lm = getMaterial(o.legs || 'metal_brosse');
  const sh = o.seatH || 0.76;
  const w = o.w;
  const d = o.d;
  if (o.style === 'coque') {
    // coque enveloppante sur piétement 4 pieds fins
    // coque ouverte vers l'avant (+z) : dossier et accoudoirs enveloppants
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, Math.PI / 2 + 0.7, Math.PI * 2 - 1.4, Math.PI * 0.5, Math.PI * 0.42), new THREE.MeshPhysicalMaterial({ color: m.color, roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide }));
    shell.scale.set(w / 2, o.h - sh + 0.02, d / 2);
    shell.position.y = o.h;
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.45, w * 0.42, 0.04, 32), m);
    seat.scale.z = d / w;
    seat.position.y = sh;
    g.add(shell, seat);
  } else {
    g.add(new THREE.Mesh(new RoundedBoxGeometry(w, 0.05, d * 0.9, 3, 0.015), m).translateY(sh).translateZ(d * 0.05));
    const back = new THREE.Mesh(new RoundedBoxGeometry(w, o.h - sh - 0.1, 0.035, 3, 0.012), m);
    back.position.set(0, sh + 0.05 + (o.h - sh - 0.1) / 2, -d / 2 + 0.03);
    back.rotation.x = -0.08;
    g.add(back);
  }
  const lh = sh - 0.025;
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const top = new THREE.Vector3(x * (w / 2 - 0.06), lh, z * (d / 2 - 0.07));
    const bot = new THREE.Vector3(x * (w / 2 - 0.02), 0, z * (d / 2 - 0.03));
    const L = top.distanceTo(bot);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, L, 8), lm);
    leg.position.copy(top.clone().add(bot).multiplyScalar(0.5));
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize());
    g.add(leg);
  }
  // repose-pieds
  const fr = sh * 0.38;
  g.add(boxAt(w - 0.06, 0.016, 0.016, 0, fr, d / 2 - 0.05, lm), boxAt(w - 0.06, 0.016, 0.016, 0, fr, -d / 2 + 0.05, lm));
  g.add(boxAt(0.016, 0.016, d - 0.1, -(w / 2 - 0.04), fr, 0, lm), boxAt(0.016, 0.016, d - 0.1, w / 2 - 0.04, fr, 0, lm));
  return g;
};

/** Totem carton Tribeca : 4 modules triangulaires (prismes équilatéraux 50 cm, hauteur 50 cm),
 *  tournés d'un demi-tour un module sur deux, 1,85 m de haut, 50 × 58 cm au sol */
B.tribeca = (o, ud) => {
  const g = new THREE.Group();
  const board = getMaterial('blanc_mat');
  const blank = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.92 });
  const t = 0.0023;
  const S = 0.5;
  const H = 0.5;
  const ht = (S * Math.sqrt(3)) / 2; // 43,3 cm
  // panneau entre deux sommets (x, z), visuel sur la face extérieure
  const panel = (key, p1, p2, cy) => {
    const cx = (p1[0] + p2[0]) / 2;
    const cz = (p1[1] + p2[1]) / 2;
    // normale extérieure : depuis le centre du triangle (origine) vers le milieu du côté
    const rotY = Math.atan2(cx, cz);
    const b = boxAt(S, H, t, 0, 0, 0, board);
    b.position.set(cx, cy, cz);
    b.rotation.y = rotY;
    g.add(b);
    const n = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
    const pos = new THREE.Vector3(cx, cy, cz).addScaledVector(n, t / 2 + 0.0008);
    if (!addGraphic(g, o, key, S - 0.004, H, 0, pos, rotY, ud)) {
      const ph = new THREE.Mesh(new THREE.PlaneGeometry(S - 0.004, H), blank);
      ph.position.copy(pos);
      ph.rotation.y = rotY;
      ph.userData.imageKey = key;
      g.add(ph);
    }
  };
  for (let m = 1; m <= 4; m++) {
    const cy = (m - 1) * 0.45 + H / 2;
    const k = (f) => `imageT${m}${f}`;
    if (m % 2) {
      // face plate à l'avant, pointe vers l'arrière
      const L = [-S / 2, ht / 3];
      const R = [S / 2, ht / 3];
      const P = [0, (-2 * ht) / 3];
      panel(k('a'), L, R, cy);
      panel(k('b'), P, L, cy);
      panel(k('c'), R, P, cy);
    } else {
      // pointe vers l'avant, face plate à l'arrière
      const L = [-S / 2, -ht / 3];
      const R = [S / 2, -ht / 3];
      const P = [0, (2 * ht) / 3];
      panel(k('a'), L, P, cy);
      panel(k('b'), P, R, cy);
      panel(k('c'), R, L, cy);
    }
  }
  return g;
};

/** Kakémono : visuel imprimé sur enrouleur, pied en X ou suspendu */
B.kakemono = (o, ud) => {
  const g = new THREE.Group();
  const alu = getMaterial('metal_brosse');
  const w = o.w;
  const h = o.h;
  const m = o.mount || 'enrouleur';
  const y0 = m === 'enrouleur' ? 0.085 : m === 'x' ? 0.06 : 0;
  // toile (face blanche + visuel recto / verso)
  const cloth = boxAt(w, h, 0.003, 0, y0 + h / 2, 0, getMaterial('blanc_mat'));
  g.add(cloth);
  const front = addGraphic(g, o, 'image', w, h, 0, new THREE.Vector3(0, y0 + h / 2, 0.0025), 0, ud);
  if (!front) {
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: '#c9d4db', roughness: 0.9 }));
    ph.position.set(0, y0 + h / 2, 0.0025);
    ph.userData.imageKey = 'image';
    g.add(ph);
  }
  addGraphic(g, o, 'imageBack', w, h, 0, new THREE.Vector3(0, y0 + h / 2, -0.0025), Math.PI, ud);
  if (m === 'enrouleur') {
    const base = new THREE.Mesh(new RoundedBoxGeometry(w + 0.04, 0.085, 0.2, 3, 0.03), alu);
    base.position.set(0, 0.0425, 0);
    g.add(base, cyl(0.01, 0.01, h, 0, y0 + h / 2, -0.04, alu, 10));
    for (const k of [-1, 1]) g.add(boxAt(0.04, 0.012, 0.22, k * (w / 2 - 0.05), 0.006, 0.02, alu));
    const bar = cyl(0.008, 0.008, w + 0.01, 0, y0 + h + 0.004, 0, alu, 10);
    bar.rotation.z = Math.PI / 2;
    g.add(bar);
  } else if (m === 'x') {
    // structure en X derrière la toile + pied
    const back = -0.03;
    const pts = [
      [new THREE.Vector3(-w / 2 + 0.02, y0 + 0.02, back), new THREE.Vector3(w / 2 - 0.02, y0 + h - 0.02, back)],
      [new THREE.Vector3(w / 2 - 0.02, y0 + 0.02, back), new THREE.Vector3(-w / 2 + 0.02, y0 + h - 0.02, back)],
    ];
    for (const [a, b] of pts) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, a.distanceTo(b), 8), getMaterial('noir_mat'));
      t.position.copy(a.clone().add(b).multiplyScalar(0.5));
      t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.add(t);
    }
    g.add(cyl(0.02, 0.02, 0.04, 0, y0 + h * 0.45, back, getMaterial('noir_mat'), 12));
    const foot = cyl(0.01, 0.01, 0.5, 0, y0 + h * 0.22, back - 0.22, getMaterial('noir_mat'), 8);
    foot.rotation.x = -0.9;
    g.add(foot, boxAt(0.4, 0.015, 0.05, 0, 0.0075, 0.02, getMaterial('noir_mat')));
  } else {
    // suspendu : barres alu haut/bas et câbles vers le plafond
    for (const yy of [0, h]) {
      const bar = cyl(0.012, 0.012, w + 0.02, 0, yy, 0, alu, 12);
      bar.rotation.z = Math.PI / 2;
      g.add(bar);
    }
    for (const k of [-1, 1]) g.add(cyl(0.0015, 0.0015, 0.6, k * (w / 2 - 0.05), h + 0.3, 0, getMaterial('chrome'), 4));
  }
  return g;
};

B.person = (o) => buildPerson(o);

B.chair = (o) => {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish, o.color);
  const lm = getMaterial(o.legs || 'metal_brosse');
  const sh = 0.46;
  g.add(boxAt(o.w, 0.04, o.d * 0.9, 0, sh, o.d * 0.05, mat));
  g.add(boxAt(o.w, o.h - sh, 0.03, 0, sh + (o.h - sh) / 2, -o.d / 2 + 0.03, mat));
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(cyl(0.01, 0.01, sh, x * (o.w / 2 - 0.03), sh / 2, z * (o.d / 2 - 0.04), lm, 8));
  return g;
};

B.lowTable = (o) => {
  const g = new THREE.Group();
  g.add(boxAt(o.w, 0.03, o.d, 0, o.h - 0.015, 0, getMaterial(o.finish, o.color)));
  const lm = getMaterial(o.legs || 'noir_mat');
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(cyl(0.015, 0.015, o.h - 0.03, x * (o.w / 2 - 0.06), (o.h - 0.03) / 2, z * (o.d / 2 - 0.06), lm, 10));
  return g;
};

B.sofa = (o) => {
  const g = new THREE.Group();
  const m = getMaterial(o.finish, o.color);
  const geo = (w, h, d) => new RoundedBoxGeometry(w, h, d, 3, 0.04);
  const add = (geom, x, y, z) => {
    const mesh = new THREE.Mesh(geom, m);
    mesh.position.set(x, y, z);
    g.add(mesh);
  };
  add(geo(o.w, 0.2, o.d), 0, 0.2, 0);
  add(geo(o.w - 0.3, 0.14, o.d - 0.2), 0, 0.36, 0.08);
  add(geo(o.w, o.h - 0.1, 0.2), 0, (o.h - 0.1) / 2 + 0.1, -o.d / 2 + 0.1);
  for (const k of [-1, 1]) add(geo(0.15, 0.55, o.d), k * (o.w / 2 - 0.075), 0.375, 0);
  const lm = getMaterial(o.legs || 'noir_mat');
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(cyl(0.015, 0.012, 0.1, x * (o.w / 2 - 0.06), 0.05, z * (o.d / 2 - 0.06), lm, 8));
  return g;
};

B.coatRack = (o) => {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish || 'metal_brosse', o.color);
  g.add(cyl(0.2, 0.22, 0.02, 0, 0.01, 0, mat, 32));
  g.add(cyl(0.018, 0.018, o.h, 0, o.h / 2, 0, mat, 12));
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), mat);
    hook.position.set(Math.cos(a) * 0.07, o.h - 0.12, Math.sin(a) * 0.07);
    hook.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    g.add(hook);
  }
  return g;
};

B.bin = (o) => {
  const g = new THREE.Group();
  const m = getMaterial(o.finish, o.color).clone();
  m.side = THREE.DoubleSide;
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(o.w / 2, o.w / 2.3, o.h, 32, 1, true).translate(0, o.h / 2, 0), m));
  g.add(cyl(o.w / 2.3, o.w / 2.3, 0.01, 0, 0.005, 0, m, 32));
  return g;
};

B.display = (o, ud) => {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish, o.color);
  g.add(boxAt(o.w, o.h, 0.03, 0, o.h / 2, -o.d / 2 + 0.015, mat));
  g.add(boxAt(o.w, 0.08, o.d, 0, 0.04, 0, mat));
  const n = o.shelves || 3;
  const glass = getMaterial('verre');
  for (let i = 0; i < n; i++) {
    const y = o.h * 0.35 + ((o.h * 0.58) / Math.max(1, n - 1 || 1)) * i;
    g.add(boxAt(o.w - 0.04, 0.012, o.d - 0.05, 0, y, 0.01, glass));
  }
  addGraphic(g, o, 'image', o.w - 0.08, o.h * 0.25, 0, new THREE.Vector3(0, o.h * 0.18, -o.d / 2 + 0.032), 0, ud);
  return g;
};

B.brochure = (o, ud) => {
  const g = new THREE.Group();
  const acr = getMaterial(o.finish || 'plexi_depoli');
  g.add(boxAt(o.w, o.h, 0.01, 0, o.h / 2, -o.d / 2 + 0.005, acr));
  g.add(boxAt(o.w, 0.02, o.d, 0, 0.01, 0, getMaterial('metal_brosse')));
  const n = 4;
  const ph = (o.h - 0.3) / n;
  const paper = graphicMat(o, 'image', o.w * 0.9, ph * 0.9, ud) || getMaterial('blanc_mat');
  for (let i = 0; i < n; i++) {
    const y = 0.3 + i * ph;
    const doc = new THREE.Mesh(new THREE.PlaneGeometry(o.w * 0.9, ph * 0.9), paper);
    doc.position.set(0, y + ph / 2, -o.d / 2 + 0.06);
    doc.rotation.x = -0.12;
    const pocket = boxAt(o.w, ph * 0.45, 0.006, 0, y + ph * 0.22, -o.d / 2 + 0.1, acr);
    g.add(doc, pocket);
  }
  return g;
};

B.rollup = (o, ud) => {
  const g = new THREE.Group();
  const m = getMaterial(o.finish || 'metal_brosse');
  g.add(boxAt(o.w + 0.02, 0.09, 0.2, 0, 0.045, 0, m));
  const bh = o.h - 0.09;
  g.add(boxAt(o.w, bh, 0.004, 0, 0.09 + bh / 2, 0, getMaterial('blanc_mat')));
  addGraphic(g, o, 'image', o.w, bh, 0, new THREE.Vector3(0, 0.09 + bh / 2, 0.0035), 0, ud);
  g.add(cyl(0.008, 0.008, bh, 0, 0.09 + bh / 2, -0.02, m, 8));
  return g;
};

B.tv = (o, ud) => {
  const g = new THREE.Group();
  const sw = (o.inches || 55) * 0.0254 * (16 / Math.hypot(16, 9));
  const sh = (sw * 9) / 16;
  const y0 = o.mount === 'pied' ? o.screenY ?? 1.1 : 0;
  const body = getMaterial(o.finish || 'noir_mat');
  g.add(boxAt(sw + 0.02, sh + 0.02, 0.05, 0, y0 + sh / 2, o.mount === 'pied' ? 0.06 : 0.025, body));
  const zf = (o.mount === 'pied' ? 0.06 : 0.025) + 0.0255;
  const m = addGraphic(g, o, 'image', sw, sh, 0, new THREE.Vector3(0, y0 + sh / 2, zf), 0, ud, 0.9);
  if (!m) {
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshPhysicalMaterial({ color: '#0b0d10', roughness: 0.08, clearcoat: 1 }));
    scr.position.set(0, y0 + sh / 2, zf);
    scr.userData.imageKey = 'image';
    g.add(scr);
  }
  if (o.mount === 'pied') {
    g.add(boxAt(0.08, y0 + sh / 2, 0.05, 0, (y0 + sh / 2) / 2, 0, body));
    g.add(boxAt(0.7, 0.03, 0.5, 0, 0.015, 0, body));
  }
  return g;
};

B.visual = (o, ud) => {
  const g = new THREE.Group();
  const m = addGraphic(g, o, 'image', o.w, o.h, 0, new THREE.Vector3(0, o.h / 2, 0.003), 0, ud);
  if (!m) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), new THREE.MeshStandardMaterial({ color: '#a9b8c2', transparent: true, opacity: 0.6 }));
    p.position.set(0, o.h / 2, 0.003);
    p.userData.imageKey = 'image';
    g.add(p);
  }
  return g;
};

B.text = (o) => {
  const g = new THREE.Group();
  const c = textCanvas(o);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const hh = o.h;
  const ww = (hh * c.width) / c.height;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.05, roughness: 0.5 }));
  p.position.set(0, hh / 2, 0.004);
  g.add(p);
  return g;
};

B.spot = (o, ud) => {
  const g = new THREE.Group();
  const t = rad(o.tilt ?? 30);
  const s = makeSpot({ kelvin: o.kelvin, intensity: o.intensity, angle: o.angle, dir: new THREE.Vector3(0, -Math.cos(t), Math.sin(t)), finish: o.finish }, ud);
  g.add(s);
  return g;
};

B.led = (o) => {
  const g = new THREE.Group();
  const m = boxAt(o.w, o.h, o.d, 0, o.h / 2, 0, emissiveMaterial(kelvinToColor(o.kelvin || 5000), o.intensity ?? 4));
  m.userData.emissive = true;
  g.add(m);
  return g;
};

B.plant = (o) => {
  const g = new THREE.Group();
  const r = rng(o.id || 'p');
  const potH = Math.min(0.4, o.h * 0.28);
  g.add(cyl(o.w * 0.38, o.w * 0.3, potH, 0, potH / 2, 0, getMaterial(o.finish || 'blanc_mat', o.color), 24));
  const leaf = new THREE.MeshStandardMaterial({ color: '#3f6d3a', roughness: 0.75 });
  const leaf2 = new THREE.MeshStandardMaterial({ color: '#557f45', roughness: 0.75 });
  const n = 14;
  for (let i = 0; i < n; i++) {
    const s = (0.12 + r() * 0.12) * (o.w / 0.5);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), r() > 0.5 ? leaf : leaf2);
    const a = r() * Math.PI * 2;
    const rr = r() * o.w * 0.3;
    m.position.set(Math.cos(a) * rr, potH + s * 0.6 + r() * (o.h - potH - s * 1.4), Math.sin(a) * rr);
    m.scale.set(1, 1.3, 1);
    g.add(m);
  }
  return g;
};

B.product = (o, ud) => {
  const g = new THREE.Group();
  const mat = getMaterial(o.finish || 'blanc_mat', o.color);
  const shape = o.shape || 'boite';
  if (shape === 'silhouette') {
    const mf = graphicMat(o, 'image', o.w, o.h, ud);
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), mf || new THREE.MeshStandardMaterial({ color: '#c8d0d6', transparent: true, opacity: 0.5 }));
    if (mf) mf.side = THREE.DoubleSide;
    ph.position.y = o.h / 2;
    ph.userData.imageKey = 'image';
    g.add(ph);
    const ms = graphicMat(o, 'imageSide', o.d, o.h, ud);
    if (ms) {
      ms.side = THREE.DoubleSide;
      const sp = new THREE.Mesh(new THREE.PlaneGeometry(o.d, o.h), ms);
      sp.rotation.y = Math.PI / 2;
      sp.position.y = o.h / 2;
      sp.userData.imageKey = 'imageSide';
      g.add(sp);
    }
  } else if (shape === 'lampe') {
    const base = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const leg = boxAt(o.w / 2, 0.025, 0.04, (Math.cos(a) * o.w) / 4, 0.06, (Math.sin(a) * o.w) / 4, mat);
      leg.rotation.y = -a;
      base.add(leg, cyl(0.025, 0.025, 0.05, (Math.cos(a) * o.w) / 2, 0.025, (Math.sin(a) * o.w) / 2, getMaterial('noir_mat'), 10));
    }
    g.add(base);
    const ph = o.h * 0.62;
    g.add(cyl(0.018, 0.018, ph, 0, ph / 2, 0, getMaterial('metal_brosse'), 12));
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, o.h * 0.45, 10), mat);
    arm.position.set(0, ph + o.h * 0.14, o.h * 0.12);
    arm.rotation.x = 1.0;
    g.add(arm);
    const head = cyl(0.12, 0.09, 0.07, 0, o.h - 0.06, o.h * 0.25, mat, 32);
    head.rotation.x = 0.5;
    g.add(head);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.085, 32), emissiveMaterial(kelvinToColor(4500), 1.5));
    lens.position.set(0, o.h - 0.1, o.h * 0.25 + 0.02);
    lens.rotation.x = Math.PI / 2 + 0.5;
    g.add(lens);
  } else if (shape === 'cylindre') {
    const m = graphicMat(o, 'image', Math.PI * o.w, o.h, ud);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(o.w / 2, o.w / 2, o.h, 40).translate(0, o.h / 2, 0), m ? [m, mat, mat] : mat));
  } else {
    const geo = shape === 'appareil' ? new RoundedBoxGeometry(o.w, o.h, o.d, 3, Math.min(o.w, o.h, o.d) * 0.15) : new THREE.BoxGeometry(o.w, o.h, o.d);
    geo.translate(0, o.h / 2, 0);
    g.add(new THREE.Mesh(geo, mat));
    addGraphic(g, o, 'image', o.w * (shape === 'appareil' ? 0.85 : 1), o.h * (shape === 'appareil' ? 0.8 : 1), 0, new THREE.Vector3(0, o.h / 2, o.d / 2 + 0.0015), 0, ud);
    if (shape === 'boite') for (const k of [-1, 1]) addGraphic(g, o, 'imageSide', o.d, o.h, 0, new THREE.Vector3((k * o.w) / 2 + k * 0.0015, o.h / 2, 0), (k * Math.PI) / 2, ud);
  }
  return g;
};

B.device = (o) => buildDevice(o);

B.model = (o) => {
  const g = new THREE.Group();
  const e = assets.modelEntry(o.model);
  if (!e?.model) {
    const ph = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, o.d).translate(0, o.h / 2, 0), new THREE.MeshBasicMaterial({ color: '#7a8a96', wireframe: true }));
    g.add(ph);
    return g;
  }
  const inner = e.model.clone(true);
  const box = e.box;
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, -box.min.y, -c.z);
  const wrap = new THREE.Group();
  wrap.add(inner);
  wrap.scale.set(o.w / (size.x || 1), o.h / (size.y || 1), o.d / (size.z || 1));
  g.add(wrap);
  return g;
};

/** Construit le groupe Three.js d'un objet + métadonnées (bbox locale, lumières, résolution) */
export function buildObject(o) {
  const ud = { lights: [], dpi: {} };
  const fn = B[o.type];
  const g = fn ? fn(o, ud) : new THREE.Group();
  g.traverse((m) => {
    if (m.isMesh) {
      const transparent = Array.isArray(m.material) ? false : m.material?.transparent;
      m.castShadow = !m.userData.emissive && !transparent;
      m.receiveShadow = true;
    }
  });
  g.updateMatrixWorld(true);
  const box = new THREE.Box3();
  g.traverse((m) => {
    if (m.isMesh) {
      m.geometry.computeBoundingBox();
      box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));
    }
  });
  if (box.isEmpty()) box.set(new THREE.Vector3(-0.05, 0, -0.05), new THREE.Vector3(0.05, 0.1, 0.05));
  let parts = null;
  if (TYPES[o.type]?.hollow) {
    parts = [];
    g.traverse((m) => {
      if (m.isMesh) parts.push(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));
    });
  }
  g.userData = { objId: o.id, box, parts, lights: ud.lights, dpi: ud.dpi };
  return g;
}

/** Nouvel objet à partir d'une entrée du catalogue */
export function fromCatalog(entry) {
  return { type: entry.type, name: entry.label, x: 0, z: 0, y: 0, rot: 0, zone: '', ...JSON.parse(JSON.stringify(entry.d)) };
}

export const isSupport = (o) => !!TYPES[o.type]?.support || (o.type === 'device' && o.model === 'gueridon');
export const isStackable = (o) => !!TYPES[o.type]?.stack;
export const noCollide = (o) => {
  const t = TYPES[o.type] || {};
  return o.attached || t.mounted || t.hanging || t.light || t.decor || (o.type === 'kakemono' && o.mount === 'suspendu');
};
