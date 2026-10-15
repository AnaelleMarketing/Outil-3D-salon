// Produits exposés à Medica 2026 (liste marketing MEDICA_PRODUCT_EN_2026), en 3D.
// Chaque référence est rattachée à un modèle 3D de devices.js, dans son coloris ; la photo de la fiche
// gsh-med.fr (public/produits/) sert de vignette dans le catalogue.
import { MEDICA_RAW } from './medica-products.js';

/** Gammes (sous-catégories de la liste) en français, dans l'ordre d'affichage */
const GAMMES = {
  Stethoscopes: 'Stéthoscopes',
  'Aneroid BP monitors': 'Tensiomètres',
  'Electronic BP monitors': 'Tensiomètres électroniques',
  Cardio: 'ECG & cardiologie',
  Oximeter: 'Oxymètres & monitoring',
  Thermometers: 'Thermomètres',
  Otoscope: 'Otoscopes',
  Ophthalmo: 'Ophtalmoscopes',
  Dermato: 'Dermatoscopes',
  Penlights: 'Lampes stylo',
  Laryngo: 'Laryngoscopes',
  'Wall station': 'Station murale',
  'Examination lamps': "Lampes d'examen",
  Kids: 'Gamme enfants',
  vet: 'Vétérinaire',
  'Pressure infusion cuffs': 'Manchettes à pression & perfusion',
  Tourniquet: 'Garrots',
  'Tourniquet cuff': 'Brassards de garrot',
};
const ORDER = Object.values(GAMMES);

/** Coloris cités dans les noms de produits (anglais / français) */
const COLORS = [
  [/powder(y)? pink|rose poudr/i, '#e9b7c3'],
  [/coral|corail/i, '#ee6a5f'],
  [/blueberry|myrtille/i, '#3b4a8c'],
  [/carbon|carbone/i, '#2b2d31'],
  [/bronze/i, '#9c6b3f'],
  [/pediatric|vert d.eau/i, '#8fd3c3'],
  [/navy|marine/i, '#1d2f5a'],
  [/magenta|pink|rose/i, '#d6408f'],
  [/purple|lilac|violet|lilas/i, '#a58fd0'],
  [/yellow|jaune/i, '#f2c230'],
  [/green|vert/i, '#3aa76d'],
  [/red|rouge/i, '#c8102e'],
  [/blue|bleu/i, '#2a6fc9'],
  [/grey|gray|gris|silver/i, '#8a8f96'],
  [/white|blanc/i, '#f2f2f0'],
  [/black|noir/i, '#1c1c1f'],
];
const colorOf = (name, fallback) => (COLORS.find(([re]) => re.test(name)) || [null, fallback])[1];

