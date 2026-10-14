// schematize-node -- ESLint flat config (ESLint 9+; testado em 10) para TS/JS em Node legado.
// Copie para a raiz como `eslint.config.mjs` e ESTENDA (nao reinvente). Pre-requisito:
//   npm i -D eslint typescript-eslint @eslint/js
// Observacao: typescript-eslint exige TypeScript < 6.1 hoje (TS 7 nao expoe a API programatica; ver
// references/stack-versoes.md). Escopo-diff: o gate cobra o que voce toca; o legado entra em baseline
// (eslint --suppress-all / bulk suppressions) que so decresce.
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

const MAIL_PATHS = [
  { name: "nodemailer", message: "e-mail so via src/mail/ (GuardedMailer): references/iam.md §3.1" },
  { name: "resend", message: "e-mail so via src/mail/ (GuardedMailer): references/iam.md §3.1" },
];

export default defineConfig([
  { ignores: ["dist/**", "build/**", "coverage/**", "node_modules/**", "**/*.d.ts", "**/generated/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // §37: nada de any / ts-ignore calando o compilador. @ts-expect-error so COM justificativa
      // (expira sozinho quando o erro some; documenta a divida). Ver references/typescript-estilo.md.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-ignore": true, "ts-nocheck": true,
        "ts-expect-error": "allow-with-description", minimumDescriptionLength: 10,
      }],
      // Toda Promise e aguardada ou tratada; nada de .catch(() => {}) engolindo erro.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "no-empty": ["error", { allowEmptyCatch: false }],   // `catch {}` = erro engolido
      "@typescript-eslint/only-throw-error": "error",

      // Riscos Node-especificos (references/riscos-node.md).
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-restricted-properties": ["warn",
        { object: "Math", property: "random", message: "Token/id/sessao por CSPRNG (node:crypto randomUUID/randomBytes); Math.random so p/ jitter nao-sensivel." }],
      "no-restricted-syntax": ["error",
        { selector: "CallExpression[callee.property.name='catch'][arguments.0.body.body.length=0]", message: ".catch(() => {}) engole o erro (§37): trate, logue com trace_id ou propague." }],
    },
  },

  // `no-restricted-imports` e UMA regra: config posterior SUBSTITUI a anterior, nao soma. Por isso
  // cada bloco abaixo repete MAIL_PATHS junto dos seus patterns de camada.

  // Efeito externo nunca sai de nao-prd: SDK de e-mail so em src/mail/ (fecha o bypass "chamei o SDK direto").
  {
    files: ["**/*.{ts,js,mjs,cjs}"],
    ignores: ["src/mail/**"],
    rules: { "no-restricted-imports": ["error", { paths: MAIL_PATHS }] },
  },

  // Fronteira de camadas (§4), sem plugin extra: domain puro; application nao importa interface.
  // Ajuste os globs a estrutura do repo (src/domain, src/application, ...).
  {
    files: ["src/domain/**"],
    rules: { "no-restricted-imports": ["error", { paths: MAIL_PATHS, patterns: [
      { group: ["**/infrastructure/**", "**/application/**", "**/interface/**"], message: "domain nao importa infrastructure/application/interface (§4)" },
    ] }] },
  },
  {
    files: ["src/application/**"],
    rules: { "no-restricted-imports": ["error", { paths: MAIL_PATHS, patterns: [
      { group: ["**/interface/**"], message: "application nao importa interface (§4)" },
    ] }] },
  },

  // Arquivos JS/config nao tem tipo: sem regras type-checked.
  { files: ["**/*.{js,mjs,cjs}"], ...tseslint.configs.disableTypeChecked },

  // Teste pode ser mais frouxo (mas nunca silenciar assert).
  { files: ["**/*.{test,spec}.{ts,js}", "test/**", "tests/**"], rules: { "@typescript-eslint/no-explicit-any": "warn" } },
]);
