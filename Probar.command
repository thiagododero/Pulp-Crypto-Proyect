#!/bin/bash
set -u
cd -- "$(dirname -- "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  printf 'Instalá Node.js 20.11 o superior.\n'; read -r -p 'Enter para cerrar… ' _; exit 1
fi
printf '\nPULP: pruebas locales con proveedores y wallets de prueba.\nNo se usa dinero real ni se contacta a Solana.\n\n'
node tools-check.mjs && node --test tests/*.test.mjs
STATUS=$?
read -r -p 'Enter para cerrar… ' _
exit "$STATUS"
