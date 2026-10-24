import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPEC,
  GRAPHIC_TEMPLATES,
  buildCaption,
  decodeSpec,
  encodeSpec,
  isEmptyGraphic,
  usesProjections,
  MAX_GW_POINTS_PLAYERS,
  type GraphicElement,
  type GraphicSpec,
} from "../shared/graphics";
import { buildGwPoints, type LiveScorerInput } from "../shared/graphics-players";
import { computeGraphicData, graphicDataRequests, makeGraphicDataContext, resolveStartedGw } from "../client/src/lib/graphic-data";

const teamShortById = new Map<number, string>([[1, "CHE"], [2, "MCI"]]);
const el = (id: number, name: string, team: number, type: number): GraphicElement => ({
  id, web_name: name, team, element_type: type, now_cost: 70, selected_by_percent: "10.0",
});
const elements: GraphicElement[] = [el(1, "Palmer", 1, 3), el(2, "Rogers", 2, 3), el(3, "João Pedro", 1, 4), el(4, "Haaland", 2, 4), el(5, "Raya", 1, 1)];

const live = (id: number, total_points: number, minutes = 90, explain: LiveScorerInput["explain"] = []): LiveScorerInput => ({
  id, stats: { total_points, minutes, goals_scored: 0, assists: 0, bonus: 0 }, explain,
});
const liveRows: LiveScorerInput[] = [
  live(1, -2, 70, [{ fixture: 5, stats: [{ identifier: "minutes", points: 2, value: 70 }, { identifier: "red_cards", points: -3, value: 1 }, { identifier: "yellow_cards", points: -1, value: 1 }] }]),
  live(2, 1, 90, [{ fixture: 5, stats: [{ identifier: "minutes", points: 2, value: 90 }, { identifier: "yellow_cards", points: -1, value: 1 }] }]),
  live(3, 0, 0),
  live(4, 13, 90, [{ fixture: 6, stats: [{ identifier: "goals_scored", points: 10, value: 2 }, { identifier: "minutes", points: 2, value: 90 }, { identifier: "bonus", points: 1, value: 1 }] }]),
];

describe("buildGwPoints", () => {
  const input = { elements, live: liveRows, teamShortById, gameweek: 8, playerIds: [1, 2, 3], captainId: 1 };

  it("lists the chosen players in the order chosen, with their official points (negative and zero kept)", () => {
    const c = buildGwPoints(input);
    expect(c.gameweek).toBe(8);
    expect(c.rows.map((r) => [r.name, r.points])).toEqual([["Palmer", -2], ["Rogers", 1], ["João Pedro", 0]]);
  });

  it("marks only the captain", () => {
    expect(buildGwPoints(input).rows.map((r) => r.isCaptain)).toEqual([true, false, false]);
    expect(buildGwPoints({ ...input, captainId: 0 }).rows.some((r) => r.isCaptain)).toBe(false);
    expect(buildGwPoints({ ...input, captainId: 4 }).rows.some((r) => r.isCaptain)).toBe(false); // not among the chosen players
  });

  it("carries team, position and minutes", () => {
    const r = buildGwPoints(input).rows[0];
    expect([r.teamShort, r.position, r.minutes]).toEqual(["CHE", "MID", 70]);
  });

  it("explains the points with FPL's own breakdown, worst first when the score is negative", () => {
    const palmer = buildGwPoints(input).rows[0];
    expect(palmer.chips.map((c) => [c.label, c.points])).toEqual([["Red", -3], ["Yellow", -1]]);
  });

  it("a player with no live entry has null points, never a made-up zero", () => {
    const c = buildGwPoints({ ...input, playerIds: [5, 1] });
    expect(c.rows.map((r) => [r.name, r.points])).toEqual([["Raya", null], ["Palmer", -2]]);
  });

  it("leaves out ids that are not players and counts a repeated id once", () => {
    const c = buildGwPoints({ ...input, playerIds: [1, 999, 1, 2] });
    expect(c.rows.map((r) => r.id)).toEqual([1, 2]);
  });

  it("marks the players on the bench, only if they are among the chosen players", () => {
    const c = buildGwPoints({ ...input, playerIds: [1, 2, 3, 4], benchIds: [3, 4, 5] });
    expect(c.rows.map((r) => [r.name, r.isBench])).toEqual([["Palmer", false], ["Rogers", false], ["João Pedro", true], ["Haaland", true]]);
    expect(buildGwPoints(input).rows.every((r) => r.isBench === false)).toBe(true);
  });

  it("a benched captain is still the captain (points are never doubled)", () => {
    const c = buildGwPoints({ ...input, benchIds: [1] });
    expect(c.rows[0]).toMatchObject({ isCaptain: true, isBench: true, points: -2 });
  });

  it("a player who did not play still shows with 0 and zero minutes", () => {
    const jp = buildGwPoints(input).rows[2];
    expect([jp.points, jp.minutes]).toEqual([0, 0]);
  });
});

