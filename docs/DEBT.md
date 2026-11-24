# Registre de dette technique

> Document vivant. Chaque PR de refactoring référence un item (DEBT-xx).
> Statuts : Open / In progress / Done / Accepted.
> **Version 1 (incomplète).**  La carte du code, la matrice de risques et le plan d'attaque seront ajoutés dans les PR suivantes.

## Métriques baseline

Mesurées sur `03b3be6`, le projet tel que reçu, **avant tout refactoring**.
Rapport complet : [`docs/metrics/baseline-03b3be6.md`](metrics/baseline-03b3be6.md).

| Métrique | `03b3be6` (tel que reçu) | Aujourd'hui | Outil |
|---|---|---|---|
| Couverture de tests | 0 % — aucun test, aucun runner | 5,22 % des lignes | `vitest` + `@vitest/coverage-v8` |
| Complexité cyclomatique | max **107**, moyenne 2,81, 14 fonctions > 10, 5 > 20 | inchangée | `eslint`, règle `complexity` |
| Duplication | 2,53 % (144 lignes sur 5686, 6 blocs clonés) | inchangée | `jscpd` |
| Taille des fichiers | 24 fichiers source, 6938 lignes ; 660 fichiers suivis dont 374 `._*` | 298 fichiers suivis, 0 `._*` | `find` + `wc`, `git ls-tree` |

La complexité et la duplication sont identiques parce qu'**aucune ligne de `src/` n'a encore été modifiée** : seuls l'outillage et l'hygiène du dépôt ont bougé. C'est le point de départ, pas un échec.

### Comment rejouer ces mesures

```bash
npm run metrics:baseline -- 03b3be6   # le projet tel que reçu
npm run metrics:baseline              # l'état courant
```

Le script (`scripts/metrics/baseline.sh`) extrait le commit demandé dans un worktree détaché jetable, y supprime les fichiers `._*` — binaires, ils fausseraient tout compte — puis écrit un rapport daté dans `docs/metrics/baseline-<sha>.md`. Le dépôt de travail n'est jamais touché.

À rejouer après chaque refactoring majeur : les écarts avant/après sont la preuve attendue à la soutenance.

### Ce que ces chiffres révèlent

- **Une fonction à complexité 107** dans `src/components/skills/SkillCard.jsx:65`. Les quatre suivantes sont entre 21 et 31. À transformer en items de dette dédiés.
- **La duplication n'est pas le problème** de ce projet : 2,53 %, c'est faible. Le poids est dans la complexité et la taille des fichiers, pas dans le copier-coller.
- **Trois fichiers portent la moitié du code** : `App.jsx` (1492), `GlobalStyles.jsx` (1302), `SkillCard.jsx` (778) sur 6938 lignes au total.

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