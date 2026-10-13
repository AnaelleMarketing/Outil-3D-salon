// Exports : images HD, panorama 360°, plan coté PDF, liste CSV, GLB, fichier projet.
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import * as assets from './assets.js';
import { TYPES, isSupport, ALL_IMAGE_KEYS, IMAGE_LABELS } from './objects.js';
import { FINISHES } from './materials.js';
import { budget } from './planner.js';
import { download, slug, blobToDataURL, dataURLToBlob, rad, uid } from './util.js';

const fname = (app, suffix, ext) => `${slug(app.project.name)}_${suffix}.${ext}`;

async function withQuality(app, q, fn) {
  const v = app.viewer;
  const prev = v.quality;
  if (q && q !== prev) v.setQuality(q);
  try {
    return await fn();
  } finally {
    if (q && q !== prev) v.setQuality(prev);
  }
}

export async function exportImage(app, w, h, type = 'image/jpeg', quality = 'render', name) {
  const blob = await withQuality(app, quality, () => app.viewer.capture(w, h, type, 0.93));
  download(blob, fname(app, slug(name || 'vue') + `_${w}x${h}`, type === 'image/png' ? 'png' : 'jpg'));
}

export async function exportViews(app, views, w, h, type) {
  const v = app.viewer;
  const cur = v.getView();
  await withQuality(app, 'render', async () => {
    for (const view of views) {
      v.setView(view);
      await new Promise((r) => setTimeout(r, 60));
      const blob = await v.capture(w, h, type, 0.93);
      download(blob, fname(app, slug(view.name), type === 'image/png' ? 'png' : 'jpg'));
      await new Promise((r) => setTimeout(r, 350));
    }
  });
  v.setView(cur);
  app.sync();
}

export async function export360(app) {
  const v = app.viewer;
  const blob = await withQuality(app, 'render', () => v.capture360(4096));
  download(blob, fname(app, 'panorama-360', 'jpg'));
}

export async function exportGLB(app) {
  const v = app.viewer;
  const scene = new THREE.Scene();
  const floor = v.standGroup.children.find((c) => c.userData.ground && !c.userData.plan);
  if (floor) scene.add(floor.clone());
  for (const o of app.project.objects) {
    const e = app.cache.get(o.id);
    if (e && e.group.visible) {
      const c = e.group.clone(true);
      c.name = o.name;
      scene.add(c);
    }
  }
  const data = await new Promise((res, rej) => new GLTFExporter().parse(scene, res, rej, { binary: true, onlyVisible: true, maxTextureSize: 4096 }));
  download(new Blob([data], { type: 'model/gltf-binary' }), fname(app, 'stand', 'glb'));
}

/* ---------------- liste des éléments ---------------- */

function rows(app) {
  return app.project.objects.filter((o) => o.type !== 'person').map((o, i) => {
    const f = app.footprint(o);
    const b = app.cache.get(o.id)?.group.userData.box;
    const size = b ? b.getSize(new THREE.Vector3()) : new THREE.Vector3();
    const imgs = (TYPES[o.type]?.images || []).map((k) => o[k] && assets.getMeta(o[k])?.name).filter(Boolean);
    return {
      n: i + 1,
      o,
      name: o.name,
      type: TYPES[o.type]?.label || o.type,
      zone: o.zone || '',
      brand: o.brand || '',
      ref: o.ref || '',
      w: Math.round(size.x * 1000),
      d: Math.round(size.z * 1000),
      h: Math.round(size.y * 1000),
      x: Math.round(o.x * 1000),
      z: Math.round(o.z * 1000),
      y: Math.round((o.y || 0) * 1000),
      rot: o.rot || 0,
      finish: FINISHES[o.finish]?.label || '',
      color: o.color || '',
      visuals: imgs.join(' + '),
      top: f ? Math.round(f.y1 * 1000) : 0,
    };
  });
}

