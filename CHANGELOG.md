# Changelog — schematize-node

Todas as mudanças relevantes deste pacote, no formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
com versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [0.12.0] — 2026-08-21
Saneamento do catálogo conforme a vistoria de 2026-08-21.

### Adicionado
- **`require(esm)`** (`references/riscos-node.md`) — a mudança que mais alivia legado: a dependência que virou **ESM-only** deixou de exigir migração big-bang. Com os dois limites que fazem tropeçar: top-level `await` lança `ERR_REQUIRE_ASYNC_MODULE`, e o retorno é o **namespace** (o default está em `.default`).
- **Permission model** (`--permission`) — *a alavanca de hardening mais direta para um processo legado que ninguém vai reescrever*: dep comprometida que tente ler `~/.ssh/id_rsa` ou dar `spawn` **falha**, sem auditar 900 dependências. Com o modo de ligar **medindo** e os limites honestos (não é sandbox de rede).
- **`erasableSyntaxOnly` + `verbatimModuleSyntax`** (`references/typescript-estilo.md`) — o que separa `node script.ts` de precisar de bundler, com os substitutos das quatro sintaxes não-apagáveis.

### Corrigido
- **Toolbelt viável** (`references/stack-versoes.md`): `ts-migrate` saiu (parado — *codemod abandonado num repo legado é pior que nenhum*), e `ts-morph`/`type-coverage` ficaram com a restrição escrita: dependem da **API programática do compilador**, que **não está exposta no TS 7**.
- **CSPRNG de Node** (`references/seguranca.md`): o texto prescrevia `crypto/rand`, que é o pacote do **Go**. Agora é `node:crypto` (`randomBytes`, `randomUUID`, `webcrypto.getRandomValues`, `randomInt`), com `timingSafeEqual` e a pegadinha do mesmo tamanho.
- **pnpm coerente com o mandato**: a skill **veta green-field em Node**, então "pnpm é preferido em projeto novo" era conselho que ela não tem como dar. A escolha para projeto novo voltou para a `schematize-web`.

### Mudado
- `anti-padroes.md`, `arquitetura.md` e `entrega.md` viraram **ponteiro** (poda mecânica).

## [0.11.0] — 2026-08-20
Piso novo: **efeito externo NUNCA sai de não-produção** — recorte Node/TS (nodemailer + wrapper do `sendMail`) da normativa `schematize-engineering` → `references/efeitos-externos.md`. **Vale igual no legado: legado em saída não ganha desconto de piso.**
### Adicionado
- **SKILL.md**: piso inegociável "efeito externo NUNCA sai de não-produção" na lista de pisos herdados — sink por default (`jsonTransport`/`streamTransport`/Mailpit), guard como wrapper do `sendMail` com erro tipado, cap por execução, fail-closed, `no-restricted-imports` fechando o bypass do SDK, domínio de teste em rota nula.
- **SKILL.md (regra escoteiro)**: nota explícita de que **piso de segurança e de efeito externo NÃO é escopo-diff** — vale repo-wide e já, porque o e-mail do legado queima o mesmo IP/domínio do serviço novo.
- **references/iam.md §3.1** (novo): três camadas com código TypeScript real — (1) `src/mail/transport.ts` com `appEnv()` **fail-closed** (só `"prd"` liga o real), `required()` que derruba o boot sem credencial em prd, `jsonTransport`/Mailpit fora de prd, e a regra ESLint `no-restricted-imports`; (2) `src/mail/guarded-mailer.ts` — `GuardedMailer.sendMail` com `ExternalRecipientBlockedError`/`RunCapExceededError` (erros tipados com `code`), match por **domínio** (não substring) sobre to/cc/bcc, cap por execução contando a tentativa, `capFromEnv()` com default 50, e a composição em `src/mail/index.ts`; (3) testes `node --test` esperando a rejeição com transporte falso vazio, o abort do cap e o fail-closed do `APP_ENV` (com a equivalência Vitest/Jest).
- **references/iam.md**: bullet do Email OTP agora explicita "ligado ≠ entregando pra fora" (o script de migração é justamente o que toca 5.000 `users` de uma vez); item novo no checklist de DoD do IAM com a prova exigida.
- **references/iam.md §3.1**: varredura repo-wide do legado (`grep` de `createTransport`/`sendMail`/SDKs fora de `src/mail/` e de `@gmail|hotmail|outlook|yahoo|icloud` em teste/fixture/seed, este travando o CI), nota de que fila (BullMQ/Agenda) não é bypass, e a regra de que o serviço Go/Rust que assume o envio no strangler-fig **nasce com o guard equivalente**.
- **references/testes.md §22**: item obrigatório — teste nunca dispara efeito externo real (sink, endereço `@test.<domain>`, teste vermelho do guard e do cap).
- **assets/CLAUDE.md**: piso 14 com o recorte Node (sink/wrapper/erro tipado/cap/fail-closed/rota nula), a nota "repo-wide, não escopo-diff" e o motivo (queima de IP e domínio derruba o OTP de produção).

