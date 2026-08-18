# TypeScript estrito (incremental) e estilo

> Parte da skill **schematize-node**. TS é o alvo; legado migra por catraca, não por decreto. Tudo aqui é **escopo-diff**: vale no código novo/tocado; o existente entra em baseline que só decresce.

## Strict — no novo, catraca no legado

- **`strict` ligado** para código novo e para o trecho que você altera. Alvo do `tsconfig`: `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` quando viável (ver `assets/lint/tsconfig.strict.json`).
- **`any`/`@ts-ignore`/`@ts-nocheck` NOVOS são VETADOS.** Os **existentes** são grandfathered — rastreados e queimados aos poucos.
- Prefira **`@ts-expect-error` com justificativa** a `@ts-ignore`: ele **expira sozinho** (falha o build quando o erro some) e documenta a dívida. `@ts-ignore` silencioso é proibido.
- **Catraca monotônica:** `type-coverage` (ou métrica equivalente) com **threshold que só sobe**; o número de `@ts-expect-error` só pode cair. O CI compara com o baseline — dívida nova reprova, dívida velha não.

## JS → TS por etapas

Legado em JS puro não vira TS strict num PR. Caminho:

1. `checkJs: true` + JSDoc para pegar erros sem renomear arquivos.
2. `allowJs` + renomear **por pasta/módulo** ao tocá-los; `ts-migrate` para o grosso inicial.
3. `noImplicitAny` **primeiro**, depois `strict` completo, **por pasta com ADR** — nunca "strict global já".

## Tipagem que paga

- **Fronteira validada em runtime:** todo I/O externo (payload de API, resposta de terceiro, env, mensagem de fila) passa por **`zod`/`valibot`** e o tipo é **derivado** do schema (uma fonte da verdade). O bug de legado quase sempre entra por I/O não validado, não por tipo interno.
- **`unknown` no lugar de `any`** quando o tipo é aberto; estreite com type guards.
- **Sem `as` casual** (só assertion justificada com comentário). Env tipado e validado no boot.

## Estilo e async

- **Prettier + ESLint** obrigatórios **no que você toca** (format-on-touch). Reformatação global = **PR isolada** com `.git-blame-ignore-revs` (regra escoteiro) — nunca polua um PR de fix com diff de formatação do repo todo.
- **`@typescript-eslint/no-floating-promises`** ligado: toda `Promise` é aguardada ou tratada. Sem `.catch(() => {})` / `catch {}` (§37).
- **Erros:** `Error.cause` pra encadear; `AbortController`/`AbortSignal` pra timeout/cancelamento; `unhandledRejection`/`uncaughtException` → log com `trace_id` + **graceful shutdown** (nunca engolir, nunca seguir corrompido). Ver `references/riscos-node.md`.
- Config compartilhada (eslint + tsconfig strict) é **bundlada** em `assets/lint/` — o projeto estende, não reinventa.
