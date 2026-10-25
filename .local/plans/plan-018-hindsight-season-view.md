# Plan 018 — Hindsight: Season view

Status: IMPLEMENTED locally (2026-10-25), not pushed. Season view + ten What-if scenarios (set and forget, same captain, vice-captain, chase form, one goalkeeper, stop rotating by position, chip timing, hits, no Wildcard, no Free Hit); 98 tests across the hindsight files pass. Decisions: Season view only (transfers / bench swaps / chip timing deferred); own squad only, no GW-average or other-manager benchmarks.
Builds on: plan-006 (Hindsight, single gameweek).

Principle (unchanged): every number is official FPL data or exact arithmetic on it. No grade, no "you should have known".

## What it adds
A **Season** tab on `/hindsight` summarising every finished gameweek the manager has a squad for:
- Totals: points scored, best possible from the same 15 each week, the gap, efficiency (scored / best possible), transfer costs, points left on the bench.
- Captaincy: weeks the armband went to the squad's top scorer (ties count as a hit), and extra points lost to captain choices over the season.
- Per-gameweek table: chip, scored, best possible, gap, captain chosen vs best; click a row to open that gameweek's detail.
- Biggest and smallest gap weeks; chips used with the gameweek.

## Build
- `shared/hindsight.ts`: new pure `buildGameweekHindsight(...)` (the per-gameweek arithmetic currently inline in the route, extracted so both routes share it; single-gameweek response unchanged).
- `shared/hindsight-season.ts`: pure `summarizeSeason(rows)`.
- `GET /api/hindsight/:managerId/season`: official picks per finished gameweek (cached in memory; a finished week never changes), final player points per finished gameweek (cached), 10-minute response cache, stricter per-IP limit (fans out to up to 38 FPL calls). A gameweek with no squad (joined late, 404) is skipped; any other FPL failure fails the whole request (502) rather than showing a partial season as if complete.
- Page: Gameweek | Season switch (SegmentedControl).

## Tests (written first, `tests/hindsight-season.test.ts`)
1. summarizeSeason: totals, gap, efficiency, bench, transfer cost sums.
2. Captain hit (including ties), captain cost with x2 and x3 (Triple Captain), no-captain rows excluded.
3. Biggest / smallest gap weeks, chips list, empty input.
4. buildGameweekHindsight equals the previous inline arithmetic (invariants: gap = best - official, 15 picks, best XI size).
5. API: season rows equal the single-gameweek endpoint's numbers per gameweek; totals equal sums; bad id 400; unknown manager 404.

## Added 2026-10-25 (user request): "What if" scenarios
Counterfactuals computed from the same cached picks + final player points. Still exact arithmetic, no estimates. Three scenarios first; the module is a list of pure functions so more can be added.
1. **Set and forget** (`from` gameweek, default the first): keep the 15 held at that gameweek, no transfers afterwards. Like-for-like measure: best possible XI (no chip) each week from the fixed 15 versus best possible XI (no chip) from the squads you actually held, so no lineup/auto-sub rule has to be invented. Transfer hits taken after that gameweek are shown as saved. Chips are not applied to either side.
2. **Captain one player every game** (any player): in each gameweek where he is in your counted XI (multiplier > 0), the armband moves to him: delta = (his pts - current captain's pts) x (captain multiplier - 1). Weeks where he is on the bench or not in your squad are unchanged and counted separately.
3. **Stop rotating the goalkeeper** (default: the keeper you started most): in weeks he is in your squad, he replaces whichever keeper you started: delta = his pts - that keeper's pts. Bench Boost weeks are skipped (both keepers count).
Limits stated on the page: vice-captain promotion and auto-subs are not re-run; "final points" are used directly.
Endpoint: `GET /api/hindsight/:managerId/what-if?scenario=set-and-forget|captain|keeper&from=&player=`. Pure module: `shared/hindsight-what-if.ts`; tests `tests/hindsight-what-if.test.ts` (written first).
Deferred ideas: no-hit (never take a transfer cost), never chip, always-best-of-two-keepers, same-position rotation generalisation.

## Added 2026-10-25 (user request): more popular What-if scenarios
4. **Vice-captain every week** (`scenario=vice`): armband to the official vice-captain in weeks he is in the counted XI; same arithmetic as scenario 2. Vice-captain promotion when a captain plays 0 minutes is not re-run.
5. **Chips: were they worth it** (`scenario=chips`): for each Bench Boost / Triple Captain you used, the gain (BB: points scored by your original bench; TC: the captain's points, i.e. the extra multiple) versus the best week for that chip among finished gameweeks in the same chip window (official `chips[].start_event/stop_event` from bootstrap-static; weeks where a different chip was played are excluded). Also total points your chips gave you. Wildcard / Free Hit are not evaluated (they change the squad, not the scoring multiples).
6. **Hits: were they worth it** (`scenario=hits`): for every week with a transfer cost, players bought vs players sold (this week's squad vs the previous non-Free-Hit squad); raw points each side scored over that gameweek and the next 3 (whether or not they started), net of the hit. Hits with fewer than 4 gameweeks of data are flagged partial.
Deferred: form captain (last week's top scorer), no-wildcard, same-position rotation.

## Added 2026-10-25 (user: "build out all the ideas"): three more scenarios
7. **Form captain** (`scenario=form-captain`): each week the armband goes to the player in your counted XI (multiplier > 0) who scored most in the previous gameweek (ties: lower id). Week 1, or a week with no previous gameweek on record, is unchanged. Delta = (his points this week - captain's) x (armband multiplier - 1).
8. **No Wildcard / no Free Hit** (`scenario=wildcard`, `scenario=freehit`): for each chip played, keep the squad held the week before it (latest earlier non-Free-Hit week) for the chip gameweek and the next 3 (Free Hit: that week only); compare best XI (no chip) from that squad vs the squad you held. Delta = kept - actual. Chip in the first week (no earlier squad) is skipped; windows with fewer gameweeks played are flagged partial.
9. **Stop rotating, any position** (`scenario=rotation&position=GKP|DEF|MID|FWD`): each week field, in that position, the same number of players you actually started (captain excluded and left in place) but chosen as the players of that position you started most weeks across the season (ties: lower id) who are in that week's squad. Delta = their points - the points of the players you started. Bench Boost weeks skipped. For GKP it reproduces the One goalkeeper scenario (when no keeper is captain).
Pure functions in `shared/hindsight-what-if.ts`; tests first in `tests/hindsight-what-if.test.ts`.
