# Plan 019 — Tools visual consistency (Popular Tools, then My Dashboard)

Status: IMPLEMENTED locally (2026-10-25), not pushed. Checked on desktop in light and dark; phone width not checked (no phone-sized browser window available), the embedded optimiser on My Dashboard is covered by the type check only. Styling and layout only: no data, calculation or API changes. Scope agreed with the user: the Popular Tools that still use the old look.

## Problem
Pre-deadline Brief, Compare Players, Captaincy Matrix, Rate My Team, Hindsight and League Comparison use the shared `client/src/components/tool-ui.tsx` family (gradient hero panel, `SectionCard` with icon tile, pills, bars, segmented controls). Transfer Tracker, Freehit Team and Wildcard Team (and the same optimiser embedded in My Dashboard) still use plain shadcn cards.

## Changes
1. **Transfer Tracker** (`pages/transfer-tracker.tsx`): hero panel for the three headline counts, `InputPanel` with segmented position / transfer-type filters, table inside a `SectionCard`, price and net-transfer values as pills, ownership as a bar.
2. **Best Freehit Team** (`pages/best-freehit-team.tsx`): controls in a `SectionCard`, result summary as a hero panel (points, formation, captain, vice), squad pitch and full-squad list as `SectionCard`s with position chips and xPts bars.
3. **Wildcard optimiser** (`components/wildcard-optimizer.tsx`, used by Best Wildcard Team and embedded in My Dashboard): same treatment as Freehit, so both optimisers match.

4. **My Dashboard** (`pages/my-dashboard.tsx`, added 2026-10-25): search box as a tool input panel with a segmented Manager ID / Name switch; the manager banner is now a hero panel carrying total points, rank, GW points and GW rank on every tab (they used to sit only in Overview); Overview keeps formation, value, bank and transfers as stat tiles and shows the pitch in a titled card; the pastel gradient cards on Leagues, Projections, Transfers, Chips and History share the tool card look (indigo icon tile and header band); tab strip matches the other tools; purple accents became indigo. New shared helpers in `tool-ui.tsx`: `StatTile`, `HeroStat size="md"`, `SectionCard onHeaderClick`.

## Out of scope
Transfer Planner, Top Managers, Pick Team, My Team and the Statistics / Projections pages (a later pass if wanted).

## Verification
`npx tsc --noEmit -p .`, then check each page in the browser in light and dark mode at desktop and phone width.
