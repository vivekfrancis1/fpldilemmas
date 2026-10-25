import { describe, it, expect } from "vitest";
import { readToolManagerId, saveToolManagerId, MY_TEAM_KEY, TOOLS_KEY } from "../client/src/lib/manager-id-storage";

const fake = (init: Record<string, string> = {}) => {
  const data = { ...init };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};

describe("manager id storage for Rate My Team / Hindsight / League Comparison", () => {
  it("pre-fills from the tools' own key first", () => {
    expect(readToolManagerId(fake({ [TOOLS_KEY]: "111", [MY_TEAM_KEY]: "222" }))).toBe("111");
  });

  it("falls back to My Team's saved id for pre-filling, without writing it", () => {
    const s = fake({ [MY_TEAM_KEY]: "222" });
    expect(readToolManagerId(s)).toBe("222");
    expect(s.data[TOOLS_KEY]).toBeUndefined();
  });

  it("saving writes only the tools' own key and never touches My Team's saved id", () => {
    const s = fake({ [MY_TEAM_KEY]: "222" });
    saveToolManagerId("333", s);
    expect(s.data[TOOLS_KEY]).toBe("333");
    expect(s.data[MY_TEAM_KEY]).toBe("222");
  });

  it("returns an empty string when nothing is saved, and never throws if storage is unavailable", () => {
    expect(readToolManagerId(fake())).toBe("");
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(readToolManagerId(broken)).toBe("");
    expect(() => saveToolManagerId("1", broken)).not.toThrow();
    expect(readToolManagerId(undefined)).toBe("");
  });
});
