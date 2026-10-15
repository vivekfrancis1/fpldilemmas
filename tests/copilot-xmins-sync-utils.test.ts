import { describe, it, expect } from "vitest";
import { hashCopilotExport, copilotDataChange } from "../server/copilot-xmins-sync-utils";

describe("hashCopilotExport", () => {
  it("is stable for identical content and differs when content changes", () => {
    expect(hashCopilotExport('{"a":1}')).toBe(hashCopilotExport('{"a":1}'));
    expect(hashCopilotExport('{"a":1}')).not.toBe(hashCopilotExport('{"a":2}'));
    expect(hashCopilotExport("x")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("copilotDataChange", () => {
  it("treats the first observation as a baseline (never triggers a refresh on startup)", () => {
    expect(copilotDataChange(undefined, "2026-10-15T18:00:00.000Z")).toBe("baseline");
  });
  it("reports unchanged when the marker is the same", () => {
    expect(copilotDataChange("2026-10-15T18:00:00.000Z", "2026-10-15T18:00:00.000Z")).toBe("unchanged");
  });
  it("reports changed when new Copilot data has landed", () => {
    expect(copilotDataChange("2026-10-09T11:29:50.825Z", "2026-10-15T18:00:00.000Z")).toBe("changed");
  });
  it("treats a missing current value (table empty / query failed) as unchanged, never a refresh", () => {
    expect(copilotDataChange("2026-10-09T11:29:50.825Z", null)).toBe("unchanged");
    expect(copilotDataChange(undefined, null)).toBe("baseline");
  });
});
