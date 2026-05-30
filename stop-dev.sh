#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Bluwa — Arrêt de tous les serveurs de développement
# ─────────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/.logs"

stop_server() {
  local name=$1
  local port=$2
  local pid_file="$LOG_DIR/$name.pid"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    kill "$pid" 2>/dev/null && echo "🛑  $name arrêté (PID $pid)"
    rm -f "$pid_file"
  fi

  # Tue aussi par port au cas où
  lsof -ti ":$port" | xargs kill -9 2>/dev/null || true
}

stop_server "frontend" 3000
stop_server "landing"  3001
stop_server "merchant" 3002

echo "✅  Tous les serveurs sont arrêtés."
