import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:5050';

// No last-season blend and no promoted-team/non-promoted-team fallback distinction (removed
// per explicit product decision — see the "new to the league" comment in routes.ts). A player
// with 0 current-season minutes/starts projects 0 expected minutes until they actually feature,
// regardless of whether their club is promoted or established.
describe('Minutes projection: no fallback for players with 0 current-season minutes', () => {
  let minutesData: any[];

  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api/player-minutes-projections`);
    minutesData = await res.json();
  }, 60000);

  it('non-promoted-team player with 0 minutes/starts this season (Meslier, Arsenal) projects 0, not a league-average estimate', () => {
    const meslier = minutesData.find((p: any) => p.playerId === 3);
    expect(meslier).toBeDefined();
    expect(meslier.teamShort).toBe('ARS');
    expect(meslier.expectedMinutesPerGame).toBe(0);
    expect(meslier.pct60Plus).toBe(0);
  });

  it('promoted-team player with 0 minutes/starts this season (Wright, Coventry) also projects 0 — same treatment as any other club', () => {
    const wright = minutesData.find((p: any) => p.playerId === 193);
    expect(wright).toBeDefined();
    expect(wright.teamShort).toBe('COV');
    expect(wright.expectedMinutesPerGame).toBe(0);
  });

  it('promoted-team MID with real current-season minutes (Rudoni, Coventry) reflects his actual games played, not any fallback', () => {
    // Rudoni has genuinely played across two separate fixtures (his own team's GW1 and GW2
    // matches have both finished, even though the wider GW2 window hasn't for every team yet —
    // current-standings/history counts per-fixture, not per-gameweek): 20 + 70 minutes.
    const rudoni = minutesData.find((p: any) => p.playerId === 183);
    expect(rudoni).toBeDefined();
    expect(rudoni.teamShort).toBe('COV');
    expect(rudoni.currentMinutesPerGame).toBe(45);
    expect(rudoni.expectedMinutesPerGame).toBe(45);
  });

  it('a promoted-team starting goalkeeper with real minutes projects those real minutes, same as any other club\'s starter', () => {
    const promotedStarters = minutesData.filter((p: any) =>
      p.position === 'Goalkeeper' && ['COV', 'HUL', 'IPS'].includes(p.teamShort) && p.expectedMinutesPerGame > 0
    );
    expect(promotedStarters.length).toBeGreaterThan(0);
    for (const gkp of promotedStarters) {
      expect(gkp.expectedMinutesPerGame).toBeGreaterThan(60);
    }
  });
});
