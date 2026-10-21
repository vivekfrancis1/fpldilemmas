import { describe, it, expect } from "vitest";
import { createRateLimiter, clientIpFromHeaders, isLoopback } from "../shared/rate-limiter";
import { createTtlCache } from "../shared/ttl-cache";

describe("createRateLimiter (sliding window per key)", () => {
  it("allows up to the limit, then blocks with a retry time", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 1_000).allowed).toBe(true);
    expect(rl.check("a", 2_000).allowed).toBe(true);
    const blocked = rl.check("a", 3_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(57); // the oldest hit (t=0) expires at 60s; 57s from t=3s
  });

  it("frees a slot as the oldest request leaves the window", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 10_000 });
    rl.check("a", 0);
    rl.check("a", 5_000);
    expect(rl.check("a", 9_999).allowed).toBe(false);
    expect(rl.check("a", 10_000).allowed).toBe(true);
  });

  it("keys are independent", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 1).allowed).toBe(false);
    expect(rl.check("b", 1).allowed).toBe(true);
  });

  it("blocked attempts do not extend the block", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 10_000 });
    rl.check("a", 0);
    for (let t = 1; t < 9_000; t += 500) rl.check("a", t); // hammering while blocked
    expect(rl.check("a", 10_000).allowed).toBe(true);
  });

  it("memory is bounded: the oldest keys are dropped past maxKeys", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 3 });
    for (const k of ["a", "b", "c", "d"]) rl.check(k, 0);
    expect(rl.size()).toBeLessThanOrEqual(3);
  });

  it("expired keys are forgotten", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1_000 });
    rl.check("a", 0);
    rl.check("b", 5_000); // triggers cleanup of expired "a"
    expect(rl.size()).toBe(1);
  });
});

describe("clientIpFromHeaders (one trusted proxy: the LAST X-Forwarded-For entry was added by it)", () => {
  it("uses the last forwarded address, ignoring spoofed earlier ones", () => {
    expect(clientIpFromHeaders("6.6.6.6, 203.0.113.9", "10.0.0.1")).toBe("203.0.113.9");
    expect(clientIpFromHeaders("203.0.113.9", "10.0.0.1")).toBe("203.0.113.9");
  });

  it("falls back to the socket address when there is no header", () => {
    expect(clientIpFromHeaders(undefined, "198.51.100.4")).toBe("198.51.100.4");
    expect(clientIpFromHeaders("", "198.51.100.4")).toBe("198.51.100.4");
  });

  it("handles an array header and whitespace; unknown when nothing is available", () => {
    expect(clientIpFromHeaders(["1.1.1.1, 2.2.2.2 "], undefined)).toBe("2.2.2.2");
    expect(clientIpFromHeaders(undefined, undefined)).toBe("unknown");
  });
});

describe("isLoopback (local dev and tests are exempt from throttling)", () => {
  it("recognises loopback addresses, including IPv4-mapped IPv6", () => {
    for (const ip of ["127.0.0.1", "::1", "::ffff:127.0.0.1", "127.5.5.5"]) expect(isLoopback(ip)).toBe(true);
  });

  it("does not exempt real or unknown addresses", () => {
    for (const ip of ["203.0.113.9", "10.0.0.1", "unknown", "", "::ffff:203.0.113.9"]) expect(isLoopback(ip)).toBe(false);
  });
});

describe("createTtlCache", () => {
  it("returns a stored value until it expires", () => {
    const c = createTtlCache<number>(1000);
    c.set("a", 1, 0);
    expect(c.get("a", 999)).toBe(1);
    expect(c.get("a", 1000)).toBeUndefined();
  });

  it("returns undefined for unknown keys and overwrites on set", () => {
    const c = createTtlCache<string>(1000);
    expect(c.get("x", 0)).toBeUndefined();
    c.set("x", "one", 0);
    c.set("x", "two", 500);
    expect(c.get("x", 1400)).toBe("two");
  });

  it("is bounded: the oldest entries are dropped past maxEntries", () => {
    const c = createTtlCache<number>(10_000, 2);
    c.set("a", 1, 0);
    c.set("b", 2, 1);
    c.set("c", 3, 2);
    expect(c.get("a", 3)).toBeUndefined();
    expect(c.get("c", 3)).toBe(3);
    expect(c.size()).toBeLessThanOrEqual(2);
  });
});
