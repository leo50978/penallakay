# Jeu de Penalty 2D

## Vue d'ensemble

Ce projet a pour objectif de creer un jeu de penalty 2D en HTML, CSS et JavaScript.
Le principe de base est simple : le joueur choisit une zone de tir, le ballon part vers cette zone, et le gardien tente d'arreter le tir en plongeant dans une direction.

Le projet commence volontairement avec une base simple, lisible et facile a faire evoluer. L'idee est de construire d'abord une version jouable avec des placeholders, puis d'ameliorer progressivement les animations, les assets et le ressenti global.

## Lancer le jeu

Le lancement actuel est simple :

1. Ouvrir le dossier du projet.
2. Ouvrir le fichier `index.html` dans un navigateur.

Important :

- cette version charge Three.js, GSAP et ScrollTrigger via CDN ;
- une connexion internet est donc utile pour voir toutes les animations ;
- si besoin plus tard, on pourra localiser ces dependances dans le projet.

## Etat actuel du projet

Etat actuel :

- La documentation d'organisation du projet est en place.
- Une premiere interface jouable existe avec ballon draggable, score, but et supporters en image.
- Le gardien utilise encore un placeholder stylise en attendant un vrai asset dedie.
- Le projet commence a integrer Three.js, GSAP et ScrollTrigger pour l'ambiance et les animations.

## Fichiers importants

- `README.md` : point d'entree principal pour comprendre le projet.
- `PROJECT_CONTEXT.md` : vision generale du jeu.
- `GAMEPLAY.md` : regles de gameplay.
- `ASSETS.md` : liste et role des assets.
- `TECHNICAL_PLAN.md` : orientation technique du projet.
- `TASKS.md` : etapes concretes a suivre.
- `AI_WORKFLOW.md` : ordre de lecture recommande avant toute modification importante.
