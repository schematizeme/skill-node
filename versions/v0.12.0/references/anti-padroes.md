# Filosofia, Aplicação Universal e Anti-Padrões Vetados


> **PONTEIRO, não cópia.** A normativa deste tema é da base: **`schematize-engineering`** →
> `references/anti-padroes.md`. Leia lá primeiro; aqui fica **só o que muda em Node/TypeScript**.
>
> **Onde este arquivo divergir da base, a BASE MANDA** (`SKILL.md` §"Precedência e herança").
> Em 2026-08-21 os blocos idênticos à base foram **podados mecanicamente** (`tools/podar-clone.mjs`),
> que é por que a numeração dos itens **salta**: o número é o da base, e o item que não aparece aqui
> é porque **não muda nesta linguagem** — procure-o lá. Manter a cópia era manter a próxima deriva
> (foi assim que o `argon2id-only` da casa virou "ou PBKDF2" numa skill e o rol de 6 linguagens
> virou "só Go e Rust" em três).

## 37. Anti-Padrões Vetados — "Macaquices" que Terminam Rápido e Quebram em Produção

### CORS, headers e superfície

12. **`Access-Control-Allow-Origin: *` em rota autenticada** (pior ainda com `allow-credentials`).
    → Allowlist explícita de origens (hardening; ver a `schematize-qa`, `references/categorias.md` §§5 e 10).

13. **Endpoint de debug/admin/management sem auth, ou bind em `0.0.0.0`** expondo porta interna.
    → Bind restrito, auth obrigatória, `/debug` e `/actuator` retornam 404 externamente (ver a `schematize-qa`, `references/categorias.md` §§5 e 10).

### Testes e cobertura

19. **Baixar o threshold de cobertura ou editar o gate** pra o número fechar.
    → Cobertura é contrato (ver a `schematize-qa`). Sobe escrevendo teste, não mexendo na régua.

### Operação e entrega