describe("gw-points in the template list and the spec link", () => {
  it("is a template with a label and description", () => {
    const t = GRAPHIC_TEMPLATES.find((x) => x.id === "gw-points");
    expect(t?.label).toBeTruthy();
    expect(t?.description).toBeTruthy();
  });

  it("keeps up to the maximum players, in order, and a captain who is one of them", () => {
    const spec: GraphicSpec = { ...DEFAULT_SPEC, template: "gw-points", players: [1, 2, 3], captain: 1, from: 8, to: 8 };
    const back = decodeSpec(encodeSpec(spec));
    expect(back.template).toBe("gw-points");
    expect(back.players).toEqual([1, 2, 3]);
    expect(back.captain).toBe(1);
    expect([back.from, back.to]).toEqual([8, 8]);
  });

  it("keeps the bench players who are among the chosen players, at most 4", () => {
    const back = decodeSpec("t=gw-points&p=1,2,3,4,5&bn=3,4,5,9");
    expect(back.bench).toEqual([3, 4, 5]); // 9 is not a chosen player
    expect(decodeSpec("t=gw-points&p=1,2,3,4,5,6&bn=1,2,3,4,5").bench).toEqual([1, 2, 3, 4]);
    const spec: GraphicSpec = { ...DEFAULT_SPEC, template: "gw-points", players: [1, 2, 3], bench: [3] };
    expect(decodeSpec(encodeSpec(spec)).bench).toEqual([3]);
  });

  it("drops a captain who is not among the chosen players", () => {
    const back = decodeSpec("t=gw-points&p=1,2&cap=9");
    expect(back.captain).toBe(0);
  });

  it("caps the player count", () => {
    const many = Array.from({ length: MAX_GW_POINTS_PLAYERS + 5 }, (_, i) => i + 1).join(",");
    expect(decodeSpec(`t=gw-points&p=${many}`).players).toHaveLength(MAX_GW_POINTS_PLAYERS);
  });

  it("is not a projection graphic", () => {
    expect(usesProjections({ ...DEFAULT_SPEC, template: "gw-points" })).toBe(false);
  });
});

describe("captions and empty graphics", () => {
  const spec: GraphicSpec = { ...DEFAULT_SPEC, template: "gw-points" };
  const points = buildGwPoints({ elements, live: liveRows, teamShortById, gameweek: 8, playerIds: [1, 2, 3], captainId: 1 });

  it("the caption gives the real points, the captain marked, and fits 256 characters", () => {
    const c = buildCaption({ kind: "gw-points", points, gwLabel: "GW8", subtitle: "" }, spec);
    expect(c).toContain("Palmer (C) -2");
    expect(c).toContain("Rogers 1");
    expect(c).toContain("João Pedro 0");
    expect(c).toContain("#GW8");
    expect(c.length).toBeLessThanOrEqual(256);
  });

  it("a benched player is marked in the caption", () => {
    const withBench = buildGwPoints({ elements, live: liveRows, teamShortById, gameweek: 8, playerIds: [1, 4], benchIds: [4], captainId: 1 });
    const c = buildCaption({ kind: "gw-points", points: withBench, gwLabel: "GW8", subtitle: "" }, spec);
    expect(c).toContain("Haaland (bench) 13");
  });

  it("is empty with no players", () => {
    expect(isEmptyGraphic({ kind: "gw-points", points, gwLabel: "GW8", subtitle: "" })).toBe(false);
    expect(isEmptyGraphic({ kind: "gw-points", points: { ...points, rows: [] }, gwLabel: "GW8", subtitle: "" })).toBe(true);
  });
});

describe("the started gameweek a graphic is about", () => {
  const events = [
    { id: 7, finished: true, deadline_time: "2026-10-17T10:00:00Z" },
    { id: 8, finished: false, deadline_time: "2026-10-24T10:00:00Z", is_current: true },
    { id: 9, finished: false, deadline_time: "2099-10-31T10:00:00Z", is_next: true },
  ];

  it("resolveStartedGw keeps a started gameweek (live included), otherwise falls back on the latest started one", () => {
    expect(resolveStartedGw({ from: 8 }, [7, 8])).toBe(8);
    expect(resolveStartedGw({ from: 7 }, [7, 8])).toBe(7);
    expect(resolveStartedGw({ from: 9 }, [7, 8])).toBe(8); // not started yet
    expect(resolveStartedGw({ from: 0 }, [7, 8])).toBe(8);
    expect(resolveStartedGw({ from: 0 }, [])).toBe(0);
  });

  const ctx = (liveElements: LiveScorerInput[] | undefined) =>
    makeGraphicDataContext({
      bootstrap: { elements, teams: [{ id: 1, name: "Chelsea", short_name: "CHE" }, { id: 2, name: "Man City", short_name: "MCI" }], events } as any,
      projections: undefined,
      fixtures: [],
      liveElements,
      priceChanges: undefined,
    });
  const spec: GraphicSpec = { ...DEFAULT_SPEC, template: "gw-points", players: [1, 2, 3], captain: 1, from: 8, to: 8 };

  it("asks for that gameweek's live points, even before it has finished", () => {
    expect(graphicDataRequests(spec, ctx(undefined))).toContain("/api/event/8/live");
  });

  it("builds the graphic from those points and says the points are live while the gameweek is on", () => {
    const { data, problem } = computeGraphicData(spec, ctx(liveRows));
    expect(problem).toBeNull();
    expect(data?.kind).toBe("gw-points");
    if (data?.kind !== "gw-points") return;
    expect(data.points.rows.map((r) => r.points)).toEqual([-2, 1, 0]);
    expect(data.gwLabel).toBe("GW8");
    expect(data.subtitle.toLowerCase()).toContain("live");
  });

  it("for a finished gameweek the subtitle says they are the actual points", () => {
    const { data } = computeGraphicData({ ...spec, from: 7, to: 7 }, ctx(liveRows));
    expect(data?.kind === "gw-points" && data.subtitle.toLowerCase().includes("live")).toBe(false);
  });

  it("asks the user to pick players when none are chosen", () => {
    const { data, problem } = computeGraphicData({ ...spec, players: [] }, ctx(liveRows));
    expect(data).toBeNull();
    expect(problem).toMatch(/pick/i);
  });

  it("waits quietly while the points are loading", () => {
    const { data, problem } = computeGraphicData(spec, ctx(undefined));
    expect(data).toBeNull();
    expect(problem).toBeNull();
  });
});
