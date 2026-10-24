import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPEC,
  buildCaption,
  buildPredictedLineup,
  decodeSpec,
  encodeSpec,
  footerNote,
  type GraphicElement,
  type GraphicSpec,
} from "../shared/graphics";

const spec = (over: Partial<GraphicSpec> = {}): GraphicSpec => ({ ...DEFAULT_SPEC, template: "predicted-lineup", teams: [1], ...over });
const XI = [1, 11, 12, 13, 14, 21, 22, 24, 23, 25, 31];

describe("spec: formation and xi in the link", () => {
  it("round-trips a formation and an XI (0 = an empty slot)", () => {
    const s = spec({ formation: "4-2-3-1", xi: [1, 11, 12, 13, 14, 21, 22, 24, 23, 25, 0] });
    const q = encodeSpec(s);
    expect(q).toContain("fm=4-2-3-1");
    expect(q).toContain("xi=1,11,12,13,14,21,22,24,23,25,0");
    const back = decodeSpec(q);
    expect(back.formation).toBe("4-2-3-1");
    expect(back.xi).toEqual(s.xi);
  });
  it("leaves both out when nothing is edited", () => {
    expect(encodeSpec(spec())).toBe("t=predicted-lineup&tm=1");
    expect(DEFAULT_SPEC).toMatchObject({ formation: "", xi: [] });
  });
  it("drops a formation that is not on the list, and an XI that is not eleven distinct players", () => {
    expect(decodeSpec("t=predicted-lineup&fm=9-1-0").formation).toBe("");
    const bad = decodeSpec("t=predicted-lineup&fm=4-3-3&xi=1,2,3");
    expect(bad.formation).toBe("4-3-3");
    expect(bad.xi).toEqual([]);
    expect(decodeSpec("t=predicted-lineup&fm=4-3-3&xi=1,1,2,3,4,5,6,7,8,9,10").xi).toEqual([]);
    expect(decodeSpec("t=predicted-lineup&fm=4-3-3&xi=1,2,3,4,5,6,7,8,9,10,x").xi).toEqual([]);
  });
  it("an XI without a formation means nothing", () => {
    expect(decodeSpec("t=predicted-lineup&xi=1,2,3,4,5,6,7,8,9,10,11").xi).toEqual([]);
  });
  it("only the Predicted Lineup keeps them", () => {
    const d = decodeSpec("t=player-card&fm=4-3-3&xi=1,2,3,4,5,6,7,8,9,10,11");
    expect(d.formation).toBe("");
    expect(d.xi).toEqual([]);
  });
});

describe("footer and caption say it is user-edited", () => {
  it("footer note", () => {
    expect(footerNote(spec(), "GW9")).toContain("estimates");
    const edited = footerNote(spec({ formation: "4-3-3" }), "GW9");
    expect(edited).toContain("User-edited");
    expect(edited).not.toContain("estimates");
  });
});

// ---------- the builder ----------
const el = (id: number, type: number, over: Partial<GraphicElement> = {}): GraphicElement =>
  ({ id, element_type: type, team: 1, web_name: `N${id}`, now_cost: 50, status: "a", ...over }) as GraphicElement;
const elements = [
  el(1, 1), el(2, 1),
  ...[11, 12, 13, 14, 15].map((i) => el(i, 2)),
  ...[21, 22, 23, 24, 25].map((i) => el(i, 3)),
  ...[31, 32, 33].map((i) => el(i, 4)),
  el(99, 3, { team: 2 }),
];
const mins: Record<number, number> = { 1: 90, 2: 0, 11: 90, 12: 90, 13: 88, 14: 85, 15: 50, 21: 90, 22: 89, 23: 80, 24: 70, 25: 60, 31: 90, 32: 60, 33: 30, 99: 90 };
const projections = Object.entries(mins).map(([id, m]) => ({ playerId: Number(id), xMinsPerGW: { "8": m } as Record<string, number> }));
const detailed = new Map<number, string[]>([
  [1, ["GK"]], [2, ["GK"]], [11, ["LB"]], [12, ["CB"]], [13, ["CB"]], [14, ["RB"]], [15, ["CB"]],
  [21, ["CDM"]], [22, ["CDM"]], [23, ["CAM"]], [24, ["RW"]], [25, ["LW"]], [31, ["ST"]], [32, ["ST"]], [33, ["ST"]],
]);
const fixtures = [{ event: 8, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4, finished: false }];
const teamShortById = new Map([[1, "ARS"], [2, "AVL"]]);
const teamNameById = new Map([[1, "Arsenal"], [2, "Aston Villa"]]);
const run = (over: Record<string, unknown> = {}) =>
  buildPredictedLineup({ teamId: 1, gameweek: 8, elements, projections, teamShortById, teamNameById, fixtures, detailedPositions: detailed, ...over } as any);
