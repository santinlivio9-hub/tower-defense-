# Brainrot Bastion — Tower Defense

Tower defense 2D en format portrait, jouable dans le navigateur et installable sur téléphone. Des créatures absurdes (escargot-pizza, hippopotame grille-pain,
crabe-casserole…) suivent un chemin vers ta base ; tu les arrêtes avec des tourelles en forme d'armes,
améliorables et classées par rareté (gris → vert → bleu → violet → doré).

HTML5 Canvas + JavaScript vanilla (modules ES), **aucune dépendance, aucun build**. Tous les visuels sont
dessinés en code (formes géométriques) et tous les sons sont synthétisés avec la Web Audio API.

## Lancer le jeu

Les modules ES ne se chargent pas depuis `file://` dans la plupart des navigateurs : il faut un petit serveur local.

```bash
# dans le dossier du projet, au choix :
python3 -m http.server 8000
npx serve .
```

Puis ouvrir <http://localhost:8000>. N'importe quel hébergement statique (GitHub Pages, Netlify…) fonctionne aussi tel quel.

## Commandes

| Action | Tactile / souris | Clavier |
| --- | --- | --- |
| Construire | toucher un socle libre : menu radial des tourelles, puis toucher encore pour confirmer | `1` à `8` dans le menu |
| Améliorer / branche / ciblage / vendre | toucher une tourelle : même menu radial | `1` à `8` dans le menu |
| Mines | toucher une zone marquée sur le chemin | |
| Lancer la vague | bouton « Lancer la vague » (bonus si lancée en avance) | `Espace` |
| Capacités du château, boosts | boutons ronds en bas de l'écran | |
| Pause | bouton pause | `P` |
| Fermer un menu | toucher ailleurs | `Échap` |

## Contenu

- **Format portrait** plein écran : le terrain (600 × 940) occupe toute la largeur, le décor se prolonge autour.
- **Campagne** : 5 mondes × 6 niveaux. Niveaux normaux de 10 à 14 vagues (environ 5 minutes), niveau de boss
  de 20 à 26 vagues à la fin de chaque monde (10 à 16 minutes), avec des mini-boss toutes les 10 vagues. 1 à 3 étoiles
  selon les PV restants. Chaque niveau terminé débloque un **défi Héroïque** (contrainte spéciale, récompenses doublées).
- La vague suivante part toute seule 5 s après la fin de la précédente (désactivable dans les paramètres) ;
  bouton de vitesse x1 / x2 / x3 à côté du bouton de vague (la vitesse choisie est gardée).
- **Emplacements fixes** (10 à 16 socles par niveau) placés aux virages et croisements, zones de mines sur le chemin.
  Flèche « UP » au-dessus des tourelles qu'on peut améliorer.
- **8 tourelles** qui changent d'apparence à chaque niveau : niveaux 1 à 3, **2 branches au look distinct** au niveau 4,
  maîtrise dorée au niveau 5. Elles se débloquent au fil de la campagne, avec une carte de présentation.
