# Plan 012 — Local dev/test database (stop local runs touching production)

Status: IMPLEMENTED locally, not pushed (2026-10-23). Decision (user): local Postgres, not a second Railway database.
Created: 2026-10-23

Why: the open known issue "local dev servers and tests share the production database" — schedulers, snapshots and caches started locally could write to production (and the local `.env` password rotation on 2026-10-23 showed how easy it is to point at prod by accident).

What was done
- Installed `postgresql@18` with Homebrew (production is 18.6, so `pg_dump` matches). Homebrew's post-install step crashed (outdated brew), so the cluster was created by hand: symlinks `/opt/homebrew/share/postgresql@18` and `/opt/homebrew/lib/postgresql@18` into the keg, `initdb` in `/opt/homebrew/var/postgresql@18`, port 5433, trust auth on localhost, `LC_ALL=en_US.UTF-8` required to start. Not set to start at login: run `scripts/dev-db.sh start`.
- Loaded `fpldilemmas_dev` from a read-only `pg_dump` of production (structure + data), excluding the data of personal tables: users, sessions, session, user_activity_logs, transfer_planner_drafts, price_alerts, watchlist_entries, buy_price_overrides, league_manager_snapshots, manager_profiles. 65 tables; e.g. gameweek_player_data 33,790 rows, projection_snapshots 344,556.
- `.env`: `DATABASE_URL` = local; `PROD_DATABASE_URL` = production (used only by `refresh`).
- `server/db-config.ts` (+ `tests/db-config.test.ts`, 8 tests): `isLocalDatabaseUrl`, `poolSslOption` (no TLS for local; Railway-style TLS for remote), `assertSafeDatabase` (throws when NODE_ENV is development/test and the URL is remote, unless `ALLOW_REMOTE_DB=1`; never prints the password). `server/db.ts` uses them.
- `scripts/dev-db.sh start|stop|status|refresh`; CLAUDE.md section "Local development database".

Checked: a fresh dev server against the local DB boots (content creators 95, admin user created locally), serves `/api/cached/player-total-points` (503 while warming, then 200, same payload size as production); the guard refuses the production URL in a dev run and the override works.

Caveats
- Dev servers started before the change (one was already running on port 5050) keep the production URL until restarted. The API tests are plain HTTP clients on port 5050, so restart the dev server (after `scripts/dev-db.sh start`) before running them.
- Local data is a snapshot: run `scripts/dev-db.sh refresh` to update it. Personal tables are empty locally.
- Local Postgres is not started automatically after a reboot.
