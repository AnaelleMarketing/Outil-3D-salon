// Personnages stylisés (échelle 1:1) pour animer le stand : visiteurs, commerciaux, soignants, personnes assises.
import * as THREE from 'three';

export const SKINS = { clair: '#f1d2bc', moyen: '#d9a882', mat: '#b07a52', fonce: '#6e4630' };
export const HAIRS = ['#2b1d14', '#5a3a22', '#a8743f', '#1a1a1a', '#c9b58a', '#8a8a8a'];

export const PEOPLE_CATALOG = [
  { label: 'Visiteur', d: { pose: 'debout', sexe: 'homme', tenue: 'costume', color: '#27365a', skin: 'clair', h: 1.78 } },
  { label: 'Visiteuse', d: { pose: 'debout', sexe: 'femme', tenue: 'decontracte', color: '#8a3b4f', skin: 'moyen', h: 1.66 } },
  { label: 'Visiteur qui marche', d: { pose: 'marche', sexe: 'homme', tenue: 'decontracte', color: '#3f6b8a', skin: 'mat', h: 1.8 } },
  { label: 'Commercial en discussion', d: { pose: 'discussion', sexe: 'homme', tenue: 'costume', color: '#1d2433', skin: 'clair', h: 1.82, badge: true } },
  { label: 'Commerciale en discussion', d: { pose: 'discussion', sexe: 'femme', tenue: 'costume', color: '#1b2f63', skin: 'clair', h: 1.68, badge: true } },
  { label: 'Médecin en blouse', d: { pose: 'debout', sexe: 'homme', tenue: 'blouse', color: '#3a4a5c', skin: 'fonce', h: 1.8 } },
  { label: 'Infirmière', d: { pose: 'debout', sexe: 'femme', tenue: 'soin', color: '#2f8f9d', skin: 'mat', h: 1.64 } },
  { label: 'Personne assise (chaise)', d: { pose: 'assis', sexe: 'femme', tenue: 'decontracte', color: '#5b6e3f', skin: 'clair', h: 1.68 } },
  { label: 'Personne sur chaise haute', d: { pose: 'assisHaut', sexe: 'homme', tenue: 'costume', color: '#4a3f35', skin: 'moyen', h: 1.78 } },
];

const mc = new Map();
const mat = (c, r = 0.75, extra = {}) => {
  const k = c + r + JSON.stringify(extra);
  if (!mc.has(k)) mc.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra }));
  return mc.get(k);
};

function capsule(r, len, m) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 14), m);
  mesh.position.y = -len / 2 - r * 0.4;
  return mesh;
}

/** Membre à deux segments, pivot en haut ; renvoie {g, mid} (mid = articulation genou/coude) */
function limb(l1, l2, r1, r2, m1, m2 = m1) {
  const g = new THREE.Group();
  g.add(capsule(r1, l1 - r1, m1));
  const mid = new THREE.Group();
  mid.position.y = -l1;
  mid.add(capsule(r2, l2 - r2, m2));
  g.add(mid);
  return { g, mid };
}

