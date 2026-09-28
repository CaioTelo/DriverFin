#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

copy_example_if_missing() {
  local example_path="$1"
  local target_path="$2"

  if [[ ! -f "$target_path" ]]; then
    cp "$example_path" "$target_path"
    echo "Criado $target_path a partir de $example_path."
  fi
}

copy_example_if_missing .env.example .env
copy_example_if_missing apps/api/.env.example apps/api/.env
copy_example_if_missing apps/web/.env.example apps/web/.env.local

docker compose up -d --wait db
npm run db:generate --workspace apps/api
npm run db:deploy --workspace apps/api
npm run db:seed --workspace apps/api

echo "Ambiente local preparado. Execute: npm run dev"
