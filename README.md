# Brainrot TD

Tower defense 2D en format portrait, jouable dans le navigateur et installable sur téléphone. Des créatures absurdes (escargot-pizza, hippopotame grille-pain,
crabe-casserole…) suivent un chemin vers ta base ; tu les arrêtes avec des tourelles en forme d'armes,
améliorables et classées par rareté (gris → vert → bleu → violet → doré).

HTML5 Canvas + JavaScript vanilla (modules ES), **aucune dépendance, aucun build** pour la version web (les apps Android / iOS emballent les mêmes fichiers avec Capacitor, voir plus bas). Tous les visuels sont
dessinés en code (formes géométriques) et tous les sons sont synthétisés avec la Web Audio API.

## Lancer le jeu

Les modules ES ne se chargent pas depuis `file://` dans la plupart des navigateurs : il faut un petit serveur local.

```bash
# dans le dossier du projet, au choix :
python3 -m http.server 8000
npx serve .
```

Puis ouvrir <http://localhost:8000>. N'importe quel hébergement statique (GitHub Pages, Netlify…) fonctionne aussi tel quel.

## Apps Android et iOS (Capacitor)

Le même code sert à la version web (GitHub Pages, sans build) et aux apps : `tools/build-www.cjs` copie simplement
le jeu dans `www/`, que [Capacitor](https://capacitorjs.com) emballe dans les projets natifs `android/` et `ios/`
(déjà générés et configurés dans ce dépôt). Identifiant de l'app : `com.brainrottd.game` (dans `capacitor.config.json`).

### Ce que tu dois fournir (une seule fois)

| Quoi | Où | Pour quoi faire |
| --- | --- | --- |
| Compte développeur Google Play (25 $, une fois) | <https://play.google.com/console> | publier sur Android |
| Compte Apple Developer (99 $ par an) | <https://developer.apple.com/programs/> | publier sur iOS |
| Compte AdMob (gratuit) : 1 app Android + 1 app iOS, et 1 bloc « Récompensé » pour chacune | <https://admob.google.com> | remplacer les identifiants de TEST |
| Nom d'éditeur et e-mail de contact | `privacy.html` (remplacer `[Nom de l'éditeur]` et `[adresse e-mail de contact]`) | politique de confidentialité exigée par les stores |
| Clé de signature Android (fichier `.jks`, à garder précieusement, jamais dans Git) | Android Studio → *Build › Generate Signed App Bundle* | signer l'app |

L'URL de la politique de confidentialité à donner aux stores : `https://<ton-compte>.github.io/tower-defense-/privacy.html`.

### Préparer (à refaire après chaque modification du jeu)

```bash
npm install          # première fois seulement (Capacitor + plugins AdMob et achats)
npm run sync         # copie le jeu dans www/ puis dans android/ et ios/
```

### Android (Android Studio)

1. Installe [Android Studio](https://developer.android.com/studio) puis, dans le dossier du projet : `npm run android` (ouvre le projet).
2. Laisse Gradle se synchroniser, branche ton téléphone (mode développeur + débogage USB) et clique ▶ *Run* : le jeu se lance avec des pubs de TEST.
3. Pour publier : *Build › Generate Signed App Bundle* → *Android App Bundle* → crée ta clé (`.jks`) → variante *release*. Le fichier `.aab` est dans `android/app/release/`.
4. Dans Google Play Console : crée l'app, remplis la fiche avec `store/fiche-fr.md` (et `fiche-en.md`), les captures `store/screenshots/*-1080x1920-*.jpg`, l'icône `store/icon-1024.png` (redimensionnée en 512×512 par la console) et le visuel `store/feature-1024x500.png`.
5. Remplis *Contenu de l'app* : politique de confidentialité (URL ci-dessus), *Contient des annonces : oui*, classification du contenu, public cible (pas « enfants » seulement), *Sécurité des données* (identifiant publicitaire collecté par AdMob, aucune donnée personnelle par le jeu).
6. *Monétiser › Produits intégrés* : crée les produits avec **exactement** ces identifiants : `gems_small`, `gems_medium`, `gems_large` (consommables), `remove_ads`, `starter_pack` (achats uniques). Les prix se règlent dans la console.
7. Envoie le `.aab` en *Tests internes*, teste les achats avec un compte testeur, puis passe en production.
8. À chaque nouvelle version : augmente `versionCode` (et `versionName`) dans `android/app/build.gradle`.

### iOS (Xcode sur Mac, ou Codemagic sans Mac)

**Avec un Mac** : installe Xcode, puis `npm install && npm run ios`. Dans Xcode : *Signing & Capabilities* → choisis ton équipe Apple, ajoute la capacité *In-App Purchase*, branche ton iPhone et ▶. Pour publier : *Product › Archive* → *Distribute App* → App Store Connect.

**Sans Mac (Codemagic)** : crée un compte sur <https://codemagic.io>, connecte ce dépôt GitHub, ajoute dans *Team settings › Integrations* une clé API App Store Connect, puis lance le workflow `ios-release` du fichier `codemagic.yaml` : il installe les dépendances, synchronise Capacitor, signe et envoie l'app sur TestFlight.

Dans App Store Connect : crée l'app (Bundle ID `com.brainrottd.game`), remplis la fiche (textes de `store/`, captures `store/screenshots/*-1290x2796-*.jpg`, icône `store/icon-1024.png`), les *Informations de confidentialité* (identifiant publicitaire et données d'usage via AdMob, utilisées pour la publicité tierce), et crée les 5 achats intégrés avec les mêmes identifiants qu'Android.

