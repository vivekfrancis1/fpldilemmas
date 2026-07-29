import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:5050';

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

let bootstrapData: any;
let lastSeasonFDR: Record<number, { home: number; away: number }>;

beforeAll(async () => {
  bootstrapData = await fetchJSON('/api/bootstrap-static');
  lastSeasonFDR = await fetchJSON('/api/last-season-form-fdr');
}, 30000);

// /api/last-season-form-fdr computes a PPG-tier FDR (1-5, same thresholds as the existing
// /api/form-based-fdr) from the durable season_fixtures_archive's real 2025/26 results,
// joined back to the current (2026/27) live team IDs by name — since the FPL API reassigns
// team IDs every season, name is the only stable join key across the boundary.
describe('/api/last-season-form-fdr', () => {
  it('returns a home/away tier (1-5) for every current-season team', () => {
    expect(bootstrapData.teams.length).toBeGreaterThan(0);
    for (const team of bootstrapData.teams) {
      const rating = lastSeasonFDR[team.id];
      expect(rating, `missing rating for ${team.name}`).toBeDefined();
      expect(rating.home).toBeGreaterThanOrEqual(1);
      expect(rating.home).toBeLessThanOrEqual(5);
      expect(rating.away).toBeGreaterThanOrEqual(1);
      expect(rating.away).toBeLessThanOrEqual(5);
    }
  });

  it('promoted clubs with no 2025/26 top-flight history default to the same "no data" tier as form-based-fdr', () => {
    const promoted = ['Coventry City', 'Ipswich Town', 'Hull City'];
    for (const name of promoted) {
      const team = bootstrapData.teams.find((t: any) => t.name === name);
      if (!team) continue; // skip if not present in the live bootstrap for some reason
      const rating = lastSeasonFDR[team.id];
      expect(rating).toBeDefined();
      // PPG=1.0 (the "no games played" default) falls into the <=1.2 bucket → tier 2
      expect(rating.home).toBe(2);
      expect(rating.away).toBe(2);
    }
  });

  it('a genuinely strong 2025/26 team (Arsenal, finished 1st) rates as a harder opponent than a genuinely weak one (Spurs, finished 17th)', () => {
    const arsenal = bootstrapData.teams.find((t: any) => t.name === 'Arsenal');
    const spurs = bootstrapData.teams.find((t: any) => t.name === 'Spurs');
    expect(arsenal).toBeDefined();
    expect(spurs).toBeDefined();

    const arsenalRating = lastSeasonFDR[arsenal.id];
    const spursRating = lastSeasonFDR[spurs.id];
    expect(arsenalRating).toBeDefined();
    expect(spursRating).toBeDefined();

    // Arsenal finished 2025/26 top of the table (85 pts) vs. Spurs down in 17th (41 pts), so
    // facing Arsenal should be tiered at least as hard both home and away.
    expect(arsenalRating.home).toBeGreaterThanOrEqual(spursRating.home);
    expect(arsenalRating.away).toBeGreaterThanOrEqual(spursRating.away);
  });
});
