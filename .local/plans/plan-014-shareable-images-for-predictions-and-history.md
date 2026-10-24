# Plan 014 — Shareable images for every prediction, projection and past result

Status: IN PROGRESS. Tranche 1 (Matches) IMPLEMENTED locally 2026-10-24, not pushed. Tranches 2-4 not started.
Request (user, 2026-10-24): "All match predictions, team and player projections for the upcoming gameweek(s) should be made into shareable images. All match results, team and player history for the past gameweek(s) should be made into shareable images."

## Decisions (user, 2026-10-24)
- Where: new Graphics Maker templates AND a "Share image" button on the Matches, Results, Team Stats, Player Stats and Projections pages that opens the right template pre-filled (spec in the URL, as today).
- Order: Matches first, then Players/Teams in whichever order follows.
- Packs: the existing pre-deadline pack grows into a **Preview pack**; a new **Review pack** (ZIP + captions.txt) is added for a finished gameweek.

## What already exists (do not rebuild)
Graphics Maker has 15 templates: Player Card, Player Comparison, Fixtures Comparison, Price Change, Top Differentials, Predicted Lineups, Team Reveal, Cover, Player News, Captain Picks, Fixture Ticker, Transfer Trends, Team of the Week, Stat Leaders, Availability Watch. Sizes, themes, handle/accent, captions, link previews and the 7-image pack are in place (`shared/graphics.ts`, `components/graphics/graphic-faces.tsx`, `pages/graphics.tsx`).
So already covered: player xPts leaders (Captain Picks, Top Differentials), a past-GW best XI (Team of the Week), season stat leaders (Stat Leaders).

## Gaps -> new templates (each: pure builder in shared/graphics.ts + face + form + tests first)
UPCOMING
1. **Match Predictions** (gameweek): every fixture of the gameweek with predicted score, win/draw/win % (market odds where open, otherwise our model), clean-sheet %. Splits over two images when a gameweek has more fixtures than fit (double gameweeks). Source: the same data the Matches page uses (`/api/team-goal-projections`, `/api/team-cs-projections`, `/api/fixture-odds-current`, `/api/fixtures`).
2. **Match Preview** (one fixture): predicted score, expected goals, clean-sheet %, win probabilities, last results of both clubs, and each side's top xPts players.
3. **Team Projections**: ranking of the 20 clubs over a gameweek range by one measure (goals for, goals against, clean-sheet %, assists), plus a **Projected Table** (end-of-season positions from `/api/projected-standings`).
4. **Player Projections**: top xPts per position (GKP/DEF/MID/FWD, one image or four) for a gameweek or range, with the components that matter (goals, assists, clean sheet, bonus) from the cached projection endpoints; Stat Leaders gains projection-based stats.
PAST
5. **Match Results** (gameweek): every score, scorers shown where space allows. Source: `/api/fixtures` (live season) or `/api/fixtures-history` (2025/26 archive).
6. **Match Report** (one fixture): score, goals/assists/cards/bonus, shots/xG/possession from the match stats data.
7. **Team History**: a club's form card (last N results as W/D/L chips with scores, goals for/against, clean sheets, xG for/against, table position) and the **League Table** (current standings; 2025/26 option).
8. **Player History**: a player's points per gameweek over the last N gameweeks (bars) with goals, assists, bonus, minutes; plus **GW Top Scorers** (highest-scoring players of a finished gameweek).

## Share buttons on existing pages
Matches page (predictions and past tabs), Results (Match Stats) page, each match page, Team Stats, Player Stats, team and player detail pages, Projected Standings and the team/player projection pages each get a "Share image" action that deep-links to the matching template with the page's current gameweek/filters. Existing `ShareImageButton` is reused; no new dependency.

## Packs
- **Preview pack** (existing 7 images) gains Match Predictions, Team Projections (clean-sheet and goals) and Player Projections by position.
- **Review pack** (new, for a chosen finished gameweek): Cover ("GW8 Review"), Match Results, Team of the Week, GW Top Scorers, League Table, a Team History for the clubs the user picks (or the best/worst form), plus captions.txt. Empty graphics are skipped and named, as in the current pack.
- Captions come only from numbers on the image (existing rule); #FPL, #GW<n>, topic tag.

