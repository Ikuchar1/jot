#!/usr/bin/env bash
# Runs Postgres, the API and the UI for one slot, so several worktrees can run side by side.
#   ./dev.sh      slot 0: API 5080, UI 5173, database jot   (the main folder)
#   ./dev.sh 2    slot 2: API 5082, UI 5175, database jot_2
# Ctrl+C stops the API and the UI. Postgres keeps running; every slot shares it.
set -euo pipefail

slot="${1:-0}"
if [[ ! "$slot" =~ ^[0-9]$ ]]; then
  echo "Usage: ./dev.sh [slot]   (slot is 0-9; 0 is the main folder)" >&2
  exit 1
fi

api_port=$((5080 + slot))
ui_port=$((5173 + slot))
database=jot
if [ "$slot" -ne 0 ]; then database="jot_$slot"; fi

cd "$(dirname "$0")"

for port in "$api_port" "$ui_port"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use. Is slot $slot running in another worktree? Pick another slot." >&2
    exit 1
  fi
done

# An env var rather than appsettings, so it still works in worktrees where .NET skips the (hidden) config files
export ConnectionStrings__Jot="Host=localhost;Port=5433;Database=$database;Username=jot;Password=jot"

docker compose up -d --wait

# A new worktree has no node_modules yet
if [ ! -d ui/node_modules ]; then
  (cd ui && npm ci)
fi

# Creates the slot's database the first time. That first run logs "fail: ... An error occurred using the
# connection to database 'jot_N'" before CREATE DATABASE; it's EF checking whether the database exists, not a failure.
(cd api && dotnet tool restore >/dev/null && dotnet ef database update --project Jot.Api)

# Job control puts each server in its own process group, so stopping a group also stops what it started
# (dotnet run's API process, npm's Vite). Stdin is /dev/null so a background server never waits on the terminal.
set -m
(cd api && exec dotnet run --project Jot.Api --launch-profile http -- --urls "http://localhost:$api_port") </dev/null &
api_group=$!
# An env var beats the VITE_API_URL in ui/.env.development
(cd ui && VITE_API_URL="http://localhost:$api_port" exec npm run dev -- --port "$ui_port" --strictPort) </dev/null &
ui_group=$!

stop_servers() {
  kill -- -"$api_group" -"$ui_group" 2>/dev/null || true
}
trap stop_servers INT TERM EXIT

echo "Slot $slot: UI http://localhost:$ui_port | API http://localhost:$api_port | Scalar http://localhost:$api_port/scalar | database $database"
wait
