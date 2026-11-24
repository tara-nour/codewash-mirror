// Standalone ESLint config used only to measure cyclomatic complexity.
// Kept apart from eslint.config.js so the measurement can run against any
// commit, including ones whose own config differs.
import globals from 'globals'

export default [
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser,
    },
    // Threshold 0 makes every function report its own complexity.
    rules: { complexity: ['warn', 0] },
  },
]
