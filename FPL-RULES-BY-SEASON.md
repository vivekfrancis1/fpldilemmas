# FPL Rules by Season

Reference doc for comparing official Fantasy Premier League rules/scoring across seasons. Keep each season's section intact when a new season is added — do not overwrite or delete prior seasons' entries, only append. This app was originally built against 2025/26 rules; 2026/27 is the first season tracked here going forward.

Sources are linked at the bottom of each season's section.

---

## 2025/26 (baseline — what the app was originally built for)

**Season status**: Completed. Final gameweek (GW38) finished, season archived (see `server/season-archive-service.ts`, `CURRENT_SEASON = "2025/26"`).

### Scoring
- **Defensive Contributions (DEFCON) — introduced this season**:
  - Defenders: 2 points for reaching **10 combined CBIT** (clearances, blocks, interceptions, tackles) in a single match.
  - Midfielders/forwards: 2 points for reaching **12 combined CBIRT** (CBIT + ball recoveries) in a single match.
  - Capped at 2 points per match regardless of how far over the threshold.
- **Assists**: definition simplified/broadened to reduce subjectivity — FPL retroactively estimated this would have awarded **41 additional assists** vs. the old definition, had it applied the prior season.
- **BPS**: adjustments to goalkeeper saves, goal-line clearances, penalty goals, and successful tackles (exact point values not published by source).

### Chips
- **Two full chip sets** for the first time (previously one set for the whole season): each half gets its own Wildcard, Free Hit, Triple Captain, Bench Boost — 8 chips total across the season.
- **No Assistant Manager chip** this season (that chip existed in 2024/25 and was removed).
- First chip set had to be used before the **GW19 deadline, 18:30 GMT Tue 30 Dec**.

### Transfers
- Free transfers topped up to a **maximum of 5** at **Gameweek 16**, specifically to help managers handle AFCON-related player unavailability.

### Other
- Two new elite global leagues: top 1% and top 10% of managers.
- FPL Draft: up to 3 additional drafts per season (up from 1).
- Custom AI-generated team badges via Adobe Express.

