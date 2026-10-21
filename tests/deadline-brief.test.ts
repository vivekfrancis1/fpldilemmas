import { describe, it, expect, beforeAll } from "vitest";
import { buildDeadlineBrief } from "../shared/deadline-brief";

const teams = [
  { id: 1, name: "Arsenal", short_name: "ARS" },
  { id: 2, name: "Villa", short_name: "AVL" },
  { id: 3, name: "Chelsea", short_name: "CHE" },
  { id: 4, name: "Spurs", short_name: "TOT" },
];
const el = (id: number, team: number, type: number, sel: string, status = "a", chance: number | null = 100, news = "") => ({
  id, team, element_type: type, web_name: `P${id}`, selected_by_percent: sel, status, chance_of_playing_next_round: chance, news, now_cost: 60,
});
const elements = [
  el(1, 1, 1, "20.0"), el(2, 1, 2, "30.0"), el(3, 1, 3, "50.0"), el(4, 1, 4, "5.0"),
  el(5, 2, 3, "40.0", "i", 0, "Hamstring"), el(6, 2, 4, "12.0", "d", 50, "Knock"), el(7, 2, 2, "3.0", "i", 0, "Out"),
  el(8, 3, 3, "60.0"), el(9, 3, 4, "10.0"), el(10, 3, 2, "9.9", "s", 0, "Suspended"),
  el(11, 4, 3, "25.0"), el(12, 4, 1, "2.0"), el(13, 4, 2, "1.0"), el(14, 4, 4, "0.5"),
];
const proj = (playerId: number, x: number) => ({ playerId, gameweekProjections: { "8": x, "9": 1 }, status: "a", chanceOfPlayingNextRound: 100, news: "" });
const projections = [
  proj(1, 3), proj(2, 4), proj(3, 9), proj(4, 2), proj(5, 8), proj(6, 6), proj(7, 1),
  proj(8, 7), proj(9, 5), proj(10, 2), proj(11, 6), proj(12, 4), proj(13, 3), proj(14, 5),
];
const fx = (id: number, event: number, h: number, a: number) => ({
  id, event, team_h: h, team_a: a, team_h_difficulty: 3, team_a_difficulty: 3, finished: false,
});
// GW8: Arsenal twice, Villa once, Chelsea once, Spurs none (blank)
const fixtures = [fx(1, 8, 1, 2), fx(2, 8, 3, 1)];
const event = { id: 8, name: "Gameweek 8", deadline_time: "2026-10-23T17:30:00Z" };
const pricePredictions = [
  { player_id: 3, player_name: "P3", team_name: "ARS", position: "MID", current_price: 60, status: "May rise today", ownership_percentage: 50, calibrating: false },
  { player_id: 8, player_name: "P8", team_name: "CHE", position: "MID", current_price: 60, status: "Very likely to drop today", ownership_percentage: 60, calibrating: false },
  { player_id: 11, player_name: "P11", team_name: "TOT", position: "MID", current_price: 60, status: "Unlikely to change today", ownership_percentage: 25, calibrating: false },
  { player_id: 12, player_name: "P12", team_name: "TOT", position: "GKP", current_price: 60, status: "May drop today", ownership_percentage: 2, calibrating: false },
];

const run = (over: any = {}) =>
  buildDeadlineBrief({ event, elements, teams, fixtures, projections, pricePredictions, ...over });

