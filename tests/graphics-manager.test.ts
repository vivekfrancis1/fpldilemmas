import { describe, it, expect } from "vitest";
import {
  buildMyGameweek,
  buildRevealStats,
  type EntryPicksInput,
} from "../shared/graphics-manager";
import { DEFAULT_SPEC, GRAPHIC_TEMPLATES, buildCaption, decodeSpec, encodeSpec, isEmptyGraphic, type GraphicElement, type GraphicSpec } from "../shared/graphics";
import type { LiveScorerInput } from "../shared/graphics-players";
import { computeGraphicData, graphicDataRequests, loadGraphicData, makeGraphicDataContext, managerRequests } from "../client/src/lib/graphic-data";

const teamShortById = new Map<number, string>([[1, "ARS"], [2, "MCI"], [3, "LIV"]]);
const NAMES: Record<number, string> = {
  1: "Raya", 2: "Sels",
  3: "Gabriel", 4: "Saliba", 5: "Gvardiol", 6: "Alexander-Arnold", 7: "Dalot",
  8: "Saka", 9: "Salah", 10: "Palmer", 11: "Gordon", 12: "Rogers",
  13: "Haaland", 14: "Isak", 15: "Welbeck",
};
const typeOf = (id: number) => (id <= 2 ? 1 : id <= 7 ? 2 : id <= 12 ? 3 : 4);
const elements: GraphicElement[] = Object.entries(NAMES).map(([id, name]) => ({
  id: Number(id), web_name: name, team: ((Number(id) - 1) % 3) + 1, element_type: typeOf(Number(id)), now_cost: 60, selected_by_percent: "5.0",
}));

const live = (id: number, total_points: number, minutes = 90): LiveScorerInput => ({
  id, stats: { total_points, minutes, goals_scored: 0, assists: 0, bonus: 0 }, explain: [],
});
// every player scored their id mod 5 + 1 points, in 90 minutes, unless overridden
const liveRows = (over: Record<number, LiveScorerInput> = {}): LiveScorerInput[] =>
  Object.keys(NAMES).map((k) => over[Number(k)] ?? live(Number(k), (Number(k) % 5) + 1));

// 4-4-2: GK 1, DEF 3-6, MID 8-11, FWD 13-14; bench GK 2, DEF 7, MID 12, FWD 15. Captain Salah (9), vice Haaland (13).
const SQUAD_ORDER = [1, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 2, 7, 12, 15];
const picksFor = (over: Partial<EntryPicksInput> = {}, captain = 9, vice = 13): EntryPicksInput => ({
  active_chip: null,
  automatic_subs: [],
  entry_history: { event: 8, points: 0, total_points: 612, rank: 1_234_567, overall_rank: 45_678, event_transfers: 1, event_transfers_cost: 4, points_on_bench: 7 },
  picks: SQUAD_ORDER.map((element, i) => ({ element, position: i + 1, multiplier: i < 11 ? 1 : 0, is_captain: element === captain, is_vice_captain: element === vice })),
  ...over,
});
const base = { elements, teamShortById, gameweek: 8, finished: true };
const names = (xs: Array<{ name: string }>) => xs.map((x) => x.name);