Source: [All you need to know about changes to FPL for 2025/26 (Premier League)](https://www.premierleague.com/en/news/4373187/whats-new-for-202526-changes-in-fantasy-premier-league)

---

## 2026/27 (current — new season, pre-season squad-building open; matches start August 2026)

**Season status**: Started (squad selection open); first ball not yet kicked as of 2026-07-25.

### Scoring changes vs. 2025/26
- **DEFCON thresholds/points unchanged**: still 10 CBIT (defenders) / 12 CBIRT (midfielders/forwards) for 2 points, capped at 2/match. Only its *interaction with BPS* changed (below) — the DEFCON formula itself is the same as 2025/26.
- **BPS reworked**, specifically to reduce overlap with DEFCON and help keepers/full-backs/attackers:
  - **Tackled penalty removed** — players no longer lose BPS for being dribbled past (benefits creative/attacking players).
  - **Centre-backs/defenders**: now **+1 BPS per 3 CBI** (was 1 per 2) — makes it harder for high-CBI defenders to also dominate bonus points.
  - **Goalkeepers**: **+2 BPS per save** (up from prior value); **+1 BPS** extra for saves made inside the box; **no longer** get BPS for saves outside the box; **+1 BPS** for saving a "big chance"; penalty save value changed to **8 BPS + the big-chance-save point** (net change from a flat 8).
  - Net effect per FPL/analyst commentary: recalibration slightly favors holding midfielders (Rodri/Caicedo-type profiles) and slightly disadvantages full-backs whose assists come from short cross deliveries.
- **Gameweek lockdown moved later**: scores go final at **9:00am UK time the day after** the last match of the gameweek (was: one hour after the final whistle). More time for stat corrections before scores lock.

### Chips — unchanged from 2025/26
- Still two full sets (Wildcard, Free Hit, Triple Captain, Bench Boost), 8 chips total.
- First set must be used before **GW19 deadline, 13:30 GMT Sat 2 Jan** (date shifts vs. 2025/26 because fixture calendar differs, but same "before GW19" structure).
- No Assistant Manager chip (still absent).

### Transfers
- **No AFCON transfer top-up this season** — AFCON doesn't occur again until June/July 2027, so the "max 5 free transfers via top-up at GW16" mechanic from 2025/26 does not apply in 2026/27. (Free transfers still roll over normally, max 5 banked.)

### New product features (not scoring changes, but relevant to what to build/compare against)
- **Live in-play updates**: projected bonus points appear after 20 minutes of a match and update as it progresses; mini-league standings and overall ranks now update live during matches (previously only after full-time).
- **Daily price-change predictor**, published 00:00 UK time — same problem space as this app's own `price-tracker` page; worth comparing methodology once season data flows in.
- **Percentage-rank display**: final rank shown as a percentile of all managers; also a running percentile during the season and career-average comparison.
- Cosmetic/onboarding: AI-assisted initial squad picker for beginners, "Rookie League" for new players, Adobe Express gameweek recap graphics.

Sources:
- [All you need to know about changes to FPL for 2026/27 (Premier League)](https://www.premierleague.com/en/news/4679873/all-you-need-to-know-about-changes-to-fpl-for-202627)
- [What's happening with defensive contribution points in 2026/27 Fantasy? (Premier League)](https://www.premierleague.com/en/news/4361991/whats-happening-with-defensive-contribution-points-in-202627-fantasy)
- [FPL 2026/27: 5 rule changes + new features announced (Fantasy Football Scout)](https://www.fantasyfootballscout.co.uk/2026/07/20/fpl-2026-27-5-rule-changes-new-features-announced)

---

## Net diff, 2025/26 → 2026/27 (quick reference)

| Area | 2025/26 | 2026/27 | Changed? |
|---|---|---|---|
| DEFCON thresholds/points | 10 CBIT (DEF) / 12 CBIRT (MID/FWD) → 2 pts, cap 2 | Same | No |
| BPS: tackled penalty | Players lose BPS when tackled | Penalty removed | **Yes** |
| BPS: CB clearances/blocks/interceptions | +1 per 2 CBI | +1 per 3 CBI | **Yes** |
| BPS: GK saves | Flat per-save value | +2/save, +1 extra inside box, 0 outside box, +1 big-chance save | **Yes** |
| BPS: penalty save | 8 BPS flat | 8 BPS + big-chance-save point | **Yes** |
| Gameweek lockdown | 1hr after final whistle | 9am next day | **Yes** |
| Chip sets | 2 sets / 8 chips, no Assistant Manager | Same | No |
| First chip-set deadline | GW19, 18:30 GMT 30 Dec | GW19, 13:30 GMT 2 Jan | Date only (calendar shift) |
| AFCON free-transfer top-up | +transfers to max 5 at GW16 | None (no AFCON this season) | **Yes** |
| Live in-play bonus/rank updates | No | Yes | **Yes** (new feature) |
| Price-change predictor | No | Yes (00:00 UK daily) | **Yes** (new feature) |

### Implications for this codebase
- **BPS/bonus-point projection logic is the main thing to revisit** before the season starts — wherever bonus points are estimated from CBI/save/tackle inputs (check `server/projection-adjustments.ts` and the goalkeeper/defender scoring paths in the projection service) is now modeling the 2025/26 formula, not 2026/27.
- DEFCON point calculation itself needs no formula change.
- `CURRENT_SEASON = "2025/26"` in `server/season-archive-service.ts` will need to become `"2026/27"` once real fixture/gameweek data exists for the new season — not done yet, deliberately, since this doc is research-only for now.
- Consider whether to build a live in-play bonus-points/rank feature to match FPL's new live updates, since that's now a baseline expectation set by the official game.
