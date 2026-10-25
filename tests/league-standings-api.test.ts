import { describe, it, expect } from "vitest";

// Plain HTTP client against the running dev server (see CLAUDE.md): needs `npm run dev` on port 5050.
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:5050";
const get = (path: string) => fetch(`${BASE_URL}${path}`);

describe("GET /api/league-standings/:leagueId (any classic league, for ranking a team against it)", () => {
  it("rejects a league id that is not a whole number", async () => {
    expect((await get("/api/league-standings/abc")).status).toBe(400);
    expect((await get("/api/league-standings/12.5")).status).toBe(400);
  });

  it("says 404 for a league that does not exist", async () => {
    expect((await get("/api/league-standings/999999999")).status).toBe(404);
  });

  it("returns every manager once, with total and gameweek points, in standings order", async () => {
    const res = await get("/api/league-standings/38543"); // Elite 64 (shared/elite-groups.ts)
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.league.id).toBe(38543);
    expect(typeof body.league.name).toBe("string");
    expect(body.capped).toBe(false);
    expect(body.rows.length).toBeGreaterThan(1);
    expect(new Set(body.rows.map((r: any) => r.managerId)).size).toBe(body.rows.length);
    for (const key of ["rank", "managerId", "name", "teamName", "totalPoints", "gameweekPoints"]) expect(body.rows[0], key).toHaveProperty(key);
    const totals: number[] = body.rows.map((r: any) => r.totalPoints);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
  });

  it("flags a league too big to read in full, and returns only the capped part", async () => {
    const res = await get("/api/league-standings/314"); // Overall: millions of managers
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.capped).toBe(true);
    expect(body.rows.length).toBeLessThanOrEqual(1000);
  });
});
