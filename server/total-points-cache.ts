interface CacheEntry {
  data: any;
  timestamp: number;
  ttl?: number;
}

class EnhancedCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize = 1000, defaultTTL = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  set(key: string, value: any, ttl?: number): void {
    if (this.cache.size >= this.maxSize) this.evictOldest();
    this.cache.set(key, { data: value, timestamp: Date.now(), ttl: ttl || this.defaultTTL });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > (entry.ttl || this.defaultTTL)) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🧹 Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > (entry.ttl || this.defaultTTL)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
  }
}

export const totalPointsCache = new EnhancedCache(1000, 30 * 60 * 1000);
