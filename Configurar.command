#!/bin/bash
set -eu
cd -- "$(dirname -- "$0")"
if [ ! -f .env ]; then (umask 077; cp .env.example .env); fi
chmod 600 .env
printf '
Pulp: configuración local privada. Nunca ingreses frases semilla.
Después de editar, reiniciá Abrir.command. Las rutas experimentales siguen bloqueadas por defecto.
'
if command -v open >/dev/null 2>&1; then open -e .env; else printf 'Editá el archivo .env en esta carpeta.
'; fi
