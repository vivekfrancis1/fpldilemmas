import { describe, it, expect } from "vitest";
import { cleanSheetMinutesFactor } from "../server/clean-sheet-minutes";

describe("cleanSheetMinutesFactor", () => {
  it("treats a fit player projected for 60+ minutes as a full clean sheet chance (Konsa case)", () => {
    // Copilot 88 xMins, fully available, historical pct60Plus only 60% from a short early cameo
    expect(cleanSheetMinutesFactor({ adjustedXMins: 88, availabilityRatio: 1, historicalPct60Plus: 60, availabilityProb: 1 })).toBe(1);
  });

  it("scales a player projected for under 60 minutes proportionally", () => {
    expect(cleanSheetMinutesFactor({ adjustedXMins: 45, availabilityRatio: 1, historicalPct60Plus: 100, availabilityProb: 1 })).toBeCloseTo(0.75, 6);
  });

  it("does not double-count availability: a 75%-available 88-minute starter gets 0.75, not 1", () => {
    // adjusted = 88 * 0.75 = 66, ratio = 0.75 -> base 88 -> 66 / 88
    expect(cleanSheetMinutesFactor({ adjustedXMins: 66, availabilityRatio: 0.75, historicalPct60Plus: 100, availabilityProb: 0.75 })).toBeCloseTo(0.75, 6);
  });

  it("gives a backup boosted to a starter's minutes (teammate out) full credit", () => {
    // base 20 -> ratio 4.5 -> adjusted 90
    expect(cleanSheetMinutesFactor({ adjustedXMins: 90, availabilityRatio: 4.5, historicalPct60Plus: 0, availabilityProb: 4.5 })).toBe(1);
  });

  it("gives 0 when the player is projected for 0 minutes", () => {
    expect(cleanSheetMinutesFactor({ adjustedXMins: 0, availabilityRatio: 0, historicalPct60Plus: 100, availabilityProb: 0 })).toBe(0);
  });

  it("falls back to the legacy availability x historical pct60Plus when no per-GW xMins exists", () => {
    expect(cleanSheetMinutesFactor({ adjustedXMins: undefined, availabilityRatio: undefined, historicalPct60Plus: 60, availabilityProb: 0.5 })).toBeCloseTo(0.3, 6);
  });
});
