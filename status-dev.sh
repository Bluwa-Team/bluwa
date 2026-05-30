#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Bluwa — Statut des serveurs de développement
# ─────────────────────────────────────────────────────────────

check() {
  local name=$1
  local port=$2
  if lsof -ti ":$port" > /dev/null 2>&1; then
    echo "✅  $name   → http://localhost:$port  (actif)"
  else
    echo "❌  $name   → :$port  (arrêté)"
  fi
}

echo ""
echo "─── Bluwa Dev Servers ───────────────────"
check "frontend (ERP)" 3000
check "landing        " 3001
check "merchant portal" 3002
echo "─────────────────────────────────────────"
echo ""