describe("buildMyGameweek", () => {
  it("draws the XI by position with the formation, and the bench goalkeeper first", () => {
    const c = buildMyGameweek({ ...base, live: liveRows(), picks: picksFor() });
    expect(c.complete).toBe(true);
    expect(c.formation).toBe("4-4-2");
    expect(c.rows.map((r) => r.position)).toEqual(["GKP", "DEF", "MID", "FWD"]);
    expect(names(c.rows[1].players)).toEqual(["Gabriel", "Saliba", "Gvardiol", "Alexander-Arnold"]);
    expect(names(c.bench)).toEqual(["Sels", "Dalot", "Rogers", "Welbeck"]);
  });

  it("shows each player's own points, the captain's doubled, and a benched player's points as not counted", () => {
    const c = buildMyGameweek({ ...base, live: liveRows(), picks: picksFor() });
    const all = [...c.rows.flatMap((r) => r.players), ...c.bench];
    const get = (n: string) => all.find((p) => p.name === n)!;
    expect(get("Salah")).toMatchObject({ basePoints: 5, multiplier: 2, points: 10, isCaptain: true });
    expect(get("Haaland")).toMatchObject({ basePoints: 4, multiplier: 1, points: 4, isVice: true });
    expect(get("Welbeck")).toMatchObject({ basePoints: 1, multiplier: 0, counted: false });
    expect(get("Saka")).toMatchObject({ multiplier: 1, counted: true });
  });

  it("a Triple Captain triples the captain", () => {
    const c = buildMyGameweek({ ...base, live: liveRows(), picks: picksFor({ active_chip: "3xc" }) });
    expect(c.chipLabel).toBe("Triple Captain");
    const salah = c.rows.flatMap((r) => r.players).find((p) => p.name === "Salah")!;
    expect(salah).toMatchObject({ multiplier: 3, points: 15 });
  });

  it("an automatic substitute takes the place of the player who did not play, and is marked as subbed in", () => {
    // Gordon (11, MID) played 0 minutes: Rogers (12, MID) came on from the bench
    const c = buildMyGameweek({
      ...base,
      live: liveRows({ 11: live(11, 0, 0) }),
      picks: picksFor({ automatic_subs: [{ element_in: 12, element_out: 11 }] }),
    });
    const mids = c.rows[2].players;
    expect(names(mids)).toContain("Rogers");
    expect(names(mids)).not.toContain("Gordon");
    expect(mids.find((p) => p.name === "Rogers")).toMatchObject({ counted: true, multiplier: 1, subbedIn: true });
    expect(names(c.bench)).toContain("Gordon");
    expect(c.bench.find((p) => p.name === "Gordon")).toMatchObject({ counted: false });
    expect(c.formation).toBe("4-4-2");
  });

  it("when the captain did not play in a finished gameweek the vice-captain takes the armband's double points", () => {
    const c = buildMyGameweek({ ...base, live: liveRows({ 9: live(9, 0, 0) }), picks: picksFor() });
    const all = c.rows.flatMap((r) => r.players);
    expect(all.find((p) => p.name === "Salah")).toMatchObject({ isCaptain: true, multiplier: 1, points: 0 });
    expect(all.find((p) => p.name === "Haaland")).toMatchObject({ isVice: true, multiplier: 2, points: 8 });
  });

  it("in a live gameweek the captain keeps the armband (a player who has not played yet may still play)", () => {
    const c = buildMyGameweek({ ...base, finished: false, live: liveRows({ 9: live(9, 0, 0) }), picks: picksFor() });
    const all = c.rows.flatMap((r) => r.players);
    expect(all.find((p) => p.name === "Salah")).toMatchObject({ multiplier: 2 });
    expect(all.find((p) => p.name === "Haaland")).toMatchObject({ multiplier: 1 });
  });

  it("a Bench Boost counts all 15 players and makes no substitutions", () => {
    const c = buildMyGameweek({
      ...base,
      live: liveRows({ 11: live(11, 0, 0) }),
      picks: picksFor({ active_chip: "bboost", automatic_subs: [{ element_in: 12, element_out: 11 }] }),
    });
    expect(c.chipLabel).toBe("Bench Boost");
    expect(c.bench.every((p) => p.counted && p.multiplier === 1)).toBe(true);
    expect(names(c.rows[2].players)).toContain("Gordon");
  });

  it("takes the totals and ranks from FPL's own entry history, with the transfer hit separate", () => {
    const c = buildMyGameweek({ ...base, live: liveRows(), picks: picksFor({ entry_history: { event: 8, points: 61, total_points: 612, rank: 1_234_567, overall_rank: 45_678, event_transfers: 1, event_transfers_cost: 4, points_on_bench: 7 } }) });
    expect(c).toMatchObject({ gwPoints: 61, transferCost: 4, gwRank: 1_234_567, overallPoints: 612, overallRank: 45_678, pointsOnBench: 7 });
  });

  it("the players' points add up to FPL's gameweek points plus the hit", () => {
    // XI base points (id%5+1): 1→2, 3→4, 4→5, 5→1, 6→2, 8→4, 9→5, 10→1, 11→2, 13→4, 14→5 = 35, captain 9 doubled +5 = 40
    const c = buildMyGameweek({ ...base, live: liveRows(), picks: picksFor({ entry_history: { event: 8, points: 36, total_points: 100, rank: 5, overall_rank: 6, event_transfers: 1, event_transfers_cost: 4, points_on_bench: 0 } }) });
    expect(c.computedTotal).toBe(40);
    expect(c.computedTotal).toBe(c.gwPoints! + c.transferCost!);
  });

  it("a rank FPL has not set (0 or missing) is null, never shown as 0", () => {
    const c = buildMyGameweek({ ...base, live: liveRows(), picks: picksFor({ entry_history: { event: 8, points: 50, total_points: 100, rank: 0, overall_rank: null, event_transfers: 0, event_transfers_cost: 0, points_on_bench: 0 } }) });
    expect(c.gwRank).toBeNull();
    expect(c.overallRank).toBeNull();
  });

  it("a player with no live entry has null points, never a made-up 0", () => {
    const rows = liveRows().filter((l) => l.id !== 10);
    const c = buildMyGameweek({ ...base, live: rows, picks: picksFor() });
    expect(c.rows.flatMap((r) => r.players).find((p) => p.name === "Palmer")!.points).toBeNull();
  });

  it("nothing is guessed when there are no picks or the squad is not 15 known players", () => {
    expect(buildMyGameweek({ ...base, live: liveRows(), picks: null }).complete).toBe(false);
    const short = picksFor();
    short.picks = short.picks.slice(0, 14);
    expect(buildMyGameweek({ ...base, live: liveRows(), picks: short }).complete).toBe(false);
  });
});

