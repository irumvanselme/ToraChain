import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["migrations", "dist", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      // Bun/Node service code.
      globals: { ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // `Html` is the JSX factory (Html.createElement); ESLint's scope
      // analysis can't see it used inside JSX, so don't flag it as unused.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^(_|Html)$",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);
