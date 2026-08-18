---
description: schematize-node — higiene de dependências npm/pnpm/yarn: contagem direto vs transitivo, npm audit com triagem, desatualizados, não-usados, licenças e EOL do Node; saída machine-readable
---

Rode a **auditoria de dependências e runtime** deste projeto Node e reporte de forma acionável. Detecte o package manager pelo lockfile (npm/pnpm/yarn) e use os comandos equivalentes.

Colete e reporte (idealmente via `scripts/node-audit.mjs`, saída JSON + resumo):

1. **Contagem de dependências (direto ≠ transitivo):**
   - Diretas de produção: `jq '.dependencies | length' package.json`.
   - Transitivas de produção: `npm ls --omit=dev --all` (ou `pnpm ls -r --prod`).
   - devDeps: sinal **separado** de supply-chain.
   - Compare com os limiares de `references/stack-versoes.md` (ordem de grandeza, não veredito cego). Sinalize *smell* de backend inchado.
2. **Vulnerabilidades:** `npm audit --omit=dev` (+ `osv-scanner` se disponível). Para cada **alta/crítica**: existe fix → sugerir `overrides`/`resolutions`; sem fix → marcar pra **ADR de risco time-boxed** + allowlist. **Não** proponha desligar o gate; proponha triagem por alcançabilidade.
3. **Desatualizados:** `npm-check-updates` (ncu) — separe patch/minor (seguros, batch) de major (ADR).
4. **Não-usados / mortos:** `knip` ou `depcheck` — deps e exports/arquivos sem uso a remover.
5. **Licenças:** `license-checker` contra a allowlist de `stack-versoes.md`; bloqueie sem-licença/copyleft forte não aprovado.
6. **Runtime:** versão do Node em uso vs LTS suportada; **EOL = brecha de segurança** (reporte como bloqueante), `engines`/`.nvmrc` presentes.
7. **Supply-chain de instalação:** `.npmrc` com `ignore-scripts=true`? `save-exact`? lockfile commitado?

Termine com um **veredito escopo-diff**: o que **trava CI** (audit alta sem allowlist, Node EOL, licença proibida) vs. o que é **dívida registrada** (contagem alta, desatualizados) a reduzir por ADR — sem reprovar o projeto por dívida pré-existente que não veio no diff.
