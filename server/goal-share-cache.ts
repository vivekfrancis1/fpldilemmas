interface GoalShareCacheEntry { data: any; timestamp: number; cacheKey?: string; }
interface AssistShareCacheEntry { data: any; timestamp: number; }

let _goalShareCache: GoalShareCacheEntry | null = null;
let _assistShareCache: AssistShareCacheEntry | null = null;

export function getGoalShareCache() { return _goalShareCache; }
export function setGoalShareCache(entry: GoalShareCacheEntry) { _goalShareCache = entry; }

export function getAssistShareCache() { return _assistShareCache; }
export function setAssistShareCache(entry: AssistShareCacheEntry) { _assistShareCache = entry; }

export function clearGoalShareCaches() {
  _goalShareCache = null;
  _assistShareCache = null;
  console.log("🧹 Goal/assist share caches cleared (player histories refreshed)");
}