describe("buildRevealStats", () => {
  const tr = (element_in: number, element_out: number, event: number, time = "2026-10-20T10:00:00Z") => ({ element_in, element_out, event, time });
  const history = (over: Partial<NonNullable<EntryPicksInput["entry_history"]>> = {}) => ({ event: 7, points: 55, total_points: 612, rank: 10, overall_rank: 45_678, event_transfers: 0, event_transfers_cost: 0, points_on_bench: 3, ...over });
  const input = { elements, teamShortById, gameweek: 8, transfers: [] as ReturnType<typeof tr>[], currentPicks: null as EntryPicksInput | null, previousPicks: null as EntryPicksInput | null };

  it("lists only the transfers made for this gameweek, with who went out and who came in", () => {
    const s = buildRevealStats({ ...input, transfers: [tr(13, 14, 7), tr(9, 8, 8), tr(10, 11, 8, "2026-10-21T09:00:00Z")] });
    expect(s.transfers).toEqual([
      { inName: "Salah", inTeam: "LIV", outName: "Saka", outTeam: "MCI" },
      { inName: "Palmer", inTeam: "ARS", outName: "Gordon", outTeam: "MCI" },
    ]);
  });

  it("no transfers this gameweek gives an empty list, and the hit is 0", () => {
    const s = buildRevealStats({ ...input, transfers: [tr(13, 14, 7)], currentPicks: picksFor({ entry_history: history({ event: 8, event_transfers_cost: 0 }) }) });
    expect(s.transfers).toEqual([]);
    expect(s.transferCost).toBe(0);
  });

  it("the points hit comes from this gameweek's entry history, and is null when picks are not out yet", () => {
    expect(buildRevealStats({ ...input, currentPicks: picksFor({ entry_history: history({ event: 8, event_transfers_cost: 8 }) }) }).transferCost).toBe(8);
    expect(buildRevealStats(input).transferCost).toBeNull();
  });

  it("overall points and rank are where the manager stood after the previous gameweek", () => {
    const s = buildRevealStats({ ...input, previousPicks: picksFor({ entry_history: history() }) });
    expect(s).toMatchObject({ overallPoints: 612, overallRank: 45_678 });
  });

  it("gameweek 1, or no previous picks, has no overall figures (null, not 0)", () => {
    expect(buildRevealStats({ ...input, gameweek: 1, previousPicks: picksFor({ entry_history: history() }) })).toMatchObject({ overallPoints: null, overallRank: null });
    expect(buildRevealStats(input)).toMatchObject({ overallPoints: null, overallRank: null });
  });

  it("ignores transfer players that are not in the player list", () => {
    const s = buildRevealStats({ ...input, transfers: [tr(999, 8, 8), tr(9, 8, 8)] });
    expect(s.transfers.map((t) => t.inName)).toEqual(["Salah"]);
  });
});

describe("My Gameweek and Team Reveal in the template list and the spec link", () => {
  it("My Gameweek is a template with a label and description", () => {
    const g = GRAPHIC_TEMPLATES.find((x) => x.id === "my-gameweek");
    expect(g?.label).toBe("My Gameweek");
    expect(g?.description).toBeTruthy();
  });

  it("the manager's team id survives the link, and only a positive whole number is kept", () => {
    const spec: GraphicSpec = { ...DEFAULT_SPEC, template: "my-gameweek", entry: 368240, from: 8, to: 8 };
    expect(decodeSpec(encodeSpec(spec)).entry).toBe(368240);
    expect(decodeSpec(encodeSpec({ ...spec, entry: 0 })).entry).toBe(0);
    expect(decodeSpec("t=my-gameweek&en=abc").entry).toBe(0);
    expect(encodeSpec({ ...DEFAULT_SPEC, entry: 0 })).toBe("");
  });
});

