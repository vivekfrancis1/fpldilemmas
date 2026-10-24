# Plan 015 — Editable Predicted Lineup (formation + player switches), clearly marked as user-edited

Status: IN PROGRESS locally 2026-10-24, not pushed.
Request (user, 2026-10-24): "Allow users to change formation (all formations listed in Fotmob should be made available) and switch players, so that the user can post what he feels is most likely. But we should make it clear in the shareable image that it is user edited."

## Decisions (user, 2026-10-24)
- Switching players: one dropdown per position slot, under a formation picker (not tap-on-preview, not drag and drop).
- Who can fill a slot: anyone in the club's FPL squad (including players with no expected minutes), best-fitting position first. Injury / doubt markers stay on the shirt.
- Formations: every formation FotMob shows for Premier League matches (collected from this season's FotMob match pages, see `shared/formations.ts`).

## Design
- **Spec / link**: two new fields, `formation` ("" = our prediction) and `xi` (11 FPL ids in slot order, goalkeeper first, defence left to right up to the front line; empty = pick for the formation). Link params `fm`, `xi`. Invalid values (unknown formation, wrong count, repeats) are dropped on decode. A lineup is "edited" when either is set.
- **Slots**: `shared/formations.ts` turns a formation string into lines of slots with a role per slot (4-2-3-1 -> GK, LB CB CB RB, CDM CDM, LW CAM RW, ST; a back three with a four/five midfield line gives wing-back slots at the ends).
- **Filling slots** (`shared/lineup-edit.ts`): a player's fit to a slot is 3 (main position = slot role), 2 (one of his other FotMob positions), 1 (same family: back / midfield / attack), 0 otherwise; score = 30 x fit + expected minutes (so a natural left-winger with 40 minutes beats a central midfielder with 60 on the wing, but nobody with real minutes is skipped for a youth player). Global best-pair-first assignment, deterministic. Changing the formation keeps the people already chosen and rearranges them; with nothing chosen, the club's likeliest players are used.
- **Switching**: choosing a player already in another slot swaps the two. "Back to our prediction" clears `fm` and `xi`.
- **Marking it as edited on the image**: a "USER EDITED" pill on the pitch at every size; the footnote says the lineup was edited by the poster (with their handle when set) and is not our prediction, and names our model's own formation; the "also in contention" bench is hidden (it belongs to our prediction); the caption and the footer note say user-edited. Nothing on an edited image is presented as our forecast.
- **Our prediction is untouched** when nothing is edited (same XI, same layout, same tests).

## Tranches (each: tests first -> green, `tsc`, `vitest`, browser check, local commit; no push)
1. Formations + slots + filling/arranging/swapping: pure modules and tests.
2. Spec/link fields, `buildPredictedLineup` edited mode (all club players, edited flag, original formation), caption/footer text, tests.
3. Face (pill, footnote, hidden bench), Customise panel (formation select, slot dropdowns, reset), browser check at 3 sizes + phone.
