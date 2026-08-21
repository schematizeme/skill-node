# padroes codigo — recorte Node/TypeScript

> **PONTEIRO, não cópia.** A normativa deste tema é da base: **`schematize-engineering`** →
> `references/padroes-codigo.md`. Leia lá primeiro; aqui fica **só o que muda em Node/TypeScript**.
>
> **Onde este arquivo divergir da base, a BASE MANDA** (`SKILL.md` §"Precedência e herança").
> Este arquivo era um clone com **92%** de conteúdo
> idêntico à base — deriva por cópia foi o achado da Classe C da vistoria de 2026-08-21, e ela
> já tinha atingido piso de segurança (o `argon2id-only` da casa virou "ou PBKDF2" numa skill,
> o rol de 6 linguagens virou "só Go e Rust" em três). Manter uma cópia é manter a próxima deriva.
## 0. Regra escoteiro (escopo-diff + baseline) — específico de legado

Este é **código legado**: não se traz o repositório inteiro ao padrão num PR de fix. Portanto **todos os pisos deste arquivo** (teto de 750 linhas/arquivo com flag em >300 úteis, uma função/arquivo, doc-comment, MAPA/índice) valem para:

- **(1) arquivo NOVO**, e **(2) o TRECHO que você efetivamente alterou** ("boy-scout": deixe um pouco melhor o que tocou).

Você **não** é obrigado a quebrar/documentar/reformatar o arquivo ou módulo inteiro só porque encostou nele. O **pré-existente** é um **baseline (dívida registrada) que só pode decrescer** — o gate mede o **diff**, nunca reprova um PR por dívida que já estava lá. Reformatação global = **PR isolada só-de-formatação** com `.git-blame-ignore-revs`. (Em green-field Go/Rust os pisos valem no arquivo todo; aqui, por ser legado, valem no que você toca.)
