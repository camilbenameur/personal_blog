---
title: "Du backlog au MVP : construire un installateur industriel hors ligne en Go"
description: "Comment j'ai conçu et construit, en tant que stagiaire, un installateur pour des PC industriels air-gapped : installation de Docker hors ligne à partir de paquets .deb, avec la 27.5.1 comme version par défaut, et ce que j'ai appris en le faisant."
author: "Camil Benameur"
pubDate: 2026-02-05
updatedDate: 2026-10-14
correction:
  date: 2026-10-14
  text: "14 octobre 2026 : j'ai corrigé la façon dont je décrivais l'installation hors ligne de Docker (quels paquets étaient épinglés, comment les dépendances étaient résolues, ce que faisaient certaines étapes), reformulé d'autres étapes ainsi que le système d'appui pour qu'ils correspondent au fonctionnement réel de l'installateur, atténué des affirmations sur l'architecture et sur le résultat, et supprimé un détail de configuration ainsi qu'une affirmation sur la disponibilité d'autres personnes. Un article ultérieur examine le projet plus en profondeur. 29 septembre 2026 : j'ai retiré des affirmations que je ne pouvais pas étayer : qu'une installation manuelle prenait des heures et qu'elle était ramenée à quelques minutes, que l'installateur passait à l'échelle sur des parcs de machines, que le résultat était reproductible et moins sujet aux erreurs, qu'il tournait en production, et qu'il y avait des fenêtres de déploiement strictes. J'ai aussi retiré des affirmations sur mes coéquipiers et sur le fait de travailler surtout seul, décrit le point de départ comme un besoin plutôt que comme une demande client, atténué certaines affirmations générales sur les PC industriels, et ajouté que j'ai été responsable du projet jusqu'en mars 2026."
tags: ["go", "architecture", "devops", "offline", "installation", "industrial"]
slug: "fr/from-backlog-to-offline-installer"
lang: "fr"
---

## Le moment où tout a commencé

Ce projet a commencé comme une entrée du backlog, avec un besoin clair. Je suis arrivé en stage et j'ai conçu et construit la première version. Le contexte était simple à décrire et difficile à exécuter : installer un logiciel d'automatisation industrielle sur des PC industriels qui n'ont souvent pas d'accès à Internet.

Il n'y avait pas d'installateur. Seulement des exigences. La conception est partie de zéro.

## Les contraintes du terrain

Les PC industriels ne ressemblent pas à des laptops de développement. On ne peut souvent pas tenir pour acquis :

- Un accès à Internet.
- Un écran, un clavier ou une souris en local.
- Des versions flexibles pour les paquets système.

Ce qui existe, en revanche, ce sont des exigences strictes de cybersécurité, un accès limité et un besoin de prévisibilité. L'installateur devait fonctionner hors ligne et se comporter de façon prévisible.

## Les choix d'architecture qui l'ont rendu possible

J'ai choisi dès la phase de conception une architecture hexagonale en Go. Je cherchais à garder le domaine exempt de bibliothèques SSH, SQL et HTTP, et j'y suis en grande partie parvenu. La couche d'infrastructure gérait la réalité désordonnée de SSH, du packaging et de la variabilité des équipements, même si, dans le service d'installation de Docker, certaines commandes shell se sont quand même retrouvées dans le domaine.

Pour l'API, j'ai utilisé `Huma v2` pour son ergonomie JSON et la génération OpenAPI à partir des types Go. Pour la couche desktop, j'ai utilisé `Tauri`, qui sous Windows s'appuie sur le WebView2 du système plutôt que d'embarquer un moteur de navigateur comme le fait Electron.

## Le défi le plus difficile : Docker hors ligne à une version fixe

Le défi technique le plus difficile a été d'installer Docker 27.5.1 sur des équipements Linux air-gapped basés sur apt (le chemin de téléchargement suivait l'organisation des dépôts d'Ubuntu). Les dépôts standard ne figuraient pas dans la liste de sources par défaut, et il nous fallait une version précise.

La solution a pris la forme d'un pipeline de dépendances hors ligne :

1. Lire les métadonnées de l'équipement (distribution, nom de code, version de l'OS).
2. Inspecter les dépendances déclarées de chaque paquet téléversé et demander à `apt-cache policy` lesquelles la cible voit déjà.
3. Construire dynamiquement les bonnes URL de dépôt et de paquets.
4. Télécharger les paquets `.deb` de Docker.
5. Générer les manifestes apt-offline (la liste des fichiers dont la cible a encore besoin).
6. Téléverser les paquets vers la cible.
7. Calculer les signatures de dépendances, dédupliquer et récupérer les dépendances manquantes.
8. Tout installer hors ligne.
9. Supprimer le dépôt Docker et les entrées de keyring pour éviter les mises à jour inattendues, puis, lorsque l'équipement est connecté, rafraîchir les listes de paquets en best effort.

