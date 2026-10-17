import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = `http://localhost:5050`;

// The adjusted and raw Player Total Points responses must both be derived from the SAME stored snapshot
// (the 15-minute totalPointsCache entry). Previously the adjusted response read that snapshot but the raw
// one recomputed everything from the component caches, so when a component cache refreshed in between,
// a fully-available player's adjusted and raw totals could disagree by a few tenths of a point.
// The aggregator labels how it served a response in the X-Total-Points-Source header ('cache' | 'live').

async function get(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  return { source: res.headers.get('x-total-points-source'), body: await res.json() };
}

let start = 0;
let end = 0;

beforeAll(async () => {
  const warm = await get('/api/cached/player-total-points'); // adjusted: warms the snapshot
  expect(Array.isArray(warm.body)).toBe(true);
  // The range the cached endpoint serves, read from the player gameweek keys of any projection
  const keys = Object.keys(warm.body[0].gameweekProjections || {}).map(Number).filter((n) => n <= 38).sort((a, b) => a - b);
  start = keys[0];
  end = keys[keys.length - 1];
}, 120000);

describe('Player total points: raw and adjusted come from one stored snapshot', () => {
  it('a raw request right after an adjusted one is served from the stored snapshot, not recomputed', async () => {
    await get(`/api/player-total-points?startGameweek=${start}&endGameweek=${end}`); // adjusted, ensure snapshot exists
    const raw = await get(`/api/player-total-points?startGameweek=${start}&endGameweek=${end}&availabilityAdjusted=false`);
    expect(raw.source).toBe('cache');
  });

  it('an adjusted request is served from the same stored snapshot', async () => {
    const adjusted = await get(`/api/player-total-points?startGameweek=${start}&endGameweek=${end}`);
    expect(adjusted.source).toBe('cache');
  });

  it('the cached endpoint passes the source through for raw requests too', async () => {
    const raw = await get('/api/cached/player-total-points?availabilityAdjusted=false');
    expect(raw.source).toBe('cache');
  });

  it('raw and adjusted agree exactly for players whose availability ratio is 1 in every gameweek', async () => {
    const adjusted = await get(`/api/player-total-points?startGameweek=${start}&endGameweek=${end}`);
    const raw = await get(`/api/player-total-points?startGameweek=${start}&endGameweek=${end}&availabilityAdjusted=false`);
    const rawById = new Map<number, any>(raw.body.map((p: any) => [p.playerId, p]));
    const checked: number[] = [];
    const mismatches: string[] = [];
    for (const a of adjusted.body) {
      const r = rawById.get(a.playerId);
      if (!r) continue;
      // Same total in both responses to the penny => no divergence between them
      if (Math.abs((a.totalExpectedPoints || 0) - (r.totalExpectedPoints || 0)) < 1e-9) { checked.push(a.playerId); continue; }
      // A difference is only legitimate when availability scaling was applied to this player
      if (!a.availabilityAdjustments || Object.keys(a.availabilityAdjustments).length === 0) {
        mismatches.push(`${a.playerName}: adjusted ${a.totalExpectedPoints} vs raw ${r.totalExpectedPoints}`);
      }
    }
    expect(checked.length).toBeGreaterThan(100);
    expect(mismatches).toEqual([]);
  });
});
