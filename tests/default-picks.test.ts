import { describe, it, expect } from "vitest";
import {
  DEFAULT_COMPARISON_SIZE,
  DEFAULT_FIXTURE_COMPARISON_SIZE,
  isPickable,
  mostNewsworthy,
  nextFixtureClub,
  squadFromPicks,
  topByProjection,
  trendingIn,
  type PickElement,
} from "../shared/default-picks";

const e = (id: number, over: Partial<PickElement> = {}): PickElement => ({ id, element_type: 3, team: 1, status: "a", transfers_in_event: 0, selected_by_percent: "5.0", news: "", ...over });

describe("isPickable", () => {
  it("excludes injured, suspended, unavailable and not-in-squad players; keeps available and doubtful", () => {
    for (const s of ["i", "s", "u", "n"]) expect(isPickable(e(1, { status: s })), s).toBe(false);
    for (const s of ["a", "d"]) expect(isPickable(e(1, { status: s })), s).toBe(true);
  });
});

describe("trendingIn (the most transferred in this gameweek)", () => {
  it("orders by transfers in, highest first, and takes the first n", () => {
    const els = [e(1, { transfers_in_event: 100 }), e(2, { transfers_in_event: 500 }), e(3, { transfers_in_event: 300 }), e(4, { transfers_in_event: 50 })];
    expect(trendingIn(els, 3)).toEqual([2, 3, 1]);
  });

  it("transfers come as numbers or strings; ties go to the more-owned player, then the lower id", () => {
    const els = [
      e(5, { transfers_in_event: "200", selected_by_percent: "10.0" }),
      e(3, { transfers_in_event: 200, selected_by_percent: "30.0" }),
      e(4, { transfers_in_event: 200, selected_by_percent: "30.0" }),
    ];
    expect(trendingIn(els, 3)).toEqual([3, 4, 5]);
  });

  it("skips players who cannot play and players nobody bought", () => {
    const els = [e(1, { transfers_in_event: 900, status: "i" }), e(2, { transfers_in_event: 0 }), e(3, { transfers_in_event: 10 })];
    expect(trendingIn(els, 3)).toEqual([3]);
  });

  it("can be limited to a position", () => {
    const els = [e(1, { transfers_in_event: 900, element_type: 4 }), e(2, { transfers_in_event: 100, element_type: 2 })];
    expect(trendingIn(els, 3, { elementType: 2 })).toEqual([2]);
  });

  it("the comparison default is three players", () => {
    expect(DEFAULT_COMPARISON_SIZE).toBe(3);
    expect(DEFAULT_FIXTURE_COMPARISON_SIZE).toBe(4);
  });
});

describe("topByProjection", () => {
  const totals = new Map<number, number | null>([[1, 10], [2, 30], [3, 20], [4, null], [5, 30]]);
  const els = [1, 2, 3, 4, 5].map((id) => e(id));

  it("highest projection first (ties by lower id), ignoring players with no projection", () => {
    expect(topByProjection(els, totals, 4)).toEqual([2, 5, 3, 1]);
  });

  it("skips players who cannot play", () => {
    expect(topByProjection([e(1, { status: "i" }), e(2)], totals, 2)).toEqual([2]);
  });
});

describe("nextFixtureClub", () => {
  const fixtures = [
    { event: 8, team_h: 5, team_a: 6, finished: true, kickoff_time: "2026-10-23T14:00:00Z" },
    { event: 8, team_h: 3, team_a: 4, finished: false, kickoff_time: "2026-10-24T16:30:00Z" },
    { event: 8, team_h: 1, team_a: 2, finished: false, kickoff_time: "2026-10-24T12:30:00Z" },
    { event: 9, team_h: 7, team_a: 8, finished: false, kickoff_time: "2026-10-31T12:30:00Z" },
  ];

  it("the home team of the earliest unfinished match of the gameweek", () => {
    expect(nextFixtureClub(fixtures, 8)).toBe(1);
  });

  it("falls back to the next gameweek that has a match left, and null when none", () => {
    expect(nextFixtureClub(fixtures.map((f) => (f.event === 8 ? { ...f, finished: true } : f)), 8)).toBe(7);
    expect(nextFixtureClub(fixtures, 20)).toBeNull();
    expect(nextFixtureClub([], 8)).toBeNull();
    expect(nextFixtureClub([{ event: 8, team_h: 1, team_a: 2, finished: true }], 8)).toBeNull();
  });
});

describe("mostNewsworthy", () => {
  it("the most-owned player with news and a flagged status", () => {
    const els = [
      e(1, { selected_by_percent: "50.0", status: "a", news: "" }),
      e(2, { selected_by_percent: "20.0", status: "d", news: "Knock" }),
      e(3, { selected_by_percent: "40.0", status: "i", news: "Hamstring" }),
    ];
    expect(mostNewsworthy(els)).toBe(3);
  });

  it("null when nobody has news", () => {
    expect(mostNewsworthy([e(1), e(2)])).toBeNull();
  });
});

describe("squadFromPicks", () => {
  it("player ids in squad order (starters then bench)", () => {
    const picks = [
      { element: 30, position: 3 },
      { element: 10, position: 1 },
      { element: 20, position: 2 },
    ];
    expect(squadFromPicks(picks)).toEqual([10, 20, 30]);
  });

  it("empty or missing picks give an empty squad", () => {
    expect(squadFromPicks(undefined)).toEqual([]);
    expect(squadFromPicks([])).toEqual([]);
  });
});
