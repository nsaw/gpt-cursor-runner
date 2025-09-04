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
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "prefer-const": "warn",
    "no-var": "warn",
    "no-unused-vars": "off", // Use TypeScript version instead
    "no-undef": "off", // TypeScript handles this
    "no-case-declarations": "off",
    "no-empty": "off",
    "no-dupe-keys": "error",
    "no-process-exit": "off",
    "require-await": "off",
    complexity: "off",
    "max-lines": "off",
    "max-depth": "off",
    "no-constant-condition": "off",
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
    "**/.cursor-cache/**"
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
