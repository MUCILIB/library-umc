import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // 1. Global ignores
  {
    ignores: [
      "dist/",
      "node_modules/",
      "drizzle/",
      "drizzle.config.ts",
      "**/*.js",
      "**/*.mjs",
      "src/db/seed*.ts",
    ],
  },

  // 2. Base ESLint recommended rules
  eslint.configs.recommended,

  // 3. TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // 4. Custom project configuration
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      // ─── TypeScript Rules ────────────────────────────────
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // ─── General Rules ───────────────────────────────────
      "@typescript-eslint/ban-ts-comment": "warn",
      "preserve-caught-error": "off",
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
      "no-duplicate-imports": "warn",
      "no-useless-assignment": "warn",
      "no-unused-expressions": "warn",
      "prefer-const": "warn",
      eqeqeq: ["warn", "always"],
      curly: ["warn", "multi-line"],
    },
  },
);
