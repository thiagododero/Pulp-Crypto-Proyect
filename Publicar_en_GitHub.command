#!/bin/bash
# One reviewed commit to the user's existing repository. Never force-pushes.
set -u
cd -- "$(dirname -- "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; fi
if ! command -v node >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then printf '\nSe requieren Node.js 20.11+ y Git en tu Mac.\n'; read -r -p 'Enter para cerrar… ' _; exit 1; fi
node scripts/publish-update.mjs
STATUS=$?
read -r -p 'Enter para cerrar… ' _
exit "$STATUS"
