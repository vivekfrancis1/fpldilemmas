import { describe, it, expect, beforeAll } from "vitest";
import { findHistoricalByCode, projectionWindow } from "../shared/compare-utils";

const BASE_URL = `http://localhost:5050`;

async function getJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

// The Compare page reads three live endpoints and joins them. These checks pin the joins it relies on:
// projections by element id, past seasons by FPL player code (never by name).
let bootstrap: any;
let projections: any[];

beforeAll(async () => {
  [bootstrap, projections] = await Promise.all([
    getJson("/api/bootstrap-static"),
    getJson("/api/cached/player-total-points"),
  ]);
}, 120000);

describe("Compare page data contract", () => {
  it("every projection's playerId is a current element id, and its xPts window equals the endpoint's own values", () => {
    const ids = new Set(bootstrap.elements.map((e: any) => e.id));
    for (const p of projections.slice(0, 200)) {
      expect(ids.has(p.playerId)).toBe(true);
    }
    const sample = projections.find((p) => p.gameweekProjections && Object.keys(p.gameweekProjections).length >= 5)!;
    const w = projectionWindow(sample.gameweekProjections, 5);
    expect(w.perGameweek).toEqual(w.gameweeks.map((gw) => sample.gameweekProjections[String(gw)]));
  });

  it("current players expose a numeric FPL code", () => {
    for (const e of bootstrap.elements.slice(0, 50)) expect(typeof e.code).toBe("number");
  });

  it("last season's rows carry a unique code per player, and a current player's code finds the right row", async () => {
    const rows = await getJson(`/api/players/historical/${encodeURIComponent("2025/26")}`);
    const codes = rows.map((r: any) => r.element_code ?? r.elementCode);
    expect(codes.every((c: any) => typeof c === "number" && c > 0)).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);

    const haaland = bootstrap.elements.find((e: any) => e.web_name === "Haaland");
    const row = findHistoricalByCode(rows, haaland.code)!;
    expect(row).not.toBeNull();
    expect(row.web_name).toBe("Haaland");
  });

  it("a current player with no row in a past season gets no match rather than a name-based guess", async () => {
    const rows = await getJson(`/api/players/historical/${encodeURIComponent("2016/17")}`); // small dataset
    const codes = new Set(rows.map((r: any) => r.element_code ?? r.elementCode));
    const missing = bootstrap.elements.find((e: any) => !codes.has(e.code));
    expect(findHistoricalByCode(rows, missing.code)).toBeNull();
  });
});