/** Référence / nom → modèle 3D et réglages ; première règle qui correspond */
const MODELS = [
  [/U1\.211/, () => ({ type: 'product', shape: 'lampe', w: 0.6, d: 0.6, h: 1.6, finish: 'blanc_laque' })],
  [/wall diagnostic/i, () => ({ model: 'stationMurale' })],
  [/single head, pediatric/i, (n) => ({ model: 'stethoPedia', color: '#2aa7c9' })],
  [/stethoscope|cardio prestige|magister|pulse/i, (n) => ({ model: 'stetho', color: /silver/i.test(n) ? '#1c1c1f' : colorOf(n, '#1d2f5a') })],
  [/evi 10/i, () => ({ model: 'ecgTablet' })],
  [/evi 7/i, () => ({ model: 'ecgTablet', scale: 0.75 })],
  [/ecg 6/i, () => ({ model: 'ecgPortable' })],
  [/cardiomate/i, () => ({ model: 'ecgBoitier' })],
  [/vitalimate/i, () => ({ model: 'monitor' })],
  [/master palm/i, () => ({ model: 'oxyPalm' })],
  [/oxyfrog/i, () => ({ model: 'oxymetre', color: '#7cc576' })],
  [/oxygo|oxystart/i, (n) => ({ model: 'oxymetre', color: colorOf(n, '#2a6fb5') })],
  [/reflex hammer/i, () => ({ model: 'marteau', color: '#f2c230' })],
  [/holder with laryngeal/i, () => ({ model: 'accessoire', color: '#8a8f96', long: 0.04, miroir: true })],
  [/filter/i, () => ({ model: 'accessoire', color: '#2a6fc9', long: 0.015, verre: true })],
  [/penlight/i, (n) => ({ model: 'penlight', color: colorOf(n, '#1c1c1f') })],
  [/ear funnels.*box/i, () => ({ model: 'boiteSpeculums', color: '#8a8f96' })],
  [/veterinary-ear funnel/i, (n) => ({ model: 'speculum', metal: true, rayon: (parseFloat((n.match(/(\d+)\s*mm/) || [])[1]) || 4) / 2000 })],
  [/insufflation bulb/i, () => ({ model: 'poire' })],
  [/laryngoscope handle/i, () => ({ model: 'laryngoManche' })],
  [/miller/i, () => ({ model: 'laryngoLame', droite: true })],
  [/laryngoscope blade/i, () => ({ model: 'laryngoLame' })],
  [/laryngoscope case/i, () => ({ model: 'etui' })],
  [/ophthalmoscope|oculus/i, (n) => ({ model: 'ophtalmo', color: colorOf(n, '#1c1c1f') })],
  [/dermatoscope/i, (n) => ({ model: 'dermatoscope', color: colorOf(n, '#1c1c1f') })],
  [/smartled/i, (n) => ({ model: 'otoscope', color: colorOf(n, '#1c1c1f') })],
  [/otoscope|auris/i, (n) => ({ model: 'otoscope', color: colorOf(n, '#1c1c1f') })],
  [/neotens.*wrist|neo100/i, () => ({ model: 'nomad' })],
  [/neotens/i, () => ({ model: 'neotens' })],
  [/autotensio wrist/i, (n) => ({ model: 'nomad', color: colorOf(n, '#ee6a5f') })],
  [/autotensio arm/i, (n) => ({ model: 'tensioElec', color: colorOf(n, '#3b4a8c') })],
  [/mobi child cuff/i, () => ({ model: 'manchon', color: '#3b4a8c', rayon: 0.16 / Math.PI / 2, long: 0.065 })], // XS 9-16 cm
  [/mobi/i, (n) => ({ model: 'mobi', color: colorOf(n, '#ee6a3c') })],
  [/dessillons/i, () => ({ model: 'dessillons', color: '#c8102e' })],
  [/vaquez|tensiom/i, (n) => ({ model: 'manopoire', color: colorOf(n, '#1d2f5a') })],
  [/soft cuff/i, (n) => manchon(n, '#5d6166')],
  [/clinic/i, (n) => manchon(n, '#e8c547')],
  // manchettes : modèle à la taille d'une poche de 1000 cc, mise à l'échelle selon le volume (500 / 1000 / 3000 cc)
  [/pressure infusion cuff/i, (n) => ({ model: 'perfusion', color: /grey/i.test(n) ? '#8a8f96' : /clear/i.test(n) ? '#d9e6ee' : '#2a6fc9', manometre: /grey|clear/i.test(n), scale: { 500: 0.8, 1000: 1, 3000: 1.45 }[(n.match(/(\d+)\s*cc/i) || [])[1]] || 1 })],
  [/iv pole/i, () => ({ model: 'potence' })],
  [/easy pump/i, () => ({ model: 'easyPump' })],
  [/little pump/i, () => ({ model: 'garrotSeul', scale: 0.75 })],
  [/base with casters/i, () => ({ model: 'socleRoulettes' })],
  [/manual (single-use|one-piece)/i, () => ({ model: 'garrotManuel' })],
  [/autoclavable cuff/i, (n, ref) => garrotCuff(ref, '#8b7d6b')],
  [/one-piece cuff/i, (n, ref) => garrotCuff(ref, '#2b2e33')],
  [/tempo ear/i, () => ({ model: 'thermoOreille' })],
  [/tempo/i, (n) => ({ model: 'thermoCrayon', color: /blue/i.test(n) ? '#2a6fc9' : '#f2f3f5' })],
];

