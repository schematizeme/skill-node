# Higiene de npm — dependências, supply-chain e package manager

> Parte da skill **schematize-node**. Vocabulário npm que o `references/cadeia-suprimentos.md` geral não cobre. Aplicado ao que você toca (regra escoteiro): reduzir o que já existe é oportunístico + ADR, não obrigação retroativa num fix.

## Menos pacotes (sinal de saúde)

Cada dependência é superfície de ataque, custo de bundle e dívida de manutenção. **Preferir a plataforma** (`node:` fetch, test runner, crypto, streams, `util.parseArgs`) antes de instalar lib.

**Contagem — direto ≠ transitivo (o denominador importa):**

- **Diretas de produção** — `jq '.dependencies | length' package.json`. Backend saudável ~20–40. Acima disso, olhe cada família e justifique.
- **Transitivas de produção** — `npm ls --omit=dev --all` (ou `--prod`). Um backend real tem centenas; o limiar de *smell* é sobre ordem de grandeza, não número mágico. **Front tolera mais** (o ecossistema exige).
- **devDeps num sinal SEPARADO** de supply-chain — não são "de graça": lifecycle scripts de devDep rodam na sua máquina/CI (o worm recente de npm mirou justamente devDeps).
- Os números-limiar exatos (o que conta como "smell" hoje) ficam em `references/stack-versoes.md` — voláteis, revisados à parte. Não decore.

`/node-audit` computa essas contagens + achados abaixo, com **saída machine-readable** e thresholds que **travam CI**.

## Vulnerabilidades — SCA que não vira paralisia

`npm audit` que trava em toda vuln alta, sem escape, é **desligado** pela equipe — e desligar gate de segurança é anti-padrão (§37). A política sustentável:

1. Há fix? Use **`overrides`/`resolutions`** (npm/yarn/pnpm) pra forçar a versão corrigida da dep **transitiva** sem esperar o mantenedor intermediário.
2. Sem fix disponível? **ADR de risco aceito, time-boxed**, com data de reavaliação, e o gate lê uma **allowlist versionada de advisories** (não `--force` cego).
3. **Triagem por alcançabilidade:** vuln em caminho dev-only ou inalcançável não bloqueia merge do time inteiro por CVE pré-existente; entra na allowlist com nota.
4. Ferramentas: `npm audit` + **`osv-scanner`**/Socket/Snyk; **`npm audit signatures`**/provenance pra checar procedência.

## Supply-chain de instalação

- **`--ignore-scripts` por padrão** (`.npmrc`: `ignore-scripts=true`): `postinstall`/lifecycle de dependência é vetor enorme (dependency confusion, pacote comprometido). Habilite scripts só pra pacotes auditados que precisam.
- **Pin exato** (`save-exact=true`; sem `^`/`~` frouxo em app) + **lockfile commitado**; **`npm ci`** no CI (nunca `npm install`).
- **`files` allowlist** e `engines` no `package.json`; sem publicar o que não precisa.
- Dependência nova: nome verificado (typosquatting), manutenção viva, **licença** na allowlist da casa (`stack-versoes.md`), versão pinada.

## Package manager — respeitar o existente

- Legado usa **npm, yarn ou pnpm**. **Não troque de PM em código congelado** só por preferência — é mexer no que funciona (ADR se for necessário). `/node-audit` **detecta o lockfile** e usa os comandos equivalentes.
- **pnpm** é preferido em **projeto/monorepo novo** (deps estritas, sem phantom deps, disco eficiente) — mas isso é escolha de green-field, não conversão retroativa.
- **Monorepo/workspaces:** "1 repo = 1 bounded context" mapeia em **packages**; alinhe versões com `syncpack`; a migração-por-módulo vira **extrair um package do workspace** para um repo Go/Rust (§migracao-saida).

## Toolbelt (concretiza `/node-audit`)

`knip`/`depcheck` (deps e exports/arquivos mortos), `npm-check-updates` (ncu), `syncpack` (versões no monorepo), `license-checker`, `osv-scanner`, `madge` (deps circulares), `size-limit` (bundle). Idealmente um `scripts/node-audit.mjs` que roda tudo e emite JSON. Atualização contínua: **Renovate/Dependabot em batches testados** (PRs pequenos, CI verde), não bump manual que ninguém faz.
