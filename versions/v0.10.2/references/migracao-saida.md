# Saída do Node → Go/Rust (strangler-fig)

> Parte da skill **schematize-node**. O "como" da migração incremental e segura. O "quando" (gatilho) mora aqui e no SKILL.md; este arquivo é o mecanismo.

## Princípio

Node backend está em saída, mas **sem prazo forçado**: migra-se **oportunisticamente** (ao tocar código que cruza o gatilho) ou **sob demanda**. Node que roda em paz e não é tocado, fica. A migração é **estrangulamento** (strangler-fig): o novo cresce em volta do velho até o velho poder ser deletado — nunca big-bang.

## Gatilho mensurável (não-bloqueante)

- **Unidade:** "módulo" = um bounded context / pasta de contexto. "Funcionalidade" = uma **entrada no índice de funcionalidades/MAPA** (§39).
- **Medida:** `% = funcionalidades afetadas nesta mudança ÷ total de funcionalidades do módulo`. `/node-migrate-status` calcula a partir do índice.
- **Ação ao cruzar ~30% (por mudança):** **abre um ADR de extração** no backlog para aquela(s) funcionalidade(s). **Não** força o rewrite dentro do mesmo PR — um hotfix nunca vira reescrita cross-language. A entrega pontual sai; a extração é item de trabalho registrado.
- **Acumulado (cumulativo, distinto do por-PR):** o ADR/MAPA do módulo registra o **% já extraído**. Ao chegar em ~50% extraído, priorize concluir — mas **incrementalmente** (continue extraindo), nunca "migra o resto de uma vez".
- Os percentuais são limiares da casa (voláteis → `stack-versoes.md`); ajuste por ADR se um módulo exigir.

## Mecânica do estrangulamento

1. **Fachada/roteamento na frente:** um proxy reverso ou router in-process decide, **por rota/feature**, se a requisição vai pro Node antigo ou pro serviço Go/Rust novo. O cliente não sabe da troca.
2. **Feature flag de cutover:** virar rota do velho→novo é flag, reversível em segundos.
3. **Shadow / dark traffic com diffing:** antes de virar a chave, o novo recebe **cópia** do tráfego real e sua saída é **comparada** com a do Node (diff). Só vira quando a paridade está provada.
4. **Rollback** definido e testado (voltar a flag; o Node antigo ainda está lá até o passo 6).
5. **Contract/golden tests** fixam o comportamento do Node **antes** da extração (Pact ou fixtures gravadas) — o substituto Go/Rust tem que bater. Extração sem isso é aposta.
6. **Concluir = DELETAR o Node antigo.** Migração que não apaga o legado deixa dois serviços vivos servindo a mesma coisa — pior que antes. A funcionalidade só está "migrada" quando o código Node correspondente foi removido e a fachada não roteia mais pra ele.

## Dono do dado durante o split

- O serviço extraído é **dono do seu schema**. Node e o novo **não compartilham banco** (isso é monólito distribuído — VETADO, §2).
- Comunicação Node↔novo por **HTTP/gRPC/evento**, com **Anti-Corruption Layer** traduzindo o modelo de um lado pro outro.
- Se ambos precisam do mesmo dado na transição: um é dono (escreve), o outro lê por API/evento/réplica read-only com contrato — nunca dois escritores no mesmo dado sem contrato.

## Go ou Rust no ponto de extração

- **Default: Go** (padrão de backend da casa — `schematize-go`). **Rust** quando o pedaço extraído é **performance-crítico ou exige segurança de memória** (`schematize-rust`). Decisão registrada no ADR de extração.

## Independência durante a coexistência

Cada lado (Node antigo, serviço novo) **sobe e funciona sozinho** (§2/§18). A fachada degrada com graça: se o novo cai, roteia de volta pro Node (ou vice-versa) enquanto houver os dois; falha de notificação entre eles persiste/loga/alerta/retoma — nunca derruba a cadeia.
