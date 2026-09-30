# seguranca — recorte Node/TypeScript

> **PONTEIRO, não cópia.** A normativa deste tema é da base: **`schematize-engineering`** →
> `references/seguranca.md`. Leia lá primeiro; aqui fica **só o que muda em Node/TypeScript**.
>
> **Onde este arquivo divergir da base, a BASE MANDA** (`SKILL.md` §"Precedência e herança").
> Este arquivo era um clone com **96%** de conteúdo
> idêntico à base — deriva por cópia foi o achado da Classe C da vistoria de 2026-08-21, e ela
> já tinha atingido piso de segurança (o `argon2id-only` da casa virou "ou PBKDF2" numa skill,
> o rol de 6 linguagens virou "só Go e Rust" em três). Manter uma cópia é manter a próxima deriva.
_O piso de segurança da base vale integralmente em Node/TypeScript; nada aqui muda de forma._

**Fronteira:** as regras de segurança de **frontend** (token em cookie `HttpOnly` e nunca em
`localStorage`, CSP e headers, `dangerouslySetInnerHTML`, open redirect) são da
`schematize-web` → `references/seguranca.md` §43 — não desta skill. Este arquivo trazia uma
cópia delas, que é como a mesma regra passa a existir em dois lugares e diverge.

## O que muda em Node

- **CSPRNG é `node:crypto`.** Token, `state`/`nonce` de OIDC, id de sessão, código de OTP, salt e
  link de reset saem de **`crypto.randomBytes(n)`**, **`crypto.randomUUID()`** ou
  **`crypto.webcrypto.getRandomValues()`** — **nunca `Math.random()`**, que é um PRNG comum
  (previsível a partir da saída) e nem sequer promete distribuição uniforme entre engines. Para
  índice aleatório sem viés de módulo, `crypto.randomInt(min, max)`.
  *(A regra agnóstica está na base — `schematize-engineering` -> `references/iam.md`, "Transversais";
  esta seção existe porque a versão anterior deste arquivo prescrevia **`crypto/rand`**, que é o
  pacote do **Go**. Idioma de outra linguagem numa skill é o rastro da cópia entre irmãs.)*
- **Comparação de segredo em tempo constante:** `crypto.timingSafeEqual(a, b)` (exige `Buffer`s do
  **mesmo tamanho** — compare hashes, não os valores crus).
- **Hash de senha:** `argon2` (a lib nativa); o `crypto.scrypt` do stdlib só como legado a migrar.
