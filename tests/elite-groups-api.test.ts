import { describe, it, expect } from "vitest";

// Plain HTTP client against the running dev server (see CLAUDE.md): needs `npm run dev` on port 5050 (or TEST_BASE_URL).
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:5050";

describe.each([["elite-64", "Elite 64"], ["analytics-elite-64", "Analytics Elite 64"]])("GET /api/cached/elite-group-data/%s", (id, name) => {
  it("returns the 64 members of the league with their live data, numbered 1 to 64", async () => {
    const res = await fetch(`${BASE_URL}/api/cached/elite-group-data/${id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.group.name).toBe(name);
    expect(body.managers).toHaveLength(64);
    expect(body.managers.map((m: any) => m.rank)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
    expect(new Set(body.managers.map((m: any) => m.managerId)).size).toBe(64);
    expect(body.managers.filter((m: any) => m.success).length).toBeGreaterThan(55);
    expect(body.metadata.totalManagers).toBe(64);
  }, 60000);
  it("lists each member's current squad", async () => {
    const res = await fetch(`${BASE_URL}/api/elite-groups/${id}/teams`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.teams).toHaveLength(64);
    expect(body.metadata.totalRequested).toBe(64);
    expect(body.teams.filter((t: any) => t.success).length).toBeGreaterThan(55);
  }, 60000);
});

describe("unknown groups", () => {
  it("are not found", async () => {
    expect((await fetch(`${BASE_URL}/api/cached/elite-group-data/top-100`)).status).toBe(404);
    expect((await fetch(`${BASE_URL}/api/elite-groups/nope/teams`)).status).toBe(404);
  });
});
