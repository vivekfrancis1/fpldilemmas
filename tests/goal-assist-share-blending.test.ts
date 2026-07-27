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
let totalTeamCount: number;
let goalShareData: any[];
let assistShareData: any[];

// goal-share-season/assist-share-season are expensive on a cold cache — live bootstrap-static
// + fixtures fetch, plus getBulkPlayerHistories for ~600 players — so fetch both once here with
// a generous timeout rather than repeating the slow call in every `it`.
beforeAll(async () => {
  bootstrapData = await fetchJSON('/api/bootstrap-static');
  totalTeamCount = bootstrapData.teams.length;
  goalShareData = await fetchJSON('/api/goal-share-season');
  assistShareData = await fetchJSON('/api/assist-share-season');
}, 120000);

// ─────────────────────────────────────────────────────────────────────────────
// Early in a season, most non-promoted teams' players have zero this-season
// goals/xG or assists/xA, since real 2026/27 minutes haven't accumulated yet.
// goal-share-season / assist-share-season previously computed player share
// purely from this-season stats with no last-season blend, and dropped any
// team whose total was exactly 0 (`if (teamData.total === 0) return;`) — so
// almost the entire league's players were silently missing from the response.
// This test locks in the fix: every team (not just the 3 promoted ones) must
// appear, and every listed player must have a finite, non-negative share.
// ─────────────────────────────────────────────────────────────────────────────
describe('Goal share blending (last-season fallback)', () => {
  it('includes every Premier League team, not just ones with nonzero this-season goals', () => {
    expect(Array.isArray(goalShareData)).toBe(true);
    const teamIds = new Set(goalShareData.map((t: any) => t.teamId));
    expect(teamIds.size).toBe(totalTeamCount);
  });

  it('every player has a finite, non-negative goalShare', () => {
    for (const team of goalShareData) {
      for (const player of team.players) {
        expect(Number.isFinite(player.goalShare)).toBe(true);
        expect(player.goalShare).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('every team has at least one player (real players get a blended share even with 0 goals this season)', () => {
    for (const team of goalShareData) {
      expect(team.players.length).toBeGreaterThan(0);
    }
  });
});

// Team Goal/Assist Projections are per-game rates now (average of the 2025/26 and 2026/27
// per-game rates, each itself 0.5×Goals + 0.5×xG), not season totals — pre-season, with no
// 2026/27 games yet, this reduces to just the 2025/26 rate: (0.5×assumedTotal + 0.5×0) / 38.
describe('Promoted-team share uses real team total, not the incomplete listed-player sum', () => {
  it('Projected goal share: Hull total reflects the real 70-goal season as a per-game rate, and McBurnie stays below Haaland', () => {
    const hull = goalShareData.find((t: any) => t.teamName === 'Hull City');
    const city = goalShareData.find((t: any) => t.teamName === 'Man City');
    expect(hull.expectedGoals).toBeCloseTo((70 * 0.5) / 38, 2); // xG=0 for promoted teams, pre-season (2025/26 rate only)
    const mcburnie = hull.players.find((p: any) => p.playerName.includes('McBurnie'));
    const haaland = city.players.find((p: any) => p.playerName.includes('Haaland'));
    expect(mcburnie.goalShare).toBeLessThan(haaland.goalShare);
  });

  it('Projected assist share: Hull total reflects 0.85 × 70 as a per-game rate', () => {
    const hull = assistShareData.find((t: any) => t.teamName === 'Hull City');
    expect(hull.expectedAssists).toBeCloseTo((70 * 0.85 * 0.5) / 38, 2);
  });
});

describe('Assist share blending (last-season fallback)', () => {
  it('includes every Premier League team, not just ones with nonzero this-season assists', () => {
    expect(Array.isArray(assistShareData)).toBe(true);
    const teamIds = new Set(assistShareData.map((t: any) => t.teamId));
    expect(teamIds.size).toBe(totalTeamCount);
  });

  it('every player has a finite, non-negative assistShare', () => {
    for (const team of assistShareData) {
      for (const player of team.players) {
        const share = player.assistShare ?? player.goalShare;
        expect(Number.isFinite(share)).toBe(true);
        expect(share).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ?season= requests real (non-blended) data instead of the default Projected
// blend tested above. 2025/26 comes from the season_player_snapshot archive
// (exact real totals — Haaland's 25 goals/2025-26 are pinned, immutable
// history); 2026/27 comes from this season's actual fixtures (0 until real
// games are played). Promoted teams get an admin-configured assumed team
// total for 2025/26 and their true 46-game Championship season length.
// ─────────────────────────────────────────────────────────────────────────────
describe('Real season goal/assist share (?season= toggle)', () => {
  let real2526: any[];
  let real2627: any[];
  let assist2526: any[];

  beforeAll(async () => {
    real2526 = await fetchJSON('/api/goal-share-season?season=2025%2F26');
    real2627 = await fetchJSON('/api/goal-share-season?season=2026%2F27');
    assist2526 = await fetchJSON('/api/assist-share-season?season=2025%2F26');
  }, 120000);

  it('2025/26 includes every team with real, exact last-season goal totals', () => {
    expect(real2526.length).toBe(totalTeamCount);
    const city = real2526.find((t: any) => t.teamName === 'Man City');
    const haaland = city.players.find((p: any) => p.playerName.includes('Haaland'));
    expect(haaland.projectedGoals).toBe(25);
    expect(city.games).toBe(38);
  });

  it('2025/26 gives promoted teams their true 46-game Championship season and real assumed team total', () => {
    const hull = real2526.find((t: any) => t.teamName === 'Hull City');
    expect(hull.games).toBe(46);
    expect(hull.assumedTeamGoals).toBe(70); // real 2025/26 Championship total, not the sum of listed players (~37)
    // McBurnie's share must be measured against the real total (70), not the incomplete list-sum,
    // otherwise his share (and everyone else's) is roughly double what it should be.
    const mcburnie = hull.players.find((p: any) => p.playerName.includes('McBurnie'));
    expect(mcburnie.projectedGoals).toBe(18); // his own real goal count, unaffected by the denominator fix
    expect(mcburnie.goalShare).toBeCloseTo((18 / 70) * 100, 1);

    // Every player's projectedGoals should equal goalShare × assumedTeamGoals (an identity, since
    // that's exactly how goalShare was derived from projectedGoals/assumedTeamGoals).
    for (const player of hull.players) {
      const expected = (player.goalShare / 100) * hull.assumedTeamGoals;
      expect(player.projectedGoals).toBeCloseTo(expected, 1);
    }
  });

  it('McBurnie no longer outranks Haaland once promoted-team shares use the real team total', () => {
    const hull = real2526.find((t: any) => t.teamName === 'Hull City');
    const city = real2526.find((t: any) => t.teamName === 'Man City');
    const mcburnie = hull.players.find((p: any) => p.playerName.includes('McBurnie'));
    const haaland = city.players.find((p: any) => p.playerName.includes('Haaland'));
    expect(mcburnie.projectedGoals).toBeLessThan(haaland.projectedGoals);
    expect(mcburnie.goalShare).toBeLessThan(haaland.goalShare);
  });

  it('2025/26 assist share gives Bruno Fernandes his real 21 assists', () => {
    const utd = assist2526.find((t: any) => t.teamName === 'Man Utd');
    const bruno = utd.players.find((p: any) => p.playerName.includes('Bruno'));
    expect(bruno.projectedAssists).toBe(21);
  });

  it('2026/27 includes every team with finite, non-negative shares (0 pre-season)', () => {
    expect(real2627.length).toBe(totalTeamCount);
    for (const team of real2627) {
      expect(Number.isFinite(team.games)).toBe(true);
      for (const player of team.players) {
        expect(Number.isFinite(player.goalShare)).toBe(true);
        expect(player.goalShare).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
