import { describe, it, expect } from "vitest";
import { resolveActiveChip } from "../server/fpl-chip-utils";

describe("resolveActiveChip", () => {
  it("returns the flat active_chip field when present", () => {
    expect(resolveActiveChip({ active_chip: "wildcard" })).toBe("wildcard");
  });

  it("falls back to the chips array's active entry when the flat field is empty", () => {
    expect(resolveActiveChip({
      active_chip: null,
      chips: [
        { name: "bboost", status_for_entry: "played" },
        { name: "wildcard", status_for_entry: "active" },
      ],
    })).toBe("wildcard");
  });

  it("returns null when nothing is active", () => {
    expect(resolveActiveChip({ active_chip: null, chips: [{ name: "bboost", status_for_entry: "played" }] })).toBeNull();
  });

  it("returns null when there's no chips array at all", () => {
    expect(resolveActiveChip({})).toBeNull();
  });
});
