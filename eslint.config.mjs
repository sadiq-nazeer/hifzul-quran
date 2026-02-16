import { defineConfig, globalIgnores } from "eslint/config";
import stylisticJs from "@stylistic/eslint-plugin";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@stylistic": stylisticJs,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "import/order": [
        "error",
        {
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "never",
          groups: [["builtin", "external"], ["internal"], ["parent", "sibling", "index", "object"]],
        },
      ],
      "@stylistic/jsx-quotes": ["error", "prefer-double"],
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
