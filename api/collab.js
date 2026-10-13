// API de collaboration (Vercel Functions, runtime Node) – stockage privé Vercel Blob (région Paris).
// Données :
//   users/<id>/directory.json      projets visibles par les autres (nom, salon, date) pour les demandes
//   shared/<pid>/project.json      projet partagé { id, owner, members, project, assets, rev, updated, updatedBy }
//   shared/<pid>/assets/<aid>      fichiers (visuels, modèles) des projets partagés
//   requests/<rid>.json            demandes { id, type: invite|join, from, to, projectId, projectName, status, created }
import crypto from 'node:crypto';
import { put, get, list, del } from '@vercel/blob';

const COOKIE = 'stand3d_session';
const P = { access: 'private' };

function accounts() {
  const out = {};
  try {
    Object.assign(out, JSON.parse(process.env.STAND_USERS || '{}'));
  } catch (e) {
    /* ignoré */
  }
  if (process.env.STAND_USER && process.env.STAND_PASS) out[process.env.STAND_USER.toLowerCase()] ??= process.env.STAND_PASS;
  return Object.keys(out).map((k) => k.toLowerCase());
}
const display = (id) => id.charAt(0).toUpperCase() + id.slice(1);

/** Identité vérifiée à partir du cookie de session signé (jamais à partir du client) */
function whoami(request) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|; )' + COOKIE + '=([^;]+)'));
  if (!m) return null;
  const [payload, sig] = decodeURIComponent(m[1]).split('.');
  const [user, exp] = (payload || '').split('~');
  if (!user || !exp || !sig || Number(exp) < Date.now() || !accounts().includes(user)) return null;
  const good = crypto.createHmac('sha256', process.env.STAND_SECRET || '').update(payload).digest('hex');
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  return user;
}

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const safeId = (s) => /^[a-zA-Z0-9_-]{1,64}$/.test(String(s || ''));

async function readJSON(pathname) {
  const r = await get(pathname, { ...P, useCache: false }).catch(() => null);
  if (!r || !r.stream) return null;
  return new Response(r.stream).json();
}
const writeJSON = (pathname, data) => put(pathname, JSON.stringify(data), { ...P, allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });

async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}

const sharedPath = (pid) => `shared/${pid}/project.json`;
const metaOf = (s) => ({ id: s.id, name: s.project?.name, salon: s.project?.salon, owner: s.owner, members: s.members, rev: s.rev, updated: s.updated, updatedBy: s.updatedBy });

export async function GET(request) {
  const me = whoami(request);
  if (!me) return json({ error: 'non connecté' }, 401);
  const url = new URL(request.url);
  const a = url.searchParams.get('a');

  if (a === 'me') return json({ user: me, name: display(me), users: accounts().filter((u) => u !== me).map((u) => ({ id: u, name: display(u) })) });

  if (a === 'directory') {
    const out = [];
    for (const u of accounts().filter((x) => x !== me)) {
      const d = await readJSON(`users/${u}/directory.json`);
      out.push({ user: u, name: display(u), projects: d?.projects || [] });
    }
    return json(out);
  }

  if (a === 'requests') {
    const blobs = await listAll('requests/');
    const reqs = (await Promise.all(blobs.map((b) => readJSON(b.pathname)))).filter((r) => r && (r.to === me || r.from === me));
    reqs.sort((x, y) => y.created - x.created);
    return json(reqs.slice(0, 60));
  }

  if (a === 'shared') {
    const blobs = (await listAll('shared/')).filter((b) => b.pathname.endsWith('/project.json'));
    const all = (await Promise.all(blobs.map((b) => readJSON(b.pathname)))).filter((s) => s && s.members.includes(me));
    return json(all.map(metaOf));
  }

  if (a === 'project') {
    const id = url.searchParams.get('id');
    if (!safeId(id)) return json({ error: 'id invalide' }, 400);
    const s = await readJSON(sharedPath(id));
    if (!s) return json({ error: 'introuvable' }, 404);
    if (!s.members.includes(me)) return json({ error: 'accès refusé' }, 403);
    return json(s);
  }

  if (a === 'meta') {
    const id = url.searchParams.get('id');
    if (!safeId(id)) return json({ error: 'id invalide' }, 400);
    const s = await readJSON(sharedPath(id));
    if (!s) return json({ error: 'introuvable' }, 404);
    if (!s.members.includes(me)) return json({ error: 'accès refusé' }, 403);
    return json(metaOf(s));
  }

  if (a === 'asset') {
    const pid = url.searchParams.get('pid');
    const aid = url.searchParams.get('aid');
    if (!safeId(pid) || !safeId(aid)) return json({ error: 'id invalide' }, 400);
    const s = await readJSON(sharedPath(pid));
    if (!s || !s.members.includes(me)) return json({ error: 'accès refusé' }, 403);
    const r = await get(`shared/${pid}/assets/${aid}`, { ...P, useCache: false }).catch(() => null);
    if (!r || !r.stream) return json({ error: 'introuvable' }, 404);
    return new Response(r.stream, { headers: { 'content-type': r.blob?.contentType || 'application/octet-stream', 'cache-control': 'private, no-store' } });
  }

  return json({ error: 'action inconnue' }, 400);
}

