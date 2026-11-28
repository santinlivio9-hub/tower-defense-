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

# Après correction : étape C (difficulté)

Référence choisie (option 1B) : le **débutant** simulé (`SKILL=low`).

| Règle | Objectif | Avant | Après |
|---|---|---|---|
| Victoires, niveaux normaux | 80-90 % | 95 % | **87 %** (84 à 91 % selon le monde) |
| 3 étoiles, niveaux normaux | ~40 % | 38 %, mais 0 % ou ~100 % selon le 3e objectif | **46 %**, même objectif partout (option 4B) |
| Boss sans boost | 55-70 % | 88-100 % | **54-75 %**, 61 % en moyenne |
| Boss avec boosts | ~85 % | 100 % | **90 %** en moyenne (2 failles corrigées, voir plus bas) |
| Défis Héroïques | 30-50 % | 92 % | **47 %** (37 à 57 % selon le monde) |
| Renaissance | chaque rang plus dur, rattrapé | rangs 1-3 sans effet, boss impossibles au rang 5 | normaux 96 → 94 → 77 %, boss 63 → 60 → 54 % (rangs 1, 3, 5) |
| Écart entre 2 niveaux normaux | +5 à +10 % | -48 à +101 % | **+7 %** dans chaque monde |
| Vagues calmes | 1 ou 2 par niveau | 0 | **2** par niveau (1 entre deux mini-boss) |
| Durée, niveau normal | 4-6 min | 3,5 à 7,8 min | **4,7 à 5,7 min** (10 à 12 vagues) |
| Durée, boss | 20 min max | 9 à 15 min | 9 à 15 min |
| Une seule tourelle partout, 3 étoiles (monde 2+) | jamais | 25 cas sur 116 | **4 cas sur 116**, tous par un robot parfait (Lance-roquettes ×2, Minigun, Tesla) |

**Changements :**

- **Courbe lisse.** `CAMPAIGN.tune` (calculé par `node tools/balance.cjs tune --write`) place chaque niveau normal à +7 % du précédent dans son monde. Le niveau de chaque monde est calé sur les simulations (`CAMPAIGN.hpWorld`, `CAMPAIGN.bossLevelHp`).
- **Vagues calmes** (`WAVES.calm`) : 2 par niveau, plus 1 entre deux mini-boss.
- **Nouvel ennemi présenté seul.** À sa 1re apparition, il arrive seul, au plus `WAVES.introMax` = 5 ; il est mélangé aux autres dès la vague suivante.
- **Capacités des boss et mini-boss annoncées** 1,4 s avant de frapper (`ABILITY_WARN`) : texte (« Coupure ! », « Sbires ! », « Bouclier ! ») et cercle. Pour une coupure, le cercle montre la zone exacte des tourelles touchées.
- **3e étoile** : « N tourelles maximum » sur tous les niveaux, avec 50 % des emplacements (option 4B).
- **Défis Héroïques** : PV des ennemis par monde (`HEROIC.hpWorld`), parce qu'on les joue avec l'équipement de fin de campagne.
- **Renaissance** (option 3B) : régénération plafonnée à 6 PV/s par rang. PV des mutés x2,5 au rang 1 (le joueur garde tourelles, talents et branches légendaires), puis +6 % par rang. Mutation atténuée à 85 % dans les niveaux de boss.
- **Faille corrigée : Bouclier.** Il bloquait la fuite du boss : le boss disparaissait au château et le niveau était gagné. Il ne bloque plus les boss.
- **Faille corrigée : Seconde chance.** Elle faisait disparaître le boss qui venait d'atteindre le château. Désormais, le boss revient sur le chemin, repoussé de 160 px. La Surcharge passe de +50 % à +40 % de cadence.

## Taux de victoire après correction (débutant, 8 profils par niveau)

    monde 1 : normaux  88 % (3* 66 %, 4.8 min) | boss 88 % (11.1 min)
    monde 2 : normaux  88 % (3* 57 %, 5.6 min) | boss 38 % (10.6 min)
    monde 3 : normaux  85 % (3* 53 %, 5.5 min) | boss 50 % (12.5 min)
    monde 4 : normaux  84 % (3* 32 %, 5.4 min) | boss 75 % (12.9 min)
    monde 5 : normaux  90 % (3* 50 %, 5.6 min) | boss 88 % (13.5 min)
    monde 6 : normaux  86 % (3* 43 %, 5.5 min) | boss 75 % (14.5 min)
    monde 7 : normaux  84 % (3* 40 %, 5.6 min) | boss 50 % (14.9 min)
    monde 8 : normaux  90 % (3* 29 %, 5.7 min) | boss 75 % (14.9 min)
    TOTAL normaux 86.8 % , 3 étoiles 46 %


