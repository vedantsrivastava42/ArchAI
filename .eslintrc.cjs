module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ["eslint:recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
    },
  ],
  ignorePatterns: ["node_modules", "dist", ".next"],
};
