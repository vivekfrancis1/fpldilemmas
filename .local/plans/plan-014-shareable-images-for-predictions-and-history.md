# Plan 014 — Shareable images for every prediction, projection and past result

Status: IMPLEMENTED locally 2026-10-24 (all four tranches), not pushed.
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

## Update 2026-10-24 — Tranche 2 (Players) built
Approved by the user ("Yes, go ahead with tranche 2").
Built:
- `shared/graphics-players.ts` (new; 36 tests in `tests/graphics-players.test.ts`, written first):
  - **Player Projections** (`buildPlayerProjections`): the best-projected players over a gameweek range, either one position (top 3-10, with three component columns: GKP clean sheet / saves / bonus, DEF clean sheet / attack / defensive contributions, MID and FWD goals / assists / bonus, each summed over exactly the chosen gameweeks) or the best 4-5 of each of the four positions (2x2 grid, four columns on landscape). Injured, suspended, unavailable and not-in-squad players are left out, doubtful ones flagged, players with no projection in the range omitted.
  - **Top Scorers** (`buildTopScorers`): the highest-scoring players of a finished gameweek from FPL's live points; only players who played and scored above zero; level points go to the bigger goal involvement then the lower id; "chips" show where the points came from (FPL's own `explain`, summed over a double gameweek, biggest first, at most four, minutes only as a fallback).
  - **Player History** (`buildPlayerHistory`): one player's points in each of up to 8 gameweeks from FPL's match history, finished matches only (a double gameweek is added up and shows both opponents), totals (points, points per appearance, goals, assists, bonus, minutes, best gameweek). Default: the last 8 gameweeks that have finished matches.
  - `playerGraphicLink` for the Share buttons.
- `shared/graphics.ts`: three template ids, captions, `isEmptyGraphic`, `usesProjections` (projections carry "Projections are estimates"). `shared/graphic-defaults.ts`: Player History opens on the best-projected player (same rule as Player Card), with a test.
- Faces (`graphic-faces.tsx`), `graphic-data.ts` (history and live points loaded for the chosen player / gameweek), `/graphics` page controls (position, top N, gameweek range, finished gameweek, player picker and from/to gameweeks).
- Share buttons: Player Total Points (projections tab: "Share projections" with its range and, when exactly one position is selected, that position; history tab: "Share top scorers"), the player detail page ("Share history"), Player Stats ("Share leaders" opens the existing Stat Leaders, "Share top scorers"), current season only.
Data sources, no new endpoints or calculations: `/api/cached/player-total-points` (expected points and components), `/api/event/<gw>/live` (points and scoring breakdown), `/api/element-summary/<id>` (match history), `/api/fixtures` (which matches have finished).
Not done on purpose: the single-component projection pages (goals, assists, clean sheets, minutes, bonus, saves, cards, defensive contributions) have no button of their own; Player Projections already shows those components when a position is chosen. Say if you want a button on each, opening Player Projections for that position.
Verified in the browser on live data: all three templates at square / portrait / landscape through the app's real exporter (Inter embedded by hand, as in tranche 1), default player, controls, phone width (no horizontal scroll) and the share links on four pages. Full suite: 1238 passed.
Not yet: Team Projections / League Table / Team History (tranche 3), packs (tranche 4).

## Update 2026-10-24 — Tranche 3 (Teams) built
Approved by the user ("Yes, go ahead with tranche 3").
Built:
- `shared/graphics-teams.ts` (new; 39 tests in `tests/graphics-teams.test.ts`, written first):
  - **Team Projections** (`buildTeamProjections`): all clubs with a fixture in the chosen gameweek range, ranked by the site's projected average per game for one measure (goals scored, goals conceded, clean-sheet chance, assists; fewest first for goals conceded). Each row also shows the games and the total over the range (clean sheets: the expected number). A double gameweek counts as two games; clubs with no fixture in the range are left out. Averages and totals come from the existing `fixtureDetails` of `/api/team-goal-projections`, `/api/team-goals-against-projections`, `/api/team-cs-projections` and `/api/team-assist-projections`.
  - **Projected Table** (`buildProjectedTable`): `/api/projected-standings` to any end gameweek from the next one to 38 (final table by default), in the order the site gives, top four and bottom three marked, with how many matches are played and projected.
  - **League Table** (`buildLeagueTable`): `/api/current-standings` for all, home or away matches; a table where nobody has played is reported as "season not started", not drawn.
  - **Team History** (`buildTeamHistory`): a club's last eight finished results (or a chosen gameweek range), W/D/L chips, record and goals over exactly those results, plus its position, points, goals, xG and clean sheets from the live table (a missing figure is a dash). Live and unplayed matches are never results.
  - `teamGraphicUrl` names the one request a team graphic is built from (the page and, in tranche 4, the pack fetch exactly that), `teamGraphicLink` for the Share buttons.