describe("buildDeadlineBrief", () => {
  it("passes the gameweek and official deadline through unchanged", () => {
    const b = run();
    expect(b.gameweek).toBe(8);
    expect(b.deadlineTime).toBe("2026-10-23T17:30:00Z");
  });

  it("top 5 captain options by xPts, captain value 2x, ties by lower id", () => {
    const c = run().captains;
    expect(c.map((x) => x.playerId)).toEqual([3, 5, 8, 6, 11]); // 9, 8, 7, 6, 6 (6: ids 6 before 11)
    expect(c[0].captainPoints).toBe(18);
    expect(c[0].xPts).toBe(9);
  });

  it("best three per position by xPts", () => {
    const by = run().byPosition;
    expect(by.MID.map((x) => x.playerId)).toEqual([3, 5, 8]);
    expect(by.FWD.map((x) => x.playerId)).toEqual([6, 9, 14]);
    expect(by.GKP.map((x) => x.playerId)).toEqual([12, 1]);
    expect(by.DEF).toHaveLength(3);
  });

  it("availability watch: only ownership >= 10% with a non-available FPL status, text unchanged, most-owned first", () => {
    const a = run().availability;
    expect(a.map((x) => x.playerId)).toEqual([5, 6]); // 7 is under 10%, 10 is 9.9%
    expect(a[0]).toMatchObject({ status: "i", chanceOfPlayingNextRound: 0, news: "Hamstring", ownership: 40 });
    expect(a[1]).toMatchObject({ status: "d", chanceOfPlayingNextRound: 50, news: "Knock" });
  });

  it("price watch: only rise/drop statuses, wording unchanged, ordered by ownership, split into risers and fallers", () => {
    const p = run().priceWatch;
    expect(p.risers.map((x) => [x.playerId, x.status])).toEqual([[3, "May rise today"]]);
    expect(p.fallers.map((x) => [x.playerId, x.status])).toEqual([[8, "Very likely to drop today"], [12, "May drop today"]]);
  });

  it("double and blank gameweeks come from the official fixtures", () => {
    const b = run();
    expect(b.doubles.map((t) => t.shortName)).toEqual(["ARS"]);
    expect(b.blanks.map((t) => t.shortName)).toEqual(["TOT"]);
  });

  it("without projections for the gameweek, the projection sections are empty and flagged, never invented", () => {
    const b = run({ projections: projections.map((p) => ({ ...p, gameweekProjections: { "9": 1 } })) });
    expect(b.projectionsAvailable).toBe(false);
    expect(b.captains).toEqual([]);
    expect(b.byPosition.MID).toEqual([]);
    expect(b.availability.length).toBe(2); // official data still shown
  });

  it("empty inputs give empty sections", () => {
    const b = run({ pricePredictions: [], fixtures: [] });
    expect(b.priceWatch.risers).toEqual([]);
    expect(b.priceWatch.fallers).toEqual([]);
    expect(b.doubles).toEqual([]);
    expect(b.blanks.map((t) => t.shortName).sort()).toEqual(["ARS", "AVL", "CHE", "TOT"]);
  });
});

const BASE_URL = `http://localhost:5050`;
async function getJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}

describe("GET /api/deadline-brief (consistency with its sources)", () => {
  let brief: any;
  let cached: any[];
  let boot: any;

  beforeAll(async () => {
    brief = (await getJson("/api/deadline-brief")).body;
    cached = (await getJson("/api/cached/player-total-points")).body;
    boot = (await getJson("/api/bootstrap-static")).body;
  }, 180000);

  it("is for FPL's next gameweek, with its official deadline", () => {
    const next = boot.events.find((e: any) => e.is_next);
    expect(brief.gameweek).toBe(next.id);
    expect(brief.deadlineTime).toBe(next.deadline_time);
  });

  it("every captain/position xPts equals the cached projection endpoint", () => {
    const byId = new Map(cached.map((p) => [p.playerId, p]));
    const all = [...brief.captains, ...Object.values(brief.byPosition).flat()] as any[];
    expect(all.length).toBeGreaterThan(5);
    for (const c of all) expect(c.xPts).toBe(byId.get(c.playerId).gameweekProjections[String(brief.gameweek)]);
    for (const c of brief.captains) expect(c.captainPoints).toBe(Math.round(c.xPts * 2 * 100) / 100);
  });

  it("availability entries match FPL's own bootstrap data", () => {
    const byId = new Map(boot.elements.map((e: any) => [e.id, e]));
    for (const a of brief.availability) {
      const e: any = byId.get(a.playerId);
      expect(e.status).toBe(a.status);
      expect(e.news).toBe(a.news);
      expect(parseFloat(e.selected_by_percent)).toBeGreaterThanOrEqual(10);
      expect(a.status).not.toBe("a");
    }
  });

  it("price watch rows exist in /api/price-predictions with identical wording", async () => {
    const preds = (await getJson("/api/price-predictions")).body as any[];
    const byId = new Map(preds.map((p) => [p.player_id, p]));
    for (const p of [...brief.priceWatch.risers, ...brief.priceWatch.fallers]) {
      expect(byId.get(p.playerId).status).toBe(p.status);
    }
  });
});