export function exportCSV(app) {
  const p = app.project;
  const R = rows(app);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [];
  lines.push([`Projet : ${p.name}`, p.salon, p.lieu, p.hall, p.dates, `Stand ${p.stand.w * 1000} x ${p.stand.d * 1000} mm`, `Hauteur max ${p.stand.hMax * 1000} mm`].map(esc).join(';'));
  lines.push('');
  lines.push(['N°', 'Désignation', 'Type', 'Zone', 'Marque', 'Référence', 'Largeur (mm)', 'Profondeur (mm)', 'Hauteur (mm)', 'X centre (mm)', 'Z centre (mm)', 'Élévation (mm)', 'Rotation (°)', 'Finition', 'Couleur', 'Visuels'].join(';'));
  for (const r of R) lines.push([r.n, r.name, r.type, r.zone, r.brand, r.ref, r.w, r.d, r.h, r.x, r.z, r.y, r.rot, r.finish, r.color, r.visuals].map(esc).join(';'));
  lines.push('');
  lines.push('RÉCAPITULATIF PAR ARTICLE');
  lines.push(['Désignation', 'Type', 'Dimensions (mm)', 'Finition', 'Quantité'].join(';'));
  const agg = new Map();
  for (const r of R) {
    const k = [r.name.replace(/\s+\d+$/, ''), r.type, `${r.w} x ${r.d} x ${r.h}`, r.finish].join('|');
    agg.set(k, (agg.get(k) || 0) + 1);
  }
  for (const [k, q] of agg) lines.push([...k.split('|'), q].map(esc).join(';'));
  lines.push('');
  lines.push('VISUELS À IMPRIMER');
  lines.push(['Support', 'Face', 'Fichier', 'Format (mm)', 'Résolution à taille réelle'].join(';'));
  for (const o of p.objects) {
    const ud = app.cache.get(o.id)?.group.userData;
    for (const k of TYPES[o.type]?.images || []) {
      if (!o[k]) continue;
      const m = assets.getMeta(o[k]);
      const mesh = [];
      app.cache.get(o.id)?.group.traverse((x) => x.userData.imageKey === k && x.geometry && mesh.push(x));
      let fmt = '';
      if (mesh[0]) {
        mesh[0].geometry.computeBoundingBox();
        const s = mesh[0].geometry.boundingBox.getSize(new THREE.Vector3());
        fmt = `${Math.round(Math.max(s.x, s.z) * 1000)} x ${Math.round(s.y * 1000)}`;
      }
      lines.push([o.name, ({ image: 'avant', imageBack: 'arrière', imageSide: 'côté' }[k] || IMAGE_LABELS[k] || k), m?.name || '', fmt, ud?.dpi?.[k] ? ud.dpi[k] + ' dpi' : ''].map(esc).join(';'));
    }
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  download(blob, fname(app, 'liste-elements', 'csv'));
}

/* ---------------- plan coté PDF ---------------- */

const latin = (s) =>
  String(s ?? '')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[↔]/g, '-')
    .replace(/[^\u0000-ÿ–—…•€]/g, '')
    .trim();

const CAT_COLORS = {
  Structure: [214, 226, 232],
  support: [236, 236, 236],
  produit: [255, 236, 210],
  default: [245, 245, 245],
};

