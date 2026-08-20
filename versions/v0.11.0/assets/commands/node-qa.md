---
description: Q.A. no contexto Node/TypeScript — aplica a disciplina da skill schematize-qa (/qa-plan → /qa-run) com as ferramentas de teste de Node
argument-hint: "[escopo: unit|smoke|security|e2e|all|full|...]"
---

Conduza o **Q.A. no contexto Node/TypeScript** aplicando a disciplina da skill dedicada **schematize-qa**
(o fluxo plan-first `/qa-plan` → `/qa-run`: planeja tudo, gera o MD de passo a passo, **pede
aprovação antes de rodar**, executa faseado/assistido ou de uma vez com watchdog, coleta
`summary.json` e trava nos gates).

No recorte **Node/TS**, use as ferramentas de teste da plataforma — `vitest` / `npm test` / `node:test`,
`supertest` para HTTP, `msw` para mock de rede, `@testing-library` no front-legado, cobertura
(`c8`/`vitest --coverage`), os scripts de teste da skill (`scripts/`) e o pentest da schematize-pentest.

Rode `/qa-plan` para planejar e aprovar, depois `/qa-run` para executar. Nada de Q.A. roda sem
plano aprovado registrado no `<projeto>_archive/qa/`.
