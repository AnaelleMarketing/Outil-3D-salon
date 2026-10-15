// Sauvegarde des projets de l'ancien site (stand3d-spengler.vercel.app), même s'il est bloqué par Vercel.
// À coller dans la console du navigateur (F12 > Console) sur la page https://stand3d-spengler.vercel.app
// Télécharge « sauvegarde-stand3d.json », à restaurer dans le nouveau site : Projets > Restaurer une sauvegarde.
(async () => {
  const toB64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
  const pack = async (v) => (v instanceof Blob ? { __blob: true, name: v.name || null, data: await toB64(v) } : v);
  const names = (await indexedDB.databases()).map((d) => d.name).filter((n) => n === 'keyval-store' || /^stand3d-/.test(n));
  const out = { format: 'stand3d-sauvegarde', version: 1, origin: location.origin, date: new Date().toISOString(), dbs: {} };
  for (const name of names) {
    const db = await new Promise((ok, ko) => { const r = indexedDB.open(name); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
    if (!db.objectStoreNames.contains('keyval')) { db.close(); continue; }
    const os = db.transaction('keyval').objectStore('keyval');
    const [keys, vals] = await Promise.all([os.getAllKeys(), os.getAll()].map((q) => new Promise((ok) => (q.onsuccess = () => ok(q.result)))));
    const entries = {};
    for (let i = 0; i < keys.length; i++) entries[keys[i]] = await pack(vals[i]);
    out.dbs[name] = entries;
    db.close();
  }
  const count = Object.values(out.dbs).reduce((n, e) => n + (e.projects || []).length, 0);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
  a.download = 'sauvegarde-stand3d.json';
  a.click();
  console.log(`Sauvegarde téléchargée : ${count} projet(s), comptes : ${Object.keys(out.dbs).join(', ') || 'aucun'}`);
})();
