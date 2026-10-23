import { describe, it, expect } from "vitest";
import { SOCIAL_NETWORKS, buildShareLinks, defaultCaption, xCaption } from "../shared/social-share";

const url = "https://fpldilemmas.com/graphics?t=player-card&p=411";

describe("defaultCaption", () => {
  it("names the graphic, the site and the FPL hashtags", () => {
    const c = defaultCaption("Player Card");
    expect(c).toContain("Player Card");
    expect(c).toContain("fpldilemmas.com");
    expect(c).toContain("#FPL");
  });

  it("stays short enough for every network, even with a long title", () => {
    expect(defaultCaption("x".repeat(500)).length).toBeLessThanOrEqual(200);
  });
});

describe("xCaption", () => {
  it("leaves a short caption alone", () => {
    expect(xCaption("Hello #FPL", url)).toBe("Hello #FPL");
  });

  it("shortens a long caption so caption + space + link (counted as 23) fits in 280", () => {
    const out = xCaption("a".repeat(400), url);
    expect(out.length + 1 + 23).toBeLessThanOrEqual(280);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("buildShareLinks", () => {
  const links = buildShareLinks({ caption: "GW8 captains #FPL & more", url });

  it("X: the post composer with the caption and the link, both encoded", () => {
    const u = new URL(links.x!);
    expect(u.origin + u.pathname).toBe("https://x.com/intent/post");
    expect(u.searchParams.get("text")).toBe("GW8 captains #FPL & more");
    expect(u.searchParams.get("url")).toBe(url);
  });

  it("Facebook: the sharer with the link", () => {
    const u = new URL(links.facebook!);
    expect(u.origin + u.pathname).toBe("https://www.facebook.com/sharer/sharer.php");
    expect(u.searchParams.get("u")).toBe(url);
  });

  it("WhatsApp: one text with the caption and the link", () => {
    const u = new URL(links.whatsapp!);
    expect(u.origin + u.pathname).toBe("https://wa.me/");
    expect(u.searchParams.get("text")).toBe(`GW8 captains #FPL & more ${url}`);
  });

  it("Telegram and LinkedIn carry the link (and the caption for Telegram)", () => {
    const t = new URL(links.telegram!);
    expect(t.searchParams.get("url")).toBe(url);
    expect(t.searchParams.get("text")).toBe("GW8 captains #FPL & more");
    const l = new URL(links.linkedin!);
    expect(l.searchParams.get("url")).toBe(url);
  });

  it("Instagram has no web composer, so there is no link (the app asks the person to post the saved image)", () => {
    expect(links.instagram).toBeNull();
  });

  it("every network is listed once, with a label, and every network has a link entry", () => {
    const ids = SOCIAL_NETWORKS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["x", "facebook", "instagram", "whatsapp", "telegram", "linkedin"]);
    for (const n of SOCIAL_NETWORKS) {
      expect(n.label.length).toBeGreaterThan(0);
      expect(n.id in links).toBe(true);
    }
  });
});
