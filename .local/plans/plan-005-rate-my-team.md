# Plan 005 — Rate My Team

Status: IMPLEMENTED locally (not pushed). Decisions (2026-10-21): lead with rank among the Top 100; current price as selling price with a visible caveat; public page under My FPL; default horizon 5 GWs (1/3/5/8 selectable).
Built: shared/lineup.ts, shared/rate-my-team.ts, GET /api/rate-my-team/:managerId, /rate-my-team page; tests/lineup.test.ts + tests/rate-my-team.test.ts (28 tests).
Created: 2026-10-21

## Goal
A public page where a manager enters their FPL team ID and gets an honest, measurable assessment of their squad using our own projections. Competitors (Scout, FFHub) offer "Rate My Team"; ours must be accurate, so every output is either a fact from the FPL data or a number computed from the same cached xPts the Points page shows.

## Design principle: no invented score
No 0-100 grade, no letter grade, and no "% of the best possible squad". Reason: `server/wildcard-squad-builder.ts` is a greedy heuristic, not an exact optimiser (its own header says so), so any "best possible squad" benchmark could be beaten and the percentage would be wrong. Instead the page shows four measurable things.

## What the page shows (horizon: next 5 gameweeks, selectable)
1. **Projected points.** For each gameweek in the horizon: the best legal starting XI (all valid formations, 1 GKP, 3-5 DEF, 2-5 MID, 1-3 FWD) from the user's 15, plus the captain (highest xPts in the XI, counted twice). Same method as the existing My Dashboard projection (routes.ts ~3765), extracted into one tested pure function instead of copied again. Blank gameweek = player contributes nothing that week (null, not a guess). Double gameweek uses the projection value as given. Chips are ignored and the page says so.
2. **Rank among the Top 100.** The same projected-points measure computed for each of the Top 100 managers' squads (the ones `/api/top-managers/teams` already loads), so the comparison is like-for-like: "Your squad projects 61.4 points over GW8-12. That would rank 23rd of 100; the Top 100 average is 58.9, the highest 66.2." Caveat shown: their squads are as at the last completed gameweek, before any transfers they make this week, and "Top 100" is our fixed all-time list.
3. **Upgrade opportunities.** For each of the 15 players, the best single replacement: same position, not already in the squad, price <= selling price + bank, keeps the 3-per-club rule given the rest of the squad, available to play. Ranked by horizon xPts gain (best XI + captain recomputed, so a bench swap shows its real, smaller gain). Top 5 shown. Each row is an alternative, not additive with the others, and the page says so. Transfer cost (a free transfer or -4) is shown but not netted.
4. **Facts and risks.** Players in the XI flagged injured/doubtful (FPL's own status and chance of playing), players with no fixture in the horizon, double-gameweek players, bench xPts total. No judgement thresholds invented.

## Data and endpoints
- Team: reuse `GET /api/manager/:managerId/team` (current picks). New endpoint `GET /api/rate-my-team/:managerId?horizon=5` assembles everything server-side so it is testable.
- Projections: `GET /api/cached/player-total-points` (`gameweekProjections`, availability-adjusted).
- Top 100: `GET /api/top-managers/teams`.
- New shared pure modules: `shared/lineup.ts` (best XI + captain for one gameweek), `shared/rate-my-team.ts` (horizon totals, Top 100 rank, upgrade search).

## Known limitations to state on the page
- Selling price: without an FPL login we only know current price, not the manager's real sell price (FPL keeps part of price rises). Upgrade affordability therefore uses current price as the sell price unless the manager has connected FPL. Marked as approximate.
- Projections are the model's estimates, not guarantees; same disclaimer as other projection pages.
- Right after a cold start the cached projections can be briefly incomplete (see known-issues); the page reads whatever the endpoint serves.

## Tests (TDD, tests first, `tests/rate-my-team.test.ts` + `tests/lineup.test.ts`)
Lineup
1. Picks the highest-xPts legal XI across all formations; never violates 1 GKP / 3-5 DEF / 2-5 MID / 1-3 FWD.
2. Captain is the highest xPts in the XI and is counted twice; total = XI sum + captain xPts.
3. Matches the existing My Dashboard method on a fixed fixture squad (guards against the two drifting apart).
4. Blank-gameweek player contributes 0 and is never preferred over a playing one; fewer than 11 available players handled without crashing.
Rate My Team
5. Horizon total equals the sum of per-gameweek totals; changing the horizon changes only the gameweeks included.
6. Rank among the Top 100: ties rank equal; user above/below/within the field; field average and best are exact.
7. Upgrades: respects position, price <= selling price + bank, 3-per-club given the rest of the squad, excludes players already owned and unavailable players; gain equals recomputed (new XI total - old XI total), so a bench swap gain is correct; sorted by gain, top 5.
8. Flags: injured/doubtful XI players listed with FPL's status; players with no fixture in the horizon listed; none invented.
9. API consistency: every xPts shown equals the value in `/api/cached/player-total-points`; Top 100 count matches `/api/top-managers/teams`; invalid or unknown team ID returns 400/404 with a clear message.

## UI
Single page `/rate-my-team` under "My FPL" (public). Team ID input (remembered locally like My Team), a summary card (projected points, Top 100 rank, average, best), per-gameweek table, upgrade list, flags. Phone-first, light/dark. No new colours beyond existing tokens.

## Effort
Medium: two small pure modules with tests, one endpoint, one page.

## Decisions needed from the user
1. Headline: lead with "rank among the Top 100" (recommended; exact and like-for-like) or show only the raw projected points?
2. Default horizon: 5 gameweeks (recommended), with 1/3/5/8 selectable?
3. Selling price: accept the "current price" approximation for upgrades (with the visible caveat), or only show upgrades when the manager has connected FPL?
4. Where to put it: "My FPL" menu, public (recommended), or admin-only first?