export async function POST(request) {
  const me = whoami(request);
  if (!me) return json({ error: 'non connecté' }, 401);
  const url = new URL(request.url);
  const a = url.searchParams.get('a');

  // envoi d'un fichier (corps binaire)
  if (a === 'asset') {
    const pid = url.searchParams.get('pid');
    const aid = url.searchParams.get('aid');
    if (!safeId(pid) || !safeId(aid)) return json({ error: 'id invalide' }, 400);
    const s = await readJSON(sharedPath(pid));
    if (!s || !s.members.includes(me)) return json({ error: 'accès refusé' }, 403);
    const buf = Buffer.from(await request.arrayBuffer());
    if (buf.length > 4.4e6) return json({ error: 'fichier trop lourd (4 Mo max)' }, 413);
    await put(`shared/${pid}/assets/${aid}`, buf, { ...P, allowOverwrite: true, addRandomSuffix: false, contentType: request.headers.get('content-type') || 'application/octet-stream' });
    return json({ ok: true });
  }

  const body = await request.json().catch(() => ({}));

  if (a === 'directory') {
    const projects = (body.projects || []).slice(0, 200).map((p) => ({ id: String(p.id), name: String(p.name || '').slice(0, 120), salon: String(p.salon || '').slice(0, 120), updated: Number(p.updated) || 0 }));
    await writeJSON(`users/${me}/directory.json`, { user: me, projects, updated: Date.now() });
    return json({ ok: true });
  }

  // publication / mise à jour d'un projet partagé
  if (a === 'share' || a === 'save') {
    const p = body.project;
    if (!p || !safeId(p.id)) return json({ error: 'projet invalide' }, 400);
    const cur = await readJSON(sharedPath(p.id));
    if (cur && !cur.members.includes(me)) return json({ error: 'accès refusé' }, 403);
    if (!cur && a === 'save') return json({ error: 'projet non partagé' }, 404);
    if (cur && a === 'save' && body.baseRev != null && body.baseRev !== cur.rev) return json({ error: 'conflit', rev: cur.rev, updatedBy: cur.updatedBy }, 409);
    const next = {
      id: p.id,
      owner: cur?.owner || me,
      members: cur?.members || [me],
      project: p,
      assets: body.assets || cur?.assets || [],
      rev: (cur?.rev || 0) + 1,
      updated: Date.now(),
      updatedBy: me,
    };
    await writeJSON(sharedPath(p.id), next);
    return json(metaOf(next));
  }

  if (a === 'request') {
    const type = body.type;
    const to = String(body.to || '').toLowerCase();
    if (!['invite', 'join'].includes(type) || !accounts().includes(to) || to === me || !safeId(body.projectId)) return json({ error: 'demande invalide' }, 400);
    if (type === 'invite') {
      const s = await readJSON(sharedPath(body.projectId));
      if (!s || s.owner !== me) return json({ error: 'seul le propriétaire peut inviter' }, 403);
      if (s.members.includes(to)) return json({ error: 'déjà membre' }, 409);
    }
    const id = 'r' + crypto.randomBytes(6).toString('hex');
    const r = { id, type, from: me, to, projectId: body.projectId, projectName: String(body.projectName || '').slice(0, 120), message: String(body.message || '').slice(0, 300), status: 'pending', created: Date.now() };
    await writeJSON(`requests/${id}.json`, r);
    return json(r);
  }

  if (a === 'respond') {
    if (!safeId(body.id)) return json({ error: 'id invalide' }, 400);
    const r = await readJSON(`requests/${body.id}.json`);
    if (!r || r.to !== me || r.status !== 'pending') return json({ error: 'demande introuvable' }, 404);
    if (body.accept) {
      const s = await readJSON(sharedPath(r.projectId));
      if (!s) return json({ error: 'le projet doit d’abord être partagé' }, 409);
      const newcomer = r.type === 'invite' ? me : r.from;
      if (r.type === 'join' && s.owner !== me) return json({ error: 'seul le propriétaire peut accepter' }, 403);
      if (!s.members.includes(newcomer)) s.members.push(newcomer);
      await writeJSON(sharedPath(r.projectId), s);
    }
    r.status = body.accept ? 'accepted' : 'declined';
    r.answered = Date.now();
    await writeJSON(`requests/${r.id}.json`, r);
    return json(r);
  }

  if (a === 'leave') {
    if (!safeId(body.id)) return json({ error: 'id invalide' }, 400);
    const s = await readJSON(sharedPath(body.id));
    if (!s || !s.members.includes(me)) return json({ error: 'introuvable' }, 404);
    if (s.owner === me) {
      // le propriétaire arrête le partage : suppression de la copie en ligne
      const blobs = await listAll(`shared/${body.id}/`);
      if (blobs.length) await del(blobs.map((b) => b.url));
      return json({ ok: true, stopped: true });
    }
    s.members = s.members.filter((m) => m !== me);
    await writeJSON(sharedPath(body.id), s);
    return json({ ok: true });
  }

  return json({ error: 'action inconnue' }, 400);
}