/** Largeur des brassards PNI (cm) : celle de la gamme Soft Cuff, donnée dans la liste */
const LARGEUR_BRASSARD = [[/cuissard|thigh/i, 19], [/large/i, 16], [/adulte|adult/i, 13], [/enfant|child/i, 8], [/./, 4]];

/** Brassard PNI fermé (comme sur les photos GSH) : diamètre = plus grand tour de bras / π, hauteur = largeur.
 *  Cotes lues dans le nom : « (6-12 x 4 cm) » = tour de bras 6 à 12 cm, largeur 4 cm ; « (6 x 12 cm) » = tour de bras 6 à 12 cm. */
function manchon(n, color) {
  const m = n.match(/\((\d+)\s*(?:-\s*(\d+))?\s*x\s*(\d+)\s*cm\)/i);
  let tour = 30;
  let largeur = LARGEUR_BRASSARD.find(([re]) => re.test(n))[1];
  if (m && m[2]) [tour, largeur] = [+m[2], +m[3]];
  else if (m) tour = +m[3];
  return { model: 'manchon', color, rayon: tour / 100 / Math.PI / 2, long: largeur / 100 };
}

/** Brassard de garrot DDM fermé, avec sa tubulure. Taille d'après le dernier chiffre de la référence
 *  (1 nourrisson … 5 adulte L) et les tours de bras de la gamme DDM sur gsh-med.fr (petit adulte 17-25, adulte 23-33 cm). */
function garrotCuff(ref, color) {
  const cuissard = /^GC/i.test(ref);
  const t = +(ref.match(/(\d)$/) || [])[1] || 4;
  const [tour, largeur] = cuissard ? [55, 10] : { 1: [17, 4.5], 2: [22, 5.5], 3: [25, 7], 4: [33, 8], 5: [50, 10] }[t] || [33, 8];
  return { model: 'manchon', color, rayon: tour / 100 / Math.PI / 2, long: largeur / 100, tubes: 1, tubeColor: '#2a6fc9' };
}

/** Marque, déduite du nom ou de la référence quand la liste ne la donne pas */
function brandOf(p) {
  const b = p.brand || (/luxamed|luxascope|auris/i.test(p.name) || /^[A-Z][A-Z0-9]\.\d{3}\.\d/.test(p.ref) ? 'LUXAMED' : /spengler|tensiom|brassard|cuissard/i.test(p.name) ? 'SPENGLER' : '');
  return b ? b.charAt(0) + b.slice(1).toLowerCase() : '';
}

export const MEDICA_PRODUCTS = MEDICA_RAW.map((p) => {
  const key = p.ref + ' ' + p.name;
  const rule = MODELS.find(([re]) => re.test(key));
  return { ...p, brand: brandOf(p), gamme: GAMMES[p.sub] || p.sub || 'Divers', photo: p.file ? 'produits/' + p.file : null, shape3d: rule ? rule[1](p.name, p.ref) : null };
}).sort((a, b) => ORDER.indexOf(a.gamme) - ORDER.indexOf(b.gamme) || a.name.localeCompare(b.name));

/** Entrées du catalogue de l'outil (catégorie « Produits Medica 2026 ») */
export const MEDICA_CATALOG = MEDICA_PRODUCTS.filter((p) => p.shape3d).map((p) => {
  const { type = 'device', ...d } = p.shape3d;
  return {
    type,
    label: p.name,
    cat: 'Produits Medica 2026',
    gamme: p.gamme,
    photo: p.photo,
    kw: [p.ref, p.brand, p.family, p.gamme].filter(Boolean).join(' '),
    d: { ...d, brand: p.brand, gamme: p.gamme, ref: p.ref },
  };
});