### Passer des pubs de TEST aux vraies pubs (juste avant de publier)

1. `js/config.js` → `MONETIZATION.admob` : mets tes identifiants de blocs « Récompensé » (`rewardedAndroid`, `rewardedIos`) et `testing: false`.
2. `android/app/src/main/AndroidManifest.xml` → `com.google.android.gms.ads.APPLICATION_ID` : ton identifiant d'app AdMob Android (`ca-app-pub-…~…`).
3. `ios/App/App/Info.plist` → `GADApplicationIdentifier` : ton identifiant d'app AdMob iOS, et complète `SKAdNetworkItems` avec la liste fournie par Google.
4. Dans AdMob : *Confidentialité et messages* → crée un message RGPD (le jeu l'affiche au premier lancement) et un message ATT pour iOS.
5. `npm run sync`, puis nouvelle version.

### Monétisation (js/monetization.js)

Une interface unique : `showRewardedAd(reason)`, `buy(productId)`, `restorePurchases()`, `hasRemoveAds()`.
Version web : pub factice de 3 s et achats fictifs (rien n'est facturé). Apps : AdMob (pubs récompensées uniquement,
non personnalisées par défaut, consentement Google UMP au premier lancement, demande ATT sur iOS) et
cordova-plugin-purchase. Pubs proposées uniquement par un bouton (doubler les pièces de fin de niveau, tour de roue,
réanimation une fois par partie, construction −30 min), 10 par jour au plus ; avec « Sans pubs », ces bonus sont
gratuits. Aucun achat n'est nécessaire pour finir le jeu. Réglages : `MONETIZATION` dans `js/config.js`.

### Éléments de la fiche store (dossier `store/`)

Textes FR et EN (`fiche-fr.md`, `fiche-en.md`), 6 captures portrait en 1290×2796 et 1080×1920 (FR et EN),
icône 1024×1024, visuel de présentation 1024×500. Pour les régénérer :

```bash
python3 -m http.server 8123 &
NODE_PATH=$(npm root -g) node tools/store-shots.cjs           # captures + visuel
NODE_PATH=$(npm root -g) node tools/make-icons.mjs --store    # icône 1024
python3 tools/native-assets.py                                # icônes et écrans de démarrage Android + iOS
```

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
- **Hub** façon jeu mobile : accueil avec le château animé (brainrots qui marchent, nuages, oiseaux, nuit de 20 h à 7 h),
  blasons colorés (cadeau, quêtes, coffres, roue, passe, défi) avec leur info (« Prêt ! », « 2/3 », « 4 h 12 »),
  gros bouton JOUER, barre d'onglets Boutique | Château | Accueil | Talents | Collection ; badges uniquement quand
  une récompense est à récupérer.
- **Château évolutif** amélioré avec les pièces : murs, réparation, trésorerie, canon, et 3 capacités actives
  (frappe aérienne, blizzard, pluie d'or). Chaque amélioration ajoute un élément visible (palissade, créneaux,
  remparts doubles, atelier et forgeron, sacs et coffre, 2 canons puis tourelle, antenne, avion, cristal de glace…),
  sur 5 paliers : Fortin en bois → Château de pierre → Forteresse → Citadelle → Palais doré. Écran Château : toucher
  une partie ouvre sa fiche avec aperçu avant/après ; animation de chantier à chaque achat.
- **Carte de campagne** : nœuds en blasons, décor propre à chaque monde, rivière et pont, panneaux de monde,
  chemin continu du départ au trophée final.
- **Progression de la campagne** (`UNLOCKS` dans `js/config.js`) : chaque arme se débloque en battant un niveau
  (1-1 Fusil et Mitraillette, 1-2 Pompe, 1-4 Mine, 1-6 Cryo, 2-1 Sniper, 2-4 Lance-roquettes, 3-1 Minigun), avec une
  cinématique « NOUVELLE ARME » ; améliorations légendaires en 3-1, 4-1 et 5-1 ; un skin exclusif par boss. Bulles
  « Débloque : … » sur la carte, fiche de niveau (ennemis, récompenses), coffres d'étoiles à 6 / 12 / 18 étoiles par
  monde, mondes suivants dans le brouillard. Fin de monde : coffre légendaire, skin, boosts, gemmes et 3
  améliorations du château offertes, puis écran « MONDE 2 DÉBLOQUÉ » et panoramique sur la carte.
- **Icônes illustrées** (SVG en volume, contour épais) et code couleur fixe des récompenses : pièce or, gemme cyan,
  coffre bois / doré / légendaire violet, boost orange, XP vert, ticket du passe rose.
- **Niveau de joueur** (XP), **arbre de talents** visuel à 3 branches, **collection** (tourelles, brainrots, boosts, succès).
- **Boosts** en cartes à collectionner (pièces x2, +5 PV, tourelle gratuite, surcharge, bouclier, seconde chance) :
  3 emplacements rapides en partie, bulles de boost lâchées par les brainrots, activation au ralenti.
- **Fin de niveau** en séquence animée (étoiles, score, récompenses, montées de niveau, succès, écran final compact).
- **Chaque jour** : cadeau du jour (calendrier de 7 jours, coffre doré le 7e, série affichée), 3 quêtes du jour et une
  quête de la semaine, roue de la chance (1 tour gratuit), défi du jour (un niveau + un modificateur fun),
  passe de progression gratuit de 30 paliers (piste verticale), coffres à ouvrir en 3 touchers, offre du jour en
  boutique (-40 % sur un article). Tout est gratuit, aucun achat réel.
- **Mode infini** débloqué après le monde 2, classement local des 10 meilleurs scores.
- **Score** partout (multi-kills, vague parfaite, record par niveau), image de score à partager.
- **Juice** : éclaboussures aux couleurs de chaque brainrot, « pop » qui monte d'un ton quand on enchaîne les kills,
  compteur de combo (x5, x10, x25 « CARNAGE ! ») avec points bonus, micro-pauses et tremblements sur les gros coups,
  chiffres de dégâts qui rebondissent, rayon de lumière quand une tourelle monte de niveau, entrée et mort des boss
  au ralenti, bannière de fin de vague, musique générée qui s'intensifie contre les boss (réglages dans `JUICE` et `MUSIC`).
- **PWA** : installable sur l'écran d'accueil (« Brainrot TD »), jouable hors ligne.
- Monnaies : pièces de partie (remises à zéro à chaque niveau) ; hors partie, pièces (château, boosts courants)
  et gemmes, plus rares (coffres, skins, boosts rares). Tout se gagne en jouant, aucun achat réel.

Les anciennes sauvegardes sont converties automatiquement : étoiles et bonus achetés deviennent des gemmes, de l'XP
et des coffres ; tourelles, skins et succès sont conservés.

## Architecture

```
index.html            écrans (accueil, campagne, boutique, château, talents, collection, paramètres, jeu)
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
js/castle.js          château évolutif (un élément par amélioration, 5 paliers, éclairage de nuit)
js/projectiles.js     roquettes
js/fx.js              particules, traînées, textes flottants
js/sprites.js         sprites SVG des brainrots et des tourelles
js/icons.js           icônes SVG illustrées (objets, récompenses) et pictogrammes d'interface
js/audio.js           sons Web Audio
js/music.js           musique de fond générée (Web Audio)
js/haptics.js         vibrations
js/music.js           musique procédurale : thèmes du menu, des mondes et du boss, couche « vague », jingles
js/radial.js          menu radial et panneau d'aperçu des améliorations
js/mechanics.js       mécaniques propres à chaque monde (tempête, éruption, glace, hautes herbes, courant, portails)
js/rebirth.js         Renaissance : écran, double confirmation, cinématique, boutique d'éclats
js/viewport.js        taille de #app (jamais plus grande que la zone visible) et mode debug d'affichage
js/save.js            sauvegarde, migration, progression, XP, coffres
js/ui.js              navigation, HUD, menu radial, tutoriel, boutique, paramètres, partage
js/hub.js             barre de ressources, onglets, accueil animé, écran Château, capacités en partie
js/meta.js            carte du monde, lancement d'un niveau, cartes de présentation, mode infini
js/end.js             séquence de fin de niveau
js/talents.js         arbre de talents
js/collection.js      collection et fiches
js/boosts.js          boosts : cartes, emplacements rapides, activation
js/daily.js           cadeau du jour, quêtes, roue, défi du jour, passe
js/loot.js            coffres (boutique et ouverture), offre du jour
js/reveal.js          cinématiques : nouvelle arme, fin de monde, transition vers le monde suivant
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
| Château et capacités actives (prix en pièces) | `CASTLE` |
| Boosts, emplacements rapides, bulles de boost | `BOOSTS`, `BOOST_SLOTS`, `DROPS` |
| Pièces gagnées hors partie | `COINS` |
| Cadeau du jour, quêtes, roue, défi du jour, passe | `DAILY`, `PASS` |
| Combos, micro-pauses, musique | `JUICE`, `MUSIC` |
| Textes et conseils de l'écran de fin | `END` |
| XP, récompenses de niveau, talents, coffres | `XP`, `TALENTS`, `CHESTS`, `CHEST_ORDER` |
| Offre du jour de la boutique | `OFFER` |
| Paliers d'apparence du château, rangs max par monde, temps de construction | `CASTLE.tiers`, `CASTLE.rankCap`, `CASTLE.build` |
| Gains de fin de niveau (gemmes, pièces, XP, passe) | `CAMPAIGN.gems*`, `COINS`, `XP`, `PASS` (formule : `js/economy.js`) |
| Rangées de talents par niveau de joueur | `TALENT_ROWS` |
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

`tools/progression.cjs` simule un joueur régulier (3 parties par jour, quêtes, roue, passe, coffres) avec la vraie
logique de sauvegarde et la même formule de gains que le jeu (`js/economy.js`), et affiche jour par jour niveau,
gemmes, pièces, talents, château et campagne : `node tools/progression.cjs [jours] [parties par jour] [graine]`.
Les chances de victoire sont calées sur le robot de `tools/simulate.cjs` : il gagne le monde w avec un
investissement moyen (château et talents, de 0 à 5) égal à w - 1, et il lui faut le maximum dans les mondes
futuristes. Repères visés : campagne complète (80 niveaux) en 4 à 6 semaines ; le château plafonne vers la fin de
la campagne, les talents se complètent ensuite.
Le joueur simulé utilise un boost sur les niveaux difficiles (deux sur un boss ou un défi héroïque) et rachète en
pièces ceux qui lui manquent. Variante `node tools/progression.cjs 50 3 1 renaissance` : il renaît 2 jours après
avoir battu le dernier boss.

Pièces en fin de campagne : une fois le château au maximum, elles servent à la Renaissance, qui les convertit en
éclats (`REBIRTH.coinsPerShard`, 1 éclat pour 250 pièces). Le prix des boosts en pièces suit le monde atteint
(`BOOST_PRICE`), et les défis héroïques rapportent les mêmes pièces qu'un niveau normal (`HEROIC.coinsMult`).

`tools/audit.cjs` vérifie tous les écrans en 375, 390 et 430 px (aucun débordement horizontal, aucun texte coupé)
et, en 390 px, la lisibilité : texte ≥ 14 px (13 px en gras pour les labels), zones tactiles ≥ 44 px, contraste
WCAG AA sur fond uni, contour foncé sur les textes posés sur un décor. Il enregistre des captures en 390 × 844.

### Tests de robustesse

- `node tools/check.cjs` (sans navigateur, à lancer avant chaque publication) : tous les modules sont dans la liste
  du service worker, chaque import existe, la syntaxe est valide. **Changer `VERSION` dans `sw.js` à chaque
  publication** : le service worker télécharge alors tous les fichiers d'un coup dans un cache propre à cette
  version, et la page se recharge toute seule dès qu'on n'est plus en partie. Le jeu ne tourne jamais avec un
  mélange d'anciens et de nouveaux fichiers.
- `node tools/layout.cjs [dossier]` : en 375 × 667, 390 × 844 et 430 × 932, en mode navigateur et installé (safe-areas
  simulées), la barre du bas du jeu, le bouton de vague, le bouton de vitesse et la barre d'onglets sont entièrement
  dans l'écran, et le terrain tient dans la zone jouable.
- `node tools/chain.cjs [n]` : enchaîne n niveaux avec « Niveau suivant » dans l'interface réelle et vérifie que
  l'écran de victoire apparaît à chaque fois, sans erreur de console.
- `node tools/rotate.cjs` : téléphone tourné en paysage pendant une partie : écran « Tourne ton téléphone », partie
  en pause et son coupé, mise en page de portrait gardée ; au retour en portrait, la partie reprend, tout est intact.

### Mode debug d'affichage

`?debug=1` dans l'adresse, ou 5 tapes rapides sur le logo de l'accueil : affiche `innerHeight`, `clientHeight`,
`visualViewport`, `screen`, les safe-areas réelles, le mode (navigateur / installé), la position de `#app`, de la
barre d'onglets et de la barre du bas du jeu, et marque les 4 coins de `#app` en rouge. Les boutons du bas essaient
d'autres façons de calculer la hauteur ; le choix est gardé en mémoire (`localStorage`, clé `brainrot-layout`).

### Filets de sécurité

La boucle de jeu se reprogramme avant de travailler, la fin de niveau est toujours annoncée même si l'écriture de
la sauvegarde échoue, chaque étape de la séquence de fin est protégée, et un écran de fin de secours s'affiche si
rien n'apparaît 3,5 s après le moment prévu. Toute erreur non rattrapée ouvre « Oups, un bug ! » (progression
sauvegardée, Reprendre ou Retour au menu). `ui.clearGame()` remet tout à zéro entre deux parties.

