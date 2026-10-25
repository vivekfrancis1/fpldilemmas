# Plan 016 - My team in the Top Managers groups, and any league ID

Status: IMPLEMENTED locally (2026-10-25), not pushed. Also: a Position column (place by total points, ties shared) on all four group tables.

## What the user asked
Enter any league id and see my points/rank against the rest of that league, whether or not I am a member. Also for the
four groups already under Top Managers: All time Top 100, Elite 64, Analytics Elite 64 and Content creators (a DB list,
not an FPL league). User's steer: "just artificially add the user's team to that list" on the existing pages.

## Design
1. `shared/group-placement.ts` (pure, TDD): given the group's members' total and gameweek points and "you", returns
   your position (competition ranking: 1 + managers with strictly more points, you excluded from the others), the group
   size, whether you are already a member, points to the next place up / lead over the next place down.
2. `GET /api/league-standings/:leagueId` (any classic league): every standings page up to a cap, 5-minute cache,
   returns rows {rank, managerId, name, teamName, gameweekPoints, totalPoints} + league name + whether it was capped.
3. Team-ID box ("Where would my team place?") on the four Top Managers pages: remembered ID, a summary banner (total
   rank, gameweek rank) and a highlighted "You" row added to the table (unless you are already a member).
4. New page "League Rank" (My FPL menu): team ID + any league ID, same banner and a standings table with the You row.

## Out of scope
No change to how existing columns, projections or caches are computed.