| Niveau | Victoires | 3 étoiles | Étoiles moy. | Durée moy. (min) | PV perdus moy. | Pièces restantes moy. |
|---|---|---|---|---|---|---|
| 1-1 | 88 % | 38 % | 2,1 | 4,4 | 5,4 | 504 |
| 1-2 | 100 % | 100 % | 3,0 | 3,9 | 0,0 | 351 |
| 1-3 | 88 % | 75 % | 2,5 | 4,5 | 2,9 | 469 |
| 1-4 | 88 % | 88 % | 2,6 | 4,3 | 2,8 | 396 |
| 1-5 | 88 % | 75 % | 2,5 | 4,7 | 3,5 | 714 |
| 1-6 | 75 % | 38 % | 1,9 | 4,0 | 6,3 | 434 |
| 1-7 | 100 % | 75 % | 2,8 | 6,4 | 0,8 | 838 |
| 1-8 | 88 % | 63 % | 2,4 | 5,9 | 6,1 | 717 |
| 1-9 | 75 % | 38 % | 1,9 | 4,7 | 10,1 | 592 |
| 1-10 (boss) | 88 % | 0 % | 0,9 | 11,1 | 9,9 | 1140 |
| 2-1 | 100 % | 75 % | 2,8 | 5,2 | 3,3 | 692 |
| 2-2 | 50 % | 38 % | 1,4 | 5,3 | 14,4 | 464 |
| 2-3 | 75 % | 25 % | 1,8 | 5,9 | 14,3 | 848 |
| 2-4 | 100 % | 75 % | 2,8 | 5,2 | 0,5 | 476 |
| 2-5 | 100 % | 100 % | 3,0 | 5,6 | 0,0 | 698 |
| 2-6 | 63 % | 25 % | 1,5 | 5,5 | 11,0 | 607 |
| 2-7 | 100 % | 75 % | 2,8 | 6,0 | 2,3 | 725 |
| 2-8 | 100 % | 63 % | 2,6 | 5,9 | 0,5 | 501 |
| 2-9 | 100 % | 38 % | 2,4 | 5,7 | 4,1 | 508 |
| 2-10 (boss) | 38 % | 0 % | 0,6 | 10,6 | 18,3 | 721 |
| 3-1 | 100 % | 100 % | 3,0 | 4,8 | 0,0 | 436 |
| 3-2 | 100 % | 50 % | 2,5 | 5,0 | 6,5 | 680 |
| 3-3 | 100 % | 63 % | 2,6 | 5,1 | 2,5 | 614 |
| 3-4 | 100 % | 75 % | 2,8 | 5,8 | 1,0 | 593 |
| 3-5 | 63 % | 13 % | 1,4 | 5,6 | 11,9 | 621 |
| 3-6 | 100 % | 88 % | 2,9 | 5,5 | 0,0 | 479 |
| 3-7 | 88 % | 25 % | 2,0 | 6,3 | 8,1 | 682 |
| 3-8 | 100 % | 63 % | 2,6 | 5,6 | 0,1 | 543 |
| 3-9 | 13 % | 0 % | 0,3 | 5,5 | 24,6 | 559 |
| 3-10 (boss) | 50 % | 0 % | 0,8 | 12,5 | 13,3 | 1152 |
| 4-1 | 100 % | 50 % | 2,5 | 4,6 | 3,5 | 366 |
| 4-2 | 75 % | 0 % | 1,5 | 4,3 | 12,1 | 563 |
| 4-3 | 38 % | 0 % | 0,8 | 5,9 | 23,8 | 893 |
| 4-4 | 88 % | 38 % | 2,1 | 5,8 | 12,5 | 828 |
| 4-5 | 88 % | 0 % | 1,8 | 5,1 | 11,4 | 518 |
| 4-6 | 88 % | 38 % | 2,1 | 6,1 | 8,4 | 976 |
| 4-7 | 88 % | 50 % | 2,3 | 5,7 | 5,4 | 706 |
| 4-8 | 100 % | 88 % | 2,9 | 5,6 | 0,0 | 653 |
| 4-9 | 88 % | 25 % | 2,0 | 5,5 | 9,1 | 454 |
| 4-10 (boss) | 75 % | 0 % | 1,1 | 12,9 | 7,6 | 2516 |
| 5-1 | 100 % | 50 % | 2,5 | 5,1 | 6,4 | 707 |
| 5-2 | 100 % | 63 % | 2,6 | 4,5 | 6,5 | 607 |
| 5-3 | 100 % | 75 % | 2,8 | 6,0 | 3,4 | 790 |
| 5-4 | 100 % | 38 % | 2,4 | 5,2 | 3,4 | 545 |
| 5-5 | 88 % | 25 % | 2,0 | 5,8 | 10,0 | 956 |
| 5-6 | 100 % | 88 % | 2,9 | 5,9 | 2,1 | 755 |
| 5-7 | 100 % | 88 % | 2,9 | 5,5 | 0,9 | 589 |
| 5-8 | 38 % | 0 % | 0,8 | 6,2 | 24,3 | 974 |
| 5-9 | 88 % | 25 % | 2,0 | 5,9 | 6,6 | 686 |
| 5-10 (boss) | 88 % | 0 % | 1,4 | 13,5 | 7,8 | 1482 |
| 6-1 | 100 % | 88 % | 2,9 | 4,4 | 1,8 | 579 |
| 6-2 | 38 % | 0 % | 0,8 | 4,9 | 26,3 | 911 |
| 6-3 | 88 % | 25 % | 2,0 | 5,7 | 10,9 | 855 |
| 6-4 | 88 % | 13 % | 1,9 | 5,6 | 7,3 | 658 |
| 6-5 | 100 % | 63 % | 2,6 | 5,1 | 2,5 | 499 |
| 6-6 | 88 % | 25 % | 2,0 | 5,9 | 14,1 | 997 |
| 6-7 | 100 % | 75 % | 2,8 | 5,6 | 0,0 | 619 |
| 6-8 | 88 % | 88 % | 2,6 | 6,2 | 3,8 | 869 |
| 6-9 | 88 % | 13 % | 1,9 | 6,3 | 12,3 | 1172 |
| 6-10 (boss) | 75 % | 0 % | 1,4 | 14,5 | 9,3 | 1124 |
| 7-1 | 100 % | 75 % | 2,8 | 4,3 | 0,9 | 585 |
| 7-2 | 100 % | 25 % | 2,3 | 5,0 | 4,1 | 631 |
| 7-3 | 88 % | 13 % | 1,9 | 5,7 | 8,5 | 742 |
| 7-4 | 100 % | 100 % | 3,0 | 4,5 | 0,0 | 496 |
| 7-5 | 75 % | 13 % | 1,6 | 5,9 | 14,6 | 755 |
| 7-6 | 100 % | 88 % | 2,9 | 5,4 | 0,0 | 558 |
| 7-7 | 88 % | 50 % | 2,3 | 6,4 | 9,9 | 619 |
| 7-8 | 63 % | 0 % | 1,3 | 6,5 | 17,4 | 969 |
| 7-9 | 38 % | 0 % | 0,8 | 6,3 | 27,0 | 1019 |
| 7-10 (boss) | 50 % | 0 % | 1,0 | 14,9 | 15,0 | 1606 |
| 8-1 | 100 % | 50 % | 2,5 | 4,5 | 0,5 | 505 |
| 8-2 | 88 % | 0 % | 1,8 | 5,1 | 13,8 | 827 |
| 8-3 | 100 % | 50 % | 2,5 | 4,9 | 4,4 | 600 |
| 8-4 | 100 % | 38 % | 2,4 | 6,2 | 8,1 | 956 |
| 8-5 | 100 % | 38 % | 2,4 | 5,5 | 5,5 | 424 |
| 8-6 | 88 % | 25 % | 2,0 | 6,3 | 9,8 | 654 |
| 8-7 | 100 % | 38 % | 2,4 | 6,2 | 5,5 | 794 |
| 8-8 | 100 % | 25 % | 2,3 | 6,1 | 6,5 | 699 |
| 8-9 | 38 % | 0 % | 0,8 | 6,2 | 26,4 | 917 |
| 8-10 (boss) | 75 % | 0 % | 1,0 | 14,9 | 16,4 | 1693 |

