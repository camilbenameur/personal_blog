---
title: "MCP n'est pas mort : ce que le Code Mode change, et ce qu'il déplace"
description: "Au lieu d'appeler les outils MCP un par un, le modèle écrit un petit programme qui les appelle dans un bac à sable. Les chiffres de Cloudflare et d'Anthropic, et les deux problèmes que ce montage déplace : le bac à sable et la validation humaine."
author: "Camil Benameur"
pubDate: 2026-11-21
tags: ["llm", "agents", "mcp", "sandbox", "security"]
slug: "fr/mcp-code-mode"
lang: "fr"
draft: false
---

Une vidéo qui circule cette semaine annonce « RIP MCP ». Le protocole va bien. Ce qui change, c'est la façon dont le modèle s'en sert. Voici l'idée, les chiffres publiés, et ce que j'en retiens en tant que personne qui construit des bacs à sable pour agents.

## Le problème : un aller-retour par outil

Avec MCP, un agent découvre des outils et les appelle. On demande « trouve le client Rahul et liste ses commandes ». Le modèle appelle `find_customer`, le résultat revient dans son contexte, il le lit, puis il appelle `list_orders` avec l'identifiant, et le résultat revient encore dans le contexte.

Deux coûts s'additionnent :

- **Chaque étape est un tour de modèle.** Une tâche de vingt appels, c'est vingt inférences, et tous les résultats intermédiaires traversent le contexte, même ceux dont le modèle n'a besoin que pour en extraire un identifiant.
- **La liste des outils occupe le contexte avant même de commencer.** Chaque outil arrive avec son nom, sa description et son schéma. Avec quelques outils, c'est négligeable. Avec des milliers, la liste ne tient plus.

## L'idée : le modèle écrit le programme