export function exportPlanPDF(app, den = 40) {
  const p = app.project;
  const { w: W, d: D } = p.stand;
  const s = 1000 / den; // mm papier par mètre
  const formats = [
    ['a3', 420, 297],
    ['a2', 594, 420],
    ['a1', 841, 594],
    ['a0', 1189, 841],
  ];
  const fmt = formats.find(([, fw, fh]) => W * s + 70 <= fw && D * s + 110 <= fh) || formats[3];
  const [fname_, FW, FH] = fmt;
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: fname_ });
  const ox = (FW - W * s) / 2;
  const oy = 34;
  const P = (x, z) => [ox + x * s, oy + z * s];

  // en-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(latin(p.name), 12, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(latin([p.salon, p.lieu, p.hall, p.dates].filter(Boolean).join('  •  ')), 12, 20);

  // grille 1 m
  doc.setDrawColor(225);
  doc.setLineWidth(0.1);
  for (let x = 0; x <= W + 1e-6; x += 1) doc.line(...P(x, 0), ...P(x, D));
  for (let z = 0; z <= D + 1e-6; z += 1) doc.line(...P(0, z), ...P(W, z));

  // calque des objets
  const sorted = [...p.objects].sort((a, b) => Number(!!TYPES[a.type]?.hanging) - Number(!!TYPES[b.type]?.hanging));
  const numbers = new Map(p.objects.filter((o) => o.type !== 'person').map((o, i) => [o.id, i + 1]));
  doc.setLineWidth(0.25);
  for (const o of sorted) {
    if (!app.isVisible(o) || !app.cache.has(o.id) || o.type === 'person') continue;
    const T = TYPES[o.type] || {};
    if (o.type === 'spot' || o.type === 'led') {
      const [cx, cy] = P(o.x, o.z);
      doc.setDrawColor(200, 150, 0);
      doc.circle(cx, cy, 1.2, 'S');
      continue;
    }
    const col = T.hanging ? null : o.type === 'product' || o.type === 'model' ? CAT_COLORS.produit : ['wall', 'curvedWall', 'storage', 'lightbox'].includes(o.type) ? CAT_COLORS.Structure : isSupport(o) ? CAT_COLORS.support : CAT_COLORS.default;
    doc.setDrawColor(40);
    if (T.hanging) doc.setLineDashPattern([1.5, 1], 0);
    else doc.setLineDashPattern([], 0);
    if (col) doc.setFillColor(...col);
    const style = col ? 'FD' : 'S';
    if (o.type === 'curvedWall') {
      const R = o.radius;
      const a = rad(o.angle);
      const c = R * Math.cos(a / 2);
      const pts = [];
      const N = 24;
      for (let i = 0; i <= N; i++) {
        const th = -a / 2 + (a * i) / N;
        pts.push([R * Math.sin(th), R * Math.cos(th) - c]);
      }
      for (let i = N; i >= 0; i--) {
        const th = -a / 2 + (a * i) / N;
        pts.push([(R - o.d) * Math.sin(th), (R - o.d) * Math.cos(th) - c]);
      }
      polygon(doc, pts.map(([lx, lz]) => P(...world(o, lx, lz))), style);
    } else if (['mangeDebout', 'bin', 'plant'].includes(o.type) || (o.type === 'stool' && true)) {
      const [cx, cy] = P(o.x, o.z);
      doc.circle(cx, cy, (o.w / 2) * s, style);
    } else if (T.hollow) {
      for (const f of app.parts(o)) polygon(doc, f.poly.map((q) => P(q.x, q.z)), style);
    } else {
      const f = app.footprint(o);
      polygon(doc, f.poly.map((q) => P(q.x, q.z)), style);
      // flèche de face avant
      if (['counter', 'wall', 'lightbox', 'tv', 'display', 'rollup', 'brochure'].includes(o.type)) {
        const [fx, fz] = world(o, 0, (app.cache.get(o.id).group.userData.box.max.z || 0) + 0.12);
        const [cx, cy] = P(fx, fz);
        doc.setFillColor(120);
        doc.circle(cx, cy, 0.5, 'F');
      }
    }
    doc.setLineDashPattern([], 0);
    // libellé
    const f = app.footprint(o);
    const minx = Math.min(...f.poly.map((q) => q.x));
    const maxx = Math.max(...f.poly.map((q) => q.x));
    const minz = Math.min(...f.poly.map((q) => q.z));
    const maxz = Math.max(...f.poly.map((q) => q.z));
    const [cx, cy] = P((minx + maxx) / 2, (minz + maxz) / 2);
    const wpx = (maxx - minx) * s;
    const hpx = (maxz - minz) * s;
    doc.setTextColor(30);
    doc.setFontSize(6);
    const num = String(numbers.get(o.id));
    if (T.hanging) {
      doc.setTextColor(90);
      doc.text(latin(`${num} · ${o.name} (suspendu, h ${Math.round(f.y0 * 1000)}–${Math.round(f.y1 * 1000)})`), cx, cy + hpx / 2 + 3, { align: 'center' });
    } else if (wpx > 22 && hpx > 7) {
      doc.text(latin(num + ' · ' + o.name), cx, cy - 0.6, { align: 'center', maxWidth: wpx - 2 });
      doc.setFontSize(5);
      doc.text(`${Math.round((maxx - minx) * 1000)} x ${Math.round((maxz - minz) * 1000)} h${Math.round(f.y1 * 1000)}`, cx, cy + 2.2, { align: 'center' });
    } else {
      doc.text(num, cx, cy + 1, { align: 'center' });
    }
  }

  // contour du stand : côtés fermés en trait fort, ouverts en tirets
  const edges = {
    back: [0, 0, W, 0],
    right: [W, 0, W, D],
    front: [W, D, 0, D],
    left: [0, D, 0, 0],
  };
  for (const [side, [x0, z0, x1, z1]] of Object.entries(edges)) {
    const open = p.stand.open.includes(side);
    doc.setDrawColor(0);
    doc.setLineWidth(open ? 0.3 : 0.9);
    doc.setLineDashPattern(open ? [3, 2] : [], 0);
    doc.line(...P(x0, z0), ...P(x1, z1));
    if (open) {
      doc.setFontSize(7);
      doc.setTextColor(120);
      const [mx, my] = P((x0 + x1) / 2, (z0 + z1) / 2);
      const off = { front: [0, 14], back: [0, -12], left: [-14, 0], right: [14, 0] }[side];
      doc.text('ALLÉE', mx + off[0], my + off[1], { align: 'center' });
    }
  }
  doc.setLineDashPattern([], 0);

  // cotes générales
  doc.setTextColor(0, 70, 140);
  doc.setDrawColor(0, 70, 140);
  doc.setLineWidth(0.15);
  dimH(doc, P(0, 0)[0], P(W, 0)[0], P(0, 0)[1] - 9, Math.round(W * 1000));
  dimV(doc, P(W, 0)[1], P(W, D)[1], P(W, 0)[0] + 9, Math.round(D * 1000));

  // chaîne de cotes en façade (structure et mobilier principal)
  const xs = new Set([0, Math.round(W * 1000)]);
  const zs = new Set([0, Math.round(D * 1000)]);
  for (const o of p.objects) {
    if (!app.isVisible(o) || !app.cache.has(o.id)) continue;
    const T = TYPES[o.type] || {};
    if (!['wall', 'curvedWall', 'storage', 'lightbox', 'counter', 'tableHaute', 'mangeDebout', 'podium', 'display', 'lowTable', 'sofa', 'steps'].includes(o.type) || T.hanging) continue;
    const f = app.footprint(o);
    for (const q of f.poly) {
      xs.add(Math.round(Math.min(W, Math.max(0, q.x)) * 100) * 10);
      zs.add(Math.round(Math.min(D, Math.max(0, q.z)) * 100) * 10);
    }
  }
  const chain = (set) => {
    const arr = [...set].sort((a, b) => a - b);
    const out = [arr[0]];
    for (const v of arr.slice(1)) if (v - out[out.length - 1] >= 80) out.push(v);
    const last = arr[arr.length - 1];
    if (out[out.length - 1] !== last) out.length > 1 ? (out[out.length - 1] = last) : out.push(last);
    return out;
  };
  const cx = chain(xs);
  doc.setFontSize(5);
  const yb = P(0, D)[1] + 9;
  for (let i = 0; i < cx.length - 1; i++) dimH(doc, P(cx[i] / 1000, 0)[0], P(cx[i + 1] / 1000, 0)[0], yb, cx[i + 1] - cx[i], 5);
  const cz = chain(zs);
  const xl = P(0, 0)[0] - 9;
  for (let i = 0; i < cz.length - 1; i++) dimV(doc, P(0, cz[i] / 1000)[1], P(0, cz[i + 1] / 1000)[1], xl, cz[i + 1] - cz[i], 5);

  // cartouche
  const bw = 150;
  const bh = 30;
  const bx = FW - bw - 10;
  const by = FH - bh - 8;
  doc.setTextColor(0);
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(bx, by, bw, bh);
  doc.line(bx + 75, by, bx + 75, by + bh);
  const cell = (x, y, k, v) => {
    doc.setFontSize(6);
    doc.setTextColor(110);
    doc.text(k, x, y);
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text(latin(v || '—'), x + 22, y, { maxWidth: 50 });
  };
  cell(bx + 3, by + 6, 'Projet', p.name);
  cell(bx + 3, by + 13, 'Salon', p.salon);
  cell(bx + 3, by + 20, 'Lieu', p.lieu);
  cell(bx + 3, by + 27, 'Hall / stand', p.hall);
  cell(bx + 78, by + 6, 'Dates', p.dates);
  cell(bx + 78, by + 13, 'Échelle', `1:${den}  (format ${fname_.toUpperCase()})`);
  cell(bx + 78, by + 20, 'Stand', `${W * 1000} x ${D * 1000} mm, h max ${p.stand.hMax * 1000} mm`);
  cell(bx + 78, by + 27, 'Édité le', new Date().toLocaleDateString('fr-FR') + ' – ' + ({ brouillon: 'brouillon', avalider: 'à valider', valide: 'validé' }[p.status] || ''));
  doc.setFontSize(6);
  doc.setTextColor(110);
  doc.text('Cotes en millimètres. Origine : angle arrière gauche du stand. Trait fort : côté fermé ; tirets : côté ouvert sur allée ; pointillés : éléments suspendus.', 12, FH - 10);

  // page 2 : nomenclature
  doc.addPage(fname_, 'l');
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(latin('Liste des éléments – ' + p.name), 12, 14);
  doc.setFont('helvetica', 'normal');
  const cols = [
    ['N°', 10],
    ['Désignation', 70],
    ['Type', 34],
    ['Zone', 26],
    ['Marque', 26],
    ['L x P x H (mm)', 40],
    ['X / Z (mm)', 30],
    ['Élév.', 14],
    ['Rot.', 12],
    ['Finition', 32],
    ['Visuels', 70],
  ];
  let y = 24;
  const head = () => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    let x = 12;
    for (const [c, w] of cols) {
      doc.text(latin(c), x, y);
      x += w;
    }
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(150);
    doc.line(12, y + 1.5, FW - 12, y + 1.5);
    y += 6;
  };
  head();
  for (const r of rows(app)) {
    if (y > FH - 12) {
      doc.addPage(fname_, 'l');
      y = 16;
      head();
    }
    const vals = [r.n, r.name, r.type, r.zone, r.brand, `${r.w} x ${r.d} x ${r.h}`, `${r.x} / ${r.z}`, r.y, r.rot + '°', r.finish, r.visuals];
    let x = 12;
    doc.setFontSize(7);
    vals.forEach((v, i) => {
      doc.text(latin(v).slice(0, Math.floor(cols[i][1] / 1.35)), x, y);
      x += cols[i][1];
    });
    y += 4.6;
  }
  download(doc.output('blob'), fname(app, `plan-cote-1-${den}`, 'pdf'));
}