### Boss (24 essais) sans boost, puis avec boosts


| Niveau | Victoires | 3 étoiles | Étoiles moy. | Durée moy. (min) | PV perdus moy. | Pièces restantes moy. |
|---|---|---|---|---|---|---|
| 1-10 (boss) | 54 % | 0 % | 0,7 | 8,1 | 14,8 | 1014 |
| 2-10 (boss) | 54 % | 0 % | 0,8 | 11,2 | 13,8 | 1377 |
| 3-10 (boss) | 54 % | 0 % | 0,8 | 12,2 | 14,3 | 1185 |
| 4-10 (boss) | 75 % | 0 % | 1,2 | 13,0 | 10,5 | 2569 |
| 5-10 (boss) | 63 % | 0 % | 0,9 | 11,5 | 14,9 | 1293 |
| 6-10 (boss) | 71 % | 0 % | 1,0 | 14,3 | 14,0 | 1176 |
| 7-10 (boss) | 58 % | 0 % | 0,8 | 14,8 | 16,5 | 1859 |
| 8-10 (boss) | 63 % | 0 % | 0,8 | 14,0 | 18,1 | 2402 |


| Niveau | Victoires | 3 étoiles | Étoiles moy. | Durée moy. (min) | PV perdus moy. | Pièces restantes moy. |
|---|---|---|---|---|---|---|
| 1-10 (boss) | 83 % | 0 % | 1,0 | 10,5 | 12,2 | 1093 |
| 2-10 (boss) | 83 % | 0 % | 1,0 | 11,8 | 11,0 | 1008 |
| 3-10 (boss) | 83 % | 0 % | 1,1 | 12,6 | 11,8 | 1288 |
| 4-10 (boss) | 100 % | 0 % | 1,6 | 14,1 | 5,8 | 2712 |
| 5-10 (boss) | 92 % | 0 % | 1,2 | 14,7 | 8,4 | 1582 |
| 6-10 (boss) | 100 % | 0 % | 1,5 | 15,0 | 6,0 | 1914 |
| 7-10 (boss) | 88 % | 0 % | 1,3 | 15,0 | 11,2 | 2001 |
| 8-10 (boss) | 92 % | 0 % | 1,3 | 15,1 | 8,8 | 2633 |