### Sauvegarde

Une seule clé `localStorage` (`brainrot-bastion-save-v1`), plus des copies : `-bak1` (début de la session du jour),
`-bak2` (un jour précédent), `-broken` (sauvegarde illisible mise de côté, jamais effacée) et `-undo` (état d'avant
une réinitialisation ou un import). Une sauvegarde illisible est remplacée par la copie de secours la plus récente.
Paramètres : Exporter / Importer (texte `BRAINROT1:...`), Effacer (annulable). `node tools/save-test.cjs` vérifie
la conversion des anciennes versions, la réparation des valeurs abîmées, la récupération, l'export / import.

### Étoiles par objectifs

Chaque niveau a 3 objectifs indépendants (`starGoals` dans `js/config.js`) : gagner, ne perdre aucun PV, et un
troisième selon le niveau (nombre maximum de tourelles, ou temps limite). Une étoile obtenue reste acquise : on peut
les réunir en plusieurs parties (`levels[n].obj` dans la sauvegarde ; les anciennes sauvegardes gardent leurs
étoiles). Réglages dans `STARS` : `towersRatio`, `timeRatio`, `timeRatioBoss` et `par` (durée de référence de chaque
niveau, à remesurer avec `node tools/simulate.cjs 1,2,...,30 good` après un changement de vagues).
`GOAL=1 node tools/simulate.cjs <niveaux> good` fait viser le 3e objectif au robot.

