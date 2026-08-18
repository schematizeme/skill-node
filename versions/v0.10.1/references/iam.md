# IAM — Identidade e Autorização da casa (piso inegociável) · recorte node

> Parte da skill **schematize-node** (manutenção de legado Node/TS). Este é o modelo
> agnóstico da casa (`schematize-engineering/references/iam.md`) recortado para o ângulo
> do legado: **quase todo auth Node/TS que você encontra é do padrão antigo, e portá-lo
> para o IAM da casa é PRIORIDADE 0.** O IAM-alvo (identidade≠email, ≥2 fatores, ReBAC
> deny-default, sessão longa, logout irreversível) é o destino que a migração alcança —
> não se recria um auth novo em Node (§7).

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
auth novo em Node: o auth-alvo é serviço próprio em Go/Rust (`schematize-go`/`rust`).

## 1. Topologia — auth é uma APLICAÇÃO SEPARADA (o alvo da migração)

- **A autenticação é um serviço próprio, com link próprio e front próprio**, servido em
  **`auth.<domain>`**. **VETADO** apensar o auth ao escopo principal como monolith — que é
  exatamente o que o legado Node faz. Desapensar é o **primeiro corte** do strangler.
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
- **Identificadores 1..N por usuário** (emails, telefones, identidades SSO, passkeys, apps,
  chaves FIDO2). **Ter mais de um email é incentivado** (resiliência a brick de provedor).
- **Identificador só vale verificado** — não loga nem recupera sem verificação. Registros
  legados sem verificação viram identificador **não verificado** até o 1º login pós-migração.
- **SSO nunca é ponto único de falha:** cadastro via SSO **força ≥1 fator de recuperação
  local** (email de recuperação + códigos de backup).
- **Account-linking explícito:** SSO chegando com email já verificado em outra conta →
  linkar vs. bloquear **com confirmação** (anti-takeover). Nunca linkar por email não
  verificado. (No legado, o dedupe de emails duplicados acontece aqui — §7.)
- **Nudge de email secundário (anti-brick):** com só 1 email, a UI **sugere adicionar um
  secundário**, **detecta o provedor** (gmail / hotmail-outlook / yahoo / corporativo) e
  **recomenda outro provedor**, com **"i" e tooltip no hover**. Sugestão, não obrigação.

## 3. Fatores e níveis de garantia (AAL — NIST 800-63B)

O legado tem 1 fator (senha bcrypt). O alvo classifica a **força** de cada fator para dar
"email sempre disponível" sem abrir mão de segurança:

| Tier | Fatores | Uso |
|---|---|---|
| **Alto (phishing-resistant)** | **Passkey/WebAuthn (núcleo)**, chave FIDO2, push aprovado no app | Ops sensíveis: trocar fator, admin, cross-tenant, billing, recuperação |
| **Médio** | TOTP (app autenticador), senha + posse | Login + 2º fator |
| **Baixo (fallback)** | **Email OTP (Resend)**, **SMS/voz (Twilio)** | Sempre disponível; **não** autoriza ação sensível sozinho |

- **Email OTP (Resend) ligado por padrão, inclusive em HML** — só o operador desliga.
- **Twilio por padrão** para verificação de telefone e 2FA por SMS/voz.
- **Provedores plugáveis:** `EmailProvider` (Resend default), `SmsProvider` (Twilio
  default), `PushProvider` — trocáveis por config, sem tocar no core.
- **Senha por padrão, opcional por escolha:** o usuário **cria senha no cadastro**
  (**argon2id** + verificação contra base de vazadas/HIBP), mas o **seletor de modos de
  autenticação permite marcá-la como opcional** e viver de passkey/OTP/app. A senha legada
  em **bcrypt vira argon2id por re-hash preguiçoso** no 1º login (§7).
