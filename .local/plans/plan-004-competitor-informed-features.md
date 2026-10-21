# Plan 004 — Competitor-informed features (Compare, Captaincy Matrix, Bonus/Def Con tracker)

Status: IN PROGRESS. User decisions (2026-10-21): full Compare page, then Captaincy Matrix as a separate public page; fix name matching; Feature 3 (bonus/Def Con tracker), Live FPL and effective ownership SKIPPED.
Progress: Feature 1 (Compare page) implemented locally with tests; Feature 2 (Captaincy Matrix) implemented locally with tests (endpoint /api/captaincy-matrix, page /captaincy-matrix). Open: no position filter (a GK/DEF can top a team's list when our xPts say so); right after a cold start the cached projections can be briefly incomplete, which the matrix mirrors.
Created: 2026-10-21

## Why these features
Competitor research (Scout, FFHub, FPL Review, Solio, fpl.page, LiveFPL, FPL Edits, NextXI; see chat 2026-10-21) found:
- No tool publishes per-feature usage, so "most popular" is inferred. Live-gameweek tools (LiveFPL) look biggest by traffic estimates (sources conflict by several times); planners/projections are what paid tools charge for.
- Our edge is our own projections. Features built on them fit the site best and are hardest to copy.
- The site is new with little usage, so there is no internal analytics to rank by yet.

Rejected for now: Effective Ownership by rank tier (the official API only exposes ~top 10K of the overall league; Top 100K/1M cannot be computed exactly), live rank / full EO (LiveFPL's territory, heavy polling), decision-tree planner, graphics generator, predicted lineups (needs a data source).

Hard rule for all features: **accuracy first**. Every number shown is either official FPL data or comes from an existing, already-tested projection endpoint. Anything partial is labelled with its sample/scope. No new scoring logic without a test and user approval.

## Feature 1 — Compare page (`/compare`)
Standalone page replacing the Player Stats-only pop-up (`client/src/components/player-comparison-modal.tsx`, 5 players max).

What it shows
- Player search/add (up to 5), shareable URL `/compare?p=id,id,...`.
- Side-by-side season totals (same stat list as today's modal) with best value per row highlighted.
- Next 5 fixtures per player (opponent, home/away, official FDR).
- Our xPts per upcoming gameweek and total, read from `GET /api/cached/player-total-points` (`gameweekProjections`), so numbers match the Points page exactly.
- Past seasons tab (kept from the modal).

Accuracy notes
- No new calculations. Totals come from bootstrap/historical data; xPts from the cached projection endpoint.
- KNOWN RISK: past seasons are matched by first_name + second_name (modal lines ~70-80). Same-name or renamed players can mismatch. Fix before reuse: match on the FPL `code` field if present in historical data, else flag as "no match" instead of guessing. Needs checking against `/api/players/historical/:season`.
- Highlighting rule: higher is better except goals conceded, cards, own goals, penalties missed (lower is better). Ties highlight nothing.

Tests (`tests/compare-page.test.ts`, Vitest)
1. Shared-URL parsing: valid ids, duplicates removed, >5 truncated, unknown ids dropped.
2. Best-value highlighter: higher/lower-is-better stats, ties, missing values.
3. Cross-endpoint: xPts shown for a player equals that player's value in `/api/cached/player-total-points`.
4. Historical matching: same-name fixture does not cross-match; unmatched shows no data.

Effort: small–medium. Mostly UI reuse.

## Feature 2 — Captaincy Matrix
Best captain option per Premier League team for the upcoming gameweek, ranked by our xPts.

Important finding: the existing `captain-selector.tsx` uses a heuristic 6-factor score from bootstrap data (form, fixture, ownership, ICT...), NOT our xPts projections. The matrix is a new, separate view and must not silently replace it. Decision needed on how they coexist.

What it shows
- Grid: one row per team, its top 3 captain candidates for the next GW (or a selected GW), each with xPts, opponent, home/away, official FDR.
- Captain value = 2 × xPts for that gameweek (blank gameweek = excluded, double gameweek = sum of both fixtures, taken from the projection endpoint's own handling).
- Ownership shown as the official `selected_by_percent` only, labelled "overall ownership" (not EO).

Accuracy notes
- xPts must be read from the same cached endpoint as the Points page; no recomputation in the matrix.
- Availability: use the endpoint's availability-adjusted values and show the injury/doubt flag beside the name.

Tests (`tests/captaincy-matrix.test.ts`)
1. Ranking: for a fixed GW, per-team top 3 equals the top 3 by xPts from the cached endpoint.
2. Double gameweek: a team with two fixtures shows both and the summed xPts.
3. Blank gameweek: team with no fixture is shown as "no fixture", not 0 xPts.
4. Consistency: matrix xPts equals Points page xPts for every listed player.

Effort: small–medium. Backend may be a thin endpoint (`/api/captaincy-matrix?gw=`) that selects from the cached projections, so the grouping logic is testable server-side.

## Feature 3 — Bonus & Def Con tracker (needs verification before building)
Earlier chat described this as "easy/very low risk". That was too optimistic:
- "Revisions" (before vs after the official bonus is added) need snapshots over time. The live endpoint only shows the current state, so we would need to poll and store snapshots (new table + scheduler job). That is new infrastructure, not a thin read.
- A "provisional bonus" view computed from BPS needs FPL's tie rules (3/2/1 to the top three BPS, with tie handling). Deterministic and testable, but must be tested against real finished fixtures.
- One source says the official FPL site now shows projected bonus points during matches in 2026/27. If true, much of the value is duplicated. UNVERIFIED — check the live FPL site before spending effort.

Proposed approach if it passes verification
- Phase 3a: read-only "bonus this gameweek" per fixture: BPS ranking, provisional bonus (with tie rules), awarded bonus once available. Def Con points from `defensive_contribution` in the live feed (verify the field name against `/api/event/{gw}/live`).
- Phase 3b (optional): snapshot store + revision log with "last revised" time.

Tests (`tests/bonus-tracker.test.ts`)
1. Provisional bonus from BPS for fixtures with: clear top three, tie for first, tie for second, tie for third.
2. Replay several finished historical fixtures: computed provisional bonus equals the awarded `bonus` field.
3. Def Con: points equal the live feed's own values for sampled players.

Effort: medium (3a), medium–large (3b).

## Suggested order
1. Compare page (lowest risk, immediate use).
2. Captaincy Matrix (reuses projections).
3. Verify Feature 3 against the live FPL site, then decide whether to build 3a/3b.
Deferred: Template Team (Top 100 only, labelled), Rate My Team, chip-timing view — plan separately.

## Decisions needed from the user
1. Compare page: full version (fixtures + xPts) or the smaller one (search + share link only)?
2. Captaincy Matrix: separate page alongside the existing Captain Selector, or replace the selector's scoring with xPts? (Recommend separate page; no change to existing logic.)
3. Top-nav placement: Compare and Matrix under "Popular Tools"? Public or admin-only at first?
4. Fix the past-seasons name matching as part of the Compare work? (Recommend yes.)
5. Feature 3: verify the live FPL site first and defer the build?

## Verification before any deploy
- `npx tsc --noEmit -p .` and `npx vitest run` both clean (dev server on port 5050 for API tests).
- Browser check on phone and desktop widths, light and dark.
- Local commits only; no push until the user says so.
