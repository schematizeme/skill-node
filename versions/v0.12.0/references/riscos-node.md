# Riscos Node-específicos de legado

> Parte da skill **schematize-node**. As classes de incidente que dominam Node/TS em produção e que o piso genérico não nomeia. Segurança geral (segredo, SQL, auth, JWT) está em `references/seguranca.md`; aqui é o que é **específico de Node**.

## Versão / EOL do runtime — piso de segurança

- **Rodar Node fora de LTS/EOL é CVE sem patch** — trate como brecha de segurança, não cosmético. Node EOL não recebe correção nem de segurança.
- **Pin explícito:** `engines.node` no `package.json`, `.nvmrc`/Volta/`fnm`, imagem base pinada por digest.
- **Alvo:** LTS suportada corrente (número exato **só** no anexo volátil `stack-versoes.md`, com data de verificação). ✔ **2026-08-21: "Node ≥18/20" não é mais piso vivo** — 18 chegou ao EOL em 04/2025 e 20 em 30/04/2026; citar uma versão EOL como piso mínimo é dizer ao time que rodar sem patch de segurança está dentro do padrão. O piso é **"LTS em suporte"**, e o número mora no anexo. Recursos "preferir a plataforma" (fetch global, `node:test`, `structuredClone`) já estão em toda LTS suportada — só os use **depois** de garantir o piso de versão; num legado preso em Node antigo, subir a versão vem primeiro (com testes).

## ESM vs CJS

- A dor definidora de Node/TS legado. Conheça: `type: "module"`, `moduleResolution: "NodeNext"`, **dual-package hazard**, `__dirname`/`__filename`/`require` inexistentes em ESM (use `import.meta.url`), interop default↔named, extensões `.mjs`/`.cjs`, **top-level await**.
- **`require(esm)` mudou o cálculo, e é a notícia mais útil para quem vive em legado.** Carregar um
  módulo **ESM a partir de CJS** com `require()` deixou de exigir flag (liberado nas linhas
  20.19+ / 22.12+ e estável nas seguintes). Na prática: uma dependência que virou **ESM-only** —
  que era o motivo nº 1 de ficar preso a uma versão antiga da lib ou de encarar uma migração
  big-bang — passa a ser **`require`ável** direto do seu código CJS. O que **não** mudou: o módulo
  ESM não pode ter **top-level `await`** (aí `require` lança `ERR_REQUIRE_ASYNC_MODULE`, e o
  caminho é `await import()`), e o `require` devolve o **namespace** do módulo — o default está em
  `.default`, não no retorno. **Verifique o suporte na LTS que você roda** (anexo volátil) antes de
  apoiar a arquitetura nisso.
- **Regra escoteiro:** converta um módulo para ESM **só quando for tocá-lo ou extraí-lo**. Migração ESM big-bang em código congelado é risco puro sem ganho — e, com `require(esm)`, a desculpa mais comum para o big-bang ("a dep virou ESM-only") deixou de existir.

## Permission model — hardening sem reescrever o legado

Processo Node roda, por default, com **tudo** o que o usuário do SO pode fazer: ler qualquer
arquivo, abrir qualquer socket, executar qualquer binário. Numa base legada com centenas de
dependências transitivas que ninguém auditou, essa é a superfície que mais dá retorno por linha de
esforço — e o **permission model** (estável na linha 24) é a única alavanca que não exige tocar no
código:

```bash
node --permission      --allow-fs-read=/app --allow-fs-read=/app/config      --allow-fs-write=/app/tmp      --allow-child-process=false      server.js
```

- **`--permission` liga o modelo e nega por default** — a partir dali, o que não foi permitido
  lança `ERR_ACCESS_DENIED`. É o deny-by-default da casa aplicado ao processo.
- **O ganho real é contra dependência comprometida:** um pacote transitivo que resolva ler
  `~/.ssh/id_rsa`, escrever fora de `/app/tmp` ou dar `spawn` num shell **falha**, sem você ter
  auditado as 900 deps.
- **Ligue medindo:** rode a suíte com o flag e colete o que ele nega; a lista de negações é o
  inventário real de acessos do seu processo — e costuma revelar acesso que ninguém sabia existir.
- **Limites honestos:** o modelo cobre **fs, child_process, worker threads e addons nativos** — não
  é sandbox de rede, e não protege contra o que o seu próprio código faz dentro do permitido. Ele
  reduz o raio, não fecha a porta. Complementa (não substitui) usuário Linux dedicado + systemd
  hardened (`schematize-infra` -> `references/isolamento.md`).

## Memória e event-loop

- **Vazamentos:** listeners não removidos (`MaxListenersExceededWarning`), caches/Maps sem limite, closures retendo request. Diagnóstico: heap snapshots (`--inspect`), `clinic.js`, `--max-old-space-size` consciente.
- **Event-loop lag:** trabalho CPU-bound no loop bloqueia tudo. Meça o lag; mova CPU-bound pra **`worker_threads`** (ou é sinal de que aquele pedaço deve ir pra Go — ver `migracao-saida`).
- **Streams com backpressure:** processar arquivo/fluxo grande carregando tudo em memória é bug. Use streams honrando `highWaterMark`/`pipeline`.

## Concorrência e ciclo de vida do processo

- **Graceful shutdown:** ao receber `SIGTERM`/`SIGINT`, pare de aceitar novo trabalho, drene o em voo com timeout, feche conexões, e só então saia (essencial em K8s; liga com independência de runtime, §2/§18).
- **`unhandledRejection`/`uncaughtException`:** política explícita — **logar com `trace_id` e encerrar de forma controlada** (processo em estado desconhecido não deve seguir servindo). Nunca engolir, nunca `process.exit(0)` mudo.
- `cluster`/PM2: healthcheck real, restart com backoff, não mascarar crash-loop.

## Segurança JS-específica

- **Prototype pollution:** merge/clone recursivo com chave controlada pelo cliente (`__proto__`, `constructor`, `prototype`) corrompe objetos globais. Valide/rejeite essas chaves; use libs seguras; `Object.create(null)` para mapas de dados externos.
- **ReDoS:** regex com backtracking catastrófico sobre input do usuário trava o event-loop. Evite regex ambígua; timeout/lib segura; valide tamanho antes.
- **`child_process`/`vm`/`eval`/`Function`** com input não sanitizado — injeção de comando. Nunca. Se precisar de shell, sem interpolação de string (args em array, `execFile`).
- **Path traversal** em `fs` com caminho do cliente; **SSRF** em `fetch`/`http` server-side com URL do cliente (allowlist de host/esquema).
- `--ignore-scripts` (supply-chain de instalação) — ver `references/npm-dependencias.md`.

## Testar legado sem teste

Legado costuma ter **zero teste**. Antes de tocar comportamento existente, crie uma **rede de segurança** (characterization / golden-master): capture a saída atual como fixture e trave-a, pra que sua mudança não altere comportamento sem querer. Na saída pra Go/Rust, os **contract/golden tests** provam paridade antes de desligar o Node (§migracao-saida).
