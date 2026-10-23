import { describe, it, expect } from "vitest";
import { LINK_CARD_HEIGHT, LINK_CARD_WIDTH, fitContain, sharePath } from "../client/src/lib/share-link";

describe("fitContain (the graphic centred on the 1200x630 link card)", () => {
  it("a square graphic is as tall as the card allows and centred", () => {
    const r = fitContain(1080, 1080, LINK_CARD_WIDTH, LINK_CARD_HEIGHT, 20);
    expect(r.height).toBe(590);
    expect(r.width).toBe(590);
    expect(r.x).toBe((LINK_CARD_WIDTH - 590) / 2);
    expect(r.y).toBe(20);
  });

  it("a wide graphic is limited by the width", () => {
    const r = fitContain(2400, 600, 1200, 630, 0);
    expect(r.width).toBe(1200);
    expect(r.height).toBe(300);
    expect(r.y).toBe(165);
  });

  it("a tall graphic is limited by the height and never overflows the padded box", () => {
    const r = fitContain(1080, 1350, LINK_CARD_WIDTH, LINK_CARD_HEIGHT, 24);
    expect(r.height).toBeLessThanOrEqual(LINK_CARD_HEIGHT - 48);
    expect(r.x).toBeGreaterThanOrEqual(24);
    expect(r.x + r.width).toBeLessThanOrEqual(LINK_CARD_WIDTH - 24);
    expect(r.width / r.height).toBeCloseTo(1080 / 1350, 2);
  });
});

describe("sharePath", () => {
  it("is the current page's path and query, which reopens the same graphic", () => {
    expect(sharePath({ pathname: "/graphics", search: "?t=price-change&size=portrait", hash: "" })).toBe("/graphics?t=price-change&size=portrait");
    expect(sharePath({ pathname: "/player-plot", search: "", hash: "#x" })).toBe("/player-plot");
  });
});
