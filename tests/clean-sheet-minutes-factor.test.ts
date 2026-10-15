import { describe, it, expect } from "vitest";
import { cleanSheetMinutesFactor } from "../server/clean-sheet-minutes";
import { pAtLeast60 } from "../shared/minutes-model";

describe("cleanSheetMinutesFactor", () => {
  it("uses the calibrated 60+ chance for the gameweek's expected minutes (Konsa: 88 xMins, ignores his 60% early-season history)", () => {
    const f = cleanSheetMinutesFactor({ adjustedXMins: 88, historicalPct60Plus: 60, availabilityProb: 1 });
    expect(f).toBeCloseTo(pAtLeast60(88), 9);
    expect(f).toBeGreaterThan(0.9);
  });

  it("a rotation player (59 xMins) is NOT treated as a certain 60+ player", () => {
    const f = cleanSheetMinutesFactor({ adjustedXMins: 59, historicalPct60Plus: 100, availabilityProb: 1 });
    expect(f).toBeLessThan(0.75);
    expect(f).toBeGreaterThan(0.5);
  });

  it("does not multiply availability in again (adjusted xMins already include it)", () => {
    const withAvail = cleanSheetMinutesFactor({ adjustedXMins: 66, historicalPct60Plus: 100, availabilityProb: 0.75 });
    const without = cleanSheetMinutesFactor({ adjustedXMins: 66, historicalPct60Plus: 100, availabilityProb: 1 });
    expect(withAvail).toBe(without);
  });

  it("gives 0 for a player expected to play 0 minutes", () => {
    expect(cleanSheetMinutesFactor({ adjustedXMins: 0, historicalPct60Plus: 100, availabilityProb: 1 })).toBe(0);
  });

  it("falls back to the legacy availability x historical pct60Plus when no covered xMins exist", () => {
    expect(cleanSheetMinutesFactor({ adjustedXMins: undefined, historicalPct60Plus: 60, availabilityProb: 0.5 })).toBeCloseTo(0.3, 6);
  });
});
