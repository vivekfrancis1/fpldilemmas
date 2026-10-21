# Plan 003 — End-to-end design & UX review (2026-10-21)

Scope: all ~40 public pages x phone (390) / laptop (1280) / desktop (1680) x light + dark.
Method: automated audit (overflow, WCAG contrast, pale surfaces in dark, text < 10px, tap targets) over every page, plus visual review of key pages. Results after fixes below.

## Findings and what was done
| # | Finding | Fix |
|---|---|---|
| 1 | No dark mode (only a stray palette) | Theme toggle (nav + mobile header), saved choice, system default; navy/indigo palette; generated exact-token remaps for bg/gradient/text/border across all colour families |
| 2 | Heavy gradient banners / inconsistent headers | Light page header with icon tile + gradient hairline on all data pages; Goal/Assist Share hero replaced |
| 3 | Pastel gradient wrappers differing per page | Removed 24 per-page `min-h-screen bg-gradient` wrappers; one atmospheric page background |
| 4 | Flat cards | Layered shadows, quiet header, hover glow |
| 5 | Tables hard to scan | Uppercase muted headers, tabular numerals, row hover, sans headers |
| 6 | Row sizes differed between gameweek blocks | Fixed card sizes on Match Predictions; no height stretching |
| 7 | No club identity | Club-colour stripes on match cards, fixture team column and fixture tiles (`lib/team-colors.ts`) |
| 8 | Phone: filters took a whole row / pushed table down | Icon-only Filters toggle with active-count badge; bottom sheet with Reset / Show results |
| 9 | Phone navigation = hamburger only | Bottom nav (Matches, Players, Fixtures, My Team, More) |
| 10 | Tab pills overhung track; 6-tab bars wrapped to 3 rows | Auto-height tab lists; sideways-scroll single row on phones |
| 11 | Switches/checkboxes inflated to 44px circles | Small controls with invisible extended hit area |
| 12 | Text under 10px (fixtures, prices, planner) | 10px floor incl. em-based sizes |
| 13 | Light-mode contrast (green/orange/blue accents 3.3-3.7:1) | Darkened accent text; darker fills for white-on-mid-tone pills and gradient buttons |
| 14 | Dark-mode contrast (-500/-600 text on navy) | Lifted shades; gradient headline text |
| 15 | Zoom control on phones; wrong icon on "More Filters" | Hidden on phones; sliders icon |
| 16 | Accessibility basics | Skip link, focus ring, reduced-motion support |
| 17 | Long subtitles pushed content down on phones | 2-line clamp |

## Not done / follow-ups
- Per-page empty-state illustrations and skeleton shimmer unification.
- Table horizontal-scroll edge fade on phones.
- Admin pages were not restyled (internal use).
- `/login` redirects straight to Google OAuth, so it was not audited.
