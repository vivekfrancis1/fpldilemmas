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

  it('promoted-team MID with no PL history (Rudoni, Coventry) gets the per-game-played average, not a flat 90', () => {
    const rudoni = minutesData.find((p: any) => p.playerId === 183);
    expect(rudoni).toBeDefined();
    expect(rudoni.teamShort).toBe('COV');
    // League avg minutes per actual MID appearance last season — realistically below 90 but high
    // enough to clear the 60-min threshold.
    expect(rudoni.expectedMinutesPerGame).toBeGreaterThan(50);
    expect(rudoni.expectedMinutesPerGame).toBeLessThan(90);
    expect(rudoni.pct60Plus).toBe(100);
  });

  it('promoted-team FWD with no PL history (Wright, Coventry) sits below the 60-min threshold, unlike the old always-90 fallback', () => {
    const wright = minutesData.find((p: any) => p.playerId === 193);
    expect(wright).toBeDefined();
    expect(wright.teamShort).toBe('COV');
    // Forwards get subbed more than midfielders — per-game-played average should land below 60.
    expect(wright.expectedMinutesPerGame).toBeLessThan(60);
    expect(wright.pct60Plus).toBe(0);
    expect(wright.pctBelow60).toBe(100);
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
