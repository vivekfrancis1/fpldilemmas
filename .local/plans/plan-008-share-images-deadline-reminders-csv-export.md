# Plan 008 — Shareable images, Deadline reminders, CSV export

Status: IMPLEMENTED locally (not pushed). Decisions (2026-10-21): html-to-image approved; web-push + push_subscriptions table approved with the migration HELD (not applied anywhere; see .local/push-reminders-setup.md); CSV export plus the existing column picker.
Built: shared/csv.ts + Export CSV on Player Stats; shared/share-cards.ts + Share image button (Template Team, captains on Matrix/Brief, Hindsight); shared/deadline-reminders.ts, server/push-reminders.ts, /api/push/*, client/public/push-sw.js, Brief toggle (hidden until VAPID keys are set). Reminders are inert until you create the table and set the keys.
Created: 2026-10-21

The three "worth considering" items from the competitor research. What exists today (checked): no image-export library, no web-push library or push handler in the service worker, no CSV export on Player Stats. So each needs something new, and two of them need your approval first.

## A. Shareable images (FPL Edits-style cards)
- Cards v1 (all built from data the pages already show, nothing new computed): Template Team XI, Captaincy Matrix top 5, Pre-deadline Brief top captains, Hindsight result.
- How: a fixed-size card (1080x1080 and 1200x630) rendered offscreen in the browser and exported to PNG with the small MIT library `html-to-image` (NEW dependency, needs your OK). Button "Share image": uses the phone's native share sheet when available, otherwise downloads the PNG.
- Every card carries: gameweek, "projections are estimates" where relevant, the data source line, and fpldilemmas.com. No claims beyond the page's own.
- Tests: pure card-content builders (what text/numbers go on each card, rounding, gameweek label, truncation of long names, empty states) are unit tested; the pixels are checked by screenshot.
- Effort: medium (mostly design).

## B. Deadline reminders (web push)
- Scope v1: ONE reminder, "deadline in 2 hours", official deadline times only. Price-change alerts are left out because they are heuristic predictions.
- Needs (all NEW, all need your OK): npm `web-push`; a pair of VAPID keys stored as server environment variables (you generate and set them on Railway; I won't put secrets in the repo); a new DB table `push_subscriptions` (endpoint, keys, created, last_sent_gameweek). NOTE: dev and tests share the production database (known issue), so I would add the table with a Drizzle migration and ask you before it touches any database.
- Service worker: add a push handler and notification click -> open /deadline-brief.
- Server: a scheduler modelled on the existing deadline tweet scheduler; sends once per gameweek per subscription; removes subscriptions the push service reports as gone; SENDING IS PRODUCTION-ONLY so local runs can never notify real users.
- UI: a "Remind me 2h before deadlines" toggle on the Pre-deadline Brief; permission is requested only on click. iOS only works when the site is installed to the Home Screen (iOS 16.4+); the toggle explains that.
- Privacy: we store only the push endpoint and keys, no name, email or team ID.
- Tests: pure scheduling logic (next reminder time from the event list, skips passed deadlines, no duplicate send for the same gameweek, production gate); subscription API validation (shape, duplicates, delete); delivery itself cannot be tested locally, so it gets a documented manual check once deployed.
- Effort: large.

## C. CSV export + column picker for Player Stats
- "Export CSV" on Player Stats: exactly the rows and columns currently shown (respecting filters and sort), with the season label and date in the file name.
- Optional column picker so users can choose which of the FPL fields appear before exporting.
- No dependency: small pure CSV builder (quoting of commas, quotes and newlines; numbers unformatted; stable column order).
- Honest limit: only fields the FPL API provides (no Opta-style 350+ metrics), stated on the page.
- Tests: CSV builder (escaping, empty values, column order, header labels); row/column selection matches what the table shows.
- Effort: small-medium.

## Suggested order
C (smallest, no approvals) -> A (needs the library approval) -> B (largest, needs approvals and a DB change).

## Decisions needed
1. May I add the `html-to-image` dependency for shareable images?
2. Reminders: approve `web-push` + a `push_subscriptions` table (migration prepared but not applied until you say) + you setting VAPID keys on Railway? Or leave reminders out?
3. CSV: just export, or export plus the column picker?
