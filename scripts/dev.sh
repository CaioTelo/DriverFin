#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

for required_file in .env apps/api/.env apps/web/.env.local; do
  if [[ ! -f "$required_file" ]]; then
    echo "Arquivo $required_file ausente. Execute primeiro: npm run dev:setup" >&2
    exit 1
  fi
done

docker compose up -d --wait db

api_pid=""
web_pid=""

stop_apps() {
  if [[ -n "$api_pid" ]]; then
    kill "$api_pid" 2>/dev/null || true
  fi
  if [[ -n "$web_pid" ]]; then
    kill "$web_pid" 2>/dev/null || true
  fi
}

trap stop_apps EXIT INT TERM

npm run dev --workspace apps/api &
api_pid=$!
npm run dev --workspace apps/web &
web_pid=$!

echo "DriverFin local: http://localhost:3000/login"
echo "API health:      http://localhost:3001/api/health"
echo "Use Ctrl+C para encerrar API e frontend; o PostgreSQL continuará ativo."

wait -n "$api_pid" "$web_pid"
