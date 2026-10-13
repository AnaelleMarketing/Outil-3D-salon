// Stockage local (IndexedDB) séparé par compte : chaque utilisateur a ses propres projets et sa bibliothèque.
// Le compte « anaelle » (et le mode local) garde la base historique pour ne rien perdre.
import { get as g, set as s, del as d, createStore } from 'idb-keyval';

let store;
export let currentUser = 'local';

export function setUser(user) {
  currentUser = user || 'local';
  store = !user || user === 'anaelle' || user === 'local' ? undefined : createStore('stand3d-' + user, 'keyval');
}

export const get = (k) => g(k, store);
export const set = (k, v) => s(k, v, store);
export const del = (k) => d(k, store);
