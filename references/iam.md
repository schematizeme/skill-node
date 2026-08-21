# IAM — Identidade e Autorização da casa (piso inegociável) · recorte node

Piso normativo de **identidade, autenticação e autorização**. **Todo projeto começa com um
IAM robusto por desenho** — segurança é inegociável. Aqui o normal é o oposto: o projeto
**já tem** um auth legado que nasceu sem esse piso. A regra da casa então é direta:
**migrar esse auth para o IAM (como app separada) é a prioridade máxima** — acima de
qualquer outra saída do Node (§3.1 da skill), porque é segurança, não estética.

Princípios-âncora (o alvo): **separar identidade de autorização**; **nunca menos de 2
fatores**; **recuperação tão forte quanto o login**; **deny-by-default**; **enforcement
sempre no servidor**. O buraco clássico do legado Node é ter 2FA no login e um reset por 1
email que passa por cima — aqui isso é vetado.

## 0. O legado típico que você vai encontrar (e por que migra)

Perfil recorrente de auth legado Node/TS — cada item é dívida de segurança, não gosto:

- **Passport / express-session / `jsonwebtoken`** com o auth **apensado ao monolith** (mesma
  app, mesmo processo, mesmo user Linux). Comprometer a app = comprometer o IdP.

- **JWT no `localStorage`** (ou token de sessão no client), assinado com **HS256 e segredo
  no `.env` da app**, muitas vezes lido/renovado no front — XSS vira takeover.

- **Email como chave primária** (`users.email` é o ID), sem ID interno; trocar email =
  reescrever FKs; dois cadastros do mesmo humano viram duas identidades.

- **`bcrypt`** (às vezes cost baixo, às vezes SHA1/MD5 herdado), **sem 2FA** — 1 fator só.

- **Coluna `role`/`is_admin`** na tabela `users` decidindo tudo; authz espalhada em `if`
  no controller (`if (req.user.role === 'admin')`), sem motor, sem deny-default.

- **Sessão curta e brutal** ("15 min e é chutado") **ou** sessão eterna sem revogação;
  **logout que só apaga o cookie** (o JWT continua válido até expirar; refresh não some).

Nada disso se "melhora no lugar" a esconso. O caminho é **portar para o IAM da casa** —
que nasce **app separada** (§1) — pela estratégia strangler-fig (§7). Não se escreve um
auth novo em Node: o auth-alvo é serviço próprio numa linguagem do rol sancionado, escolhida por fit + ADR (`schematize-engineering` → `references/linguagens.md`).

## 1. Topologia — auth é uma APLICAÇÃO SEPARADA (o alvo da migração)

- **Microserviço de auth** (`<projeto>_auth_<lang>`, nasce em **Go/Rust**, nunca Node novo)
  + **front de auth** próprio (`<projeto>_authfront`), com **repo, deploy, user Linux e
  systemd/container isolados**. Comprometer a app Node legada **não** compromete o IdP.

- **O app principal (o monolith Node, e todo cliente) passa a delegar ao auth por
  OIDC/OAuth2.1 + PKCE:** redireciona pra `auth.<domain>`, recebe tokens de volta. O
  serviço de auth é o **IdP da casa** (self-hosted, consumido por N apps).

- **Segredos e chave de assinatura de token vivem SÓ no serviço de auth**; a app Node passa
  a **validar por JWKS público** (fim do segredo HS256 no `.env` da app), nunca guarda a
  chave privada.

## 2. Modelo de identidade (para onde os `users` legados migram)

- **ID interno imutável e opaco** (ULID/UUIDv7) é o `sub`. **Email e telefone NUNCA são
  ID** — são *identificadores* ligados ao usuário, cada um com estado de verificação. No
  legado o email era a PK; a migração **cunha um ID interno** e vira o email em
  identificador (§7).

- **Identificador só vale verificado** — não loga nem recupera sem verificação. Registros
  legados sem verificação viram identificador **não verificado** até o 1º login pós-migração.

## 3. Fatores e níveis de garantia (AAL — NIST 800-63B)

O legado tem 1 fator (senha bcrypt). O alvo classifica a **força** de cada fator para dar
"email sempre disponível" sem abrir mão de segurança:

| Tier | Fatores | Uso |
|---|---|---|
| **Alto (phishing-resistant)** | **Passkey/WebAuthn (núcleo)**, chave FIDO2, push aprovado no app | Ops sensíveis: trocar fator, admin, cross-tenant, billing, recuperação |
| **Médio** | TOTP (app autenticador), senha + posse | Login + 2º fator |
| **Baixo (fallback)** | **Email OTP (Resend)**, **SMS/voz (Twilio)** | Sempre disponível; **não** autoriza ação sensível sozinho |