Le point délicat, c'est que les dépendances ne sont connues qu'une fois qu'on a interrogé la cible. Dans le vocabulaire d'apt-offline, une « signature » est un manifeste des fichiers qu'apt téléchargerait sur cet équipement : elle ne liste donc que ce qui y manque encore. Le processus était itératif : lire les dépendances de chaque paquet Docker, les parcourir avec une file d'attente qui s'allonge à mesure que de nouvelles dépendances apparaissent, dédupliquer, puis récupérer chaque paquet manquant une seule fois sur la machine de l'opérateur. Le but était de rendre le bundle hors ligne complet. En pratique, seuls `docker-ce` et `docker-ce-cli` étaient épinglés, et les dépendances non résolues remontaient comme des avertissements plutôt que comme des erreurs.

C'était fastidieux et très technique. Le résultat : un flux d'installation hors ligne où `docker-ce` et `docker-ce-cli` utilisent par défaut la version 27.5.1.

## Le système d'appui

Au-delà de Docker, l'installateur s'appuyait aussi sur :

- Du provisionnement SSH avec génération de clés.
- Des workflows de signatures APT-offline pour les dépendances système.
- Un worker Go en arrière-plan qui vérifie périodiquement, pour chaque équipement enregistré, si le port SSH est joignable, si SSH fonctionne, s'il a accès à Internet et si apt est occupé.

Le front-end affichait l'état du back-end en temps réel, si bien que la personne qui lançait une installation pouvait en suivre l'avancement au lieu de deviner.

## Le résultat

Avant cela, il n'y avait pas d'installateur, seulement des exigences. L'installateur exécutait les étapes côté cible via SSH et SFTP, la machine de l'opérateur téléchargeant les paquets. Il affichait en direct la progression étape par étape, il réessayait en cas de conflit de verrou `apt` avec un backoff borné et utilisait des solutions de repli lors de l'installation des paquets. Après le stage, je suis resté sur le projet en tant qu'ingénieur logiciel et j'en ai été responsable jusqu'en mars 2026.

## Un tournant personnel

C'était mon premier projet Go sérieux et la première fois que j'appliquais la clean architecture sur un produit industriel. J'ai appris vite pendant l'été. J'ai suivi la spécialisation Software Design and Architecture de l'Université de l'Alberta sur Coursera pour structurer mon apprentissage, et j'ai travaillé l'UML et la conception de systèmes. Cela m'a aidé à structurer mon travail de conception avec UML et des spécifications écrites.

À un moment, j'ai eu le déclic sur l'architecture, et j'ai senti que je pouvais naviguer dans la base de code avec assurance. C'est à ce moment-là que je me suis senti légitime.

## Ce que j'en retiens

S'il y a une leçon à retenir, c'est celle-ci : sur ce projet, j'ai visé la fiabilité et la répétabilité plutôt que les astuces ingénieuses, et j'ai appris qu'un objectif ne compte que lorsque des vérifications peuvent faire échouer un build. L'architecture et l'automatisation comptent, mais seulement là où quelque chose peut réellement échouer.

## Modifications de cet article (14 octobre 2026)

La note en haut de la page donne la correction principale. Voici les autres changements principaux :

- l'épinglage de la version de Docker : seuls `docker-ce` et `docker-ce-cli` étaient épinglés, et seulement par défaut
- la description du pipeline hors ligne (parcours des dépendances, manifestes, étapes finales) et du worker du système d'appui, réécrite pour correspondre au fonctionnement réel de l'installateur
- l'affirmation sur les différentes distributions Linux : le chemin de téléchargement suivait l'organisation des dépôts d'Ubuntu
- la description de l'architecture, la phrase « le système s'est stabilisé » et celle sur le développement piloté par les spécifications, reformulées comme ce que je visais et ressentais plutôt que comme ce qui avait été atteint
- une affirmation sur la disponibilité d'autres personnes, l'affirmation sur la documentation de l'API et un détail de configuration

Pour un regard plus approfondi sur le même projet, y compris sur ce que j'ai surdimensionné, voir [Comment fonctionne un installateur hors ligne, et ce que j'ai surdimensionné en chemin](/fr/blog/offline-installer-retrospective/).
