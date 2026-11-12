# Contributing

## Workflow
- `main` est protégé : aucun push direct, tout passe par une pull request.
- Une branche par intention : `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`.
- Un commit = une intention. Petits pas, réversibles.
- Chaque PR de refactoring référence un item de `docs/DEBT.md` (DEBT-xx).
- Pas de merge sur rouge : tests, lint, format et couverture doivent passer.
- Nouveau code couvert à 100 %, au moins 80 % des lignes modifiées.

## Scout Rule
Laissez le code meilleur qu'on  l'a trouvé, testé, documenté, propre.
