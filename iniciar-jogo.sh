#!/bin/sh
# Inicia um servidor local e abre o jogo em http://localhost:8000
cd "$(dirname "$0")" || exit 1
URL="http://localhost:8000"
if command -v xdg-open >/dev/null 2>&1; then (sleep 1; xdg-open "$URL") >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then (sleep 1; open "$URL") >/dev/null 2>&1 &
fi
python3 -m http.server 8000
