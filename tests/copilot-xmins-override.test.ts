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
