#!/usr/bin/env bash
# Gera o build de produção do Pobi, instala em /Applications e fixa no Dock.
# Rode depois de cada mudança:  npm run install-app
set -euo pipefail
cd "$(dirname "$0")/.."

DESTINO="/Applications/Pobi.app"

# Puxa a última versão da main quando não há mudanças locais pendentes.
if [ -z "$(git status --porcelain)" ]; then
  git pull --ff-only || echo "Aviso: não consegui atualizar do GitHub, seguindo com o código local."
fi

npm install --no-audit --no-fund
npx tauri build --bundles app

ALVO="${CARGO_TARGET_DIR:-src-tauri/target}"
APP="$ALVO/release/bundle/macos/Pobi.app"
[ -d "$APP" ] || { echo "Build não encontrado em $APP"; exit 1; }

# Fecha o Pobi aberto antes de trocar o app.
osascript -e 'tell application "Pobi" to quit' >/dev/null 2>&1 || true
pkill -x pobi >/dev/null 2>&1 || true

rm -rf "$DESTINO"
cp -R "$APP" "$DESTINO"
xattr -dr com.apple.quarantine "$DESTINO" 2>/dev/null || true

# Fixa no Dock uma vez só.
if ! defaults read com.apple.dock persistent-apps 2>/dev/null | grep -q "Pobi.app"; then
  defaults write com.apple.dock persistent-apps -array-add \
    "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>file://$DESTINO/</string><key>_CFURLStringType</key><integer>15</integer></dict></dict></dict>"
  killall Dock
  echo "Pobi fixado no Dock."
fi

open "$DESTINO"
echo "Pobi $(defaults read "$DESTINO/Contents/Info" CFBundleShortVersionString) instalado em $DESTINO"
