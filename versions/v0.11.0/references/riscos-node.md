# Riscos Node-específicos de legado

> Parte da skill **schematize-node**. As classes de incidente que dominam Node/TS em produção e que o piso genérico não nomeia. Segurança geral (segredo, SQL, auth, JWT) está em `references/seguranca.md`; aqui é o que é **específico de Node**.

## Versão / EOL do runtime — piso de segurança

- **Rodar Node fora de LTS/EOL é CVE sem patch** — trate como brecha de segurança, não cosmético. Node EOL não recebe correção nem de segurança.
- **Pin explícito:** `engines.node` no `package.json`, `.nvmrc`/Volta/`fnm`, imagem base pinada por digest.
- **Alvo:** LTS suportada corrente (número exato em `stack-versoes.md`). Recursos "preferir a plataforma" (fetch global, `node:test`, `structuredClone`) exigem **Node ≥18/20** — só os use **depois** de garantir o piso de versão; num legado preso em Node antigo, subir a versão vem primeiro (com testes).

## ESM vs CJS

- A dor definidora de Node/TS legado. Conheça: `type: "module"`, `moduleResolution: "NodeNext"`, **dual-package hazard**, `__dirname`/`__filename`/`require` inexistentes em ESM (use `import.meta.url`), interop default↔named, extensões `.mjs`/`.cjs`, **top-level await**.
- **Regra escoteiro:** converta um módulo para ESM **só quando for tocá-lo ou extraí-lo**. Migração ESM big-bang em código congelado é risco puro sem ganho.

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