### Défis Héroïques (6 essais par niveau)

    monde 1 : normaux  56 % (3* 22 %, 5.6 min) 
    monde 2 : normaux  52 % (3* 24 %, 5.3 min) 
    monde 3 : normaux  37 % (3* 11 %, 5.3 min) 
    monde 4 : normaux  42 % (3* 11 %, 5.1 min) 
    monde 5 : normaux  44 % (3*  6 %, 5.6 min) 
    monde 6 : normaux  46 % (3* 26 %, 5.0 min) 
    monde 7 : normaux  57 % (3* 17 %, 5.1 min) 
    monde 8 : normaux  43 % (3* 20 %, 5.4 min) 
    TOTAL normaux 47.2 % , 3 étoiles 17 %

### Une seule tourelle partout (bon joueur)


| Niveau | Fusil | Mitrail. | Pompe | Sniper | Roquettes | Minigun | Cryo | Laser | Tesla | Plasma | Drone |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2-3 | 2* | 1* | 2* | 2* |  |  | perdu |  |  |  |  |
| 2-8 | 2* | 2* | 2* | 2* | 3* |  | perdu |  |  |  |  |
| 3-3 | 2* | 2* | 2* | 1* | 2* | 2* | perdu |  |  |  |  |
| 3-8 | 2* | 2* | 2* | 1* | 1* | perdu | perdu |  |  |  |  |
| 4-3 | 2* | 1* | 1* | 1* | 2* | perdu | perdu |  |  |  |  |
| 4-8 | 2* | 2* | 2* | 2* | 2* | 3* | 1* |  |  |  |  |
| 5-3 | 2* | 2* | 2* | 2* | 3* | 2* | 1* |  |  |  |  |
| 5-8 | 1* | 1* | 1* | perdu | perdu | perdu | perdu |  |  |  |  |
| 6-3 | 2* | 1* | 1* | 1* | 2* | perdu | perdu | perdu |  |  |  |
| 6-8 | 2* | 2* | 2* | 1* | 2* | 2* | 1* | 2* | 3* |  |  |
| 7-3 | 1* | 1* | 2* | 1* | 2* | 2* | 1* | 1* | 1* | perdu |  |
| 7-8 | 2* | 1* | 1* | 1* | 2* | 2* | 1* | perdu | 1* | perdu | perdu |
| 8-3 | 2* | 1* | 2* | 2* | 1* | 2* | 1* | 2* | 2* | perdu | 1* |
| 8-8 | 2* | 2* | 1* | 1* | 2* | 2* | 1* | 1* | 1* | perdu | 2* |