- **Email OTP (Resend) ligado por padrão, inclusive em HML** — só o operador desliga.
  **Ligado ≠ entregando pra fora:** em `prd` o transporte é o real; **fora de `prd` o default é
  o SINK** (`jsonTransport`/Mailpit) e o guard recusa destinatário fora do domínio de teste
  (§3.1) — inclusive no script de migração, que é justamente o que toca 5.000 `users` de uma vez.

- **Senha por padrão, opcional por escolha:** o usuário **cria senha no cadastro**
  (**argon2id** + verificação contra base de vazadas/HIBP), mas o **seletor de modos de
  autenticação permite marcá-la como opcional** e viver de passkey/OTP/app. A senha legada
  em **bcrypt vira argon2id por re-hash preguiçoso** no 1º login (§7).
  > **Parâmetros mínimos (`m` ≥ 19 MiB, `t` ≥ 2, `p` = 1, salt ≥ 16 B CSPRNG, string codificada
  > guardada inteira, re-hash preguiçoso):** na base — `schematize-engineering`, seu
  > `references/iam.md`, seção **2.1 ("Hash de senha — argon2id com parâmetros MÍNIMOS")**.
  > **Nenhuma das 8 skills fixava os números** até 2026-08-21 — e argon2id mal parametrizado é
  > mais fraco que bcrypt bem configurado. Calibre para ~0,5–1 s no hardware do auth e registre
  > o valor medido no ADR do serviço; o default da lib normalmente é o mais fraco. No `argon2` (node), `memoryCost`/`timeCost`/`parallelism` explícitos; o default fica abaixo do piso.

  > **O Email OTP É o 2º fator baseline da conta** (senha + OTP já é 2FA, fraco porém válido) —
  > frase que existe nas outras 7 skills e faltava aqui. Ele fica **always-on, inclusive em HML**;
  > só o operador desliga. Não autoriza ação sensível sozinho: aí exige step-up forte.

- **Passkey/WebAuthn é núcleo** (não roadmap): já é "2 fatores num", phishing-resistant.

- **2FA baseline desde o corte — senha + Email OTP JÁ é 2FA:** o legado costuma ter 1 fator
  (senha); a migração **ativa o Email OTP always-on como 2º fator baseline**, e a conta migrada
  já entra em **2FA sem muro**. Fator forte (passkey/TOTP) é **nudge + just-in-time** (step-up
  na 1ª ação sensível), **nunca bloqueio do login** — barrar o acesso até enrolar um fator forte
  é o **círculo infinito VETADO** (§7).

### 3.1 Efeito externo fora de `prd` — sink por default e guard no `sendMail`

O OTP é o fluxo que **mais amplifica envio**: um script de migração que toca 5.000 `users`
legados dispara 5.000 e-mails. **Ligado ≠ entregando pra fora.** Em `prd` o transporte é o real
(sem credencial o processo **falha no boot** — não cai em sink silencioso); em **qualquer outro
ambiente** o transporte é **sink** (`jsonTransport`/`streamTransport` do nodemailer, ou o SMTP do
Mailpit) e o **guard envelopa o `sendMail`**. O porquê (bounce/complaint em massa queima IP e
domínio e **derruba o OTP de produção**, com semanas de warm-up e utilidade zero) e as 4 camadas
estão na normativa: `schematize-engineering` → `references/efeitos-externos.md`. Aqui vai só o
**recorte Node/TS**.

> **Legado em saída NÃO ganha desconto de piso.** A regra escoteiro (SKILL.md) vale para piso de
> **qualidade** — tipagem, tamanho de arquivo, doc-comment, formatação: aplicados ao que você
> toca. **Piso de segurança e de efeito externo não é escopo-diff:** o e-mail do monolith Node
> legado queima **o mesmo IP e o mesmo domínio** que o do serviço Go novo, e derruba o **OTP de
> produção** dos dois. Aqui a varredura é **repo-wide e imediata**: todo `sendMail`/SDK de envio
> passa a sair pelo guard, mesmo em arquivo que você não ia tocar. Este é um dos poucos itens em
> que o legado é trazido ao padrão **antes** de ser tocado por outro motivo.

#### Camada 1 — transporte por ambiente (uma vez, na composição)

