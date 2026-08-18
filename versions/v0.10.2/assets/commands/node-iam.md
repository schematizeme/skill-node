---
description: schematize-node — audita/planeja a migração de auth legado Node/TS para o IAM da casa (app separada, prioridade 0, strangler-fig); mapeia users→ID interno, re-hash preguiçoso, força 2º fator, revoga sessões legadas, re-deriva authz
argument-hint: "[audit | plan | migrate]"
---

Governe a migração de auth pelo padrão IAM da casa (`references/iam.md`). Plan-first:
**audita o auth legado, mostra o plano de corte, pede aprovação, então executa faseado.**
No ângulo do node quase nunca é "scaffold do zero": o projeto **já tem** um auth legado
Node/TS (Passport/express-session/JWT-no-`localStorage`/bcrypt/email-como-ID/1 fator/authz
por coluna/monolith) e **portá-lo pro IAM da casa é PRIORIDADE 0** — acima do gatilho normal
de saída do Node (30/50, §3.1). Não se escreve auth Node novo: o auth-alvo nasce **app
separada** em Go/Rust (`schematize-go`/`rust`).

## 0. Modo
- `audit` — varre o legado e reporta o gap contra o piso IAM (checklist §iam) + o inventário
  do auth antigo (§1 abaixo). É o default.
- `plan` — monta o **plano strangler-fig** de corte (ordem, coortes, flags, rollback).
- `migrate` — executa o corte faseado (dual-run) já aprovado.

## 1. Auditoria do auth legado (o que procurar — sempre primeiro)
Varra e reporte, arquivo:linha, o perfil do legado (`references/iam.md` §0):
- **Monolith:** o auth está apensado à app principal (mesmo processo/user/deploy)? — VETADO no alvo.
- **Token:** JWT em `localStorage`/`sessionStorage`? Assinado HS256 com **segredo no `.env` da app**?
  Emitido/renovado no client? (grep: `jsonwebtoken`, `jwt.sign`, `localStorage`, `HS256`.)
- **Identidade:** **email é a PK** de `users`? Falta ID interno imutável? Emails duplicados?
- **Hash:** `bcrypt` (cost?), ou SHA1/MD5 herdado? **1 fator só** (sem 2FA/TOTP/passkey)?
- **Authz:** coluna `role`/`is_admin` + `if (req.user.role===...)` inline no controller? Sem motor, sem deny-default?
- **Sessão/logout:** "15 min e é chutado" ou sessão eterna? **Logout que só apaga o cookie**
  (JWT/refresh seguem válidos)? (grep: `express-session`, `res.clearCookie`, `passport`.)

## 2. Alvo (inegociável) — o IAM que a migração alcança
Confirme/scaffolde o auth-alvo como **aplicação SEPARADA** (`references/iam.md` §1):
- Serviço próprio `<projeto>_auth_<lang>` (**Go/Rust, nunca Node novo**) + front `<projeto>_authfront`,
  em **`auth.<domain>`** — user Linux + systemd isolados (casa com `ops.md` §3). Monolith apensado = VETADO.
- App principal (o monolith Node) e clientes **delegam por OIDC/OAuth2.1 + PKCE**; a chave de
  assinatura só no auth, o Node passa a **validar por JWKS público** (fim do HS256 no `.env`).
- **ID interno imutável** (ULID/UUIDv7); **email/telefone nunca são ID**; N emails por usuário.
- **≥2 fatores** (passkey/WebAuthn no núcleo; TOTP/push; **email OTP Resend always-on**; **Twilio**);
  senha **argon2id**+HIBP, opcional no seletor; invariante de troca "fator Y≠X no maior AAL"; recuperação ≥ login.
- **Multi-tenant ReBAC** (OpenFGA/SpiceDB), deny-default, PDP/PEP, enforcement server-side, token fino, decisão auditada.
- **Multi-dispositivo** + view de remover; **sessão 7d/90d**; **logout IRREVERSÍVEL** (revoga refresh+família,
  apaga sessão server-side, `jti` na denylist — não só cookie); **JWT sai do `localStorage`**.

## 3. Plano strangler-fig (prioridade 0, nunca big-bang) — a ordem de corte
Monte/execute na ordem (`references/iam.md` §7), dual-run atrás do edge de auth, com feature
flag por coorte e **rollback** sempre à mão:
1. **Edge de auth na frente:** IdP novo em `auth.<domain>`; **login passa a nascer no novo**; rotas não-migradas caem no legado.
2. **Mapeia `users` legados → modelo novo:** lê a tabela por **ACL/read-only (nunca banco compartilhado)**,
   **dedupe de emails**, **cunha ID interno imutável**, marca emails como não verificados.
3. **Re-hash preguiçoso:** no 1º login valida no bcrypt legado e **re-deriva em argon2id** (nunca migra hash em massa — é one-way).
4. **1º login pós-migração: nudge + step-up** — nunca bloqueia o acesso por falta de fator forte (senha+Email OTP já é o baseline; não recrie o deadlock de bootstrap).
5. **Revoga TODAS as sessões legadas** (denylist + apaga o store de sessão) — não se confia em sessão emitida pelo legado.
6. **Re-deriva a authz:** a coluna `role`/`is_admin` é, no máximo, **seed revisado** das tuplas ReBAC; o `if` inline sai do controller.
7. **Move a assinatura de token pro auth novo** (JWKS); quando nenhuma rota depende do auth embutido, **DELETA o auth legado do monolith**.

**Invariantes:** paridade provada por **golden/contract tests** (decisão legada vs. nova em
shadow) antes de virar a chave; **sem banco compartilhado** (ACL/import one-shot); a migração
só termina quando **o Node de auth é apagado** (casa com `migracao-saida.md`).

## 4. Testes (dispare o gate do pentest — contra os DOIS até o corte)
Rode a rotina agressiva (`schematize-pentest`) contra legado **e** novo: **cross-tenant
(BOLA/IDOR), priv-esc (BFLA), abuso de fluxo** — e, específico da migração: **JWT legado que
segue válido após logout**, **sessão legada que sobreviveu ao corte**, mass-assignment de papel
a partir da coluna legada, bypass do enrolamento forçado do 2º fator. Gate que trava em vazamento. Ver `/pentest-authz`.

## 5. Saída
Grave o plano/relatório em `<projeto>_archive/` (§28): inventário do auth legado (§1, arquivo:linha),
gaps do checklist IAM (`references/iam.md`), o **mapa legado→novo** (schema `users`→identidade+identificadores),
a **ordem de corte por coorte** e o critério de "concluído = auth legado deletado". Confirme: auth-alvo é app
à parte (Go/Rust)? `users`→ID interno (email≠ID, deduplicado)? re-hash preguiçoso + JWT fora do `localStorage`?
2º fator forçado + sessões legadas revogadas? authz re-derivada no ReBAC (não confia na coluna)? sessão longa +
logout irreversível? paridade provada antes do cutover? testes cross-tenant no CI? **Prioridade 0** — não deixe o legado como está.
