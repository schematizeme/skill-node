# Changelog — schematize-node

Formato: [Keep a Changelog]; versionamento: SemVer. Skill de **manutenção de legado**
Node.js/TypeScript, com saída gradual para Go/Rust. Não serve para backend novo.

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
