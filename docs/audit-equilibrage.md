# Audit d'équilibrage et de finition : Brainrot TD

Les mesures viennent du vrai moteur du jeu, exécuté dans Chromium sans affichage. Les tableaux complets sont en fin de document. Aucune valeur du jeu n'a été modifiée pour cet audit.

**Outils de mesure (dossier `tools/`) :**
- `balance.cjs` :
  - `dps` : banc d'essai des tourelles ;
  - `flux` : rôles face à 8 menaces ;
  - `waves` : courbe de difficulté ;
  - `win` : taux de victoire ;
  - `mono` : stratégie à une seule tourelle.
- `progression.cjs` : économie sur 60 jours, avec l'origine des gains (`SOURCES=1`).
- `perf.cjs` : pire moment, mémoire sur 10 niveaux, erreurs de console.

**Joueur simulé :**
- Son équipement (château, talents, niveau) est celui du joueur régulier de `progression.cjs` à sa 1re tentative de chaque niveau.
- Le **joueur moyen** réagit toutes les 1 à 3 s. Il place bien ses tourelles 40 à 90 % du temps, garde 0 à 100 pièces de côté, choisit ses tourelles et ses branches au hasard parmi celles débloquées, utilise ses capacités quand il y pense et n'emporte pas de boosts.
- Le **débutant** est plus lent, place plus au hasard et garde jusqu'à 200 pièces.
- 8 essais par niveau avec des profils différents. Vitesse x1, vagues automatiques.

> Limite : un joueur simulé n'est pas un humain. Les taux absolus dépendent de ce modèle. Les comparaisons (entre niveaux, tourelles, branches) sont, elles, fiables.

---

## Résumé : écarts par rapport aux objectifs