## Tranche plan (each tranche: tests red -> green, `tsc`, `vitest`, browser check at 3 sizes + phone, local commit; no push)
1. Matches: Match Predictions, Match Results, Match Preview, Match Report + share buttons on Matches/Results/match pages.
2. Players: Player Projections, GW Top Scorers, Player History + buttons on Player Stats/detail/projection pages.
3. Teams: Team Projections, Projected Table, League Table, Team History + buttons on Team Stats/Projected Standings/team detail/team projection pages.
4. Packs: Preview pack additions, Review pack, captions, pack tests.

## Tests (Vitest, `tests/graphics-*.test.ts`)
Every builder: values equal the source fields (score, probabilities sum, xPts sums over exactly the chosen gameweeks); double/blank/TBC gameweeks; finished vs unfinished fixtures (a result image never includes a fixture that has not finished; a prediction image never includes one that has); empty states (`isEmptyGraphic`); URL round trip and bad-param fallback for every new spec; watermark and reserved footer on every size; caption length <= 256 and built only from on-image numbers; pack skips empty graphics.

## Limits / open points
- Predictions are estimates and must say so in the footer (existing rule).
- No new calculations or projection logic: only presentation of numbers the site already serves.
- Match Report depth depends on what the match-stats endpoint holds for the fixture (older seasons may lack xG/possession; those rows are omitted, not invented).
- Render time: one image ~0.25 s; the larger packs stay near 5-8 s.

## Update 2026-10-24 — Tranche 1 (Matches) built
Approved by the user ("Yes, go ahead with tranche 1").
Built:
- `shared/graphics-matches.ts` (new, 51 tests in `tests/graphics-matches.test.ts`, written first): Match Predictions (`buildMatchPredictions`), Match Results (`buildMatchResults`), Match Preview (`buildMatchPreview`), Match Report (`buildMatchReport`), `normaliseProbabilities` (whole % that sum to 100, largest remainder), pagination (10 / 10 / 6 fixtures per image on square / portrait / landscape, `pg` in the link), which-fixtures rules (a prediction never shows a started or finished fixture, a result never shows an unfinished or live one, TBC fixtures never appear), `resolveMatch`, `matchGraphicLink`.
- Defaults: predictions open on the first gameweek with fixtures still to play; results open on the latest COMPLETED gameweek (an in-progress one, e.g. one match played, can still be picked); preview/report open on the first match of that gameweek.
- `shared/graphics.ts`: four template ids, spec fields `fixture` (`fx`) and `page` (`pg`, 1-20), captions (<=256 chars, from on-image numbers only; tags #FPLPredictions #FPLResults #MatchPreview #MatchReport), `isEmptyGraphic`, `usesProjections` (predictions and previews carry "Projections are estimates"). Only added `export` to four existing helpers; no logic changed.
- Faces in `graphic-faces.tsx`: predictions list (kick-off, club shirts, expected goals, clean-sheet %, win/draw/win bar or "No market odds yet"), results list (score, scorers incl. own goals), preview (expected goals, odds bar, last-5 form chips and results, three best xPts players per club), report (score, goals, assists, cards, bonus, penalty notes; cards capped with "+N more").
- `/graphics` page: four template cards, gameweek / page / match pickers, team projections and odds fetched for the one gameweek being drawn.
- Share buttons (`components/share-graphic-link.tsx`, opens /graphics pre-filled): Matches page (predictions and results tabs), Match Stats page (gameweek, current season only), each match page (report if finished, preview if not started, nothing while live).
Data sources, no new endpoints or calculations: `/api/fixtures` (scores, scorers, cards, bonus via its `stats`), `/api/team-goal-projections`, `/api/team-cs-projections`, `/api/fixture-odds-current`, `/api/cached/player-total-points`.
Deviations from the plan: Match Report is built from FPL's own fixture stats only (goals, assists, cards, bonus, penalties); shots, xG and possession are not on it, since the live-season match data does not carry them. "Predicted score" is shown as expected goals (the site's own figure), not a rounded scoreline.
Verified in the browser on live data: all four templates at square / portrait / landscape, the page-2 selector, phone width (no horizontal scroll), the three share links, and real PNG exports through the app's own exporter (names fit, shirts, footer and watermark present). In this environment the page's own Share image menu cannot make an image ("Couldn't prepare the image", same on the existing Captain Picks): the local dev page cannot read the Google Fonts stylesheet; exports were checked by running the exporter with Inter's Latin face embedded by hand.
Not yet: the packs (tranche 4), and the other pages' buttons (tranches 2-3).
