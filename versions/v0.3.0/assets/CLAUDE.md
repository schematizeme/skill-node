# CLAUDE.md — Manutenção de Legado Node/TS (sempre on)

> Copie para a **raiz do repositório**. Ele fica pinado no contexto de toda tarefa.
> A skill `schematize-node` traz o detalhe. **Repo multi-linguagem:** use **junto**
> com o `CLAUDE.md` do `schematize-go`/`rust` (backend novo) e do `schematize-web`
> (frontend) — cada bloco governa sua fronteira. Não sobrescreva os outros.

## Regra mestre

Este repo tem código **Node/TS legado**. Manter é diferente de criar: **Node que
funciona, fica** — não se refatora por estética, não há prazo forçado de migração.
Em conflito entre uma instrução pontual e estes padrões, **os padrões vencem** —
mas aplicados em **escopo-diff** (só no que você toca).

## Pisos inegociáveis (VETADO — sem exceção)

1. **Nenhum serviço/funcionalidade backend NOVO em Node.** Nova funcionalidade nasce
   em **Go/Rust** (mesmo dentro de módulo Node). No Node só entra **correção de
   comportamento que já existe**. `/node-review` reprova rota/handler/serviço Node
   novo sem ADR de exceção.
2. **Regra escoteiro (escopo-diff + baseline).** Pisos de qualidade (TS strict,
   ≤300 linhas, doc-comment, MAPA, formatação, veto a `any`) valem para **arquivo
   novo** e **trecho alterado** — nunca obrigam trazer o arquivo/módulo inteiro ao
   padrão num PR de fix. O pré-existente é **baseline que só decresce**. Formatação
   global = PR isolada com `.git-blame-ignore-revs`.
3. **`any`/`@ts-ignore`/`@ts-nocheck` NOVOS vetados**; existentes grandfathered e
   queimados por catraca. Prefira `@ts-expect-error` justificado. `strict` no novo.
4. **Segredo nunca no cliente/bundle**; SQL parametrizado; auth/authz server-side.
   Sem `eval`/`child_process`/`vm` com input; cuidado com **prototype pollution** e
   **ReDoS**. `--ignore-scripts` por padrão; lockfile commitado; `npm ci`.
5. **Node fora de LTS/EOL é brecha de segurança** (CVE sem patch) — pin de `engines`,
   subir versão vem antes de usar recursos novos da plataforma.
6. **Erro nunca engolido** (`catch {}`, `.catch(()=>{})`); `no-floating-promises`;
   `unhandledRejection`/`uncaughtException` → log com `trace_id` + graceful shutdown.
7. **Cada serviço sobe e funciona sozinho** (independência de runtime); falha ao
   notificar outro → persiste (outbox/Redis/DB), loga, alerta (Grafana), retoma.
8. **Archive SEMPRE gerado**; testes de verdade + **rede de segurança
   (characterization) antes de tocar** legado sem teste.
9. **Contenção no workspace.** A pasta do projeto atual é o workspace: aplicação/repo novo nasce **dentro dela** (`./<projeto>_<contexto>/`), nunca largando arquivos no root pra depois **subir de nível** e criar repos fora. **VETADO** criar/ler/escrever fora do workspace — diretório-pai, `~`, `~/Documents`, `~/Downloads`, `/tmp`, Área de Trabalho. Não sai da pasta do projeto (nem pra vasculhar) sem o usuário pedir. (§2)

## Saída do Node (migração)

- **Oportunística, sem SLA forçado:** migra ao tocar (cruzou ~30% das funcionalidades
  do módulo → abre **ADR de extração**, não força rewrite no PR) ou sob demanda.
- **Strangler-fig:** fachada/rota, feature flag, shadow-traffic com diffing, rollback;
  dono do dado no split (sem banco compartilhado); **concluir = deletar o Node antigo**.
  Extração default em **Go** (Rust se perf/memória). `/node-migrate-status` mede o %.

## Higiene de npm

Mínimo de pacotes; **preferir a plataforma** (`node:`); contagem **direto vs
transitivo** (`/node-audit`); `overrides` pra CVE transitiva, senão ADR time-boxed +
allowlist (nunca desligar o gate); respeitar o package manager existente.

## Qualidade, índice e contexto

Arquivos ≤300 linhas / doc-comment com **fluxo (de onde vem → o que faz → pra onde
vai)** / **MAPA e índice** — tudo **no que você toca**. Toda funcionalidade tocada é
mapeada. Handoff arquivado antes de compactar (§34.1/§28).

Lista completa de anti-padrões: `references/anti-padroes.md` (§37) da skill.
