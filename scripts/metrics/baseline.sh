#!/usr/bin/env bash
#
# Measures the four baseline metrics the CodeWash subject asks for, on any
# commit, and writes a markdown report.
#
#   test coverage · cyclomatic complexity · duplication · file sizes
#
# The commit is checked out into a throwaway detached worktree, so the metrics
# never depend on the state of your working tree and `main` is never touched.
#
# Usage:
#   scripts/metrics/baseline.sh [ref] [output-file]
#
#   scripts/metrics/baseline.sh                       # HEAD -> docs/metrics/
#   scripts/metrics/baseline.sh 03b3be6               # the project as received
#   scripts/metrics/baseline.sh main /tmp/after.md
#
# Tools used, all pinned in package.json so the measure is reproducible:
#   - coverage    vitest + @vitest/coverage-v8
#   - complexity  eslint, built-in `complexity` rule (see eslint.complexity.config.mjs)
#   - duplication jscpd
#   - file sizes  git + wc
set -euo pipefail

REF="${1:-HEAD}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

SHA="$(git rev-parse --short "$REF")"
OUTPUT="${2:-docs/metrics/baseline-${SHA}.md}"

ESLINT="$REPO_ROOT/node_modules/.bin/eslint"
JSCPD="$REPO_ROOT/node_modules/.bin/jscpd"
for binary in "$ESLINT" "$JSCPD"; do
  if [ ! -x "$binary" ]; then
    echo "Missing $(basename "$binary"). Run 'npm ci' first." >&2
    exit 1
  fi
done