## [0.10.2] — 2026-08-18
Correção da contradição do muro pré-login de IAM (alinha ao `iam.md` da schematize-engineering).
### Mudado
- **/node-iam**: removido o "2º fator forte obrigatório antes do acesso pleno" e o "força 2º fator no 1º login" — o muro pré-login / deadlock de bootstrap VETADO pela norma. Agora senha+Email OTP = 2FA baseline; fator forte é nudge + step-up just-in-time.
Node.js/TypeScript, com saída gradual para Go/Rust. Não serve para backend novo.

## [0.10.1] — 2026-08-18
Q.A. repointado para a skill dedicada **schematize-qa**.
### Mudado
- **`/node-qa` virou wrapper fino** da **schematize-qa** (`/qa-plan` → `/qa-run`) no recorte Node/TS (`vitest`/`npm test`). Referências ao antigo **§22.9** (Q.A. plan-first, extraído para a schematize-qa) removidas de `references/testes*.md`.

## [0.10.0] — 2026-08-15
Correção de desenho no IAM-alvo da migração — **senha + Email OTP já é 2FA baseline** (a migração ativa o OTP baseline, sem muro pré-login) + **risk engine adaptativo**.

### Mudado (correção de piso)
- **`references/iam.md` §3/§4/§7 + roadmap F3 + checklist; `references/anti-padroes.md`:** a migração **ativa o Email OTP always-on como 2º fator baseline** — a conta migrada entra em **2FA (senha + Email OTP) sem muro pré-login**. Fator forte (passkey/TOTP) é **nudge + just-in-time** (step-up na 1ª ação sensível), **nunca** bloqueio do login (mata o **círculo infinito**). Roadmap/checklist alinhados ao **risk engine adaptativo** (2FA→3FA, negação deceptiva/tarpit, honeypot) do IAM-alvo (`schematize-engineering`/`go`/`rust`).

## [0.9.0] — 2026-07-11
IAM da casa pelo ângulo do legado — **migrar o auth legado Node/TS para o IAM é PRIORIDADE 0** (strangler-fig, app separada).