## Courbe de difficulté après correction

| Niveau | Vagues | Chemin (px) | PV totaux | Ennemis | DPS requis au pic | Écart / niveau normal précédent | Vagues calmes | Pic en fin | PV boss | Pièces gagnables |
|---|---|---|---|---|---|---|---|---|---|---|
| 1-1 | 10 | 2156 | 29456 | 242 | 201 | - | 2 | oui | - | 2100 |
| 1-2 | 10 | 1456 | 26546 | 261 | 215 | +7 % | 2 | oui | - | 2195 |
| 1-3 | 11 | 1996 | 34756 | 239 | 230 | +7 % | 2 | oui | - | 2440 |
| 1-4 | 11 | 2256 | 42344 | 262 | 246 | +7 % | 2 | oui | - | 2522 |
| 1-5 | 11 | 2086 | 39231 | 247 | 263 | +7 % | 2 | oui | - | 2442 |
| 1-6 | 12 | 1206 | 37530 | 252 | 282 | +7 % | 2 | oui | - | 2724 |
| 1-7 | 12 | 2806 | 63791 | 271 | 302 | +7 % | 2 | oui | - | 2810 |
| 1-8 | 12 | 2156 | 54792 | 282 | 322 | +7 % | 2 | oui | - | 2809 |
| 1-9 | 12 | 1456 | 50361 | 280 | 345 | +7 % | 2 | oui | - | 2806 |
| 1-10 (boss) | 20 | 1356 | 325350 | 704 | 1583 | - | 2 | oui | 15902 | 6635 |
| 2-1 | 10 | 2256 | 45145 | 204 | 307 | -11 % | 2 | oui | - | 2194 |
| 2-2 | 10 | 2806 | 61920 | 188 | 329 | +7 % | 2 | oui | - | 2175 |
| 2-3 | 11 | 2156 | 63234 | 217 | 352 | +7 % | 2 | oui | - | 2519 |
| 2-4 | 11 | 1206 | 43453 | 233 | 377 | +7 % | 2 | oui | - | 2553 |
| 2-5 | 11 | 1996 | 70075 | 221 | 403 | +7 % | 2 | oui | - | 2473 |
| 2-6 | 12 | 2086 | 85027 | 246 | 432 | +7 % | 2 | oui | - | 2829 |
| 2-7 | 12 | 2086 | 71325 | 252 | 462 | +7 % | 2 | oui | - | 2799 |
| 2-8 | 12 | 1456 | 80562 | 234 | 494 | +7 % | 2 | oui | - | 2783 |
| 2-9 | 12 | 2256 | 86325 | 285 | 528 | +7 % | 2 | oui | - | 2816 |
| 2-10 (boss) | 22 | 1426 | 620465 | 647 | 2482 | - | 2 | oui | 22460 | 7150 |
| 3-1 | 10 | 1996 | 60181 | 179 | 469 | -11 % | 2 | oui | - | 2150 |
| 3-2 | 10 | 2086 | 57247 | 172 | 502 | +7 % | 2 | oui | - | 2176 |
| 3-3 | 11 | 1356 | 70652 | 223 | 536 | +7 % | 2 | oui | - | 2541 |
| 3-4 | 11 | 2806 | 102435 | 219 | 574 | +7 % | 2 | oui | - | 2611 |
| 3-5 | 11 | 2256 | 113309 | 217 | 614 | +7 % | 2 | oui | - | 2536 |
| 3-6 | 12 | 1456 | 85393 | 270 | 657 | +7 % | 2 | oui | - | 3007 |
| 3-7 | 12 | 2086 | 119285 | 265 | 703 | +7 % | 2 | oui | - | 2949 |
| 3-8 | 12 | 1426 | 111508 | 250 | 753 | +7 % | 2 | oui | - | 2897 |
| 3-9 | 12 | 2156 | 160070 | 219 | 804 | +7 % | 2 | oui | - | 2806 |
| 3-10 (boss) | 24 | 1206 | 773219 | 718 | 3605 | - | 2 | oui | 37572 | 8464 |
| 4-1 | 10 | 1456 | 61757 | 190 | 501 | -38 % | 2 | oui | - | 2423 |
| 4-2 | 10 | 1426 | 80625 | 153 | 536 | +7 % | 2 | oui | - | 2220 |
| 4-3 | 11 | 2156 | 100885 | 189 | 573 | +7 % | 2 | oui | - | 2605 |
| 4-4 | 11 | 1996 | 110946 | 198 | 612 | +7 % | 2 | oui | - | 2648 |
| 4-5 | 11 | 1206 | 90312 | 185 | 656 | +7 % | 2 | oui | - | 2632 |
| 4-6 | 12 | 2086 | 143641 | 191 | 701 | +7 % | 2 | oui | - | 3083 |
| 4-7 | 12 | 2256 | 118360 | 242 | 750 | +7 % | 2 | oui | - | 3063 |
| 4-8 | 12 | 2086 | 106359 | 227 | 803 | +7 % | 2 | oui | - | 3080 |
| 4-9 | 12 | 1356 | 115972 | 204 | 859 | +7 % | 2 | oui | - | 3136 |
| 4-10 (boss) | 25 | 2806 | 985926 | 651 | 2988 | - | 2 | oui | 28997 | 9371 |
| 5-1 | 10 | 2086 | 101264 | 177 | 585 | -32 % | 2 | oui | - | 2467 |
| 5-2 | 10 | 1356 | 80262 | 143 | 626 | +7 % | 2 | oui | - | 2384 |
| 5-3 | 11 | 2806 | 130772 | 211 | 669 | +7 % | 2 | oui | - | 2799 |
| 5-4 | 11 | 1426 | 98881 | 177 | 716 | +7 % | 2 | oui | - | 2874 |
| 5-5 | 11 | 2256 | 150319 | 244 | 766 | +7 % | 2 | oui | - | 2837 |
| 5-6 | 12 | 1996 | 157260 | 259 | 820 | +7 % | 2 | oui | - | 3274 |
| 5-7 | 12 | 1206 | 115253 | 214 | 878 | +7 % | 2 | oui | - | 3284 |
| 5-8 | 12 | 2156 | 195052 | 224 | 939 | +7 % | 2 | non | - | 3220 |
| 5-9 | 12 | 1456 | 162391 | 226 | 1005 | +7 % | 2 | oui | - | 3193 |
| 5-10 (boss) | 26 | 2086 | 1199264 | 745 | 3035 | - | 3 | non | 43192 | 10222 |
| 6-1 | 10 | 1206 | 61450 | 155 | 539 | -46 % | 2 | oui | - | 2454 |
| 6-2 | 10 | 2156 | 101436 | 166 | 576 | +7 % | 2 | oui | - | 2434 |
| 6-3 | 11 | 2256 | 116345 | 198 | 617 | +7 % | 2 | oui | - | 2890 |
| 6-4 | 11 | 1356 | 113320 | 181 | 660 | +7 % | 2 | oui | - | 2826 |
| 6-5 | 11 | 1456 | 79711 | 188 | 706 | +7 % | 2 | oui | - | 2825 |
| 6-6 | 12 | 2086 | 155057 | 181 | 756 | +7 % | 2 | oui | - | 3203 |
| 6-7 | 12 | 1426 | 118662 | 240 | 809 | +7 % | 2 | oui | - | 3280 |
| 6-8 | 12 | 1996 | 139797 | 209 | 865 | +7 % | 2 | oui | - | 3244 |
| 6-9 | 12 | 2086 | 161893 | 194 | 926 | +7 % | 2 | oui | - | 3237 |
| 6-10 (boss) | 26 | 2806 | 1129258 | 673 | 2218 | - | 3 | oui | 42126 | 10407 |
| 7-1 | 10 | 1426 | 68099 | 182 | 603 | -35 % | 2 | oui | - | 2519 |
| 7-2 | 10 | 1996 | 108301 | 167 | 646 | +7 % | 2 | oui | - | 2422 |
| 7-3 | 11 | 2086 | 120898 | 181 | 691 | +7 % | 2 | oui | - | 2922 |
| 7-4 | 11 | 1456 | 69352 | 198 | 739 | +7 % | 2 | oui | - | 2845 |
| 7-5 | 11 | 2086 | 143836 | 211 | 791 | +7 % | 2 | oui | - | 2848 |
| 7-6 | 12 | 1206 | 111453 | 229 | 847 | +7 % | 2 | oui | - | 3351 |
| 7-7 | 12 | 1356 | 129683 | 213 | 905 | +7 % | 2 | oui | - | 3322 |
| 7-8 | 12 | 2256 | 178692 | 185 | 969 | +7 % | 2 | oui | - | 3279 |
| 7-9 | 12 | 2806 | 201997 | 223 | 1037 | +7 % | 2 | oui | - | 3288 |
| 7-10 (boss) | 27 | 2156 | 1162315 | 673 | 2750 | - | 3 | oui | 43281 | 10988 |
| 8-1 | 10 | 1356 | 60459 | 190 | 702 | -32 % | 2 | oui | - | 2497 |
| 8-2 | 10 | 2086 | 114962 | 138 | 751 | +7 % | 2 | oui | - | 2462 |
| 8-3 | 11 | 1206 | 96938 | 189 | 803 | +7 % | 2 | oui | - | 2975 |
| 8-4 | 11 | 2806 | 168348 | 181 | 860 | +7 % | 2 | oui | - | 2986 |
| 8-5 | 11 | 1426 | 128076 | 170 | 920 | +7 % | 2 | oui | - | 2824 |
| 8-6 | 12 | 2156 | 163015 | 237 | 985 | +7 % | 2 | oui | - | 3339 |
| 8-7 | 12 | 1996 | 168772 | 262 | 1053 | +7 % | 2 | oui | - | 3433 |
| 8-8 | 12 | 1456 | 180908 | 218 | 1127 | +7 % | 2 | oui | - | 3425 |
| 8-9 | 12 | 2086 | 219824 | 205 | 1206 | +7 % | 2 | oui | - | 3255 |
| 8-10 (boss) | 28 | 2256 | 1138098 | 686 | 2448 | - | 3 | oui | 44940 | 11661 |