```ts
// src/mail/transport.ts — o ÚNICO lugar do repo que chama nodemailer.createTransport.
import nodemailer, { type Transporter } from "nodemailer";

export type AppEnv = "dev" | "hml" | "prd";

/** Fail-closed: só a string exata "prd" liga o transporte real. Ausente/desconhecida ⇒ "dev". */
export function appEnv(raw: string | undefined = process.env.APP_ENV): AppEnv {
  if (raw === "prd") return "prd";
  if (raw === "hml") return "hml";
  return "dev";
}

/** Config obrigatória de produção: ausente ⇒ o processo NÃO sobe (nunca vira sink calado). */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`config obrigatória ausente: ${name} (APP_ENV=prd)`);
  return value;
}

export function buildTransport(env: AppEnv): Transporter {
  if (env === "prd") {
    return nodemailer.createTransport({
      host: required("SMTP_HOST"),
      port: Number(required("SMTP_PORT")),
      secure: true,
      auth: { user: required("SMTP_USER"), pass: required("SMTP_PASSWORD") },
    });
  }
  // Mailpit/MailHog local: caixa de verdade, com API HTTP em :8025 pro teste LER o OTP.
  if (process.env.MAILPIT_HOST) {
    return nodemailer.createTransport({ host: process.env.MAILPIT_HOST, port: 1025, secure: false });
  }
  // Sink puro: jsonTransport NÃO abre socket — devolve a mensagem serializada.
  // (streamTransport com `buffer: true` serve igual quando você quer o RFC822 cru.)
  return nodemailer.createTransport({ jsonTransport: true });
}
```

**Feche o bypass** (`eslint.config.js`) — o guard só vale se ninguém importar o SDK direto.

**Atenção ao mandato desta skill:** ela existe para **legado**, e legado Node é
majoritariamente **CJS**. `no-restricted-imports` só enxerga `import`/`export` — ele **não pega
`require("nodemailer")`**, que é justamente como o legado importa. Fechar só o lado ESM deixa o
bypass aberto exatamente onde esta skill atua. Por isso vão as **duas** regras:

```js
{
  files: ["src/**/*.{ts,js,cjs,mjs}"],
  ignores: ["src/mail/**"],
  rules: {
    // Lado ESM: `import ... from "nodemailer"` e `import("nodemailer")`.
    "no-restricted-imports": ["error", {
      paths: [
        { name: "nodemailer", message: "envio só pelo GuardedMailer (src/mail). Ver iam.md §3.1." },
        { name: "resend", message: "idem: o SDK real mora atrás do guard." },
      ],
    }],
    // Lado CJS: `require("nodemailer")` — o caminho REAL do legado, que a regra
    // acima não cobre. (`no-restricted-modules` foi REMOVIDA do core do ESLint;
    // a cobertura de CJS hoje vem por selector de AST.)
    "no-restricted-syntax": ["error",
      {
        selector: "CallExpression[callee.name='require'][arguments.0.value=/^(nodemailer|resend|@sendgrid\\/mail|postmark|mailgun\\.js|twilio)$/]",
        message: "envio só pelo GuardedMailer (src/mail): require() do SDK de envio é bypass do guard. Ver iam.md §3.1.",
      },
      {
        selector: "ImportExpression[source.value=/^(nodemailer|resend|@sendgrid\\/mail|postmark|mailgun\\.js|twilio)$/]",
        message: "idem para import() dinâmico: o SDK real mora atrás do guard.",
      },
    ],
  },
}
```

#### Camada 2 — o guard (wrapper do `sendMail`, com erro tipado)

