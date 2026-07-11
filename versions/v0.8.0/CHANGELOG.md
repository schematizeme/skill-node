# Changelog — schematize-node

Formato: [Keep a Changelog]; versionamento: SemVer. Skill de **manutenção de legado**
Node.js/TypeScript, com saída gradual para Go/Rust. Não serve para backend novo.

## [0.8.0] — 2026-07-11
Limite de arquivo em camadas — teto de 750 (≤500 úteis + ~250 comentário) + flag em >300 úteis.

### Alterado
- **`references/padroes-codigo.md` §1/§2:** o limite rígido de **300 linhas/arquivo** vira regra **em camadas**. **Teto DURO: 750 linhas** (das quais **~250 reservadas a comentário/doc** e **até ~500 de código útil**) — acima bloqueia. **FLAG (não bloqueia, mas SEMPRE sinaliza) em > 300 linhas de código útil:** indício de que a função está **muito extensa** / **precisa de mais abstração** — registra como dívida e **revê quando as prioridades forem resolvidas**. **Observabilidade tem folga natural (~400 úteis).** Função com >300 úteis dispara o mesmo flag; "uma função por arquivo" mantida. Continua **escopo-diff** (regra escoteiro §0): mede o arquivo NOVO/tocado, não o legado inteiro.
- **`scripts/check-diff.sh`:** o gate de tamanho passa a contar **código útil** (exclui comentário/branco): `total > 750` **bloqueia**, `útil > 500` **bloqueia**, `útil > 300` (ou `> 400` em arquivo de observabilidade) **flagueia** (`warn`, não trava).
- Propagado no `CLAUDE.md`, `SKILL.md`, `references/entrega.md` (DoD), `references/arquitetura.md` (§6) e comandos `/node-review` `/node-help`.

## [0.7.0] — 2026-07-06
Deploy destrutivo por seed + isolamento por usuário (ops).

### Adicionado
- references/ops.md §2: layout /<app>/ + repos dentro; /<app>/.env seeder global; redeploy destrutivo na app (preserva dados; ops reset gated dev/hml).
- references/ops.md §3: isolamento por usuário (user Linux + systemd hardened por serviço).
- Piso de seed/isolamento no CLAUDE.md; anti-padrões; /node-ops audita layout/seed/isolamento.

## [0.6.0] — 2026-07-05
Control plane <projeto>_ops: fluxo de ambientes, ops interface única, instalação paralela, independência invariante.

### Adicionado
- references/ops.md: fluxo dev→local→github→hml→prd (nada direto no servidor), ops interface única (100%, autônomo), instalação paralela=nproc, independência invariante (falha no paralelo = serviços não independentes → prioridade máxima).
- Comando /node-ops; pisos de ambientes/ops no CLAUDE.md; anti-padrões (editar no servidor, pular pra hml/prd, operar fora do ops, instalar serial, serializar pra mascarar); operacao.md §21 estendido; /node-load carrega ops.md.

## [0.5.0] — 2026-07-05
Todo MD gerado no archive, root limpo.

### Corrigido
- MAPA/índice saíam no root → agora `<projeto>_archive/index/` (padroes-codigo §4, MAPA.md, /node-index, build-index.mjs, CLAUDE.md, SKILL.md).

### Adicionado
- §28.0 (operacao.md): layout canônico do archive — todo MD gerado em `<projeto>_archive/<área>/`, NUNCA no root.

## [0.4.0] — 2026-07-03

### Alterado
- **Índice/MAPA exaustivo e como grafo** (§4 / §39 / `/node-index` / `MAPA.md` / `CLAUDE.md`): o índice passa a exigir **uma entrada por função** de cada serviço/app (`nº entradas == nº funções`). O `/node-index` **conta as declarações** e **reprova** se o índice tiver menos entradas, listando as ausentes pelo nome — chega de mapa magro (o caso "90 linhas pra 100+"). Removida a brecha do "relevante". O MAPA vira **grafo** (serviços + chamadas, Mermaid + adjacência), não lista.

## [0.3.0] — 2026-07-03

### Adicionado
- **Contenção no workspace** (§2 / anti-padrões §37 / `CLAUDE.md`): aplicação/repo novo nasce **dentro da pasta do projeto atual** (`./<projeto>_<contexto>/`). Veto a começar largando arquivos no root e depois **subir de diretório** (`cd ..`, `../`) pra criar repos irmãos fora, ou espalhar arquivos em `~`/`Documents`/`Downloads`/`/tmp`/Área de Trabalho. O agente **não sai da pasta do projeto** (ler ou escrever) sem o usuário pedir.

## [0.2.0] — 2026-06-27
Primeira release pública, após revisão por um painel de 4 agentes + compilação.

### Adicionado
- **Regra escoteiro (escopo-diff + baseline):** os pisos de qualidade valem só no
  código **novo ou tocado**; o legado pré-existente é baseline que só decresce.
- **Veto:** nenhuma funcionalidade nova nasce em Node — vai como módulo Go/Rust;
  no Node só correção de comportamento existente (`/node-review` pega superfície nova).
- **Saída do Node** mensurável e **não-bloqueante:** gatilho 30/50 medido pelo índice
  → abre **ADR** (não força rewrite no PR); strangler-fig (fachada/flag/shadow-diff/
  rollback), dono do dado no split, **concluir = deletar o Node antigo**.
- **Higiene de npm:** contagem direto vs transitivo, `overrides`/`resolutions`,
  `--ignore-scripts`, SCA sustentável (allowlist + ADR, nunca desligar o gate),
  package manager agnóstico (respeitar o existente).
- **TypeScript estrito incremental:** `any`/`@ts-ignore` **novo** vetado, existente
  grandfathered; `@ts-expect-error`; JS→TS por etapas.
- **Riscos Node de legado:** EOL/versão-piso do runtime, ESM/CJS, memória/event-loop,
  workers/streams/backpressure, graceful shutdown, prototype pollution/ReDoS.
- **Comandos:** `/node-help`, `/node-load`, `/node-claude`, `/node-audit`,
  `/node-migrate-status`, `/node-review`, `/node-cc`, `/node-handoff`, `/node-qa`,
  `/node-index`.
- Pisos gerais herdados de `schematize-go`/`rust` (arquitetura, segurança, testes,
  observabilidade LGTM+, `<projeto>_ops`, independência de runtime) — aplicados em
  modo escopo-diff.

> **beta (0.2.0):** o andaime (`scripts/node-audit.mjs`, `check-diff` Node) ainda é
> herdado do go/genérico; refinamento Node-específico previsto para 0.3.0.
