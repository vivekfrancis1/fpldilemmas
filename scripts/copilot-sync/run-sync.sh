#!/bin/bash
# Run by launchd whenever the Copilot export changes. Loads .env (DATABASE_URL) and syncs the
# file to the database; the sync is idempotent and validates the file first.
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_DIR" || exit 1
set -a
# shellcheck disable=SC1091
source .env
set +a
echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="
npx tsx scripts/sync-copilot-xmins.ts
