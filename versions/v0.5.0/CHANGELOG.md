# Changelog — schematize-node

Formato: [Keep a Changelog]; versionamento: SemVer. Skill de **manutenção de legado**
Node.js/TypeScript, com saída gradual para Go/Rust. Não serve para backend novo.

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
