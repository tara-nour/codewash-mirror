// Reads ESLint JSON on stdin (produced with the `complexity` rule set to 0,
// which makes every function report its own score) and prints a JSON summary.
//
// Used by scripts/metrics/baseline.sh. Not meant to be run by hand.

let raw = ''
process.stdin.on('data', (chunk) => {
  raw += chunk
})

process.stdin.on('end', () => {
  const files = JSON.parse(raw || '[]')
  const functions = []

  for (const file of files) {
    for (const message of file.messages) {
      if (message.ruleId !== 'complexity') continue
      const score = /complexity of (\d+)/.exec(message.message)
      if (!score) continue
      functions.push({
        file: file.filePath.replace(/^.*?\/src\//, 'src/'),
        line: message.line,
        // "Arrow function 'foo' has a complexity of 12." -> "Arrow function 'foo'"
        name: message.message.split(' has a complexity')[0],
        complexity: Number(score[1]),
      })
    }
  }

  functions.sort((a, b) => b.complexity - a.complexity)

  const total = functions.reduce((sum, f) => sum + f.complexity, 0)

  process.stdout.write(
    JSON.stringify(
      {
        count: functions.length,
        max: functions.length ? functions[0].complexity : 0,
        mean: functions.length ? Number((total / functions.length).toFixed(2)) : 0,
        over10: functions.filter((f) => f.complexity > 10).length,
        over20: functions.filter((f) => f.complexity > 20).length,
        top: functions.slice(0, 10),
      },
      null,
      2,
    ),
  )
})
