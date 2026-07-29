import { describe, it, expect } from 'vitest';
import { computeCbitPoints } from '../server/fpl-scoring-cache-service';

// computeCbitPoints backs /api/player-cbit-points' actual (historical) CBIT points display.
// It previously used a flat SQL threshold (defensive_contribution >= 10 -> 2pts) for every
// position, unlike the position-aware projection logic elsewhere in routes.ts (10 for
// defenders, 12 for midfielders/forwards, goalkeepers never eligible). This is a regression
// guard for the fix.
describe('computeCbitPoints (position-aware CBIT point threshold)', () => {
  it('goalkeepers never score CBIT points, regardless of defensive_contribution', () => {
    expect(computeCbitPoints(0, 'GKP')).toBe(0);
    expect(computeCbitPoints(10, 'GKP')).toBe(0);
    expect(computeCbitPoints(50, 'GKP')).toBe(0);
  });

  it('defenders need >=10 defensive_contribution for 2 points', () => {
    expect(computeCbitPoints(9, 'DEF')).toBe(0);
    expect(computeCbitPoints(10, 'DEF')).toBe(2);
    expect(computeCbitPoints(15, 'DEF')).toBe(2);
  });

  it('midfielders need >=12 defensive_contribution for 2 points — 10-11 is NOT enough', () => {
    expect(computeCbitPoints(9, 'MID')).toBe(0);
    expect(computeCbitPoints(10, 'MID')).toBe(0);
    expect(computeCbitPoints(11, 'MID')).toBe(0);
    expect(computeCbitPoints(12, 'MID')).toBe(2);
  });

  it('forwards need >=12 defensive_contribution for 2 points — 10-11 is NOT enough', () => {
    expect(computeCbitPoints(11, 'FWD')).toBe(0);
    expect(computeCbitPoints(12, 'FWD')).toBe(2);
  });
});
