import { describe, it, expect, beforeAll } from "vitest";
import { bestPossible, type HindsightPick } from "../shared/hindsight";

const P = (id: number, elementType: 1 | 2 | 3 | 4, points: number): HindsightPick => ({ id, elementType, points });
// 2 GKP, 5 DEF, 5 MID, 3 FWD
const squad = (g: number[], d: number[], m: number[], f: number[]): HindsightPick[] => [
  ...g.map((x, i) => P(1 + i, 1, x)),
  ...d.map((x, i) => P(11 + i, 2, x)),
  ...m.map((x, i) => P(21 + i, 3, x)),
  ...f.map((x, i) => P(31 + i, 4, x)),
];
const week = squad([6, 1], [9, 6, 2, 2, 1], [12, 8, 5, 2, 2], [10, 3, 2]);

describe("bestPossible", () => {
  it("normal week: best legal XI from the 15, plus the top scorer's points a second time", () => {
    const out = bestPossible(week, null);
    expect(out.starting).toHaveLength(11);
    expect(out.captainId).toBe(21); // 12 points is the top score
    expect(out.captainMultiplier).toBe(2);
    const sum = out.starting.reduce((a, p) => a + p.points, 0);
    expect(out.total).toBe(sum + 12);
    expect(out.formation).toMatch(/^\d-\d-\d$/);
  });

  it("the captain is always the highest-scoring player of the 15 (he always makes the best XI)", () => {
    for (let i = 0; i < 50; i++) {
      const s = squad(
        [i % 7, (i * 3) % 5],
        [i % 9, (i * 2) % 8, i % 4, i % 6, 1],
        [(i * 5) % 13, i % 10, (i * 7) % 9, 2, 3],
        [(i * 11) % 16, (i * 3) % 7, 1],
      );
      const out = bestPossible(s, null);
      const top = Math.max(...s.map((p) => p.points));
      expect(s.find((p) => p.id === out.captainId)!.points).toBe(top);
    }
  });

  it("Triple Captain: the captain counts three times", () => {
    const base = bestPossible(week, null);
    const tc = bestPossible(week, "3xc");
    expect(tc.captainMultiplier).toBe(3);
    expect(tc.total).toBe(base.total + 12);
  });

  it("Bench Boost: all 15 count, captain still doubled, no formation", () => {
    const bb = bestPossible(week, "bboost");
    const all = week.reduce((a, p) => a + p.points, 0);
    expect(bb.starting).toHaveLength(15);
    expect(bb.total).toBe(all + 12);
    expect(bb.formation).toBeNull();
    expect(bb.bench).toHaveLength(0);
  });

  it("Wildcard and Free Hit do not change scoring", () => {
    const base = bestPossible(week, null);
    expect(bestPossible(week, "wildcard").total).toBe(base.total);
    expect(bestPossible(week, "freehit").total).toBe(base.total);
  });

  it("negative scores are allowed and never forced into the XI when a better legal option exists", () => {
    const s = squad([6, -1], [9, 6, 2, 1, -3], [12, 8, 5, 2, -4], [10, 3, -1]);
    const out = bestPossible(s, null);
    expect(out.starting.some((p) => p.points < 0)).toBe(false);
  });

  it("returns an incomplete result for fewer than 11 players instead of crashing", () => {
    const out = bestPossible([P(1, 1, 3), P(11, 2, 4)], null);
    expect(out.complete).toBe(false);
    expect(out.total).toBe(0);
  });
});

const BASE_URL = `http://localhost:5050`;
async function getJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}

describe("GET /api/hindsight/:managerId (against real finished gameweeks)", () => {
  let top: any;
  let boot: any;
  let latest: number;

  beforeAll(async () => {
    top = (await getJson("/api/top-managers/teams")).body;
    boot = (await getJson("/api/bootstrap-static")).body;
    latest = Math.max(...boot.events.filter((e: any) => e.finished).map((e: any) => e.id));
  }, 180000);

  it("for Top 100 managers: best possible is never below the official points, and the gap is exact", async () => {
    const ids = top.teams.filter((t: any) => t.success).slice(0, 6).map((t: any) => t.managerId);
    let checked = 0;
    for (const id of ids) {
      const { status, body } = await getJson(`/api/hindsight/${id}?gw=${latest}`);
      if (status !== 200) continue; // a manager with no squad that week is skipped, not failed
      expect(body.gameweek).toBe(latest);
      expect(body.bestPossible).toBeGreaterThanOrEqual(body.officialPoints);
      expect(body.gap).toBe(body.bestPossible - body.officialPoints);
      expect(body.picks).toHaveLength(15);
      checked++;
    }
    expect(checked).toBeGreaterThan(2);
  });

  it("defaults to the latest finished gameweek and lists the finished gameweeks", async () => {
    const id = top.teams.find((t: any) => t.success).managerId;
    const { body } = await getJson(`/api/hindsight/${id}`);
    expect(body.gameweek).toBe(latest);
    expect(body.finishedGameweeks).toContain(latest);
  });

  it("player points equal the official live feed", async () => {
    const id = top.teams.find((t: any) => t.success).managerId;
    const { body } = await getJson(`/api/hindsight/${id}?gw=${latest}`);
    const live = (await getJson(`/api/event/${latest}/live`)).body;
    const pts = new Map(live.elements.map((e: any) => [e.id, e.stats.total_points]));
    for (const p of body.picks) expect(p.points).toBe(pts.get(p.id) ?? 0);
  });

  it("rejects bad input: non-numeric id 400, unknown manager 404, bad or unfinished gameweek 400", async () => {
    const id = top.teams.find((t: any) => t.success).managerId;
    expect((await getJson(`/api/hindsight/abc`)).status).toBe(400);
    expect((await getJson(`/api/hindsight/999999999?gw=${latest}`)).status).toBe(404);
    for (const bad of ["0", "39", "abc", "2.5"]) {
      expect((await getJson(`/api/hindsight/${id}?gw=${bad}`)).status).toBe(400);
    }
    const unfinished = boot.events.find((e: any) => !e.finished).id;
    expect((await getJson(`/api/hindsight/${id}?gw=${unfinished}`)).status).toBe(400);
  });
});
