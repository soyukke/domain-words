#!/bin/sh
# Builds the Kizu WebAssembly browser bundle and syncs assets into web/.
# Usage:
#   KIZU=/path/to/kizu KIZU_LIB_DIR=/path/to/kizu/lib/kizu sh scripts/build.sh
set -eu
cd "$(dirname "$0")/.."

if [ -z "${KIZU:-}" ]; then
  if command -v kizu >/dev/null 2>&1; then
    KIZU="$(command -v kizu)"
  else
    echo "error: kizu binary not found in PATH; set KIZU=/path/to/kizu" >&2
    exit 1
  fi
fi

if [ -n "${KIZU_LIB_DIR:-}" ]; then
  export KIZU_LIB_DIR
fi

rm -rf dist web/core
mkdir -p dist web/core web/data
"$KIZU" build --target wasm32-browser --emit esm --opt -o dist .
cp js/bridge.mjs dist/index.mjs
cp dist/app.wasm dist/app.mjs dist/index.mjs web/core/
if [ -f data/words.json ]; then
  cp data/words.json web/data/words.json
fi
ls -lh dist/ web/core/
