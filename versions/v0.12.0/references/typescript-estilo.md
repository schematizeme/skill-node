# TypeScript estrito (incremental) e estilo

> Parte da skill **schematize-node**. TS é o alvo; legado migra por catraca, não por decreto. Tudo aqui é **escopo-diff**: vale no código novo/tocado; o existente entra em baseline que só decresce.

## Strict — no novo, catraca no legado

- **`strict` ligado** para código novo e para o trecho que você altera. Alvo do `tsconfig`: `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` quando viável (ver `assets/lint/tsconfig.strict.json`).
- **`any`/`@ts-ignore`/`@ts-nocheck` NOVOS são VETADOS.** Os **existentes** são grandfathered — rastreados e queimados aos poucos.
- Prefira **`@ts-expect-error` com justificativa** a `@ts-ignore`: ele **expira sozinho** (falha o build quando o erro some) e documenta a dívida. `@ts-ignore` silencioso é proibido.
- **Catraca monotônica:** `type-coverage` (ou métrica equivalente) com **threshold que só sobe**; o número de `@ts-expect-error` só pode cair. O CI compara com o baseline — dívida nova reprova, dívida velha não.

## `erasableSyntaxOnly` — a alavanca de rodar TS direto no Node

O Node executa `.ts` **apagando os tipos**, sem compilar (type stripping). Isso só funciona para
sintaxe **apagável**: o que não é só anotação — **`enum`**, **`namespace` com valor**,
**parameter properties** (`constructor(private readonly x: T)`) e `experimentalDecorators` — exige
transformação de verdade e **quebra**. Num repo legado, a diferença entre "dá para rodar sem build
step" e "não dá" costuma ser **um punhado de arquivos** usando essas quatro coisas.

- **`erasableSyntaxOnly: true`** (TS 5.8+) faz o **compilador reprovar** a sintaxe não-apagável.
  Ligue **antes** de prometer ao time que o build step vai embora: sem ele, você descobre o
  problema em runtime, arquivo por arquivo.
- **`verbatimModuleSyntax: true`** anda junto: obriga `import type` explícito e faz o TS **não
  reescrever** as declarações de import/export — que é o outro pedaço de "o que você escreveu é o
  que roda". Efeito colateral bom: acaba o import de tipo que virava `require` de um módulo
  inexistente em runtime.
- Substitutos das quatro proibidas: `enum` → `as const` + união de literais (mais estreito e some
  no runtime); `namespace` → módulo; **parameter property → campo declarado e atribuído no corpo**;
  decorator → decorators padrão (TC39) ou composição.
- **Isto não é só estética:** é o que separa `node meuscript.ts` de precisar de bundler — e num
  legado, cada peça a menos na cadeia de build é uma peça a menos para quebrar em 2027.

## JS → TS por etapas

Legado em JS puro não vira TS strict num PR. Caminho:

1. `checkJs: true` + JSDoc para pegar erros sem renomear arquivos.
2. `allowJs` + renomear **por pasta/módulo** ao tocá-los. Para o grosso inicial, ferramenta de
   codemod **viva** — ✔ verificado em 2026-08-21: **`ts-migrate` está parado** (sem release
   relevante), então trate-o como último recurso e prefira `jscodeshift`/`ast-grep`, ou a renomeação
   manual por pasta, que num legado costuma ser mais barata do que revisar o diff de um codemod
   abandonado.
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
