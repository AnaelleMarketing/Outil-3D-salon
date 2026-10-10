// Gestion des fichiers importés (visuels, vidéos, modèles 3D, polices), stockés en IndexedDB.
import * as THREE from 'three';
import { get, set, del } from 'idb-keyval';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { uid } from './util.js';

const MAX_TEX = 4096; // côté max d'une texture envoyée au GPU (compression automatique)
const mem = new Map(); // id -> { meta, blob, texture, model, video }
let index = [];

export async function initAssets() {
  index = (await get('assets:index')) || [];
  for (const m of index) mem.set(m.id, { meta: m });
}

export function listAssets(kind) {
  return [...mem.values()].map((e) => e.meta).filter((m) => m && (!kind || m.kind === kind) && m.library !== false);
}
export const getMeta = (id) => mem.get(id)?.meta || null;

async function saveIndex() {
  index = [...mem.values()].map((e) => e.meta).filter((m) => m && !m.builtin);
  await set('assets:index', index);
}

export async function addAsset(blob, meta) {
  const id = meta.id || uid('a');
  const m = { library: true, brand: '', created: Date.now(), ...meta, id };
  mem.set(id, { meta: m, blob });
  if (!m.builtin) {
    await set('asset:' + id, blob);
    await saveIndex();
  }
  await ensure(id);
  return id;
}

export async function updateMeta(id, patch) {
  const e = mem.get(id);
  if (!e) return;
  Object.assign(e.meta, patch);
  if (!e.meta.builtin) await saveIndex();
}

export async function removeAsset(id) {
  const e = mem.get(id);
  if (!e || e.meta.builtin) return;
  mem.delete(id);
  await del('asset:' + id);
  await saveIndex();
}

export async function getBlob(id) {
  const e = mem.get(id);
  if (!e) return null;
  if (!e.blob && !e.meta.builtin) e.blob = await get('asset:' + id);
  return e.blob || null;
}

function loadImage(blob) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

function toCanvas(img, maxSide) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.min(1, maxSide / Math.max(iw, ih));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(iw * s));
  c.height = Math.max(1, Math.round(ih * s));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function hasAlpha(canvas) {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.drawImage(canvas, 0, 0, s, s);
  const d = g.getImageData(0, 0, s, s).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}

/** Charge en mémoire GPU/JS l'asset (texture, modèle, vidéo, police) */
export async function ensure(id) {
  const e = mem.get(id);
  if (!e) return null;
  if (e.texture || e.model || e.font) return e;
  const blob = await getBlob(id);
  if (!blob) return null;
  const k = e.meta.kind;
  if (k === 'image') {
    const img = await loadImage(blob);
    const c = toCanvas(img, MAX_TEX);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    e.texture = t;
    e.meta.w = e.meta.w || img.naturalWidth;
    e.meta.h = e.meta.h || img.naturalHeight;
    if (e.meta.alpha === undefined) e.meta.alpha = hasAlpha(c);
    e.thumb = toCanvas(img, 256).toDataURL('image/jpeg', 0.8);
    if (e.meta.alpha) e.thumb = toCanvas(img, 256).toDataURL('image/png');
  } else if (k === 'video') {
    const v = document.createElement('video');
    v.src = URL.createObjectURL(blob);
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = 'anonymous';
    await new Promise((r) => {
      v.onloadeddata = r;
      v.onerror = r;
    });
    v.play().catch(() => {});
    const t = new THREE.VideoTexture(v);
    t.colorSpace = THREE.SRGBColorSpace;
    e.texture = t;
    e.video = v;
    e.meta.w = v.videoWidth;
    e.meta.h = v.videoHeight;
  } else if (k === 'model') {
    e.model = await parseModel(blob, e.meta.ext);
    const box = new THREE.Box3().setFromObject(e.model);
    e.box = box;
    if (!e.meta.unit) {
      const max = Math.max(...box.getSize(new THREE.Vector3()).toArray());
      e.meta.unit = max > 100 ? 0.001 : max > 10 ? 0.01 : 1;
    }
    let tris = 0;
    e.model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = o.receiveShadow = true;
        const g = o.geometry;
        tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      }
    });
    e.meta.tris = Math.round(tris);
  } else if (k === 'font') {
    const fam = e.meta.family || e.meta.name.replace(/\.[^.]+$/, '');
    const ff = new FontFace(fam, await blob.arrayBuffer());
    await ff.load();
    document.fonts.add(ff);
    e.font = ff;
    e.meta.family = fam;
  }
  return e;
}

