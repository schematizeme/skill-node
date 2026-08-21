---
description: schematize-node — painel da saída do Node: % de funcionalidades já extraídas para Go/Rust por módulo, a partir do índice/MAPA; identifica módulos que cruzaram o gatilho e faltam ADR
---

Gere o **painel de progresso da saída do Node** deste workspace, a partir do índice de funcionalidades/MAPA (§39).

1. Para cada **módulo** (bounded context/pasta de contexto), a partir do índice:
   - total de funcionalidades (entradas do índice);
   - quantas já foram **extraídas** para Go/Rust (marcadas como migradas/deletadas do Node);
   - **% extraído = extraídas ÷ total**.
2. Sinalize:
   - módulos onde uma mudança recente **cruzou ~30%** de funcionalidades afetadas e **ainda não têm ADR de extração** aberto → apontar como pendência (o gatilho abre ADR, não bloqueia o PR).
   - módulos **≥ ~50% extraídos** → priorizar concluir **incrementalmente** (nunca "o resto de uma vez").
   - **Node "concluído" só quando o código antigo foi DELETADO** — extração que deixou o Node vivo aparece como *não-concluída* mesmo que o Go/Rust exista.
3. Reporte uma tabela `módulo | total | extraído | % | estado (a-planejar / em-migração / concluir / feito) | ADR`.

Use os limiares de `references/stack-versoes.md`. Este é o instrumento que torna o "Node não cresça / está saindo" **observável**, em vez de retórico.
