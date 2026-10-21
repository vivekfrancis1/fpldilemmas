import { describe, it, expect, beforeAll } from "vitest";
import { buildCaptaincyMatrix } from "../shared/captaincy-matrix";

const teams = [
  { id: 1, name: "Arsenal", short_name: "ARS" },
  { id: 2, name: "Villa", short_name: "AVL" },
  { id: 3, name: "Chelsea", short_name: "CHE" },
];
const el = (id: number, team: number, web_name: string, type = 3, sel = "10.0") => ({
  id, team, web_name, element_type: type, selected_by_percent: sel,
});
const elements = [
  el(10, 1, "Saka"), el(11, 1, "Odegaard"), el(12, 1, "Havertz", 4), el(13, 1, "Rice"), el(14, 1, "Saliba", 2),
  el(20, 2, "Watkins", 4), el(21, 2, "Rogers"),
  el(30, 3, "Palmer"), el(31, 3, "Jackson", 4),
];
const proj = (playerId: number, gw: number | Record<number, number>, extra: object = {}) => ({
  playerId,
  gameweekProjections: typeof gw === "number" ? { "8": gw } : Object.fromEntries(Object.entries(gw).map(([k, v]) => [k, v])),
  status: "a",
  chanceOfPlayingNextRound: 100,
  news: "",
  ...extra,
});
const projections = [
  proj(10, 6.1), proj(11, 4.2), proj(12, 5.5), proj(13, 3.0), proj(14, 2.5),
  proj(20, 7.0), proj(21, 3.3),
  proj(30, 5.0), proj(31, 5.0),
];
const fx = (id: number, event: number, h: number, a: number, hd = 3, ad = 3) => ({
  id, event, team_h: h, team_a: a, team_h_difficulty: hd, team_a_difficulty: ad, finished: false,
});
const fixtures = [fx(1, 8, 1, 2, 2, 4), fx(2, 8, 3, 1, 3, 5)]; // Arsenal play twice in GW8 (double); Chelsea once

const run = (over: Partial<Parameters<typeof buildCaptaincyMatrix>[0]> = {}) =>
  buildCaptaincyMatrix({ gameweek: 8, elements, teams, fixtures, projections, ...over });

describe("buildCaptaincyMatrix", () => {
  it("lists each team's top 3 by xPts, highest first", () => {
    const arsenal = run().teams.find((t) => t.teamId === 1)!;
    expect(arsenal.candidates.map((c) => c.name)).toEqual(["Saka", "Havertz", "Odegaard"]);
    expect(arsenal.candidates.map((c) => c.xPts)).toEqual([6.1, 5.5, 4.2]);
  });

  it("captain value is exactly 2 x xPts (rounded to 2 dp)", () => {
    const saka = run().teams.find((t) => t.teamId === 1)!.candidates[0];
    expect(saka.captainPoints).toBe(12.2);
    const odd = run({ projections: [proj(10, 3.335), proj(11, 1)] }).teams.find((t) => t.teamId === 1)!.candidates[0];
    expect(odd.captainPoints).toBe(6.67);
  });

  it("breaks xPts ties by player id so the order is deterministic", () => {
    const chelsea = run().teams.find((t) => t.teamId === 3)!;
    expect(chelsea.candidates.map((c) => c.playerId)).toEqual([30, 31]);
  });

  it("lists both fixtures for a double gameweek, with the team's own difficulty", () => {
    const arsenal = run().teams.find((t) => t.teamId === 1)!;
    expect(arsenal.fixtures).toHaveLength(2);
    expect(arsenal.fixtures.map((f) => [f.opponentShort, f.isHome, f.difficulty]).sort()).toEqual([
      ["AVL", true, 2],
      ["CHE", false, 5],
    ]);
  });

  it("uses the projection value as given (a double gameweek's xPts is not recomputed or doubled)", () => {
    // 6.1 is the player's whole-gameweek value from the cached endpoint
    expect(run().teams.find((t) => t.teamId === 1)!.candidates[0].xPts).toBe(6.1);
  });

  it("a team with no fixture is a blank row with no candidates, not zero-point captains", () => {
    const out = run({ fixtures: [fx(1, 8, 1, 2)] }); // Chelsea have no GW8 fixture
    const chelsea = out.teams.find((t) => t.teamId === 3)!;
    expect(chelsea.fixtures).toEqual([]);
    expect(chelsea.candidates).toEqual([]);
  });

  it("skips players with no projection for the gameweek (never shown as 0)", () => {
    const out = run({ projections: [proj(10, { 9: 4 }), proj(11, 4.2)] });
    expect(out.teams.find((t) => t.teamId === 1)!.candidates.map((c) => c.playerId)).toEqual([11]);
  });

  it("carries the availability flag and overall ownership through unchanged", () => {
    const out = run({ projections: [proj(10, 6.1, { status: "d", chanceOfPlayingNextRound: 50, news: "Knock" })] });
    const saka = out.teams.find((t) => t.teamId === 1)!.candidates[0];
    expect(saka).toMatchObject({ status: "d", chanceOfPlayingNextRound: 50, news: "Knock", ownership: 10 });
  });

  it("orders teams by their best candidate, blank teams last", () => {
    const out = run({ fixtures: [fx(1, 8, 1, 2)] }); // Chelsea blank
    expect(out.teams.map((t) => t.teamId)).toEqual([2, 1, 3]); // Villa 7.0, Arsenal 6.1, Chelsea blank
  });

  it("honours topN", () => {
    expect(run({ topN: 1 }).teams.find((t) => t.teamId === 1)!.candidates).toHaveLength(1);
  });
});

