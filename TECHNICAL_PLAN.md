# Plan Technique

## Objectif technique

Le projet doit rester simple, leger et facile a faire evoluer.
La premiere version ne doit pas chercher une architecture complexe.

## Structure technique generale

### HTML

Le HTML servira a construire la presentation du jeu et la scene de tir :

- hero d'introduction
- scene du stade
- ballon draggable
- gardien
- but
- supporters en arriere-plan
- interface de score
- panneaux d'information

### CSS

Le CSS gerera :

- le layout general ;
- le positionnement des images ;
- l'ambiance visuelle du stade ;
- le responsive mobile et desktop ;
- une partie des etats visuels de l'interface.

### JavaScript

Le JavaScript gerera :

- le drag and drop du ballon ;
- la logique des tirs ;
- la reaction du gardien ;
- la resolution but ou arret ;
- la mise a jour du score ;
- l'enchainement des tentatives.

## Librairies retenues

Le projet doit maintenant s'appuyer sur :

- Three.js pour ajouter de la profondeur visuelle et une ambiance plus moderne ;
- GSAP pour les animations principales ;
- ScrollTrigger pour les entrees visuelles et certains effets de progression dans la page.

## Animations

Les animations doivent rester fluides, lisibles et utiles.
GSAP sert a controler les mouvements du ballon, du gardien et les transitions d'interface.
ScrollTrigger sert a mettre en scene l'arrivee du joueur dans l'experience.
Three.js doit rester au service de l'ambiance visuelle, sans transformer le projet en jeu 3D complexe.

## Contraintes voulues

- ne pas utiliser React ;
- ne pas utiliser de backend pour l'instant ;
- garder une structure de fichiers claire ;
- privilegier une logique simple et lisible.

## Vision de depart

La premiere base technique doit permettre :

- de prototyper rapidement ;
- de tester facilement dans le navigateur ;
- d'ajouter plus tard de meilleurs assets et de nouvelles fonctionnalites sans repartir de zero.
