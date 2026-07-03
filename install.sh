#!/usr/bin/env bash
# install.sh — instala a skill schematize-node no projeto atual (Claude Code).
# Motivo: instalar a skill de manutenção de legado Node/TS sem passos manuais.
# Como funciona: copia o corpo pra .claude/skills/schematize-node/ e os comandos
# (node-*, únicos) ACHATADOS em .claude/commands/. Idempotente.
# Entrada: $1 opcional = projeto alvo (default: diretório atual). $1 = ~ instala global.
set -euo pipefail
SKILL_NAME="schematize-node"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${1:-$PWD}"
SKILL_DIR="$DEST/.claude/skills/$SKILL_NAME"
CMD_DIR="$DEST/.claude/commands"
mkdir -p "$SKILL_DIR" "$CMD_DIR"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude .git --exclude versions --exclude install.sh \
        --exclude README.md --exclude LICENSE "$SRC"/ "$SKILL_DIR"/
else
  ( cd "$SRC" && tar --exclude=.git --exclude=versions --exclude=install.sh \
      --exclude=README.md --exclude=LICENSE -cf - . ) | ( cd "$SKILL_DIR" && tar -xf - )
fi
if [ -d "$SKILL_DIR/assets/commands" ]; then
  cp "$SKILL_DIR"/assets/commands/*.md "$CMD_DIR"/ 2>/dev/null || true
fi
echo "✓ $SKILL_NAME instalada em $SKILL_DIR"
echo "✓ comandos em $CMD_DIR (use /node-help para listar)"