```ts
// src/mail/guarded-mailer.ts
import type { SendMailOptions, SentMessageInfo, Transporter } from "nodemailer";
import type { AppEnv } from "./transport.js";

/** Erro de PROGRAMAÇÃO (aparece no teste e no CI), não erro do usuário. */
export class ExternalRecipientBlockedError extends Error {
  readonly code = "EXTERNAL_RECIPIENT_BLOCKED";
  // Campos declarados e atribuídos à mão, NÃO por `constructor(readonly x: T)`:
  // parameter property é sintaxe TS **não-apagável** — não roda sob o type
  // stripping nativo do Node (`--experimental-strip-types`) e é erro sob
  // `erasableSyntaxOnly` (TS 5.8). Numa skill de legado que quer rodar TS direto
  // no Node sem build step, isso é a diferença entre o exemplo rodar e não rodar.
  readonly recipients: readonly string[];
  readonly env: AppEnv;

  constructor(recipients: readonly string[], env: AppEnv) {
    super(
      `bloqueado: destinatário externo ${recipients.join(", ")} com APP_ENV=${env}. ` +
        "Use <papel>+<run-id>-<n>@test.<domain> ou registre o ADR de exceção " +
        "(allowlist <=5 + cap + janela + subdomínio de envio separado). Nada foi enviado.",
    );
    this.name = "ExternalRecipientBlockedError";
    this.recipients = recipients;
    this.env = env;
  }
}

export class RunCapExceededError extends Error {
  readonly code = "MAIL_RUN_CAP_EXCEEDED";
  readonly maxPerRun: number;
  readonly env: AppEnv;

  constructor(maxPerRun: number, env: AppEnv) {
    super(
      `cap de envio estourado (MAIL_MAX_PER_RUN=${maxPerRun}, APP_ENV=${env}): ` +
        "laço/seed disparando em massa. Abortado — nada mais foi enviado.",
    );
    this.name = "RunCapExceededError";
    this.maxPerRun = maxPerRun;
    this.env = env;
  }
}

/** 1º = o `test.<domain>` da casa (null MX RFC 7505 + SPF `-all` + DMARC p=reject);
 *  demais = TLDs RESERVADOS da RFC 2606/6761, que nenhum resolvedor entrega.
 *  `example.com` NÃO entra: ele resolve (a IANA o opera) — o que impede a entrega é
 *  ele não publicar MX, e isso não está sob nosso controle. Piso de rota nula é DNS
 *  que nós controlamos ou TLD que a IETF reservou. */
export const DEFAULT_TEST_DOMAINS = ["test.acme.com", "test", "invalid", "example"] as const;

export interface GuardOptions {
  readonly env: AppEnv;
  readonly testDomains?: readonly string[];
  readonly maxPerRun?: number;
}

/** Wrapper do transporte: é o ÚNICO `sendMail` que o app enxerga. */
export class GuardedMailer {
  readonly #inner: Transporter;
  readonly #env: AppEnv;
  readonly #testDomains: readonly string[];
  readonly #maxPerRun: number;
  #sent = 0;

  constructor(inner: Transporter, options: GuardOptions) {
    this.#inner = inner;
    this.#env = options.env;
    this.#testDomains = (options.testDomains ?? DEFAULT_TEST_DOMAINS).map((d) => d.toLowerCase());
    this.#maxPerRun = options.maxPerRun ?? capFromEnv();
  }

  get sent(): number {
    return this.#sent;
  }

  async sendMail(message: SendMailOptions): Promise<SentMessageInfo> {
    this.#assertDeliverable(message);

    // O cap vale em TODOS os ambientes — inclusive `prd`. Ele não é uma das camadas
    // de sandbox: é um FREIO contra laço em massa (ADR-0004), e um laço em massa em
    // produção é pior, não melhor. Em prd, dimensione `MAIL_MAX_PER_RUN` para o
    // volume real; desligar o freio é que não é opção. (Era `if (env !== "prd")`,
    // que tornava o bloco inteiro inalcançável em produção e contradizia o
    // `assets/CLAUDE.md` desta skill, que enuncia o cap sem qualificador.)
    if (this.#sent >= this.#maxPerRun) throw new RunCapExceededError(this.#maxPerRun, this.#env);
    this.#sent += 1; // conta a TENTATIVA: falha do transporte não zera o teto
    return this.#inner.sendMail(message);
  }

  #assertDeliverable(message: SendMailOptions): void {
    if (this.#env === "prd") return; // produção entrega de verdade

    const recipients = [
      ...addressesOf(message.to),
      ...addressesOf(message.cc),
      ...addressesOf(message.bcc),
    ];
    const blocked = recipients.filter((address) => !this.#isTestRecipient(address));
    if (blocked.length > 0) throw new ExternalRecipientBlockedError(blocked, this.#env);
  }

  /** Match por DOMÍNIO, não por substring: "gmail.com.test-acme.io" não passa. */
  #isTestRecipient(address: string): boolean {
    const addr = address.toLowerCase();
    const at = addr.lastIndexOf("@");
    if (at <= 0) return false; // sem "@", ou local part vazia: não é endereço
    const domain = addr.slice(at + 1);
    if (domain.length === 0) return false;
    return this.#testDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
  }
}

function addressesOf(field: SendMailOptions["to"]): string[] {
  // `if (!field)` engolia a string VAZIA: `{ to: "" }` virava "zero destinatários" e
  // passava pelo guard sem ser avaliado — fail-OPEN silencioso. Endereço vazio é
  // endereço inválido, e endereço inválido tem de ser RECUSADO, não descartado.
  if (field === undefined || field === null) return [];
  const list = Array.isArray(field) ? field : [field];
  return list.map((entry) => (typeof entry === "string" ? entry : entry.address));
}

/** MAIL_MAX_PER_RUN com default 50. Valor ausente/ilegível ⇒ default (fail-closed). */
function capFromEnv(): number {
  const parsed = Number.parseInt(process.env.MAIL_MAX_PER_RUN ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 50;
}
```