function world(o, lx, lz) {
  const c = Math.cos(rad(o.rot || 0));
  const s = Math.sin(rad(o.rot || 0));
  return [o.x + lx * c + lz * s, o.z - lx * s + lz * c];
}

function polygon(doc, pts, style) {
  doc.moveTo(pts[0][0], pts[0][1]);
  for (const q of pts.slice(1)) doc.lineTo(q[0], q[1]);
  doc.close();
  if (style === 'FD') doc.fillStroke();
  else if (style === 'F') doc.fill();
  else doc.stroke();
}

function dimH(doc, x0, x1, y, val, fs = 7) {
  if (x1 - x0 < 0.5) return;
  doc.line(x0, y, x1, y);
  doc.line(x0, y - 1.5, x0, y + 1.5);
  doc.line(x1, y - 1.5, x1, y + 1.5);
  doc.setFontSize(fs);
  doc.text(String(val), (x0 + x1) / 2, y - 1, { align: 'center' });
}

function dimV(doc, y0, y1, x, val, fs = 7) {
  if (y1 - y0 < 0.5) return;
  doc.line(x, y0, x, y1);
  doc.line(x - 1.5, y0, x + 1.5, y0);
  doc.line(x - 1.5, y1, x + 1.5, y1);
  doc.setFontSize(fs);
  doc.text(String(val), x - 1, (y0 + y1) / 2, { align: 'center', angle: 90 });
}

