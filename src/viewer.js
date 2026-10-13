// Moteur 3D : rendu, caméras (plan 2D / orbite / visiteur), qualité travail/rendu, captures.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { rad } from './util.js';

export const EYE = 1.65;

export class Viewer {
  constructor(container) {
    this.container = container;
    this.quality = 'work';
    this.mode = 'orbit';
    this.dirty = true;

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.9;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.append(r.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'labels-layer';
    container.append(this.labels.domElement);

    const s = (this.scene = new THREE.Scene());
    const pm = new THREE.PMREMGenerator(r);
    s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    s.environmentIntensity = 0.35;
    s.background = new THREE.Color('#3b5470');
    s.fog = new THREE.Fog('#7189a3', 18, 95);
    this.backdrop = this.makeBackdrop();
    s.add(this.backdrop);

    this.hemi = new THREE.HemisphereLight('#e8eef4', '#7d848c', 0.75);
    s.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#ffffff', 0.9));
    sun.position.set(-6, 14, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 6;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.02;
    s.add(sun, sun.target);

    const hall = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#c3c7cc', roughness: 0.85 }));
    hall.rotation.x = -Math.PI / 2;
    hall.position.y = -0.031;
    hall.receiveShadow = true;
    hall.userData.ground = true;
    this.hall = hall;
    s.add(hall);

    this.standGroup = new THREE.Group(); // sol, grille, cotes, environnement
    this.root = new THREE.Group(); // objets du stand
    this.helpers = new THREE.Group(); // sélection, alertes, mesures, épingles
    s.add(this.standGroup, this.root, this.helpers);

    const aspect = 1;
    this.persp = new THREE.PerspectiveCamera(50, aspect, 0.05, 500);
    this.persp.position.set(-3, 5, 12);
    this.ortho = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 200);
    this.ortho.up.set(0, 0, -1);
    this.camera = this.persp;

    this.orbit = new OrbitControls(this.persp, r.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.12;
    this.orbit.maxPolarAngle = Math.PI * 0.495;
    this.orbit.minDistance = 0.5;
    this.orbit.maxDistance = 80;
    this.orbit.addEventListener('change', () => this.invalidate());

    this.planCtl = new OrbitControls(this.ortho, r.domElement);
    this.planCtl.enableRotate = false;
    this.planCtl.screenSpacePanning = true;
    this.planCtl.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    this.planCtl.enabled = false;
    this.planCtl.addEventListener('change', () => this.invalidate());

    this.tc = new TransformControls(this.persp, r.domElement);
    this.tc.setMode('rotate');
    this.tc.showX = false;
    this.tc.showZ = false;
    this.tc.setRotationSnap(rad(15));
    this.tc.setSize(0.9);
    this.tc.addEventListener('dragging-changed', (e) => {
      this.orbit.enabled = !e.value && this.mode === 'orbit';
      this.planCtl.enabled = !e.value && this.mode === 'plan';
    });
    this.tc.addEventListener('change', () => this.invalidate());
    this.tcHelper = this.tc.getHelper();
    s.add(this.tcHelper);

    // visiteur
    this.visitor = { yaw: 0, pitch: -0.05, keys: new Set(), pos: new THREE.Vector3() };
    this.clock = new THREE.Clock();
    this.fps = 0;
    this.videos = 0;

    this.composer = null;
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    const loop = () => {
      requestAnimationFrame(loop);
      this.tick();
    };
    loop();
  }

  makeBackdrop() {
    const geo = new THREE.SphereGeometry(200, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#1f2f42') }, mid: { value: new THREE.Color('#7189a3') }, bot: { value: new THREE.Color('#7189a3') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float y=vP.y; vec3 c = y>0.0 ? mix(mid, top, smoothstep(0.0,0.45,y)) : mix(mid, bot, smoothstep(0.0,0.08,-y)); gl_FragColor=vec4(c,1.0); }',
    });
    const m = new THREE.Mesh(geo, mat);
    m.userData.noPick = true;
    return m;
  }

  invalidate() {
    this.dirty = true;
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
    this.persp.aspect = w / h;
    this.persp.updateProjectionMatrix();
    this.updateOrtho();
    if (this.composer) this.composer.setSize(w, h);
    this.invalidate();
  }

  setStandSize(W, D) {
    this.W = W;
    this.D = D;
    const span = Math.max(W, D) + 8;
    const sh = this.sun.shadow.camera;
    sh.left = -span;
    sh.right = span;
    sh.top = span;
    sh.bottom = -span;
    sh.updateProjectionMatrix();
    this.sun.target.position.set(W / 2, 0, D / 2);
    this.sun.position.set(W / 2 - 6, 14, D / 2 + 10);
    this.updateOrtho();
  }

  updateOrtho(zoomKeep = true) {
    const W = this.W || 8;
    const D = this.D || 3;
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    const a = w / h;
    const half = Math.max(D / 2 + 1.2, (W / 2 + 1.2) / a);
    this.ortho.left = -half * a;
    this.ortho.right = half * a;
    this.ortho.top = half;
    this.ortho.bottom = -half;
    if (!zoomKeep) this.ortho.zoom = 1;
    this.ortho.updateProjectionMatrix();
  }

  setMode(mode) {
    this.mode = mode;
    const W = this.W || 8;
    const D = this.D || 3;
    this.orbit.enabled = mode === 'orbit';
    this.planCtl.enabled = mode === 'plan';
    if (mode === 'plan') {
      this.camera = this.ortho;
      this.ortho.position.set(W / 2, 40, D / 2);
      this.planCtl.target.set(W / 2, 0, D / 2);
      this.ortho.zoom = 1;
      this.updateOrtho(false);
      this.planCtl.update();
    } else {
      this.camera = this.persp;
    }
    if (mode === 'visitor') {
      this.persp.fov = 62;
      this.visitor.pos.set(W / 2, EYE, D + 3.2);
      this.visitor.yaw = 0;
      this.visitor.pitch = -0.08;
      this.applyVisitor();
    } else this.persp.fov = 50;
    this.persp.updateProjectionMatrix();
    this.tc.camera = this.camera;
    this.invalidate();
  }

  homeOrbit() {
    const W = this.W || 8;
    const D = this.D || 3;
    const L = Math.max(W, D);
    this.orbit.target.set(W / 2, 1.4, D / 2);
    this.persp.position.set(W / 2 - L * 0.55, 3.4 + L * 0.12, D + L * 1.05);
    this.orbit.update();
    this.invalidate();
  }

  /** Déplacement animé de la caméra 3D (position et cible) */
  flyTo(pos, target, ms = 450) {
    const p0 = this.persp.position.clone();
    const t0 = this.orbit.target.clone();
    const start = performance.now();
    cancelAnimationFrame(this._fly);
    const step = (now) => {
      const k = Math.min(1, (now - start) / ms);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.orbit.target.lerpVectors(t0, target, e);
      // interpolation autour de la cible (évite de traverser le stand)
      const a = new THREE.Spherical().setFromVector3(p0.clone().sub(t0));
      const b = new THREE.Spherical().setFromVector3(pos.clone().sub(target));
      let dt = b.theta - a.theta;
      while (dt > Math.PI) dt -= Math.PI * 2;
      while (dt < -Math.PI) dt += Math.PI * 2;
      const sph = new THREE.Spherical(a.radius + (b.radius - a.radius) * e, a.phi + (b.phi - a.phi) * e, a.theta + dt * e);
      this.persp.position.setFromSpherical(sph).add(this.orbit.target);
      this.orbit.update();
      this.invalidate();
      if (k < 1) this._fly = requestAnimationFrame(step);
    };
    this._fly = requestAnimationFrame(step);
  }

  /** Fait tourner la vue autour du stand (degrés, sens inverse des aiguilles d'une montre si > 0) */
  turn(degrees) {
    const t = this.orbit.target.clone();
    const off = this.persp.position.clone().sub(t);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (degrees * Math.PI) / 180);
    this.flyTo(t.clone().add(off), t);
  }

