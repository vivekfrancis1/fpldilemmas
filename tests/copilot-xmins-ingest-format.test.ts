import { describe, it, expect } from "vitest";
import { extractCopilotRows } from "../server/copilot-xmins-ingest";

const base = { source: "x", current_gw: 6, last_updated: "", player_count: 1 };

describe("extractCopilotRows", () => {
  it("reads the current xMins_<gw> format", () => {
    const rows = extractCopilotRows({ ...base, gameweeks: [6, 7], players: [{ id: 199, name: "B", xMins_6: 89.7, xPts_6: 3.44, xMins_7: 59.2, xPts_7: 1.81 }] });
    expect(rows).toEqual([
      { playerId: 199, gameweek: 6, xMins: 89.7, xPts: 3.44 },
      { playerId: 199, gameweek: 7, xMins: 59.2, xPts: 1.81 },
    ]);
  });
  it("still reads the legacy GW<gw>_xMins format", () => {
    const rows = extractCopilotRows({ ...base, gameweeks: [3], players: [{ id: 1, name: "A", GW3_xMins: 5.3, GW3_xPts: 0.3 }] });
    expect(rows).toEqual([{ playerId: 1, gameweek: 3, xMins: 5.3, xPts: 0.3 }]);
  });
  it("skips missing values instead of zeroing them", () => {
    expect(extractCopilotRows({ ...base, gameweeks: [6], players: [{ id: 1, name: "A" }] })).toEqual([]);
  });
});