Cloudflare a appelé ça [Code Mode](https://blog.cloudflare.com/code-mode/) en septembre 2025. Les outils MCP sont présentés au modèle comme une API TypeScript. Au lieu d'appeler les outils un par un, le modèle écrit un petit programme qui les enchaîne :

```ts
const client = await crm.findCustomer({ name: "Rahul" });
const orders = await crm.listOrders({ customerId: client.id });
return orders.filter(o => o.status === "open").map(o => o.id);
```

Le programme tourne dans un bac à sable. Les résultats intermédiaires restent dans le programme. Seul ce qu'il renvoie revient au modèle.

L'hypothèse de Cloudflare pour expliquer pourquoi ça marche : les modèles ont vu énormément de vrai code pendant leur entraînement, et seulement quelques exemples artificiels d'appels d'outils. Écrire une boucle et un filtre leur est plus naturel qu'enchaîner vingt appels structurés.

## Les chiffres publiés

- **Cloudflare, février 2026.** Le [serveur MCP de l'API Cloudflare](https://blog.cloudflare.com/code-mode-mcp/) couvre plus de 2 500 endpoints avec deux outils seulement, `search()` et `execute()`, soit environ 1 000 tokens. Le modèle écrit du JavaScript pour chercher dans la spécification OpenAPI, puis pour appeler l'API. D'après Cloudflare, un serveur équivalent qui exposerait chaque endpoint comme un outil consommerait 1,17 million de tokens.
- **Anthropic, novembre 2025.** Dans [« Code execution with MCP »](https://www.anthropic.com/engineering/code-execution-with-mcp), un exemple de workflow passe de 150 000 à 2 000 tokens. Quelques semaines plus tard, Anthropic a ajouté à son API le [Programmatic Tool Calling](https://www.anthropic.com/engineering/advanced-tool-use) : Claude écrit un script Python qui appelle vos outils depuis un environnement d'exécution isolé. Sur des tâches de recherche complexes, l'usage moyen baisse de 43 588 à 27 297 tokens (−37 %).
- **goose (Block), décembre 2025.** La version 1.17.0 ajoute une extension [Code Mode](https://goose-docs.ai/blog/2025/12/15/code-mode-mcp) qui présente les extensions MCP activées comme des modules JavaScript.

Il faut lire ces chiffres pour ce qu'ils sont. Le 1,17 million compare à un serveur qui exposerait 2 500 outils d'un coup, ce que personne ne ferait. Le 150 000 → 2 000 porte sur un workflow choisi. Le −37 %, mesuré sur un ensemble de tâches, est plus représentatif. Pour un agent qui a cinq outils et fait trois appels, le gain est faible.

## Ce qui ne change pas : MCP

L'équipe de goose a écrit un billet au titre clair : [Code Mode ne remplace pas MCP](https://goose-docs.ai/blog/2025/12/21/code-mode-doesnt-replace-mcp). Les outils que le programme appelle sont toujours des outils MCP. La découverte, l'authentification et le transport passent toujours par le protocole. Ce qui change, c'est qui orchestre les appels : le modèle, tour par tour, ou un programme qu'il a écrit.

## Ce que le Code Mode déplace

Le gain en tokens a une contrepartie. Anthropic l'écrit dans le même article : exécuter du code généré par un agent demande un environnement sécurisé, avec isolation, limites de ressources et surveillance, ce que les appels directs d'outils évitent. Deux problèmes changent de place.

**Le bac à sable devient le composant critique.** Le programme est écrit par un modèle qui a peut-être lu une page piégée juste avant. Il faut donc partir du principe qu'il peut être hostile. Cloudflare exécute le code dans un isolat V8 sans système de fichiers, sans variables d'environnement à faire fuiter, et sans accès réseau sortant par défaut ; les requêtes sortantes passent par un gestionnaire qu'on contrôle. C'est le bon réflexe : le programme ne voit ni secret ni réseau, et chaque appel sort par un point où l'on peut appliquer une règle. C'est aussi le principe de [sandmeter](https://github.com/camilbenameur/sandmeter), le bac à sable pour agents que je construis à partir des primitives Linux et de gVisor.

**La validation humaine perd sa granularité.** Avec un outil par action, on peut décider que `delete_zone` ou `send_message` demande une confirmation, et le reste non. Avec un seul `execute()`, un appel peut enchaîner dix actions, dont une irréversible au milieu d'une boucle. Si l'on valide l'appel entier, on valide un programme qu'on ne relit pas. Dans [le lock qui retient les envois Telegram de mon IA](/fr/blog/ai-telegram-lock/), toute la sécurité tenait au fait que chaque envoi passait par un point de contrôle en code. Avec le Code Mode, ce point de contrôle doit se trouver dans le pont entre le bac à sable et les outils : chaque appel sortant du programme est vérifié contre une règle fixe, et les actions irréversibles restent bloquées jusqu'à une confirmation.

## Ce que j'en retiens

- Le Code Mode vaut le coup quand il y a beaucoup d'outils, ou beaucoup d'appels enchaînés dont les résultats intermédiaires ne servent pas au modèle. Pour un petit agent, le schéma classique reste plus simple à lire et à déboguer.
- Il ne supprime pas MCP. Il ajoute un environnement d'exécution entre le modèle et les outils.
- Le contrôle doit se faire là où le programme touche le monde extérieur : à chaque appel sortant, pas à l'entrée d'`execute()`.

## Sources

- Cloudflare, [Code Mode: the better way to use MCP](https://blog.cloudflare.com/code-mode/), 26 septembre 2025
- Cloudflare, [Code Mode: give agents an entire API in 1,000 tokens](https://blog.cloudflare.com/code-mode-mcp/), 20 février 2026
- Anthropic, [Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp), 4 novembre 2025
- Anthropic, [Introducing advanced tool use on the Claude Developer Platform](https://www.anthropic.com/engineering/advanced-tool-use), 24 novembre 2025
- goose, [Code Mode MCP in goose](https://goose-docs.ai/blog/2025/12/15/code-mode-mcp), 15 décembre 2025, et [Code Mode Doesn't Replace MCP](https://goose-docs.ai/blog/2025/12/21/code-mode-doesnt-replace-mcp), 21 décembre 2025