- **8 ennemis + 5 boss**, groupes « élite » dans les derniers mondes.
- **Château** amélioré avec les gemmes : murs, réparation, trésorerie, canon, et 3 capacités actives
  (frappe aérienne, blizzard, pluie d'or). Son apparence évolue : bois → pierre → forteresse → citadelle dorée.
- **Niveau de joueur** (XP), **arbre de talents** à 3 branches, **coffres** à ouverture animée.
- **Boosts** consommables (pièces x2, +5 PV, tourelle gratuite, surcharge, bouclier, seconde chance) dans un
  inventaire persistant ; on en emporte 2 par niveau (4 en niveau de boss).
- **Mode infini** débloqué après le monde 2, classement local des 10 meilleurs scores.
- **Score** partout (multi-kills, vague parfaite, record par niveau), image de score à partager.
- **Juice** : éclaboussures aux couleurs de chaque brainrot, « pop » qui monte d'un ton quand on enchaîne les kills,
  compteur de combo (x5, x10, x25 « CARNAGE ! ») avec points bonus, micro-pauses et tremblements sur les gros coups,
  chiffres de dégâts qui rebondissent, rayon de lumière quand une tourelle monte de niveau, entrée et mort des boss
  au ralenti, bannière de fin de vague, musique générée qui s'intensifie contre les boss (réglages dans `JUICE` et `MUSIC`).
- **PWA** : installable sur l'écran d'accueil (« Brainrot TD »), jouable hors ligne.
- Deux monnaies : pièces (en partie) et gemmes (hors partie). Tout se gagne en jouant, aucun achat réel.

Les anciennes sauvegardes sont converties automatiquement : étoiles et bonus achetés deviennent des gemmes, de l'XP
et des coffres ; tourelles, skins et succès sont conservés.

## Architecture

```
index.html            écrans (menu, campagne, château, talents, inventaire, boutique, paramètres, jeu)
css/style.css         design system (Fredoka, verre, boutons 3D, safe-areas)
manifest.webmanifest  PWA
sw.js                 service worker (hors ligne)
icons/                icônes générées par tools/make-icons.mjs
js/config.js          TOUTES les valeurs d'équilibrage (tourelles, ennemis, campagne, château, boosts, XP, talents)
js/main.js            point d'entrée
js/game.js            une partie : boucle (delta time), dégâts, économie, château, boosts, score, rendu
js/maps.js            thèmes, tracés, emplacements de tourelles, décor
js/waves.js           génération procédurale des vagues d'un niveau
js/enemies.js         ennemis et boss
js/towers.js          tourelles (stats, améliorations, ciblage, tir, dessin)
js/castle.js          dessin du château (4 apparences)
js/projectiles.js     roquettes
js/fx.js              particules, traînées, textes flottants
js/sprites.js         sprites SVG des brainrots et des tourelles
js/icons.js           icônes SVG de l'interface
js/audio.js           sons Web Audio
js/music.js           musique de fond générée (Web Audio)
js/haptics.js         vibrations
js/save.js            sauvegarde, migration, progression, XP, coffres
js/ui.js              HUD, menu radial, tutoriel, fin de partie, partage
js/meta.js            carte du monde, préparation d'un niveau, cartes de présentation, mode infini
js/hub.js             écran Château, capacités en partie
js/loot.js            XP, talents, inventaire, coffres, boosts
tools/simulate.cjs    robot d'équilibrage (voir plus bas)
```

Pour régénérer les icônes après avoir modifié un sprite : `node tools/make-icons.mjs` (nécessite Playwright).
Si tu ajoutes un fichier JS, ajoute-le aussi à la liste `CORE` de `sw.js` et incrémente `CACHE`.

## Modifier l'équilibrage

Tout se règle dans **`js/config.js`** (et un multiplicateur par carte dans `js/maps.js`). Recharge la page pour appliquer.

| Je veux changer… | Où |
| --- | --- |
| Prix, dégâts, cadence, portée d'une tourelle | `TOWERS.<arme>.cost` et `.base` |
| Les niveaux 2 et 3 | `TOWERS.<arme>.upgrades` (coût + multiplicateurs) |
| Les spécialisations (niv. 4) et la maîtrise (niv. 5) | `TOWERS.<arme>.branches[i].mods` / `.master.mods` |
| PV, vitesse, récompense, dégâts à la base d'un ennemi | `ENEMIES.<type>` (`hp`, `speed`, `reward`, `leak`) |
| À quelle vague un ennemi apparaît | `ENEMIES.<type>.unlock` |
| Capacités (soin, division, boss) | `ENEMIES.<type>.heal` / `.split` / `.ability` |
| Nombre d'ennemis par vague | `WAVES.budget(n)` (chaque ennemi « coûte » `ENEMIES.<type>.cost`) |
| Montée des PV au fil des vagues | `WAVES.hpScale(n)` |
| Nombre de vagues, argent de départ, emplacements, tracé de chaque niveau | `CAMPAIGN` |
| Difficulté par monde / par niveau / des niveaux de boss | `CAMPAIGN.hpWorld`, `.hpLevel`, `.bossLevelHp`, `.density` |
| Mini-boss, déblocage des tourelles et du mode infini | `CAMPAIGN.miniBossEvery`, `.towerUnlocks`, `.endlessAfter` |
| Défis héroïques | `HEROIC` |
| Château et capacités actives | `CASTLE` |
| Boosts, emplacements à emporter | `BOOSTS`, `BOOST_SLOTS` |
| XP, récompenses de niveau, talents, coffres | `XP`, `TALENTS`, `CHESTS` |
| Revente, critiques, bonus de vague, bonus « en avance », délais entre vagues | `GAME` |
| Skins | `SHOP` |
| Seuils des étoiles, succès | `STARS`, `ACHIEVEMENTS` |
| Points par kill, multi-kills, bonus de score | `SCORE` |

**Format des modificateurs** (`upgrades`, `mods`) : une clé `xxxMul` multiplie la stat `xxx`, `xxxAdd` l'additionne,
toute autre clé remplace la valeur. Exemple : `{ damageMul: 1.5, pierce: 2, critAdd: 0.1 }`.

Stats reconnues : `damage`, `rate` (tirs/s), `range`, `pellets`, `spread`, `splash`, `slow`, `slowDur`, `pierce`,
`ignoreArmor`, `detect`, `crit`, `critMult`, `burn`, `burnDur`, `barrels`, `homing`, `knockback`, `stun`,
`freezeChance`, `freezeDur`, `vuln`, `cluster`, `spinUp`, `minRate`, `projSpeed`, `bossMul`.

### Ajouter un tracé

Ajoute une entrée dans `LAYOUTS` (`js/maps.js`) : un ou plusieurs chemins sous forme de listes de points `[x, y]`
dans un repère 600 × 940. Le premier point est le portail (en haut), le dernier le château `(300, 850)`.
Les socles sont placés automatiquement là où ils couvrent le plus de chemin. Utilise ensuite son nom dans
`CAMPAIGN.layouts` (suffixe `!` pour l'utiliser en miroir).

### Robot d'équilibrage

`tools/simulate.cjs` joue des niveaux sans affichage avec un robot (`good` joue bien, `mid` joue comme un joueur
moyen, `bad` joue mal, `boost` joue bien et utilise ses boosts) et affiche le résultat, la durée et les tourelles posées.
Mode d'emploi en tête du fichier. Repères visés : un niveau normal dure environ 5 minutes et un joueur moyen le gagne
avec 2 ou 3 étoiles ; un niveau de boss dure 20 minutes au plus et se gagne en jouant bien (plus facilement avec les boosts).

### Tester rapidement

Dans la console du navigateur, la partie en cours est accessible via `__game` :

```js
__game.money = 99999;        // argent illimité
__game.startNextWave();      // forcer la vague suivante
__game.speed = 3;
__ui.startGame(12);          // lancer directement le niveau 12
```

Pour repartir de zéro : Paramètres → Réinitialiser.
