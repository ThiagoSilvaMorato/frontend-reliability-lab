import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'public/mockServiceWorker.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...pluginQuery.configs['flat/recommended'],
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: { globals: globals.node },
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
)
