import { describe, it, expect } from "vitest";
import { reallocateGroupXmins, type GroupMember } from "../server/xmins-reallocation";

describe("reallocateGroupXmins", () => {
  it("zeroes out a 0%-available player and reallocates all their xMins to teammates in ratio of base xMins", () => {
    const group: GroupMember[] = [
      { playerId: 1, baseXMins: 80, availability: 0 },
      { playerId: 2, baseXMins: 60, availability: 1 },
      { playerId: 3, baseXMins: 40, availability: 1 },
    ];
    const result = reallocateGroupXmins(group);
    expect(result.get(1)).toBe(0);
    // freed = 80, split 60:40 between players 2 and 3 -> +48 and +32
    expect(result.get(2)).toBe(90); // 60 + 48 = 108, capped at 90
    expect(result.get(3)).toBeCloseTo(72); // 40 + 32
  });

  it("keeps 75% of a partially-available player's xMins and reallocates the remaining 25%", () => {
    const group: GroupMember[] = [
      { playerId: 1, baseXMins: 60, availability: 0.75 },
      { playerId: 2, baseXMins: 30, availability: 1 },
      { playerId: 3, baseXMins: 10, availability: 1 },
    ];
    const result = reallocateGroupXmins(group);
    // kept: 60 * 0.75 = 45; freed = 15, split 30:10 (0.75/0.25) between players 2 and 3
    expect(result.get(1)).toBeCloseTo(45);
    expect(result.get(2)).toBeCloseTo(30 + 15 * 0.75); // 41.25
    expect(result.get(3)).toBeCloseTo(10 + 15 * 0.25); // 12.5
  });

  it("leaves a fully-available group unchanged", () => {
    const group: GroupMember[] = [
      { playerId: 1, baseXMins: 90, availability: 1 },
      { playerId: 2, baseXMins: 20, availability: 1 },
    ];
    const result = reallocateGroupXmins(group);
    expect(result.get(1)).toBe(90);
    expect(result.get(2)).toBe(20);
  });

  it("loses the freed minutes when there's nobody else in the group to reallocate to", () => {
    const group: GroupMember[] = [{ playerId: 1, baseXMins: 90, availability: 0 }];
    const result = reallocateGroupXmins(group);
    expect(result.get(1)).toBe(0);
  });

  it("handles multiple simultaneously-unavailable players independently (weights use base xMins, not adjusted)", () => {
    const group: GroupMember[] = [
      { playerId: 1, baseXMins: 80, availability: 0 },
      { playerId: 2, baseXMins: 20, availability: 0 },
      { playerId: 3, baseXMins: 10, availability: 1 },
    ];
    const result = reallocateGroupXmins(group);
    // freed from 1 = 80, split among 2,3 in ratio 20:10 -> +53.33 to 2, +26.67 to 3
    // freed from 2 = 20, split among 1,3 in ratio 80:10 -> +17.78 to 1, +2.22 to 3
    expect(result.get(1)).toBeCloseTo(0 + 20 * (80 / 90)); // 17.78
    expect(result.get(2)).toBeCloseTo(0 + 80 * (20 / 30)); // 53.33
    expect(result.get(3)).toBeCloseTo(10 + 80 * (10 / 30) + 20 * (10 / 90)); // ~38.9
  });

  it("caps every player's reallocated total at 90 minutes", () => {
    const group: GroupMember[] = [
      { playerId: 1, baseXMins: 85, availability: 0 },
      { playerId: 2, baseXMins: 85, availability: 1 },
    ];
    const result = reallocateGroupXmins(group);
    expect(result.get(2)).toBe(90);
  });
});