```ts
// src/mail/index.ts — composição: a escolha acontece UMA vez, aqui.
import { appEnv, buildTransport } from "./transport.js";
import { GuardedMailer } from "./guarded-mailer.js";

const env = appEnv();
export const mailer = new GuardedMailer(buildTransport(env), { env });
```

#### Camada 3 — o teste que vê o vermelho

```ts
// src/mail/guarded-mailer.test.ts — runner nativo (`node --test`); em Vitest/Jest é
// `await expect(...).rejects.toBeInstanceOf(ExternalRecipientBlockedError)`.
import test from "node:test";
import assert from "node:assert/strict";
import type { SendMailOptions, Transporter } from "nodemailer";
import { GuardedMailer, ExternalRecipientBlockedError, RunCapExceededError } from "./guarded-mailer.js";
import { appEnv } from "./transport.js";

function fakeTransport() {
  const sent: SendMailOptions[] = [];
  const transport = {
    sendMail: async (message: SendMailOptions) => {
      sent.push(message);
      return { messageId: "fake" };
    },
  } as unknown as Transporter;
  return { sent, transport };
}

test("guard recusa destinatário externo e NÃO entrega nada", async () => {
  const { sent, transport } = fakeTransport();
  const mailer = new GuardedMailer(transport, { env: "hml" });

  await assert.rejects(
    () => mailer.sendMail({ to: "alguem@gmail.com", subject: "OTP", text: "123456" }),
    (error: unknown) =>
      error instanceof ExternalRecipientBlockedError && error.code === "EXTERNAL_RECIPIENT_BLOCKED",
  );
  assert.equal(sent.length, 0); // nada saiu do processo

  await mailer.sendMail({ to: "login+run42-1@test.acme.com", subject: "OTP", text: "123456" });
  assert.equal(sent.length, 1);
});

test("cap por execução aborta antes de virar 5.000", async () => {
  const { sent, transport } = fakeTransport();
  const mailer = new GuardedMailer(transport, { env: "dev", maxPerRun: 2 });

  await mailer.sendMail({ to: "a+run7-1@test.acme.com", subject: "x" });
  await mailer.sendMail({ to: "b+run7-2@test.acme.com", subject: "x" });

  await assert.rejects(
    () => mailer.sendMail({ to: "c+run7-3@test.acme.com", subject: "x" }),
    (error: unknown) => error instanceof RunCapExceededError,
  );
  assert.equal(sent.length, 2);
});

test("APP_ENV ausente ou desconhecido NÃO vira produção", () => {
  assert.equal(appEnv(undefined), "dev");
  assert.equal(appEnv(""), "dev");
  assert.equal(appEnv("production"), "dev"); // só "prd" liga o real
  assert.equal(appEnv("prd"), "prd");
});
```

**O que isso trava, e o que continua sendo sua responsabilidade:**

| Regra | Onde está no código |
|---|---|
| Guard **dentro** do caminho de envio, não no chamador | `GuardedMailer.sendMail` → `#assertDeliverable` antes de qualquer I/O |
| Sink default fora de `prd`, escolha **uma vez** | `buildTransport` + `src/mail/index.ts`; `no-restricted-imports` fecha o bypass |
| Fail-closed | `appEnv()`: ausente/desconhecido ⇒ `dev`; `capFromEnv()` volta ao default; `required()` derruba o boot em prd |
| Cap por execução + abort | `#maxPerRun` + `RunCapExceededError` (conta a tentativa, não o sucesso) |
| Recusa é **erro tipado**, não warning | `ExternalRecipientBlockedError.code`; **VETADO** `.catch(() => {})` em cima dela |
| Destinatário sintético em rota nula | `DEFAULT_TEST_DOMAINS`, com match por **domínio**, não substring |

- **Varredura do legado (repo-wide, não escopo-diff):** `grep -rn "createTransport\|sendMail\|new Resend(\|sgMail\|nodemailer" src/` e
  `grep -rniE "@(gmail|hotmail|outlook|yahoo|icloud)\.com" test/ tests/ fixtures/ seeds/ scripts/` — o segundo **trava o CI**.
  Cada ocorrência do primeiro fora de `src/mail/` vira item de checklist até sair pelo guard.

