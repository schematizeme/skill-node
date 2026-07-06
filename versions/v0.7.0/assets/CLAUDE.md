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
10. **Fluxo de ambientes — nada direto no servidor.** Toda mudança segue **dev local → teste local → GitHub → hml → prd**. Nada pula etapa; nada vai direto pra hml/prd. **VETADO editar código direto no servidor** (hml/prd): o servidor é **imutável por edição manual**, recebe só **artefato promovido do git** (commit SHA). Hotfix segue o mesmo fluxo, acelerado — urgência não autoriza mão no servidor. Precauções: filesystem read-only em hml/prd, drift detection (o ops recusa/alerta divergência com o git), acesso de escrita = break-glass auditado. Detalhe em `references/ops.md` (§1). (§21)
11. **Ops é a interface única + instalação paralela + independência.** **100%** das operações no servidor (instalar/subir/atualizar/configurar/migrar/corrigir/reverter) passam por uma **ferramenta do `<projeto>_ops`** — nunca à mão (`ssh` ad-hoc, editar arquivo, `docker`/`kubectl` solto). Não tem comando pra aquilo? **cria no ops**. O ops é **autônomo, idempotente e completo**: o usuário provisiona o servidor **do zero só com o ops, sem depender da IA**. **Instalação SEMPRE paralela** = nº de cores (`nproc`, default) — nada de 20 min serial. **Se o paralelo falha, os serviços não são independentes** (fere piso 7): corrigir a independência é **PRIORIDADE MÁXIMA**; o ops **expõe** a colisão, **nunca serializa pra mascarar**. Detalhe em `references/ops.md`. (§2, §21)
12. **Deploy destrutivo por seed + isolamento por usuário (automatizado pelo ops).** O ops provisiona em **`/<app>/`** clonando os repos dentro (`/<app>/<app>_<ctx>`, ex. `/payle/payle_core`); **`/<app>/.env` é o SEEDER GLOBAL** — fonte única de config de toda a app. **Todo redeploy é DESTRUTIVO na aplicação:** apaga a implantação anterior e recria um **clone zerado** só com o seed — sem patch in-place, sem drift (idempotente/reprodutível). **"Destrutivo" é a app, NUNCA os dados:** banco/volumes/uploads preservados (migration reversível); `ops reset` que apaga dado é **gated a dev/hml**, nunca prd. **Cada serviço roda como user Linux próprio, em systemd unit isolado e hardened** (`NoNewPrivileges`, `ProtectSystem`, `PrivateTmp`, …) — comprometer um serviço não alcança os outros nem o host. **Tudo automatizado pelo ops**, nunca à mão. Detalhe em `references/ops.md` (§2, §3).

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
vai)** / **MAPA e índice** — a *qualidade* (doc-comment, gates) é **no que você toca**. Mas o **MAPA/índice**, quando gerado (`/node-index`), **enumera o sistema todo**: uma entrada **por função** existente (`nº entradas == nº funções`) e um **grafo** (serviços + chamadas, Mermaid + adjacência) — mapa parcial não serve pra navegar. **MAPA/índice moram em `<projeto>_archive/index/` (`MAPA.md`, `INDEX_GLOBAL.md`, `INDEX_FUNCTIONS.md`), nunca no root.** Handoff arquivado antes de compactar (§34.1/§28).

- **Todo MD gerado mora no archive, nunca no root** (§28): MAPA, índices, planos, relatórios, handoffs, checkpoints → `<projeto>_archive/<área>/`. O root fica limpo (código, config e os MDs de projeto mantidos à mão: README, `CLAUDE.md`, LICENSE). Antes de gravar um `.md`, o caminho começa com `<projeto>_archive/`.

Lista completa de anti-padrões: `references/anti-padroes.md` (§37) da skill.