### Adicionado
- **`references/iam.md`** — recorte node do piso IAM da casa, focado em **§7 migração**. Perfil do auth legado típico (Passport/express-session/**JWT no `localStorage`**/`bcrypt`/**email como ID**/**1 fator**/authz por coluna `role`/**monolith apensado**) e por que portá-lo é dívida de segurança, não estética. **Migrar pro IAM = prioridade 0, acima do gatilho normal de saída (30/50).** O auth-alvo nasce **app SEPARADA** (`<projeto>_auth_<lang>` em **Go/Rust, nunca auth Node novo**, + front em `auth.<domain>`; OIDC/OAuth2.1 + PKCE; JWKS público — fim do HS256 no `.env`). **Ordem de corte strangler-fig** (dual-run atrás do edge de auth): mapeia `users` legados → **ID interno imutável** (dedupe de emails; email/telefone nunca é ID), **re-hash preguiçoso** bcrypt→argon2id no login, **força 2º fator no 1º login pós-migração**, **revoga sessões legadas**, **re-deriva a authz no ReBAC** (coluna legada só como seed revisado — nunca confiada; deny-default, PDP/PEP, token fino), **JWT sai do `localStorage`**, **sessão 7d/90d**, **logout irreversível**. Paridade provada (golden/contract, shadow) antes do cutover; **sem banco compartilhado** (ACL/import); concluído = **auth legado deletado** do monolith. Todas as regras-alvo do IAM (identidade≠email, ≥2 fatores, passkey no núcleo, email OTP Resend always-on, Twilio, recuperação ≥ login) mantidas como destino.
- **Comando `/node-iam`** (plan-first, modos `audit`/`plan`/`migrate`): audita o auth legado (inventário arquivo:linha), monta o plano strangler-fig de corte por coorte e executa faseado.
- **Piso 13** no `assets/CLAUDE.md` (migração de auth legado = prioridade 0); bullet nos pisos + linha na tabela de references + `/node-iam` na tabela de comandos do `SKILL.md`; anti-padrões **43–47** (auth legado deixado como está; auth apensado ao monolith/HS256 no `.env`; email como ID / 1 fator; JWT em `localStorage`; authz da coluna legada confiada / logout que só apaga cookie); `/node-load` carrega `iam.md`; `/node-help` lista `/node-iam`.

## [0.8.0] — 2026-07-11
Limite de arquivo em camadas — teto de 750 (≤500 úteis + ~250 comentário) + flag em >300 úteis.

### Alterado
- **`references/padroes-codigo.md` §1/§2:** o limite rígido de **300 linhas/arquivo** vira regra **em camadas**. **Teto DURO: 750 linhas** (das quais **~250 reservadas a comentário/doc** e **até ~500 de código útil**) — acima bloqueia. **FLAG (não bloqueia, mas SEMPRE sinaliza) em > 300 linhas de código útil:** indício de que a função está **muito extensa** / **precisa de mais abstração** — registra como dívida e **revê quando as prioridades forem resolvidas**. **Observabilidade tem folga natural (~400 úteis).** Função com >300 úteis dispara o mesmo flag; "uma função por arquivo" mantida. Continua **escopo-diff** (regra escoteiro §0): mede o arquivo NOVO/tocado, não o legado inteiro.
- **`scripts/check-diff.sh`:** o gate de tamanho passa a contar **código útil** (exclui comentário/branco): `total > 750` **bloqueia**, `útil > 500` **bloqueia**, `útil > 300` (ou `> 400` em arquivo de observabilidade) **flagueia** (`warn`, não trava).
- Propagado no `CLAUDE.md`, `SKILL.md`, `references/entrega.md` (DoD), `references/arquitetura.md` (§6) e comandos `/node-review` `/node-help`.

## [0.7.0] — 2026-07-06
Deploy destrutivo por seed + isolamento por usuário (ops).

### Adicionado
- references/ops.md §2: layout /<app>/ + repos dentro; /<app>/.env seeder global; redeploy destrutivo na app (preserva dados; ops reset gated dev/hml).
- references/ops.md §3: isolamento por usuário (user Linux + systemd hardened por serviço).
- Piso de seed/isolamento no CLAUDE.md; anti-padrões; /node-ops audita layout/seed/isolamento.

## [0.6.0] — 2026-07-05
Control plane <projeto>_ops: fluxo de ambientes, ops interface única, instalação paralela, independência invariante.

### Adicionado
- references/ops.md: fluxo dev→local→github→hml→prd (nada direto no servidor), ops interface única (100%, autônomo), instalação paralela=nproc, independência invariante (falha no paralelo = serviços não independentes → prioridade máxima).
- Comando /node-ops; pisos de ambientes/ops no CLAUDE.md; anti-padrões (editar no servidor, pular pra hml/prd, operar fora do ops, instalar serial, serializar pra mascarar); operacao.md §21 estendido; /node-load carrega ops.md.

## [0.5.0] — 2026-07-05
Todo MD gerado no archive, root limpo.

### Corrigido
- MAPA/índice saíam no root → agora `<projeto>_archive/index/` (padroes-codigo §4, MAPA.md, /node-index, build-index.mjs, CLAUDE.md, SKILL.md).

### Adicionado
- §28.0 (operacao.md): layout canônico do archive — todo MD gerado em `<projeto>_archive/<área>/`, NUNCA no root.

## [0.4.0] — 2026-07-03

### Alterado
- **Índice/MAPA exaustivo e como grafo** (§4 / §39 / `/node-index` / `MAPA.md` / `CLAUDE.md`): o índice passa a exigir **uma entrada por função** de cada serviço/app (`nº entradas == nº funções`). O `/node-index` **conta as declarações** e **reprova** se o índice tiver menos entradas, listando as ausentes pelo nome — chega de mapa magro (o caso "90 linhas pra 100+"). Removida a brecha do "relevante". O MAPA vira **grafo** (serviços + chamadas, Mermaid + adjacência), não lista.

## [0.3.0] — 2026-07-03

### Adicionado
- **Contenção no workspace** (§2 / anti-padrões §37 / `CLAUDE.md`): aplicação/repo novo nasce **dentro da pasta do projeto atual** (`./<projeto>_<contexto>/`). Veto a começar largando arquivos no root e depois **subir de diretório** (`cd ..`, `../`) pra criar repos irmãos fora, ou espalhar arquivos em `~`/`Documents`/`Downloads`/`/tmp`/Área de Trabalho. O agente **não sai da pasta do projeto** (ler ou escrever) sem o usuário pedir.

## [0.2.0] — 2026-06-27
Primeira release pública, após revisão por um painel de 4 agentes + compilação.

### Adicionado
- **Regra escoteiro (escopo-diff + baseline):** os pisos de qualidade valem só no
  código **novo ou tocado**; o legado pré-existente é baseline que só decresce.
- **Veto:** nenhuma funcionalidade nova nasce em Node — vai como módulo Go/Rust;
  no Node só correção de comportamento existente (`/node-review` pega superfície nova).
- **Saída do Node** mensurável e **não-bloqueante:** gatilho 30/50 medido pelo índice
  → abre **ADR** (não força rewrite no PR); strangler-fig (fachada/flag/shadow-diff/
  rollback), dono do dado no split, **concluir = deletar o Node antigo**.
- **Higiene de npm:** contagem direto vs transitivo, `overrides`/`resolutions`,
  `--ignore-scripts`, SCA sustentável (allowlist + ADR, nunca desligar o gate),
  package manager agnóstico (respeitar o existente).
- **TypeScript estrito incremental:** `any`/`@ts-ignore` **novo** vetado, existente
  grandfathered; `@ts-expect-error`; JS→TS por etapas.
- **Riscos Node de legado:** EOL/versão-piso do runtime, ESM/CJS, memória/event-loop,
  workers/streams/backpressure, graceful shutdown, prototype pollution/ReDoS.
- **Comandos:** `/node-help`, `/node-load`, `/node-claude`, `/node-audit`,
  `/node-migrate-status`, `/node-review`, `/node-cc`, `/node-handoff`, `/node-qa`,
  `/node-index`.
- Pisos gerais herdados de `schematize-go`/`rust` (arquitetura, segurança, testes,
  observabilidade LGTM+, `<projeto>_ops`, independência de runtime) — aplicados em
  modo escopo-diff.

> **beta (0.2.0):** o andaime (`scripts/node-audit.mjs`, `check-diff` Node) ainda é
> herdado do go/genérico; refinamento Node-específico previsto para 0.3.0.
