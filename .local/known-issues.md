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