- **Fixture, seed, factory e `simulated`:** todo endereço é `<papel>+<run-id>-<n>@test.<domain>`.
  **VETADO** `@gmail.com`/`@hotmail.com`, domínio de terceiro, e-mail de pessoa real (inclusive o
  seu) e o domínio de produção — em qualquer `.ts`/`.js` de teste, seed ou script npm.

- **SMS/push/webhook/PSP seguem o MESMO desenho:** wrapper com erro tipado, cap e chave
  **sandbox** fora de prd (SMS custa por unidade — o cap importa mais, não menos). Twilio tem
  `test credentials` e magic numbers; Stripe tem chave `sk_test_`.

- **Fila (BullMQ/Agenda) não é bypass:** o worker importa o **mesmo** `mailer` do
  `src/mail/index.ts`; o cap é por processo (freio de laço, não cota global). Job que chama SDK
  direto é o mesmo bug com uma indireção a mais.

- **Quando o módulo sai do Node** (strangler-fig, `references/migracao-saida.md`): o serviço Go/
  Rust que assume o envio **nasce com o guard equivalente** — a costura não é desculpa para um
  período sem freio, e **os dois lados** apontam para o mesmo sink em dev/hml.

## 4. Fluxos

**Onboarding:** cita um email → **verifica** → **cria senha** → **acesso baseline com 2FA
(senha + Email OTP)**. Fator forte é **nudge + just-in-time** (step-up na 1ª ação sensível),
nunca muro pré-login.

**Login:** (1) sem app de 2FA ativo → **OTP por email**; (2) com app → **pergunta app ou
email**; (3) com vários fatores → **lista todos e o usuário escolhe**.

**Recuperação:** múltiplos caminhos independentes (vários emails, códigos de backup,
telefone). **Força ≥ login**, rate-limit agressivo, tudo auditado. **Reset nunca é bypass
de 1 fator** — o "reset por 1 email" do legado é justamente o que se elimina.

## 5. Multi-tenant + RBAC/ABAC — motor ReBAC (estilo Zanzibar)

O legado decide authz por coluna `role`/`is_admin` e `if` no controller. **Não se confia
nisso** — a authz é **re-derivada** no motor (§7):

- **Identidade global, autorização por tenant:** um usuário pertence a **N tenants** via
  **membership**, com papéis **diferentes por tenant**.

- **Motor de relação (ReBAC), ex. OpenFGA/SpiceDB** — hand-rolar authz (o `if` do legado) é
  onde vazam privilégios. Autorização em **tuplas** `(objeto, relação, usuário/userset)`.

- **ABAC por cima:** condições sobre atributos via **conditional/contextual tuples**.

- **Token fino:** carrega `sub`/tenant/sessão/AAL — **sem** a lista de permissões.

- **Toda decisão de authz é logada** (quem / o quê / allow-deny / política).

## 6. Sessão, multi-dispositivo e logout

- **Multi-dispositivo de 1ª classe:** N sessões simultâneas por usuário, cada uma atada a um
  **dispositivo** (fingerprint + rótulo, IP/geo, último uso). Nenhuma derruba a outra.

- **View de dispositivos/sessões:** lista os ativos, **remove um** (revoga a sessão daquele
  device) e **"sair de todos"**.

- **Sessão longa por padrão (fim do "15 min e é chutado" do legado):** access token curto
  **com refresh silencioso** — a sessão **persiste 7 dias por padrão**; dispositivo
  confiável → **90 dias**. Ops sensíveis ainda pedem **step-up fresco** em AAL alto.

- **Botão "Sair" bem visível → kill IRREVERSÍVEL:** não basta apagar o cookie (o pecado do
  logout legado) — **revoga o refresh token (e a família), apaga o registro de sessão
  server-side, joga o `jti` na denylist até expirar e desassocia o push token do device**.
  Nem replay, nem refresh, nem "voltar o cookie" reativa.

- Cookies **`HttpOnly` + `Secure` + `SameSite`**; token nunca em `localStorage` (o legado
  Node quase sempre erra aqui — o JWT sai do `localStorage` na migração).

## 7. Migração de auth legado — PRIORIDADE 0 (o coração deste recorte)

Existe auth Node/TS no padrão antigo (§0) → **portá-lo para este IAM é a prioridade
máxima** da casa (segurança inegociável; pode gastar o que precisar). Vale **acima** do
gatilho normal de saída do Node (30/50, §3.1) — um auth legado é candidato imediato a
extração, não espera cruzar % de módulo. Estratégia **strangler-fig** (casa com
`references/migracao-saida.md`), **nunca big-bang**:

**Ordem de corte (dual-run atrás do edge de auth):**