const events = [
  { id: 7, finished: true, deadline_time: "2026-10-17T10:00:00Z" },
  { id: 8, finished: false, deadline_time: "2026-10-24T10:00:00Z", is_current: true },
  { id: 9, finished: false, deadline_time: "2099-10-31T10:00:00Z", is_next: true },
];
const bootstrap = { elements, teams: [{ id: 1, name: "Arsenal", short_name: "ARS" }, { id: 2, name: "Man City", short_name: "MCI" }, { id: 3, name: "Liverpool", short_name: "LIV" }], events } as any;
const ctxFor = (extra: Partial<Parameters<typeof makeGraphicDataContext>[0]> = {}) =>
  makeGraphicDataContext({ bootstrap, projections: undefined, fixtures: [], liveElements: undefined, priceChanges: undefined, ...extra });
const manager = (over: Record<string, unknown> = {}) => ({ entry: 368240, gameweek: 8, picks: picksFor(), previousPicks: null, transfers: [], ...over }) as any;

describe("My Gameweek graphic data", () => {
  const spec: GraphicSpec = { ...DEFAULT_SPEC, template: "my-gameweek", entry: 368240, manager: "Steve", from: 8, to: 8 };

  it("asks for the team id before anything else", () => {
    const { data, problem } = computeGraphicData({ ...spec, entry: 0 }, ctxFor({ liveElements: liveRows() }));
    expect(data).toBeNull();
    expect(problem).toMatch(/team id/i);
  });

  it("needs the gameweek's live points and the manager's picks, and loads those requests", () => {
    const c = ctxFor();
    const urls = graphicDataRequests(spec, c);
    expect(urls).toContain("/api/event/8/live");
    expect(urls).toContain("/api/entry/368240/event/8/picks");
  });

  it("waits quietly while the data is loading", () => {
    expect(computeGraphicData(spec, ctxFor({ liveElements: liveRows() }))).toEqual({ data: null, problem: null });
    expect(computeGraphicData(spec, ctxFor({ manager: manager() }))).toEqual({ data: null, problem: null });
  });

  it("does not use another team's or another gameweek's data", () => {
    expect(computeGraphicData(spec, ctxFor({ liveElements: liveRows(), manager: manager({ entry: 1 }) }))).toEqual({ data: null, problem: null });
    expect(computeGraphicData(spec, ctxFor({ liveElements: liveRows(), manager: manager({ gameweek: 7 }) }))).toEqual({ data: null, problem: null });
  });

  it("builds the graphic from FPL's picks and points, saying live points are not final while the gameweek is on", () => {
    const { data, problem } = computeGraphicData(spec, ctxFor({ liveElements: liveRows(), manager: manager() }));
    expect(problem).toBeNull();
    expect(data?.kind).toBe("my-gameweek");
    if (data?.kind !== "my-gameweek") return;
    expect(data.mine.formation).toBe("4-4-2");
    expect(data.gwLabel).toBe("GW8");
    expect(data.subtitle).toContain("Steve");
    expect(data.subtitle.toLowerCase()).toContain("live");
  });

  it("a finished gameweek has no live note", () => {
    const { data } = computeGraphicData({ ...spec, from: 7, to: 7 }, ctxFor({ liveElements: liveRows(), manager: manager({ gameweek: 7 }) }));
    expect(data?.kind === "my-gameweek" && data.subtitle.toLowerCase().includes("live")).toBe(false);
  });

  it("says so when FPL has no picks for that team and gameweek", () => {
    const { data, problem } = computeGraphicData(spec, ctxFor({ liveElements: liveRows(), manager: manager({ picks: null }) }));
    expect(data).toBeNull();
    expect(problem).toMatch(/picks/i);
  });

  it("is a blank card, left out of packs, when the squad could not be read", () => {
    const { data } = computeGraphicData(spec, ctxFor({ liveElements: liveRows(), manager: manager() }));
    if (data?.kind !== "my-gameweek") throw new Error("expected my-gameweek");
    expect(isEmptyGraphic(data)).toBe(false);
    expect(isEmptyGraphic({ ...data, mine: { ...data.mine, complete: false } })).toBe(true);
  });

  it("the caption gives FPL's points, ranks and overall figures, and fits 256 characters", () => {
    const { data } = computeGraphicData(spec, ctxFor({ liveElements: liveRows(), manager: manager() }));
    if (data?.kind !== "my-gameweek") throw new Error("expected my-gameweek");
    const caption = buildCaption({ ...data, mine: { ...data.mine, gwPoints: 61, transferCost: 4, gwRank: 1_234_567, overallPoints: 612, overallRank: 45_678 } }, spec);
    expect(caption).toContain("Steve's GW8");
    expect(caption).toContain("61 pts (after a -4 hit)");
    expect(caption).toContain("GW rank 1,234,567");
    expect(caption).toContain("overall 612 pts");
    expect(caption).toContain("overall rank 45,678");
    expect(caption).toContain("#GW8");
    expect(caption.length).toBeLessThanOrEqual(256);
  });
});

