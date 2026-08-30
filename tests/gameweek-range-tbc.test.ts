import { describe, it, expect } from "vitest";
import { computeProjectionRangeWithTBC, type GameweekEvent } from "../shared/gameweek-utils";

// Minimal fixture shape — only `event` matters for TBC detection.
type Fixture = { event: number | null };

function makeEvents(currentId: number, maxId: number): GameweekEvent[] {
  return Array.from({ length: maxId }, (_, i) => {
    const id = i + 1;
    return {
      id,
      is_current: id === currentId,
      is_next: id === currentId + 1,
      finished: id < currentId,
      deadline_time: new Date(2026, 7, id).toISOString(),
    } as GameweekEvent;
  });
}

describe("computeProjectionRangeWithTBC", () => {
  it("never extends to GW39 when there are no TBC fixtures", () => {
    const events = makeEvents(2, 38);
    const fixtures: Fixture[] = [{ event: 3 }, { event: 4 }, { event: 38 }];
    const range = computeProjectionRangeWithTBC(events, fixtures, 6);
    expect(range.end).toBeLessThanOrEqual(38);
    expect(range.end).not.toBe(39);
  });

  it("extends to GW39 when a fixture has event: null (postponed, not yet reassigned)", () => {
    const events = makeEvents(2, 38);
    const fixtures: Fixture[] = [{ event: 3 }, { event: 4 }, { event: null }];
    const range = computeProjectionRangeWithTBC(events, fixtures, 6);
    expect(range.end).toBe(39);
  });

  it("extends to GW39 when a fixture has event: undefined", () => {
    const events = makeEvents(2, 38);
    const fixtures: Fixture[] = [{ event: 3 }, { event: undefined as any }];
    const range = computeProjectionRangeWithTBC(events, fixtures, 6);
    expect(range.end).toBe(39);
  });

  it("still computes the normal start/end otherwise, matching computeNextRange", () => {
    const events = makeEvents(2, 38);
    const fixtures: Fixture[] = [{ event: 3 }];
    const range = computeProjectionRangeWithTBC(events, fixtures, 6);
    expect(range.start).toBe(3);
    expect(range.end).toBe(8);
  });
});