31. **Criar serviço backend novo em Node, ou qualquer código novo em PHP.**
    → Node **não recebe serviço backend novo** — ele é legado e sai pela regra dos ~30%/~50% (§3, §3.1); **Next.js/Astro no frontend seguem 100% permitidos**. O serviço novo nasce **no rol sancionado** (Go, Rust, Elixir, C#, Zig, Ruby) com **ADR (§27) de fit** — não "em Go/Rust" por default. PHP é proibido e migra. Rol e critérios em `schematize-engineering` -> `references/linguagens.md`.

35. **Editar código direto no servidor** (hml/prd), ou **subir mudança direto pra hml/prd** pulando `dev local → teste local → GitHub`.
    → Servidor é **imutável por edição manual**; recebe só artefato promovido do git. Hotfix segue o mesmo fluxo, acelerado (`schematize-engineering` -> `references/ops.md` §1).

36. **Operar o servidor por fora do `<projeto>_ops`** — `ssh` + comando ad-hoc, editar arquivo no servidor, `docker`/`kubectl`/`systemctl` na mão, script solto.
    → **100%** de install/update/config/correção passa por comando do ops. Não tem comando? **cria no ops** (`schematize-engineering` -> `references/ops.md` §2).

37. **Instalar/subir o sistema em série** ("um serviço de cada vez", 20 min).
    → Instalação **paralela por padrão** = `nproc` (`schematize-engineering` -> `references/ops.md` §3).

38. **Serializar a instalação pra "funcionar"**, mascarando que um serviço depende de outro pra subir.
    → Erro que só ocorre em paralelo = **serviços não independentes** (fere piso 10/6). O ops **expõe** a colisão; corrigir a independência é **prioridade máxima**. Nunca esconder com serialização (`schematize-engineering` -> `references/ops.md` §6).

39. **Redeploy que faz patch in-place / não parte do seed** (estado acumulado, drift entre implantações).
    → Todo redeploy é **destrutivo na app**: apaga a anterior e recria um clone zerado a partir de `/<app>/.env` (`schematize-engineering` -> `references/ops.md` §2). Idempotente e reprodutível.

40. **Config/segredo de serviço fora do seed global**, ou repos do sistema espalhados fora de `/<app>/`.
    → `/<app>/.env` é a **fonte única** de config; o ops clona os repos dentro de `/<app>/` (`schematize-engineering` -> `references/ops.md` §2).

41. **Apagar dados persistentes num redeploy** ("destrutivo" incluindo banco/volumes), ou `ops reset` de dados em prd.
    → Destrutivo é a **aplicação, nunca os dados**: banco/volumes/uploads preservados (migration reversível); apagar dado é `ops reset` **gated a dev/hml** (`schematize-engineering` -> `references/ops.md` §2).

42. **Dois serviços no mesmo user Linux, serviço rodando como `root`, ou criar user/unit/permissão à mão.**
    → **Um user + systemd unit hardened por serviço**, provisionado **pelo ops** (`schematize-engineering` -> `references/ops.md` §3). Blast radius mínimo.

### IAM legado (migração é prioridade 0)

43. **Deixar o auth legado Node/TS como está** — não portá-lo pro IAM da casa ("depois", "funciona", "é legado que não se mexe"). Auth não é Node comum: 1 fator, email como ID e logout que não invalida são **buracos de segurança ativos**, não estética.
    → **Migrar o auth legado é PRIORIDADE 0** — acima do gatilho normal de saída (30/50). Strangler-fig pro IAM da casa como **app separada** (Go/Rust, `auth.<domain>`), dual-run, corte por coorte, **concluído = auth legado deletado** (`references/iam.md` §7, §3.1).

44. **Manter o auth apensado ao monolith** (mesmo processo/user/deploy da app principal), assinando token com **HS256 e segredo no `.env` da app**, ou emitindo/renovando JWT no client.
    → Auth é **app SEPARADA** em `auth.<domain>` (serviço + front próprios, isolados); apps delegam por **OIDC/OAuth2.1 + PKCE** e validam por **JWKS público** — a chave de assinatura vive só no auth (`references/iam.md` §1).

45. **Email (ou telefone) como ID do usuário** (`users.email` é a PK), sem ID interno imutável; ou **1 fator só** (senha bcrypt, sem 2FA); ou deixar a senha bcrypt sem plano de re-hash.
    → **ID interno imutável** (ULID/UUIDv7); email/telefone são **identificadores** verificáveis (N por usuário, deduplicados na migração). **2FA baseline** (senha + Email OTP; passkey/TOTP como nudge + just-in-time, **nunca muro pré-login**); a migração **ativa o Email OTP baseline** (2FA sem muro); **re-hash preguiçoso** bcrypt→argon2id no login (`references/iam.md` §2, §3, §7).

46. **JWT / token de sessão / segredo em `localStorage`** (ou `sessionStorage`) no front do legado — XSS vira takeover.
    → Token em **cookie `HttpOnly` + `Secure` + `SameSite`**, nunca `localStorage`; na migração o **JWT sai do `localStorage`** (`references/iam.md` §6, §7). (Casa com o item *"segredo nunca no cliente"* desta mesma §37.)

47. **Confiar na authz legada** — a coluna `role`/`is_admin` da tabela `users` ou o `if (req.user.role===...)` inline no controller decidindo acesso; **ou logout que só apaga o cookie** (JWT/refresh legados seguem válidos).
    → Authz **re-derivada** no motor **ReBAC** (deny-default, PDP/PEP, token fino) — a coluna legada é, no máximo, **seed revisado**, nunca confiada. **Logout IRREVERSÍVEL:** revoga refresh+família, apaga sessão server-side, `jti` na denylist; **sessões legadas revogadas** no corte (`references/iam.md` §5, §6, §7).

### Efeitos externos (e-mail, SMS, push, webhook, cobrança)

48. **Mandar de verdade fora de produção** — `nodemailer`/SDK do provedor ligado por default em dev/hml, `@gmail.com` (ou o seu e-mail) em fixture/seed/persona, laço de teste criando N contas com **Email OTP always-on** e nenhum contador no caminho.
    → **Transport por ambiente** (`jsonTransport`/Mailpit fora de `prd`), **guard dentro do provider** (`ExternalRecipientBlockedError`, fail-closed quando a config falta), **cap por execução** (`MAIL_MAX_PER_RUN`) válido em TODOS os ambientes, e endereço sintético só em `test.<domain>` com **null MX** (`references/iam.md` §3.1; normativa em `schematize-engineering` → `references/efeitos-externos.md`). Bounce/complaint em massa **queima IP e domínio** e derruba o e-mail transacional de **produção** — inclusive o **OTP de login** —, com semanas de warm-up e utilidade zero. Não tem undo.
    *(Cite este anti-padrão **pelo título**, nunca por número: o mesmo `§37 item N` significa coisas diferentes em cada skill — ver a nota de numeração no topo.)*
