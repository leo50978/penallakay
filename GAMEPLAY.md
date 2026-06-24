# Gameplay

## Objectif

Le joueur doit marquer un maximum de buts sur plusieurs penalties.
Chaque tir oppose une direction choisie par le joueur a une direction choisie par le gardien.

## Directions de tir possibles

Les zones de tir prevues sont :

- gauche
- centre
- droite
- lucarne gauche
- lucarne droite

Ces zones suffisent pour une premiere version simple, lisible et facile a tester.

## Regle de resolution

Le gardien choisit une direction ou une zone de plongeon.

La regle principale est la suivante :

- si le gardien choisit la meme zone que le ballon, il arrete le tir ;
- sinon, c'est un but.

## Score

Le jeu doit suivre le score apres plusieurs tirs.
Au debut, on peut partir sur une serie simple de penalties, par exemple un nombre fixe de tentatives.

## Priorite de la premiere version

Pour la premiere version, le plus important est :

- que le choix de tir fonctionne ;
- que le gardien reagisse ;
- que le resultat soit clair ;
- que le score soit visible.

## Evolution prevue

Plus tard, il faudra prevoir un mode inverse dans lequel le joueur devient gardien.
Cette extension ne doit pas etre implemente au debut, mais la structure du projet doit permettre de l'ajouter sans tout refaire.
