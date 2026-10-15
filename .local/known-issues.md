# Known Issues Log

Running log of errors/bugs noticed in passing during development sessions (console errors,
server log warnings, dead code spotted while investigating something else, etc.) — logged here
so they get fixed opportunistically instead of getting lost. Not for the app's own tracked test
flakiness, which already has its own section in `CLAUDE.md`.

Newest entries at top. Each entry: date noticed, what/where, status, notes.

---

## 2026-09-05 — `/api/manager/:managerId/team`'s picks and fixture-status gameweek could disagree

- **Where:** `server/routes.ts`'s `app.all("/api/manager/:managerId/team", ...)` handler
  (~line 4357); consumed by `manager-team.tsx`, `top-manager-team.tsx`, `creator-team.tsx`.
- **Status:** Fixed — commit pending.
- **Notes:** Root cause pinned down (not the caching race first suspected): FPL's per-manager
  picks endpoint (`entry/{id}/event/{gw}/picks/`) can 404 for a manager even after the new
  gameweek has started — some managers' entries lag the transition on FPL's own backend — and
  the server correctly falls back to the previous gameweek's picks (`resolvedPicksGW`,
  ~line 4393-4419), returning `resolvedGameweek`/`entry_history.event` for the *actual* gameweek
  served. The bug: `top-manager-team.tsx`/`manager-team.tsx`/`creator-team.tsx` each
  independently recomputed "current gameweek" from `bootstrap-static`'s own current-gameweek
  signal for all fixture-status lookups, ignoring which gameweek the picks response actually
  came from. When the two disagreed, fixture start/finish badges reflected the *new* gameweek's
  matches laid over the *previous* gameweek's squad and points — a real, reproducible
  split-brain, not a transient race (confirmed via repeated checks against manager 9267, rank
  #1, whose GW3 picks were consistently unavailable while bootstrap showed GW3 as current).
  Fixed by making each page's `getCurrentGameweek()` prefer `teamData.resolvedGameweek` (falling
  back to `entry_history.event`, then the old bootstrap-based computation only if neither is
  present) — picks and fixture-status now always agree on which gameweek they're describing.

## 2026-09-05 — Vite dev server 504 "Outdated Optimize Dep" churn

- **Where:** `vite.config.ts` (dev server only, no production impact).
- **Status:** Fixed — commit pending.
- **Notes:** Hit repeatedly this session after adding a new shadcn/Radix import
  (`@radix-ui/react-accordion`) — Vite's cold-start dependency crawler doesn't always discover a
  package that's only reachable through a lazy-loaded route, so the first visit to a page using
  it mid-session triggers a "new dependency discovered" re-optimization, which 504s in-flight
  requests for the old dep chunk until the rebuild settles. Added every Radix/shadcn-adjacent
  package actually used in `client/src/components/ui/*.tsx` to `optimizeDeps.include` so they're
  all pre-bundled at cold start instead of discovered on demand.

## 2026-09-05 — Player points show "0" instead of a clear not-played indicator