  /** Vues rapides : face (allée), dos, côtés, dessus */
  sideView(side) {
    const W = this.W || 8;
    const D = this.D || 3;
    const L = Math.max(W, D);
    const t = new THREE.Vector3(W / 2, 1.2, D / 2);
    const dist = L * 1.15 + 2;
    const hgt = 2.6 + L * 0.12;
    const pos = {
      face: new THREE.Vector3(W / 2, hgt, D / 2 + dist),
      dos: new THREE.Vector3(W / 2, hgt, D / 2 - dist),
      gauche: new THREE.Vector3(W / 2 - dist, hgt, D / 2),
      droite: new THREE.Vector3(W / 2 + dist, hgt, D / 2),
      dessus: new THREE.Vector3(W / 2, L * 1.6 + 3, D / 2 + 0.6),
    }[side];
    if (pos) this.flyTo(pos, t);
  }

  applyVisitor() {
    const v = this.visitor;
    this.persp.position.copy(v.pos);
    const dir = new THREE.Vector3(Math.sin(v.yaw) * Math.cos(v.pitch), Math.sin(v.pitch), -Math.cos(v.yaw) * Math.cos(v.pitch));
    this.persp.lookAt(v.pos.clone().add(dir));
    this.invalidate();
  }

  visitorLook(dx, dy) {
    this.visitor.yaw += dx * 0.004;
    this.visitor.pitch = Math.max(-1.2, Math.min(1.2, this.visitor.pitch - dy * 0.004));
    this.applyVisitor();
  }