const ids = (l: ReturnType<typeof run>) => l.rows.flatMap((r) => r.players).map((p) => p.id);

describe("buildPredictedLineup: our prediction is not marked as edited", () => {
  it("edited is false and the model formation is the formation", () => {
    const l = run();
    expect(l.edited).toBe(false);
    expect(l.modelFormation).toBe(l.formation);
  });
  it("an unknown formation is ignored", () => {
    const l = run({ formation: "9-1-0" });
    expect(l.edited).toBe(false);
  });
});

describe("buildPredictedLineup: a chosen formation", () => {
  it("lays the XI out in that formation's lines, marks it edited and remembers our own formation", () => {
    const auto = run();
    const l = run({ formation: "4-2-3-1" });
    expect(l.edited).toBe(true);
    expect(l.formation).toBe("4-2-3-1");
    expect(l.modelFormation).toBe(auto.formation);
    expect(l.rows.map((r) => r.players.length)).toEqual([1, 4, 2, 3, 1]);
    expect(l.complete).toBe(true);
    expect(new Set(ids(l)).size).toBe(11);
  });
  it("puts players where they fit: goalkeeper first, wingers wide, the striker alone up front", () => {
    const l = run({ formation: "4-2-3-1" });
    expect(l.rows[0].players.map((p) => p.id)).toEqual([1]);
    expect(l.rows[1].players.map((p) => p.id)).toEqual([11, 12, 13, 14]); // LB CB CB RB
    expect(l.rows[3].players.map((p) => p.id)).toEqual([25, 23, 24]); // LW CAM RW
    expect(l.rows[4].players.map((p) => p.id)).toEqual([31]);
  });
  it("has no bench: that belongs to our prediction", () => {
    expect(run({ formation: "4-3-3" }).bench).toEqual([]);
  });
  it("tokens carry the detailed position", () => {
    const l = run({ formation: "4-2-3-1" });
    expect(l.rows[1].players[0].role).toBe("LB");
  });
});

describe("buildPredictedLineup: a chosen XI", () => {
  it("uses exactly those players in slot order, including one with no expected minutes", () => {
    const xi = [2, 11, 12, 13, 14, 21, 22, 25, 23, 24, 33];
    const l = run({ formation: "4-2-3-1", xi });
    expect(ids(l)).toEqual(xi);
    expect(l.rows[0].players[0]).toMatchObject({ id: 2, xMins: 0 });
    expect(l.edited).toBe(true);
  });
  it("shows injury and doubt on a user-picked player", () => {
    const els = elements.map((e) => (e.id === 31 ? { ...e, status: "i" } : e.id === 32 ? { ...e, status: "d" } : e));
    const l = run({ elements: els, formation: "4-2-3-1", xi: XI });
    expect(l.rows.flatMap((r) => r.players).find((p) => p.id === 31)?.flag).toBe("injured");
    const l2 = run({ elements: els, formation: "4-4-2", xi: [1, 11, 12, 13, 14, 21, 22, 23, 24, 31, 32] });
    expect(l2.rows.flatMap((r) => r.players).find((p) => p.id === 32)?.flag).toBe("doubtful");
  });
  it("a player from another club in the XI is treated as an empty slot and refilled", () => {
    const xi = [1, 11, 12, 13, 14, 21, 22, 25, 23, 24, 99];
    const l = run({ formation: "4-2-3-1", xi });
    expect(ids(l)).not.toContain(99);
    expect(ids(l)).toHaveLength(11);
    expect(l.complete).toBe(true);
  });
  it("the same player twice is not repeated", () => {
    const l = run({ formation: "4-2-3-1", xi: [1, 11, 11, 13, 14, 21, 22, 25, 23, 24, 31] });
    expect(new Set(ids(l)).size).toBe(ids(l).length);
  });
  it("is incomplete, with the slots left empty, when the club cannot field eleven", () => {
    const few = elements.filter((e) => e.team !== 1 || e.id <= 14);
    const l = run({ elements: few, formation: "4-2-3-1" });
    expect(l.complete).toBe(false);
    expect(ids(l).length).toBeLessThan(11);
  });
});

describe("buildCaption for an edited lineup", () => {
  it("says so", () => {
    const l = run({ formation: "4-2-3-1" });
    const text = buildCaption({ kind: "predicted-lineup", lineup: l, gwLabel: "GW8" } as any, spec({ formation: "4-2-3-1" }));
    expect(text).toContain("User-edited");
    expect(text).toContain("4-2-3-1");
    expect(text).not.toContain("from our expected minutes");
  });
});
