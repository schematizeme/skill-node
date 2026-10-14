#!/usr/bin/env bash
# node-audit.test.sh — o VERMELHO VISTO do gate de higiene de deps (scripts/node-audit.mjs).
#
# Motivo: um gate que nunca reprovou de propósito não prova nada. Este teste planta cada violação
# (lockfile ausente, engines ausente, Node EOL, CVE high sem allowlist, allowlist vencida, npm
# quebrado) e exige o exit certo. `npm` é substituído por um stub no PATH: sem rede, determinístico.
# Entrada: nenhuma. Saída: exit 0 todos os casos passam — exit 1 algum caso falhou.
# EXCEÇÃO DECLARADA de strict mode (`schematize-shell` -> `references/piso.md` secao 1):
# harness de teste roda sem `-e` de propósito — precisa continuar depois de um caso vermelho
# para reportar TODOS, em vez de parar no primeiro.
set -uo pipefail
A="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/node-audit.mjs"
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
rc=0
export NODE_AUDIT_TODAY=2026-10-14

# mk <dir> <engines> [com-lock] — projeto mínimo
mk() { mkdir -p "$1"; printf '{"name":"t","engines":{"node":"%s"},"dependencies":{"a":"1.0.0"}}\n' "$2" > "$1/package.json"; [ "${3:-lock}" = lock ] && printf '{"lockfileVersion":3,"packages":{"":{},"node_modules/a":{}}}\n' > "$1/package-lock.json"; : > "$1/.nvmrc"; }

# stub de npm: audit devolve JSON conforme $STUB_MODE
mkdir -p "$W/bin"
cat > "$W/bin/npm" <<'STUB'
#!/usr/bin/env bash
case "${STUB_MODE:-clean}" in
  clean) echo '{"vulnerabilities":{}}' ;;
  high)  echo '{"vulnerabilities":{"lodash":{"severity":"high","via":[{"source":1,"url":"https://github.com/advisories/GHSA-aaaa-bbbb-cccc","severity":"high"}]}}}' ;;
  broken) echo 'not json'; exit 1 ;;
esac
STUB
chmod +x "$W/bin/npm"
run() { PATH="$W/bin:$PATH" bash -c 'node "$@"' _ "$A" "$@" 2>&1; }

check() { # check <titulo> <exit-esperado> <saida-esperada|-> <exit-real> <saida>
  if [ "$4" -eq "$2" ] && { [ "$3" = "-" ] || grep -q -- "$3" <<<"$5"; }; then echo "  ✔ exit $4"; else echo "  ✖ $1: exit $4 (esperado $2): $5"; rc=1; fi
}

echo "── projeto limpo passa"
mk "$W/ok" ">=24"; OUT=$(STUB_MODE=clean run --dir "$W/ok"); check limpo 0 "RESULTADO: OK" $? "$OUT"

echo "── lockfile ausente BLOQUEIA"
mk "$W/nolock" ">=24" nolock; OUT=$(STUB_MODE=clean run --dir "$W/nolock"); check nolock 1 "lockfile ausente" $? "$OUT"

echo "── engines.node ausente BLOQUEIA"
mkdir -p "$W/noeng"; echo '{"name":"t"}' > "$W/noeng/package.json"; echo '{}' > "$W/noeng/package-lock.json"
OUT=$(STUB_MODE=clean run --dir "$W/noeng"); check noeng 1 "engines.node" $? "$OUT"

echo "── Node EOL (>=18, EOL 2025-04-30) BLOQUEIA"
mk "$W/eol" ">=18"; OUT=$(STUB_MODE=clean run --dir "$W/eol"); check eol 1 "EOL" $? "$OUT"

echo "── CVE high sem allowlist BLOQUEIA"
mk "$W/cve" ">=24"; OUT=$(STUB_MODE=high run --dir "$W/cve"); check cve 1 "GHSA-AAAA-BBBB-CCCC" $? "$OUT"

echo "── CVE high COM allowlist vigente passa"
mk "$W/allow" ">=24"
echo '[{"id":"GHSA-aaaa-bbbb-cccc","reason":"inalcançável","expires":"2026-12-31"}]' > "$W/allow/.node-audit-allow.json"
OUT=$(STUB_MODE=high run --dir "$W/allow"); check allow 0 "RESULTADO: OK" $? "$OUT"

echo "── allowlist VENCIDA BLOQUEIA (risco aceito é time-boxed)"
mk "$W/vencida" ">=24"
echo '[{"id":"GHSA-aaaa-bbbb-cccc","reason":"x","expires":"2026-01-01"}]' > "$W/vencida/.node-audit-allow.json"
OUT=$(STUB_MODE=high run --dir "$W/vencida"); check vencida 1 "vencida" $? "$OUT"

echo "── npm audit que não roda NÃO vira verde (exit 2)"
mk "$W/quebrado" ">=24"; OUT=$(STUB_MODE=broken run --dir "$W/quebrado"); check quebrado 2 "ERRO" $? "$OUT"

echo "── contagem alta é dívida (exit 0) e vira bloqueio com --strict"
mk "$W/muitas" ">=24"; printf '[]' > "$W/muitas/.node-audit-allow.json"
printf 'ignore-scripts=true\n' > "$W/muitas/.npmrc"
OUT=$(STUB_MODE=clean run --dir "$W/muitas" --max-direct 0); check dívida 0 "DÍVIDA" $? "$OUT"
OUT=$(STUB_MODE=clean run --dir "$W/muitas" --max-direct 0 --strict); check strict 1 "RESULTADO: FALHA" $? "$OUT"

echo "── --json é JSON válido"
OUT=$(STUB_MODE=clean run --dir "$W/ok" --json); if echo "$OUT" | node -e 'JSON.parse(require("fs").readFileSync(0,"utf8"))'; then echo "  ✔ json válido"; else echo "  ✖ json inválido"; rc=1; fi

echo "── diretório sem package.json é erro de uso (exit 2)"
OUT=$(STUB_MODE=clean run --dir "$W/inexistente"); check uso 2 "sem package.json" $? "$OUT"

[ "$rc" -eq 0 ] && echo "node-audit.test: TODOS OS CASOS PASSARAM" || echo "node-audit.test: FALHOU"
exit "$rc"
