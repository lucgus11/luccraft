#!/usr/bin/env bash
set -euo pipefail

# Vérifie la présence de marqueurs de conflit de fusion dans le dépôt.
# Utilisation: ./scripts/check_conflits_extraction.sh

if rg -n "^(<<<<<<<|=======|>>>>>>>)" -S . --glob '!*.png' --glob '!*.jpg' --glob '!*.jpeg' --glob '!*.gif'; then
  echo "❌ Des conflits de fusion non résolus ont été détectés."
  exit 1
fi

echo "✅ Aucun conflit de fusion détecté (demande d'extraction propre)."