1. **Edge de auth na frente.** Coloca um proxy/roteador de auth (o novo IdP em
   `auth.<domain>`, Go/Rust) na frente do fluxo. O monolith Node continua servindo, mas o
   **login passa a nascer no auth novo**; rotas ainda-não-migradas caem no legado. Feature
   flag de cutover por coorte, **rollback** sempre à mão.

2. **Mapeia `users` legados → modelo novo.** Lê a tabela `users` (read-only, via ACL —
   nunca banco compartilhado, §2 da arquitetura): **dedupe de emails** (o mesmo humano em
   duas linhas vira 1 identidade com 2 identificadores), **cunha ID interno imutável**
   (ULID/UUIDv7) por identidade, marca cada email como **não verificado** até o 1º login.

3. **Re-hash preguiçoso na 1ª autenticação.** No 1º login pós-corte, valida a senha contra
   o **bcrypt legado**; se casar, **re-deriva em argon2id** e descarta o hash antigo. Nunca
   migra senha em massa (não dá — hash é one-way); migra **on login**. HS256+segredo-na-app
   morre aqui: o token novo é assinado só no auth (JWKS público).

4. **Ativa o 2º fator baseline no 1º login pós-corte.** Como o legado tem 1 fator, a migração
   **liga o Email OTP always-on** — a conta migrada entra em **2FA baseline (senha + Email OTP)
   sem muro**. Enrolar um fator forte (passkey/TOTP) é **incentivado (nudge) e just-in-time**
   (step-up na 1ª ação sensível), **nunca** bloqueio pré-login (mata o círculo infinito).

5. **Revoga TODAS as sessões legadas.** Os JWT/`express-session` antigos são invalidados no
   corte (denylist + apaga store de sessão) — não se confia em sessão emitida pelo legado.

6. **Re-deriva a authz — nunca confia na coluna legada.** A `role`/`is_admin` da tabela
   `users` é, no máximo, **dica de seed** para as tuplas ReBAC iniciais, revisada; a decisão
   passa a ser sempre do motor (§5). O `if (req.user.role)` inline sai do controller Node.

7. **Move a assinatura de token para o auth novo.** O monolith Node deixa de assinar/emitir
   token e passa a **validar por JWKS** e delegar login por OIDC/PKCE. Quando nenhuma rota
   depende mais do auth embutido, **o auth legado é DELETADO** do monolith (migração só
   termina com o legado apagado — casa com `migracao-saida.md`).

**Invariantes da migração:**

- **Dual-run com paridade provada:** contract/golden tests comparam decisão de login/authz
  legada vs. nova em tráfego real (shadow) **antes** de virar a chave por coorte.

- **Sem banco compartilhado:** o auth novo é dono do seu schema; lê o legado por
  ACL/one-shot import, nunca aponta os dois para a mesma tabela (senão vira monólito
  distribuído, VETADO).

- **O auth migrado nasce já como app separada** (§1), em Go/Rust — não é "auth Node novo".

## 8. Rotina agressiva de testes (detalhe na schematize-pentest)

Suíte adversarial **contínua** (CI + agendada, fixtures multi-tenant, gate que **trava** em
qualquer vazamento) — e, durante a migração, roda **contra os dois** (legado e novo) até o
corte:

- **Abuso de fluxo:** bypass de 2FA, reset pulando 2FA, brute-force/rate-limit de OTP,
  replay de token, reuso de refresh, JWT `alg=none`/kid, session fixation, **JWT legado que
  segue válido após logout**, **sessão legada que sobreviveu ao corte**, IDOR na gestão de
  identificadores, mass-assignment de papel a partir da coluna legada.

## 9. Autenticação adaptativa por risco + transversais

> **O risk engine desta skill é o da base, sem desconto.** Este arquivo trazia só uma linha de
> "anti-automação" onde a base tem a §9 inteira — e a medição da vistoria de 2026-08-21 mostrou o
> tamanho do buraco: `lockout` aparecia **3×** na base e **0×** aqui; `tarpit` **5×** contra **1**;
> `honeypot` **4×** contra **1**. Legado em saída **não ganha desconto de piso de segurança**: o
> monolith Node é a superfície que o atacante encontra primeiro.
>
> A normativa completa — **score de risco por tentativa** (IP/ASN, device novo, geovelocidade
> impossível, velocity, honeypot), **escalonamento 2FA → 3FA sob risco**, **negação deceptiva /
> tarpit** com as regras que a tornam segura em vez de lockout, **lockout progressivo por
> identidade e por IP**, e o **audit log imutável** que alimenta tudo — está em
> `schematize-engineering` → `references/iam.md` §9. Aqui ficam só os pontos que **mudam de forma**
> no Node em saída:

- **Onde o motor roda:** no **IdP novo**, não no monolith. Enquanto houver dual-run, o legado
  **encaminha o sinal** (IP, device, resultado) para o auth novo em vez de decidir sozinho — dois
  motores de risco discordando é pior que um só.

- **Anti-automação no legado (o mínimo enquanto ele existir):** rate-limit + backoff exponencial
  em OTP e login; device fingerprint e sinais de risco (IP/geovelocidade) disparam **step-up**,
  nunca um `403` mudo. Se o monolith não consegue nem isso, a rota de login dele sai do ar antes
  do resto da migração.

- **Audit log imutável** de toda decisão authn/authz e mudança de credencial — inclui o
  **evento de migração** de cada conta (quando foi cortada, re-hasheada, 2º fator enrolado).

## Fases (do legado ao alvo)

- **F0** Edge de auth + IdP novo (app separado em `auth.<domain>`, Go/Rust) na frente; login
  nasce no novo, dual-run com o monolith Node.

- **F1** Import/dedupe `users` legados → ID interno imutável; identificadores não verificados.

- **F2** Re-hash preguiçoso (bcrypt→argon2id) on login; token assinado só no auth (JWKS).

- **F3** Ativa Email OTP baseline (2FA sem muro) no 1º login; **nudge** de fator forte; revoga sessões legadas; **risk engine adaptativo** (score, 2FA→3FA, negação deceptiva, honeypot).

- **F4** ReBAC: re-deriva authz (coluna legada só como seed revisado); PEP substitui `if` inline.

- **F5** Multi-dispositivo, sessão 7d/90d, logout irreversível; sai o JWT do `localStorage`.

- **F6** Rotina agressiva de testes (cross-tenant/priv-esc/abuso de fluxo) contra os dois até o corte.

- **Corte final** Nenhuma rota depende do auth embutido → **deleta o auth legado do monolith**.

## Checklist (entra na Definition of Done quando o projeto tem/tinha auth)

- [ ] Auth legado Node/TS **identificado e em migração ativa** (prioridade 0) — não deixado como está.

- [ ] Auth-alvo é **app separada** (`auth.<domain>`, serviço Go/Rust + front próprios, isolados) — não o monolith Node.

- [ ] `users` legados **mapeados** → **ID interno imutável**; email/telefone não são ID; emails deduplicados; múltiplos emails suportados.

- [ ] **Re-hash preguiçoso** (bcrypt→argon2id) no login; **JWT sai do `localStorage`**; token assinado só no auth (JWKS público, sem HS256 na app).

- [ ] **2FA baseline** no alvo (senha + Email OTP = 2FA); a migração **ativa o Email OTP baseline** (2FA sem muro), fator forte é **nudge + just-in-time**, **nunca muro pré-login**; passkey no núcleo; email OTP (Resend) always-on; Twilio p/ telefone.

- [ ] **Efeito externo só sai em `prd` (§3.1):** transporte **sink** fora de prd (`jsonTransport`/`streamTransport` ou Mailpit SMTP), **`GuardedMailer` envelopando o `sendMail`** com erro **tipado** (`ExternalRecipientBlockedError`) quando o destinatário está fora do domínio de teste, **cap por execução** (`MAIL_MAX_PER_RUN`, default 50) com `RunCapExceededError`, **fail-closed** (`APP_ENV` ausente/desconhecido ⇒ não-prd; credencial de prd ausente derruba o boot) e `no-restricted-imports` proibindo o SDK fora de `src/mail/`. **Vale para o legado inteiro, repo-wide — não é escopo-diff.** Prova: teste que espera a rejeição com o transporte falso vazio (vermelho visto) + `dig MX test.<domain>` = null MX. (`schematize-engineering` → `references/efeitos-externos.md`)

- [ ] **Sessões legadas revogadas** no corte; invariante de troca (Y≠X, maior AAL); recuperação ≥ login (fim do reset-por-1-email).

- [ ] **Authz re-derivada** no ReBAC (coluna `role`/`is_admin` legada só como seed revisado); deny-default, PDP/PEP, enforcement server-side, token fino.

- [ ] Multi-dispositivo + view de remover; **sessão 7d/90d**; **logout irreversível** (revoga refresh+família, não só cookie).

- [ ] Audit log de authn/authz + evento de migração por conta; dual-run com **paridade provada** (golden/contract) antes do cutover.

- [ ] **Auth legado DELETADO** do monolith ao fim (migração só termina apagando o legado); testes cross-tenant/priv-esc no CI (schematize-pentest).
