---
name: schematize-node
metadata:
  version: 0.7.0
description: Padrões da casa para MANUTENÇÃO de código legado em Node.js/TypeScript — não para criar serviço backend novo (isso é Go/Rust; ver schematize-go/rust). Use ao revisar, corrigir, otimizar (só perf exigida), tipar ou MIGRAR código Node/TS existente: regra escoteiro (escopo-diff), higiene de npm, TypeScript estrito incremental, ESM/CJS, monorepo/workspaces, versão/EOL do runtime, prototype pollution/ReDoS, strangler-fig na saída para Go/Rust. Dispara em tarefas com Node, npm/pnpm/yarn, package.json, tsconfig, Express/Nest/Fastify, npm audit, ESM, workspaces. PHP é refatorado (ver go/rust). Frontend Node (Next/Astro) é do schematize-web.
---

# Padrões de Engenharia da Casa — Node.js/TypeScript legado (manutenção)

Node como **linguagem de serviço backend está em saída**. Esta skill governa **manter bem** o que já roda em Node/TS e **conduzir a saída** para Go/Rust de forma segura e incremental — **não** justifica código Node novo. Mesma base normativa das demais skills; o que muda é o ferramental Node/TS, a disciplina de saída, e o fato de que **quase tudo aqui é aplicado só ao que você toca** (legado não se reescreve inteiro).

## Posição da stack (leia primeiro)

- **Nenhum serviço backend novo em Node.** Backend novo nasce em **Go** (`schematize-go`) ou **Rust** (`schematize-rust`).
- **Nova funcionalidade NUNCA nasce em Node** — nem dentro de um módulo Node existente. Ela sai como **módulo Go/Rust novo**. No Node só entra **correção de comportamento que já existe** (bug, requisito mudado, brecha de segurança).
- **Node que funciona, fica.** Não se refatora Node em produção por estética. Não há prazo/SLA forçado de migração: só se mexe/migra quando **você toca aquilo** (e cruza o gatilho) **ou** quando é solicitado/exigido. (Contraste: PHP é dívida ativa — ver `schematize-go`/`rust` §3.2.)
- **Frontend Node é 100% permitido** e é do **`schematize-web`** (Next.js/Astro). Fronteira por **tipo de processo** (ver abaixo).

## Regra escoteiro — o piso que rege tudo aqui (leia antes de qualquer gate)

Legado não se traz inteiro ao padrão num PR de fix. Portanto:

- **Todo piso de qualidade (TS estrito, ≤300 linhas, doc-comment, MAPA/índice, formatação, veto a `any`) vale para: (1) arquivo NOVO, e (2) o TRECHO que você efetivamente alterou.** Você **não** é obrigado a converter/quebrar/documentar/reformatar o arquivo ou módulo inteiro só porque encostou nele.
- **O pré-existente entra num baseline** (dívida registrada) que **só pode decrescer** — nunca reprova um PR por dívida que já estava lá. Gate é **escopo-diff**: mede o diff, não o repositório.
- **Formatação repo-wide**, quando necessária, é **uma PR isolada só-de-formatação** com `.git-blame-ignore-revs` (não polui review nem `git blame`).
- **`any`/`@ts-ignore` existentes** são grandfathered e rastreados (queimados aos poucos); o veto é a **`any` NOVA** (ver `references/typescript-estilo.md`).

> Sem a regra escoteiro, esta skill viraria um muro que impede a manutenção que ela diz proteger. Rigor onde há autoria; baseline onde há herança.

## Saída do Node → Go/Rust (o "como", não só o "quando")

