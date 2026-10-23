# Plan 013 — Making Player Plot and Graphics Maker the best available

Status: IN PROGRESS (2026-10-23). User approved the whole first tranche in order. Done locally, not pushed: Player Plot items 3/4/5 (my team on the plot, colour/size by, trend line + outliers) and item 1 (link previews). With the Graphics Maker session: 5 more templates, then gameweek pack (11), captions (13) and creator handle (2) (sent as briefs, status unknown).
Created: 2026-10-23

Goal (user): "the player plots and graphics maker to be the best available among any tools".

## Where things stand (checked today)
- Competitor search was thin and I did not verify features inside paywalled products. What I did find: no dominant FPL-specific scatter-plot tool. FBPlot is a general football charting site (about $9/month, real-world stats, no FPL points), ScoutingStats AI is a paid app for real-world scouting, Fantasy Football Scout has radar/bubble charts behind a paywall, and the open-source vaastav dashboard is a basic price-vs-points scatter on old data. FPL Edits (fpledits.com) is the graphics benchmark: ~15 templates, accounts, live scores sidebar. The official FPL Gameweek Recap image exists but is one fixed card.
- Ours today: Player Plot has any-stat-vs-any-stat (50+ stats incl. our xPts and xMins), position tabs, ~40 quick views, filters, stretched scale, median lines, quadrant captions, auto-declutter labels, URL-shareable state, and a 1080x1350 share image. Graphics Maker has 9 templates (+5 being added), 3 sizes, 4 themes, URL-shareable state, mandatory FPL Dilemmas watermark.

## What would make each one clearly best (ranked by impact for the effort)

### Shared (both tools)
1. **Link previews that show the graphic (HIGH impact, medium-large).** Today a pasted link shows the generic site card on X/WhatsApp, so people must attach a PNG. Fix: a server route that renders the graphic to a PNG (server-side, same layout code) and serves it as the page's og:image, plus short links (`/g/abc123`) stored in the DB. Needs a headless renderer on the server (new dependency, e.g. satori/resvg or a headless browser) — needs approval. This alone separates us from every competitor that only gives a download.
2. **Creator brand kit (HIGH, small-medium).** Optional handle ("@yourname") and accent colour on every graphic, next to (never replacing) the FPL Dilemmas watermark; remembered in the browser. Creators will use the tool because it is theirs.

### Player Plot
3. **Show my team / my league on the plot (HIGH, small-medium).** Enter a team ID once; your 15 players get a ring and a "Yours" list under the chart (same ID already remembered by Rate My Team). Mini-league ownership as bubble size. Nobody else does this inside a scatter.
4. **Third and fourth dimension (HIGH, small).** Colour by club / position / price band and bubble size by ownership or price, as a toggle. Legend included.
5. **Trend line and outliers (MEDIUM-HIGH, small).** Fit line for the chosen pair (e.g. points vs xG); list the five biggest over- and under-performers vs the line. Turns a picture into an answer.
6. **Fixture-adjusted axes (MEDIUM-HIGH, medium).** Player output against the next opponents' weakness from our own team projections (already in plan-009 follow-ups).
7. **Zoom, brush-select and compare (MEDIUM, medium).** Pinch/drag zoom, lasso a cluster, one tap to open them in Compare.
8. **Other seasons (MEDIUM, medium).** We hold history from 2016/17; plot last season's numbers or season-vs-season movement.
9. **Share image upgrades (MEDIUM, small-medium).** Featured-player callout with shirt and arrow, two panels in one image, custom headline/caption, story size.
10. **CSV export and embed (LOW-MEDIUM, small).** Download the plotted rows; an iframe embed for creators' sites.

### Graphics Maker
11. **Gameweek pack (HIGH, medium).** One click builds the standard set (captains, differentials, price changes, fixtures, availability) for the gameweek and downloads a ZIP, with a generated caption and hashtags per image.
12. **More sizes and formats (MEDIUM-HIGH, small).** Story 1080x1920, X 1600x900, 2x export, transparent background option.
13. **Caption generator (MEDIUM-HIGH, small).** Ready-to-post text for each graphic with the key numbers, copy button, and an "open X with this text" link.
14. **Carousel (MEDIUM, medium).** Several slides in one export for Instagram.
15. **My-team templates (MEDIUM-HIGH, medium).** Gameweek recap for any team ID (rank, points, captain, bench points, transfers), chip strategy card, mini-league table card.
16. **Saved designs (MEDIUM, small with browser storage; larger with accounts).** Recent graphics remembered in the browser.
17. **Better looks (MEDIUM, small-medium).** More theme styles and background options, real club badges where licensing allows, animated entrance for GIF/MP4 export (larger).

## Suggested first tranche (about two sessions of work)
A. Plot: show my team (3), colour/size by (4), trend line + outliers (5).
B. Graphics: gameweek pack ZIP (11), story/X sizes (12), caption generator (13), creator handle (2).
C. Then link previews with short links (1) as its own project, because it adds a server renderer and DB table.

## Decisions needed
1. OK to start with tranche A + B above? Or a different order?
2. Link previews (1) need a new server dependency and a DB table; approve when we get there.
3. Creator handle: show it on the image next to the watermark (my recommendation), never instead of it?

## Out of scope for now
Accounts/login for saving designs, video/GIF rendering, and real player photos (licensing).

## Update 2026-10-23 — built
- **Player Plot** (`shared/player-plot.ts`, `client/src/components/player-plot-chart.tsx`, `client/src/pages/player-plot.tsx`, `tests/player-plot-insights.test.ts`): `?my=<team id>` rings your 15 players in gold (always plotted even if filtered out) with a "Your squad on this chart" list; `?cb=position|price|ownership` colours and `?sz=ownership|price|minutes` sizes dots (legend included); `?tr=1` draws a least-squares trend line (bends correctly on the stretched axis) with R-squared and lists the biggest over/under-performers. The share image mirrors all of it.
- **Link previews** (`server/shared-graphics.ts`, `server/shared-graphics-routes.ts`, `client/src/lib/share-link.ts`): no new dependency and no server renderer. When the share menu opens, the browser makes a 1200x630 link card of the graphic and POSTs it (image/png) to `/api/shared-graphics`; the server validates it (real PNG, exactly 1200x630, <1.5MB, target must be a path on this site, title cleaned), stores it in the `shared_graphics` table (created on first use, deduplicated by image+page hash, rows older than 180 days pruned) and returns `/g/<id>`. `/g/<id>` is a small HTML page with the og:/twitter: tags and sends people on to the tool at the saved settings; `/g/<id>.png` is the image. Posting to X/Facebook/WhatsApp/Telegram/LinkedIn now uses that short link, so the post shows the graphic. If the upload fails the page link is used and the image is still copied.
- **Limits and risks:** anonymous uploads are limited to 40 per hour per address (loopback exempt) and 1.5MB each, but anyone can host an image on /g/ on our domain; there is no moderation. Previews only work on the deployed site (X cannot fetch localhost). Set `PUBLIC_ORIGIN=https://fpldilemmas.com` on Railway to pin the origin used in the tags (otherwise it comes from the request host). The table is created at runtime with CREATE TABLE IF NOT EXISTS, like the Copilot tables, so no migration step.

