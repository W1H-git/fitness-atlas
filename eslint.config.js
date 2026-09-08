import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'work/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    rules: { 'no-undef': 'off' },
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ['scripts/**/*.mts'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly', Buffer: 'readonly' } },
  },
  prettier,
]
