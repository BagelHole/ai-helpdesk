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
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  rules: {
    // TypeScript rules
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",

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

    // Code style - disabled problematic rules for now
    // indent: ["error", 2, { SwitchCase: 1 }],
    // quotes: ["error", "single", { avoidEscape: true }],
    // semi: ["error", "always"],
  },
  ignorePatterns: ["dist/", "release/", "node_modules/", "*.d.ts"],
};