- **Passkey/WebAuthn é núcleo** (não roadmap): já é "2 fatores num", phishing-resistant.
- **2FA baseline desde o corte — senha + Email OTP JÁ é 2FA:** o legado costuma ter 1 fator
  (senha); a migração **ativa o Email OTP always-on como 2º fator baseline**, e a conta migrada
  já entra em **2FA sem muro**. Fator forte (passkey/TOTP) é **nudge + just-in-time** (step-up
  na 1ª ação sensível), **nunca bloqueio do login** — barrar o acesso até enrolar um fator forte
  é o **círculo infinito VETADO** (§7).

## 4. Fluxos

**Onboarding:** cita um email → **verifica** → **cria senha** → **acesso baseline com 2FA
(senha + Email OTP)**. Fator forte é **nudge + just-in-time** (step-up na 1ª ação sensível),
nunca muro pré-login.

**Login:** (1) sem app de 2FA ativo → **OTP por email**; (2) com app → **pergunta app ou
email**; (3) com vários fatores → **lista todos e o usuário escolhe**.

**Gestão de fator — invariante único:**
> **Para mutar o fator X, apresente um fator Y ≠ X, no maior AAL disponível.**
- Toda mudança **notifica todos os canais verificados**; remover o **último fator forte** =
  **ação com atraso cancelável**.

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
- **RBAC granular:** permissão = **`recurso:ação`** (`invoice:approve`, `user:invite`);
  papéis-padrão + **papéis 100% customizados por tenant**.
- **ABAC por cima:** condições sobre atributos via **conditional/contextual tuples**.
- **PDP/PEP separados:** PDP = Check API do motor; **PEP = middleware** em cada serviço
  (inclusive no monolith Node enquanto ele existir — o `if` inline sai, entra a Check API).
  **Deny-by-default**, enforcement **server-side**, **todo endpoint mapeia 1 permissão**.
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
- **Refresh rotativo com detecção de reuso** (reusou → revoga a **família** inteira).
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
- **Cross-tenant (BOLA/IDOR):** token do tenant B → IDs do tenant A = 403/404; fuzz de IDs.
- **Priv-esc (BFLA):** papel baixo → ação de papel alto (horizontal e vertical).
- **Matriz persona × endpoint** exaustiva.
- **Abuso de fluxo:** bypass de 2FA, reset pulando 2FA, brute-force/rate-limit de OTP,
  replay de token, reuso de refresh, JWT `alg=none`/kid, session fixation, **JWT legado que
  segue válido após logout**, **sessão legada que sobreviveu ao corte**, IDOR na gestão de
  identificadores, mass-assignment de papel a partir da coluna legada.

## 9. Transversais (sempre)
- **Anti-automação / risk engine:** rate-limit + backoff exponencial em OTP; device
  fingerprint e sinais de risco (IP/geovelocidade) disparam step-up.
- **Audit log imutável** de toda decisão authn/authz e mudança de credencial — inclui o
  **evento de migração** de cada conta (quando foi cortada, re-hasheada, 2º fator enrolado).
- **Padrões:** OIDC/OAuth2.1 + PKCE; WebAuthn/FIDO2; AALs NIST 800-63B; SCIM (roadmap
  enterprise); FAPI2 se fintech.

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
- [ ] **Sessões legadas revogadas** no corte; invariante de troca (Y≠X, maior AAL); recuperação ≥ login (fim do reset-por-1-email).
- [ ] **Authz re-derivada** no ReBAC (coluna `role`/`is_admin` legada só como seed revisado); deny-default, PDP/PEP, enforcement server-side, token fino.
- [ ] Multi-dispositivo + view de remover; **sessão 7d/90d**; **logout irreversível** (revoga refresh+família, não só cookie).
- [ ] Audit log de authn/authz + evento de migração por conta; dual-run com **paridade provada** (golden/contract) antes do cutover.
- [ ] **Auth legado DELETADO** do monolith ao fim (migração só termina apagando o legado); testes cross-tenant/priv-esc no CI (schematize-pentest).
