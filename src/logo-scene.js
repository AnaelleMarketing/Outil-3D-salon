// Logo Spengler Medical en 3D qui tourne (page d'accueil, page « accès réservé ») : S extrudé, anneaux, suivi de la souris.
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import fontJson from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { createLogoMesh } from './logo3d.js';

/** Monte la scène dans `wrap` (dimensionnée sur `frame`) ; renvoie une fonction d'arrêt */
export function mountLogoScene(wrap, frame, logoUrl = 'brand/logo-s.png') {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  wrap.append(renderer.domElement);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  cam.position.set(0, 0, 17);

  // logo officiel extrudé (repli : « S » typographique)
  const group = new THREE.Group();
  let S = new THREE.Group();
  group.add(S);
  createLogoMesh(logoUrl, { size: 8, depth: 1.1 })
    .then((m) => {
      group.remove(S);
      S = m;
      group.add(S);
    })
    .catch(() => {
      const font = new FontLoader().parse(fontJson);
      const g = new TextGeometry('S', { font, size: 5, depth: 1.4, curveSegments: 24, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.12, bevelSegments: 8 });
      g.center();
      group.remove(S);
      S = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#4a86d9', roughness: 0.2, clearcoat: 1 }));
      group.add(S);
    });
  // anneaux gris-bleu autour du S
  const ringMat = new THREE.MeshStandardMaterial({ color: '#52e3e8', metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.55 });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.05, 16, 160), ringMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.025, 16, 160), ringMat);
  ring1.rotation.x = 1.25;
  ring2.rotation.x = 1.9;
  ring2.rotation.y = 0.4;
  group.add(ring1, ring2);
  scene.add(group);
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(4, 6, 8);
  const rim = new THREE.PointLight('#52e3e8', 60, 30);
  rim.position.set(-6, -2, -4);
  scene.add(key, rim, new THREE.AmbientLight('#9fc3d4', 0.4));

  const resize = () => {
    const w = frame.clientWidth;
    const hh = frame.clientHeight;
    renderer.setSize(w, hh);
    cam.aspect = w / hh;
    // S décalé à droite sur grand écran, centré sur mobile
    group.position.x = w > 900 ? 3.6 : 0;
    cam.position.z = w > 900 ? 17 : 30;
    cam.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  let mouseX = 0;
  let mouseY = 0;
  const onMove = (e) => {
    mouseX = (e.clientX / innerWidth - 0.5) * 2;
    mouseY = (e.clientY / innerHeight - 0.5) * 2;
  };
  frame.addEventListener('pointermove', onMove);
  const clock = new THREE.Clock();
  let running = true;
  const loop = () => {
    if (!running) return;
    requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    S.rotation.y = t * 0.7;
    group.position.y = Math.sin(t * 0.9) * 0.25;
    group.rotation.x += (mouseY * 0.15 - group.rotation.x) * 0.05;
    group.rotation.z += (-mouseX * 0.08 - group.rotation.z) * 0.05;
    ring1.rotation.z = t * 0.25;
    ring2.rotation.z = -t * 0.18;
    renderer.render(scene, cam);
  };
  loop();

  return () => {
    running = false;
    window.removeEventListener('resize', resize);
    frame.removeEventListener('pointermove', onMove);
    renderer.dispose();
    S.geometry?.dispose?.();
  };
}
