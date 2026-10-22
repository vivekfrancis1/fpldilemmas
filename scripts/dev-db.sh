#!/bin/bash
# Local development/test database (Postgres 18 from Homebrew, port 5433, database fpldilemmas_dev).
# Dev servers and tests must use this, never the production database (server/db.ts refuses a remote DATABASE_URL
# when NODE_ENV is development or test).
#
#   scripts/dev-db.sh start     start the local Postgres (creates the database if it is missing)
#   scripts/dev-db.sh stop      stop it
#   scripts/dev-db.sh status    is it running, and how many tables/rows
#   scripts/dev-db.sh refresh   REPLACE the local data with a fresh copy of production's structure and its
#                               non-personal data (read-only dump of PROD_DATABASE_URL; users, sessions,
#                               activity logs, drafts, alerts, watchlists, price overrides, league snapshots
#                               and manager profiles are NOT copied)
#
# .env should contain:  DATABASE_URL=postgresql://localhost:5433/fpldilemmas_dev
#                       PROD_DATABASE_URL=<Railway Postgres DATABASE_PUBLIC_URL>   (only needed for refresh)
set -euo pipefail
export PATH=/opt/homebrew/opt/postgresql@18/bin:$PATH LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
PORT=5433
DB=fpldilemmas_dev
DATA=/opt/homebrew/var/postgresql@18
LOG=/opt/homebrew/var/log/postgresql@18.log
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PERSONAL_TABLES=(users sessions session user_activity_logs transfer_planner_drafts price_alerts watchlist_entries buy_price_overrides league_manager_snapshots manager_profiles)

running() { pg_isready -q -h localhost -p $PORT; }

case "${1:-}" in
  start)
    running || pg_ctl -D "$DATA" -l "$LOG" -o "-p $PORT -c listen_addresses=localhost" start >/dev/null
    for _ in $(seq 1 20); do running && break; sleep 0.5; done
    running || { echo "Postgres did not start; see $LOG"; exit 1; }
    psql -h localhost -p $PORT -d postgres -Atc "select 1 from pg_database where datname='$DB'" | grep -q 1 || createdb -h localhost -p $PORT "$DB"
    echo "Local Postgres is running: postgresql://localhost:$PORT/$DB"
    ;;
  stop)
    pg_ctl -D "$DATA" stop
    ;;
  status)
    if running; then
      echo "running on port $PORT"
      psql -h localhost -p $PORT -d "$DB" -Atc "select count(*) || ' tables' from information_schema.tables where table_schema='public'"
    else
      echo "not running (scripts/dev-db.sh start)"; exit 1
    fi
    ;;
  refresh)
    if [ -z "${PROD_DATABASE_URL:-}" ] && [ -f "$ROOT/.env" ]; then
      PROD_DATABASE_URL="$(grep -E '^PROD_DATABASE_URL=' "$ROOT/.env" | head -1 | cut -d= -f2-)"
    fi
    [ -n "${PROD_DATABASE_URL:-}" ] || { echo "Set PROD_DATABASE_URL (Railway > Postgres > Variables > DATABASE_PUBLIC_URL) in .env"; exit 1; }
    "$0" start
    DUMP="$(mktemp -t fpl-prod-dump).dump"
    trap 'rm -f "$DUMP"' EXIT
    ARGS=(); for t in "${PERSONAL_TABLES[@]}"; do ARGS+=(--exclude-table-data="$t"); done
    echo "Dumping production (read-only, personal tables excluded)..."
    pg_dump "$PROD_DATABASE_URL" -Fc --no-owner --no-privileges "${ARGS[@]}" -f "$DUMP"
    echo "Replacing local database $DB..."
    dropdb -h localhost -p $PORT --if-exists "$DB"
    createdb -h localhost -p $PORT "$DB"
    pg_restore -h localhost -p $PORT -d "$DB" --no-owner --no-privileges "$DUMP"
    "$0" status
    ;;
  *)
    sed -n 2,16p "$0"; exit 1
    ;;
esac
