---
description: schematize-node — carrega à força TODO o corpo normativo (regra escoteiro/escopo-diff, saída do Node → Go/Rust, higiene npm, TS estrito incremental, riscos Node de legado) e passa a aplicá-lo no projeto atual
---

Carregue **à força** e passe a aplicar os Padrões de Manutenção de Legado Node/TS da casa (skill `schematize-node`) neste projeto. A partir de agora, nesta sessão, isto **não é opcional** — respeitando que é **legado** (nada de reescrever o que funciona).

1. **Leia agora, na íntegra, TODOS os arquivos** de references da skill — não trabalhe de memória. Caminho: `.claude/skills/schematize-node/references/*.md` (projeto) ou `~/.claude/skills/schematize-node/references/*.md` (global). Com destaque para:
   - `padroes-codigo.md` — **regra escoteiro (escopo-diff + baseline)**: pisos valem no arquivo novo e no trecho tocado; o pré-existente é baseline que só decresce. Clean code, MAPA, índice.
   - `migracao-saida.md` — saída do Node: gatilho 30/50 mensurável e **não-bloqueante** (abre ADR, não força rewrite), strangler-fig, dono do dado, **concluir = deletar o Node antigo**.
   - `npm-dependencias.md` — mínimo de pacotes, direto vs transitivo, `overrides`, `--ignore-scripts`, SCA sustentável, respeitar o package manager existente.
   - `typescript-estilo.md` — `strict` no novo/tocado; `any`/`@ts-ignore` **novo** vetado, existente grandfathered; `@ts-expect-error`; JS→TS por etapas.
   - `riscos-node.md` — EOL/versão-piso, ESM/CJS, memória/event-loop, workers/streams, graceful shutdown, prototype pollution/ReDoS.
   - `arquitetura.md`, `seguranca.md`, `dados-eventos.md`, `cadeia-suprimentos.md`, `testes.md` + `testes-execucao.md`, `observabilidade.md`, `operacao.md` + `entrega.md`, `anti-padroes.md`, `contexto-claude-code.md`.
   - `stack-versoes.md` — números voláteis (limiares de deps, Node LTS).

2. **Confirme ao usuário** que leu, com **1 linha por arquivo** resumindo o piso central de cada um.

3. Deste ponto em diante, **aplique como regra inegociável — em modo escopo-diff**: rigor no código novo/tocado, baseline pro legado. **Nenhuma funcionalidade nova nasce em Node** (vai como módulo Go/Rust). Node que funciona e você não toca, fica.

4. **Atualize o `CLAUDE.md` da raiz** com a versão atual de `assets/CLAUDE.md` da skill — **sobrescreve mesmo se já existir** (backup `.bak` se houver customização). Se detectar `CLAUDE.md` de outra skill (go/rust/web) na raiz, **mescle por seção / avise** em vez de sobrescrever cego. É o mesmo que `/node-claude`.
