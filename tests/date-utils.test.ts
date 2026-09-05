import { describe, it, expect } from "vitest";
import { getLondonDateString } from "../shared/date-utils";

describe("getLondonDateString", () => {
  it("returns the UK calendar date, not the UTC one, just after UK midnight during BST", () => {
    // 23:30 UTC on Sep 4 is 00:30 BST on Sep 5 — this is exactly the case that broke price-change
    // attribution: a change FPL/users consider to be "Sep 5" landing on the UTC date "Sep 4".
    const justAfterUkMidnightBST = new Date("2026-09-04T23:30:00Z");
    expect(getLondonDateString(justAfterUkMidnightBST)).toBe("2026-09-05");
  });

  it("returns the same date as UTC when well clear of the UK midnight boundary", () => {
    const midday = new Date("2026-09-05T12:00:00Z");
    expect(getLondonDateString(midday)).toBe("2026-09-05");
  });

  it("returns the UK calendar date correctly outside BST (GMT, UTC+0)", () => {
    const januaryNoon = new Date("2026-01-15T12:00:00Z");
    expect(getLondonDateString(januaryNoon)).toBe("2026-01-15");
  });

  it("handles the GMT midnight boundary too (no offset, so UTC and UK date agree)", () => {
    const justBeforeUtcMidnightInWinter = new Date("2026-01-15T23:30:00Z");
    expect(getLondonDateString(justBeforeUtcMidnightInWinter)).toBe("2026-01-15");
  });
});
