// Minimal in-memory TTL cache with a size bound (oldest entry dropped first). Per process.
export interface TtlCache<T> {
  get(key: string, nowMs?: number): T | undefined;
  set(key: string, value: T, nowMs?: number): void;
  size(): number;
}

export function createTtlCache<T>(ttlMs: number, maxEntries = 500): TtlCache<T> {
  const map = new Map<string, { value: T; at: number }>();
  return {
    get(key, nowMs = Date.now()) {
      const hit = map.get(key);
      if (!hit) return undefined;
      if (nowMs - hit.at >= ttlMs) {
        map.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key, value, nowMs = Date.now()) {
      map.delete(key); // re-insert so overwritten keys count as newest
      map.set(key, { value, at: nowMs });
      while (map.size > maxEntries) map.delete(map.keys().next().value as string);
    },
    size: () => map.size,
  };
}
