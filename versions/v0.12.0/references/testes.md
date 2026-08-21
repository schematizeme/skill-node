# Testes — recorte Node/TypeScript

> **PONTEIRO, não cópia.** A **disciplina de teste** da casa é da **`schematize-qa`**: a pirâmide,
> teste de COMPORTAMENTO (não "renderizou"), o "verde de verdade" (smoke com asserção de conteúdo +
> assertion negativa + self-check que força uma falha conhecida), cobertura útil, a11y, regressão
> visual, contrato/dados, **flaky** (quarentena com prazo e dono), o fluxo **plan-first**
> (`/qa-plan` → `/qa-run`) e os **gates de CI que travam o merge**. Leia
> `schematize-qa` → `references/estrategia.md`, `references/categorias.md`,
> `references/execucao.md` e `references/flaky.md`.
>
> **Segurança ofensiva** (rejeição rota a rota, injeção/coerção, IDOR/BOLA, cross-tenant) é a
> **`schematize-pentest`** — não é Q.A. e não mora aqui.
>
> Aqui fica **só o que muda em Node/TypeScript**: o runner, a sintaxe, e as armadilhas do dialeto.
>
> *(Este arquivo e a antiga reference *testes-execucao* eram, juntos, ~450 linhas por skill — 66% já
> duplicado na `schematize-qa`, 23% que pertence à `schematize-pentest` e ~2% idiomático de
> verdade. Deriva por cópia foi o achado da Classe C/D da vistoria de 2026-08-21.)*

## O runner e o comando

```bash
node --test                          # runner nativo (Node >= 18), sem dependência
vitest run --coverage                # projeto com bundler
npm test -- --run                    # o que o CI chama
```

## O que muda de forma em Node/TypeScript

- **Legado é CJS.** O runner tem de coletar `.cjs` e `.mjs`; um `.test.cjs` fora do `include`
  **não roda e não avisa** — falso-verde silencioso. Asserte a **contagem esperada** de arquivos de
  teste e falhe em "no tests found" na pasta nova.
- **Type stripping tem limite.** `node --experimental-strip-types` só apaga sintaxe **apagável**:
  `enum`, `namespace` e **parameter properties** (`constructor(private x: T)`) **não rodam**. Ligue
  `erasableSyntaxOnly` (TS ≥ 5.8) para o compilador cobrar isso antes do runtime.
- **`--test-concurrency` + estado global não convivem.** Módulo com estado no topo (cache, contador,
  singleton) vaza entre arquivos de teste; isole com `beforeEach` ou torne a dependência explícita.
- **Fake timers** (`vi.useFakeTimers`/`node:test` mock timers) em vez de `setTimeout` no teste:
  `await sleep(100)` é a origem nº 1 de flaky nesta stack.
- **Property-based:** `fast-check`. **Mutation:** Stryker.
- **`testcontainers`** para banco; `nock`/`msw` para HTTP — nunca bater na rede real no CI.

## Onde divergir da base, a base manda

O piso é o mesmo: teste é **visto falhar no vermelho** antes de valer; cobertura é **contrato**
(não se baixa a régua para passar o CI); **teste nunca dispara efeito externo real** — endereço no
domínio de teste em rota nula, provider = sink, cap por execução, e a caixa se confere **lendo do
sink** (`references/iam.md` §3.1 desta skill; normativa em `schematize-engineering` →
`references/efeitos-externos.md`); e **gate não se desliga "por enquanto"**.