# Après correction : étape D (économie)

**Mesure corrigée d'abord** (`tools/progression.cjs`) :
- le contenu d'un coffre compte pour la source qui l'a donné (roue, passe, quêtes, niveaux...) au lieu d'une ligne « coffres » à part ; un coffre acheté est un simple échange, hors gains ;
- les tirages (coffres, roue) sont reproductibles avec la graine ;
- les chances de victoire sont calées sur les taux mesurés à l'étape C (débutant : 87 % sur un niveau normal, 61 % sur un boss sans boost, 90 % avec, 47 % sur un défi héroïque) ;
- nouveau : `ADS=10` simule un joueur qui regarde 10 pubs par jour (pièces doublées en fin de niveau, réanimation, construction accélérée, tours de roue bonus).

Avec cette mesure, les récompenses quotidiennes pesaient en réalité **48 %** de la valeur gagnée, et non 36 %. Valeur = pièces + gemmes (1 gemme = 27 pièces, le taux du grand échange de la boutique).

| Règle | Objectif | Avant | Après |
|---|---|---|---|
| Quotidien (cadeau, roue, quêtes, passe), 3 parties par jour | au plus 30 % | 48 % (46 à 49 % selon la graine) | **25 %** (24 à 26 %) |
| Quotidien, 2 parties par jour | au plus 30 % | 51 % | **27 %** |
| Quotidien, 5 parties par jour | au plus 30 % | 40 % | **19 %** |
| Quotidien, avec 10 pubs par jour | au plus 30 % | 28 % | **15 %** |
| Monde 1 fini | jour 3-4 | jour 4 | jour 4 |
| Campagne finie | 4-5 semaines | jour 29 à 31 | jour 29 à 31 (inchangé) |
| Talents et château au maximum | 6-8 semaines | jour 42 à 50 | jour 42 à 50 (inchangé) |
| Sans pub ou avec 10 pubs par jour | même progression | campagne jour 30 / 28, tout au maximum jour 45 / 42 | identique |
| Pièces et gemmes au jour 60 | pas d'accumulation | 2435 pièces, 55 gemmes | 2861 pièces, 62 gemmes |
| Points de talent en trop (tout est au maximum) | pas de monnaie inutile | 30 au jour 60, badge rouge impossible à effacer | toujours gardés, mais plus de badge ni de « points à placer » (puce « MAX ») |
| Argent de départ en partie | 2-3 tourelles à la 1re vague | 240-320 pièces : 2 Fusils ou 3 Mitraillettes | inchangé |
| Argent restant en fin de niveau | jamais beaucoup | normaux 560-780 (18-24 % de l'argent gagné, la dernière vague en rapporte 11-12 %) ; boss 720-2500 (7-20 %) | inchangé |
| Bonus d'appel anticipé | jamais obligatoire | le débutant simulé n'appelle jamais une vague en avance et gagne 87 % des niveaux | inchangé |

### Origine des gains sur 60 jours (3 parties par jour, graine 1, contenu des coffres compris)

| Source | Pièces avant | Pièces après | Gemmes avant | Gemmes après | Boosts après |
|---|---|---|---|---|---|
| Niveaux (victoires, défaites, récompenses de monde) | 48783 (37 %) | **78641 (64 %)** | 866 (45 %) | **1181 (58 %)** | 173 |
| Roue | 31083 (23 %) | 9460 (8 %) | 464 (24 %) | 162 (8 %) | 82 |
| Quêtes (du jour et de la semaine) | 21521 (16 %) | 10084 (8 %) | 109 (6 %) | 131 (6 %) | 38 |
| Passe (piste gratuite) | 12672 (10 %) | 7796 (6 %) | 113 (6 %) | 185 (9 %) | 50 |
| Cadeau du jour | 3781 (3 %) | 2564 (2 %) | 65 (3 %) | 66 (3 %) | 49 |
| Succès | 9900 (7 %) | 9300 (8 %) | 188 (10 %) | 180 (9 %) | 0 |
| Coffres d'étoiles | 2812 (2 %) | 3260 (3 %) | 63 (3 %) | 79 (4 %) | 26 |
| Niveau de joueur | 2376 (2 %) | 2521 (2 %) | 47 (2 %) | 43 (2 %) | 22 |
| **Total** | 132928 | 123626 | 1915 | 2027 | |
| Valeur par jour (dont quotidien) | 3067 (1485) | 2961 (740) | | | |

### Valeurs changées (`js/config.js`)

| Élément | Avant | Après |
|---|---|---|
| Pièces d'une victoire (`COINS`) | 60 + 15 par étoile + 4 par vague | 110 + 25 par étoile + 7 par vague |
| 1re victoire d'un niveau / vague jouée en cas de défaite | +80 / 3 | +150 / 5 |
| Exemple : 1re victoire, 10 vagues, 2 étoiles | 230 pièces | 380 pièces |
| Gemmes : 1re victoire / 3 étoiles / 1re victoire héroïque | 3 / 2 / 4 | 5 / 3 / 5 |
| Roue : tour gratuit | toutes les 6 h (4 par jour au mieux) | toutes les 8 h (3 par jour au mieux) |
| Roue : segments pièces / gemmes | 200, 450, 900 / 3, 6, 15 | 70, 150, 300 / 1, 3, 6 |
| Roue : coffre en bois | 16 % | 10 % (jackpot doré inchangé, 2 %) |
| Quêtes du jour | 130 à 220 pièces | 50 à 90 pièces |
| Quête de la semaine | coffre doré + 3 gemmes | coffre doré + 2 gemmes |
| Cadeau du jour (pièces) | 120 et 220 | 70 et 120 |
| Passe gratuit : pièces des paliers / palier final | 180 et 260 / 1500 pièces + 12 gemmes | 60 et 100 / 600 pièces + 10 gemmes (coffres dorés tous les 5 paliers et coffre légendaire gardés) |

Captures 375 et 390 px vérifiées : roue (nouvelles valeurs, « un tour gratuit toutes les 8 heures »), quêtes, cadeau, passe, écran de victoire (+380 pièces pour la 1re victoire du 2-2), talents au maximum. Aucun débordement (`tools/audit.cjs`, 375, 390 et 430 px).

**Points qui restent :**
- **Boosts en stock.** Un joueur économe (1 boost sur un niveau difficile, 2 sur un boss) en a environ 70 de chaque au jour 60 (85 avant). Ils viennent surtout des coffres, achetés avec les pièces en trop une fois le château au maximum (point 5 : rythme du château laissé tel quel). On n'emporte que 3 ou 4 boosts par partie, un de chaque sorte : le stock ne gagne jamais un niveau à lui seul (étape C : boss 61 % sans boost, 90 % avec).
- **Pubs.** 10 pubs par jour donnent environ +70 % de valeur (pièces doublées, tours de roue bonus), mais la progression n'avance que de 2 à 3 jours (campagne jour 28 au lieu de 30, tout au maximum jour 42 au lieu de 45) : le château et les talents dépendent du monde atteint et du niveau de joueur, pas des pièces.
- Les chances de victoire de `progression.cjs` sont un modèle calé sur les simulations, pas sur de vrais joueurs.
