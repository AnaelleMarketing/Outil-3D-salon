// Logo Spengler Medical en volume : la silhouette du PNG est vectorisée (marching squares) puis extrudée,
// le dégradé d'origine est conservé sur les faces et les tranches.
import * as THREE from 'three';

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/** Contours (polylignes fermées) d'un masque binaire */
function traceContours(mask, W, H) {
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? mask[y * W + x] : 0);
  const segs = [];
  // coins des cellules = centres de pixels ; sommets aux milieux d'arêtes
  for (let y = -1; y < H; y++) {
    for (let x = -1; x < W; x++) {
      const tl = at(x, y);
      const tr = at(x + 1, y);
      const br = at(x + 1, y + 1);
      const bl = at(x, y + 1);
      const c = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (c === 0 || c === 15) continue;
      const T = [x + 0.5, y];
      const R = [x + 1, y + 0.5];
      const B = [x + 0.5, y + 1];
      const L = [x, y + 0.5];
      const add = (a, b) => segs.push([a, b]);
      switch (c) {
        case 1: add(L, B); break;
        case 2: add(B, R); break;
        case 3: add(L, R); break;
        case 4: add(R, T); break;
        case 5: add(L, T); add(R, B); break;
        case 6: add(B, T); break;
        case 7: add(L, T); break;
        case 8: add(T, L); break;
        case 9: add(T, B); break;
        case 10: add(T, R); add(B, L); break;
        case 11: add(T, R); break;
        case 12: add(R, L); break;
        case 13: add(R, B); break;
        case 14: add(B, L); break;
      }
    }
  }
  const key = (p) => p[0] + ',' + p[1];
  const next = new Map();
  for (const [a, b] of segs) next.set(key(a), b);
  const used = new Set();
  const loops = [];
  for (const [a] of segs) {
    const k0 = key(a);
    if (used.has(k0)) continue;
    const loop = [];
    let p = a;
    let k = k0;
    while (!used.has(k) && next.has(k)) {
      used.add(k);
      loop.push(p);
      p = next.get(k);
      k = key(p);
    }
    if (loop.length > 8) loops.push(loop);
  }
  return loops;
}

function simplify(pts, eps) {
  if (pts.length < 4) return pts;
  const d2 = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
    const x = a[0] + t * dx - p[0];
    const y = a[1] + t * dy - p[1];
    return x * x + y * y;
  };
  const rdp = (arr) => {
    let max = 0;
    let idx = 0;
    for (let i = 1; i < arr.length - 1; i++) {
      const d = d2(arr[i], arr[0], arr[arr.length - 1]);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > eps * eps) return [...rdp(arr.slice(0, idx + 1)).slice(0, -1), ...rdp(arr.slice(idx))];
    return [arr[0], arr[arr.length - 1]];
  };
  const half = Math.floor(pts.length / 2);
  return [...rdp(pts.slice(0, half + 1)).slice(0, -1), ...rdp([...pts.slice(half), pts[0]]).slice(0, -1)];
}

const area = (l) => l.reduce((s, p, i) => s + p[0] * l[(i + 1) % l.length][1] - l[(i + 1) % l.length][0] * p[1], 0) / 2;
function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (poly[i][1] > pt[1] !== poly[j][1] > pt[1] && pt[0] < ((poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1])) / (poly[j][1] - poly[i][1]) + poly[i][0]) c = !c;
  }
  return c;
}

/** Crée le mesh 3D du logo (hauteur ≈ size unités) */
export async function createLogoMesh(src, { size = 9, depth = 1.2 } = {}) {
  const img = await loadImage(src);
  // texture avec débord de couleur (les tranches prennent la couleur du bord)
  const tc = document.createElement('canvas');
  tc.width = img.width;
  tc.height = img.height;
  const tg = tc.getContext('2d');
  for (let r = 6; r >= 1; r -= 1) for (let a = 0; a < 8; a++) tg.drawImage(img, Math.round(Math.cos((a * Math.PI) / 4) * r), Math.round(Math.sin((a * Math.PI) / 4) * r));
  tg.drawImage(img, 0, 0);
  const tex = new THREE.CanvasTexture(tc);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  // masque basse résolution pour la vectorisation
  const S = 360 / Math.max(img.width, img.height);
  const W = Math.round(img.width * S);
  const H = Math.round(img.height * S);
  const mc = document.createElement('canvas');
  mc.width = W;
  mc.height = H;
  const mg = mc.getContext('2d');
  mg.drawImage(img, 0, 0, W, H);
  const data = mg.getImageData(0, 0, W, H).data;
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) mask[i] = data[i * 4 + 3] > 120 ? 1 : 0;
  let loops = traceContours(mask, W, H).map((l) => simplify(l, 0.6)).filter((l) => Math.abs(area(l)) > 20);
  loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));

  // contours extérieurs / trous selon l'imbrication
  const shapes = [];
  const toV = (p) => new THREE.Vector2(p[0], H - p[1]);
  const outers = [];
  for (const l of loops) {
    const depthN = outers.filter((o) => inside(l[0], o.pts)).length;
    if (depthN % 2 === 0) {
      const shape = new THREE.Shape(l.map(toV));
      outers.push({ pts: l, shape });
      shapes.push(shape);
    } else {
      const parent = [...outers].reverse().find((o) => inside(l[0], o.pts));
      parent?.shape.holes.push(new THREE.Path(l.map(toV)));
    }
  }
  const k = size / H;
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: depth / k, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 0.8, bevelSegments: 2, curveSegments: 4 });
  // UV planaires : chaque point prend la couleur du logo à sa position (faces et tranches)
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / W, pos.getY(i) / H);
  uv.needsUpdate = true;
  geo.scale(k, k, k);
  geo.center();
  geo.computeVertexNormals();
  // faces : dégradé du logo ; tranches : aluminium bleuté
  const face = new THREE.MeshPhysicalMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.12, toneMapped: false });
  const side = new THREE.MeshPhysicalMaterial({ color: '#cfe6f0', metalness: 0.7, roughness: 0.22, clearcoat: 0.6 });
  return new THREE.Mesh(geo, [face, side]);
}