- **Gatilho mensurável e NÃO-bloqueante.** "Funcionalidade" = **entrada no índice/MAPA** (§39); `%` = entradas afetadas ÷ total do módulo; "módulo" = um bounded context/pasta de contexto. Quando uma mudança cruza **~30%** das funcionalidades do módulo, **abre-se um ADR de extração no backlog** — **não** se força o rewrite dentro do mesmo PR (um hotfix de 1 linha nunca dispara reescrita cross-language). `/node-migrate-status` calcula o % por módulo a partir do índice.
- **Extração incremental** (strangler-fig), nunca big-bang: proxy/roteamento por rota/feature entre Node antigo e Go/Rust novo, **feature flag de cutover**, **shadow/dark traffic com diffing** (compara saída Node vs Go em tráfego real antes de virar a chave), **rollback**. Detalhe em `references/migracao-saida.md`.
- **Dono do dado no split:** o serviço extraído é dono do seu schema; comunicação Node↔novo por HTTP/evento/**Anti-Corruption Layer**, **nunca** banco compartilhado (senão vira monólito distribuído, VETADO — §2).
- **Migração só termina quando o Node antigo é DELETADO.** "50% extraído" não é "migra o resto de uma vez" (isso é big-bang) — é continuar extraindo até apagar o legado correspondente. Contract/golden tests provam paridade **antes** de desligar.

## Fronteira com `schematize-web` (por tipo de processo)

- **É `schematize-web`** (não esta skill): app Next.js/Astro, qualquer coisa que renderiza UI, e **o server-side do próprio front** (route handler, server action, middleware, BFF, adapter). BFF/route handler **novo** de um front é server-side de front — permitido pela web, **não** é "Node backend novo".
- **É `schematize-node`**: processo Node **standalone** — API server, worker, cron, consumer de fila, CLI, Lambda/function de backend.

## Higiene de npm — menos é mais (escopo-diff)

- **Mínimo de pacotes possível.** Cada dep é superfície de ataque, bundle e manutenção. Preferir a **plataforma** (`node:` fetch/test/crypto/streams) ao invés de lib.
- **Contagem como sinal de saúde — direto ≠ transitivo:**
  - **Diretas de produção** (`jq '.dependencies|length' package.json`): backend saudável ~20–40. **>~40 direto** já pede olhar.
  - **Transitivas de produção** (`npm ls --omit=dev --all`): **>200 → smell forte** (backend), documente/reduza; **front tolera mais**.
  - **devDeps** contam num sinal **separado** de supply-chain (não escondem: worm recente de npm mirou devDeps).
  - Números exatos e voláteis ficam em `references/stack-versoes.md` (Anexo), não decorados aqui.
- **CVE transitiva:** `overrides`/`resolutions` quando há fix; **sem fix** → ADR de risco aceito **time-boxed** + allowlist versionada de advisories (triagem por **alcançabilidade**). `npm audit` que trava sem escape é desligado — e desligar gate é anti-padrão.
- **`--ignore-scripts` por padrão** (lifecycle/postinstall de dep é vetor enorme); pin exato + lockfile commitado; **`npm ci`** no CI; respeitar o **package manager existente** (npm/pnpm/yarn — não trocar em código congelado sem ADR). Detalhe em `references/npm-dependencias.md`.

## TypeScript e estilo (incremental)

- **TypeScript é o alvo; `strict` no código novo/tocado.** `any`/`@ts-ignore`/`@ts-nocheck` **novos** são VETADOS; os **existentes** são grandfathered e queimados por catraca (`type-coverage` que só sobe). Prefira **`@ts-expect-error` com justificativa** a `@ts-ignore` (expira sozinho, documenta a dívida).
- **JS→TS por etapas:** `checkJs`, `noImplicitAny` primeiro, strict por pasta/ADR — nunca "strict já, tudo".
- **Tipagem de fronteira validada em runtime** (`zod`/`valibot`) e derivada em tipo; `unknown` no lugar de `any` no aberto.
- **Formatação automática (Prettier) + ESLint** no que você toca (format-on-touch); reformatação global = PR isolada (regra escoteiro). `@typescript-eslint/no-floating-promises` ligado. Detalhe em `references/typescript-estilo.md`.

## Riscos Node-específicos de legado (o que mais causa incidente)

- **Versão/EOL do runtime — piso de segurança.** Rodar Node fora de LTS/EOL é CVE sem patch, não cosmético. `engines`, `.nvmrc`/Volta, LTS suportada. (E os recursos "preferir a plataforma" exigem Node ≥18/20 — só use após garantir o piso de versão.)
- **ESM vs CJS:** `type:module`, `moduleResolution: NodeNext`, dual-package hazard, `__dirname`/`require` em ESM, interop default/named, top-level await. Converte um módulo pra ESM **só ao tocá-lo/extraí-lo**, nunca big-bang.
- **Memória/event-loop:** vazamentos, `--max-old-space-size`, event-loop lag, `MaxListenersExceededWarning`, caches ilimitados. `worker_threads` pra CPU-bound; **streams com backpressure**.
- **Graceful shutdown / SIGTERM / draining** (liga com independência de runtime); `unhandledRejection`/`uncaughtException` → log com `trace_id` + encerra gracioso, nunca engole.
- **Segurança JS-específica:** **prototype pollution** (merge/lodash), **ReDoS**, `child_process`/`vm`/`eval` com input, path traversal, SSRF em fetch server-side. Detalhe em `references/riscos-node.md` e `references/seguranca.md`.

## Comandos (Claude Code)

Prefixados `node-` — convivem sem conflito com `go-*`, `rust-*`, `web-*`.

| Comando | O que faz |
|---|---|
| `/node-help` | lista todos os comandos |
| `/node-load` | carrega à força TODO o corpo normativo e passa a aplicá-lo (escopo-diff) |
| `/node-claude` | cria ou **atualiza (sobrescreve, com backup)** o `CLAUDE.md` da raiz; **mescla/avisa** se detectar CLAUDE.md de outra skill |
| `/node-audit` | higiene de deps: contagem direto/transitivo, `npm audit` (com triagem/allowlist), desatualizados (ncu), não-usados (knip/depcheck), licenças, EOL do Node — saída machine-readable, thresholds que travam CI |
| `/node-migrate-status` | % de funcionalidades já extraídas por módulo (a partir do índice) — o painel da saída do Node |
| `/node-ops` | audita/scaffolda o `<projeto>_ops` (interface única): fluxo de ambientes, instalação paralela (`nproc`), independência |
| `/node-review` | gate escopo-diff da DoD/anti-padrões no diff: `any`/`@ts-ignore` novo, `.catch(()=>{})`, arquivo tocado >300, **rota/handler/serviço Node NOVO sem ADR**, segredo de `process.env` |
| `/node-cc` · `/node-handoff` · `/node-qa` · `/node-index` | context compact / handoff / Q.A. plan-first / (re)gera índice |

## Pisos gerais herdados (escopo-diff)

Mesmos das skills go/rust — leia o reference; **aplicados ao que você toca**:

- **Arquitetura/DDD, repos `<projeto>_<contexto>[_<lang>]`, `<projeto>_ops`, independência de runtime** (cada serviço sobe e funciona sozinho; falha ao notificar outro → persiste/loga/alerta/retoma).
- **Fluxo de ambientes e ops (`references/ops.md`).** Toda mudança segue **dev local → teste local → GitHub → hml → prd**; **VETADO editar código direto no servidor** (hml/prd é imutável por edição manual, recebe só artefato do git). **100%** das operações no servidor (install/update/correção/config/migrate/rollback) passam pela **ferramenta do `<projeto>_ops`** — nunca à mão; o ops é **autônomo** (o usuário provisiona o servidor do zero sem a IA). **Instalação sempre paralela** = `nproc`; **falha no paralelo = serviços não independentes → corrigir a independência é prioridade máxima** (não serializar pra mascarar). (`/node-ops`)
- **Deploy destrutivo por seed + isolamento por usuário (`references/ops.md` §2–§3).** O ops provisiona em **`/<app>/`** clonando os repos dentro; **`/<app>/.env` é o seeder global** (fonte única de config). **Todo redeploy é destrutivo na aplicação** — apaga a anterior e recria um clone zerado só com o seed (idempotente/sem drift), **preservando os dados** (migration reversível; `ops reset` de dados só em dev/hml). **Cada serviço roda como user Linux próprio em systemd unit hardened** (blast radius mínimo). Tudo automatizado pelo ops. (`/node-ops`)
- **Segurança** (segredo nunca no cliente, SQL parametrizado, auth server-side) + os riscos Node acima.
- **Testes "verde de verdade"** + **rede de segurança de legado**: characterization/golden-master **antes** de tocar código sem teste; contract tests na costura antes de extrair.
- **Observabilidade escalonada:** log estruturado (`pino`) + métrica básica no **piso**; LGTM+ completo (OTel/Alloy/Loki/Tempo/Prometheus/Mimir + Helm) como **alvo** — retrofit de tracing distribuído não é pré-requisito pra tocar no código. Auto-instrumentação (`@opentelemetry/auto-instrumentations-node`) e propagação `traceparent` cross-seam Node↔Go.
- **Clean code + índice/MAPA** (doc-comment com fluxo **de onde vem → o que faz → pra onde vai**; **`MAPA.md` e índice em `<projeto>_archive/index/`, nunca no root** — todo MD gerado mora no archive, root limpo, §28), **archive**, gestão de contexto — tudo escopo-diff.

## Andaime pronto (a bundlar na build)

`scripts/node-audit.mjs`, `scripts/check-diff.sh` (Node), `scripts/build-index.mjs`, `assets/lint/eslint.config` + `tsconfig.strict.json`, `assets/CLAUDE.md`, templates (ADR/MAPA/…), hooks de contexto — paridade com go/web.

## Mapa de references

| Tarefa | Reference |
|---|---|
| Saída do Node: strangler, 30/50 via índice, dono do dado, "concluir = deletar" | `references/migracao-saida.md` |
| Higiene de npm: contagem, overrides, `--ignore-scripts`, SCA sustentável, PM | `references/npm-dependencias.md` |
| TypeScript estrito incremental, `@ts-expect-error`, ESLint/Prettier, ratchet | `references/typescript-estilo.md` |
| Riscos Node: EOL, ESM/CJS, memória/event-loop, workers/streams, prototype pollution/ReDoS | `references/riscos-node.md` |
| Clean code, regra escoteiro, MAPA, índice | `references/padroes-codigo.md` |
| Arquitetura, camadas, repos, `_ops`, independência | `references/arquitetura.md` |
| **Ops (control plane): fluxo dev→local→github→hml→prd (nada direto no servidor), ops como interface única (100%, autônomo), instalação paralela=`nproc`, independência=invariante** | `references/ops.md` |
| Segurança | `references/seguranca.md` |
| Testes / Q.A. / rede de segurança de legado | `references/testes.md` |
| Observabilidade (escalonada → LGTM+) | `references/observabilidade.md` |
| Anti-padrões vetados | `references/anti-padroes.md` |
| Contexto Claude Code (handoff/hooks) | `references/contexto-claude-code.md` |
| Números voláteis (limiares de deps, Node LTS) | `references/stack-versoes.md` |
