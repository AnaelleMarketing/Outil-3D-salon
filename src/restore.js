// Restauration d'une sauvegarde complète de l'ancien site (outils/sauvegarde-ancien-site.js) :
// projets, versions, visuels et bibliothèque du compte connecté, sans rien écraser de l'existant.
import { get, set, currentUser } from './store.js';

const unpack = async (v) => {
  if (!v || !v.__blob) return v;
  const blob = await (await fetch(v.data)).blob();
  return v.name ? new File([blob], v.name, { type: blob.type }) : blob;
};

/** Ajoute à la liste existante les éléments (par id) qui n'y sont pas encore */
async function mergeList(key, incoming) {
  const cur = (await get(key)) || [];
  const ids = new Set(cur.map((x) => x.id));
  const added = (incoming || []).filter((x) => x && !ids.has(x.id));
  await set(key, [...cur, ...added]);
  return added.length;
}

export async function restoreBackup(file) {
  const data = JSON.parse(await file.text());
  if (data?.format !== 'stand3d-sauvegarde' || !data.dbs) throw new Error('Ce fichier n’est pas une sauvegarde de l’ancien site.');
  const target = currentUser === 'anaelle' || currentUser === 'local' ? 'keyval-store' : 'stand3d-' + currentUser;
  const withProjects = Object.keys(data.dbs).filter((n) => (data.dbs[n].projects || []).length);
  const name = data.dbs[target] ? target : withProjects.length === 1 ? withProjects[0] : null;
  if (!name) throw new Error(`La sauvegarde ne contient pas de projets pour le compte « ${currentUser} ».`);
  const entries = data.dbs[name];

  let projects = 0;
  for (const [key, value] of Object.entries(entries)) {
    if (key === 'lastProject' || key.startsWith('seed:')) continue;
    if (key === 'projects') projects = await mergeList(key, value);
    else if (key === 'assets:index') await mergeList(key, value);
    else if ((await get(key)) === undefined) await set(key, await unpack(value));
  }
  return projects;
}