| Règle | Objectif | Mesure actuelle | Verdict |
|---|---|---|---|
| Victoires, niveaux normaux (joueur moyen) | 80-90 % | **99 %** (débutant : 95 %) | Trop facile |
| 3 étoiles, niveaux normaux | ~40 % | 47 % en moyenne, mais **0 % ou ~100 %** selon le 3e objectif | Mal réparti |
| Victoires, boss sans boost | 55-70 % | **90-94 %** | Trop facile |
| Victoires, boss avec boosts | 85 % | **100 %** | Trop facile |
| Défis Héroïques | 30-50 % | **92 %** (77 % en 3 étoiles) | Trop facile |
| Renaissance | chaque rang plus dur, rattrapé par les bonus | rangs 1-3 sans effet sur les niveaux normaux ; **boss impossibles au rang 5** | Cassé |
| Écart de difficulté entre 2 niveaux | +5 à +10 %, sans mur | **de -48 % à +101 %** (DPS requis au pic) | Dents de scie |
| Vagues « respiration » | 1 ou 2 par niveau | 0 dans la plupart des niveaux normaux | Absentes |
| Vague la plus dure en fin de niveau | oui | oui partout | OK |
| 1er niveau d'un monde < boss précédent | oui | oui (-50 à -70 %) | OK |
| Durée, niveau normal | 4-6 min | 64 % dans la cible, 8 % sous 4 min, 28 % au-dessus de 6 min (jusqu'à 7,8) | À lisser |
| Durée, boss | 15-20 min max | 9 à 15,2 min | OK |
| Une seule tourelle partout, 3 étoiles dès le monde 2 | jamais | **oui** pour 9 tourelles sur 11 ; même la Cryo seule gagne | Non respecté |
| DPS par pièce d'une tourelle chère | pas plus de +15 % au-dessus d'une moins chère | Plasma **x2 à x5** (groupes, tanks, blindés) ; Laser +51 % sur le Sniper | Non respecté |
| Chaque amélioration | au moins +30 % ou un effet visible | toujours au-dessus (sauf branche Zéro absolu de la Cryo : 0 % de dégâts, mais un effet de gel) | OK |
| Amélioration comparée à une nouvelle tourelle | ±20 % | de 59 % (Mine) à 172 % (Minigun) | Non respecté |
| 2 branches du niveau 4 | écart max 10 % | Pompe 75 %, Lance-roquettes 91 %, Plasma 91 %, Laser 79 %, Mitraillette 38 %, Drone 34 %, Minigun 31 %, Mine 32 % ; Tesla 11 %, Fusil 11 %, Sniper 16 % | Non respecté |
| Revente à 70 % | jamais rentable | 70 % (80,5 % au maximum avec le talent) ; une tourelle offerte par boost revend 0 | OK |
| Blindage | au moins 20 % des dégâts | au moins 25 % (formule), bouclier de rage 20 % | OK |
| Nouvel ennemi présenté seul ou en petit nombre | oui | 2 à 6 nouveaux, **mélangés** à 3-18 autres | À corriger |
| Boss : capacités annoncées avant de frapper | oui | **aucun avertissement** (invocation, coupure des tourelles, rage) | Non respecté |
| Argent en début de partie | 2-3 tourelles à la 1re vague | 240-260 pièces : 2 Fusils ou 3 Mitraillettes | OK |
| Argent qui dort en fin de niveau | jamais beaucoup | 300-800 (normaux), 1 600-2 400 (boss des mondes 4-8) | Acceptable |
| Récompenses quotidiennes | au plus 30 % des gains | **36 % des pièces**, 21 % des gemmes | Pièces au-dessus |
| Monde 1 / campagne / tout au max | jour 3-4 / 4-5 semaines / 6-8 semaines | jour 4 / jour 32 / jour 53 | OK (modèle) |
| Château au max | 6-8 semaines | **jour 23** | Trop tôt |
| Talents : chaque rang mesurable (3-5 %) | oui | 2 % pour Poudre premium, Culasse huilée et Longue-vue ; +1 % pour Œil vif ; Brocanteur ne joue qu'à la revente | 5 talents en dessous |
| 60 FPS au pire moment | oui | logique ≤ 2 ms par image ; le dessin domine (pics de 40-75 ms en rendu logiciel x3, sans carte graphique) | À vérifier sur iPhone |
| Fuite mémoire sur 10 niveaux | aucune | +0,6 Mo entre le 2e et le 10e niveau | OK |
| Erreurs de console | aucune | aucune | OK |
| Débordements (375, 390, 430 px) | aucun | aucun (`tools/audit.cjs`) | OK |

---

## CRITIQUE

1. **Difficulté globale trop basse.**
   - Le joueur moyen gagne 99 % des niveaux normaux, 90-94 % des boss sans boost, 100 % avec boosts et 92 % des défis Héroïques.
   - Le débutant gagne encore 95 %.
   - Le joueur moyen ne perd en moyenne que 0 à 3 PV par niveau normal.

2. **Courbe en dents de scie.**
   - Le DPS requis au pic (PV de la vague divisés par le temps passé sur le chemin) saute de -48 % à +101 % entre deux niveaux normaux consécutifs. Exemples : 4-5 → 4-6 +101 %, 7-4 → 7-5 -48 %.
   - Causes :
     - le tirage au hasard des types d'ennemis : à budget égal, un groupe de tanks a 3 fois plus de PV qu'un groupe de rapides ;
     - les groupes d'élite ;
     - la correction par longueur de chemin.
   - Les vagues ne font que monter : aucune vague plus calme.

3. **Plasma (monde 7) écrase tout.**
   - Par pièce, il est n° 1 contre les groupes (x4 le Lance-roquettes), les tanks et les blindés (x3,5 le Sniper), les volants et les diviseurs.
   - Le Laser « Rayon solaire » fait 906 DPS sur une cible, 1,5 fois le Minigun Fusion : il rend obsolètes les tourelles des mondes 1 à 5.

4. **Branches déséquilibrées.** Dans 8 tourelles sur 12, une branche est nettement meilleure partout :

   | Tourelle | Branche qui domine | Écart de puissance |
   |---|---|---|
   | Pompe | Chasseur de gros | +75 % |
   | Lance-roquettes | Missile guidé, puis Salve | +91 % |
   | Plasma | Double cœur, puis Réacteur | +91 % |
   | Laser | Rayon solaire | +79 % |
   | Mitraillette (niv. 5) | Triple canon | +38 % |
   | Drone (niv. 5) | Essaim | +34 % |
   | Minigun | Fusion | +31 % |
   | Mine | Cratère | +32 % |

   Cryo : Zéro absolu (gel aléatoire) est bien plus faible que Givre fragilisant (+30 % de dégâts subis pour toutes les tourelles, détection, dégâts x3).

5. **Une seule tourelle suffit.**
   - Le robot qui ne pose qu'un type de tourelle gagne presque tous les niveaux testés (2 par monde, mondes 2 à 8).
   - Il obtient 3 étoiles avec 9 types : Fusil, Mitraillette, Pompe, Sniper, Lance-roquettes, Minigun, Laser, Tesla et Plasma.
   - La Cryo seule gagne 9 niveaux sur 14.

6. **Boss injustes.** L'invocation, la coupure des tourelles (EMP : 2,5 à 3 s, rayon de 190 à 240 px) et la rage partent sans aucun signe avant-coureur. À l'inverse, les éruptions et les coupures de courant du monde 6 sont bien annoncées.

7. **Renaissance mal réglée.**
   - Rangs 1 à 3 : les niveaux normaux restent gagnés à 100 % sans perdre de PV.
   - Rang 5 : 0 % de victoires sur les boss des mondes 6 et 8.
   - Cause : la régénération des mutés vaut 0,4 % des PV max par seconde et par rang, soit 2 %/s au rang 5. Sur un boss de 40 000 PV, cela fait 800 PV/s.

## IMPORTANT

1. **Mitraillette meilleure que le Fusil d'assaut presque partout.**
   - Par pièce : 50 contre 39 DPS pour 100 pièces, et elle reste devant contre les rapides, les volants et les invisibles.
   - Le Fusil d'assaut perd son rôle de « polyvalent rentable du début ».
   - La Mitraillette est bien faible contre les blindés (28 % de ses dégâts), comme prévu.

2. **Sniper : bon contre les boss, faible contre les tanks.**
   - Contre les tanks, il fait 23 DPS pour 100 pièces, contre 38 pour le Fusil d'assaut et 51 pour la Mitraillette.
   - Il n'est la meilleure réponse que contre les boss (21 contre 10 au mieux pour les autres).

3. **Drone : la tourelle la moins rentable du jeu.** 14 DPS pour 100 pièces dans toutes les situations, sans niche.

4. **Lance-roquettes : rôle de zone faible.**
   - Contre les groupes, il fait 51 pour 100 pièces, contre 88 pour la Mine et 46 pour la Cryo.
   - Il est rattrapé par la Tesla (46), qui fait mieux que lui dans tout le reste.

5. **Améliorations mal calibrées par rapport à l'achat d'une nouvelle tourelle (objectif ±20 %).**
   - Trop rentables : Minigun +63-72 %, Pompe +31-35 %, Mitraillette niv. 3 +41 %.
   - Pas assez rentables : Mine -38-41 %, Plasma niv. 2 -34 %.

6. **3e étoile déséquilibrée.**
   - « N tourelles maximum » est réussie environ 90 % du temps : trop facile.
   - « Finir en moins de X min » n'est réussie qu'environ 10 % du temps, parce qu'il faut lancer les vagues en avance. Le bonus en avance devient de fait obligatoire pour cette étoile.

7. **Nouvel ennemi noyé dans la masse.**
   - Exemples : 5 Medusa invisibles avec 17 Peperoncino, 4 Granchio blindés avec 6 volants, 4 Camaleonte avec 10 invisibles.
   - La carte de présentation s'affiche bien, mais le joueur découvre l'ennemi en plein mélange.

8. **Rangs inutiles.**
   - Talents : Poudre premium, Culasse huilée et Longue-vue (2 % par rang), Œil vif (+1 % de critiques, soit environ +1 % de DPS), Brocanteur (ne joue qu'en revendant).
   - Château : le rang 4 de Réparation est identique au rang 3 (1 PV toutes les 2 vagues).

9. **Économie hors partie.**
   - Les récompenses quotidiennes font 36 % des pièces gagnées sur 60 jours (roue 15 %, quêtes 13 %, passe 6 %, cadeau 2 %).
   - Le château est au maximum dès le jour 23 (5 semaines trop tôt). Ensuite, les pièces ne servent plus qu'aux coffres dorés achetés en pièces (29 coffres, 109 000 pièces).
   - En fin de campagne, les talents sont à 13/58 : presque tous les points arrivent après, par les défis Héroïques.

10. **Lisibilité au pire moment** (capture `perf-pire-moment`, boss + 115 brainrots + x3) :
    - barres de vie empilées en un paquet illisible ;
    - chiffres de dégâts qui se superposent ;
    - « x4 COMBO » géant par-dessus le terrain ;
    - notification « Étoile manquée » posée sur le haut du chemin en pleine vague.

11. **Performance.**
    - La logique du jeu est légère : 2 ms par image en médiane, même au pire moment.
    - Le dessin domine : 81 % du temps est du rendu natif. Avec une définition x3 et un rendu logiciel (pas de carte graphique ici), des pics de 40 à 75 ms apparaissent et la qualité automatique descend au cran le plus bas.
    - Pistes sans rien ajouter :
      - moins de `save`/`restore` par ennemi ;
      - pas de barre de vie pour les ennemis intacts dans une foule ;
      - textes flottants fusionnés plus tôt.
    - La fluidité réelle sur iPhone ne peut se vérifier que sur l'appareil.

12. **Rythme de progression non vérifié en conditions réelles.** `progression.cjs` suppose ses propres chances de victoire, sans jouer les parties. Après le rééquilibrage, il faudra les recaler sur les simulations réelles pour garder le monde 1 vers le jour 3-4 et la campagne vers 4-5 semaines.

## FINITION

1. **Durées.** Les premiers niveaux de chaque monde durent 3,5 à 4,2 min. Les niveaux 9 et 10 d'un monde durent 6,2 à 7,8 min (13-14 vagues).
2. **Nombres abrégés en anglais.** « 10.0M » et « 12.5k » s'écrivent avec un point. Ailleurs, le jeu utilise la virgule (« 10,0 M »).
3. **Revente sans retour haptique.** La pose et l'amélioration vibrent, pas la revente.
4. **Pièces restantes en fin de boss.** 1 600 à 2 400 pièces restent en fin de boss dans les mondes 4 à 8. C'est moins que le seuil de 5 000, mais elles ne servent à rien.
5. **Vérifiés sans problème :**
   - pas de fuite mémoire (+0,6 Mo sur 8 niveaux) ;
   - aucune erreur de console ;
   - aucun débordement en 375, 390 et 430 px ;
   - tests des menus (barre de pose, menu radial) au vert ;
   - aucune revente rentable ;
   - blindage au moins 25 % ;
   - 2 à 3 tourelles dès la 1re vague ;
   - première victoire facile (100 % même pour le débutant).

---

## Choix à faire avant de corriger (2 options chacun, ma recommandation en premier)

1. **Quel joueur doit gagner 80-90 % ?**
   - **A (recommandé)** : le joueur moyen simulé. Je vérifierai que le débutant garde au moins 65 % sur les niveaux normaux.
   - **B** : le débutant. Le jeu reste plus doux, et le joueur moyen gagnerait alors environ 95 %.
2. **Plasma.**
   - **A (recommandé)** : la boule traverse au plus 4 ennemis au niveau 1 (plus aux niveaux supérieurs). Le Lance-roquettes reprend les foules et le Sniper les lignes de tanks. Cela réutilise la stat « pierce » qui existe déjà pour les balles.
   - **B** : on garde la traversée illimitée et on baisse dégâts et taille. C'est plus simple, mais le Plasma reste le meilleur contre les groupes.
3. **Régénération des mutés (Renaissance).**
   - **A (recommandé)** : les boss et mini-boss ne se régénèrent plus. Leurs PV augmentent déjà avec le rang. Les PV des autres mutés montent un peu plus par rang, pour que chaque rang se sente sur les niveaux normaux.
   - **B** : on garde la régénération partout, plafonnée en PV par seconde.
4. **3e étoile « temps limite ».**
   - **A (recommandé)** : on l'assouplit pour qu'environ 40 % des parties la réussissent sans lancer les vagues en avance. Lancer en avance aide, sans être obligatoire. En parallèle, on resserre « N tourelles maximum » vers 40 %.
   - **B** : tous les niveaux passent à l'objectif « N tourelles maximum ».
5. **Château trop vite au maximum.**
   - **A (recommandé)** : rangs 4-5 et capacités de rang 3 plus chers, pour finir le château vers les semaines 6-7. Les pièces gardent un usage pendant toute la campagne.
   - **B** : on garde les prix et on réduit les pièces gagnées dans les mondes 5 à 8.

## Ordre des corrections proposé

Un commit et un push par étape, avec captures en 375 et 390 px.

1. **Difficulté et courbe :**
   - un coefficient par niveau dans `config.js`, calculé par `tools/balance.cjs`, pour un DPS requis de +5 à +10 % par niveau ;
   - 1 à 2 vagues calmes par niveau ;
   - présentation des nouveaux ennemis ;
   - capacités des boss annoncées ;
   - Renaissance.
2. **Tourelles et améliorations :** rôles, branches à ±10 %, améliorations à ±20 %, interdiction de fait des stratégies à une seule tourelle.
3. **Talents, château, boosts et économie :** rangs fusionnés, quotidien sous 30 %, rythme recalé sur les simulations réelles.
4. **Finition :** lisibilité au pire moment, nombres en français, retours de revente, durées.

Après chaque étape, je relance les mêmes tableaux et je les compare aux objectifs.

---

# Tableaux complets (état actuel)

## 1. Banc d'essai des tourelles (cibles immobiles, 120 s, aucun talent)

DPS mono = 1 cible ; groupe = 6 cibles espacées de 24 px ; blindé = blindage 5 ; boss = Tricheco. Coût cumulé = prix + améliorations. C = branche Mk II (boutique de Renaissance).

| Tourelle | Niv. | Nom | Coût cumulé | DPS mono | DPS / 100 pièces | DPS groupe (6) | Blindé (5) | % vs blindé | Boss |
|---|---|---|---|---|---|---|---|---|---|
| Fusil d'assaut | 1 | Fusil d'assaut | 100 | 38 | 38,0 | 38 | 22 | 58 % | 37 |
| Fusil d'assaut | 2 | Fusil d'assaut | 170 | 63 | 37,0 | 63 | 45 | 72 % | 65 |
| Fusil d'assaut | 3 | Fusil d'assaut | 295 | 108 | 36,5 | 108 | 89 | 83 % | 106 |
| Fusil d'assaut | 4A | Rafale | 555 | 189 | 34,1 | 188 | 155 | 82 % | 188 |
| Fusil d'assaut | 5A | Tempête de plomb | 985 | 339 | 34,4 | 338 | 289 | 85 % | 340 |
| Fusil d'assaut | 4B | Balles traçantes | 535 | 169 | 31,5 | 165 | 146 | 86 % | 162 |
| Fusil d'assaut | 5B | Œil de lynx | 935 | 301 | 32,2 | 298 | 269 | 89 % | 299 |
| Fusil d'assaut | 4C | Munitions explosives | 565 | 200 | 35,5 | 286 | 167 | 83 % | 196 |
| Fusil d'assaut | 5C | Obus | 1015 | 275 | 27,1 | 466 | 247 | 90 % | 278 |
| Mitraillette | 1 | Mitraillette | 85 | 44 | 51,8 | 44 | 12 | 28 % | 44 |
| Mitraillette | 2 | Mitraillette | 145 | 74 | 51,1 | 74 | 23 | 31 % | 74 |
| Mitraillette | 3 | Mitraillette | 250 | 123 | 49,3 | 124 | 66 | 54 % | 124 |
| Mitraillette | 4A | Balles perforantes | 470 | 158 | 33,6 | 319 | 160 | 101 % | 161 |
| Mitraillette | 5A | Perce-tout | 850 | 238 | 28,0 | 484 | 238 | 100 % | 238 |
| Mitraillette | 4B | Double canon | 490 | 273 | 55,6 | 271 | 148 | 54 % | 272 |
| Mitraillette | 5B | Triple canon | 910 | 489 | 53,7 | 489 | 302 | 62 % | 487 |
| Mitraillette | 4C | Balles ricochets | 510 | 137 | 27,0 | 297 | 73 | 53 % | 136 |
| Mitraillette | 5C | Billard infernal | 950 | 191 | 20,1 | 642 | 127 | 67 % | 190 |
| Pompe | 1 | Pompe | 130 | 49 | 37,8 | 49 | 21 | 44 % | 49 |
| Pompe | 2 | Pompe | 215 | 82 | 38,2 | 83 | 50 | 61 % | 81 |
| Pompe | 3 | Pompe | 365 | 140 | 38,4 | 138 | 103 | 74 % | 138 |
| Pompe | 4A | Souffle du dragon | 645 | 181 | 28,1 | 180 | 136 | 75 % | 179 |
| Pompe | 5A | Brasier | 1085 | 246 | 22,7 | 273 | 180 | 73 % | 248 |
| Pompe | 4B | Canon long | 635 | 211 | 33,3 | 212 | 172 | 82 % | 204 |
| Pompe | 5B | Chasseur de gros | 1075 | 423 | 39,3 | 419 | 365 | 86 % | 415 |
| Pompe | 4C | Fléchettes | 645 | 140 | 21,7 | 271 | 136 | 98 % | 139 |
| Pompe | 5C | Tempête de fléchettes | 1105 | 232 | 21,0 | 441 | 230 | 99 % | 230 |
| Sniper | 1 | Sniper | 220 | 50 | 22,8 | 50 | 47 | 93 % | 49 |
| Sniper | 2 | Sniper | 360 | 92 | 25,5 | 85 | 85 | 93 % | 82 |
| Sniper | 3 | Sniper | 600 | 143 | 23,8 | 133 | 143 | 100 % | 160 |
| Sniper | 4A | Calibre lourd | 1080 | 315 | 29,1 | 288 | 311 | 99 % | 306 |
| Sniper | 5A | Tueur de boss | 1830 | 580 | 31,7 | 502 | 507 | 87 % | 551 |
| Sniper | 4B | Lunette thermique | 1020 | 276 | 27,1 | 272 | 254 | 92 % | 260 |
| Sniper | 5B | Semi-auto | 1700 | 467 | 27,5 | 448 | 449 | 96 % | 464 |
| Sniper | 4C | Rail-gun | 1100 | 191 | 17,4 | 169 | 175 | 92 % | 169 |
| Sniper | 5C | Canon électromagnétique | 1880 | 311 | 16,6 | 310 | 335 | 108 % | 320 |
| Lance-roquettes | 1 | Lance-roquettes | 280 | 25 | 8,9 | 99 | 23 | 91 % | 23 |
| Lance-roquettes | 2 | Lance-roquettes | 450 | 40 | 8,9 | 140 | 41 | 104 % | 40 |
| Lance-roquettes | 3 | Lance-roquettes | 740 | 71 | 9,6 | 227 | 65 | 92 % | 67 |
| Lance-roquettes | 4A | Fragmentation | 1260 | 79 | 6,3 | 389 | 77 | 98 % | 95 |
| Lance-roquettes | 5A | Tapis de bombes | 2080 | 129 | 6,2 | 701 | 125 | 97 % | 172 |
| Lance-roquettes | 4B | Missile guidé | 1240 | 140 | 11,3 | 568 | 126 | 90 % | 146 |
| Lance-roquettes | 5B | Salve | 2040 | 269 | 13,2 | 1062 | 272 | 101 % | 276 |
| Lance-roquettes | 4C | Napalm | 1280 | 96 | 7,5 | 421 | 76 | 80 % | 94 |
| Lance-roquettes | 5C | Mer de feu | 2110 | 126 | 6,0 | 664 | 106 | 84 % | 125 |
| Minigun | 1 | Minigun | 400 | 97 | 24,3 | 98 | 29 | 30 % | 96 |
| Minigun | 2 | Minigun | 640 | 163 | 25,5 | 164 | 79 | 48 % | 164 |
| Minigun | 3 | Minigun | 1040 | 275 | 26,4 | 278 | 180 | 65 % | 274 |
| Minigun | 4A | Surchauffe | 1720 | 410 | 23,8 | 414 | 269 | 66 % | 412 |
| Minigun | 5A | Fusion | 2720 | 616 | 22,7 | 609 | 462 | 75 % | 611 |
| Minigun | 4B | Balles incendiaires | 1680 | 349 | 20,8 | 347 | 242 | 69 % | 352 |
| Minigun | 5B | Enfer | 2630 | 467 | 17,8 | 467 | 354 | 76 % | 466 |
| Tourelle cryo | 1 | Tourelle cryo | 150 | 3 | 2,1 | 19 | 3 | 100 % | 3 |
| Tourelle cryo | 2 | Tourelle cryo | 250 | 5 | 1,9 | 29 | 5 | 100 % | 5 |
| Tourelle cryo | 3 | Tourelle cryo | 420 | 8 | 2,0 | 51 | 8 | 100 % | 8 |
| Tourelle cryo | 4A | Zéro absolu | 740 | 8 | 1,1 | 51 | 8 | 100 % | 8 |
| Tourelle cryo | 5A | Ère glaciaire | 1260 | 8 | 0,7 | 51 | 8 | 100 % | 8 |
| Tourelle cryo | 4B | Givre fragilisant | 760 | 33 | 4,3 | 197 | 33 | 100 % | 33 |
| Tourelle cryo | 5B | Cristal brisé | 1300 | 38 | 2,9 | 228 | 38 | 100 % | 38 |
| Laser | 1 | Laser | 300 | 95 | 31,8 | 96 | 45 | 48 % | 95 |
| Laser | 2 | Laser | 500 | 155 | 30,9 | 153 | 98 | 64 % | 154 |
| Laser | 3 | Laser | 830 | 250 | 30,1 | 249 | 188 | 75 % | 251 |
| Laser | 4A | Prisme | 1390 | 212 | 15,3 | 638 | 150 | 71 % | 213 |
| Laser | 5A | Arc-en-ciel | 2270 | 321 | 14,2 | 1603 | 256 | 80 % | 320 |
| Laser | 4B | Surchauffe | 1370 | 514 | 37,5 | 512 | 440 | 86 % | 521 |
| Laser | 5B | Rayon solaire | 2230 | 917 | 41,1 | 912 | 899 | 98 % | 909 |
| Tesla | 1 | Tesla | 280 | 45 | 16,0 | 129 | 38 | 84 % | 45 |
| Tesla | 2 | Tesla | 470 | 76 | 16,3 | 225 | 73 | 96 % | 78 |
| Tesla | 3 | Tesla | 780 | 125 | 16,1 | 371 | 123 | 98 % | 128 |
| Tesla | 4A | Orage | 1300 | 163 | 12,6 | 580 | 155 | 95 % | 155 |
| Tesla | 5A | Tempête électrique | 2120 | 245 | 11,5 | 888 | 233 | 95 % | 243 |
| Tesla | 4B | Surtension | 1320 | 178 | 13,5 | 531 | 170 | 95 % | 182 |
| Tesla | 5B | Paralysie | 2160 | 291 | 13,5 | 841 | 279 | 96 % | 284 |
| Tesla | 4C | Arc magnétique | 1320 | 148 | 11,2 | 565 | 150 | 102 % | 147 |
| Tesla | 5C | Orage polaire | 2160 | 240 | 11,1 | 894 | 247 | 103 % | 258 |
| Plasma | 1 | Plasma | 360 | 53 | 14,8 | 151 | 51 | 95 % | 52 |
| Plasma | 2 | Plasma | 600 | 82 | 13,7 | 170 | 87 | 105 % | 92 |
| Plasma | 3 | Plasma | 990 | 145 | 14,6 | 293 | 141 | 98 % | 137 |
| Plasma | 4A | Fusion | 1630 | 204 | 12,5 | 594 | 194 | 95 % | 201 |
| Plasma | 5A | Supernova | 2610 | 328 | 12,6 | 922 | 314 | 95 % | 328 |
| Plasma | 4B | Double cœur | 1610 | 326 | 20,2 | 654 | 340 | 104 % | 322 |
| Plasma | 5B | Réacteur | 2570 | 663 | 25,8 | 1534 | 650 | 98 % | 623 |
| Drone | 1 | Drone | 320 | 45 | 14,2 | 45 | 30 | 66 % | 45 |
| Drone | 2 | Drone | 530 | 73 | 13,8 | 74 | 56 | 77 % | 72 |
| Drone | 3 | Drone | 880 | 124 | 14,1 | 120 | 98 | 79 % | 119 |
| Drone | 4A | Escadrille | 1440 | 235 | 16,3 | 245 | 202 | 86 % | 237 |
| Drone | 5A | Essaim | 2320 | 501 | 21,6 | 493 | 443 | 88 % | 500 |
| Drone | 4B | Bombardier | 1460 | 171 | 11,7 | 636 | 163 | 95 % | 170 |
| Drone | 5B | Tapis de feu | 2360 | 237 | 10,0 | 864 | 223 | 94 % | 244 |
| Mine | 1 | Mine | 70 | 11 | 16,0 | 50 | 12 | 111 % | 12 |
| Mine | 2 | Mine | 130 | 19 | 14,3 | 78 | 17 | 92 % | 17 |
| Mine | 3 | Mine | 230 | 28 | 12,1 | 124 | 27 | 96 % | 31 |
| Mine | 4A | Méga-mine | 450 | 47 | 10,4 | 246 | 48 | 103 % | 51 |
| Mine | 5A | Cratère | 830 | 97 | 11,7 | 481 | 92 | 95 % | 105 |
| Mine | 4B | Piège électrique | 440 | 41 | 9,3 | 190 | 38 | 94 % | 42 |
| Mine | 5B | Bobine Tesla | 800 | 70 | 8,8 | 339 | 78 | 111 % | 82 |

### Branches, gains par amélioration, rentabilité d'une amélioration

Puissance = moyenne géométrique des DPS mono, groupe et blindé. Dernière colonne : DPS gagné par pièce d'amélioration, en % du DPS par pièce d'une tourelle neuve de niveau 1 (objectif 80-120 %).

| Tourelle | Puissance 4A / 4B | Écart niv. 4 | Puissance 5A / 5B | Écart niv. 5 | Gain niv. 2 | Gain niv. 3 | Gain niv. 4 (A / B) | Gain niv. 5 (A / B) | Amélioration vs tourelle neuve (niv. 2 / 3) |
|---|---|---|---|---|---|---|---|---|---|
| Fusil d'assaut | 177 / 159 | 11 % | 321 / 289 | 11 % | +78 % | +79 % | +74 % / +57 % | +82 % / +81 % | 112 % / 113 % |
| Mitraillette | 200 / 222 | 11 % | 302 / 416 | 38 % | +75 % | +100 % | +100 % / +122 % | +51 % / +87 % | 106 % / 141 % |
| Pompe | 164 / 197 | 20 % | 229 / 401 | 75 % | +88 % | +80 % | +30 % / +57 % | +40 % / +103 % | 135 % / 131 % |
| Sniper | 305 / 267 | 14 % | 528 / 455 | 16 % | +79 % | +60 % | +118 % / +92 % | +73 % / +70 % | 124 % / 98 % |
| Lance-roquettes | 133 / 216 | 62 % | 224 / 427 | 91 % | +60 % | +66 % | +31 % / +112 % | +68 % / +98 % | 99 % / 102 % |
| Minigun | 358 / 308 | 16 % | 558 / 426 | 31 % | +98 % | +87 % | +49 % / +29 % | +56 % / +38 % | 163 % / 172 % |
| Tourelle cryo | 15 / 60 | 290 % | 15 / 69 | 350 % | +50 % | +76 % | +0 % / +290 % | +0 % / +15 % | 75 % / 100 % |
| Laser | 273 / 487 | 79 % | 509 / 909 | 79 % | +78 % | +71 % | +20 % / +115 % | +87 % / +87 % | 117 % / 115 % |
| Tesla | 245 / 252 | 3 % | 370 / 409 | 11 % | +79 % | +66 % | +37 % / +41 % | +51 % / +62 % | 117 % / 106 % |
| Plasma | 287 / 417 | 45 % | 456 / 871 | 91 % | +44 % | +70 % | +58 % / +130 % | +59 % / +109 % | 66 % / 93 % |
| Drone | 227 / 261 | 15 % | 478 / 357 | 34 % | +71 % | +68 % | +100 % / +130 % | +111 % / +37 % | 108 % / 106 % |
| Mine | 82 / 67 | 23 % | 163 / 123 | 32 % | +53 % | +55 % | +82 % / +48 % | +98 % / +84 % | 62 % / 59 % |

## 2. Rôles : qui répond le mieux à chaque menace ?

Ennemis réels sur tout le chemin, à leur espacement normal, moyenne de 2 socles. Débit (groupe, tanks, blindés, volants, invisibles, boss) : dégâts utiles par seconde sur des ennemis qui ne meurent pas. Capacité (rapides, diviseurs) : PV traités par seconde par une tourelle seule qui en élimine 90 % (0 = elle n'y arrive pas, même contre des ennemis presque sans PV). Valeurs pour 100 pièces investies.

### Niveau 1 : dégâts utiles par seconde (rapides, diviseurs : PV traités par seconde) pour 100 pièces investies, meilleur de chaque colonne en gras

| Tourelle | Config | Coût | rapides | groupe | tanks | blindés | volants | diviseurs | invisibles | boss |
|---|---|---|---|---|---|---|---|---|---|---|
| Fusil d'assaut | 1  | 100 | 28,4 | 38,0 | 38,5 | 22,2 | 37,9 | 13,6 | 37,9 | 10,2 |
| Mitraillette | 1  | 85 | **53,1** | 51,5 | 51,4 | 14,4 | 51,3 | 31,5 | **52,0** | 10,5 |
| Pompe | 1  | 130 | 0,0 | 37,4 | 38,2 | 16,6 | 37,8 | 2,5 | 37,3 | 7,9 |
| Sniper | 1  | 220 | 0,0 | 23,8 | 23,5 | 21,8 | 23,6 | 0,0 | 24,0 | **20,9** |
| Lance-roquettes | 1  | 280 | 2,2 | 51,2 | 22,4 | 20,2 | 19,6 | 10,6 | 19,2 | 3,2 |
| Minigun | 1  | 400 | 24,5 | 24,5 | 23,8 | 7,2 | 23,9 | 16,0 | 23,7 | 5,9 |
| Tourelle cryo | 1  | 150 | 14,9 | 46,0 | 18,3 | 17,8 | 15,3 | 12,4 | 15,4 | 0,6 |
| Laser | 1  | 300 | 23,4 | 21,5 | 25,7 | 8,1 | 22,3 | 14,0 | 23,9 | 9,0 |
| Tesla | 1  | 280 | 36,1 | 45,8 | 42,3 | 38,1 | 43,2 | 14,1 | 36,5 | 4,1 |
| Plasma | 1  | 360 | 0,3 | **206,8** | **88,3** | **88,2** | **58,0** | **46,5** | 19,4 | 6,4 |
| Drone | 1  | 320 | 11,0 | 14,4 | 14,0 | 9,1 | 14,4 | 1,8 | 14,4 | 3,9 |
| Mine | 1  | 70 | 0,0 | 88,5 | 40,5 | 40,1 | 0,0 | 0,0 | 37,8 | 1,0 |

### Niveau 3 : dégâts utiles par seconde (rapides, diviseurs : PV traités par seconde) pour 100 pièces investies, meilleur de chaque colonne en gras

| Tourelle | Config | Coût | rapides | groupe | tanks | blindés | volants | diviseurs | invisibles | boss |
|---|---|---|---|---|---|---|---|---|---|---|
| Fusil d'assaut | 3  | 295 | 36,3 | 35,7 | 36,4 | 29,6 | 37,1 | 21,6 | 36,1 | 10,8 |
| Mitraillette | 3  | 250 | 54,4 | 48,8 | 49,6 | 26,4 | 49,4 | 30,7 | **48,5** | 11,1 |
| Pompe | 3  | 365 | 23,3 | 37,5 | 37,3 | 28,6 | 38,2 | 13,7 | 38,0 | 8,6 |
| Sniper | 3  | 600 | 0,0 | 23,4 | 24,2 | 24,7 | 23,7 | 0,0 | 24,1 | **21,6** |
| Lance-roquettes | 3  | 740 | 10,3 | 53,8 | 23,8 | 23,0 | 20,9 | 17,8 | 21,4 | 4,0 |
| Minigun | 3  | 1040 | 26,3 | 26,2 | 26,1 | 17,0 | 25,6 | 17,2 | 25,8 | 7,1 |
| Tourelle cryo | 3  | 420 | 20,8 | 60,5 | 23,6 | 23,5 | 20,0 | 15,3 | 20,6 | 0,6 |
| Laser | 3  | 830 | 24,1 | 20,4 | 23,9 | 15,2 | 21,2 | 13,8 | 23,0 | 9,5 |
| Tesla | 3  | 780 | 39,7 | 48,7 | 46,5 | 43,5 | 47,2 | 23,4 | 37,9 | 4,7 |
| Plasma | 3  | 990 | **57,8** | **220,0** | **79,6** | **85,3** | **83,4** | **36,0** | 18,9 | 8,9 |
| Drone | 3  | 880 | 11,3 | 13,5 | 13,5 | 11,6 | 13,7 | 5,4 | 13,3 | 3,9 |
| Mine | 3  | 230 | 0,0 | 81,3 | 30,7 | 29,7 | 0,0 | 0,0 | 28,0 | 0,6 |

### Niveau 5 : dégâts utiles par seconde (rapides, diviseurs : PV traités par seconde) pour 100 pièces investies, meilleur de chaque colonne en gras

| Tourelle | Config | Coût | rapides | groupe | tanks | blindés | volants | diviseurs | invisibles | boss |
|---|---|---|---|---|---|---|---|---|---|---|
| Fusil d'assaut | 5A Tempête de plomb | 985 | 40,1 | 34,7 | 33,9 | 30,2 | 33,9 | 22,0 | 34,0 | 10,3 |
| Fusil d'assaut | 5B Œil de lynx | 935 | 27,2 | 31,6 | 31,7 | 28,7 | 31,7 | 14,6 | 30,3 | 11,0 |
| Fusil d'assaut | 5C Obus | 1015 | 35,0 | 54,6 | 36,0 | 32,0 | 35,2 | 23,2 | 34,7 | 8,3 |
| Mitraillette | 5A Perce-tout | 850 | 54,3 | 108,0 | 64,3 | 62,0 | 58,5 | 39,8 | 50,0 | 6,5 |
| Mitraillette | 5B Triple canon | 910 | 58,4 | 54,0 | 53,6 | 33,3 | 53,4 | 35,7 | 53,5 | 12,1 |
| Mitraillette | 5C Billard infernal | 950 | 66,4 | 68,3 | 60,1 | 33,7 | 59,4 | 39,6 | 49,4 | 4,5 |
| Pompe | 5A Brasier | 1085 | 18,0 | 28,0 | 25,6 | 17,7 | 26,1 | 8,8 | 25,1 | 5,2 |
| Pompe | 5B Chasseur de gros | 1075 | 34,6 | 38,1 | 38,7 | 34,2 | 39,3 | 18,4 | 38,2 | 12,4 |
| Pompe | 5C Tempête de fléchettes | 1105 | 23,0 | 62,1 | 43,3 | 37,6 | 37,2 | 19,9 | 26,5 | 5,7 |
| Sniper | 5A Tueur de boss | 1830 | 0,0 | 29,5 | 29,5 | 28,7 | 29,5 | 0,0 | 29,2 | **27,4** |
| Sniper | 5B Semi-auto | 1700 | 29,8 | 27,8 | 26,5 | 27,5 | 27,2 | 0,0 | 27,2 | 25,0 |
| Sniper | 5C Canon électromagnétique | 1880 | 28,7 | 206,6 | **120,1** | 97,7 | 73,5 | 0,0 | 24,8 | 14,9 |
| Lance-roquettes | 5A Tapis de bombes | 2080 | 18,7 | 65,1 | 27,5 | 26,1 | 21,4 | 14,5 | 21,8 | 3,5 |
| Lance-roquettes | 5B Salve | 2040 | 37,0 | 75,1 | 32,3 | 31,9 | 29,0 | 31,5 | 29,3 | 8,0 |
| Lance-roquettes | 5C Mer de feu | 2110 | 22,7 | 62,7 | 24,3 | 20,0 | 18,1 | 13,1 | 22,5 | 2,8 |
| Minigun | 5A Fusion | 2720 | 24,2 | 22,1 | 21,9 | 16,5 | 21,3 | 16,1 | 21,3 | 6,4 |
| Minigun | 5B Enfer | 2630 | 19,0 | 21,4 | 18,5 | 13,9 | 19,2 | 12,2 | 17,8 | 4,9 |
| Tourelle cryo | 5A Ère glaciaire | 1260 | 14,9 | 53,5 | 18,8 | 20,8 | 17,1 | 11,0 | 17,8 | 0,3 |
| Tourelle cryo | 5B Cristal brisé | 1300 | 35,3 | 102,6 | 39,6 | 39,6 | 34,3 | 26,3 | 35,0 | 1,1 |
| Laser | 5A Arc-en-ciel | 2270 | 53,6 | 48,0 | 55,2 | 38,3 | 46,8 | 27,7 | 37,8 | 4,5 |
| Laser | 5B Rayon solaire | 2230 | 23,7 | 21,0 | 32,6 | 28,8 | 26,0 | 13,1 | 30,4 | 13,0 |
| Tesla | 5A Tempête électrique | 2120 | 49,8 | 51,6 | 45,6 | 43,5 | 44,0 | 25,4 | 32,1 | 3,3 |
| Tesla | 5B Paralysie | 2160 | 47,7 | 38,7 | 38,6 | 37,3 | 38,6 | 21,6 | 38,8 | 3,9 |
| Tesla | 5C Orage polaire | 2160 | 52,5 | 47,5 | 45,3 | 43,2 | 46,0 | 26,8 | 37,9 | 4,5 |
| Plasma | 5A Supernova | 2610 | 54,0 | 241,8 | 96,1 | 97,4 | 97,9 | 53,2 | 30,8 | 8,7 |
| Plasma | 5B Réacteur | 2570 | **109,5** | **282,0** | 117,9 | **109,0** | **122,2** | **66,7** | 33,2 | 13,8 |
| Drone | 5A Essaim | 2320 | 23,7 | 21,6 | 21,6 | 19,1 | 21,5 | 14,0 | 21,6 | 6,7 |
| Drone | 5B Tapis de feu | 2360 | 22,6 | 53,8 | 24,9 | 24,1 | 19,4 | 16,0 | 22,6 | 2,9 |
| Mine | 5A Cratère | 830 | 0,0 | 110,3 | 42,4 | 43,2 | 0,0 | 0,0 | 35,7 | 0,9 |
| Mine | 5B Bobine Tesla | 800 | 0,0 | 187,5 | 91,7 | 83,0 | 0,0 | 0,0 | **56,7** | 0,7 |

## 3. Courbe de difficulté

DPS requis = PV de la vague / (durée des apparitions + traversée du chemin). Vagues calmes = vagues au moins 15 % plus calmes que la précédente.

| Niveau | Vagues | Chemin (px) | PV totaux | Ennemis | DPS requis au pic | Écart / niveau normal précédent | Vagues calmes | Pic en fin | PV boss | Pièces gagnables |
|---|---|---|---|---|---|---|---|---|---|---|
| 1-1 | 9 | 2156 | 20648 | 236 | 135 | - | 0 | oui | - | 1980 |
| 1-2 | 10 | 1456 | 19052 | 282 | 145 | +7 % | 0 | oui | - | 2300 |
| 1-3 | 10 | 1996 | 34673 | 228 | 235 | +62 % | 0 | oui | - | 2245 |
| 1-4 | 11 | 2256 | 54669 | 282 | 298 | +27 % | 0 | oui | - | 2644 |
| 1-5 | 11 | 2086 | 47836 | 262 | 299 | +0 % | 0 | oui | - | 2550 |
| 1-6 | 12 | 1206 | 35374 | 277 | 247 | -17 % | 0 | oui | - | 2900 |
| 1-7 | 12 | 2806 | 64225 | 290 | 290 | +18 % | 0 | oui | - | 2919 |
| 1-8 | 13 | 2156 | 76749 | 351 | 404 | +39 % | 0 | oui | - | 3348 |
| 1-9 | 14 | 1456 | 66541 | 391 | 392 | -3 % | 0 | oui | - | 3742 |
| 1-10 (boss) | 20 | 1356 | 221030 | 734 | 1036 | - | 0 | oui | 10410 | 6828 |
| 2-1 | 9 | 2256 | 29815 | 183 | 199 | -49 % | 0 | oui | - | 1972 |
| 2-2 | 10 | 2806 | 38068 | 200 | 190 | -4 % | 0 | oui | - | 2271 |
| 2-3 | 10 | 2156 | 39506 | 203 | 264 | +39 % | 0 | oui | - | 2289 |
| 2-4 | 11 | 1206 | 30355 | 251 | 250 | -5 % | 0 | oui | - | 2668 |
| 2-5 | 11 | 1996 | 53404 | 239 | 293 | +17 % | 1 | oui | - | 2580 |
| 2-6 | 12 | 2086 | 77329 | 259 | 378 | +29 % | 0 | oui | - | 2915 |
| 2-7 | 12 | 2086 | 75527 | 270 | 465 | +23 % | 0 | oui | - | 2928 |
| 2-8 | 13 | 1456 | 74689 | 276 | 447 | -4 % | 0 | oui | - | 3259 |
| 2-9 | 14 | 2256 | 138303 | 383 | 627 | +40 % | 0 | oui | - | 3777 |
| 2-10 (boss) | 22 | 1426 | 302646 | 678 | 1178 | - | 2 | oui | 10665 | 7348 |
| 3-1 | 9 | 1996 | 35076 | 176 | 237 | -62 % | 0 | oui | - | 1984 |
| 3-2 | 10 | 2086 | 48024 | 191 | 383 | +62 % | 0 | oui | - | 2336 |
| 3-3 | 10 | 1356 | 31541 | 205 | 247 | -36 % | 0 | oui | - | 2319 |
| 3-4 | 11 | 2806 | 64489 | 237 | 347 | +41 % | 0 | oui | - | 2731 |
| 3-5 | 11 | 2256 | 66218 | 248 | 329 | -5 % | 1 | oui | - | 2718 |
| 3-6 | 12 | 1456 | 50767 | 288 | 369 | +12 % | 1 | oui | - | 3116 |
| 3-7 | 12 | 2086 | 88476 | 279 | 501 | +36 % | 0 | oui | - | 3069 |
| 3-8 | 13 | 1426 | 74960 | 305 | 435 | -13 % | 1 | oui | - | 3437 |
| 3-9 | 14 | 2156 | 148571 | 324 | 736 | +69 % | 1 | oui | - | 3842 |
| 3-10 (boss) | 24 | 1206 | 373757 | 737 | 1708 | - | 3 | oui | 17804 | 8642 |
| 4-1 | 9 | 1456 | 27574 | 176 | 218 | -70 % | 0 | oui | - | 2184 |
| 4-2 | 10 | 1426 | 43275 | 174 | 268 | +23 % | 0 | oui | - | 2355 |
| 4-3 | 10 | 2156 | 56388 | 184 | 338 | +26 % | 0 | oui | - | 2382 |
| 4-4 | 11 | 1996 | 71035 | 211 | 378 | +12 % | 0 | oui | - | 2758 |
| 4-5 | 11 | 1206 | 43954 | 197 | 288 | -24 % | 0 | oui | - | 2792 |
| 4-6 | 12 | 2086 | 124022 | 205 | 580 | +101 % | 1 | oui | - | 3191 |
| 4-7 | 12 | 2256 | 109934 | 257 | 665 | +15 % | 1 | oui | - | 3159 |
| 4-8 | 13 | 2086 | 127636 | 275 | 666 | +0 % | 0 | oui | - | 3675 |
| 4-9 | 14 | 1356 | 109466 | 286 | 686 | +3 % | 1 | oui | - | 4179 |
| 4-10 (boss) | 25 | 2806 | 753824 | 669 | 2247 | - | 4 | oui | 21806 | 9534 |
| 5-1 | 9 | 2086 | 60587 | 150 | 454 | -34 % | 0 | oui | - | 2213 |
| 5-2 | 10 | 1356 | 49425 | 156 | 361 | -21 % | 0 | oui | - | 2543 |
| 5-3 | 10 | 2806 | 77183 | 190 | 529 | +47 % | 0 | oui | - | 2528 |
| 5-4 | 11 | 1426 | 54063 | 188 | 366 | -31 % | 0 | oui | - | 3013 |
| 5-5 | 11 | 2256 | 100828 | 267 | 469 | +28 % | 0 | oui | - | 3072 |
| 5-6 | 12 | 1996 | 115791 | 272 | 576 | +23 % | 0 | oui | - | 3431 |
| 5-7 | 12 | 1206 | 84265 | 226 | 625 | +8 % | 0 | oui | - | 3415 |
| 5-8 | 13 | 2156 | 172620 | 262 | 883 | +41 % | 1 | oui | - | 3818 |
| 5-9 | 14 | 1456 | 159214 | 314 | 849 | -4 % | 1 | oui | - | 4404 |
| 5-10 (boss) | 26 | 2086 | 986620 | 784 | 2636 | - | 4 | oui | 33489 | 10582 |
| 6-1 | 9 | 1206 | 36733 | 133 | 382 | -55 % | 1 | oui | - | 2157 |
| 6-2 | 10 | 2156 | 70774 | 184 | 378 | -1 % | 0 | oui | - | 2550 |
| 6-3 | 10 | 2256 | 67093 | 166 | 426 | +13 % | 0 | oui | - | 2582 |
| 6-4 | 11 | 1356 | 74278 | 190 | 404 | -5 % | 0 | oui | - | 2956 |
| 6-5 | 11 | 1456 | 74747 | 215 | 610 | +51 % | 0 | oui | - | 3042 |
| 6-6 | 12 | 2086 | 155042 | 189 | 717 | +17 % | 0 | oui | - | 3335 |
| 6-7 | 12 | 1426 | 90875 | 249 | 599 | -17 % | 0 | oui | - | 3390 |
| 6-8 | 13 | 1996 | 180932 | 239 | 801 | +34 % | 1 | oui | - | 3866 |
| 6-9 | 14 | 2086 | 225976 | 273 | 1009 | +26 % | 0 | oui | - | 4396 |
| 6-10 (boss) | 26 | 2806 | 970515 | 715 | 1965 | - | 2 | oui | 34132 | 10830 |
| 7-1 | 9 | 1426 | 36454 | 185 | 316 | -69 % | 1 | oui | - | 2278 |
| 7-2 | 10 | 1996 | 75410 | 197 | 415 | +31 % | 1 | oui | - | 2596 |
| 7-3 | 10 | 2086 | 74112 | 179 | 502 | +21 % | 0 | oui | - | 2654 |
| 7-4 | 11 | 1456 | 88621 | 213 | 898 | +79 % | 0 | oui | - | 2983 |
| 7-5 | 11 | 2086 | 96401 | 241 | 462 | -48 % | 0 | oui | - | 3040 |
| 7-6 | 12 | 1206 | 95273 | 255 | 687 | +49 % | 1 | oui | - | 3513 |
| 7-7 | 12 | 1356 | 87383 | 233 | 576 | -16 % | 0 | oui | - | 3505 |
| 7-8 | 13 | 2256 | 211738 | 244 | 991 | +72 % | 0 | oui | - | 3978 |
| 7-9 | 14 | 2806 | 248292 | 306 | 1124 | +13 % | 0 | oui | - | 4529 |
| 7-10 (boss) | 27 | 2156 | 967017 | 720 | 2187 | - | 4 | oui | 34418 | 11426 |
| 8-1 | 9 | 1356 | 39110 | 179 | 411 | -63 % | 1 | oui | - | 2284 |
| 8-2 | 10 | 2086 | 82180 | 162 | 478 | +16 % | 0 | oui | - | 2657 |
| 8-3 | 10 | 1206 | 45628 | 181 | 427 | -11 % | 0 | oui | - | 2670 |
| 8-4 | 11 | 2806 | 125151 | 198 | 609 | +43 % | 0 | oui | - | 3122 |
| 8-5 | 11 | 1426 | 73350 | 181 | 498 | -18 % | 2 | oui | - | 2964 |
| 8-6 | 12 | 2156 | 156327 | 257 | 900 | +81 % | 0 | oui | - | 3517 |
| 8-7 | 12 | 1996 | 140533 | 279 | 836 | -7 % | 0 | oui | - | 3607 |
| 8-8 | 13 | 1456 | 146411 | 273 | 862 | +3 % | 1 | oui | - | 4099 |
| 8-9 | 14 | 2086 | 241392 | 279 | 1030 | +19 % | 0 | oui | - | 4465 |
| 8-10 (boss) | 28 | 2256 | 1108770 | 716 | 2285 | - | 4 | oui | 41950 | 12012 |

## 4. Taux de victoire du joueur moyen (8 profils par niveau, sans boost)


| Niveau | Victoires | 3 étoiles | Étoiles moy. | Durée moy. (min) | PV perdus moy. | Pièces restantes moy. |
|---|---|---|---|---|---|---|
| 1-1 | 100 % | 100 % | 3,0 | 4,3 | 0,0 | 274 |
| 1-2 | 100 % | 50 % | 2,5 | 3,8 | 0,0 | 298 |
| 1-3 | 100 % | 88 % | 2,9 | 4,6 | 0,5 | 367 |
| 1-4 | 100 % | 0 % | 1,9 | 5,3 | 1,0 | 383 |
| 1-5 | 100 % | 75 % | 2,8 | 5,3 | 0,0 | 430 |
| 1-6 | 100 % | 25 % | 1,8 | 4,8 | 0,1 | 310 |
| 1-7 | 100 % | 100 % | 3,0 | 5,7 | 0,0 | 552 |
| 1-8 | 100 % | 0 % | 1,9 | 6,8 | 0,0 | 684 |
| 1-9 | 100 % | 88 % | 2,9 | 6,2 | 0,0 | 280 |
| 1-10 (boss) | 88 % | 13 % | 1,1 | 9,0 | 5,8 | 715 |
| 2-1 | 100 % | 88 % | 2,9 | 4,2 | 0,0 | 471 |
| 2-2 | 100 % | 0 % | 2,0 | 4,4 | 0,0 | 405 |
| 2-3 | 100 % | 88 % | 2,9 | 5,3 | 0,3 | 443 |
| 2-4 | 100 % | 0 % | 2,0 | 4,7 | 0,0 | 343 |
| 2-5 | 100 % | 100 % | 3,0 | 5,2 | 0,0 | 356 |
| 2-6 | 100 % | 0 % | 1,8 | 5,8 | 2,9 | 485 |
| 2-7 | 100 % | 100 % | 3,0 | 6,4 | 0,0 | 431 |
| 2-8 | 100 % | 0 % | 2,0 | 5,9 | 0,0 | 419 |
| 2-9 | 100 % | 38 % | 2,4 | 6,8 | 0,0 | 515 |
| 2-10 (boss) | 100 % | 88 % | 2,9 | 9,3 | 0,0 | 541 |
| 3-1 | 100 % | 100 % | 3,0 | 4,2 | 0,0 | 350 |
| 3-2 | 100 % | 0 % | 2,0 | 5,1 | 0,0 | 464 |
| 3-3 | 100 % | 100 % | 3,0 | 3,8 | 0,0 | 311 |
| 3-4 | 100 % | 0 % | 1,9 | 5,3 | 0,0 | 506 |
| 3-5 | 100 % | 88 % | 2,9 | 5,2 | 1,3 | 355 |
| 3-6 | 100 % | 13 % | 2,1 | 5,1 | 0,0 | 399 |
| 3-7 | 100 % | 100 % | 3,0 | 5,3 | 0,0 | 416 |
| 3-8 | 100 % | 13 % | 2,1 | 5,4 | 0,0 | 346 |
| 3-9 | 88 % | 63 % | 2,4 | 7,1 | 3,6 | 766 |
| 3-10 (boss) | 100 % | 88 % | 2,9 | 10,7 | 0,0 | 833 |
| 4-1 | 100 % | 100 % | 3,0 | 3,5 | 0,0 | 316 |
| 4-2 | 100 % | 25 % | 2,1 | 4,1 | 0,4 | 397 |
| 4-3 | 100 % | 88 % | 2,9 | 5,1 | 0,3 | 570 |
| 4-4 | 100 % | 0 % | 1,9 | 5,3 | 0,0 | 506 |
| 4-5 | 100 % | 100 % | 3,0 | 4,4 | 0,0 | 376 |
| 4-6 | 100 % | 0 % | 1,8 | 6,2 | 0,6 | 643 |
| 4-7 | 100 % | 63 % | 2,6 | 5,8 | 1,8 | 729 |
| 4-8 | 100 % | 0 % | 2,0 | 6,3 | 0,0 | 470 |
| 4-9 | 100 % | 50 % | 2,5 | 6,4 | 1,5 | 448 |
| 4-10 (boss) | 100 % | 0 % | 1,9 | 13,6 | 0,8 | 2007 |
| 5-1 | 100 % | 75 % | 2,8 | 4,2 | 2,8 | 531 |
| 5-2 | 100 % | 13 % | 1,9 | 4,4 | 0,4 | 573 |
| 5-3 | 100 % | 100 % | 3,0 | 5,3 | 0,0 | 592 |
| 5-4 | 100 % | 25 % | 2,3 | 4,5 | 0,0 | 411 |
| 5-5 | 100 % | 100 % | 3,0 | 5,4 | 0,0 | 426 |
| 5-6 | 100 % | 0 % | 1,9 | 5,7 | 0,0 | 546 |
| 5-7 | 100 % | 100 % | 3,0 | 5,3 | 0,0 | 414 |
| 5-8 | 100 % | 0 % | 1,6 | 7,5 | 4,6 | 708 |
| 5-9 | 100 % | 88 % | 2,9 | 6,6 | 0,9 | 449 |
| 5-10 (boss) | 100 % | 0 % | 2,0 | 14,0 | 0,0 | 1162 |
| 6-1 | 100 % | 100 % | 3,0 | 3,7 | 0,0 | 353 |
| 6-2 | 100 % | 0 % | 1,9 | 5,2 | 0,9 | 559 |
| 6-3 | 100 % | 38 % | 2,4 | 5,3 | 5,8 | 651 |
| 6-4 | 100 % | 0 % | 1,5 | 5,3 | 2,1 | 508 |
| 6-5 | 100 % | 100 % | 3,0 | 4,9 | 0,0 | 461 |
| 6-6 | 100 % | 0 % | 1,9 | 5,9 | 2,1 | 847 |
| 6-7 | 100 % | 88 % | 2,9 | 5,9 | 0,0 | 410 |
| 6-8 | 100 % | 0 % | 1,6 | 7,0 | 2,1 | 871 |
| 6-9 | 88 % | 13 % | 1,9 | 7,7 | 13,1 | 1059 |
| 6-10 (boss) | 88 % | 0 % | 1,5 | 14,7 | 6,8 | 1631 |
| 7-1 | 100 % | 100 % | 3,0 | 3,5 | 0,0 | 418 |
| 7-2 | 100 % | 0 % | 2,0 | 4,5 | 0,0 | 518 |
| 7-3 | 100 % | 75 % | 2,8 | 5,2 | 0,8 | 353 |
| 7-4 | 100 % | 13 % | 2,0 | 4,8 | 1,5 | 508 |
| 7-5 | 100 % | 25 % | 2,3 | 6,1 | 4,4 | 562 |
| 7-6 | 100 % | 0 % | 1,6 | 5,4 | 0,0 | 410 |
| 7-7 | 100 % | 75 % | 2,8 | 5,8 | 2,1 | 433 |
| 7-8 | 88 % | 0 % | 1,3 | 6,8 | 11,3 | 780 |
| 7-9 | 100 % | 13 % | 2,1 | 7,8 | 7,5 | 813 |
| 7-10 (boss) | 100 % | 0 % | 1,8 | 15,2 | 1,1 | 1999 |
| 8-1 | 100 % | 100 % | 3,0 | 3,9 | 0,0 | 316 |
| 8-2 | 100 % | 0 % | 1,6 | 5,5 | 2,8 | 781 |
| 8-3 | 100 % | 100 % | 3,0 | 4,0 | 0,0 | 411 |
| 8-4 | 100 % | 0 % | 1,6 | 6,1 | 3,0 | 794 |
| 8-5 | 100 % | 75 % | 2,8 | 5,3 | 2,8 | 540 |
| 8-6 | 100 % | 0 % | 1,3 | 6,6 | 7,0 | 470 |
| 8-7 | 100 % | 75 % | 2,8 | 6,2 | 4,1 | 627 |
| 8-8 | 100 % | 0 % | 2,0 | 6,4 | 0,0 | 513 |
| 8-9 | 75 % | 38 % | 1,9 | 7,2 | 12,1 | 716 |
| 8-10 (boss) | 75 % | 0 % | 1,1 | 15,1 | 10,9 | 1687 |

### Boss : 12 essais sans boost, puis avec boosts


| Niveau | Victoires | 3 étoiles | Étoiles moy. | Durée moy. (min) | PV perdus moy. | Pièces restantes moy. |
|---|---|---|---|---|---|---|
| 1-10 (boss) | 92 % | 0 % | 1,3 | 9,3 | 3,4 | 601 |
| 2-10 (boss) | 100 % | 100 % | 3,0 | 9,3 | 0,0 | 634 |
| 3-10 (boss) | 100 % | 92 % | 2,9 | 10,2 | 0,0 | 633 |
| 4-10 (boss) | 100 % | 0 % | 1,9 | 13,5 | 0,3 | 1960 |
| 5-10 (boss) | 83 % | 0 % | 1,5 | 13,6 | 5,0 | 1583 |
| 6-10 (boss) | 83 % | 0 % | 1,5 | 15,2 | 8,8 | 1582 |
| 7-10 (boss) | 83 % | 0 % | 1,3 | 14,7 | 10,4 | 2066 |
| 8-10 (boss) | 75 % | 0 % | 1,1 | 14,9 | 10,9 | 2280 |


| Niveau | Victoires | 3 étoiles | Étoiles moy. | Durée moy. (min) | PV perdus moy. | Pièces restantes moy. |
|---|---|---|---|---|---|---|
| 1-10 (boss) | 100 % | 0 % | 1,3 | 10,1 | 5,3 | 700 |
| 2-10 (boss) | 100 % | 75 % | 2,8 | 9,4 | 0,0 | 502 |
| 3-10 (boss) | 100 % | 92 % | 2,9 | 10,5 | 0,0 | 822 |
| 4-10 (boss) | 100 % | 8 % | 2,1 | 13,4 | 0,0 | 2030 |
| 5-10 (boss) | 100 % | 0 % | 1,8 | 14,4 | 0,3 | 1280 |
| 6-10 (boss) | 100 % | 0 % | 1,9 | 14,9 | 2,2 | 2060 |
| 7-10 (boss) | 100 % | 0 % | 1,7 | 14,7 | 5,3 | 2201 |
| 8-10 (boss) | 100 % | 0 % | 1,7 | 15,3 | 4,5 | 2432 |

### Défis Héroïques (6 essais, équipement de fin de campagne)


| Niveau | Victoires | 3 étoiles | Étoiles moy. | Durée moy. (min) | PV perdus moy. | Pièces restantes moy. |
|---|---|---|---|---|---|---|
| 1-3 | 100 % | 100 % | 3,0 | 4,4 | 0,0 | 336 |
| 1-8 | 100 % | 100 % | 3,0 | 5,8 | 0,0 | 500 |
| 2-4 | 100 % | 100 % | 3,0 | 4,3 | 0,0 | 370 |
| 2-7 | 100 % | 100 % | 3,0 | 6,1 | 0,0 | 281 |
| 3-5 | 100 % | 100 % | 3,0 | 4,7 | 0,0 | 633 |
| 3-9 | 83 % | 67 % | 2,3 | 7,2 | 7,0 | 390 |
| 4-3 | 100 % | 100 % | 3,0 | 4,9 | 0,0 | 599 |
| 4-8 | 100 % | 100 % | 3,0 | 6,6 | 0,0 | 693 |
| 5-5 | 100 % | 100 % | 3,0 | 5,4 | 0,0 | 515 |
| 5-7 | 100 % | 100 % | 3,0 | 5,4 | 0,0 | 397 |
| 6-4 | 100 % | 100 % | 3,0 | 5,7 | 0,0 | 710 |
| 6-8 | 83 % | 50 % | 2,2 | 7,0 | 7,3 | 1042 |
| 7-3 | 67 % | 50 % | 1,8 | 5,0 | 2,0 | 498 |
| 7-6 | 100 % | 33 % | 1,8 | 6,1 | 11,7 | 633 |
| 8-4 | 100 % | 17 % | 1,8 | 6,1 | 12,3 | 794 |
| 8-9 | 33 % | 17 % | 0,8 | 7,0 | 21,5 | 762 |

### Débutant (8 profils par niveau)

Moyenne : 95 % de victoires, 38 % de 3 étoiles. Boss sans boost : 100, 100, 100, 100, 88, 88, 88, 50 % ; avec boosts : 100 % partout.

### Renaissance (château et talents au maximum, 6 essais)

| Rang | 2-5 | 4-5 | 6-5 | 8-5 | 3-10 (boss) | 6-10 (boss) | 8-10 (boss) |
|---|---|---|---|---|---|---|---|
| 0 | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % |
| 1 | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % | 83 % |
| 2 | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % | 50 % |
| 3 | 100 % | 100 % | 100 % | 100 % | 100 % | 83 % | 67 % |
| 5 | 100 % | 100 % | 100 % | 100 % | 67 % | 0 % | 0 % |

## 5. Une seule tourelle partout (bon joueur, 1 essai)


| Niveau | Fusil | Mitrail. | Pompe | Sniper | Roquettes | Minigun | Cryo | Laser | Tesla | Plasma | Drone |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2-3 | 2* | 2* | 2* | 2* |  |  | 2* |  |  |  |  |
| 2-8 | 2* | 3* | 2* | 1* | 2* |  | 1* |  |  |  |  |
| 3-3 | 2* | 2* | 2* | 2* | 3* | 3* | 1* |  |  |  |  |
| 3-8 | 3* | 3* | 3* | 2* | 2* | 2* | 1* |  |  |  |  |
| 4-3 | 2* | 2* | 2* | 2* | 3* | 2* | perdu |  |  |  |  |
| 4-8 | 2* | 2* | 2* | 2* | 1* | 2* | perdu |  |  |  |  |
| 5-3 | 2* | 2* | 2* | 3* | 3* | 2* | 1* |  |  |  |  |
| 5-8 | 2* | 2* | 1* | 1* | 1* | perdu | perdu |  |  |  |  |
| 6-3 | 2* | 2* | 1* | 1* | 2* | 2* | 1* | 3* |  |  |  |
| 6-8 | 2* | 2* | 2* | 1* | 1* | 1* | perdu | 2* | 2* |  |  |
| 7-3 | 2* | 2* | 2* | 1* | 2* | 3* | 1* | 3* | 2* | 2* |  |
| 7-8 | 2* | 2* | 1* | perdu | perdu | perdu | perdu | perdu | 1* | 2* | perdu |
| 8-3 | 2* | 2* | 2* | 2* | 1* | 2* | 2* | 3* | 3* | 3* | 2* |
| 8-8 | 2* | 2* | 2* | 2* | 1* | 2* | 2* | 1* | 2* | 2* | perdu |

## 6. Économie sur 60 jours (tools/progression.cjs, 3 parties par jour)

```
Sources de gains sur 60 jours (pièces | gemmes) :
  coffres (contenu)       39058 (27 %) |    899 (39 %)
  niveaux                 37331 (26 %) |    666 (29 %)
  roue                    27450 (19 %) |    426 (18 %)
  quêtes                  17930 (12 %) |     42 ( 2 %)
  succès                   9900 ( 7 %) |    188 ( 8 %)
  passe                    8280 ( 6 %) |     36 ( 2 %)
  cadeau du jour           3060 ( 2 %) |     49 ( 2 %)
  niveau de joueur         1080 ( 1 %) |      0 ( 0 %)
  coffres d'étoiles           0 ( 0 %) |      0 ( 0 %)
  Récompenses quotidiennes (cadeau, roue, quêtes, passe) : 39 % des pièces, 24 % des gemmes
jour | niv | gemmes | pièces | talents | pts | château | palier | campagne | étoiles | héroïque | passe
   1 |   4 |     16 |    917 |    2/58 |   0 |    2/29 |      1 |     3/80 |       7 |     0/80 |  0/30
   2 |   6 |     53 |   1217 |    3/58 |   0 |    4/29 |      1 |     6/80 |      15 |     0/80 |  2/30
   3 |   9 |     78 |   1200 |    4/58 |   0 |    6/29 |      1 |     9/80 |      23 |     0/80 |  3/30
   4 |  10 |     83 |   1212 |    5/58 |   0 |   11/29 |      2 |    11/80 |      27 |     0/80 |  4/30
   5 |  11 |     55 |    857 |    5/58 |   0 |   13/29 |      2 |    14/80 |      32 |     0/80 |  5/30
   6 |  12 |     77 |   2052 |    6/58 |   0 |   13/29 |      2 |    17/80 |      38 |     0/80 |  7/30
   7 |  14 |     71 |   2563 |    7/58 |   0 |   16/29 |      3 |    20/80 |      45 |     0/80 |  9/30
   9 |  15 |     37 |   2539 |    7/58 |   0 |   18/29 |      3 |    26/80 |      58 |     0/80 | 11/30
  12 |  18 |     68 |    544 |    9/58 |   0 |   22/29 |      4 |    33/80 |      70 |     0/80 | 15/30
  15 |  20 |     81 |   4814 |   10/58 |   0 |   25/29 |      5 |    42/80 |      89 |     0/80 | 20/30
  18 |  21 |     62 |   4626 |   10/58 |   0 |   27/29 |      6 |    50/80 |     104 |     0/80 | 24/30
  21 |  22 |     33 |    829 |   11/58 |   0 |   29/29 |      6 |    57/80 |     117 |     0/80 | 28/30
  24 |  24 |     79 |   2383 |   12/58 |   0 |   29/29 |      7 |    63/80 |     129 |     0/80 | 30/30
  27 |  25 |     41 |   3587 |   12/58 |   0 |   29/29 |      7 |    69/80 |     139 |     0/80 | 30/30
  30 |  26 |     34 |   4217 |   13/58 |   0 |   29/29 |      8 |    77/80 |     156 |     0/80 | 30/30
  33 |  27 |     80 |   4034 |   15/58 |   0 |   29/29 |      8 |    80/80 |     163 |     2/80 |  4/30
  36 |  29 |     88 |   2308 |   23/58 |   0 |   29/29 |      8 |    80/80 |     164 |     9/80 |  9/30
  39 |  30 |     94 |   1817 |   27/58 |   0 |   29/29 |      8 |    80/80 |     165 |    12/80 | 13/30
  42 |  31 |     80 |   5583 |   35/58 |   0 |   29/29 |      8 |    80/80 |     165 |    20/80 | 20/30
  45 |  32 |     95 |   5018 |   44/58 |   0 |   29/29 |      8 |    80/80 |     166 |    28/80 | 25/30
  48 |  34 |     53 |   4726 |   51/58 |   0 |   29/29 |      8 |    80/80 |     167 |    34/80 | 30/30
  51 |  35 |     58 |   3921 |   56/58 |   0 |   29/29 |      8 |    80/80 |     169 |    39/80 | 30/30
  54 |  36 |     89 |   4560 |   58/58 |   3 |   29/29 |      8 |    80/80 |     169 |    43/80 | 30/30
  57 |  37 |     47 |   2563 |   58/58 |   9 |   29/29 |      8 |    80/80 |     170 |    49/80 | 30/30
  60 |  38 |     86 |   4699 |   58/58 |  17 |   29/29 |      8 |    80/80 |     171 |    56/80 | 30/30
Repères : monde 1 fini jour 4 · palier 2 du château jour 4 · 5 mondes jour 18 · campagne finie jour 32 · tout maxé jour 53 · coffres en bois achetés 31
Gemmes : 2306 gagnées, 2220 dépensées (31 coffres en bois, 6 échanges contre des pièces) · coffres dorés achetés en pièces : 27 (103800 pièces)
Roue : 240 tours gratuits (4.0 par jour)
Boosts : 179 utilisés, 2 achetés en pièces (270 pièces) · pièces en fin de simulation 4699
Renaissance possible dès le jour 32 : 204 éclats ce jour-là (dont 21 pour les pièces) ; au jour 60 : 377 éclats (dont 18 pour 4699 pièces)
```

## 7. Nouveaux ennemis à leur première apparition

```
Lumaca Pizzetta        niveau 1-1  vague 1  : 10 nouveaux, avec rien
Peperoncino Rollerino  niveau 1-1  vague 3  : 5 nouveaux, avec 13 Lumaca Pizzetta
Ippo Tostapane         niveau 1-3  vague 4  : 2 nouveaux, avec 13 Peperoncino Rollerino
Formaggio Farfalla     niveau 1-6  vague 4  : 5 nouveaux, avec 12 Lumaca Pizzetta
Granchio Pentolino     niveau 2-2  vague 4  : 4 nouveaux, avec 6 Formaggio Farfalla
Anguria Matrioska      niveau 2-5  vague 4  : 5 nouveaux, avec 8 Peperoncino Rollerino
Polpo Espressino       niveau 3-2  vague 5  : 5 nouveaux, avec 3 Ippo Tostapane
Medusa Paralume        niveau 3-5  vague 5  : 5 nouveaux, avec 17 Peperoncino Rollerino
Foca Ghiacciolo        niveau 4-2  vague 3  : 5 nouveaux, avec 10 Peperoncino Rollerino
Yeti Spumone           niveau 4-5  vague 5  : 4 nouveaux, avec 3 Ippo Tostapane
Scimmia Bananina       niveau 5-2  vague 3  : 6 nouveaux, avec 4 Foca Ghiacciolo
Camaleonte Pesto       niveau 5-5  vague 5  : 4 nouveaux, avec 10 Medusa Paralume
Robo Gnocchetto        niveau 6-2  vague 3  : 3 nouveaux, avec 12 Peperoncino Rollerino
Cyborg Cannolo         niveau 6-5  vague 5  : 6 nouveaux, avec 3 Ippo Tostapane
Astro Polpetta         niveau 7-2  vague 3  : 3 nouveaux, avec 14 Peperoncino Rollerino
Satellite Spaghetto    niveau 7-5  vague 5  : 5 nouveaux, avec 5 Anguria Matrioska
Glitch Mozzarella      niveau 8-2  vague 3  : 2 nouveaux, avec 18 Lumaca Pizzetta
```

## 8. Talents et château : effet de chaque rang

| Élément | Effet par rang | Rangs | Mesurable (≥ 3 %) ? |
|---|---|---|---|
| Poudre premium | +2 % de dégâts | 5 | non |
| Culasse huilée | +2 % de cadence | 5 | non |
| Longue-vue | +2 % de portée | 3 | non |
| Œil vif | +1 % de critiques (≈ +1 % de DPS) | 3 | non |
| Tueur de géants | +4 % contre boss, mini-boss, élites | 3 | oui |
| Tirelire | +15 pièces au départ (≈ +6 %) | 5 | oui |
| Chasseur de primes | +3 % de pièces par kill | 5 | limite |
| Prime de vague | +10 % de bonus de vague | 3 | oui |
| Joaillier | +5 % de gemmes | 3 | oui |
| Brocanteur | +5 % de revente | 3 | non (seulement en revendant) |
| Garnison | +1 PV (+5 %) | 5 | oui |
| Artilleurs | -4 % de recharge | 5 | limite |
| Ingénieur | +10 % de durée | 3 | oui |
| Canonniers | +15 % de dégâts du canon | 3 | oui |
| Murs (château) | +2 PV (+10 %) | 5 | oui |
| Réparation (château) | 1 PV toutes les 4, 3, 2, **2**, 1 vagues | 5 | rang 4 = rang 3 |
| Trésorerie, Canon, capacités | +20 pièces et +2 par vague ; canon +40-70 % ; capacités nettes | 5 / 3 | oui |

## 9. Performance et stabilité (tools/perf.cjs)

Pire moment (niveau 8-10, 19 tourelles au niveau 5, boss + 115 brainrots, x3, définition x3, rendu logiciel sans carte graphique) : calcul médian 4,2-4,5 ms par image, 95 % sous 42-64 ms, 6 à 16 % des images au-dessus de 16,7 ms, qualité automatique descendue au cran le plus bas. Profil : 81 % du temps dans le dessin natif, la logique du jeu (mises à jour, ciblage) reste sous 2 %. Mémoire sur 10 niveaux enchaînés : 3,4 → 4,2 Mo (+0,6 Mo entre le 2e et le 10e). Aucune erreur de console.

---

# Après correction : étape A (tourelles)

Toutes les règles des tourelles sont respectées (`node tools/balance.cjs check dps.json flux.json`).
Le hasard des bancs est maintenant fixé (graine) et les cibles immobiles sont centrées sur le chemin : les mesures sont reproductibles.

**Changements principaux**

- Fusil d'assaut : dégâts 11 → 12 (polyvalent le plus rentable).
- Mitraillette : dégâts 4,5 → 3,3 (garde les rapides et les diviseurs) ; Perce-tout +80 %.
- Pompe : dégâts 8 → 9,1 (meilleure contre les tanks) ; Brasier renforcé, Chasseur de gros ramené.
- Sniper : prix 220 → 200, améliorations 150 / 250 ; Lunette thermique cadence x2,25.
- Lance-roquettes : prix 280 → 250, dégâts 55, zone 78 ; Fragmentation renforcée, Missile guidé et Salve ramenés.
- Minigun : branche incendiaire au niveau de Surchauffe.
- Cryo : Zéro absolu (gel 30 %, puis 45 %) au niveau de Givre fragilisant (+25 %, puis +40 % de dégâts subis).
- Mine : améliorations 45 / 75 et +40 % de dégâts ; branches équilibrées.
- Laser : dégâts 5,5 → 4,9 ; Prisme, Arc-en-ciel (4 rayons) et Rayon solaire (+50 %, au lieu de +80 %) équilibrés.
- Tesla : dégâts 42 → 38 ; Tempête électrique +60 %.
- Plasma (option B) : traverse toujours tout, mais dégâts 105 → 36 et boule 16 → 14 ; branches équilibrées.
- Drone : dégâts 14 → 22 ; Essaim et Tapis de feu équilibrés.

| Tourelle | Gain niv. 2 / 3 (≥ 30 %) | Amélioration / tourelle neuve (80-120 %) | Gain niv. 4 A / B (≥ 30 %) | Pic niv. 5 A / B (≥ 50 %) | Écart des branches niv. 4 / 5 (≤ 10 %) |
|---|---|---|---|---|---|
| Fusil d'assaut | 65 / 70 % | 93 / 92 % | 74 / 63 % | 86 / 98 % | 7 / 0 % |
| Mitraillette | 69 / 67 % | 97 / 91 % | 121 / 122 % | 80 / 73 % | 0 / 4 % |
| Pompe | 67 / 69 % | 103 / 100 % | 47 / 54 % | 87 / 71 % | 5 / 5 % |
| Sniper | 72 / 73 % | 96 / 100 % | 127 / 123 % | 67 / 74 % | 2 / 3 % |
| Lance-roquettes | 69 / 65 % | 102 / 94 % | 74 / 63 % | 60 / 71 % | 7 / 0 % |
| Minigun | 68 / 68 % | 113 / 114 % | 49 / 46 % | 56 / 58 % | 3 / 2 % |
| Tourelle cryo | 50 / 75 % | soutien | effets | effets | 25 / 40 % (soutien) |
| Laser | 64 / 61 % | 96 / 91 % | 60 / 59 % | 64 / 60 % | 1 / 4 % |
| Tesla | 71 / 69 % | 104 / 106 % | 37 / 42 % | 60 / 57 % | 4 / 1 % |
| Plasma | 71 / 63 % | 107 / 100 % | 101 / 95 % | 54 / 60 % | 3 / 1 % |
| Drone | 62 / 63 % | 95 / 93 % | 100 / 108 % | 95 / 91 % | 4 / 2 % |
| Mine | 59 / 60 % | 92 / 90 % | 88 / 90 % | 101 / 89 % | 1 / 5 % |

DPS par pièce au niveau 1, par prix croissant (mono pour les armes à une cible, groupe pour la zone ; mine et cryo à part) :
  Mitrail. 85 : 37,7  ·  Fusil 100 : 41,8  ·  Pompe 130 : 43,3  ·  Sniper 200 : 24,6  ·  Laser 300 : 28,2  ·  Drone 320 : 22,1  ·  Minigun 400 : 24,3  ·  
  Roquettes 250 : 43,5  ·  Tesla 280 : 42,3  ·  Plasma 360 : 9,6  ·  

Meilleure réponse (rôle) :
  Fusil d'assaut : boucliers (niv. 1, par pièce), polyvalence (niv. 1, par pièce), rapides (niv. 3, par pièce), diviseurs (niv. 3, par pièce), boucliers (niv. 3, par pièce), sauteurs (niv. 3, par pièce), polyvalence (niv. 3, par pièce)
  Mitraillette : rapides (niv. 1, par pièce), diviseurs (niv. 1, par pièce)
  Pompe : tanks (niv. 1, par pièce), volants (niv. 1, par pièce), invisibles (niv. 1, par pièce), sauteurs (niv. 1, par pièce), tanks (niv. 3, par pièce), volants (niv. 3, par pièce), invisibles (niv. 3, par pièce)
  Sniper : boss (niv. 1, par pièce), boss (niv. 3, par pièce), boss (niv. 5, par emplacement)
  Lance-roquettes : groupe (niv. 1, par pièce)
  Minigun : mono immobile (niv. 3, par emplacement), blindé immobile (niv. 3, par emplacement), boss immobile (niv. 3, par emplacement)
  Tourelle cryo : contrôle (niv. 1, par pièce), contrôle (niv. 3, par pièce), contrôle (niv. 5, par emplacement)
  Laser : rapides (niv. 5, par emplacement), tanks (niv. 5, par emplacement), volants (niv. 5, par emplacement), boucliers (niv. 5, par emplacement), sauteurs (niv. 5, par emplacement)
  Tesla : blindés (niv. 1, par pièce), blindés (niv. 3, par pièce), groupe immobile (niv. 3, par emplacement)
  Plasma : groupe (niv. 3, par pièce), groupe (niv. 5, par emplacement)
  Drone : blindés (niv. 5, par emplacement), diviseurs (niv. 5, par emplacement), invisibles (niv. 5, par emplacement), mono immobile (niv. 5, par emplacement), groupe immobile (niv. 5, par emplacement), blindé immobile (niv. 5, par emplacement), boss immobile (niv. 5, par emplacement)
  Mine : groupe (niv. 1, par pièce), blindés (niv. 1, par pièce), groupe (niv. 3, par pièce), groupe (niv. 5, par emplacement), tanks (niv. 5, par emplacement), blindés (niv. 5, par emplacement), invisibles (niv. 5, par emplacement)

Toutes les règles des tourelles sont respectées

## Banc d'essai après correction

| Tourelle | Niv. | Nom | Coût cumulé | DPS mono | DPS / 100 pièces | DPS groupe (6) | Blindé (5) | % vs blindé | Boss |
|---|---|---|---|---|---|---|---|---|---|
| Fusil d'assaut | 1 | Fusil d'assaut | 100 | 42 | 42,3 | 41 | 26 | 61 % | 41 |
| Fusil d'assaut | 2 | Fusil d'assaut | 170 | 69 | 40,3 | 71 | 52 | 76 % | 70 |
| Fusil d'assaut | 3 | Fusil d'assaut | 295 | 117 | 39,8 | 116 | 97 | 83 % | 117 |
| Fusil d'assaut | 4A | Rafale | 555 | 204 | 36,8 | 204 | 169 | 83 % | 203 |
| Fusil d'assaut | 5A | Tempête de plomb | 985 | 370 | 37,5 | 371 | 328 | 89 % | 368 |
| Fusil d'assaut | 4B | Balles traçantes | 535 | 186 | 34,8 | 185 | 166 | 89 % | 191 |
| Fusil d'assaut | 5B | Œil de lynx | 935 | 362 | 38,8 | 358 | 345 | 95 % | 361 |
| Fusil d'assaut | 4C | Munitions explosives | 565 | 215 | 38,0 | 313 | 184 | 86 % | 215 |
| Fusil d'assaut | 5C | Obus | 1015 | 303 | 29,8 | 449 | 273 | 90 % | 303 |
| Mitraillette | 1 | Mitraillette | 85 | 32 | 37,6 | 32 | 8 | 25 % | 32 |
| Mitraillette | 2 | Mitraillette | 145 | 54 | 37,3 | 54 | 16 | 29 % | 54 |
| Mitraillette | 3 | Mitraillette | 250 | 90 | 35,9 | 90 | 33 | 37 % | 90 |
| Mitraillette | 4A | Balles perforantes | 470 | 114 | 24,2 | 225 | 114 | 100 % | 114 |
| Mitraillette | 5A | Perce-tout | 850 | 204 | 24,0 | 408 | 204 | 100 % | 204 |
| Mitraillette | 4B | Double canon | 490 | 199 | 40,6 | 198 | 75 | 38 % | 200 |
| Mitraillette | 5B | Triple canon | 910 | 328 | 36,0 | 328 | 141 | 43 % | 329 |
| Mitraillette | 4C | Balles ricochets | 510 | 99 | 19,5 | 220 | 37 | 38 % | 99 |
| Mitraillette | 5C | Billard infernal | 950 | 138 | 14,6 | 475 | 77 | 56 % | 139 |
| Pompe | 1 | Pompe | 130 | 56 | 43,4 | 56 | 28 | 50 % | 56 |
| Pompe | 2 | Pompe | 215 | 94 | 43,8 | 95 | 62 | 66 % | 94 |
| Pompe | 3 | Pompe | 365 | 159 | 43,7 | 157 | 124 | 78 % | 159 |
| Pompe | 4A | Souffle du dragon | 645 | 226 | 35,0 | 252 | 175 | 77 % | 225 |
| Pompe | 5A | Brasier | 1085 | 405 | 37,3 | 485 | 333 | 82 % | 405 |
| Pompe | 4B | Canon long | 635 | 238 | 37,5 | 237 | 202 | 85 % | 237 |
| Pompe | 5B | Chasseur de gros | 1075 | 399 | 37,1 | 399 | 356 | 89 % | 399 |
| Pompe | 4C | Fléchettes | 645 | 159 | 24,6 | 297 | 159 | 100 % | 158 |
| Pompe | 5C | Tempête de fléchettes | 1105 | 264 | 23,9 | 496 | 264 | 100 % | 262 |
| Sniper | 1 | Sniper | 200 | 49 | 24,5 | 50 | 45 | 92 % | 50 |
| Sniper | 2 | Sniper | 350 | 86 | 24,7 | 83 | 84 | 97 % | 83 |
| Sniper | 3 | Sniper | 600 | 146 | 24,3 | 144 | 143 | 98 % | 147 |
| Sniper | 4A | Calibre lourd | 1080 | 336 | 31,1 | 310 | 336 | 100 % | 321 |
| Sniper | 5A | Tueur de boss | 1830 | 557 | 30,4 | 522 | 557 | 100 % | 534 |
| Sniper | 4B | Lunette thermique | 1020 | 327 | 32,1 | 317 | 321 | 98 % | 334 |
| Sniper | 5B | Semi-auto | 1700 | 563 | 33,1 | 566 | 554 | 98 % | 562 |
| Sniper | 4C | Rail-gun | 1100 | 183 | 16,7 | 334 | 183 | 100 % | 175 |
| Sniper | 5C | Canon électromagnétique | 1880 | 322 | 17,1 | 613 | 322 | 100 % | 308 |
| Lance-roquettes | 1 | Lance-roquettes | 250 | 28 | 11,0 | 109 | 26 | 95 % | 27 |
| Lance-roquettes | 2 | Lance-roquettes | 420 | 44 | 10,6 | 184 | 43 | 97 % | 45 |
| Lance-roquettes | 3 | Lance-roquettes | 710 | 73 | 10,3 | 303 | 72 | 98 % | 74 |
| Lance-roquettes | 4A | Fragmentation | 1230 | 114 | 9,3 | 661 | 112 | 98 % | 138 |
| Lance-roquettes | 5A | Tapis de bombes | 2050 | 178 | 8,7 | 1104 | 176 | 99 % | 229 |
| Lance-roquettes | 4B | Missile guidé | 1210 | 123 | 10,1 | 484 | 117 | 95 % | 119 |
| Lance-roquettes | 5B | Salve | 2010 | 206 | 10,3 | 823 | 204 | 99 % | 216 |
| Lance-roquettes | 4C | Napalm | 1250 | 104 | 8,3 | 538 | 81 | 77 % | 105 |
| Lance-roquettes | 5C | Mer de feu | 2080 | 133 | 6,4 | 724 | 113 | 85 % | 133 |
| Minigun | 1 | Minigun | 400 | 97 | 24,3 | 97 | 29 | 30 % | 97 |
| Minigun | 2 | Minigun | 640 | 163 | 25,4 | 162 | 78 | 48 % | 164 |
| Minigun | 3 | Minigun | 1040 | 274 | 26,4 | 275 | 181 | 66 % | 273 |
| Minigun | 4A | Surchauffe | 1720 | 412 | 23,9 | 410 | 269 | 65 % | 410 |
| Minigun | 5A | Fusion | 2720 | 611 | 22,5 | 614 | 462 | 76 % | 612 |
| Minigun | 4B | Balles incendiaires | 1680 | 390 | 23,2 | 391 | 277 | 71 % | 390 |
| Minigun | 5B | Enfer | 2630 | 588 | 22,4 | 592 | 476 | 81 % | 589 |
| Tourelle cryo | 1 | Tourelle cryo | 150 | 3 | 2,1 | 19 | 3 | 100 % | 3 |
| Tourelle cryo | 2 | Tourelle cryo | 250 | 5 | 1,9 | 29 | 5 | 100 % | 5 |
| Tourelle cryo | 3 | Tourelle cryo | 420 | 8 | 2,0 | 51 | 8 | 100 % | 8 |
| Tourelle cryo | 4A | Zéro absolu | 740 | 17 | 2,3 | 101 | 17 | 100 % | 17 |
| Tourelle cryo | 5A | Ère glaciaire | 1260 | 17 | 1,3 | 101 | 17 | 100 % | 17 |
| Tourelle cryo | 4B | Givre fragilisant | 760 | 21 | 2,8 | 127 | 21 | 100 % | 21 |
| Tourelle cryo | 5B | Cristal brisé | 1300 | 24 | 1,8 | 142 | 24 | 100 % | 24 |
| Laser | 1 | Laser | 300 | 85 | 28,2 | 85 | 35 | 41 % | 85 |
| Laser | 2 | Laser | 500 | 138 | 27,7 | 137 | 82 | 60 % | 139 |
| Laser | 3 | Laser | 830 | 224 | 27,0 | 224 | 161 | 72 % | 224 |
| Laser | 4A | Prisme | 1390 | 246 | 17,7 | 738 | 183 | 75 % | 248 |
| Laser | 5A | Arc-en-ciel | 2270 | 356 | 15,7 | 1419 | 293 | 82 % | 355 |
| Laser | 4B | Surchauffe | 1370 | 343 | 25,0 | 342 | 275 | 80 % | 343 |
| Laser | 5B | Rayon solaire | 2230 | 511 | 22,9 | 511 | 506 | 99 % | 512 |
| Tesla | 1 | Tesla | 280 | 39 | 14,0 | 118 | 34 | 88 % | 41 |
| Tesla | 2 | Tesla | 470 | 70 | 14,9 | 202 | 64 | 92 % | 68 |
| Tesla | 3 | Tesla | 780 | 116 | 14,9 | 341 | 110 | 95 % | 116 |
| Tesla | 4A | Orage | 1300 | 148 | 11,4 | 541 | 140 | 95 % | 147 |
| Tesla | 5A | Tempête électrique | 2120 | 235 | 11,1 | 863 | 227 | 97 % | 233 |
| Tesla | 4B | Surtension | 1320 | 163 | 12,4 | 485 | 157 | 96 % | 162 |
| Tesla | 5B | Paralysie | 2160 | 254 | 11,8 | 760 | 248 | 98 % | 258 |
| Tesla | 4C | Arc magnétique | 1320 | 140 | 10,6 | 517 | 134 | 96 % | 139 |
| Tesla | 5C | Orage polaire | 2160 | 218 | 10,1 | 825 | 212 | 97 % | 221 |
| Plasma | 1 | Plasma | 360 | 17 | 4,8 | 34 | 17 | 100 % | 18 |
| Plasma | 2 | Plasma | 600 | 29 | 4,8 | 59 | 29 | 100 % | 29 |
| Plasma | 3 | Plasma | 990 | 51 | 5,1 | 97 | 51 | 100 % | 49 |
| Plasma | 4A | Fusion | 1630 | 88 | 5,4 | 262 | 88 | 100 % | 91 |
| Plasma | 5A | Supernova | 2610 | 134 | 5,1 | 405 | 134 | 100 % | 135 |
| Plasma | 4B | Double cœur | 1610 | 97 | 6,0 | 196 | 97 | 100 % | 98 |
| Plasma | 5B | Réacteur | 2570 | 149 | 5,8 | 344 | 149 | 100 % | 147 |
| Drone | 1 | Drone | 320 | 70 | 21,9 | 72 | 56 | 79 % | 71 |
| Drone | 2 | Drone | 530 | 115 | 21,8 | 114 | 99 | 86 % | 114 |
| Drone | 3 | Drone | 880 | 187 | 21,3 | 188 | 169 | 90 % | 187 |
| Drone | 4A | Escadrille | 1440 | 376 | 26,1 | 375 | 338 | 90 % | 372 |
| Drone | 5A | Essaim | 2320 | 725 | 31,2 | 730 | 669 | 92 % | 729 |
| Drone | 4B | Bombardier | 1460 | 246 | 16,9 | 909 | 239 | 97 % | 243 |
| Drone | 5B | Tapis de feu | 2360 | 450 | 19,1 | 1943 | 427 | 95 % | 447 |
| Mine | 1 | Mine | 70 | 12 | 17,0 | 52 | 12 | 97 % | 12 |
| Mine | 2 | Mine | 115 | 18 | 16,0 | 83 | 18 | 98 % | 19 |
| Mine | 3 | Mine | 190 | 29 | 15,2 | 134 | 28 | 98 % | 29 |
| Mine | 4A | Méga-mine | 410 | 53 | 12,9 | 261 | 52 | 99 % | 53 |
| Mine | 5A | Cratère | 790 | 106 | 13,4 | 526 | 105 | 99 % | 115 |
| Mine | 4B | Piège électrique | 400 | 55 | 13,8 | 248 | 54 | 99 % | 54 |
| Mine | 5B | Bobine Tesla | 760 | 103 | 13,5 | 459 | 107 | 105 % | 102 |

## Rôles après correction


### Niveau 1 : dégâts utiles par seconde (rapides, diviseurs : PV traités par seconde) pour 100 pièces investies, meilleur de chaque colonne en gras

| Tourelle | Config | Coût | rapides | groupe | tanks | blindés | volants | diviseurs | invisibles | boss | boucliers | sauteurs | contrôle | polyvalence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fusil d'assaut | 1  | 100 | 30,9 | 41,8 | 41,9 | 25,3 | 41,7 | 14,8 | 41,2 | 10,9 | **27,4** | 40,3 | 0,0 | **84,0** |
| Mitraillette | 1  | 85 | **35,9** | 37,9 | 37,7 | 9,7 | 37,6 | **22,8** | 36,9 | 7,7 | 25,8 | 38,6 | 0,2 | 80,0 |
| Pompe | 1  | 130 | 7,2 | 43,1 | **42,9** | 21,4 | **42,6** | 6,2 | **42,7** | 9,1 | 24,1 | **40,7** | 0,6 | 71,1 |
| Sniper | 1  | 200 | 0,0 | 26,6 | 28,1 | 23,0 | 26,9 | 0,0 | 25,2 | **19,9** | 12,7 | 0,0 | 0,2 | 36,1 |
| Lance-roquettes | 1  | 250 | 13,6 | 72,3 | 30,3 | 28,8 | 26,9 | 19,3 | 25,9 | 4,0 | 14,0 | 8,1 | 0,0 | 60,5 |
| Minigun | 1  | 400 | 24,5 | 24,2 | 24,2 | 7,3 | 24,1 | 15,9 | 23,7 | 5,9 | 17,2 | 24,6 | 0,0 | 52,9 |
| Tourelle cryo | 1  | 150 | 15,6 | 45,3 | 18,3 | 17,8 | 15,2 | 12,4 | 15,5 | 0,6 | 15,7 | 8,1 | **22,6** | 43,0 |
| Laser | 1  | 300 | 21,3 | 19,1 | 22,9 | 6,8 | 19,7 | 12,4 | 21,1 | 8,0 | 15,7 | 21,6 | 0,0 | 45,8 |
| Tesla | 1  | 280 | 34,0 | 41,1 | 38,8 | 33,6 | 39,1 | 12,2 | 33,3 | 4,2 | 24,0 | 27,6 | 0,1 | 77,6 |
| Plasma | 1  | 360 | 2,0 | 64,4 | 30,2 | 26,9 | 14,5 | 3,5 | 5,8 | 2,3 | 10,9 | 5,6 | 0,1 | 37,3 |
| Drone | 1  | 320 | 17,5 | 21,9 | 22,4 | 17,2 | 22,0 | 5,1 | 21,6 | 6,4 | 13,8 | 21,2 | 0,1 | 44,3 |
| Mine | 1  | 70 | 0,0 | **89,4** | 39,0 | **37,8** | 0,0 | 0,0 | 32,9 | 1,0 | 0,0 | 0,0 | 0,4 | 40,9 |

### Niveau 3 : dégâts utiles par seconde (rapides, diviseurs : PV traités par seconde) pour 100 pièces investies, meilleur de chaque colonne en gras

| Tourelle | Config | Coût | rapides | groupe | tanks | blindés | volants | diviseurs | invisibles | boss | boucliers | sauteurs | contrôle | polyvalence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fusil d'assaut | 3  | 295 | **44,3** | 39,7 | 39,8 | 33,1 | 39,9 | **23,6** | 39,1 | 11,9 | **28,4** | **40,2** | 0,1 | **88,8** |
| Mitraillette | 3  | 250 | 40,2 | 36,5 | 36,2 | 13,8 | 36,5 | 22,5 | 35,6 | 8,1 | 26,1 | 37,7 | 0,1 | 77,0 |
| Pompe | 3  | 365 | 24,2 | 43,4 | **43,1** | 33,6 | **43,3** | 16,4 | **43,5** | 9,7 | 24,5 | 36,7 | 0,4 | 81,2 |
| Sniper | 3  | 600 | 0,0 | 24,0 | 22,6 | 22,0 | 23,5 | 0,0 | 23,5 | **21,5** | 19,1 | 0,0 | 0,0 | 34,3 |
| Lance-roquettes | 3  | 710 | 13,7 | 66,8 | 31,0 | 29,1 | 25,6 | 22,5 | 25,9 | 4,8 | 15,3 | 14,0 | 0,0 | 60,6 |
| Minigun | 3  | 1040 | 26,3 | 26,2 | 26,0 | 17,1 | 25,9 | 18,0 | 25,6 | 7,0 | 19,0 | 26,4 | 0,0 | 57,4 |
| Tourelle cryo | 3  | 420 | 21,6 | 60,1 | 23,6 | 23,6 | 19,8 | 15,3 | 20,5 | 0,6 | 20,9 | 10,7 | **14,0** | 53,4 |
| Laser | 3  | 830 | 21,5 | 18,1 | 21,8 | 12,6 | 19,1 | 12,3 | 20,5 | 8,5 | 15,4 | 21,0 | 0,0 | 44,3 |
| Tesla | 3  | 780 | 40,6 | 44,0 | 38,8 | **38,5** | 40,8 | 20,9 | 33,9 | 4,2 | 24,8 | 29,2 | 0,0 | 82,7 |
| Plasma | 3  | 990 | 13,0 | 71,1 | 26,2 | 29,0 | 25,6 | 14,9 | 6,4 | 3,2 | 9,0 | 9,1 | 0,0 | 47,2 |
| Drone | 3  | 880 | 19,1 | 21,5 | 21,3 | 19,3 | 21,2 | 8,5 | 21,1 | 6,0 | 13,8 | 19,6 | 0,0 | 43,8 |
| Mine | 3  | 190 | 0,0 | **104,0** | 41,6 | 38,4 | 0,0 | 0,0 | 33,9 | 0,8 | 0,0 | 0,0 | 0,0 | 41,6 |

### Niveau 5 : dégâts utiles par seconde (rapides, diviseurs : PV traités par seconde) pour 100 pièces investies, meilleur de chaque colonne en gras

| Tourelle | Config | Coût | rapides | groupe | tanks | blindés | volants | diviseurs | invisibles | boss | boucliers | sauteurs | contrôle | polyvalence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fusil d'assaut | 5A Tempête de plomb | 985 | 44,8 | 37,2 | 37,7 | 33,5 | 37,8 | 24,3 | 37,4 | 11,3 | 28,4 | 40,7 | 0,0 | 47,0 |
| Fusil d'assaut | 5B Œil de lynx | 935 | 34,9 | 38,7 | 39,2 | 35,3 | 38,1 | 17,3 | 37,4 | 13,4 | 29,1 | 39,7 | 0,0 | 42,6 |
| Fusil d'assaut | 5C Obus | 1015 | 39,1 | 63,9 | 40,3 | 36,0 | 38,4 | 24,8 | 36,5 | 9,1 | 25,6 | 33,3 | 0,0 | 44,3 |
| Mitraillette | 5A Perce-tout | 850 | 49,9 | 90,4 | 55,7 | 55,4 | 48,6 | **33,2** | 41,8 | 5,5 | 33,2 | 35,6 | 0,0 | **55,8** |
| Mitraillette | 5B Triple canon | 910 | 40,4 | 35,9 | 36,2 | 15,6 | 35,9 | 23,4 | 35,8 | 8,1 | 25,3 | 37,9 | 0,0 | 43,0 |
| Mitraillette | 5C Billard infernal | 950 | **50,4** | 49,8 | 44,9 | 17,2 | 44,3 | 29,4 | 35,8 | 3,3 | 26,8 | 29,5 | 0,0 | 47,4 |
| Pompe | 5A Brasier | 1085 | 30,5 | 46,9 | 43,6 | 34,3 | 43,1 | 15,3 | 42,5 | 8,5 | 23,9 | 37,2 | 0,1 | 40,8 |
| Pompe | 5B Chasseur de gros | 1075 | 34,0 | 37,3 | 36,4 | 33,1 | 37,0 | 17,6 | 36,9 | 11,8 | 25,0 | 32,7 | 0,3 | 39,4 |
| Pompe | 5C Tempête de fléchettes | 1105 | 24,7 | 69,1 | 50,2 | 41,2 | 40,4 | 22,9 | 31,1 | 6,4 | 27,4 | 26,8 | 0,1 | 39,8 |
| Sniper | 5A Tueur de boss | 1830 | 0,0 | 28,7 | 32,2 | 28,8 | 29,6 | 0,0 | 27,9 | 26,7 | 23,7 | 0,0 | 0,1 | 14,8 |
| Sniper | 5B Semi-auto | 1700 | 30,4 | 32,2 | 34,2 | 33,2 | 34,4 | 0,0 | 31,5 | **31,6** | 20,1 | 28,1 | 0,0 | 29,5 |
| Sniper | 5C Canon électromagnétique | 1880 | 34,2 | 181,1 | 124,0 | 92,1 | **72,7** | 0,0 | 23,1 | 15,0 | 34,3 | 40,5 | 0,3 | 51,9 |
| Lance-roquettes | 5A Tapis de bombes | 2050 | 37,2 | 122,4 | 49,1 | 46,3 | 38,8 | 28,7 | 39,6 | 4,9 | 21,8 | 22,8 | 0,0 | 44,2 |
| Lance-roquettes | 5B Salve | 2010 | 32,3 | 64,1 | 26,0 | 25,2 | 23,6 | 25,4 | 23,4 | 6,4 | 17,3 | 19,4 | 0,0 | 33,3 |
| Lance-roquettes | 5C Mer de feu | 2080 | 25,0 | 76,2 | 29,4 | 23,9 | 23,0 | 17,1 | 26,5 | 2,9 | 15,5 | 15,3 | 0,0 | 28,0 |
| Minigun | 5A Fusion | 2720 | 23,8 | 22,3 | 21,9 | 16,4 | 21,1 | 15,8 | 21,2 | 6,4 | 15,9 | 23,8 | 0,0 | 27,0 |
| Minigun | 5B Enfer | 2630 | 24,9 | 29,7 | 24,0 | 20,0 | 25,8 | 16,3 | 23,0 | 6,2 | 16,4 | 23,4 | 0,0 | 28,7 |
| Tourelle cryo | 5A Ère glaciaire | 1260 | 38,5 | 148,7 | 45,6 | 55,8 | 50,1 | 31,5 | 51,5 | 0,5 | 43,4 | 15,6 | **28,0** | 51,3 |
| Tourelle cryo | 5B Cristal brisé | 1300 | 21,5 | 63,7 | 24,5 | 24,8 | 21,2 | 16,2 | 21,7 | 0,7 | 21,6 | 12,1 | 5,1 | 26,2 |
| Laser | 5A Arc-en-ciel | 2270 | 47,8 | 42,6 | 50,1 | 35,8 | 43,6 | 24,6 | 36,6 | 5,0 | 32,1 | **42,3** | 0,0 | 50,5 |
| Laser | 5B Rayon solaire | 2230 | 15,1 | 13,3 | 19,2 | 16,8 | 15,9 | 8,6 | 17,9 | 7,3 | 13,1 | 18,2 | 0,0 | 19,3 |
| Tesla | 5A Tempête électrique | 2120 | 47,3 | 49,1 | 43,2 | 42,1 | 42,9 | 24,5 | 31,1 | 3,3 | 22,5 | 24,6 | 0,0 | 43,5 |
| Tesla | 5B Paralysie | 2160 | 38,2 | 35,5 | 34,9 | 34,7 | 34,9 | 19,8 | 34,9 | 3,5 | 20,6 | 40,3 | 0,5 | 41,7 |
| Tesla | 5C Orage polaire | 2160 | 47,8 | 42,3 | 40,8 | 39,0 | 40,8 | 25,2 | 36,2 | 4,0 | 22,8 | 30,5 | 1,4 | 45,1 |
| Plasma | 5A Supernova | 2610 | 26,9 | 97,0 | 39,7 | 37,4 | 37,8 | 20,4 | 10,2 | 3,7 | 12,3 | 15,1 | 0,0 | 31,5 |
| Plasma | 5B Réacteur | 2570 | 22,5 | 64,5 | 27,0 | 24,5 | 24,5 | 14,3 | 6,7 | 3,0 | 8,4 | 12,2 | 0,0 | 22,7 |
| Drone | 5A Essaim | 2320 | 34,7 | 31,5 | 31,5 | 29,2 | 31,4 | 19,9 | 31,2 | 10,0 | 21,4 | 32,0 | 0,0 | 37,6 |
| Drone | 5B Tapis de feu | 2360 | 43,5 | 103,9 | 45,5 | 46,0 | 34,3 | 32,2 | 41,9 | 5,6 | 26,6 | 28,9 | 0,0 | 48,2 |
| Mine | 5A Cratère | 790 | 0,0 | 127,5 | 49,3 | 47,2 | 0,0 | 0,0 | 43,7 | 1,2 | 19,4 | 0,0 | 0,0 | 14,5 |
| Mine | 5B Bobine Tesla | 760 | 0,0 | **504,4** | **244,7** | **220,8** | 0,0 | 0,0 | **141,7** | 0,9 | **58,2** | 0,0 | 22,3 | 55,6 |


# Après correction : étape B (talents et château)

Rangs fusionnés : la valeur totale est gardée, chaque rang vaut au moins 3 %. Pour une sauvegarde existante, les points placés au-delà du nouveau maximum sont rendus (testé dans `tools/save-test.cjs`).

| Élément | Avant | Après | Par rang |
|---|---|---|---|
| Poudre premium | 5 rangs × 2 % (10 %) | 3 rangs × 3,5 % (10,5 %) | 3,5 % |
| Culasse huilée | 5 rangs × 2 % (10 %) | 3 rangs × 3,5 % (10,5 %) | 3,5 % |
| Longue-vue | 3 rangs × 2 % (6 %) | 2 rangs × 3 % (6 %) | 3 % |
| Œil vif | 3 rangs × 1 % (3 %) | 1 rang × 3 % (3 %) | 3 % |
| Chasseur de primes | 5 rangs × 3 % (15 %) | 3 rangs × 5 % (15 %) | 5 % |
| Brocanteur | 3 rangs × 5 % (15 %) | 1 rang × 15 % (15 %) | 15 % |
| Réparation (château) | toutes les 4, 3, 2, 2, 1 vagues | toutes les 5, 4, 3, 2, 1 vagues | chaque rang compte |

Points de talent au maximum : 58 → 47. Sur 60 jours (tools/progression.cjs) : monde 1 fini jour 4, campagne jour 32, talents et château au maximum jour 47 (avant : 53). Les pourcentages des talents s'affichent au dixième près (« +10,5 % »).
