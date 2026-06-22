import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Data-loading effects intentionally reset `loading`/`error` state
      // synchronously before kicking off a fetch (so the spinner shows on
      // refetch); the remaining updates happen in async callbacks. This is the
      // canonical "synchronize with an external system" use of an effect, and
      // the v7 recommended rule is too strict for it.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
