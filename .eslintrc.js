module.exports = {
  env: {
    node: true,
    es2021: true,
    browser: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    // Code style
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    
    // Best practices
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-console': 'off', // Allow console.log for development
    'no-debugger': 'warn',
    
    // Node.js specific
    'no-process-exit': 'warn',
    'no-path-concat': 'error',
    
    // ES6+
    'prefer-const': 'error',
    'no-var': 'error',
    'arrow-spacing': 'error',
    
    // Code quality
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines': ['warn', 500],
    'max-params': ['warn', 5],
    
    // Allow async/await
    'require-await': 'warn',
    
    // Allow template literals
    'prefer-template': 'error',
    
    // Allow object shorthand
    'object-shorthand': 'error',
  },
  globals: {
    // Common globals
    'process': 'readonly',
    'Buffer': 'readonly',
    '__dirname': 'readonly',
    '__filename': 'readonly',
  },
  overrides: [
    {
      // Scripts directory has more relaxed rules
      files: ['scripts/**/*.js'],
      rules: {
        'max-lines': ['warn', 300],
        'no-console': 'off',
      },
    },
    {
      // Server directory may have different requirements
      files: ['server/**/*.js'],
      rules: {
        'max-lines': ['warn', 400],
      },
    },
  ],
}; 