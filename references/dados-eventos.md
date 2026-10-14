# dados eventos — recorte Node/TypeScript

> **PONTEIRO, não cópia.** A normativa deste tema é da base: **`schematize-engineering`** →
> `references/dados-eventos.md`. Leia lá primeiro; aqui fica **só o que muda em Node/TypeScript**.
>
> **Onde este arquivo divergir da base, a BASE MANDA** (`SKILL.md` §"Precedência e herança").
> Este arquivo era um clone com **100%** de conteúdo
> idêntico à base — deriva por cópia foi o achado da Classe C da vistoria de 2026-08-21, e ela
> já tinha atingido piso de segurança (o `argon2id-only` da casa virou "ou PBKDF2" numa skill,
> o rol de 6 linguagens virou "só Go e Rust" em três). Manter uma cópia é manter a próxima deriva.
- **Operar/migrar Postgres tem dona:** `schematize-postgres` → `references/locks-e-migrations.md` (migration segura, expand-contract, lock_timeout) e `references/pooling.md` (pool/PgBouncer, dimensionamento). Desenho de schema: `schematize-database`.
- **Contrato de API tem dona:** `schematize-api` → `references/contrato-rest.md` (OpenAPI 3.1 contract-first, erros), `references/idempotencia.md` (`Idempotency-Key`) e `references/versionamento-deprecacao.md` (`Deprecation`/`Sunset`); aqui só o recorte da linguagem.

_Nada nesta área muda em Node/TypeScript: o piso da base vale integralmente._