- `shared/graphics.ts`: four template ids, spec fields `metric` (`mt`) and `venue` (`vn`) with validated links, captions, `isEmptyGraphic`, `usesProjections` (projections and the projected table carry "Projections are estimates"). `shared/graphic-defaults.ts`: Team History opens on the club whose match kicks off next (same rule as Predicted Lineups), with a test.
- Faces (`graphic-faces.tsx`): two-column ranking with bars, a table shared by the projected and league tables (20 rows at every size, zone markers and legend), a club form card with results list.
- `/graphics` page: measure, projected-to gameweek, venue and club / gameweek pickers.
- Share buttons: Team Stats ("Share table", current season, keeps the venue), Projected Standings ("Share projected table" with the selected end gameweek, or "Share table" on the current tab), team detail page ("Share form"), and the four team projection pages (goals, goals conceded, assists, clean sheets: "Share image" with that page's measure and gameweek range, future view only).
Deviations: team rankings use the per-game average (fair across double and blank gameweeks) with the total shown beside it, rather than ranking by range totals; the league table's footer gameweek is the latest gameweek that has a finished match, and its subtitle says how many matches have been played, since a gameweek can be half played.
Verified in the browser on live data: all four templates at square / portrait / landscape through the app's real exporter (Inter embedded by hand), default club, controls, phone width (no horizontal scroll), and all eight share links. Full suite: 1277 passed, plus the known intermittent price-predictions test.
Not yet: the packs (tranche 4).

## Update 2026-10-24 — Tranche 4 (packs) built
Approved by the user ("Yes, go ahead with tranche 4").
Built:
- **Preview pack** (the old "Gameweek pack", `GAMEWEEK_PACK`): the original seven images keep their order and numbers (deadline card, captain picks, top differentials, availability watch, fixture ticker, transfer trends, price changes), then Match predictions (one image per page: 10 fixtures per image on square and portrait, 6 on landscape), Team goal projections and Team clean-sheet projections (the gameweek and the next four, capped at 38) and Player projections (best of each position, same range). Zip name unchanged (`fpl-dilemmas-gw<N>-pack.zip`).
- **Review pack** (new, `REVIEW_PACK`, `reviewPackSpecs`): "GW<N> Review" cover, Match results (paged), Team of the week, Top scorers, League table, and Team history for the club in the best and for the club in the worst form (`formExtremes`: points over each club's last five finished results up to the gameweek, level points by goal difference then lower id, clubs with fewer than three results ignored, never the same club twice; an image with no club is left out). For finished gameweeks (default the latest). Zip `fpl-dilemmas-gw<N>-review-pack.zip`. The "user picks the clubs" option from the plan was not built: the two form clubs are chosen automatically.
- `loadGraphicData` / `graphicDataRequests` (`client/src/lib/graphic-data.ts`, 5 tests): each pack image loads exactly the data it needs (match model and odds for its gameweek, the team table or projection, live points, player history) through the query cache, so shared data is fetched once and a pack never depends on what the page had loaded. The page's Gameweek pack panel is now "Gameweek packs" with a Preview pack and a Review pack section and one progress line ("Making 4 of 11…").
- `predictionPageCount` / `resultsPageCount` (how many images a gameweek needs).
- Caption fix found while verifying: a history graphic over a range ("GW1-7") is tagged with its latest gameweek (#GW7), not the first (#GW1), for Team History and Player History; the other range captions (projections) still tag the first.
Verified in the browser on live data: both packs run end to end with the page's own button (fonts embedded by inlining Inter in the page, ZIP captured in memory and read back with the shared reader): Preview pack 11 PNGs + captions.txt; Review pack 7 PNGs + captions.txt; Review pack on landscape 8 PNGs (two results pages, each with its own matches) + captions.txt; every image viewed, captions read. Full suite: 1306 passed, plus the known intermittent price-predictions test.
Limits: the Review pack's league table is the live table now, so it can include matches from a newer gameweek than the one reviewed (its caption names the latest gameweek with a finished match; the panel says so); the Preview pack skips an image with nothing to show yet (for example match predictions once every fixture has started) and says which.

## Plan 014 summary
Everything asked for 2026-10-24 now exists as a shareable image: upcoming match predictions (Match Predictions, Match Preview), team projections (Team Projections, Projected Table) and player projections (Player Projections); past match results (Match Results, Match Report), team history (League Table, Team History) and player history (Top Scorers, Player History); each reachable from the Graphics Maker and from a Share image button on the page that shows the same data; and two gameweek packs (Preview, Review) with captions.

## Update 2026-10-24 — Match Report shows defensive contributions
Asked by the user ("Match report in shareable graphics should also show defensive contributions").
- `buildMatchReport` now returns `defensive`: the biggest defensive contributors of both sides from FPL's own `defensive_contribution` fixture stat, most first (level counts: home side, then name), at most 6 (`DEFENSIVE_LIST_LIMIT`); players with none are left out. Each entry says whether it earned the 2 points (`earnsDefensivePoints`: defenders 10+, midfielders and forwards 12+, goalkeepers never: the same rule as the site's CBIT points, `computeCbitPoints`).
- Face: a "Defensive contributions" section with the count, name and club, a green "+2" marker for players who earned the points and a "+2 = earned the points" note; shows 5 on square, 6 on portrait, 3 on landscape (landscape now uses three columns; cards are capped at 6 square / 4 landscape with "+N more").
- 6 new tests in `tests/graphics-matches.test.ts` (written first). Verified on a real finished match at square / portrait / landscape.
Deploy check for the earlier push (2026-10-24): the production site served the new client first, and the production server switched to the new code about four minutes after the push (an invalid `group` on `/api/template-team` returned 400, `/g/<id>` returned its own 404).
