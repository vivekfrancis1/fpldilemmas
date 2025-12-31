// Shared utility for applying availability adjustments (injuries, suspensions) to player projections
// Uses only official FPL API data (chanceOfPlayingNextRound, status, news)

export interface BootstrapData {
  events?: Array<{
    id: number;
    deadline_time: string;
  }>;
}

export interface PlayerAvailabilityInfo {
  chanceOfPlayingNextRound: number | null;
  status: string;
  news: string | null;
}

export interface GameweekMultipliers {
  [gameweek: number]: number;
}

export function getGameweekMultipliers(
  playerInfo: PlayerAvailabilityInfo | undefined | null,
  gameweeks: number[],
  currentGameweek: number,
  bootstrapData?: BootstrapData
): GameweekMultipliers {
  const multipliers: GameweekMultipliers = {};
  
  gameweeks.forEach(gw => {
    multipliers[gw] = 1;
  });

  if (!playerInfo) {
    return multipliers;
  }

  const chance = playerInfo.chanceOfPlayingNextRound ?? 100;
  const nextGameweek = currentGameweek + 1;

  if (chance === 100) {
    return multipliers;
  }

  if (chance > 0 && chance < 100) {
    const factor = chance / 100;
    if (gameweeks.includes(nextGameweek)) {
      multipliers[nextGameweek] = factor;
    }
  } else if (chance === 0) {
    const returnDate = parseReturnDate(playerInfo.news || '');
    
    let returnGameweek: number | null = null;
    if (returnDate && bootstrapData) {
      returnGameweek = getGameweekFromDate(returnDate, bootstrapData);
    }
    
    if (!returnGameweek) {
      returnGameweek = currentGameweek + 3;
    }

    gameweeks.forEach(gw => {
      if (gw < returnGameweek!) {
        multipliers[gw] = 0;
      }
    });
  }

  return multipliers;
}

export interface PlayerWithProjections {
  playerName: string;
  chanceOfPlayingNextRound?: number | null;
  status?: string;
  news?: string;
  gameweekProjections: { [gameweek: string]: number };
  totalExpectedPoints?: number;
  averagePerGameweek?: number;
  averageValue?: number;
  price?: number;
  originalGameweekProjections?: { [gameweek: string]: number };
  availabilityAdjustments?: { [gameweek: string]: { original: number; adjusted: number; reason: string } };
  // Per-gameweek component breakdowns
  pointsFromGoals?: { [gameweek: string]: number };
  pointsFromAssists?: { [gameweek: string]: number };
  pointsFromCleanSheets?: { [gameweek: string]: number };
  pointsFromDefensiveContributions?: { [gameweek: string]: number };
  pointsFromMinutes?: { [gameweek: string]: number };
  pointsFromBonus?: { [gameweek: string]: number };
  pointsFromSaves?: { [gameweek: string]: number };
  pointsFromGoalsConceded?: { [gameweek: string]: number };
  pointsFromYellowCards?: { [gameweek: string]: number };
  pointsFromRedCards?: { [gameweek: string]: number };
  // Original per-gameweek component projections (before availability adjustments)
  originalComponentProjections?: { [component: string]: { [gameweek: string]: number } };
}

// Parse return date from injury/suspension news text
export function parseReturnDate(newsText: string): Date | null {
  if (!newsText) return null;
  
  // Try multiple patterns for different date formats
  const patterns = [
    // "Expected back 18 Oct", "Return date 25 Nov", "Due back 03 Dec", "Suspended until 25 Oct"
    /(?:expected back|return date|due back|back|suspended until)\s+(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    // "Expected back October 25", "Due back November 18", "Suspended until October 25"
    /(?:expected back|return date|due back|back|suspended until)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
    // "Expected back 25th October", "Due back 18th November"
    /(?:expected back|return date|due back|back)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    // "October 25", "November 18" (simple format)
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
    // "25 October", "18 November" (day first)
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i
  ];
  
  const monthMap: { [key: string]: number } = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, 
    apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8, 
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
  };
  
  for (const pattern of patterns) {
    const match = newsText.match(pattern);
    if (match) {
      let day: number;
      let monthStr: string;
      
      // Handle different match group arrangements
      if (pattern.source.includes('(\\d{1,2}).*?(january|february')) {
        // Pattern 3: "25th October"
        day = parseInt(match[1]);
        monthStr = match[2].toLowerCase();
      } else if (pattern.source.includes('(january|february.*?(\\d{1,2})')) {
        // Pattern 2: "October 25"
        monthStr = match[1].toLowerCase();
        day = parseInt(match[2]);
      } else if (match[1] && match[2]) {
        // Handle both day-first and month-first patterns
        const first = match[1];
        const second = match[2];
        
        if (isNaN(parseInt(first))) {
          // First part is month name
          monthStr = first.toLowerCase();
          day = parseInt(second);
        } else {
          // First part is day number
          day = parseInt(first);
          monthStr = second.toLowerCase();
        }
      } else {
        continue;
      }
      
      const month = monthMap[monthStr];
      if (month === undefined) continue;
      
      // Use current year, but if month is before current month, use next year
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      const year = month < currentMonth ? currentYear + 1 : currentYear;
      
      return new Date(year, month, day);
    }
  }
  
  return null;
}

