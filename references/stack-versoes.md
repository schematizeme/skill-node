# Anexo A — números voláteis (limiares e versões)

> Parte da skill **schematize-node**. **Fonte volátil** — versões e limiares mudam. Atualize aqui (revisão trimestral) sem mexer no corpo normativo. **Verificado em: 2026-10-14**. Sempre confirme o número atual antes de aplicar como gate.
> Conferido em 2026-10-14 no `nodejs.org/dist/index.json` e no `schedule.json` oficial (`github.com/nodejs/Release`): **LTS Active = 24 (Krypton, 24.21.0)**, que entra em *Maintenance* em 2026-10-20 (EOL 2028-04-30); **22 (Jod, 22.23.3)** em *Maintenance* (EOL 2027-04-30); **26 (26.11.1) é *Current*, ainda NÃO-LTS — vira LTS em 2026-10-28** (EOL 2029-04-30); **20 (Iron) está em EOL desde 2026-04-30** e 18 (Hydrogen) desde 2025-04-30 — rodar neles é brecha sem patch. 25 foi *Current* ímpar (EOL 2026-06-01). Releia o `schedule.json` antes de pinar: as datas mudam o que é "LTS alvo".

## Node runtime

- **LTS suportada alvo:** a LTS "Active"/"Maintenance" corrente do Node (ver <https://nodejs.org/en/about/previous-releases>). Rodar em versão **fora de suporte** = piso de segurança violado (CVE sem patch).
- `engines.node` pinado; imagem base por digest. `scripts/node-audit.mjs` carrega uma tabela de EOL por major (`RUNTIME_EOL`): atualize-a junto deste anexo.
- Recursos que exigem versão mínima (piso antes de usar): `fetch` global e `node:test` (Node ≥18), type-stripping de TypeScript (Node ≥22 atrás da flag `--experimental-strip-types`; **ligado por DEFAULT desde a 22.18 / 23 — a flag virou desnecessária** e citá-la faz parecer experimental o que já é padrão) — e **atenção**: type stripping só apaga sintaxe **apagável**, então `enum`, `namespace` e **parameter properties** (`constructor(private x: T)`) NÃO rodam; use `erasableSyntaxOnly` (TS ≥5.8) para o compilador cobrar isso, `structuredClone` (≥17).

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

`knip`, `depcheck`, `npm-check-updates`, `syncpack`, `osv-scanner`, `madge`, `size-limit`,
`ast-grep`/`jscodeshift` (codemod), `type-coverage`, `zod`/`valibot`, `pino`,
`@opentelemetry/auto-instrumentations-node`.

> **Ferramentas que saíram desta lista, e por quê** (✔ verificado em 2026-08-21) — a lista de
> ferramental é o lugar onde a skill mais rápido passa a recomendar coisa morta:
>
> - **`ts-migrate`**: parado. Codemod abandonado num repo legado é pior que nenhum — você revisa o
>   diff dele sem ninguém para consertar o que ele errar.
> - **`ts-morph` e `type-coverage` dependem da API programática do compilador TypeScript**, que
>   **não está exposta no TS 7** (a reescrita nativa; a API programática só chega na 7.1). Se você
>   subir para o TS 7, essas ferramentas **param** — planeje a catraca de tipos contando com isso, ou
>   fique no 6.x até a API voltar. É exatamente o tipo de restrição que dá para descobrir agora ou
>   no dia do upgrade.
>
> **Lint (✔ verificado em 2026-10-14, `npm view`):** ESLint corrente **10.x** (a flat config de
> `assets/lint/eslint.config.mjs` roda em 9+ e foi exercitada na 10); `typescript-eslint` 8.x declara
> peer `typescript >=4.8.4 <6.1.0` — ou seja, **TypeScript 7.0.x (corrente) ainda não é suportado pelo
> typescript-eslint**; mantenha o 6.0.x no projeto que usa lint type-aware.
