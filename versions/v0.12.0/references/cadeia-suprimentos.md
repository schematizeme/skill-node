# cadeia suprimentos — recorte Node/TypeScript

> **PONTEIRO, não cópia.** A normativa deste tema é da base: **`schematize-engineering`** →
> `references/cadeia-suprimentos.md`. Leia lá primeiro; aqui fica **só o que muda em Node/TypeScript**.
>
> **Onde este arquivo divergir da base, a BASE MANDA** (`SKILL.md` §"Precedência e herança").
> Este arquivo era um clone com **100%** de conteúdo
> idêntico à base — deriva por cópia foi o achado da Classe C da vistoria de 2026-08-21, e ela
> já tinha atingido piso de segurança (o `argon2id-only` da casa virou "ou PBKDF2" numa skill,
> o rol de 6 linguagens virou "só Go e Rust" em três). Manter uma cópia é manter a próxima deriva.
O piso da base vale integralmente. **O recorte npm — que é o que muda aqui — mora em
`references/npm-dependencias.md`** desta skill: `npm ci` com lockfile commitado (nunca `npm i` no
CI), `--ignore-scripts` como default e a allowlist de pacotes que realmente precisam de
`postinstall`, verificação de **provenance**/atestação quando o registry publica, pin por range
fechado em dependência sensível, e os limiares de higiene medidos por `/node-audit`.

*(Este arquivo era cópia byte a byte da base — e por isso falava de `cargo audit` e `govulncheck`
numa skill de npm, achado C3 da vistoria de 2026-08-21.)*
