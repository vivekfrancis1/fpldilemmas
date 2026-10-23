import { describe, it, expect } from "vitest";

// Plain HTTP client against the running dev server (see CLAUDE.md): needs `npm run dev` on port 5050.
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:5050";
const get = (path: string) => fetch(`${BASE_URL}${path}`);

describe("GET /api/template-team", () => {
  it("serves the Top 100 template by default and says which group it is", async () => {
    const res = await get("/api/template-team");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.group).toBe("top100");
    expect(body.managersRequested).toBe(100);
  });

  it("serves the Content Creators template with the same shape", async () => {
    const res = await get("/api/template-team?group=creators");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.group).toBe("creators");
    for (const key of ["managersRequested", "managersCounted", "formation", "startingXI", "bench", "captain", "totalValue", "gameweek"]) {
      expect(body, key).toHaveProperty(key);
    }
    expect(body.managersCounted).toBeLessThanOrEqual(body.managersRequested);
    if (body.startingXI.length) {
      expect(body.startingXI).toHaveLength(11);
      expect(body.bench).toHaveLength(4);
    }
  });

  it("rejects an unknown group", async () => {
    const res = await get("/api/template-team?group=everyone");
    expect(res.status).toBe(400);
  });
});
