// Tiny in-memory sliding-window rate limiter (no dependency). Per process: with several server instances each has its
// own counts, which is fine for abuse protection on a single Railway service.

export interface RateLimiter {
  check(key: string, nowMs?: number): { allowed: boolean; retryAfterSec: number };
  size(): number;
}

export function createRateLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }): RateLimiter {
  const { limit, windowMs, maxKeys = 10_000 } = opts;
  const hits = new Map<string, number[]>();

  const prune = (now: number) => {
    for (const [key, times] of hits) {
      if (times.length === 0 || times[times.length - 1] <= now - windowMs) hits.delete(key);
    }
  };

  return {
    check(key, nowMs = Date.now()) {
      prune(nowMs);
      const recent = (hits.get(key) ?? []).filter((t) => t > nowMs - windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        // blocked attempts are not recorded, so hammering never extends the block
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - nowMs) / 1000)) };
      }
      recent.push(nowMs);
      hits.set(key, recent);
      while (hits.size > maxKeys) hits.delete(hits.keys().next().value as string);
      return { allowed: true, retryAfterSec: 0 };
    },
    size: () => hits.size,
  };
}

/**
 * Client IP behind ONE trusted proxy (Railway's edge): it appends the real client address to X-Forwarded-For, so the LAST
 * entry is trustworthy and earlier entries can be spoofed by the client. Falls back to the socket address.
 */
export function clientIpFromHeaders(forwardedFor: string | string[] | undefined, remoteAddress: string | undefined): string {
  const raw = Array.isArray(forwardedFor) ? forwardedFor.join(",") : forwardedFor ?? "";
  const last = raw.split(",").map((s) => s.trim()).filter(Boolean).pop();
  return last || remoteAddress || "unknown";
}
