import { describe, it, expect } from "vitest";
import { calculateFreeTransfers } from "../client/src/lib/free-transfers";

describe("calculateFreeTransfers", () => {
  it("gives 1 FT for GW2 when GW1 had no transfers (GW1 has no FT mechanic)", () => {
    const history = [{ event: 1, event_transfers: 0, event_transfers_cost: 0 }];
    expect(calculateFreeTransfers(history, [], 2)).toBe(1);
  });

  it("gives 2 FTs for GW3 when no transfers were made in GW1 or GW2", () => {
    const history = [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 },
    ];
    expect(calculateFreeTransfers(history, [], 3)).toBe(2);
  });

  it("gives 3 FTs for GW4 when no transfers were made in GW1-3", () => {
    const history = [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 },
      { event: 3, event_transfers: 0, event_transfers_cost: 0 },
    ];
    expect(calculateFreeTransfers(history, [], 4)).toBe(3);
  });

  it("resets to 1 FT for GW3 when the single FT was used in GW2", () => {
    const history = [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 1, event_transfers_cost: 0 },
    ];
    expect(calculateFreeTransfers(history, [], 3)).toBe(1);
  });

  it("caps accumulated free transfers at 5", () => {
    const history = Array.from({ length: 7 }, (_, i) => ({
      event: i + 1,
      event_transfers: 0,
      event_transfers_cost: 0,
    }));
    expect(calculateFreeTransfers(history, [], 8)).toBe(5);
  });

  it("preserves banked free transfers through a wildcard gameweek", () => {
    const history = [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 },
      { event: 3, event_transfers: 11, event_transfers_cost: 0 },
    ];
    const chips = [{ event: 3, name: "wildcard" }];
    // GW1 -> no mechanic; GW2 unused -> 2 banked for GW3; GW3 is a wildcard so its 11
    // transfers don't consume/reset the bank -> still 2 for GW4 (unchanged, not reset to 1).
    expect(calculateFreeTransfers(history, chips, 4)).toBe(2);
  });

  it("returns 1 when there is no history", () => {
    expect(calculateFreeTransfers(undefined, undefined, 2)).toBe(1);
    expect(calculateFreeTransfers([], [], 2)).toBe(1);
  });
});
