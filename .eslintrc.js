module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "no-unused-vars": "off", // Use TypeScript version instead
    "no-undef": "off", // TypeScript handles this
    "no-case-declarations": "warn",
    "no-empty": "warn",
    "no-dupe-keys": "error",
    "no-process-exit": "warn",
    "require-await": "warn",
    complexity: "warn",
    "max-lines": "warn",
    "max-depth": "warn",
    "no-constant-condition": "warn",
  },
  ignorePatterns: [
    "dist/",
    "node_modules/",
    "*.min.js",
    "_gpt5intake/",
    "_backups/",
    ".cursor-cache/",
    "coverage/",
    "**/node_modules/**",
    "**/_gpt5intake/**",
    "**/_backups/**",
    "**/.cursor-cache/**",
  ],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      rules: {
        "no-undef": "off",
      },
    },
    {
      files: ["*.test.ts", "*.test.js", "**/__tests__/**"],
      env: {
        jest: true,
      },
    },
  ],
};
