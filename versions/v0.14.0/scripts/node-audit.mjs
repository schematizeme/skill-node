#!/usr/bin/env node
/**
 * node-audit.mjs — auditoria de higiene de dependências e de runtime de um projeto Node/TS.
 * É o que o comando `/node-audit` executa (assets/commands/node-audit.md).
 *
 * Uso:
 *   node node-audit.mjs [--dir <projeto>] [--json] [--max-direct N] [--max-transitive N]
 *                       [--strict] [--skip-audit] [--allowlist <arquivo.json>]
 *
 * O que verifica (escopo-diff: trava só o que é piso; contagem alta é DÍVIDA registrada):
 *   BLOQUEIA (exit 1)
 *     - lockfile ausente (package-lock.json / pnpm-lock.yaml / yarn.lock);
 *     - `engines.node` ausente em package.json;
 *     - runtime declarado em EOL (tabela embutida, ver RUNTIME_EOL — reverificar no anexo
 *       `references/stack-versoes.md`);
 *     - `npm audit --omit=dev` com vulnerabilidade high/critical fora da allowlist, ou com
 *       entrada da allowlist VENCIDA (risco aceito é time-boxed);
 *     - `npm audit` que não consegue rodar (verde mentiroso é pior que vermelho): exit 2.
 *   DÍVIDA (WARN; vira exit 1 com --strict)
 *     - dependências diretas de produção > --max-direct (default 40);
 *     - transitivas de produção > --max-transitive (default 200; só lê package-lock.json);
 *     - `.npmrc` sem `ignore-scripts=true`; sem `.nvmrc`/`.node-version`/`volta`.
 *
 * Allowlist (`.node-audit-allow.json`): [{ "id": "GHSA-xxxx-xxxx-xxxx", "reason": "...", "expires": "2026-12-31" }]
 *
 * Env: NODE_AUDIT_TODAY=AAAA-MM-DD fixa a data (teste determinístico).
 * Exit: 0 limpo — 1 achado bloqueante (ou WARN com --strict) — 2 erro de uso/ambiente.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Fim de suporte por major do Node (fonte: github.com/nodejs/Release/schedule.json,
// verificado em 2026-10-14). Volátil: reverificar a cada trimestre junto de stack-versoes.md.
const RUNTIME_EOL = {
  14: "2023-04-30", 16: "2023-09-11", 17: "2022-06-01", 18: "2025-04-30", 19: "2023-06-01",
  20: "2026-04-30", 21: "2024-06-01", 22: "2027-04-30", 23: "2025-06-01", 24: "2028-04-30",
  25: "2026-06-01", 26: "2029-04-30",
};
const LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "npm-shrinkwrap.json"];

/**
 * O quê: lê os argumentos de CLI em um objeto de opções.
 * Onde: topo do script (main).
 * Entrada: argv (lista de strings sem node/script). Saída: opções normalizadas.
 */
function parseArgs(argv) {
  const o = { dir: ".", json: false, maxDirect: 40, maxTransitive: 200, strict: false, skipAudit: false, allowlist: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir") o.dir = argv[++i];
    else if (a === "--json") o.json = true;
    else if (a === "--strict") o.strict = true;
    else if (a === "--skip-audit") o.skipAudit = true;
    else if (a === "--max-direct") o.maxDirect = Number(argv[++i]);
    else if (a === "--max-transitive") o.maxTransitive = Number(argv[++i]);
    else if (a === "--allowlist") o.allowlist = argv[++i];
    else { console.error(`argumento desconhecido: ${a}`); process.exit(2); }
  }
  return o;
}

/**
 * O quê: extrai o MAJOR mínimo permitido por um range de `engines.node` (">=20", "^22.1", "20.x", "22").
 * Onde: checagem de EOL do runtime.
 * Entrada: string do range. Saída: major (número) ou null se não deu para ler.
 */
function minMajor(range) {
  const m = /(\d+)/.exec(String(range ?? ""));
  return m ? Number(m[1]) : null;
}

/**
 * O quê: lê e valida a allowlist de advisories (risco aceito, time-boxed).
 * Onde: etapa de `npm audit`.
 * Entrada: caminho (pode não existir). Saída: lista de {id, reason, expires}.
 */
