import js from '@eslint/js';
import markdown from 'eslint-plugin-markdown';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    rules: {
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'no-console': 'off', // Allow console.log for debugging
      'no-undef': 'off', // Disable no-undef since we're defining globals
    },
  },
  {
    files: ['**/*.md'],
    plugins: {
      markdown,
    },
    processor: markdown.processors.markdown,
  },
  {
    files: ['**/*.md/*.js'],
    rules: {
      // Disable rules that don't work well in markdown code blocks
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '*.min.js',
      'logs/',
      'patches/',
      'quarantine/',
      'summaries/',
      'venv/',
      '.git/',
    ],
  },
]; 