// Convert return date to gameweek number
export function getGameweekFromDate(date: Date, bootstrapData: BootstrapData): number | null {
  if (!bootstrapData?.events) return null;
  
  // Based on user examples: Oct 4 = GW7, Oct 18 = GW8, Oct 25 = GW9
  // Pattern: return dates up to ~1 day after deadline still belong to that gameweek
  const sortedEvents = bootstrapData.events.sort((a, b) => a.id - b.id);
  
  for (const event of sortedEvents) {
    const deadlineDate = new Date(event.deadline_time);
    // Add 24 hours buffer after deadline for gameweek period
    const gameweekEnd = new Date(deadlineDate.getTime() + 24 * 60 * 60 * 1000);
    
    // If return date is within the gameweek period (before deadline + 1 day), 
    // they can return during this gameweek
    if (date <= gameweekEnd) {
      return event.id;
    }
  }
  
  // If date is after all gameweek periods, return the last gameweek
  const lastEvent = sortedEvents[sortedEvents.length - 1];
  if (lastEvent) {
    return lastEvent.id;
  }
  
  return null;
}

// Apply availability adjustments to player projected points
// Uses only official FPL API data (chanceOfPlayingNextRound, status, news)
export function applyAvailabilityAdjustments<T extends PlayerWithProjections>(
  player: T,
  bootstrapData: BootstrapData,
  currentGameweek: number
): T {
  const chanceOfPlaying = player.chanceOfPlayingNextRound ?? 100;
  const status = player.status || 'a';
  const news = player.news || '';
  
  // If fully available, no adjustments needed
  if (chanceOfPlaying >= 100 && status === 'a') {
    return player;
  }
  
  const adjustedPlayer = { ...player };
  const adjustedProjections = { ...player.gameweekProjections };
  const originalProjections = { ...player.gameweekProjections };
  const availabilityAdjustments: { [gameweek: string]: { original: number; adjusted: number; reason: string } } = {};
  
  if (chanceOfPlaying === 0) {
    // 0% availability - suspended or injured
    const returnDate = parseReturnDate(news);
    
    if (returnDate) {
      // Zero out projections for gameweeks before return date
      const returnGameweek = getGameweekFromDate(returnDate, bootstrapData);
      
      Object.keys(adjustedProjections).forEach(gwKey => {
        const gw = parseInt(gwKey);
        if (returnGameweek && gw < returnGameweek) {
          const original = adjustedProjections[gwKey];
          adjustedProjections[gwKey] = 0;
          if (original > 0) {
            availabilityAdjustments[gwKey] = {
              original,
              adjusted: 0,
              reason: `Injured/suspended until GW${returnGameweek}`
            };
          }
        }
      });
    } else {
      // No return date - zero out all projections
      Object.keys(adjustedProjections).forEach(gwKey => {
        const original = adjustedProjections[gwKey];
        adjustedProjections[gwKey] = 0;
        if (original > 0) {
          availabilityAdjustments[gwKey] = {
            original,
            adjusted: 0,
            reason: status === 's' ? 'Suspended' : status === 'i' ? 'Injured' : 'Unavailable'
          };
        }
      });
    }
  } else if (chanceOfPlaying === 25 || chanceOfPlaying === 50 || chanceOfPlaying === 75) {
    // Partial availability - multiply next gameweek only
    const nextGameweek = (currentGameweek + 1).toString();
    if (adjustedProjections[nextGameweek] !== undefined) {
      const multiplier = chanceOfPlaying / 100;
      const original = adjustedProjections[nextGameweek];
      adjustedProjections[nextGameweek] = adjustedProjections[nextGameweek] * multiplier;
      
      if (original !== adjustedProjections[nextGameweek]) {
        availabilityAdjustments[nextGameweek] = {
          original,
          adjusted: adjustedProjections[nextGameweek],
          reason: `${chanceOfPlaying}% chance of playing`
        };
      }
    }
  }
  
  // Recalculate totals and averages after adjustments
  const gameweekCount = Object.keys(adjustedProjections).length;
  const newTotalExpectedPoints = Object.values(adjustedProjections).reduce((sum, points) => sum + points, 0);
  const newAveragePerGameweek = gameweekCount > 0 ? newTotalExpectedPoints / gameweekCount : 0;
  const newAverageValue = player.price && player.price > 0 ? newAveragePerGameweek / player.price : 0;
  
  // Calculate overall availability factor based on total change
  const originalTotal = Object.values(originalProjections).reduce((sum, points) => sum + points, 0);
  const availabilityFactor = originalTotal > 0 ? newTotalExpectedPoints / originalTotal : 1;
  
  // Apply availability factor to component totals (proportional reduction)
  const componentTotalKeys = [
    'totalPointsFromGoals', 'totalPointsFromAssists', 'totalPointsFromCleanSheets',
    'totalPointsFromDefensiveContributions', 'totalPointsFromMinutes', 'totalPointsFromBonus',
    'totalPointsFromSaves', 'totalPointsFromGoalsConceded', 'totalPointsFromYellowCards', 'totalPointsFromRedCards'
  ];
  
  // Per-gameweek component keys (maps to the per-gameweek breakdown objects)
  const componentGwKeys = [
    'pointsFromGoals', 'pointsFromAssists', 'pointsFromCleanSheets',
    'pointsFromDefensiveContributions', 'pointsFromMinutes', 'pointsFromBonus',
    'pointsFromSaves', 'pointsFromGoalsConceded', 'pointsFromYellowCards', 'pointsFromRedCards'
  ];
  
  // Store original component values and apply adjustments to totals
  const originalComponentTotals: { [key: string]: number } = {};
  componentTotalKeys.forEach(key => {
    const originalValue = (player as any)[key];
    if (originalValue !== undefined) {
      originalComponentTotals[key] = originalValue;
      (adjustedPlayer as any)[key] = Math.round(originalValue * availabilityFactor * 100) / 100;
    }
  });
  
  // Store original per-gameweek component projections and apply adjustments
  const originalComponentProjections: { [component: string]: { [gameweek: string]: number } } = {};
  componentGwKeys.forEach(compKey => {
    const compData = (player as any)[compKey];
    if (compData && typeof compData === 'object') {
      // Store original values
      originalComponentProjections[compKey] = { ...compData };
      
      // Apply adjustments per gameweek
      const adjustedCompData: { [gameweek: string]: number } = {};
      Object.keys(compData).forEach(gwKey => {
        const gwAdjustment = availabilityAdjustments[gwKey];
        if (gwAdjustment) {
          // Apply the same multiplier used for the total gameweek projection
          const multiplier = gwAdjustment.original > 0 ? gwAdjustment.adjusted / gwAdjustment.original : 0;
          adjustedCompData[gwKey] = Math.round(compData[gwKey] * multiplier * 100) / 100;
        } else {
          adjustedCompData[gwKey] = compData[gwKey];
        }
      });
      (adjustedPlayer as any)[compKey] = adjustedCompData;
    }
  });
  
  adjustedPlayer.gameweekProjections = adjustedProjections;
  adjustedPlayer.originalGameweekProjections = originalProjections;
  adjustedPlayer.availabilityAdjustments = availabilityAdjustments;
  (adjustedPlayer as any).originalComponentTotals = originalComponentTotals;
  (adjustedPlayer as any).originalComponentProjections = originalComponentProjections;
  adjustedPlayer.totalExpectedPoints = Math.round(newTotalExpectedPoints * 100) / 100;
  adjustedPlayer.averagePerGameweek = Math.round(newAveragePerGameweek * 100) / 100;
  adjustedPlayer.averageValue = Math.round(newAverageValue * 100) / 100;
  
  return adjustedPlayer;
}
