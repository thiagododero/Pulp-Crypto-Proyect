#!/bin/bash
# Pulp beta — loopback by default. Public mode requires explicit configuration. No remote installer runs.
set -u
cd -- "$(dirname -- "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
NODE="${PULP_NODE:-}"
if [ -z "$NODE" ]; then NODE="$(command -v node 2>/dev/null || true)"; fi
if [ -z "$NODE" ]; then
  if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; NODE="$(command -v node 2>/dev/null || true)"; fi
fi
if [ -z "$NODE" ] || [ ! -x "$NODE" ]; then
  printf '\nPULP necesita Node.js 20.11 o superior.\nInstalá una versión LTS desde nodejs.org y volvé a abrir este archivo.\nNo necesitás npm install.\n\n'
  if command -v open >/dev/null 2>&1; then open "EMPEZAR.html"; fi
  read -r -p "Presioná Enter para cerrar… " _
  exit 1
fi
if ! "$NODE" -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>20||(a===20&&b>=11)?0:1)'; then
  printf '\nTu versión de Node es antigua: '; "$NODE" -v
  printf 'Instalá Node 20.11 o superior desde nodejs.org.\n'
  read -r -p "Presioná Enter para cerrar… " _
  exit 1
fi
printf '\n🐙 PULP · WHITE EDITION 4.2 · BETA · Inicio automático\n\nSe abre en tu navegador. Dejá esta Terminal abierta mientras usás Pulp.\nCtrl+C detiene el servidor; no envía ni cancela transacciones on-chain.\n\n'
NODE_ARGS=()
if [ -f ".env" ]; then NODE_ARGS+=("--env-file=.env"); fi
"$NODE" "${NODE_ARGS[@]}" server.mjs --open "$@"
STATUS=$?
if [ "$STATUS" -ne 0 ]; then
  printf '\nNo se pudo iniciar Pulp. Revisá el error anterior y LEEME_PRIMERO.md.\n'
  read -r -p "Presioná Enter para cerrar… " _
fi
exit "$STATUS"
