# Plan 009 — Player Plot: any stat on X, any stat on Y

Status: IMPLEMENTED locally, not pushed (2026-10-22). Built: shared/player-plot.ts (41 tests), components/player-plot-chart.tsx (SVG, also used for the share image), pages/player-plot.tsx, route + Popular Tools nav + sidebar, ShareImageButton accepts a custom card. Verified in Chrome (desktop dark, phone width, share PNG) against live data. Decisions (user): all stats available, new page under Popular Tools, shareable image.
Created: 2026-10-22

Why: scatter plots (e.g. "xPts vs ownership" differentials chart) are the fastest way to spot outliers: who is cheap for his output, who is overowned, who is lucky. The data is already served, so this is a presentation feature: no new model, no new endpoint.

## Data (already served)
- `GET /api/bootstrap-static` — FPL season stats per player (`elements`), teams, positions.
- `GET /api/cached/player-total-points` — our projections: `gameweekProjections[gw]`, `xMinsPerGW[gw]`, `pointsFromGoals/Assists/...[gw]`, price, ownership, availability.
Joined by player id. Nothing is invented: every axis value is an FPL number, our own projection, or an exact ratio of two of those (shown in the stat label, e.g. "Points per £m").

## Stats (X and Y pickers, grouped)
- Our projections (use the chosen From-To gameweek horizon): xPts total, xPts per GW, xPts per £m, expected minutes per GW, projected goal points, projected assist points.
- Market: price, ownership %, transfers in / out this GW, net transfers, price change since season start.
- Results so far: total points, points per game, form, points per £m, points per 90, minutes, starts, goals, assists, goal involvements, clean sheets, saves, bonus, BPS.
- Underlying: xG, xA, xGI, their per-90 versions, ICT / influence / creativity / threat, defensive contributions per 90.
- Luck check: goals minus xG, assists minus xA, goal involvements minus xGI.

## Page (`/player-plot`, Popular Tools)
- X and Y selects, preset buttons (Differentials: ownership vs xPts; Value: price vs xPts; Form vs price; Luck check: xGI vs goal involvements), swap-axes button.
- Filters: position (multi), team, minimum minutes, max price, ownership range, "Top N" players to plot (default 24, ranked by the Y stat), gameweek range for projection stats.
- Scale: linear or "stretched" (square-root) per axis, so low-ownership players are not squashed against the axis.
- Median guide lines on both axes (toggle) and corner labels derived from stat direction (top-left etc. only when both stats have a clear "higher is better" direction).
- Dots in club colour, labels declutter automatically (best-ranked get labels first; the rest show on hover/tap), unavailable players dimmed, search to highlight a player, tap/hover tooltip with all values, link to Compare.
- Shareable: state lives in the URL (`?x=&y=&pos=&top=&from=&to=`); "Share image" renders the current plot as a 1080x1350 PNG.
- Phone: chart full width, controls stacked, labels limited to the top few, tooltip on tap.

## Pure module `shared/player-plot.ts` (tested)
Stat registry + value extraction, horizon sums, filters, median, scale transform + ticks, label declutter, URL encode/decode, share-card builder input.

## Tests (`tests/player-plot.test.ts`, written first)
Stat values equal the source fields (price = now_cost/10, ownership numeric, per-90s, goals - xG); horizon sums use exactly From..To and skip missing gameweeks; ratios return null for zero price/minutes; filters (position, team, minutes, price, ownership); Top N ranks by Y and ignores nulls; median (odd/even/ignores nulls); sqrt scale is monotonic and invertible; ticks are within range and "nice"; label declutter never overlaps two shown labels and keeps priority order; URL round trip and invalid params fall back to defaults.

## Out of scope
Past seasons (current season only for now), saving custom presets, animating changes.

## Follow-ups suggested after the user shared more reference charts (Alex Vollo style) — not built
- Fixture-adjusted axes: a player's output (xG/xGI per 90, xPts) against the NEXT opponents' weakness (our projected goals conceded / clean-sheet odds over the same gameweeks, from the team projection endpoints). Same idea as "opponent shots conceded vs player shots per 90", using data we already have.
- Featured-player callout on the image (price, jersey, name, next fixture H/A) with an arrow, like the references.
- Two panels side by side on the image (two stat pairs in one picture); "Y vs X" subtitle line.
- Not possible from our data: Opta-style stats in the references (shots from central area, box touches, left/right channel shots, set-piece xG). Our sources are the FPL API and our own projections only.