export function buildPerson(o) {
  const root = new THREE.Group();
  const fig = new THREE.Group();
  root.add(fig);
  const femme = o.sexe === 'femme';
  const skin = mat(SKINS[o.skin] || SKINS.clair, 0.6);
  const hairC = HAIRS[(o.id || 'x').split('').reduce((s, c) => s + c.charCodeAt(0), 0) % HAIRS.length];
  const hair = mat(o.hair || hairC, 0.8);
  const t = o.tenue || 'costume';
  const main = o.color || '#27365a';
  const top = t === 'blouse' ? mat('#f6f7f8', 0.7) : t === 'soin' ? mat(main, 0.85) : mat(main, 0.7);
  const under = t === 'blouse' ? mat(main, 0.7) : t === 'soin' ? mat(main, 0.85) : t === 'costume' ? mat(main, 0.7) : mat('#2c3340', 0.8);
  const shirt = t === 'costume' ? mat('#f2f4f6', 0.6) : t === 'blouse' ? mat('#9fb6c9', 0.7) : top;
  const shoe = mat(t === 'soin' ? '#f2f2f2' : '#1b1b1d', 0.5);

  // proportions pour 1,75 m puis mise à l'échelle
  const hipY = 0.92;
  const legL1 = 0.46;
  const legL2 = 0.44;
  const sh = femme ? 0.17 : 0.2;

  // jambes
  const legs = [];
  for (const k of [-1, 1]) {
    const L = limb(legL1, legL2, 0.075, 0.058, under);
    L.g.position.set(k * 0.1, hipY, 0);
    const foot = new THREE.Mesh(new RoundedFoot(), shoe);
    foot.position.set(0, -legL2 + 0.02, 0.05);
    L.mid.add(foot);
    fig.add(L.g);
    legs.push(L);
  }
  // bassin + torse
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), under);
  pelvis.scale.set(sh + 0.01, 0.11, 0.12);
  pelvis.position.y = hipY + 0.02;
  fig.add(pelvis);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1, 8, 20), top);
  torso.scale.set(sh, 0.2, 0.12);
  torso.position.y = hipY + 0.3;
  fig.add(torso);
  if (t === 'costume') {
    const plastron = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.28), shirt);
    plastron.position.set(0, hipY + 0.42, 0.118);
    fig.add(plastron);
  }
  // blouse / robe : jupe évasée
  if (t === 'blouse' || (femme && t === 'decontracte')) {
    const len = t === 'blouse' ? 0.5 : 0.38;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(sh + 0.02, sh + 0.08, len, 24, 1, true), t === 'blouse' ? top : mat(main, 0.75, { side: THREE.DoubleSide }));
    skirt.material.side = THREE.DoubleSide;
    skirt.position.y = hipY + 0.06 - len / 2;
    skirt.scale.z = 0.75;
    skirt.userData.skirt = true;
    fig.add(skirt);
  }
  // cou + tête
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 12), skin);
  neck.position.y = hipY + 0.57;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), skin);
  head.scale.set(0.92, 1.1, 1);
  head.position.y = hipY + 0.72;
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.112, 24, 16, 0, Math.PI * 2, 0, femme ? Math.PI * 0.75 : Math.PI * 0.5), hair);
  hairM.scale.set(0.95, 1.12, 1.04);
  hairM.position.set(0, hipY + 0.735, -0.008);
  hairM.rotation.x = -0.25;
  fig.add(neck, head, hairM);
  if (femme) {
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.14, 6, 12), hair);
    back.position.set(0, hipY + 0.62, -0.06);
    fig.add(back);
  }
  // bras
  const arms = [];
  for (const k of [-1, 1]) {
    const A = limb(0.3, 0.27, 0.05, 0.042, top);
    A.g.position.set(k * (sh + 0.03), hipY + 0.47, 0);
    A.g.rotation.z = k * 0.08;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), skin);
    hand.position.y = -0.27;
    A.mid.add(hand);
    fig.add(A.g);
    arms.push(A);
  }
  // accessoires
  if (o.badge || t === 'costume') {
    const lan = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 6, 24, Math.PI), mat('#2f6f8f', 0.5));
    lan.rotation.set(0, 0, Math.PI);
    lan.position.set(0, hipY + 0.5, 0.06);
    lan.scale.set(0.9, 1.3, 1);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.006), mat('#ffffff', 0.4));
    badge.position.set(0, hipY + 0.33, 0.125);
    fig.add(lan, badge);
  }
  if (t === 'blouse') {
    const st = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 8, 28, Math.PI * 1.2), mat('#1d2f5a', 0.4));
    st.rotation.set(-0.2, 0, Math.PI * 0.9);
    st.position.set(0, hipY + 0.5, 0.07);
    fig.add(st);
  }

  // postures
  const [lL, rL] = legs;
  const [lA, rA] = arms;
  let lift = 0;
  if (o.pose === 'marche') {
    lL.g.rotation.x = -0.35;
    lL.mid.rotation.x = 0.2;
    rL.g.rotation.x = 0.3;
    rL.mid.rotation.x = 0.35;
    lA.g.rotation.x = 0.35;
    rA.g.rotation.x = -0.35;
    lA.mid.rotation.x = -0.3;
    rA.mid.rotation.x = -0.4;
  } else if (o.pose === 'discussion') {
    rA.g.rotation.x = -0.45;
    rA.g.rotation.z = 0.15;
    rA.mid.rotation.x = -1.25;
    lA.g.rotation.x = -0.15;
    lA.mid.rotation.x = -0.35;
    head.rotation.y = 0.15;
  } else if (o.pose === 'assis' || o.pose === 'assisHaut') {
    // posture calculée d'après la hauteur d'assise réelle (chaise, tabouret, chaise haute, canapé)
    // et l'appui des pieds (sol ou repose-pieds)
    const k0 = (o.h || 1.75) / 1.75;
    const s = (o.seatH ?? (o.pose === 'assis' ? 0.47 : 0.78)) / k0;
    const f = (o.footY ?? (o.pose === 'assis' ? 0 : 0.29)) / k0;
    const reach = legL2 + 0.01; // genou -> semelle
    const D = s + 0.07 - f; // hauteur du genou (cuisse horizontale) au-dessus de l'appui
    let thigh = 0;
    let shin = 0; // > 0 : pieds vers l'avant, < 0 : pieds repliés vers l'arrière
    if (D > reach) thigh = Math.min(0.7, Math.asin(Math.min(1, (D - reach) / legL1)));
    else shin = (f > 0.05 ? -1 : 1) * Math.acos(Math.max(0, D / reach));
    for (const L of legs) {
      L.g.rotation.x = -Math.PI / 2 + thigh;
      L.mid.rotation.x = Math.PI / 2 - thigh - shin;
    }
    const seat = s * k0;
    lA.g.rotation.x = -0.6;
    rA.g.rotation.x = -0.6;
    lA.mid.rotation.x = -0.8;
    rA.mid.rotation.x = -0.8;
    fig.traverse((m) => {
      if (m.userData.skirt) {
        m.scale.y = 0.4;
        m.position.y = hipY + 0.02;
        m.position.z = 0.08;
      }
    });
    lift = seat / k0 - (hipY - 0.07);
    fig.position.z = -0.12;
  } else {
    lA.mid.rotation.x = -0.12;
    rA.mid.rotation.x = -0.12;
  }
  fig.position.y = lift;
  const k = (o.h || 1.75) / 1.75;
  root.scale.setScalar(k);
  root.traverse((m) => {
    if (m.isMesh) m.userData.noBudget = true;
  });
  return root;
}

class RoundedFoot extends THREE.BufferGeometry {
  constructor() {
    super();
    const g = new THREE.CapsuleGeometry(0.045, 0.13, 4, 10);
    g.rotateX(Math.PI / 2);
    g.scale(1, 0.6, 1);
    this.copy(g);
  }
}
