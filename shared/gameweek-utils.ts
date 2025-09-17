/**
 * Gameweek Utilities - Dynamic calculation of current and next gameweeks
 * 
 * This module provides utilities to dynamically calculate gameweek ranges
 * instead of using hardcoded values, making the system automatically adapt
 * to the current FPL season state.
 */

export interface GameweekEvent {
  id: number;
  name?: string;
  deadline_time: string;
  finished: boolean;
  is_current?: boolean;
  is_next?: boolean;
}

export interface GameweekRange {
  start: number;
  end: number;
  list: number[];
  currentGameweek: number;
  isPreSeason: boolean;
  isSeasonEnd: boolean;
}

/**
 * Determines the current gameweek from bootstrap events data
 * Uses multiple strategies: is_current flag, deadline_time comparison, and finished status
 */
export function computeCurrentGameweek(events: GameweekEvent[]): number {
  if (!events || events.length === 0) {
    return 0; // Default to pre-season if no data
  }

  const maxGameweek = Math.max(...events.map(e => e.id));
  const minGameweek = Math.min(...events.map(e => e.id));

  // Strategy 1: Look for is_current flag
  const currentEvent = events.find(event => event.is_current);
  if (currentEvent) {
    return currentEvent.id;
  }

  // Strategy 2: Look for is_next flag (current gameweek is the previous one)
  const nextEvent = events.find(event => event.is_next);
  if (nextEvent) {
    // If next is GW1, we're in pre-season (current = 0)
    return Math.max(0, nextEvent.id - 1);
  }

  // Strategy 3: Find first unfinished gameweek and determine current
  const unfinishedEvent = events.find(event => !event.finished);
  if (unfinishedEvent) {
    // If first unfinished is GW1, we're in pre-season (current = 0)
    return Math.max(0, unfinishedEvent.id - 1);
  }

  // Strategy 4: Use deadline_time to determine current gameweek
  const now = new Date();
  for (const event of events.sort((a, b) => a.id - b.id)) {
    const deadline = new Date(event.deadline_time);
    if (deadline > now) {
      // If upcoming deadline is GW1, we're in pre-season (current = 0)
      return Math.max(0, event.id - 1);
    }
  }

  // Strategy 5: If all gameweeks are finished, return the last one
  return maxGameweek;
}

/**
 * Calculates the next N gameweeks from current position
 * Handles edge cases for pre-season, mid-season, and season end
 */
export function computeNextRange(events: GameweekEvent[], count: number = 6): GameweekRange {
  if (!events || events.length === 0) {
    // Fallback: return default range if no events data
    return {
      start: 1,
      end: Math.min(count, 38),
      list: Array.from({ length: Math.min(count, 38) }, (_, i) => i + 1),
      currentGameweek: 0,
      isPreSeason: true,
      isSeasonEnd: false
    };
  }

  const currentGameweek = computeCurrentGameweek(events);
  const maxGameweek = Math.max(...events.map(e => e.id));
  
  // Check if we're in pre-season (current gameweek is 0)
  const isPreSeason = currentGameweek === 0;
  
  // Determine the first "next" gameweek
  const nextGameweekStart = currentGameweek + 1;
  
  // Check if we're at season end (no upcoming gameweeks)
  const isSeasonEnd = nextGameweekStart > maxGameweek;

  let start: number;
  let end: number;
  let list: number[];

  if (isSeasonEnd) {
    // Season end: no upcoming gameweeks
    start = maxGameweek + 1;
    end = maxGameweek;
    list = [];
  } else if (isPreSeason) {
    // Pre-season: show first N gameweeks
    start = 1;
    end = Math.min(count, maxGameweek);
    list = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  } else {
    // Mid-season: show next N gameweeks from current + 1
    start = nextGameweekStart;
    end = Math.min(nextGameweekStart + count - 1, maxGameweek);
    
    // If start > maxGameweek, we have no upcoming gameweeks
    if (start > maxGameweek) {
      list = [];
    } else {
      list = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
  }

  return {
    start,
    end,
    list,
    currentGameweek,
    isPreSeason,
    isSeasonEnd
  };
}

/**
 * Gets default gameweek range strings for frontend components
 * Returns start and end as strings for compatibility with Select components
 */
export function getDefaultGameweekRange(events: GameweekEvent[], count: number = 6): {
  startGameweek: string;
  endGameweek: string;
} {
  const range = computeNextRange(events, count);
  
  return {
    startGameweek: range.start.toString(),
    endGameweek: range.end.toString()
  };
}

/**
 * Validates if a gameweek range is valid for the current season
 */
export function isValidGameweekRange(start: number, end: number, events: GameweekEvent[]): boolean {
  if (!events || events.length === 0) return true; // Allow any range if no data
  
  const maxGameweek = Math.max(...events.map(e => e.id));
  const minGameweek = Math.min(...events.map(e => e.id));
  
  return start >= minGameweek && end <= maxGameweek && start <= end;
}

/**
 * Gets the next N gameweeks as an array for backend processing
 * Used by daily-projections-job.ts and similar services
 */
export function getNextGameweeksList(events: GameweekEvent[], count: number = 6): number[] {
  const range = computeNextRange(events, count);
  return range.list;
}

/**
 * Formats gameweek range for display
 */
export function formatGameweekRange(range: GameweekRange): string {
  if (range.start === range.end) {
    return `GW${range.start}`;
  }
  return `GW${range.start}-${range.end}`;
}

/**
 * Gets the next N gameweeks as options for dropdown components
 * This is specifically for UI dropdowns that need a limited set of options
 * while still being dynamic based on the current gameweek
 */
export function getNextGameweeksForDropdown(events: GameweekEvent[], count: number = 12): number[] {
  const range = computeNextRange(events, count);
  return range.list;
}

/**
 * Debug function to log gameweek calculation details
 */
export function debugGameweekCalculation(events: GameweekEvent[]): void {
  if (process.env.NODE_ENV === 'development') {
    const currentGW = computeCurrentGameweek(events);
    const range = computeNextRange(events);
    
    console.log('🔍 Gameweek Calculation Debug:', {
      currentGameweek: currentGW,
      nextRange: range,
      eventsCount: events.length,
      isPreSeason: range.isPreSeason,
      isSeasonEnd: range.isSeasonEnd
    });
  }
}