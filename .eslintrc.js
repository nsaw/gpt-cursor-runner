module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'markdown',
  ],
  overrides: [
    {
      files: ['**/*.md'],
      processor: 'markdown/markdown',
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
  ],
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'no-console': 'off', // Allow console.log for debugging
  },
  ignorePatterns: [
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
}; 