  visitorStep(f, s) {
    const v = this.visitor;
    const fw = new THREE.Vector3(Math.sin(v.yaw), 0, -Math.cos(v.yaw));
    const rt = new THREE.Vector3(Math.cos(v.yaw), 0, Math.sin(v.yaw));
    v.pos.addScaledVector(fw, f).addScaledVector(rt, s);
    v.pos.y = EYE;
    this.applyVisitor();
  }

  setQuality(q) {
    this.quality = q;
    const r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio, q === 'render' ? 2 : 1.5));
    if (q === 'render' && !this.composer) {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      const c = (this.composer = new EffectComposer(r));
      this.renderPass = new RenderPass(this.scene, this.camera);
      c.addPass(this.renderPass);
      this.gtao = new GTAOPass(this.scene, this.camera, w, h);
      this.gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 16 });
      this.gtao.blendIntensity = 0.85;
      c.addPass(this.gtao);
      this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.28, 0.5, 0.92);
      c.addPass(this.bloom);
      c.addPass(new OutputPass());
    }
    if (this.composer) this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.applyShadows();
    this.invalidate();
  }

  /** En mode rendu : ombres des spots (limitées aux 6 plus puissants pour rester fluide) */
  applyShadows() {
    const lights = [];
    this.root.traverse((o) => {
      if (o.isSpotLight) lights.push(o);
    });
    lights.sort((a, b) => b.intensity - a.intensity);
    lights.forEach((l, i) => {
      l.castShadow = this.quality === 'render' && i < 6;
    });
    this.sun.shadow.mapSize.set(this.quality === 'render' ? 4096 : 2048, this.quality === 'render' ? 4096 : 2048);
    if (this.sun.shadow.map) {
      this.sun.shadow.map.dispose();
      this.sun.shadow.map = null;
    }
  }

  tick() {
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.mode === 'visitor' && this.visitor.keys.size) {
      const k = this.visitor.keys;
      const sp = (k.has('shift') ? 3 : 1.4) * dt;
      const f = (k.has('w') || k.has('z') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
      const s = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('q') || k.has('arrowleft') ? 1 : 0);
      if (f || s) this.visitorStep(f * sp, s * sp);
    }
    if (this.mode === 'orbit') this.orbit.update();
    if (this.mode === 'plan') this.planCtl.update();
    if (!this.dirty && !this.videos) return;
    this.dirty = false;
    this.renderFrame();
    this.labels.render(this.scene, this.camera);
    this._frames = (this._frames || 0) + 1;
    const now = performance.now();
    if (!this._t0) this._t0 = now;
    if (now - this._t0 > 1000) {
      this.fps = Math.round((this._frames * 1000) / (now - this._t0));
      this._frames = 0;
      this._t0 = now;
      this.onFps?.(this.fps);
    }
  }

  renderFrame() {
    if (this.quality === 'render' && this.composer) {
      this.renderPass.camera = this.camera;
      this.gtao.camera = this.camera;
      this.composer.render();
    } else this.renderer.render(this.scene, this.camera);
  }

  /** Capture d'image haute définition (helpers masqués) */
  async capture(width, height, type = 'image/png', quality = 0.92) {
    const r = this.renderer;
    const w0 = this.container.clientWidth;
    const h0 = this.container.clientHeight;
    const pr = r.getPixelRatio();
    const hv = this.helpers.visible;
    const tv = this.tcHelper.visible;
    const grid = this.standGroup.getObjectByName('grid');
    const dims = this.standGroup.getObjectByName('dims');
    const handles = this.standGroup.getObjectByName('handles');
    if (handles) handles.visible = false;
    const gv = grid?.visible;
    const dv = dims?.visible;
    this.helpers.visible = false;
    this.tcHelper.visible = false;
    if (grid) grid.visible = false;
    if (dims) dims.visible = false;
    r.setPixelRatio(1);
    r.setSize(width, height, false);
    const cam = this.camera;
    const prevAspect = this.persp.aspect;
    if (cam.isPerspectiveCamera) {
      cam.aspect = width / height;
      cam.updateProjectionMatrix();
    } else {
      const half = (cam.top - cam.bottom) / 2;
      cam.left = -half * (width / height);
      cam.right = half * (width / height);
      cam.updateProjectionMatrix();
    }
    if (this.composer) this.composer.setSize(width, height);
    this.renderFrame();
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    c.getContext('2d').drawImage(r.domElement, 0, 0);
    // restauration
    this.helpers.visible = hv;
    this.tcHelper.visible = tv;
    if (grid) grid.visible = gv;
    if (dims) dims.visible = dv;
    if (handles) handles.visible = true;
    r.setPixelRatio(pr);
    r.setSize(w0, h0);
    this.persp.aspect = prevAspect;
    this.persp.updateProjectionMatrix();
    this.updateOrtho();
    if (this.composer) this.composer.setSize(w0, h0);
    this.invalidate();
    return new Promise((res) => c.toBlob(res, type, quality));
  }

  /** Panorama équirectangulaire 360° depuis la position de la caméra */
  async capture360(width = 4096) {
    const r = this.renderer;
    const size = width / 4;
    const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
    const cube = new THREE.CubeCamera(0.05, 500, rt);
    // point de vue : position du visiteur, sinon à hauteur d'yeux dans le stand
    let yaw = 0;
    if (this.mode === 'visitor') {
      cube.position.copy(this.visitor.pos);
      yaw = this.visitor.yaw;
    } else cube.position.set((this.W || 8) / 2, EYE, (this.D || 3) * 0.6);
    // le verre (transmission) n'est pas géré par la caméra cubique : verre simplifié le temps de la capture
    const glass = [];
    this.scene.traverse((o) => {
      if (o.material && o.material.transmission > 0 && !glass.some((g) => g[0] === o.material)) glass.push([o.material, o.material.transmission, o.material.opacity]);
    });
    for (const [m] of glass) Object.assign(m, { transmission: 0, opacity: 0.25, needsUpdate: true });
    const hv = this.helpers.visible;
    const tv = this.tcHelper.visible;
    this.helpers.visible = false;
    this.tcHelper.visible = false;
    const grid = this.standGroup.getObjectByName('grid');
    const dims = this.standGroup.getObjectByName('dims');
    const gv = grid?.visible;
    const dv = dims?.visible;
    if (grid) grid.visible = false;
    const handles = this.standGroup.getObjectByName('handles');
    if (dims) dims.visible = false;
    if (handles) handles.visible = false;
    cube.update(r, this.scene);
    if (dims) dims.visible = dv;
    if (handles) handles.visible = true;
    for (const [m, t, op] of glass) Object.assign(m, { transmission: t, opacity: op, needsUpdate: true });
    this.helpers.visible = hv;
    this.tcHelper.visible = tv;
    if (grid) grid.visible = gv;
    const mat = new THREE.ShaderMaterial({
      uniforms: { env: { value: rt.texture }, yaw: { value: yaw } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      fragmentShader: `uniform samplerCube env; uniform float yaw; varying vec2 vUv;
        void main(){
          float lon = (vUv.x - 0.5) * 6.2831853 + yaw;
          float lat = (vUv.y - 0.5) * 3.1415926;
          vec3 d = vec3(cos(lat)*sin(lon), sin(lat), -cos(lat)*cos(lon));
          gl_FragColor = textureCube(env, d);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      toneMapped: true,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const sc = new THREE.Scene();
    sc.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const w0 = this.container.clientWidth;
    const h0 = this.container.clientHeight;
    const pr = r.getPixelRatio();
    r.setPixelRatio(1);
    r.setSize(width, width / 2, false);
    r.render(sc, cam);
    const c = document.createElement('canvas');
    c.width = width;
    c.height = width / 2;
    c.getContext('2d').drawImage(r.domElement, 0, 0);
    r.setPixelRatio(pr);
    r.setSize(w0, h0);
    rt.dispose();
    mat.dispose();
    this.invalidate();
    return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92));
  }

  label(text, cls = 'dim-label') {
    const el = document.createElement('div');
    el.className = cls;
    el.textContent = text;
    return new CSS2DObject(el);
  }

  getView() {
    if (this.mode === 'plan') return { mode: 'plan', pos: this.ortho.position.toArray(), target: this.planCtl.target.toArray(), zoom: this.ortho.zoom };
    if (this.mode === 'visitor') return { mode: 'visitor', pos: this.visitor.pos.toArray(), yaw: this.visitor.yaw, pitch: this.visitor.pitch };
    return { mode: 'orbit', pos: this.persp.position.toArray(), target: this.orbit.target.toArray() };
  }

  setView(v) {
    this.setMode(v.mode);
    if (v.mode === 'plan') {
      this.ortho.position.fromArray(v.pos);
      this.planCtl.target.fromArray(v.target);
      this.ortho.zoom = v.zoom || 1;
      this.ortho.updateProjectionMatrix();
      this.planCtl.update();
    } else if (v.mode === 'visitor') {
      this.visitor.pos.fromArray(v.pos);
      this.visitor.yaw = v.yaw;
      this.visitor.pitch = v.pitch;
      this.applyVisitor();
    } else {
      this.persp.position.fromArray(v.pos);
      this.orbit.target.fromArray(v.target);
      this.orbit.update();
    }
    this.invalidate();
  }
}
