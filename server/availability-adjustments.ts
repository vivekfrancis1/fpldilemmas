// Server-side availability adjustments for player projections
// Uses only official FPL API data (chance_of_playing_next_round, status, news)

export interface BootstrapElement {
  web_name: string;
  first_name: string;
  second_name: string;
  chance_of_playing_next_round: number | null;
  status: string;
  news: string;
}

export interface BootstrapEvent {
  id: number;
  deadline_time: string;
}

// Parse return date from injury/suspension news text
export function parseReturnDate(newsText: string): Date | null {
  if (!newsText) return null;
  
  const patterns = [
    /(?:expected back|return date|due back|back|suspended until)\s+(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    /(?:expected back|return date|due back|back|suspended until)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
    /(?:expected back|return date|due back|back)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
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
      
      if (match[1] && match[2]) {
        const first = match[1];
        const second = match[2];
        
        if (isNaN(parseInt(first))) {
          monthStr = first.toLowerCase();
          day = parseInt(second);
        } else {
          day = parseInt(first);
          monthStr = second.toLowerCase();
        }
      } else {
        continue;
      }
      
      const month = monthMap[monthStr];
      if (month === undefined) continue;
      
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
export function getGameweekFromDate(date: Date, events: BootstrapEvent[]): number | null {
  if (!events || events.length === 0) return null;
  
  const sortedEvents = events.sort((a, b) => a.id - b.id);
  
  for (const event of sortedEvents) {
    const deadlineDate = new Date(event.deadline_time);
    const gameweekEnd = new Date(deadlineDate.getTime() + 24 * 60 * 60 * 1000);
    
    if (date <= gameweekEnd) {
      return event.id;
    }
  }
  
  const lastEvent = sortedEvents[sortedEvents.length - 1];
  return lastEvent ? lastEvent.id : null;
}

// Apply availability adjustment to a single gameweek's projected points
// Uses only official FPL API data (chance_of_playing_next_round, status, news)
export function applyAvailabilityToGameweek(
  playerName: string,
  gameweek: number,
  projectedPoints: number,
  chanceOfPlaying: number | null,
  status: string,
  news: string,
  events: BootstrapEvent[],
  currentGameweek: number
): { adjustedPoints: number; reason?: string } {
  const playerChance = chanceOfPlaying ?? 100;
  
  if (playerChance === 0) {
    // Player is unavailable - check return date
    const returnDate = parseReturnDate(news);
    if (returnDate) {
      const returnGameweek = getGameweekFromDate(returnDate, events);
      if (returnGameweek && gameweek < returnGameweek) {
        return {
          adjustedPoints: 0,
          reason: `Injured/Suspended until GW${returnGameweek}`
        };
      }
    } else if (gameweek === currentGameweek + 1) {
      // No return date but 0% chance - assume out for next gameweek only
      return {
        adjustedPoints: 0,
        reason: 'Unavailable (no return date)'
      };
    }
  } else if (playerChance > 0 && playerChance < 75 && gameweek === currentGameweek + 1) {
    // Uncertain availability for next gameweek only
    const availability = playerChance / 100;
    return {
      adjustedPoints: projectedPoints * availability,
      reason: `${playerChance}% chance of playing`
    };
  }
  
  return { adjustedPoints: projectedPoints };
}

// Apply availability adjustments to a full player projection object
// Matches client-side behavior from client/src/lib/availability-adjustments.ts
export function applyAvailabilityAdjustmentsToPlayer(
  player: any,
  bootstrapData: any,
  currentGameweek: number
): any {
  const chanceOfPlaying = player.chanceOfPlayingNextRound ?? 100;
  const status = player.status || 'a';
  const news = player.news || '';
  
  // If fully available, no adjustments needed
  if (chanceOfPlaying >= 100 && status === 'a') {
    return player;
  }
  
  const adjustedPlayer = { ...player };
  const adjustedProjections = { ...(player.gameweekProjections || {}) };
  const originalProjections = { ...(player.gameweekProjections || {}) };
  const availabilityAdjustments: { [gameweek: string]: { original: number; adjusted: number; reason: string } } = {};
  
  const events: BootstrapEvent[] = bootstrapData?.events || [];
  
  if (chanceOfPlaying === 0) {
    const returnDate = parseReturnDate(news);
    
    if (returnDate) {
      const returnGameweek = getGameweekFromDate(returnDate, events);
      
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
      // No return date - zero out ALL projections
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
  const newTotalExpectedPoints = Object.values(adjustedProjections).reduce((sum: number, points: any) => sum + (points as number), 0);
  const newAveragePerGameweek = gameweekCount > 0 ? newTotalExpectedPoints / gameweekCount : 0;
  const newAverageValue = player.price && player.price > 0 ? newTotalExpectedPoints / player.price : 0;
  
  // Individual scoring components (pointsFromGoals, pointsFromAssists, etc.) are intentionally
  // NOT adjusted. Availability adjustments are applied ONLY to total points (gameweekProjections
  // and totalExpectedPoints) to prevent double-application when components are summed.
  
  adjustedPlayer.gameweekProjections = adjustedProjections;
  adjustedPlayer.originalGameweekProjections = originalProjections;
  adjustedPlayer.availabilityAdjustments = availabilityAdjustments;
  adjustedPlayer.totalExpectedPoints = Math.round(newTotalExpectedPoints * 100) / 100;
  adjustedPlayer.totalPoints = Math.round(newTotalExpectedPoints * 100) / 100;
  adjustedPlayer.averagePerGameweek = Math.round(newAveragePerGameweek * 100) / 100;
  adjustedPlayer.averageValue = Math.round(newAverageValue * 100) / 100;
  
  return adjustedPlayer;
}
