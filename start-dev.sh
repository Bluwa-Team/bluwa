#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Bluwa — Script de démarrage des serveurs de développement
#  Lance : frontend (3000) · landing (3001) · merchant (3002)
#  Usage  : ./start-dev.sh
#  Stop   : ./stop-dev.sh
# ─────────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

start_server() {
  local name=$1
  local dir=$2
  local port=$3
  local pid_file="$LOG_DIR/$name.pid"

  # Vérifie si déjà en cours
  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "✅  $name déjà actif sur :$port (PID $(cat "$pid_file"))"
    return
  fi

  # Tue ce qui traîne sur le port
  lsof -ti ":$port" | xargs kill -9 2>/dev/null || true
  sleep 0.5

  echo "🚀  Démarrage $name → http://localhost:$port"
  cd "$dir" && nohup npm run dev >> "$LOG_DIR/$name.log" 2>&1 &
  echo $! > "$pid_file"
  cd "$ROOT"
}

start_server "frontend" "$ROOT/frontend"  3000
start_server "landing"  "$ROOT/landing"   3001
start_server "merchant" "$ROOT/merchant"  3002

echo ""
echo "─────────────────────────────────────────"
echo "  🌍  frontend  → http://localhost:3000"
echo "  🏠  landing   → http://localhost:3001"
echo "  🏪  merchant  → http://localhost:3002"
echo "─────────────────────────────────────────"
echo "  Logs : $LOG_DIR/"
echo "  Stop : ./stop-dev.sh"
echo "─────────────────────────────────────────"
