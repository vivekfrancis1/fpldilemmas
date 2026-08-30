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
// goal-share-season / assist-share-season (default, no ?season=) compute player
// share purely from this season's (2026/27) real goals+xG / assists+xA — no
// 2025/26 blend and no promoted-team/new-signing fallback. A team whose total
// is exactly 0 (no games played, or no real output yet) still appears with a
// 0 share for every player, rather than being dropped or estimated.
// ─────────────────────────────────────────────────────────────────────────────
describe('Goal share (this season only)', () => {
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

  it('every team has at least one player (real players get a 0 share, not dropped, with 0 goals this season)', () => {
    for (const team of goalShareData) {
      expect(team.players.length).toBeGreaterThan(0);
    }
  });
});

// The default (projected, no ?season=) goal/assist share no longer gives promoted teams any
// special treatment — no assumed/regressed PL-level total, no real-Championship-total
// substitution. Hull's players have real 2026/27 Premier League data just like anyone else's,
// so their team total is just the sum of that, computed identically to every other team.
describe('Promoted teams get no special treatment in the default (this-season-only) share', () => {
  it('Hull has no assumedTeamGoals/assumedTeamAssists field, and McBurnie stays below Haaland', () => {
    const hull = goalShareData.find((t: any) => t.teamName === 'Hull City');
    const city = goalShareData.find((t: any) => t.teamName === 'Man City');
    expect(hull.assumedTeamGoals).toBeUndefined();
    const mcburnie = hull.players.find((p: any) => p.playerName.includes('McBurnie'));
    const haaland = city.players.find((p: any) => p.playerName.includes('Haaland'));
    expect(mcburnie.goalShare).toBeGreaterThanOrEqual(0);
    expect(mcburnie.goalShare).toBeLessThan(haaland.goalShare);
  });

  it('Hull assist share also has no assumedTeamAssists field', () => {
    const hull = assistShareData.find((t: any) => t.teamName === 'Hull City');
    expect(hull.assumedTeamAssists).toBeUndefined();
  });
});

describe('Assist share (this season only)', () => {
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
// ?season= requests real historical data — a genuinely different feature from
// the default (this-season-only) share tested above, not a "projection." 2025/26
// comes from the season_player_snapshot archive (exact real totals — Haaland's
// 25 goals/2025-26 are pinned, immutable history), with promoted teams' real
// Championship figures (curated in PROMOTED_TEAM_PLAYER_LAST_SEASON, since
// they never played in the Premier League that season) and true 46-game season
// length. 2026/27 comes from this season's actual fixtures (0 until real games
// are played).
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

  it('2025/26 gives promoted teams their true 46-game Championship season and real (not assumed) goal totals', () => {
    const hull = real2526.find((t: any) => t.teamName === 'Hull City');
    expect(hull.games).toBe(46);
    expect(hull.expectedGoals).toBe(70); // real Championship total, share denominator
    expect(hull.assumedTeamGoals).toBeUndefined(); // no assumed/regressed PL-level conversion anymore
    // McBurnie's share must be measured against the real total (70), not the incomplete list-sum,
    // otherwise his share (and everyone else's) is roughly double what it should be.
    const mcburnie = hull.players.find((p: any) => p.playerName.includes('McBurnie'));
    expect(mcburnie.goalShare).toBeCloseTo((18 / 70) * 100, 1);
    expect(mcburnie.projectedGoals).toBe(18); // just his real Championship goal count, no conversion

    // Every player's projectedGoals is just their own real goal count.
    for (const player of hull.players) {
      expect(player.projectedGoals).toBeGreaterThanOrEqual(0);
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
