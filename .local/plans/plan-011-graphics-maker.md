# Plan 011 — Graphics Maker (FPL Edits-style graphics users create and share)

Status: IMPLEMENTED locally, not pushed (2026-10-23). Built: shared/graphics.ts (40 tests in tests/graphics.test.ts), components/graphics/graphic-faces.tsx (5 faces + shared Frame with watermark footer), pages/graphics.tsx, /graphics route, Popular Tools nav + sidebar. Verified in the browser at all three sizes, light/midnight/indigo/club themes, phone width; PNG export checked (1200x675, watermark present in the exported pixels).
Deviations from plan: price list limits per size (7/10/5); phone layout shows the preview first with compact template buttons; the first visit pre-selects the top xPts player(s) / first three teams so the preview is never empty.
Created: 2026-10-23

## What FPL Edits is (checked on X and fpledits.com)
@fpl_edits / fpledits.com is a graphics generator for FPL content creators: pick a player/team/GW range, get a branded image, post it to X/Instagram/TikTok. Templates: Predicted Lineups, Fixture Difficulty Rating, Player Card, Team Reveal, Player Form, Player Raw, FPL Market, Top Differentials, Fixtures Comparison (2 or up to 4 teams), Player Comparison, Cover Generator, Player News Quote, Player Stats, Price Change. It also has logins and a live GW scores sidebar.

## Decisions (user, 2026-10-23)
- v1 templates: the core five — Player Card, Player Comparison, Fixtures Comparison, Price Change, Top Differentials.
- Sharing: download PNG + native share sheet + a link that re-opens the same graphic. No accounts, no database, no gallery.

## Page: `/graphics` ("Graphics Maker", Popular Tools)
- Template picker (5 cards) -> a small form for that template on the left, live preview on the right (phone: form above, preview below).
- Output size: 1080x1080 (square), 1080x1350 (portrait), 1200x675 (X landscape). Colour theme: 4 presets (indigo = site look, dark, light, club colour where a single club is the subject). Optional custom headline.
- Buttons: Download / Share image (existing `ShareImageButton` + `renderCard`, html-to-image already installed), Copy link.
- Every graphic carries a small FPL Dilemmas watermark (added 2026-10-23, user request): the site's badge icon (`client/public/icons/icon-192.png`, inlined as a data URI so the PNG export never depends on a network fetch) plus "FPL DILEMMAS · fpldilemmas.com" in the bottom-right corner, about 55-60% opacity, roughly 3-4% of the image height, so it is clearly ours but never covers the data. One shared `<Watermark>` component is used by every template and size, and it cannot be switched off in the UI. It sits in a reserved footer strip outside the content area, so no template can overlap it. The gameweek and, for projections, "Projections are estimates" stay in the footer's left side.
- All settings live in the URL (`?t=player-card&p=123&gw=...&size=...&theme=...`), same pattern as Player Plot. Bad/unknown params fall back to defaults.

## Templates (all built from data the site already serves; nothing new is computed)
1. Player Card — one player: price, ownership, form, total points, points per game, our xPts for the next N GWs, next fixtures coloured by official FDR, picked stats.
2. Player Comparison — 2 or 3 players side by side; chosen stat rows; best value in each row highlighted (ties both highlighted). Uses the same data as Compare.
3. Fixtures Comparison — 2-4 teams, GW range, grid of opponents (H/A) coloured by official FPL FDR, average FDR per team. (Our Last-Season/Form FDR can be a later option.)
4. Price Change — confirmed risers and fallers for the current season (`/api/price-changes/recent`). Predicted changes are heuristic, so they are not offered in v1. Clear empty state pre-season.
5. Top Differentials — top N by our xPts over a GW range where ownership is under a chosen %, optional position filter.

## Data / endpoints (verify before building)
`/api/bootstrap-static`, `/api/cached/player-total-points` (xPts), fixtures with FDR, `/api/price-changes/recent`. No new endpoints, no DB changes, no new dependencies.

## Code layout
- `shared/graphics.ts` — pure module: template registry, spec encode/decode (URL), content builders per template (rows, rounding, truncation, highlights, empty states), size/theme definitions.
- `client/src/components/graphics/` — one face component per template (fixed-size, inline styles so the PNG looks the same everywhere, like the Player Plot card).
- `client/src/pages/graphics.tsx` — picker, forms, preview scaled to fit, share/copy-link.
- Route in App.tsx, nav entry in top-nav and sidebar.

## Tests first (`tests/graphics.test.ts`, Vitest, red -> green)
every template and size includes the watermark text and a reserved footer strip; URL round trip for every template and invalid/missing params fall back to defaults; Player Card values equal source fields (price = now_cost/10, ownership, form); xPts sum uses exactly the chosen GW range and skips missing GWs; comparison highlights the best value per row, ties handled, "lower is better" stats (e.g. price, FDR) reversed; fixtures grid handles blank and double gameweeks; average FDR; Price Change splits risers/fallers, orders by size, empty state; Differentials respects ownership cap, position filter, N, ranks by xPts; name truncation; file names.

## Honest limits
- A pasted link opens the page and re-draws the graphic, but X/WhatsApp link previews will show the generic site card, not the graphic (that needs server-side image rendering, a possible later step). The downloaded PNG is what people post.
- Not in v1 (Predicted Lineups, Team Reveal and Cover Generator were added later): Player News Quote (need new data or user-typed content), accounts, saved gallery.

## Order of work
1. Tests + `shared/graphics.ts` (spec/URL + Player Card + Fixtures Comparison). 2. Page shell, preview scaling, share/copy link. 3. Player Comparison, Differentials, Price Change. 4. Check in Chrome (desktop + phone, light + dark, all three sizes), `npx tsc --noEmit -p .`, `npx vitest run`. Commit locally in logical chunks; no push.

