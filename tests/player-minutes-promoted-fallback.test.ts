import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:5050';

// Fallback for players with zero current-season AND no usable 2025/26 row (last-season starts
// < MIN_STARTS_FOR_RATE, or no name match at all). Two different populations get two different
// league-average bases (server/player-history-blend-service.ts getLeagueAverageRates):
//   - Promoted-team players (whole squad is equally new to the top flight, most do feature at
//     some point): average minutes per actual appearance with >=1 minute — "when they play, how
//     long do they last" — not an assumed guaranteed 90.
//   - Non-promoted-team "new" players (much more likely genuine fringe/reserve signings, many of
//     whom never feature at all): average across every registered player at that position,
//     played or not — correctly reflecting that most such players contribute nothing.
describe('Minutes projection fallback: promoted vs non-promoted "new" players', () => {
  let minutesData: any[];

  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api/player-minutes-projections`);
    minutesData = await res.json();
  }, 60000);

  it('non-promoted-team GKP with no PL history (Meslier, Arsenal) gets the heavily-discounted all-players average', () => {
    const meslier = minutesData.find((p: any) => p.playerId === 3);
    expect(meslier).toBeDefined();
    expect(meslier.teamShort).toBe('ARS');
    // League avg minutes/game across ALL registered 2025/26 keepers, played or not — well below
    // the 60-min threshold, since most registered keepers never feature at all.
    expect(meslier.expectedMinutesPerGame).toBeLessThan(30);
    expect(meslier.pct60Plus).toBe(0);
  });

  it('promoted-team MID now has real current-season minutes (Rudoni, Coventry), no longer hitting any fallback', () => {
    // The manual pre-season xMins override (server/xmins-override.ts) only applies while
    // currentGameweek === 0; it self-disables the moment a real gameweek goes live, and by
    // GW2 Rudoni has genuinely played across two separate fixtures (his own team's GW1 and
    // GW2 matches have both finished, even though the wider GW2 window hasn't for every team
    // yet — current-standings/history counts per-fixture, not per-gameweek). He's fully past
    // the "0 minutes, needs a fallback" case this test file is otherwise about — this just
    // locks in that his average now reflects both real games (20 + 70 minutes) rather than
    // either the old manual override value or a stale single-game figure.
    const rudoni = minutesData.find((p: any) => p.playerId === 183);
    expect(rudoni).toBeDefined();
    expect(rudoni.teamShort).toBe('COV');
    expect(rudoni.currentMinutesPerGame).toBe(45);
    expect(rudoni.expectedMinutesPerGame).toBe(45);
  });

  it('promoted-team FWD still on 0 current-season minutes (Wright, Coventry) falls through to the historical blend now that the pre-season override has disabled itself', () => {
    // Wright genuinely has 0 minutes/0 starts recorded this season, so — with the pre-season
    // manual xMins override now inactive (currentGameweek !== 0) — he correctly falls through
    // to the same last-season-rate/league-average fallback as any other 0-minute player (see
    // getLastSeasonPlayerRow/lastSeasonMinutesPerStart in player-history-blend-service.ts),
    // not the manual analyst projection this test previously exercised pre-season.
    const wright = minutesData.find((p: any) => p.playerId === 193);
    expect(wright).toBeDefined();
    expect(wright.teamShort).toBe('COV');
    expect(wright.expectedMinutesPerGame).toBe(54);
  });

  it('the promoted-team fallback is meaningfully higher than the non-promoted fallback at the same position', () => {
    // Every promoted-team keeper's whole squad was in the Championship last season, so none of
    // them can have a 2025/26 PL last-season row — any of them hitting the fallback is a clean
    // comparison against Meslier (Arsenal, non-promoted) at the same position.
    const promotedTeams = new Set(['COV', 'HUL', 'IPS']);
    const promotedGkp = minutesData.find((p: any) => p.position === 'Goalkeeper' && promotedTeams.has(p.teamShort));
    const meslier = minutesData.find((p: any) => p.playerId === 3);
    expect(promotedGkp).toBeDefined();
    expect(promotedGkp.expectedMinutesPerGame).toBeGreaterThan(meslier.expectedMinutesPerGame);
  });
});
