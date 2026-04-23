import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next 16 + React 19 ship several new rules that surface valid-but-expensive
// refactors (re-typing dlite event handlers, rewriting useEffect-based data
// loading, adding useCallback around every loader function). We keep them as
// warnings so they show up in the IDE and CI would catch regressions, but
// they don't block commits — otherwise every single admin page would need a
// rewrite before the next commit could land.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // dlite's CustomEvent payloads don't share types with React's
      // SyntheticEvent, so onInput/onChange handlers end up with `any`.
      // The getEventValue helper does the runtime normalization.
      "@typescript-eslint/no-explicit-any": "warn",
      // Load functions declared with `function` are hoisted; this rule treats
      // the hoisting as unsafe. Refactoring to useCallback is cosmetic here.
      "react-hooks/immutability": "warn",
      // We bootstrap client-side data by calling a loader from useEffect.
      // The fully-correct React 19 pattern uses server components or `use()`;
      // until the admin pages migrate, this stays a warning.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
