# Baseline metrics — `03b3be6`

| | |
|---|---|
| Commit | `03b3be659d7c84d8c1100df57b919112e85f08c0` |
| Subject | chore: initial import of the project as received |
| Measured on | 2026-11-24 15:22 UTC |
| Measured by | `scripts/metrics/baseline.sh 03b3be6` |

Regenerate this exact report with:

```bash
npm run metrics:baseline -- 03b3be6
```

## 1. Test coverage

**0 %** — no test and no test runner at this commit, so there is nothing to execute

> Tool: `vitest` + `@vitest/coverage-v8`, via `npm run test:coverage`.

## 2. Cyclomatic complexity

| Measure | Value |
|---|---|
| Functions measured | 396 |
| Highest complexity | 107 |
| Mean complexity | 2.81 |
| Functions above 10 | 14 |
| Functions above 20 | 5 |

Ten most complex functions:

| Complexity | Function | Location |
|---:|---|---|
| 107 | Arrow function | `src/components/skills/SkillCard.jsx:65` |
| 31 | Arrow function | `src/App.jsx:94` |
| 27 | Arrow function | `src/components/drawers/MenuDrawer.jsx:142` |
| 24 | Arrow function | `src/App.jsx:569` |
| 21 | Arrow function | `src/components/drawers/CosmeticsDrawer.jsx:108` |
| 17 | Arrow function | `src/App.jsx:444` |
| 16 | Arrow function | `src/App.jsx:49` |
| 16 | Arrow function | `src/App.jsx:1387` |
| 15 | Arrow function | `src/components/drawers/CosmeticsDrawer.jsx:227` |
| 15 | Arrow function | `src/utils/gameUtils.js:33` |

> Tool: `eslint`, built-in `complexity` rule with its threshold set to 0
> so that every function reports its own score.
> Config: `scripts/metrics/eslint.complexity.config.mjs`.

## 3. Duplication

| Measure | Value |
|---|---|
| Duplicated lines | 144 of 5686 |
| Duplication rate | 2.53 % |
| Cloned blocks | 6 |

> Tool: `jscpd`, default settings (minimum 50 tokens), measured over `src/`.

## 4. File sizes

| Measure | Value |
|---|---|
| Source files (`.js`, `.jsx`) | 24 |
| Total source lines | 6938 |
| Files tracked by git | 660 |
| of which macOS `._*` junk | 374 |

Ten largest source files:

| Lines | File |
|---:|---|
| 1492 | `src/App.jsx` |
| 1302 | `src/components/ui/GlobalStyles.jsx` |
| 778 | `src/components/skills/SkillCard.jsx` |
| 416 | `src/constants/gameData.jsx` |
| 363 | `src/utils/gameUtils.js` |
| 322 | `src/components/drawers/CosmeticsDrawer.jsx` |
| 318 | `src/constants/achievements.js` |
| 287 | `src/utils/soundManager.js` |
| 262 | `src/components/drawers/MenuDrawer.jsx` |
| 231 | `src/components/drawers/MenuDrawer_old.jsx` |

> Tool: `find` + `wc -l` over `src/`, `git ls-tree` for the tracked count.
> AppleDouble files are deleted from the worktree before measuring.
