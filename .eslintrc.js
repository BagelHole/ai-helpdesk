module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  rules: {
    // TypeScript rules
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/prefer-const": "error",

    // React rules
    "react/react-in-jsx-scope": "off", // Not needed with React 17+
    "react/prop-types": "off", // Using TypeScript for prop validation
    "react/display-name": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // General rules
    "no-console": "warn",
    "no-debugger": "error",
    "no-unused-vars": "off", // Using TypeScript version instead
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-template": "error",

    // Code style
    indent: ["error", 2, { SwitchCase: 1 }],
    quotes: ["error", "single", { avoidEscape: true }],
    semi: ["error", "always"],
    "comma-dangle": ["error", "always-multiline"],
    "object-curly-spacing": ["error", "always"],
    "array-bracket-spacing": ["error", "never"],
    "key-spacing": ["error", { beforeColon: false, afterColon: true }],
    "space-before-blocks": "error",
    "keyword-spacing": "error",
  },
  ignorePatterns: ["dist/", "release/", "node_modules/", "*.d.ts"],
};
