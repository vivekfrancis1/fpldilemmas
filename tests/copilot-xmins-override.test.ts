import { describe, it, expect } from "vitest";
import { getEffectiveBaseXMins } from "../server/copilot-xmins-override";

describe("getEffectiveBaseXMins", () => {
  it("falls back to the historical estimate when the player has no Copilot data at all", () => {
    expect(getEffectiveBaseXMins(5, undefined, 45)).toBe(45);
  });

  it("falls back to the historical estimate for a gameweek outside Copilot's covered range", () => {
    const copilotByGW = new Map([[3, 88], [4, 88]]);
    expect(getEffectiveBaseXMins(9, copilotByGW, 45)).toBe(45);
  });

  it("uses Copilot's value for a gameweek it covers, overriding the historical estimate", () => {
    const copilotByGW = new Map([[3, 88], [4, 60]]);
    expect(getEffectiveBaseXMins(4, copilotByGW, 45)).toBe(60);
  });

  it("uses a genuine 0 from Copilot rather than falling back (not a falsy-value bug)", () => {
    const copilotByGW = new Map([[3, 0]]);
    expect(getEffectiveBaseXMins(3, copilotByGW, 45)).toBe(0);
  });
});

import { copilotPerFixtureXMins } from "../server/copilot-xmins-override";

describe("copilotPerFixtureXMins (double and blank gameweeks)", () => {
  it("single fixture: passes the value through, capped at 90", () => {
    expect(copilotPerFixtureXMins(88, 1)).toBe(88);
    expect(copilotPerFixtureXMins(95, 1)).toBe(90);
  });
  it("blank gameweek (no fixtures): 0", () => {
    expect(copilotPerFixtureXMins(88, 0)).toBe(0);
  });
  it("double gameweek: a figure above 90 can only be a total over both fixtures, so it is split", () => {
    expect(copilotPerFixtureXMins(170, 2)).toBe(85);
    expect(copilotPerFixtureXMins(180, 2)).toBe(90);
    expect(copilotPerFixtureXMins(130, 2)).toBe(65);
  });
  it("double gameweek: a figure of 90 or less is read as the per-fixture expectation", () => {
    expect(copilotPerFixtureXMins(88, 2)).toBe(88);
    expect(copilotPerFixtureXMins(45, 2)).toBe(45);
  });
  it("triple gameweek splits totals by three", () => {
    expect(copilotPerFixtureXMins(240, 3)).toBe(80);
  });
});