## Update 2026-10-23 — Predicted Lineups (6th template)
Built: `buildPredictedLineup` in shared/graphics.ts (8 new tests, 48 in tests/graphics.test.ts), `LineupFace` + pitch in graphic-faces.tsx, club + gameweek controls on the page, `predicted-lineup` in the link (`tm` = club, `from`=`to` = gameweek).
Method: for one club and one gameweek, the legal XI (1 GKP, 3-5 DEF, 2-5 MID, 1-3 FWD) with the highest TOTAL expected minutes (our `xMinsPerGW`), using the same formation search as `shared/lineup.ts` (`bestLineup`, fed minutes instead of xPts). Bench strip = the next 5 players by expected minutes. Players with no expected minutes that gameweek, or marked unavailable (u) or suspended (s), are never listed. Doubtful/injured players are flagged (amber) with the chance of playing when FPL gives one below 100.
Limits: this is our forecast (expected minutes already include injury news), NOT official team news, and the graphic says so. It shows the most likely XI by minutes, so it can produce unusual shapes (e.g. 5-4-1 for a club whose second forward is a sub). Expected minutes are shown rounded and capped at 90. Double gameweek: minutes semantics are still an unverified assumption (see known issues), so a DGW shows the likely XI for the whole gameweek with minutes capped at 90 and both fixtures listed. Blank gameweek or too little minutes data shows a clear message panel instead of a pitch, never invented players.
Verified in the browser: square, portrait, landscape, phone width, light/midnight/club themes, a doubtful starter (Crystal Palace GW8), the blank-gameweek message (GW39), and the exported PNG (1080x1080, watermark in the footer).

## Update 2026-10-23 — Team Reveal (7th template)
Built: logic in shared/graphics.ts (`buildTeamReveal`, `canAddToSquad`, `squadCounts`, `squadFromPicks`, `suggestSquadSetup`; 15 new tests, 63 in tests/graphics.test.ts), `RevealFace` in graphic-faces.tsx (the Predicted Lineup pitch is now a generic `Pitch` both faces share), a squad builder on the page, `team-reveal` in the spec/link (`sq`, `bn`, `cap`, `vc`, `chip`, `mgr`, plus the single gameweek in `from`/`to`).
Why it is built by hand: FPL hides a manager's picks until the deadline, so an FPL-ID-only reveal cannot cover the main use (posting before the deadline). Users add their 15 players (search; 2 GKP / 5 DEF / 5 MID / 3 FWD and max 3 per club enforced with a short message), mark captain (C), vice (V) and bench players, pick a chip and the gameweek, and optionally type a manager name. "Load from my FPL team ID" (number or team link) prefills the squad from the EXISTING `/api/manager/:id/team` (latest picks FPL has published; it falls back to the previous gameweek when the new one is hidden) and the manager name from `/api/manager/:id`; no new endpoints. When the 15th player is added to a squad with no bench set, a bench / captain / vice is suggested from our xPts (same formation search as `shared/lineup.ts`); the user can change everything, and a "Suggest" button repeats it.
On the graphic: XI on a pitch (attack at top), each player with a white name pill and a second pill with the gameweek opponent coloured by official FDR (a double gameweek lists both), C / V badges, bench strip (goalkeeper first), chip badge, squad value, FPL Dilemmas watermark footer. An incomplete or illegal squad shows a plain-language list of what to fix instead of a pitch, and Share is hidden until it is complete.
Limits: squad value is the sum of the players' CURRENT prices, not the manager's budget (no bank / selling prices); loaded picks are the last published gameweek, so this week's transfers still have to be made by hand; the captain is required, the vice is optional; no xPts are shown on this graphic.
Verified in the browser (live data through a temporary Vite proxy, since removed): square, portrait, landscape, phone width, indigo / midnight / club themes, Free Hit / Triple Captain / Bench Boost badges, a partial squad (problem list, no Share), Load-from-ID with a real team link (squad, bench, captain, vice and manager name filled in), unknown and invalid IDs (clear errors), the quota message ("You already have 5 defenders"), the auto-suggestion on the 15th player, and the exported PNG (1080x1080, jerseys, FDR pills, C/V badges and the watermark in the exported pixels). Predicted Lineups re-checked after the shared-pitch refactor.

## Update 2026-10-23 — Cover Generator (8th template)
Built: `buildCover` and `coverTitleFont` in shared/graphics.ts (5 new tests, 68 in tests/graphics.test.ts), `subtitle` / `tag` in the spec and link (`sub`, `tag`; featured players reuse `p`, max 3), `CoverFace` in graphic-faces.tsx (the shared `Frame` got a `bare` option that skips the title block but keeps the watermark footer), cover controls on the page.
What it is: a bold cover / thumbnail image for videos, podcasts and posts: a big uppercase headline (default "Gameweek Preview"; the font shrinks smoothly as the text gets longer, never below 40%), an optional subtitle, an optional tag pill (e.g. "Deadline tonight"; a one-click button fills in the next gameweek, "GW8"), and up to 3 featured players (jersey + name). No data is shown, so there is no data note or projections note in the footer; the FPL Dilemmas watermark stays. The club theme uses the first featured player's club colour. All three sizes (the 1200x675 landscape is 16:9, so it works as a video thumbnail).
Layout: square/portrait stack the text over a row of players; landscape puts the text left and the players right; with no players the text block is centred.
Limits: headline 60 characters, subtitle 80, tag 24; no custom images or fonts, and no club badges beyond the shirt images the site already has.
Verified in the browser (live data through a temporary Vite proxy, since removed): square, portrait, landscape, indigo / midnight / light / club themes, 0 / 1 / 2 / 3 featured players, a very long headline, phone width, and the exported PNG (1080x1080, watermark in the footer pixels).

