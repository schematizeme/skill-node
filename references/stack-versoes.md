# Anexo A — números voláteis (limiares e versões)

> Parte da skill **schematize-node**. **Fonte volátil** — versões e limiares mudam. Atualize aqui (revisão trimestral) sem mexer no corpo normativo. **Verificado em: 2026-08-21**. Sempre confirme o número atual antes de aplicar como gate.
> Conferido no `nodejs.org/dist/index.json` nesta data: **LTS Active = 24.19.0 (Krypton)**; 22.23.2 (Jod) em manutenção; **26.7.0 é *Current*, NÃO-LTS** (vira LTS em out/2026); 20 (Iron) e 18 (Hydrogen) fora da janela recomendada.

## Node runtime

- **LTS suportada alvo:** a LTS "Active"/"Maintenance" corrente do Node (ver <https://nodejs.org/en/about/previous-releases>). Rodar em versão **fora de suporte** = piso de segurança violado (CVE sem patch).
- `engines.node` pinado; imagem base por digest.
- Recursos que exigem versão mínima (piso antes de usar): `fetch` global e `node:test` (Node ≥18), `--experimental-strip-types`/type-stripping (Node ≥22; ligado por padrão a partir do 23) — e **atenção**: type stripping só apaga sintaxe **apagável**, então `enum`, `namespace` e **parameter properties** (`constructor(private x: T)`) NÃO rodam; use `erasableSyntaxOnly` (TS ≥5.8) para o compilador cobrar isso, `structuredClone` (≥17).

## Limiares de dependências (sinal de saúde, não veredito cego)

Medidos por `/node-audit`. **Direto ≠ transitivo.**

| Sinal | Como medir | Limiar de *smell* (backend) | Front |
|---|---|---|---|
| Diretas de produção | `jq '.dependencies\|length' package.json` | **> ~40** olhar; justificar cada família | mais tolerante |
| Transitivas de produção | `npm ls --omit=dev --all` | **ordem de centenas alta → reduzir/ADR** | mais tolerante |
| devDeps | `jq '.devDependencies\|length'` | sinal **separado** de supply-chain | idem |

> Os números redondos "200 = lixo / 100 = questionável" do rascunho eram sobre **transitivo** e sem calibragem — trate-os como **ordem de grandeza**, não gate exato. Calibre com serviços reais da casa e registre o limiar efetivo aqui.

## Gatilho de migração (saída do Node)

- **~30%** das funcionalidades do módulo afetadas numa mudança → abre **ADR de extração** (não bloqueia o PR). **~50%** já extraído → priorizar concluir, incrementalmente. Ajuste por ADR por módulo. Ver `references/migracao-saida.md`.

## Licenças

- **Allowlist** (permitidas sem revisão): MIT, ISC, BSD-2/3-Clause, Apache-2.0, 0BSD, Unlicense, CC0.
- **Revisão obrigatória / evitar:** copyleft forte (GPL/LGPL/AGPL) em código distribuído; pacote **sem licença** é bloqueado. `license-checker` no `/node-audit`.

## Ferramental (versões correntes — confirme)

`knip`, `depcheck`, `npm-check-updates`, `syncpack`, `osv-scanner`, `madge`, `size-limit`, `ts-migrate`, `ts-morph`, `type-coverage`, `zod`/`valibot`, `pino`, `@opentelemetry/auto-instrumentations-node`.
