---
description: schematize-node — cria ou ATUALIZA (sobrescreve) o CLAUDE.md da raiz com a versão atual da skill; mescla/avisa se já houver CLAUDE.md de outra skill (go/rust/web); backup se houver customização
---

Sincronize o **`CLAUDE.md` da raiz** deste repositório com a versão **atual** da skill `schematize-node`.

1. Localize `assets/CLAUDE.md` da skill: `.claude/skills/schematize-node/assets/CLAUDE.md` (projeto) ou `~/.claude/skills/schematize-node/assets/CLAUDE.md` (global).
2. **Repo multi-linguagem (comum):** se o `CLAUDE.md` da raiz já contém o bloco de **outra skill** (go/rust/web), **não sobrescreva cego** — os `CLAUDE.md` são **complementares por fronteira** (node = backend legado; go/rust = backend novo; web = frontend). **Mescle por seção** (adicione/atualize só o bloco do schematize-node) e avise o que mudou.
3. **Se já existe um `CLAUDE.md` só do schematize-node:** sobrescreva pela versão atual; se tiver customização local fora do template, salve `./CLAUDE.md.bak` e reaplique por cima.
4. **Se não existe:** crie a partir do `assets/CLAUDE.md` da skill.
5. Confirme ao usuário: caminho, se sobrescreveu/mesclou, e se gerou backup.

Este é o jeito **explícito de atualizar um `CLAUDE.md` que já existe** — rodar não pode deixar a versão antiga. Num repo com Node + Go/Rust + Web, espere **um `CLAUDE.md` com seções por skill** (rode `/go-claude`/`/rust-claude`/`/web-claude` para as demais).
