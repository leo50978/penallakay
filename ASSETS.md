# Assets

## Objectif

Les assets representent une partie tres importante de la qualite percue du jeu.
Meme avec une logique simple, un bon resultat visuel dependra beaucoup des images, sprites et animations utilises.

## Assets necessaires

Voici la liste des elements a prevoir :

- joueur en animation de tir
- gardien idle
- gardien plonge gauche
- gardien plonge droite
- ballon
- terrain
- but
- filet
- interface de score

## Role de chaque asset

### Joueur en animation de tir

Le joueur doit pouvoir montrer clairement la preparation puis l'action de tir.
Au debut, un placeholder peut suffire, mais une vraie animation apportera beaucoup au ressenti.

### Gardien idle

Le gardien a besoin d'un etat de base, immobile, avant la decision de plongeon.
Cet asset aide a rendre la scene lisible meme sans animation complexe.

### Gardien plonge gauche

Un visuel ou une animation de plongeon vers la gauche est necessaire pour montrer une tentative d'arret.

### Gardien plonge droite

Un visuel ou une animation de plongeon vers la droite est necessaire pour completer les reactions du gardien.

### Ballon

Le ballon est l'element central du tir.
Il doit etre visible, bien detache du decor et facile a animer.

### Terrain

Le terrain pose le cadre du match.
Au debut, un decor simple suffira, mais il devra rester propre et coherent visuellement.

### But

Le but donne la cible principale du jeu.
Sa position et sa taille doivent etre claires pour bien lire les zones de tir.

### Filet

Le filet renforce l'identite visuelle du but et peut aider plus tard a ajouter un feedback de but.

### UI score

L'interface de score doit rester lisible et discrete.
Elle doit permettre de comprendre rapidement le nombre de buts, d'arrets ou de tirs restants selon la version choisie.

## Remarque importante

La qualite visuelle finale dependra beaucoup de la qualite des assets et des animations.
Une logique correcte ne suffira pas seule a rendre le jeu satisfaisant : les visuels et le timing d'animation auront un impact majeur.