const BASE_URL = `http://localhost:5050`;
async function getJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}

describe("GET /api/captaincy-matrix (consistency with the Points page projections)", () => {
  let cached: any[];
  let bootstrap: any;
  let gw: number;

  beforeAll(async () => {
    cached = (await getJson("/api/cached/player-total-points")).body;
    bootstrap = (await getJson("/api/bootstrap-static")).body;
    gw = Math.min(...Object.keys(cached[0].gameweekProjections).map(Number));
  }, 120000);

  it("returns one row per Premier League team", async () => {
    const { status, body } = await getJson(`/api/captaincy-matrix?gw=${gw}`);
    expect(status).toBe(200);
    expect(body.gameweek).toBe(gw);
    expect(body.teams).toHaveLength(bootstrap.teams.length);
  });

  it("every listed player's xPts equals that player's value in the cached projection endpoint", async () => {
    const { body } = await getJson(`/api/captaincy-matrix?gw=${gw}`);
    const byId = new Map(cached.map((p) => [p.playerId, p]));
    let checked = 0;
    for (const team of body.teams) {
      for (const c of team.candidates) {
        expect(c.xPts).toBe(byId.get(c.playerId).gameweekProjections[String(gw)]);
        expect(c.captainPoints).toBe(Math.round(c.xPts * 2 * 100) / 100);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("each team's list is its top players by xPts for that gameweek", async () => {
    const { body } = await getJson(`/api/captaincy-matrix?gw=${gw}`);
    const teamOf = new Map<number, number>(bootstrap.elements.map((e: any) => [e.id, e.team]));
    for (const team of body.teams) {
      if (team.candidates.length === 0) continue;
      const expected = cached
        .filter((p) => teamOf.get(p.playerId) === team.teamId && typeof p.gameweekProjections?.[String(gw)] === "number")
        .sort((a, b) => b.gameweekProjections[String(gw)] - a.gameweekProjections[String(gw)] || a.playerId - b.playerId)
        .slice(0, 3)
        .map((p) => p.playerId);
      expect(team.candidates.map((c: any) => c.playerId)).toEqual(expected);
    }
  });

  it("defaults to the first projected gameweek and lists the gameweeks that can be requested", async () => {
    const { body } = await getJson(`/api/captaincy-matrix`);
    expect(body.gameweek).toBe(gw);
    expect(body.availableGameweeks).toContain(gw);
    expect(body.availableGameweeks).toEqual([...body.availableGameweeks].sort((a: number, b: number) => a - b));
  });

  it("rejects a bad or unprojected gameweek with 400", async () => {
    for (const bad of ["abc", "0", "39", "-1", "2.5"]) {
      expect((await getJson(`/api/captaincy-matrix?gw=${bad}`)).status).toBe(400);
    }
    expect((await getJson(`/api/captaincy-matrix?gw=1`)).status).toBe(400); // past, not projected
  });
});