- **Where:** `client/src/pages/top-manager-team.tsx` and `client/src/pages/manager-team.tsx`
  (both feed `client/src/components/pitch-view.tsx`'s `PitchPlayer`).
- **Status:** Fixed — commit pending.
- **Notes:** User-reported (top-managers/2/team showing Hall/Gabriel as "0" pre-kickoff).
  `pitch-view.tsx` already had correct fallback logic (`-` not started, `DNP` finished-with-zero-
  minutes, raw points otherwise) but `top-manager-team.tsx` always set `points_display`
  unconditionally, which short-circuits that fallback entirely — removed, now populates
  `fixture_started`/`fixture_finished`/`fixture_opponent`/`fixture_is_home` instead (mirroring
  `manager-team.tsx`'s already-correct pattern). Also fixed two adjacent gaps found while
  verifying: (1) neither page treated `fixture.finished_provisional` (flips true at full-time) as
  "over" — only `fixture.finished` (flips true once bonus points are officially confirmed, often
  hours later) — so DNP wouldn't show for that whole gap; both now treat either as finished.
  (2) `top-manager-team.tsx` ignored `pick.live_points` (the fresh, server-merged live score) and
  always used bootstrap's cached `event_points`, unlike `manager-team.tsx` — now prefers
  `live_points` when present, matching the sibling page.

## 2026-09-05 — Duplicate/dead `/api/auth/user` route registration

- **Where:** `server/replitAuth.ts:178` and `server/routes.ts:508` both register
  `app.get("/api/auth/user", ...)`. `server/index.ts` calls `setupAuth(app)` (replitAuth.ts)
  before `registerRoutes(app)` (routes.ts), and Express uses the first-registered handler for a
  path — so `routes.ts:508`'s version was dead code, never actually reached.
- **Status:** Fixed — commit pending.
- **Notes:** Confirmed `routes.ts:508`'s version was a straight subset of `replitAuth.ts`'s
  (same passport/session-user check, just reshaped the response slightly less completely) —
  genuinely redundant, not an unfinished migration. Removed and left an explanatory comment
  pointing at the surviving handler.

## 2026-09-05 — Odds refresh scheduler burning API quota on live matches

- **Where:** `server/odds-refresh-scheduler.ts`.
- **Status:** Fixed — commit `8de78a81`.
- **Notes:** The "any match live → refresh every 5 min" tier applied globally (any one live PL
  match tightened the cadence for the *entire* odds board, including fixtures a week out) and
  burned a large share of the monthly Odds API quota over a single matchday weekend, for no
  consumed benefit (nothing reads in-play odds movement). Removed; a live fixture now falls
  through to the 4h matchday tier.

## 2026-09-05 — Unconditional `/api/fpl/status` queries 401 for logged-out users

- **Where:** `client/src/pages/my-dashboard.tsx` (the home page) and
  `client/src/components/fpl-connect-dialog.tsx`.
- **Status:** Fixed — commit `8c7f3232`.
- **Notes:** Both queried `/api/fpl/status` with no `enabled` guard, unlike the other two call
  sites (`transfer-recommendations.tsx`, `transfer-planner.tsx`) which already gate on
  `enabled: !!user`. The endpoint's own `isAuthenticated` middleware always 401s for a logged-out
  session, so this was a guaranteed console error on every anonymous load of the home page.
  Added the same `enabled: !!user` / `enabled: isAuthenticated` guard to both.

## 2026-10-10 — Goals/assists projection caches silently stale since 2026-07-28; season labels wrong

- **Where:** `server/projection-cache-worker.ts` (+ readers in `server/routes.ts`, `server/projection-service.ts`).
- **Status:** Fixed — commit `57e887d7`. One-off data step: `scripts/relabel-projection-season.ts --apply` after deploy.
- **Notes:** The projection tables' primary key is (player/team id, gameweek) with no season, so the
  cachers' season-filtered deletes left old rows behind and every later insert collided with them.
  Cachers now clear whole tables; all projection-table reads/writes use `CURRENT_SEASON`
  (guarded by `tests/projection-season-label.test.ts`).

## 2026-10-10 — Defensive Contributions cache empty

- **Where:** `server/projection-cache-worker.ts` `cacheDefensiveProjections`.
- **Status:** Fixed — commit `38d37321`.
- **Notes:** Payload keys changed to `gw6` with `{dc, points}` values; `parseInt("gw6")` was NaN so zero records
  were built, yet the old rows were still deleted. Now parsed by `server/defensive-cache-records.ts` and the
  cacher refuses to wipe the table on 0 records.

## 2026-10-10 — Copilot xMins file never reaches production

- **Where:** `server/copilot-xmins-ingest.ts`; file lives in untracked `Manual Uploads/xMins/`.
- **Status:** Fixed — admin upload at `POST /api/admin/copilot-xmins/upload` + card on `/admin-cache-management`.
- **Notes:** The export is third-party data deliberately not committed, so Railway never had it. Also the ingest
  read `GW6_xMins` while the export now uses `xMins_6` (both accepted now). Each new drop: upload it on the
  Cache Management page, then refresh Minutes and Player Total Points.

## 2026-10-10 — Dead Player Goal Projections page and legacy endpoint

- **Where:** `client/src/pages/player-goal-projections.tsx`, `GET /api/player-goal-projections`.
- **Status:** Fixed — removed; `/player-goal-projections` now redirects to `/player-goals-scored-projections`.
- **Notes:** Admin-only, unlinked page whose field names never matched its API; the endpoint had no consumers.
  The earlier "Player pages fold-in" blocker note is obsolete.

## 2026-10-10 — Not issues (checked)

- **Top 25 Managers ID renumbering:** resolved — list is now Top 100, verified 2026-09-04, all 100 `confirmed: true`.
- **`/api/gameweek-projections`:** reads `gameweek_projections`/`gameweek_team_projections`, which hold only a
  one-off GW4 2025/26 snapshot; no writers or client consumers. The hardcoded `'2025/26'` matches the data.
- **Team Goals Against "In-memory" badge:** by design — no DB table, refresh just clears the in-memory cache.

## 2026-10-15 — "Flaky" cache-integrity test was a real cold-start inconsistency

- **Where:** `GET /api/cached/player-total-points` in `server/routes.ts` (cache-hit path); caught by `tests/cache-integrity.test.ts`.
- **Status:** Fixed — commit pending (see git log "Fix cache-hit totals...").
- **Notes:** The first response after a server restart (cache MISS -> live aggregator) and later responses (cache HIT -> stored data plus an inline availability adjustment) disagreed for players whose gameweeks are all zeroed by availability (status unavailable/injured, e.g. players who left the club): the hit path zeroed the per-gameweek values but kept the stored raw total (e.g. 9.5 vs 0). The hit path's inline copy of the availability logic now recomputes `totalExpectedPoints` from the adjusted gameweeks, like the live aggregator's `applyAvailabilityAdjustments`. Regression test: "every player's totalExpectedPoints equals the sum of their gameweekProjections (warm cache)". Remaining smell: the cache-hit path still duplicates ~100 lines of `applyAvailabilityAdjustments` (and neither recomputes `averagePerGameweek`); consider extracting one shared function.

## 2026-10-16 — Remaining "known flaky" tests investigated: not reproducible

- **Where:** `tests/projection-consistency.test.ts`, `tests/projection-validation-historical-compare.test.ts` (and the stale `promoted-team-admin-settings` entry).
- **Status:** Not reproducible — documentation corrected; no behaviour change. Hardening only: clearer failure messages in the goal/assist structural tests; `scripts/flake-hunt.sh` for catching a recurrence.
- **Notes:** Tried: 3 warm full-suite runs (all green), 3 cold-start cycles, 3 runs with a forced total-points refresh 2/6/12 s into projection-consistency, 3 concurrent copies of both files, 40 admin logins each followed immediately by an admin-gated request (0 non-200). The "resource contention" explanation in CLAUDE.md was unsupported and has been replaced. If either fails again, capture the server log at that moment before assuming contention (see CLAUDE.md).
