# 0001 : CI exécutée sur un miroir

- **Statut** : Accepté
- **Date** : 2026-11-xx

## Contexte
La facturation GitHub Actions de l'org est bloquée pour toute la durée du projet.
Les profs ont demandé un miroir pour exécuter la CI.

## Décision
Miroir `tara-nour/codewash-mirror` + remote `all` pour pousser aux deux repos.

## Alternatives écartées
- Runner auto-hébergé : plus de maintenance.
- `npm run ci` local seul : pas de preuve partagée.

## Conséquences
- Le check requis ne peut pas être imposé sur l'org (voir DEBT-01).
- Mitigation : lien du run CI dans le template de PR.