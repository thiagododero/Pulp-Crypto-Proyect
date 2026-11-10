#!/bin/bash
set -u
cd -- "$(dirname -- "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; fi
if ! command -v node >/dev/null 2>&1; then printf '\nNecesitás Node.js 20.11 o superior. No hay que instalar paquetes npm.\n'; read -r -p 'Enter para cerrar… ' _; exit 1; fi
node scripts/build-pages.mjs && node scripts/preview-server.mjs --open
STATUS=$?
if [ "$STATUS" -ne 0 ]; then read -r -p 'No se pudo abrir. Revisá el mensaje. Enter para cerrar… ' _; fi
exit "$STATUS"
