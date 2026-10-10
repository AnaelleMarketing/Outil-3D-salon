// Vignettes 3D des éléments de la bibliothèque (rendues hors écran, en tâche de fond).
import * as THREE from 'three';
import { buildObject } from './objects.js';

let renderer;
let scene;
let cam;
const cache = new Map();
const queue = [];
let running = false;

function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(160, 120);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#8d949b', 2.2));
  const d = new THREE.DirectionalLight('#ffffff', 1.6);
  d.position.set(2, 4, 3);
  scene.add(d);
  cam = new THREE.PerspectiveCamera(28, 160 / 120, 0.01, 100);
}

export function thumbFor(obj, img) {
  const key = JSON.stringify(obj);
  if (cache.has(key)) {
    img.src = cache.get(key);
    return;
  }
  queue.push({ obj, key, img });
  if (!running) {
    running = true;
    requestAnimationFrame(pump);
  }
}

function pump() {
  if (!renderer) setup();
  const t0 = performance.now();
  while (queue.length && performance.now() - t0 < 12) {
    const { obj, key, img } = queue.shift();
    if (!cache.has(key)) cache.set(key, render(obj));
    img.src = cache.get(key);
  }
  if (queue.length) requestAnimationFrame(pump);
  else running = false;
}

function render(o) {
  let g;
  try {
    g = buildObject({ id: 'thumb', x: 0, y: 0, z: 0, rot: 0, ...o, y: 0 });
  } catch (e) {
    return '';
  }
  g.traverse((m) => {
    if (m.isSpotLight) m.intensity = 0;
  });
  scene.add(g);
  const box = g.userData.box;
  const c = box.getCenter(new THREE.Vector3());
  const r = Math.max(0.05, box.getSize(new THREE.Vector3()).length() / 2);
  const dir = new THREE.Vector3(0.9, 0.55, 1.4).normalize();
  const dist = r / Math.sin(THREE.MathUtils.degToRad(14)) * 1.02;
  cam.position.copy(c).addScaledVector(dir, dist);
  cam.near = dist / 50;
  cam.far = dist * 4;
  cam.updateProjectionMatrix();
  cam.lookAt(c);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(g);
  g.traverse((m) => m.geometry?.dispose());
  return url;
}
