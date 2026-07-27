import { describe, it, expect } from 'vitest';
import {
  lastSeasonGoalsPer90,
  lastSeasonXGPer90,
  lastSeasonAssistsPer90,
  lastSeasonXAPer90,
  MIN_MINUTES_FOR_RATE,
  type LastSeasonPlayerRow,
} from '../server/player-history-blend-service';

function makeRow(overrides: Partial<LastSeasonPlayerRow> = {}): LastSeasonPlayerRow {
  return {
    firstName: 'Test',
    secondName: 'Player',
    elementType: 4,
    minutes: 0,
    starts: 0,
    saves: 0,
    bonus: 0,
    defensiveContribution: 0,
    yellowCards: 0,
    redCards: 0,
    goalsScored: 0,
    assists: 0,
    expectedGoals: 0,
    expectedAssists: 0,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// These four functions are the goals/assists counterpart of the existing
// lastSeasonSavesPer90/lastSeasonDCPer90 helpers — same MIN_MINUTES_FOR_RATE
// small-sample guard, same per-90 extrapolation. They feed the goal-share-season
// / assist-share-season blend fix (see server/routes.ts).
// ─────────────────────────────────────────────────────────────────────────────
describe('lastSeasonGoalsPer90', () => {
  it('extrapolates goals to a per-90 rate once minutes clear the threshold', () => {
    const row = makeRow({ minutes: 2700, goalsScored: 15 }); // 30 full games, 0.5 goals/90
    expect(lastSeasonGoalsPer90(row)).toBeCloseTo(0.5, 5);
  });

  it('returns undefined below MIN_MINUTES_FOR_RATE (small-sample guard)', () => {
    const row = makeRow({ minutes: MIN_MINUTES_FOR_RATE - 1, goalsScored: 3 });
    expect(lastSeasonGoalsPer90(row)).toBeUndefined();
  });

  it('computes at exactly the threshold (inclusive)', () => {
    const row = makeRow({ minutes: MIN_MINUTES_FOR_RATE, goalsScored: 3 });
    expect(lastSeasonGoalsPer90(row)).toBeCloseTo((3 / MIN_MINUTES_FOR_RATE) * 90, 5);
  });

  it('returns 0 (not undefined) for a qualifying player who scored nothing', () => {
    const row = makeRow({ minutes: 2700, goalsScored: 0 });
    expect(lastSeasonGoalsPer90(row)).toBe(0);
  });
});

describe('lastSeasonXGPer90', () => {
  it('extrapolates expected goals to a per-90 rate', () => {
    const row = makeRow({ minutes: 1800, expectedGoals: 9 }); // 20 games, 0.45 xG/90
    expect(lastSeasonXGPer90(row)).toBeCloseTo(0.45, 5);
  });

  it('returns undefined below the minutes threshold', () => {
    const row = makeRow({ minutes: 100, expectedGoals: 2 });
    expect(lastSeasonXGPer90(row)).toBeUndefined();
  });
});

describe('lastSeasonAssistsPer90', () => {
  it('extrapolates assists to a per-90 rate', () => {
    const row = makeRow({ minutes: 3600, assists: 8 }); // 40 games, 0.2 assists/90
    expect(lastSeasonAssistsPer90(row)).toBeCloseTo(0.2, 5);
  });

  it('returns undefined below the minutes threshold', () => {
    const row = makeRow({ minutes: 50, assists: 5 });
    expect(lastSeasonAssistsPer90(row)).toBeUndefined();
  });
});

describe('lastSeasonXAPer90', () => {
  it('extrapolates expected assists to a per-90 rate', () => {
    const row = makeRow({ minutes: 900, expectedAssists: 3 }); // 10 games, 0.3 xA/90
    expect(lastSeasonXAPer90(row)).toBeCloseTo(0.3, 5);
  });

  it('returns undefined below the minutes threshold', () => {
    const row = makeRow({ minutes: 269, expectedAssists: 1 });
    expect(lastSeasonXAPer90(row)).toBeUndefined();
  });
});
