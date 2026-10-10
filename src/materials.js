import * as THREE from 'three';
import { rng } from './util.js';

/** Finitions PBR disponibles pour le mobilier et la structure */
export const FINISHES = {
  blanc_laque: { label: 'Blanc laqué', color: '#f4f5f6', roughness: 0.16, clearcoat: 0.8, clearcoatRoughness: 0.08 },
  blanc_mat: { label: 'Blanc mat', color: '#efefed', roughness: 0.85 },
  gris_sauge: { label: 'Gris-bleu Spengler', color: '#b5c6cb', roughness: 0.7 },
  gris_clair: { label: 'Gris clair', color: '#c9ccd0', roughness: 0.6 },
  anthracite: { label: 'Anthracite', color: '#3a3d42', roughness: 0.55 },
  noir_mat: { label: 'Noir mat', color: '#1d1e21', roughness: 0.8 },
  bois_chene: { label: 'Bois chêne', color: '#ffffff', roughness: 0.55, tex: 'wood' },
  bois_noyer: { label: 'Bois noyer', color: '#ffffff', roughness: 0.5, tex: 'walnut' },
  metal_brosse: { label: 'Métal brossé', color: '#c3c7cb', metalness: 1, roughness: 0.32, tex: 'brushed' },
  chrome: { label: 'Chrome', color: '#e9e9e9', metalness: 1, roughness: 0.06 },
  alu_noir: { label: 'Aluminium noir', color: '#2a2b2e', metalness: 0.9, roughness: 0.4 },
  verre: { label: 'Verre', color: '#eef6f6', roughness: 0.03, transmission: 0.94, thickness: 0.01, ior: 1.5 },
  plexi_depoli: { label: 'Plexi dépoli', color: '#f2f6f7', roughness: 0.35, transmission: 0.75, thickness: 0.01 },
  textile: { label: 'Textile', color: '#d9dee1', roughness: 1, sheen: 0.7 },
  couleur: { label: 'Couleur personnalisée', color: '#7aa6b8', roughness: 0.5 },
};

export const FLOORS = {
  moquette: 'Moquette',
  parquet: 'Parquet',
  pvc: 'PVC / sol souple',
  couleur: 'Couleur unie',
  texture: 'Texture importée',
};

const texCache = new Map();
function canvasTex(key, draw, size = 512) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}

function woodTex(dark) {
  return canvasTex(dark ? 'walnut' : 'wood', (g, s) => {
    const r = rng(dark ? 'noyer' : 'chene');
    g.fillStyle = dark ? '#5b3b26' : '#c9a273';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      const y = r() * s;
      g.strokeStyle = dark ? `rgba(30,15,5,${0.08 + r() * 0.2})` : `rgba(110,70,30,${0.05 + r() * 0.15})`;
      g.lineWidth = 0.5 + r() * 2.5;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= s; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 3 + (r() - 0.5) * 2);
      g.stroke();
    }
  });
}

function brushedTex() {
  return canvasTex('brushed', (g, s) => {
    const r = rng('brush');
    g.fillStyle = '#bdbdbd';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
      const v = 150 + r() * 100;
      g.strokeStyle = `rgba(${v},${v},${v},0.25)`;
      const y = r() * s;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(s, y);
      g.stroke();
    }
  });
}

