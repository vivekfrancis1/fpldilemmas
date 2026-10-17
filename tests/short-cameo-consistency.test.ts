import { describe, it, expect, beforeAll } from 'vitest';
import { MIN_RELIABLE_MINUTES } from '../server/share-shrinkage';

// Guards against short-cameo inflation: a player with fewer than MIN_RELIABLE_MINUTES must not
// project above the best same-team, same-position teammate who has a reliable sample. Teammates
// are compared at their healthiest gameweek (max single-GW projection), because a hurt starter
// legitimately projects 0 while out and his stand-in is then the one playing.
// Runs against the dev server by default; set TEST_BASE_URL to check another environment.
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5050';
const TOLERANCE = 1.15;

async function fetchJSON(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

// copilotMinutes: this player's expected minutes come from Copilot's forecast (which already prices
// in who is starting), not from his thin season-minutes sample — so inflation can't be the cause.
export interface ConsistencyRow { name: string; team: string; position: string; minutes: number; gwPoints: number[]; copilotMinutes?: boolean }

export function findShortCameoInflation(rows: ConsistencyRow[], minReliable: number, tolerance: number) {
  const violations: Array<{ name: string; avg: number; reference: string; referenceMax: number }> = [];
  const groups = new Map<string, ConsistencyRow[]>();
  for (const r of rows) {
    const key = `${r.team}|${r.position}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  for (const members of groups.values()) {
    const reliable = members.filter(m => m.minutes >= minReliable);
    if (reliable.length === 0) continue;
    const best = reliable
      .map(m => ({ m, max: Math.max(0, ...m.gwPoints) }))
      .sort((a, b) => b.max - a.max)[0];
    for (const m of members) {
      if (m.minutes <= 0 || m.minutes >= minReliable || m.gwPoints.length === 0 || m.copilotMinutes) continue;
      const avg = m.gwPoints.reduce((s, v) => s + v, 0) / m.gwPoints.length;
      if (avg > best.max * tolerance) violations.push({ name: m.name, avg, reference: best.m.name, referenceMax: best.max });
    }
  }
  return violations;
}

describe('findShortCameoInflation (logic)', () => {
  const mk = (name: string, minutes: number, gwPoints: number[]): ConsistencyRow => ({ name, team: 'SUN', position: 'Forward', minutes, gwPoints });
  it('flags a sub projecting well above the healthy starter', () => {
    const v = findShortCameoInflation([mk('Starter', 400, [0, 5, 5.5]), mk('Sub', 117, [8, 8, 7])], 360, 1.15);
    expect(v.map(x => x.name)).toEqual(['Sub']);
  });
  it('allows a sub at or below the healthy starter', () => {
    expect(findShortCameoInflation([mk('Starter', 400, [0, 5, 5.5]), mk('Sub', 117, [5, 5, 5])], 360, 1.15)).toEqual([]);
  });
  it('exempts a sub whose minutes come from Copilot\'s forecast (e.g. the new first-choice keeper)', () => {
    const sub = { ...mk('Sub', 117, [8, 8, 7]), copilotMinutes: true };
    expect(findShortCameoInflation([mk('Starter', 400, [0, 5, 5.5]), sub], 360, 1.15)).toEqual([]);
  });
  it('skips groups with no reliable-sample teammate and players with a reliable sample', () => {
    expect(findShortCameoInflation([mk('A', 100, [9]), mk('B', 120, [1])], 360, 1.15)).toEqual([]);
  });
});

describe('Short-cameo consistency (live API)', () => {
  let violations: ReturnType<typeof findShortCameoInflation> = [];
  let checked = 0;

  beforeAll(async () => {
    const [bootstrap, projections] = await Promise.all([
      fetchJSON('/api/bootstrap-static'),
      fetchJSON('/api/cached/player-total-points'),
    ]);
    const minutesByName = new Map<string, number>();
    for (const el of bootstrap.elements) {
      minutesByName.set(`${el.first_name} ${el.second_name}`, el.minutes || 0);
    }
    const rows: ConsistencyRow[] = projections
      .map((p: any) => ({
        name: p.playerName,
        team: p.team,
        position: p.position,
        minutes: minutesByName.get(p.fullName || p.playerName) ?? minutesByName.get(p.playerName) ?? -1,
        gwPoints: Object.values(p.gameweekProjections || {}).map(Number),
        copilotMinutes: Object.keys(p.xMinsPerGW || {}).length > 0,
      }))
      .filter((r: ConsistencyRow) => r.minutes >= 0);
    checked = rows.length;
    violations = findShortCameoInflation(rows, MIN_RELIABLE_MINUTES, TOLERANCE);
  });

  it('matched a meaningful number of players to their season minutes', () => {
    expect(checked).toBeGreaterThan(300);
  });

  it(`no player under ${MIN_RELIABLE_MINUTES} minutes projects above the best same-position teammate`, () => {
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
