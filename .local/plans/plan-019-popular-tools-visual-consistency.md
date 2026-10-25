# Plan 019 — Popular Tools visual consistency

Status: IMPLEMENTED locally (2026-10-25), not pushed. Checked on desktop in light and dark; phone width not checked (no phone-sized browser window available), the embedded optimiser on My Dashboard is covered by the type check only. Styling and layout only: no data, calculation or API changes. Scope agreed with the user: the Popular Tools that still use the old look.

## Problem
Pre-deadline Brief, Compare Players, Captaincy Matrix, Rate My Team, Hindsight and League Comparison use the shared `client/src/components/tool-ui.tsx` family (gradient hero panel, `SectionCard` with icon tile, pills, bars, segmented controls). Transfer Tracker, Freehit Team and Wildcard Team (and the same optimiser embedded in My Dashboard) still use plain shadcn cards.

## Changes
1. **Transfer Tracker** (`pages/transfer-tracker.tsx`): hero panel for the three headline counts, `InputPanel` with segmented position / transfer-type filters, table inside a `SectionCard`, price and net-transfer values as pills, ownership as a bar.
2. **Best Freehit Team** (`pages/best-freehit-team.tsx`): controls in a `SectionCard`, result summary as a hero panel (points, formation, captain, vice), squad pitch and full-squad list as `SectionCard`s with position chips and xPts bars.
3. **Wildcard optimiser** (`components/wildcard-optimizer.tsx`, used by Best Wildcard Team and embedded in My Dashboard): same treatment as Freehit, so both optimisers match.

## Out of scope
Transfer Planner, My Dashboard, Top Managers and the Statistics / Projections pages (a later pass if wanted).

## Verification
`npx tsc --noEmit -p .`, then check each page in the browser in light and dark mode at desktop and phone width.
