#!/bin/bash
# Open the included local presentation site using the shared launcher.
cd -- "$(dirname -- "$0")" || exit 1
exec /bin/bash ./Abrir.command --website "$@"
