# Registre de dette technique

> Document vivant. Chaque PR de refactoring référence un item (DEBT-xx).
> Statuts : Open / In progress / Done / Accepted.
> **Version 1 (incomplète).**  Les métriques de base, la matrice de risques et le plan d'attaque seront ajoutés dans les PR suivantes.

## Carte du code

La cartographie exigée par le sujet — modules, graphe de dépendances, où vit l'état, où se
font les I/O — vit dans son propre document : **[`docs/CODEBASE-MAP.md`](CODEBASE-MAP.md)**.

Ce qu'elle établit, et qui oriente le reste du registre :

- `App.jsx` est le point de passage obligé : 1492 lignes, 31 états, 16 imports internes, 27 accès au stockage
- Les règles du jeu ne sont pas isolables en l'état : 23 `Math.random` dans `gameUtils`, une horloge dans `achievementUtils`
- Le stockage n'a aucune abstraction : 9 clés `localStorage`, 2 schémas de nommage, une clé héritée migrée à la volée
- Deux fichiers morts entretiennent la confusion sur ce qui fait autorité
- Aucune dépendance circulaire, et la couche `constants/` est purement déclarative : la base est saine

## Registre

| ID | Localisation | Smell / problème | Impact | Risque | Effort | Priorité | Statut |
|---|---|---|---|---|---|---|---|
| DEBT-01 | `.github/workflows/`, réglages du repo org | Gate de CI non applicable sur l'org | Moyen | Moyen | S | P2 | Accepted |

## Détails

### DEBT-01 : Quality gate contourné (CI bloquée sur l'org)

- **Contexte** : la facturation GitHub Actions de l'org `EpitechBachelorPromo2028` est bloquée pour toute la durée du projet. Les profs ont demandé un miroir (`tara-nour/codewash-mirror`) pour exécuter la CI.
- **Ce qui est contourné** : le check requis `Lint, test and build` ne peut pas être exigé sur l'org (il n'y tourne jamais, il bloquerait tous les merges). Rien n'empêche techniquement de merger une PR avec une CI rouge.
- **Mitigation** :
  - Ruleset sur le miroir : check `Lint, test and build` requis, force-push et suppression bloqués, admin en bypass.
  - Ruleset sur l'org : PR obligatoire + 1 review, sans check requis.
  - Case obligatoire dans le template de PR : lien du run CI vert sur le miroir, vérifié par le reviewer avant approbation.
- **Décision** : ADR `docs/adr/0001-ci-mirror.md`.
- **Condition de sortie** : facturation de l'org réglée, alors on supprime le miroir et on exige le check sur l'org.
- **Statut** : Accepted (dette assumée, tracée conformément au sujet : « if you ever have to bypass a gate, that is debt »).

| ID | Localisation | Smell / problème | Impact | Risque | Effort | Priorité | Statut |
|---|---|---|---|---|---|---|---|
| DEBT-02 | `.github/workflows/build-exe.yml` | Release créée à chaque push sur `main` (tags `v2`, `v3` parasites) | Moyen | Moyen | S | P2 | Open |
| DEBT-03 | `package.json` / CI | Node 20 en fin de vie (CI), écart avec Node 22 en local | Moyen | Moyen | S | P2 | Open |
| DEBT-04 | `package-lock.json` | 31 vulnérabilités npm (1 low, 9 moderate, 20 high, 1 critical), voir `docs/metrics/` | Élevé | Élevé | M | P1 | Open |
| DEBT-05 | dépendances | Paquets dépréciés : `inflight`, `rimraf@2`, `glob@7` et `@10`, `boolean` | Faible | Faible | S | P3 | Open |
| DEBT-06 | `.gitignore` initial | Ignorait `package-lock.json` (corrigé par `fix(gitignore)`) | Moyen | Faible | S | P3 | Done |
| DEBT-07 | racine du repo | 374 fichiers macOS AppleDouble suivis (retirés par `chore: untrack...`) | Faible | Faible | S | P3 | Done |
| DEBT-08 | workflow Git | Commits poussés directement sur `main` du miroir, org désynchronisée | Moyen | Moyen | S | P2 | Done |