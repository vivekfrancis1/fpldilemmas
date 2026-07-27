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
