import { describe, it, expect } from "vitest";
import { arrangeInFormation, assignToFormation, rankForSlot, replaceSlot, type EditPlayer } from "../shared/lineup-edit";

const p = (id: number, fpl: EditPlayer["fplPosition"], codes: string[] | null, minutes = 90): EditPlayer => ({ id, fplPosition: fpl, codes, minutes });

const squad: EditPlayer[] = [
  p(1, "GKP", ["GK"]),
  p(2, "DEF", ["LB", "CB"]), p(3, "DEF", ["CB"]), p(4, "DEF", ["CB"]), p(5, "DEF", ["RB"]),
  p(6, "MID", ["CDM", "CM"]), p(7, "MID", ["CDM"]), p(8, "MID", ["CAM"]), p(9, "MID", ["LW"]), p(10, "MID", ["RW"]),
  p(11, "FWD", ["ST"]), p(12, "FWD", ["ST"], 60),
  p(13, "GKP", ["GK"], 0), p(14, "DEF", ["CB"], 0), p(15, "MID", ["CM"], 40),
];

describe("assignToFormation: the likeliest players, put in the slot that suits them", () => {
  it("fills a 4-2-3-1 with the natural players", () => {
    const xi = assignToFormation("4-2-3-1", squad);
    expect(xi).toEqual([1, 2, 3, 4, 5, 6, 7, 9, 8, 10, 11]);
  });
  it("changing the formation moves people to where they fit: a 4-3-3 puts the wingers wide, and the second striker out", () => {
    const xi = assignToFormation("4-3-3", squad);
    expect(xi).toHaveLength(11);
    expect(xi.slice(8)).toEqual([9, 11, 10]); // LW, ST, RW
    expect(new Set(xi).size).toBe(11);
  });
  it("two strikers for a 4-4-2", () => {
    const xi = assignToFormation("4-4-2", squad);
    expect(xi.slice(-2).sort()).toEqual([11, 12]);
  });
  it("never puts a goalkeeper in the field or an outfielder in goal", () => {
    for (const f of ["4-2-3-1", "3-5-2", "5-4-1"]) {
      const xi = assignToFormation(f, squad);
      expect(xi[0]).toBe(1);
      expect([1, 13]).not.toContain(xi[1]);
    }
  });
  it("uses players with no expected minutes only when there is nobody else", () => {
    const thin = squad.filter((s) => s.id !== 12 && s.id !== 15 && s.id !== 14);
    const xi = assignToFormation("4-4-2", thin);
    expect(xi).toHaveLength(11);
    expect(xi.every((id) => id !== null)).toBe(true);
  });
  it("is deterministic", () => {
    expect(assignToFormation("3-4-3", squad)).toEqual(assignToFormation("3-4-3", [...squad].reverse()));
  });
  it("leaves a slot empty (null) rather than invent a player", () => {
    const xi = assignToFormation("4-4-2", squad.slice(0, 5));
    expect(xi.filter((id) => id === null).length).toBeGreaterThan(0);
  });
});

describe("arrangeInFormation: keep the chosen eleven, move them to their best slots", () => {
  it("rearranges the same eleven for a new formation", () => {
    const eleven = [1, 2, 3, 4, 5, 6, 7, 9, 8, 10, 11];
    const xi = arrangeInFormation("4-3-3", eleven, squad);
    expect([...xi].sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([...eleven].sort((a, b) => a - b));
    expect(xi[0]).toBe(1);
    expect(xi.slice(8)).toEqual([9, 11, 10]);
  });
  it("ignores ids that are not in the squad", () => {
    const xi = arrangeInFormation("4-3-3", [1, 2, 3, 99], squad);
    expect(xi.filter((id) => id !== null)).toEqual(expect.arrayContaining([1, 2, 3]));
    expect(xi).not.toContain(99);
  });
});

describe("replaceSlot: switching a player", () => {
  const xi: Array<number | null> = [1, 2, 3, 4, 5, 6, 7, 9, 8, 10, 11];
  it("a player from outside the XI takes the slot", () => {
    const next = replaceSlot(xi, 10, 12);
    expect(next[10]).toBe(12);
    expect(next).not.toContain(11);
    expect(next).toHaveLength(11);
  });
  it("choosing someone already in the XI swaps the two", () => {
    const next = replaceSlot(xi, 1, 5);
    expect(next[1]).toBe(5);
    expect(next[4]).toBe(2);
  });
  it("choosing the player already there changes nothing; the original is never mutated", () => {
    expect(replaceSlot(xi, 3, 4)).toEqual(xi);
    replaceSlot(xi, 3, 12);
    expect(xi[3]).toBe(4);
  });
  it("an empty slot can be filled", () => {
    const withGap: Array<number | null> = [1, 2, 3, null, 5, 6, 7, 9, 8, 10, 11];
    expect(replaceSlot(withGap, 3, 4)[3]).toBe(4);
  });
});

describe("rankForSlot: who to offer for a slot, best fit first", () => {
  it("natural players first, then others he plays, then the same part of the pitch, ties by minutes then id", () => {
    const ids = rankForSlot("CB", squad).map((x) => x.id);
    expect(ids.slice(0, 4)).toEqual([3, 4, 14, 2]); // CB mains by minutes (90, 90, 0), then the left-back who also plays CB
  });
  it("only goalkeepers for the goalkeeper slot, and no goalkeepers outfield", () => {
    expect(rankForSlot("GK", squad).map((x) => x.id)).toEqual([1, 13]);
    expect(rankForSlot("ST", squad).map((x) => x.id)).not.toContain(1);
    expect(rankForSlot("ST", squad).map((x) => x.id)).not.toContain(13);
  });
  it("offers everyone eligible, so any player can be switched in", () => {
    expect(rankForSlot("RW", squad)).toHaveLength(squad.length - 2);
  });
  it("a right winger comes before a striker for the right wing", () => {
    const ids = rankForSlot("RW", squad).map((x) => x.id);
    expect(ids[0]).toBe(10);
    expect(ids.indexOf(9)).toBeLessThan(ids.indexOf(5)); // another attacker/midfielder ahead of a right-back
  });
});
