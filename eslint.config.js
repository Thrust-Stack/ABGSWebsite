import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Design-system modules intentionally co-locate components with
      // tokens/hooks/variants; fast-refresh granularity is an acceptable
      // trade-off there.
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // React-Three-Fiber renders by mutating three.js objects inside
    // useFrame callbacks; the React Compiler mutation/ref lints do not
    // apply to that imperative render loop.
    files: ['src/three/**/*.{js,jsx}'],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
])
