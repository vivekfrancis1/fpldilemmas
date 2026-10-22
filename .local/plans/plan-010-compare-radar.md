# Plan 010 — Compare Players: radar chart

Status: implemented locally, not pushed (2026-10-22). Decisions (user): FPL-available axes only; new card on /compare (not a new page).
Reference: AlexVolloFPL radar (xG/90, Big Chances/90, xA/90, Key Passes/90, Box Touches/90, Box actions/90, Corners & FKs taken/90).

Why: a radar shows at a glance how different players' profiles differ (finisher vs creator vs all-rounder), which the stats table makes hard.

## Data gap (important)
Big Chances, Key Passes, Box Touches, Offensive actions in the box and Corners/FKs taken per 90 are NOT in the FPL API we use. They are not added or estimated here. Axes below are all real FPL numbers, our own projection, or an exact per-90 ratio of FPL totals.

## Axes (user can switch on/off, 3 to 8, default 7)
xG/90, xA/90, xGI/90, Goals/90, Assists/90, Threat/90, Creativity/90, Influence/90, Bonus/90, Points/90, Defensive contributions/90, xPts per GW (our projection, same upcoming window as the fixtures table).
Default: xG/90, xA/90, Threat/90, Creativity/90, Influence/90, Points/90, xPts per GW.
Per-90 axes need at least 180 minutes, else the value is shown as "—" (no tiny-sample spikes). Current season only (past-season tabs only affect the stats table).

## Scaling
Each axis is scaled so the best of the compared players sits on the outer ring (like the reference); raw values are printed next to each point. Scaled = value / max of the selected players. Max <= 0 gives 0. Missing values plot at the centre and show "—".

## UI
Card "Player profile" between Upcoming fixtures and Season stats on /compare. Players in five fixed distinct colours (club colours can clash). Axis chips, legend, "Share image" (1080x1350). Axes in URL as `&a=`.

## Pure module `shared/compare-radar.ts` (tested first, `tests/compare-radar.test.ts`)
Axis registry, value extraction, per-90 gate, scaling, polar geometry, axis URL parse/encode.
