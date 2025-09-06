/**
 * Result Cache Service
 * Caches completed calculation results to avoid re-running expensive formulas
 * DOES NOT modify any formulas - just stores their outputs
 */

interface CachedCalculation {
  key: string;
  result: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class ResultCacheService {
  private cache = new Map<string, CachedCalculation>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  
  /**
   * Generate cache key from calculation parameters
   */
  private generateKey(type: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    return `${type}:${JSON.stringify(sortedParams)}`;
  }
  
  /**
   * Get cached result if available and not expired
   */
  get(type: string, params: Record<string, any>): any | null {
    const key = this.generateKey(type, params);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`📋 Cache HIT: ${type} - ${key.substring(0, 50)}...`);
    return cached.result;
  }
  
  /**
   * Store calculation result in cache
   */
  set(type: string, params: Record<string, any>, result: any, ttl: number = this.DEFAULT_TTL): void {
    const key = this.generateKey(type, params);
    
    this.cache.set(key, {
      key,
      result: JSON.parse(JSON.stringify(result)), // Deep clone to avoid mutations
      timestamp: Date.now(),
      ttl
    });
    
    console.log(`💾 Cache SET: ${type} - ${key.substring(0, 50)}... (TTL: ${ttl/1000/60}min)`);
  }
  
  /**
   * Cache team goal projections (expensive calculation)
   */
  cacheTeamGoalProjections(gameweeks: string, result: any): void {
    this.set('team-goal-projections', { gameweeks }, result, 60 * 60 * 1000); // 1 hour
  }
  
  getCachedTeamGoalProjections(gameweeks: string): any | null {
    return this.get('team-goal-projections', { gameweeks });
  }
  
  /**
   * Cache goal share calculations (very expensive)
   */
  cacheGoalShare(season: string, result: any): void {
    this.set('goal-share', { season }, result, 45 * 60 * 1000); // 45 minutes
  }
  
  getCachedGoalShare(season: string): any | null {
    return this.get('goal-share', { season });
  }
  
  /**
   * Cache player projections by gameweek range
   */
  cachePlayerProjections(type: string, startGW: number, endGW: number, result: any): void {
    this.set(`player-${type}`, { startGW, endGW }, result, 45 * 60 * 1000); // 45 minutes
  }
  
  getCachedPlayerProjections(type: string, startGW: number, endGW: number): any | null {
    return this.get(`player-${type}`, { startGW, endGW });
  }
  
  /**
   * Cache clean sheet projections
   */
  cacheCleanSheetProjections(gameweeks: string, result: any): void {
    this.set('clean-sheet-projections', { gameweeks }, result, 45 * 60 * 1000); // 45 minutes
  }
  
  getCachedCleanSheetProjections(gameweeks: string): any | null {
    return this.get('clean-sheet-projections', { gameweeks });
  }
  
  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number, types: Record<string, number> } {
    const types: Record<string, number> = {};
    
    for (const [key] of this.cache.entries()) {
      const type = key.split(':')[0];
      types[type] = (types[type] || 0) + 1;
    }
    
    return {
      size: this.cache.size,
      types
    };
  }
  
  /**
   * Clear all cache (for testing or manual refresh)
   */
  clear(): void {
    this.cache.clear();
    console.log(`🗑️ Cache cleared`);
  }
}

// Singleton instance
export const resultCache = new ResultCacheService();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  resultCache.cleanup();
}, 10 * 60 * 1000);