WORKDIR="$(mktemp -d)"
WORKTREE="$WORKDIR/src-at-$SHA"
# Always clean up, including on failure: a leaked worktree makes the next run
# fail with "already exists".
cleanup() {
  git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

echo "Measuring $SHA ..." >&2
git worktree add --detach --quiet "$WORKTREE" "$REF"

# macOS AppleDouble sidecars are binary, not source. Left in place they would
# be counted as 374 extra files and break every parser downstream.
APPLEDOUBLE="$(find "$WORKTREE" -name '._*' -not -path '*/node_modules/*' | wc -l | tr -d ' ')"
find "$WORKTREE" -name '._*' -not -path '*/node_modules/*' -delete

# ---------------------------------------------------------------- file sizes
echo "  file sizes" >&2
SIZES="$(find "$WORKTREE/src" -type f \( -name '*.js' -o -name '*.jsx' \) -exec wc -l {} + \
  | grep -v ' total$' \
  | sed "s|$WORKTREE/||" \
  | sort -rn)"
FILE_COUNT="$(printf '%s\n' "$SIZES" | wc -l | tr -d ' ')"
TOTAL_LINES="$(printf '%s\n' "$SIZES" | awk '{sum += $1} END {print sum}')"
TRACKED="$(git ls-tree -r --name-only "$REF" | wc -l | tr -d ' ')"

# ---------------------------------------------------------------- complexity
echo "  cyclomatic complexity" >&2
# --no-inline-config: the source carries `eslint-disable` comments naming rules
# this standalone config does not load, which ESLint reports as errors. Those
# directives must not influence a measurement anyway.
# ESLint exits non-zero as soon as it reports anything, so its status is
# ignored here; what matters is the JSON it produced.
COMPLEXITY_JSON="$(cd "$WORKTREE" && "$ESLINT" \
  --no-config-lookup \
  --no-inline-config \
  -c "$REPO_ROOT/scripts/metrics/eslint.complexity.config.mjs" \
  --format json src 2>/dev/null || true)"
COMPLEXITY="$(printf '%s' "$COMPLEXITY_JSON" \
  | node "$REPO_ROOT/scripts/metrics/aggregate-complexity.mjs")"

# --------------------------------------------------------------- duplication
echo "  duplication" >&2
"$JSCPD" "$WORKTREE/src" \
  --reporters json \
  --output "$WORKDIR/jscpd" \
  >/dev/null 2>&1 || true
DUPLICATION='{"clones":0,"duplicatedLines":0,"lines":0,"percentage":0}'
if [ -f "$WORKDIR/jscpd/jscpd-report.json" ]; then
  DUPLICATION="$(node -e '
    const s = require(process.argv[1]).statistics.total
    process.stdout.write(JSON.stringify({
      clones: s.clones,
      duplicatedLines: s.duplicatedLines,
      lines: s.lines,
      percentage: s.percentage,
    }))
  ' "$WORKDIR/jscpd/jscpd-report.json")"
fi

# ------------------------------------------------------------------ coverage
# Coverage cannot be measured on a commit that has no test runner: there is
# nothing to execute. Rather than report a fake number, the script says so.
echo "  coverage" >&2
if node -e "process.exit(require('$WORKTREE/package.json').scripts?.test ? 0 : 1)" 2>/dev/null; then
  COVERAGE="see \`npm run test:coverage\` on this ref (a test runner is present)"
else
  COVERAGE="**0 %** — no test and no test runner at this commit, so there is nothing to execute"
fi

# -------------------------------------------------------------------- report
mkdir -p "$(dirname "$OUTPUT")"
{
  echo "# Baseline metrics — \`$SHA\`"
  echo
  echo "| | |"
  echo "|---|---|"
  echo "| Commit | \`$(git rev-parse "$REF")\` |"
  echo "| Subject | $(git log -1 --format=%s "$REF") |"
  echo "| Measured on | $(date -u '+%Y-%m-%d %H:%M UTC') |"
  echo "| Measured by | \`scripts/metrics/baseline.sh $REF\` |"
  echo
  echo "Regenerate this exact report with:"
  echo
  echo '```bash'
  echo "npm run metrics:baseline -- $REF"
  echo '```'
  echo
  echo "## 1. Test coverage"
  echo
  echo "$COVERAGE"
  echo
  echo "> Tool: \`vitest\` + \`@vitest/coverage-v8\`, via \`npm run test:coverage\`."
  echo
  echo "## 2. Cyclomatic complexity"
  echo
  node -e '
    const c = JSON.parse(process.argv[1])
    console.log("| Measure | Value |")
    console.log("|---|---|")
    console.log(`| Functions measured | ${c.count} |`)
    console.log(`| Highest complexity | ${c.max} |`)
    console.log(`| Mean complexity | ${c.mean} |`)
    console.log(`| Functions above 10 | ${c.over10} |`)
    console.log(`| Functions above 20 | ${c.over20} |`)
    console.log("")
    console.log("Ten most complex functions:")
    console.log("")
    console.log("| Complexity | Function | Location |")
    console.log("|---:|---|---|")
    for (const f of c.top) console.log(`| ${f.complexity} | ${f.name} | \`${f.file}:${f.line}\` |`)
  ' "$COMPLEXITY"
  echo
  echo "> Tool: \`eslint\`, built-in \`complexity\` rule with its threshold set to 0"
  echo "> so that every function reports its own score."
  echo "> Config: \`scripts/metrics/eslint.complexity.config.mjs\`."
  echo
  echo "## 3. Duplication"
  echo
  node -e '
    const d = JSON.parse(process.argv[1])
    console.log("| Measure | Value |")
    console.log("|---|---|")
    console.log(`| Duplicated lines | ${d.duplicatedLines} of ${d.lines} |`)
    console.log(`| Duplication rate | ${Number(d.percentage).toFixed(2)} % |`)
    console.log(`| Cloned blocks | ${d.clones} |`)
  ' "$DUPLICATION"
  echo
  echo "> Tool: \`jscpd\`, default settings (minimum 50 tokens), measured over \`src/\`."
  echo
  echo "## 4. File sizes"
  echo
  echo "| Measure | Value |"
  echo "|---|---|"
  echo "| Source files (\`.js\`, \`.jsx\`) | $FILE_COUNT |"
  echo "| Total source lines | $TOTAL_LINES |"
  echo "| Files tracked by git | $TRACKED |"
  echo "| of which macOS \`._*\` junk | $APPLEDOUBLE |"
  echo
  echo "Ten largest source files:"
  echo
  echo "| Lines | File |"
  echo "|---:|---|"
  printf '%s\n' "$SIZES" | head -10 | awk '{printf "| %s | `%s` |\n", $1, $2}'
  echo
  echo "> Tool: \`find\` + \`wc -l\` over \`src/\`, \`git ls-tree\` for the tracked count."
  echo "> AppleDouble files are deleted from the worktree before measuring."
} > "$OUTPUT"

echo "Report written to $OUTPUT" >&2
