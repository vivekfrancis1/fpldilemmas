# Plan 006 — Pre-deadline Brief and Hindsight view

Status: PROPOSED — awaiting user decisions. Nothing implemented.
Created: 2026-10-21

Origin: public guides name a pre-deadline summary (free newsletter, called best overall tool) and Hindsight Dream Team (how well you picked your XI) as things managers value. Reddit/X could not be read, so this is blog opinion, not usage data.

Principle: every number is official FPL data, exact arithmetic on it, or one of our existing, already-tested projections, labelled as such. No new model, no invented score.

## Feature A — Pre-deadline Brief (`/deadline-brief`, public)
One page for the next gameweek, built from data we already serve:
1. **Deadline** for the next gameweek (official `deadline_time`), shown in the viewer's local time with a countdown. Which gameweek: the event FPL marks `is_next`.
2. **Top captain options**: the 5 highest xPts players for that gameweek from `/api/cached/player-total-points` (captain value = 2 x xPts), each with FPL's availability flag. Same numbers as the Captaincy Matrix and Points page.
3. **Best picks by position**: top 3 xPts per position, same source.
4. **Availability watch**: players with ownership >= 10% (official `selected_by_percent`) whose FPL status is not "available" (injured/doubtful/suspended), showing FPL's own status, chance of playing and news text.
5. **Price-change watch**: from the existing `/api/price-predictions` rows whose status says rise/drop ("May rise today", "Very likely to drop today"), ordered by ownership. These are PREDICTIONS from the site's transfer-momentum heuristic and are labelled as such, with the status wording kept exactly as the Price Changes page shows it. Nothing shown as certain.
6. **Double / blank gameweeks**: teams with two fixtures or none in that gameweek, from official fixtures.
7. Links: Captaincy Matrix, Template Team, Fixture Analyzer, Rate My Team.
Honest empty states: e.g. "No injury flags among popular players", "No price changes predicted". If projections for the gameweek are not available yet, that section says so instead of guessing.
Not included: email/push delivery (page only for now), predicted lineups (no reliable source), anything that needs a login.

New: pure builder `shared/deadline-brief.ts` + `GET /api/deadline-brief` (assembles the above) + page.

## Feature B — Hindsight view (`/hindsight`, public)
For a finished gameweek and a manager ID: "your points versus the best XI you could have fielded from the same 15."
- **Inputs**: official picks for that gameweek (`/entry/{id}/event/{gw}/picks/`: picks, active chip, official `entry_history.points`, `points_on_bench`, transfer cost) and each player's final points from `/event/{gw}/live/`.
- **Shown** (all exact): official points scored (before hits) and any transfer cost; best possible points from the same 15 (best legal formation, best captain counted twice; under Triple Captain the captain counts three times; under Bench Boost all 15 count); the gap; the captain you chose vs the best captain (their actual points); the best XI itself; bench points; a table of the 15 with their points and whether they started.
- **Chips**: Bench Boost and Triple Captain handled as above; Wildcard and Free Hit don't change scoring so they use the squad actually played.
- **Not shown**: any suggestion that you "should have" known; no grade. Wording is neutral ("best possible from your 15").
- Gameweek selector (finished gameweeks only, default the latest). Team ID remembered locally.
- Reuses `shared/lineup.ts` (already tested) for the best XI; new thin module `shared/hindsight.ts` handles the chip rules.

New: `shared/hindsight.ts` + `GET /api/hindsight/:managerId?gw=` + page.

## Tests (TDD, written first)
Brief (`tests/deadline-brief.test.ts`)
1. Captains: top 5 by xPts, 2x value, deterministic ties; equal to the cached projection endpoint's values.
2. By position: top 3 per position, same source.
3. Availability watch: only ownership >= 10% and status not available; FPL's text and chance passed through unchanged; none invented.
4. Price watch: only rise/drop statuses, wording unchanged, ordered by ownership; empty list handled.
5. DGW/BGW list matches official fixtures; gameweek comes from `is_next`; deadline passed through unchanged.
6. API: shape and consistency with `/api/cached/player-total-points`, `/api/price-predictions`, `/api/bootstrap-static`.
Hindsight (`tests/hindsight.test.ts`)
7. Best possible >= official points for real squads (invariant over the Top 100 for the latest finished gameweek).
8. Synthetic squads: normal week (best XI + captain x2), Triple Captain (x3), Bench Boost (all 15, captain x2), captain choice vs best captain, tie handling.
9. When the manager fielded the optimal XI and captain, the gap is 0.
10. API: invalid/unknown manager 400/404; unfinished or invalid gameweek 400; chip reported as FPL reports it.

## Limitations to state on the pages
- Brief: projections are model estimates; price changes are predictions; availability is FPL's own and can change before the deadline.
- Hindsight: auto-subs are included in the official points but "best possible" ignores them (it uses final player points directly); the page says "from the same 15 players".

## Effort
Medium: two pure modules, two endpoints, two pages; mostly reuse.

## Decisions needed
1. Brief delivery: page only now (recommended), or also plan an email/push version later?
2. Include the price-change watch (clearly labelled as predictions), or leave it out because it's heuristic? (Recommend include: it's the Price Changes page's own output.)
3. Nav placement: "Popular Tools" for the Brief, "My FPL" for Hindsight (recommended).