function loadAllowlist(file) {
  if (!file || !fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { console.error(`allowlist inválida (${file}): ${e.message}`); process.exit(2); }
}

/**
 * O quê: executa `npm audit --omit=dev --json` e devolve os advisories high/critical.
 * Onde: etapa de vulnerabilidades. Efeito: roda `npm` (rede).
 * Saída: { ok, advisories:[{pkg, severity, ids:[GHSA...]}], error }.
 */
function runNpmAudit(dir) {
  const r = spawnSync("npm", ["audit", "--omit=dev", "--json"], { cwd: dir, encoding: "utf8" });
  if (r.error) return { ok: false, error: `npm indisponível: ${r.error.message}`, advisories: [] };
  let j;
  try { j = JSON.parse(r.stdout || "{}"); } catch { return { ok: false, error: "saída do npm audit não é JSON", advisories: [] }; }
  if (j.error) return { ok: false, error: `npm audit falhou: ${j.error.summary ?? j.error.code ?? "erro"}`, advisories: [] };
  const advisories = [];
  for (const [pkg, v] of Object.entries(j.vulnerabilities ?? {})) {
    if (!["high", "critical"].includes(v.severity)) continue;
    const ids = [];
    for (const via of v.via ?? []) {
      const m = typeof via === "object" && via.url ? /(GHSA-[\w-]+)/i.exec(via.url) : null;
      if (m) ids.push(m[1].toUpperCase());
    }
    advisories.push({ pkg, severity: v.severity, ids });
  }
  return { ok: true, advisories };
}

/**
 * O quê: conta as dependências transitivas de produção a partir do package-lock.json (v2/v3).
 * Onde: sinal de saúde de supply-chain. Saída: número ou null (pnpm/yarn: não medido).
 */
function countTransitiveProd(dir) {
  const f = path.join(dir, "package-lock.json");
  if (!fs.existsSync(f)) return null;
  try {
    const pk = JSON.parse(fs.readFileSync(f, "utf8")).packages ?? {};
    return Object.entries(pk).filter(([k, v]) => k !== "" && !v.dev).length;
  } catch { return null; }
}

/**
 * O quê: orquestra todas as checagens e monta o relatório.
 * Onde: ponto de entrada. Saída: { blocks:[], warns:[], info:{} }.
 */
function audit(o) {
  const blocks = [], warns = [], info = {};
  const pkgFile = path.join(o.dir, "package.json");
  if (!fs.existsSync(pkgFile)) { console.error(`sem package.json em ${o.dir}`); process.exit(2); }
  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
  const today = process.env.NODE_AUDIT_TODAY ?? new Date().toISOString().slice(0, 10);

  const lock = LOCKFILES.find((l) => fs.existsSync(path.join(o.dir, l)));
  info.lockfile = lock ?? null;
  if (!lock) blocks.push("lockfile ausente: commite package-lock.json/pnpm-lock.yaml/yarn.lock (build reproduzível; `npm ci` no CI)");

  const range = pkg.engines?.node;
  info.engines = range ?? null;
  if (!range) blocks.push("`engines.node` ausente em package.json: declare a LTS suportada");
  else {
    const major = minMajor(range);
    info.minMajor = major;
    const eol = RUNTIME_EOL[major];
    if (major === null) warns.push(`não consegui ler o major de engines.node="${range}"`);
    else if (eol && eol <= today) blocks.push(`Node ${major} em EOL desde ${eol} (engines.node="${range}"): CVE sem patch — suba para uma LTS suportada`);
    else if (!eol) warns.push(`Node ${major} fora da tabela de EOL embutida: reverificar em references/stack-versoes.md`);
  }

  const hasPin = [".nvmrc", ".node-version"].some((f) => fs.existsSync(path.join(o.dir, f))) || pkg.volta;
  if (!hasPin) warns.push("sem .nvmrc/.node-version/volta: a versão do runtime não está pinada no repo");

  const npmrc = path.join(o.dir, ".npmrc");
  if (!fs.existsSync(npmrc) || !/^\s*ignore-scripts\s*=\s*true/m.test(fs.readFileSync(npmrc, "utf8")))
    warns.push(".npmrc sem `ignore-scripts=true` (lifecycle de dependência é vetor de supply-chain)");

  const direct = Object.keys(pkg.dependencies ?? {}).length;
  const dev = Object.keys(pkg.devDependencies ?? {}).length;
  const trans = countTransitiveProd(o.dir);
  Object.assign(info, { directProd: direct, devDeps: dev, transitiveProd: trans });
  if (direct > o.maxDirect) warns.push(`${direct} dependências diretas de produção (> ${o.maxDirect}): justifique cada família ou reduza`);
  if (trans !== null && trans > o.maxTransitive) warns.push(`${trans} transitivas de produção (> ${o.maxTransitive}): smell forte de backend inchado`);

  if (o.skipAudit) { info.audit = "pulado (--skip-audit)"; warns.push("npm audit PULADO (--skip-audit): não use no CI"); }
  else {
    const res = runNpmAudit(o.dir);
    if (!res.ok) { console.error(`ERRO: ${res.error}`); process.exit(2); }
    const allow = loadAllowlist(o.allowlist ?? path.join(o.dir, ".node-audit-allow.json"));
    const live = new Set(allow.filter((a) => a.expires && a.expires >= today).map((a) => a.id?.toUpperCase()));
    for (const a of allow) if (!a.expires || a.expires < today) blocks.push(`allowlist vencida/sem prazo: ${a.id} (expires=${a.expires ?? "ausente"}) — risco aceito é time-boxed`);
    for (const adv of res.advisories) {
      if (adv.ids.length && adv.ids.every((id) => live.has(id))) continue;
      blocks.push(`vulnerabilidade ${adv.severity} em ${adv.pkg} ${adv.ids.join(",")}: aplique overrides/fix ou abra ADR de risco aceito + allowlist`);
    }
    info.audit = `${res.advisories.length} high/critical`;
  }
  return { blocks, warns, info };
}

const opts = parseArgs(process.argv.slice(2));
const { blocks, warns, info } = audit(opts);
const failed = blocks.length > 0 || (opts.strict && warns.length > 0);
if (opts.json) {
  console.log(JSON.stringify({ ok: !failed, info, blocks, warns }, null, 2));
} else {
  console.log("== schematize-node node-audit ==");
  console.log(`info: ${JSON.stringify(info)}`);
  for (const b of blocks) console.log(`✗ BLOQUEIA ${b}`);
  for (const w of warns) console.log(`⚠ DÍVIDA ${w}`);
  console.log(failed ? "RESULTADO: FALHA" : "RESULTADO: OK");
}
process.exit(failed ? 1 : 0);