### Qualité graphique automatique

`QUALITY` dans `js/config.js` : si le calcul d'une image reste trop long pendant 3 s, le jeu descend d'un cran
(définition du canvas, nombre de particules, ombres floues). Le cran courant s'affiche dans le mode debug.

### Musique

Tout est dans `MUSIC` (`js/config.js`) : un morceau par écran (`menu`, un par thème de monde, `boss`), avec gamme,
grille d'accords, instruments, motif de basse, arpège et percussions (16 pas par mesure). La mélodie est composée
une fois à partir de la graine `seed`. Percussions et arpège ne jouent que pendant les vagues (fondu). Jingles de
victoire et de défaite dans `MUSIC.jingles`. Volumes Musique et Effets séparés (Paramètres). Le son s'arrête quand
l'appli passe en arrière-plan. `node tools/music-test.cjs [dossier]` rend chaque morceau hors ligne, vérifie
son niveau (ni silence ni saturation) et peut écrire des fichiers WAV pour les écouter.

### Campagne : 10 niveaux par monde

`PER_WORLD = 10` dans `js/config.js` (9 niveaux normaux + 1 niveau de boss) ; `lvl(monde, n)` donne le numéro d'un
niveau, utilisé par le calendrier de déblocage (`UNLOCKS`). Chaque monde a une mécanique (`WORLDS[].mech`) :
tempête de sable (portée réduite), éruption (rochers de lave qui blessent les brainrots et étourdissent les
tourelles), plaques de glace (brainrots plus rapides), hautes herbes (brainrots cachés sauf près d'une tourelle).
Brainrots ajoutés : Foca Ghiacciolo (prend de la vitesse tant qu'on ne le touche pas), Yeti Spumone (aura qui
ralentit le tir des tourelles), Scimmia Bananina (bondit en avant), Camaleonte Pesto (se camoufle par moments).

Une sauvegarde de l'ancienne campagne (6 niveaux par monde, `lpw` absent) est convertie au chargement : chaque
niveau garde sa place dans son monde, le boss reste le boss, et les nouveaux niveaux insérés avant le boss sont
ouverts (badge « NOUVEAU » sur la carte) sans rien bloquer : la progression est le niveau le plus loin gagné.

### Ère futuriste (mondes 6 à 8)

Ville Néon (coupures de courant : des tourelles clignotent puis s'éteignent quelques secondes), Station Orbitale
(portails : le bleu fait bondir les brainrots en avant, l'orange les renvoie en arrière) et Dimension Brainrot
(chaos : glace et hautes herbes, puis tempête, éruption ou coupure à tour de rôle). Brainrots : Robo Gnocchetto
(bouclier d'énergie qui se recharge), Cyborg Cannolo (décharge qui coupe les tourelles à sa mort), Astro Polpetta
(volant à réacteur), Satellite Spaghetto (boucliers pour ses voisins), Glitch Mozzarella (se téléporte), et 3 boss.

Nouvelles tourelles (même règle de design : 5 niveaux, 2 branches, niveau 5 doré) :
Laser (`kind: 'beam'`, rayon continu qui chauffe sur la même cible), Tesla (`'chain'`, éclair en chaîne), Plasma
(`'plasma'`, boule qui traverse tout) et Drone (`'drone'`, drones qui patrouillent autour de la base).
Château : 3 apparences de plus (forteresse high-tech, citadelle orbitale, palais brainrot), une par boss futuriste.
Sur la carte, un bandeau « ère futuriste » marque le passage entre la jungle et la ville néon.
Les sprites ne sont plus tous préchargés au démarrage : seulement les tourelles possédées et les brainrots du niveau.

### Renaissance

`REBIRTH` dans `js/config.js`. Disponible quand le boss du dernier monde est battu (ruban sous le logo de
l'accueil, bouton sur le trophée de la carte), toujours facultative. Remet à zéro la campagne, le château, les
talents (points rendus) et les pièces ; garde collection, skins, succès, niveau, gemmes, boosts et tourelles.
Chaque rang : badge à côté du niveau, éclats (base + 1 par étoile + 3 par défi héroïque), +10 % de pièces et
+5 % de dégâts, brainrots mutés (PV +30 %, vitesse +3 %, régénération) et gains de fin de niveau x(1 + 0,5 x rang).
Boutique d'éclats : tourelles Mk II (3e branche : balles ricochets, munitions explosives, fléchettes, rail-gun,
napalm, arc magnétique), pouvoirs (pluie de météores, retour arrière), skins à aura (Phénix, Prisme) et un
4e emplacement de boost. Sauvegarde : `rebirth: { rank, shards, owned, history }`.
