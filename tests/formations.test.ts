import { describe, it, expect } from "vitest";
import { FORMATIONS, formationSlots, isFormation, slotFit } from "../shared/formations";

const roles = (f: string) => formationSlots(f).map((s) => s.role);
const lineSizes = (f: string) => {
  const slots = formationSlots(f);
  const lines = Math.max(...slots.map((s) => s.line));
  return Array.from({ length: lines + 1 }, (_, l) => slots.filter((s) => s.line === l).length);
};

describe("FORMATIONS", () => {
  it("includes the formations FotMob shows for Premier League matches this season", () => {
    for (const f of ["4-2-3-1", "3-4-2-1", "3-4-3", "5-4-1", "4-1-4-1", "3-5-2", "4-3-3", "4-1-2-3"]) expect(FORMATIONS).toContain(f);
  });
  it("has each formation once, and every one is ten outfield players in 3 to 5 lines behind a goalkeeper", () => {
    expect(new Set(FORMATIONS).size).toBe(FORMATIONS.length);
    for (const f of FORMATIONS) {
      const parts = f.split("-").map(Number);
      expect(parts.reduce((a, b) => a + b, 0), f).toBe(10);
      expect(parts.length, f).toBeGreaterThanOrEqual(3);
      expect(parts.length, f).toBeLessThanOrEqual(5);
      expect(parts[0], f).toBeGreaterThanOrEqual(3);
      expect(parts[0], f).toBeLessThanOrEqual(5);
    }
  });
  it("isFormation accepts only the listed ones", () => {
    expect(isFormation("4-3-3")).toBe(true);
    expect(isFormation("9-1-0")).toBe(false);
    expect(isFormation("")).toBe(false);
  });
});

describe("formationSlots: eleven slots, goalkeeper first, left to right by line", () => {
  it("every formation has a goalkeeper and ten outfield slots in the right lines", () => {
    for (const f of FORMATIONS) {
      const slots = formationSlots(f);
      expect(slots, f).toHaveLength(11);
      expect(slots[0], f).toMatchObject({ line: 0, role: "GK" });
      expect(lineSizes(f), f).toEqual([1, ...f.split("-").map(Number)]);
    }
  });
  it("4-2-3-1", () => {
    expect(roles("4-2-3-1")).toEqual(["GK", "LB", "CB", "CB", "RB", "CDM", "CDM", "LW", "CAM", "RW", "ST"]);
  });
  it("4-3-3 and 4-4-2", () => {
    expect(roles("4-3-3")).toEqual(["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "LW", "ST", "RW"]);
    expect(roles("4-4-2")).toEqual(["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"]);
  });
  it("a back three with a four or five in midfield has wing-backs on the ends of that line", () => {
    expect(roles("3-4-3")).toEqual(["GK", "CB", "CB", "CB", "LWB", "CM", "CM", "RWB", "LW", "ST", "RW"]);
    expect(roles("3-5-2")).toEqual(["GK", "CB", "CB", "CB", "LWB", "CM", "CM", "CM", "RWB", "ST", "ST"]);
    expect(roles("3-4-2-1")).toEqual(["GK", "CB", "CB", "CB", "LWB", "CM", "CM", "RWB", "CAM", "CAM", "ST"]);
  });
  it("a back five has wing-backs in the back line", () => {
    expect(roles("5-4-1")).toEqual(["GK", "LWB", "CB", "CB", "CB", "RWB", "LM", "CM", "CM", "RM", "ST"]);
    expect(roles("5-3-2").slice(0, 6)).toEqual(["GK", "LWB", "CB", "CB", "CB", "RWB"]);
  });
  it("holding midfielders sit behind attacking ones", () => {
    expect(roles("4-1-4-1").slice(5, 6)).toEqual(["CDM"]);
    expect(roles("4-4-1-1").slice(-2)).toEqual(["CAM", "ST"]);
    expect(roles("4-1-2-1-2").slice(5)).toEqual(["CDM", "CM", "CM", "CAM", "ST", "ST"]);
  });
  it("slots carry their line and index within the line", () => {
    const s = formationSlots("4-3-3");
    expect(s[5]).toMatchObject({ line: 2, index: 0 });
    expect(s[7]).toMatchObject({ line: 2, index: 2 });
  });
});

describe("slotFit: how well a player suits a slot", () => {
  it("3 for his main position, 2 for another position he plays, 1 for the same part of the pitch, 0 otherwise", () => {
    expect(slotFit("RB", ["RB", "CB"], "DEF")).toBe(3);
    expect(slotFit("CB", ["RB", "CB"], "DEF")).toBe(2);
    expect(slotFit("LB", ["RB", "CB"], "DEF")).toBe(1);
    expect(slotFit("ST", ["RB", "CB"], "DEF")).toBe(0);
  });
  it("wide midfield and winger are neighbours on the same side", () => {
    expect(slotFit("LM", ["LW"], "MID")).toBe(1);
    expect(slotFit("RM", ["LW"], "MID")).toBe(0);
  });
  it("a player with no detailed position fits by his FPL position", () => {
    expect(slotFit("CB", null, "DEF")).toBe(1);
    expect(slotFit("CM", null, "MID")).toBe(1);
    expect(slotFit("ST", null, "FWD")).toBe(1);
    expect(slotFit("ST", null, "MID")).toBe(0);
  });
  it("goalkeepers only fit the goalkeeper slot, and nobody else does", () => {
    expect(slotFit("GK", ["GK"], "GKP")).toBe(3);
    expect(slotFit("GK", null, "GKP")).toBe(1);
    expect(slotFit("GK", ["CB"], "DEF")).toBe(-1);
    expect(slotFit("CB", ["GK"], "GKP")).toBe(-1);
  });
});