async function parseModel(blob, ext) {
  ext = (ext || '').toLowerCase();
  if (ext === 'glb' || ext === 'gltf') {
    const buf = await blob.arrayBuffer();
    const gltf = await new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej));
    return gltf.scene;
  }
  if (ext === 'obj') {
    const obj = new OBJLoader().parse(await blob.text());
    obj.traverse((o) => {
      if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ color: '#d9d9d9', roughness: 0.5 });
    });
    return obj;
  }
  if (ext === 'fbx') return new FBXLoader().parse(await blob.arrayBuffer(), '');
  throw new Error('Format 3D non pris en charge : ' + ext);
}

export const texture = (id) => mem.get(id)?.texture || null;
export const thumb = (id) => mem.get(id)?.thumb || null;
export const modelEntry = (id) => mem.get(id) || null;
export function imageInfo(id) {
  const m = getMeta(id);
  return m ? { w: m.w || 1, h: m.h || 1, video: m.kind === 'video', alpha: !!m.alpha, demo: !!m.demo } : null;
}

async function rasterizePDF(file) {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await doc.getPage(1);
  const v1 = page.getViewport({ scale: 1 });
  const scale = Math.min(8, 6000 / Math.max(v1.width, v1.height));
  const vp = page.getViewport({ scale });
  const c = document.createElement('canvas');
  c.width = Math.round(vp.width);
  c.height = Math.round(vp.height);
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

async function rasterizeSVG(file) {
  const img = await loadImage(file);
  let w = img.naturalWidth || 1000;
  let hgt = img.naturalHeight || 1000;
  const s = 6000 / Math.max(w, hgt);
  const c = document.createElement('canvas');
  c.width = Math.round(w * s);
  c.height = Math.round(hgt * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

export const ACCEPT_IMAGES = '.jpg,.jpeg,.png,.webp,.svg,.pdf,.mp4,.webm,.mov';
export const ACCEPT_MODELS = '.glb,.gltf,.obj,.fbx';
export const ACCEPT_FONTS = '.ttf,.otf,.woff,.woff2';

/** Importe un fichier utilisateur et renvoie l'identifiant de l'asset */
export async function importFile(file, extra = {}) {
  const ext = file.name.split('.').pop().toLowerCase();
  const name = file.name;
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return addAsset(file, { name, kind: 'image', ...extra });
  if (ext === 'svg') return addAsset(await rasterizeSVG(file), { name, kind: 'image', vector: true, ...extra });
  if (ext === 'pdf') return addAsset(await rasterizePDF(file), { name, kind: 'image', vector: true, ...extra });
  if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return addAsset(file, { name, kind: 'video', ...extra });
  if (['glb', 'gltf', 'obj', 'fbx'].includes(ext)) return addAsset(file, { name, kind: 'model', ext, ...extra });
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return addAsset(file, { name, kind: 'font', ...extra });
  if (['step', 'stp', 'iges', 'igs'].includes(ext))
    throw new Error('Les fichiers CAO (STEP/IGES) doivent être convertis en GLB avant import (ex. avec CAD Assistant ou Blender).');
  if (['dwg', 'dxf'].includes(ext)) throw new Error('DWG/DXF : exportez le plan en PDF ou PNG pour l’importer en calque de fond.');
  throw new Error('Format non pris en charge : .' + ext);
}

export function fonts() {
  return listAssets('font').map((m) => m.family || m.name);
}
