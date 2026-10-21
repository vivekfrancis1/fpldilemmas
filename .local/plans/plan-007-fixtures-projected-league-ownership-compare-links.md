# Plan 007 — Projected view on Fixtures, Mini-league ownership, Compare links (accuracy page deferred)

Status: IMPLEMENTED locally (not pushed). Decisions (2026-10-21): Projected view shows our numbers with relative colours (no 1-5); league ownership capped at the top 50 with a visible sample label; accuracy page stays deferred.
Built: shared/projected-fdr.ts + Projected mode on Fixtures; shared/league-ownership.ts + GET /api/league-ownership/:leagueId + /league-ownership page; compareUrl() links from Matrix, Brief and Rate My Team. Tests: projected-fdr (13), league-ownership (16), compare-utils (+3).
Created: 2026-10-21

Source: the "best fits" from the competitor research follow-up. Principle unchanged: official data, exact arithmetic, or our own tested projections; every sample size and approximation is shown.

## Feature 1 — "Projected" view on the Fixtures page
Why: Scout and fpl.page show goal and clean-sheet odds in their fixture tickers; we already compute both per fixture.
Data (already served, no new model):
- `GET /api/team-goal-projections` -> `fixtureDetails[gw][] = { opponent, isHome, goals, source }` (expected goals FOR the team in that fixture; source "odds" or "model").
- `GET /api/team-cs-projections` -> `fixtureDetails[gw][] = { opponent, isHome, cleanSheetOdds, source }` (%).
Design: a new FDR mode "Projected" next to Official / Season Form / Last Season / Custom, with an Attack | Defence switch.
- Attack: each cell shows the team's projected goals in that fixture (e.g. 2.1). Defence: shows clean-sheet chance (e.g. 48%).
- NOT converted into an invented 1-5 rating. The numbers are shown as they are; cell colour uses quintiles of the fixtures currently on screen (top 20% easiest = darkest green ... bottom 20% = darkest red), and the legend says "colour = rank among the fixtures shown". Rule is simple, stated, and testable.
- Double gameweeks show each fixture's value; blank stays blank. A small marker where `source` is "model" rather than "odds".
- Team average column = mean of the shown fixtures' values.
Tests (`tests/fixtures-projected.test.ts`, pure helper `shared/projected-fdr.ts`): quintile assignment (ties, small sets, one value), average, DGW cells list each fixture, blank gameweek has no value, values equal the two endpoints' `fixtureDetails`, attack uses goals / defence uses clean-sheet odds, direction (higher = easier for both).

## Feature 2 — Mini-league ownership (`/league-ownership`, public)
Gap check: league analysis shows standings, live standings, transfers, history; nothing on ownership or differentials.
Why accurate: a league is small, so counting is exact for the managers loaded (unlike global effective ownership, which we ruled out).
What it shows (for a classic league ID and the latest finished gameweek, selectable):
1. Ownership: for each player, how many of the managers counted hold him (bench included) and %, top 30.
2. Captains: how many chose each captain.
3. League template XI: the existing `buildTemplateTeam` fed with the league's squads (reuse, already tested).
4. Optional "you" mode (team ID): your differentials (you own, under 25% of the league) and your gaps (>= 50% of the league own, you don't). Exact counts; thresholds shown on the page.
Sample rule: standings return 50 managers per page, so a larger league is sampled as "the top 50 by rank, 50 of N managers"; always displayed. One FPL picks call per manager, cached ~10 minutes, rate-limited.
Endpoint: `GET /api/league-ownership/:leagueId?gw=&managerId=`; pure module `shared/league-ownership.ts`.
Tests (`tests/league-ownership.test.ts`): ownership counts and percent against hand-counted fixtures; bench counted; captain counts; managers with incomplete picks excluded from the denominator and reported; differentials/gaps thresholds exact (boundary values); sample label for leagues over 50; API consistency with the raw picks from FPL for a real small league; invalid or unknown league 400/404.

## Feature 3 — Compare links (wiring only)
Add "Compare" entry points: player names in the Captaincy Matrix, Pre-deadline Brief and Rate My Team upgrades link to `/compare?p=<id>` (the upgrade row links out vs in: `/compare?p=outId,inId`). No new data or logic; link-building helper covered by a small test of the URLs.

## Feature 4 — Public projection accuracy page: DEFERRED
Reason found: `/api/projection-accuracy/summary` has no rows for 2026/27 (capture runs only in production, after each deadline) and one gameweek (GW32) for 2025/26 (avg absolute error ~1.8 points per player, avg percentage error ~89.5%). A public page now would be almost empty and the one figure is hard to interpret. Revisit once production has captured several 2026/27 gameweeks; at that point agree which metrics to publish and how to explain them.

## Effort
Feature 1: medium (UI mode + helper). Feature 2: medium (endpoint + page + helper; FPL rate limits). Feature 3: small.

## Decisions needed
1. Projected view: show our goals / clean-sheet numbers with relative (quintile) colours and no 1-5 conversion (recommended), or convert to a 1-5 rating with fixed cut-offs?
2. Mini-league: 50-manager cap with the sample label (recommended), or only support leagues of 50 or fewer?
3. Keep the public accuracy page deferred (recommended)?
