# Brainrot Bastion — Tower Defense

Tower defense 2D jouable dans le navigateur. Des créatures absurdes (escargot-pizza, hippopotame grille-pain,
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

| Action | Souris / tactile | Clavier |
| --- | --- | --- |
| Choisir une tourelle | clic sur la barre, ou glisser-déposer sur le terrain | `1` à `8` |
| Poser | clic / toucher sur le terrain (rouge = invalide) | `Maj` + clic pour en poser plusieurs |
| Annuler | clic droit | `Échap` |
| Améliorer / cibler / vendre | clic sur une tourelle | |
| Lancer la vague | bouton ▶ (bonus si lancée en avance) | `Espace` |
| Pause | bouton ⏸ | `P` |
| Vitesse x1 / x2 / x3 | bouton en haut à droite | |

## Contenu

- **8 tourelles** : fusil d'assaut, mitraillette, pompe, sniper, lance-roquettes, minigun, cryo, mine.
  Niveaux 1 à 3 communs, **2 spécialisations exclusives** au niveau 4, puis une maîtrise légendaire au niveau 5.
  4 modes de ciblage, revente à 70 %.
- **8 ennemis + 3 boss** : basique, rapide, tank, volant, blindé, diviseur, soigneur, invisible ; un boss
  toutes les 10 vagues (invocation de sbires, IEM qui coupe les tourelles, bouclier + rage).
- **3 cartes** (dont une à 2 chemins) débloquées l'une après l'autre, **30 vagues** chacune, 3 difficultés,
  **mode infini** débloqué en terminant la carte.
- **Progression** : gemmes gagnées en fin de partie → boutique (nouvelles tourelles, bonus permanents, skins),
  étoiles par carte, succès. Aucun achat réel. Sauvegarde automatique dans le `localStorage`.

Les invisibles sont révélés à bout portant, par les dégâts de zone, ou par les améliorations de détection
(Balles traçantes, Lunette thermique, Givre fragilisant).

## Architecture

```
index.html          écrans (menu, cartes, boutique, paramètres, jeu)
css/style.css       interface responsive (PC, mobile portrait et paysage)
js/config.js        TOUTES les valeurs d'équilibrage
js/main.js          point d'entrée
js/game.js          état d'une partie, boucle (delta time), dégâts, économie, rendu
js/maps.js          cartes, chemins, décor de fond
js/waves.js         génération procédurale des vagues
js/enemies.js       ennemis et boss (déplacement, états, capacités)
js/towers.js        tourelles (stats, améliorations, ciblage, tir)
js/projectiles.js   roquettes
js/fx.js            particules, traînées, textes flottants, pièces volantes
js/draw.js          dessins des brainrots et des armes
js/audio.js         sons Web Audio
js/save.js          sauvegarde et succès
js/ui.js            HUD, barre de tourelles, panneaux, menus, tutoriel, entrées
```

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
| Argent de départ, PV de base, PV ennemis par difficulté | `DIFFICULTIES` |
| Difficulté propre à une carte | champ `hp` de la carte dans `js/maps.js` |
| Revente, critiques, bonus de vague, bonus « en avance », nombre de vagues | `GAME` |
| Prix de la boutique, bonus permanents, skins, gemmes gagnées | `SHOP` |
| Seuils des étoiles, succès | `STARS`, `ACHIEVEMENTS` |

**Format des modificateurs** (`upgrades`, `mods`) : une clé `xxxMul` multiplie la stat `xxx`, `xxxAdd` l'additionne,
toute autre clé remplace la valeur. Exemple : `{ damageMul: 1.5, pierce: 2, critAdd: 0.1 }`.

Stats reconnues : `damage`, `rate` (tirs/s), `range`, `pellets`, `spread`, `splash`, `slow`, `slowDur`, `pierce`,
`ignoreArmor`, `detect`, `crit`, `critMult`, `burn`, `burnDur`, `barrels`, `homing`, `knockback`, `stun`,
`freezeChance`, `freezeDur`, `vuln`, `cluster`, `spinUp`, `minRate`, `projSpeed`, `bossMul`.

### Ajouter une carte

Ajoute une entrée dans `MAPS` (`js/maps.js`) : un `id`, un nom, des couleurs et un ou plusieurs chemins sous forme de
listes de points `[x, y]` dans un repère 1280 × 720. Le premier point est l'entrée (hors écran), le dernier la base.
Avec plusieurs chemins, fais-les finir au même point.

### Tester rapidement

Dans la console du navigateur, la partie en cours est accessible via `__game` :

```js
__game.money = 99999;        // argent illimité
__game.startNextWave();      // forcer la vague suivante
__game.speed = 3;
```

Pour repartir de zéro : Paramètres → Réinitialiser.