describe("Team Reveal manager figures", () => {
  const spec: GraphicSpec = { ...DEFAULT_SPEC, template: "team-reveal", entry: 368240, squad: SQUAD_ORDER, bench: [2, 7, 12, 15], captain: 9, vice: 13, from: 9, to: 9 };
  const tr = (element_in: number, element_out: number, event: number) => ({ element_in, element_out, event, time: "2026-10-25T10:00:00Z" });

  it("asks for the manager's picks, the previous gameweek's picks and transfers, each optional", () => {
    const r = managerRequests(spec, ctxFor());
    expect(r).toMatchObject({
      gameweek: 9,
      picks: "/api/entry/368240/event/9/picks",
      previous: "/api/entry/368240/event/8/picks",
      transfers: "/api/manager/368240/transfers",
    });
  });

  it("asks for nothing without a team id, and has no previous gameweek in gameweek 1", () => {
    expect(managerRequests({ ...spec, entry: 0 }, ctxFor()).urls).toEqual([]);
    expect(managerRequests({ ...spec, from: 1, to: 1 }, ctxFor()).previous).toBeNull();
  });

  it("picks that are not out yet, or a failed request, do not stop the rest from loading", async () => {
    const fetched: string[] = [];
    const fetchJson = async (url: string) => {
      fetched.push(url);
      if (url.endsWith("/event/9/picks")) throw new Error("404");
      if (url.endsWith("/transfers")) return [tr(9, 8, 9)];
      if (url.endsWith("/event/8/picks")) return picksFor();
      return {};
    };
    const next = await loadGraphicData(spec, ctxFor(), fetchJson);
    expect(next.manager).toMatchObject({ entry: 368240, gameweek: 9, picks: null });
    expect(next.manager?.transfers).toHaveLength(1);
    expect(next.manager?.previousPicks?.entry_history?.total_points).toBe(612);
  });

  it("adds this week's transfers, the hit, and overall points and rank to the reveal", () => {
    const m = manager({ gameweek: 9, picks: picksFor({ entry_history: { event: 9, points: 0, total_points: 612, rank: null, overall_rank: null, event_transfers: 2, event_transfers_cost: 4, points_on_bench: 0 } }), previousPicks: picksFor(), transfers: [tr(9, 8, 9), tr(13, 14, 8)] });
    const { data } = computeGraphicData(spec, ctxFor({ manager: m, fixtures: [] }));
    expect(data?.kind).toBe("team-reveal");
    if (data?.kind !== "team-reveal") return;
    expect(data.stats?.transfers).toEqual([{ inName: "Salah", inTeam: "LIV", outName: "Saka", outTeam: "MCI" }]);
    expect(data.stats).toMatchObject({ transferCost: 4, overallPoints: 612, overallRank: 45_678 });
  });

  it("without a team id the reveal has no manager figures, and still draws", () => {
    const { data } = computeGraphicData({ ...spec, entry: 0 }, ctxFor({ fixtures: [] }));
    expect(data?.kind === "team-reveal" && data.stats === null).toBe(true);
  });

  it("the caption mentions the transfers and overall rank only when there are figures", () => {
    const base = computeGraphicData(spec, ctxFor({ manager: manager({ gameweek: 9, picks: null, previousPicks: picksFor(), transfers: [tr(9, 8, 9)] }), fixtures: [] })).data;
    if (base?.kind !== "team-reveal") throw new Error("expected team-reveal");
    // the test squad has 5 players per club, so mark it complete here: the caption is what is tested
    const complete = { ...base, reveal: { ...base.reveal, complete: true, formation: "4-4-2" } };
    const withStats = buildCaption(complete, spec);
    expect(withStats).toContain("1 transfer");
    expect(withStats).toContain("overall rank 45,678");
    expect(buildCaption({ ...complete, stats: null }, spec)).not.toContain("transfer");
    expect(withStats.length).toBeLessThanOrEqual(256);
  });
});
