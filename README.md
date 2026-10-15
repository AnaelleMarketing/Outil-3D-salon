# Stand 3D – outil de conception de stand (Spengler Group)

Application web (Three.js) conçue à partir du cahier des charges « Outil de conception de stand 3D ».
Le stand Medica 2026 (Prima Design, 8 × 3 m, hall 10 C42) est chargé comme projet de démonstration.

## Lancer en local

```bash
cd stand3d
npm install      # une seule fois
npm run dev      # http://localhost:5180
```

Version optimisée : `npm run build && npm run preview` (même port).

## Mise en ligne

Le site est hébergé chez OVH (dossier `stand3d/` du FTP). Chaque `git push` sur `main` lance
le workflow GitHub Actions `.github/workflows/deploy.yml` : construction (`npm run build`), puis envoi FTP de `dist/`.

```bash
git add -A && git commit -m "Description du changement" && git push
```

Secrets GitHub à créer (Settings › Secrets and variables › Actions) :

| Secret | Contenu |
|---|---|
| `FTP_PASSWORD` | mot de passe FTP OVH |
| `STAND_USERS` | comptes du site, JSON `{"identifiant": "code"}` |
| `STAND_SECRET` | longue chaîne aléatoire (signature des cookies de session) |

Côté serveur (PHP, dans `public/`) : `gate.php` affiche la page de connexion et sert les fichiers,
`api/collab.php` gère le partage de projets entre comptes. Les projets partagés sont stockés dans `data/`
sur le serveur (non accessible depuis le web) ; `lib/config.php` est généré au déploiement à partir des secrets.

**Sauvegarde** : chaque nuit, le workflow `.github/workflows/sauvegarde.yml` télécharge `data/` par FTP et le garde
90 jours (GitHub › Actions › « Sauvegarde des projets partagés » › artefact `projets-partages-…`).
Pour restaurer : télécharger l'artefact, le décompresser, puis renvoyer son dossier `data/` dans `stand3d/data/` par FTP.

**Accès** : l'IT limite le site au réseau / VPN Spengler (`Require ip` en fin de `public/.htaccess`, à conserver) ;
ailleurs, la page `acces/` (« Accès réservé ») remplace l'erreur 403.

Les projets, visuels et la bibliothèque sont enregistrés automatiquement dans le navigateur (IndexedDB),
avec un historique de versions (toutes les 10 min ou à la demande).

## Mode « configurateur » (comme un concepteur de cuisine)

- **Parcours en 8 étapes** (barre au-dessus de la 3D) : Stand → Style → Structure → Mobilier → Produits → Visuels → Vérifier → Budget & export, avec un conseil à chaque étape.
- **Pose au clic** : cliquez un élément de la bibliothèque, il suit la souris ; cliquez pour le poser (R pour pivoter, Échap pour annuler).
- **Aimantation intelligente** : dos aux cloisons et aux côtés fermés du stand, orientation automatique, alignement bord à bord avec les voisins ; cotes vertes en direct vers les murs et voisins (Maj = placement libre).
- **Taille du stand à la souris** : tirez les poignées bleues sur les 4 bords. Les éléments collés au bord suivent (avec leur contenu), les cloisons pleine longueur s’étirent.
- **Sols en un clic** : moquettes (8 coloris), parquets (chêne clair, chêne foncé, gris cérusé, blanchi), PVC, ou texture importée.
- **Ambiances** (Spengler, Nature, Premium, Clinique, Sauge) et remplacement d’une finition partout.
- **Tailles standard** en un clic dans les propriétés (cloison 1/2/3 m, comptoir 1000/1200/1500…).
- **Budget estimé en direct** (en haut à droite), tarifs indicatifs modifiables, devis exportable en CSV.

## Couverture du cahier des charges

| Fonction | État |
|---|---|
| 3.1 Dimensions (mm/cm/m), hauteur max, ouverture 1–4 faces, sol (moquette, parquet, PVC, couleur, texture), grille aimantée réglable, cotes | ✔ |
| 3.1 (S) Plan de fond PDF/image mis à l'échelle par 2 points, allées et stands voisins, modèles 3×3 / 6×3 / 8×3 / 6×6 / 9×6 | ✔ (DWG/DXF : exporter en PDF) |
| 3.2 Cloisons droites/arrondies/courbes, caissons lumineux, bannière + truss avec spots, réserve avec porte | ✔ |
| 3.2 (S) Estrade, marches, niches, étagères | ✔ |
| 3.3 Catalogue cherchable, dimensions et finitions modifiables, import GLB/glTF/OBJ/FBX | ✔ |
| 3.4 Bibliothèque produits par marque/gamme, import 3D 1:1, repli photo détourée / pack-shot | ✔ (STEP : convertir en GLB) |
| 3.5 Visuels JPG/PNG/SVG/PDF par glisser-déposer, recadrage/zoom, alerte < 100 dpi, polices de la charte, bibliothèque par marque, vidéo sur écrans | ✔ |
| 3.6 Déplacer, pivoter (15°), dupliquer, supprimer, collisions/dépassements, annuler/rétablir, plan 2D / 3D / visiteur 1,65 m, mesure, calques par zone | ✔ |
| 4 Mode travail / mode rendu (ombres des spots, occlusion ambiante, halos), spots 2700–6500 K | ✔ |
| 6 Images jusqu'à 4K, 4 vues auto, panorama 360°, lien de visite + commentaires épinglés, plan coté PDF 1:40/1:50, liste CSV, GLB, fichier projet | ✔ |

## Limites de cette version locale

- Pas de serveur : comptes, rôles, hébergement cloud européen et liens partagés entre postes nécessitent un back-end.
  En attendant, le partage se fait par fichier projet (`.stand3d.json`, visuels inclus) et le lien `?visite=` fonctionne sur le poste.
- Le mode rendu est calculé dans le navigateur (pas d'illumination globale par lancer de rayons côté serveur).
- Les visuels du stand Medica sont des recompositions de démonstration ; les logos sont des textes provisoires.
- Interface en français uniquement.