export function carpetTex() {
  return canvasTex(
    'carpet',
    (g, s) => {
      const r = rng('carpet');
      const img = g.createImageData(s, s);
      for (let i = 0; i < s * s; i++) {
        const v = 200 + r() * 55;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    },
    256,
  );
}

const WOODS = {
  chene: (l) => [l + 40, l, l - 50],
  noyer: (l) => [l * 0.55 + 18, l * 0.38 + 4, l * 0.25],
  gris: (l) => [l * 0.75 + 30, l * 0.75 + 30, l * 0.75 + 34],
  blanchi: (l) => [l * 0.3 + 178, l * 0.28 + 172, l * 0.25 + 158],
};
export const WOOD_LABELS = { chene: 'Chêne clair', noyer: 'Chêne foncé', gris: 'Gris cérusé', blanchi: 'Blanchi' };

function parquetTex(wood = 'chene') {
  const tint = WOODS[wood] || WOODS.chene;
  return canvasTex('parquet_' + wood, (g, s) => {
    const r = rng('parquet');
    const ph = s / 8;
    for (let row = 0; row < 8; row++) {
      let x = -r() * s * 0.5;
      while (x < s) {
        const len = s * (0.35 + r() * 0.4);
        const l = 150 + r() * 40;
        g.fillStyle = `rgb(${tint(l).map(Math.round).join(',')})`;
        g.fillRect(x, row * ph, len, ph);
        g.strokeStyle = 'rgba(60,35,10,0.35)';
        g.strokeRect(x, row * ph, len, ph);
        for (let k = 0; k < 6; k++) {
          g.strokeStyle = `rgba(90,55,20,${0.06 + r() * 0.1})`;
          const yy = row * ph + r() * ph;
          g.beginPath();
          g.moveTo(x, yy);
          g.lineTo(x + len, yy + (r() - 0.5) * 4);
          g.stroke();
        }
        x += len;
      }
    }
  });
}

const matCache = new Map();
/** Matériau partagé pour une finition (+ teinte facultative) */
export function getMaterial(finish = 'blanc_laque', color = null) {
  const key = finish + '|' + (color || '');
  if (matCache.has(key)) return matCache.get(key);
  const f = FINISHES[finish] || FINISHES.blanc_laque;
  const p = {
    color: new THREE.Color(color || f.color),
    roughness: f.roughness ?? 0.5,
    metalness: f.metalness ?? 0,
  };
  if (f.clearcoat) Object.assign(p, { clearcoat: f.clearcoat, clearcoatRoughness: f.clearcoatRoughness });
  if (f.transmission) Object.assign(p, { transmission: f.transmission, thickness: f.thickness, ior: f.ior ?? 1.5, transparent: true });
  if (f.sheen) Object.assign(p, { sheen: f.sheen, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff') });
  if (f.tex === 'wood') p.map = woodTex(false);
  if (f.tex === 'walnut') p.map = woodTex(true);
  if (f.tex === 'brushed') p.roughnessMap = brushedTex();
  const m = new THREE.MeshPhysicalMaterial(p);
  matCache.set(key, m);
  return m;
}

export function emissiveMaterial(color, intensity = 2) {
  return new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}

/** Matériau de sol du stand */
export function floorMaterial(floor, W, D, texture) {
  const color = new THREE.Color(floor.color || '#5a97b0');
  let m;
  if (floor.type === 'moquette') {
    const t = carpetTex().clone();
    t.repeat.set(W * 2, D * 2);
    t.needsUpdate = true;
    m = new THREE.MeshStandardMaterial({ color, map: t, roughness: 1 });
  } else if (floor.type === 'parquet') {
    const t = parquetTex(floor.wood).clone();
    t.repeat.set(W / 2, D / 2);
    t.needsUpdate = true;
    m = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  } else if (floor.type === 'pvc') {
    m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  } else if (floor.type === 'texture' && texture) {
    const t = texture.clone();
    const tile = floor.tile || 1;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(W / tile, D / tile);
    t.needsUpdate = true;
    m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  } else {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  }
  return m;
}

/** Revêtements de sol proposés en un clic */
export const FLOOR_PRESETS = [
  { label: 'Moquette bleu Spengler', floor: { type: 'moquette', color: '#5b98b2' } },
  { label: 'Moquette bleu marine', floor: { type: 'moquette', color: '#26395a' } },
  { label: 'Moquette anthracite', floor: { type: 'moquette', color: '#3d4146' } },
  { label: 'Moquette gris clair', floor: { type: 'moquette', color: '#a9afb4' } },
  { label: 'Moquette noire', floor: { type: 'moquette', color: '#1f2023' } },
  { label: 'Moquette rouge', floor: { type: 'moquette', color: '#a3262a' } },
  { label: 'Moquette verte', floor: { type: 'moquette', color: '#4f7d4a' } },
  { label: 'Moquette beige', floor: { type: 'moquette', color: '#cbb99a' } },
  { label: 'Parquet chêne clair', floor: { type: 'parquet', wood: 'chene' } },
  { label: 'Parquet chêne foncé', floor: { type: 'parquet', wood: 'noyer' } },
  { label: 'Parquet gris cérusé', floor: { type: 'parquet', wood: 'gris' } },
  { label: 'Parquet blanchi', floor: { type: 'parquet', wood: 'blanchi' } },
  { label: 'PVC blanc', floor: { type: 'pvc', color: '#eef0f1' } },
  { label: 'PVC gris béton', floor: { type: 'pvc', color: '#9a9fa3' } },
];

export function sameFloor(a, b) {
  if (a.type !== b.type) return false;
  if (a.type === 'parquet') return (a.wood || 'chene') === (b.wood || 'chene');
  return (a.color || '').toLowerCase() === (b.color || '').toLowerCase();
}

const swCache = new Map();
/** Vignette d'aperçu d'un revêtement de sol */
export function floorSwatch(floor) {
  const key = JSON.stringify(floor);
  if (swCache.has(key)) return swCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  if (floor.type === 'parquet') {
    g.drawImage(parquetTex(floor.wood).image, 0, 0, 256, 256, 0, 0, 96, 96);
  } else {
    g.fillStyle = floor.color || '#888';
    g.fillRect(0, 0, 96, 96);
    if (floor.type === 'moquette') {
      g.globalCompositeOperation = 'multiply';
      g.drawImage(carpetTex().image, 0, 0, 96, 96);
    } else {
      const gr = g.createLinearGradient(0, 0, 96, 96);
      gr.addColorStop(0, 'rgba(255,255,255,.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 96, 96);
    }
  }
  const url = c.toDataURL();
  swCache.set(key, url);
  return url;
}
