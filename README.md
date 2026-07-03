# schematize-node

> **Manutenção de legado Node.js/TypeScript** e saída gradual para Go/Rust — sem reescrever o que funciona. Pacote de **skill normativa para [Claude Code](https://claude.com/claude-code)**. Parte do catálogo **schematize skills**.

Esta skill é de **manutenção**, não de green-field: **Node backend está em saída**, funcionalidade nova nasce em Go/Rust (`skill-go`/`skill-rust`); frontend Node é do `skill-web`. Quase tudo é **escopo-diff** (só no que você toca).

## Instalar

```bash
git clone https://github.com/schematizeme/skill-node.git
cd skill-node && ./install.sh            # no projeto atual
# ./install.sh ~                          # global (~/.claude, todos os projetos)
```

Ou baixe o `.zip` da última release e descompacte em `.claude/skills/`:

```bash
curl -L -o schematize-node.zip \
  https://github.com/schematizeme/skill-node/releases/latest/download/skill-node.zip
unzip schematize-node.zip -d .claude/skills/
```

| Versão | Data | Download | Fonte | Notas |
|---|---|---|---|---|
| **0.2.0** (beta) | 2026-06-27 | [release](https://github.com/schematizeme/skill-node/releases/download/v0.2.0/skill-node.zip) | [v0.2.0.zip](https://github.com/schematizeme/skill-node/archive/refs/tags/v0.2.0.zip) | [CHANGELOG](CHANGELOG.md) |

## Comandos

`/node-help` `/node-load` `/node-claude` `/node-audit` `/node-migrate-status` `/node-review` `/node-cc` `/node-handoff` `/node-qa` `/node-index` — todos prefixados `node-`, sem conflito com go/rust/web.

## Skills irmãs

- [skill-go](https://github.com/schematizeme/skill-go) · [skill-rust](https://github.com/schematizeme/skill-rust) · [skill-web](https://github.com/schematizeme/skill-web)

## Licença

[MIT](LICENSE) © 2026 schematizeme.
