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

  it("gives a simultaneously-unavailable teammate zero share of the reallocation (they can't absorb minutes either)", () => {
    const group: GroupMember[] = [
      { playerId: 1, baseXMins: 80, availability: 0 },
      { playerId: 2, baseXMins: 20, availability: 0 },
      { playerId: 3, baseXMins: 10, availability: 1 },
    ];
    const result = reallocateGroupXmins(group);
    // Players 1 and 2 are both unavailable this gameweek, so neither can absorb the other's
    // freed minutes — only player 3 (the sole available teammate) receives anything.
    expect(result.get(1)).toBe(0);
    expect(result.get(2)).toBe(0);
    expect(result.get(3)).toBe(90); // 10 kept + 80 + 20 freed, capped at 90
  });

  it("weights recipients by kept minutes (base x availability), not raw base xMins", () => {
    // Player 2 has a much higher base rate (40) than player 3 (10), but is only 20% available
    // itself (kept = 8, below player 3's kept = 10) — of player 1's freed minutes, player 3
    // should receive MORE than player 2 despite its lower base rate, because weighting is by
    // kept minutes, not raw base. (Player 2 is also partially unavailable, so it separately
    // frees its own 32 minutes, which — since player 1 has zero weight (0% available) — go
    // entirely to player 3, the only fully-available recipient.)
    const group: GroupMember[] = [
      { playerId: 1, baseXMins: 20, availability: 0 },
      { playerId: 2, baseXMins: 40, availability: 0.2 },
      { playerId: 3, baseXMins: 10, availability: 1 },
    ];
    const result = reallocateGroupXmins(group);
    const kept2 = 40 * 0.2; // 8
    const kept3 = 10 * 1; // 10
    const freed1 = 20;
    const freed2 = 40 * 0.8; // 32
    const fromP1toP2 = freed1 * (kept2 / (kept2 + kept3));
    const fromP1toP3 = freed1 * (kept3 / (kept2 + kept3));
    expect(result.get(2)).toBeCloseTo(kept2 + fromP1toP2); // player 2 gets LESS than player 3...
    expect(result.get(3)).toBeCloseTo(kept3 + fromP1toP3 + freed2); // ...despite its 4x higher base rate
    expect(result.get(3)!).toBeGreaterThan(result.get(2)!);
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