/* ---------------- fichier projet ---------------- */

function referencedAssets(p) {
  const ids = new Set();
  for (const o of p.objects) for (const k of [...ALL_IMAGE_KEYS, 'model']) if (o[k]) ids.add(o[k]);
  if (p.stand.plan?.asset) ids.add(p.stand.plan.asset);
  if (p.stand.floor?.asset) ids.add(p.stand.floor.asset);
  for (const f of assets.listAssets('font')) ids.add(f.id);
  return [...ids].filter((id) => !id.startsWith('builtin:'));
}

export async function exportProject(app) {
  const p = app.project;
  const out = { format: 'stand3d', version: 1, exported: Date.now(), project: p, assets: [] };
  for (const id of referencedAssets(p)) {
    const meta = assets.getMeta(id);
    const blob = await assets.getBlob(id);
    if (meta && blob) out.assets.push({ meta, data: await blobToDataURL(blob) });
  }
  download(new Blob([JSON.stringify(out)], { type: 'application/json' }), fname(app, 'projet', 'stand3d.json'));
}

export async function importProject(app, file) {
  const data = JSON.parse(await file.text());
  if (data.format !== 'stand3d') throw new Error('Ce fichier n’est pas un projet Stand 3D.');
  for (const a of data.assets || []) {
    if (assets.getMeta(a.meta.id)) continue;
    await assets.addAsset(await dataURLToBlob(a.data), a.meta);
  }
  const p = data.project;
  p.id = uid('p');
  await app.loadProject(p, { fresh: true });
}

export function exportBudgetCSV(app) {
  const p = app.project;
  const B = budget(app);
  const n = (v) => String(Math.round(v * 100) / 100).replace('.', ',');
  const lines = [`Devis estimatif – ${p.name};${p.salon || ''};Stand ${p.stand.w} x ${p.stand.d} m`, '', 'Poste;Désignation;Quantité;Unité;Prix unitaire HT (€);Total HT (€)'];
  for (const l of B.lines) lines.push([l.group, l.label, n(l.qty), l.unit, n(l.price), n(l.total)].join(';'));
  lines.push('', `;;;;TOTAL HT;${n(B.total)}`, '', 'Tarifs indicatifs de location, hors produits, transport et montage.');
  download(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), fname(app, 'devis-estimatif', 'csv'));
}
