---
description: schematize-node — lista todos os comandos disponíveis e o que cada um faz
---

Mostre ao usuário a lista de comandos do conjunto **schematize-node** (manutenção de legado Node/TS), em formato de tabela legível, exatamente com este conteúdo (ajuste se houver comandos novos instalados em `.claude/commands/`):

| Comando | O que faz |
|---|---|
| `/node-help` | Lista todos os comandos do schematize-node (este). |
| `/node-load` | **Carrega à força TODO o corpo normativo** (regra escoteiro/escopo-diff, saída do Node, npm, TS estrito, riscos Node) e passa a aplicá-lo no projeto. |
| `/node-claude` | Cria ou **atualiza (sobrescreve, com backup)** o `CLAUDE.md` da raiz com a versão atual da skill; **mescla/avisa** se detectar `CLAUDE.md` de outra skill (go/rust/web). |
| `/node-audit` | Higiene de dependências: contagem direto/transitivo, `npm audit` (com triagem/allowlist), desatualizados (ncu), não-usados (knip/depcheck), licenças e **EOL do Node** — saída machine-readable, thresholds que travam CI. |
| `/node-migrate-status` | Painel da saída do Node: **% de funcionalidades já extraídas por módulo** (a partir do índice/MAPA). |
| `/node-review` | Gate **escopo-diff** da Definition of Done/anti-padrões no diff: `any`/`@ts-ignore` **novo**, `.catch(()=>{})`, arquivo tocado >300, **rota/handler/serviço Node NOVO sem ADR**, segredo ecoado de `process.env`. |
| `/node-cc` | Context compact: gera `context.md` + `checklist.md` em `<projeto>_archive/context/` e roda `/compact`. |
| `/node-handoff` | Gera o handoff (`context.md` + `checklist.md`) **sem** compactar. |
| `/node-qa` | Fluxo de Q.A. plan-first: planeja tudo, gera MD, pede aprovação, então roda. |
| `/node-index` | (Re)gera o índice de microfunções/MAPA a partir dos doc-comments. |

Depois da tabela, diga em uma linha que esta skill é de **manutenção de legado** (Node backend em saída; funcionalidade nova nasce em Go/Rust), que quase tudo é **escopo-diff** (só no que você toca), e que o frontend Node é do `schematize-web`.
