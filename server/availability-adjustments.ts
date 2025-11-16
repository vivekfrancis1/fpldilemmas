// Server-side availability adjustments for player projections
// Handles AFCON 2025, injuries, and suspensions

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

// AFCON 2025 Availability - Players traveling to Morocco (December 21, 2025 - January 18, 2026)
// Names must match exactly with FPL API format (first_name + second_name with accents)
export const AFCON_PLAYERS = new Set([
  'Mohamed Salah', 'Omar Marmoush', 'Calvin Bassey', 'Alex Iwobi', 'Samuel Chukwueze', 
  'Ola Aina', 'Taiwo Awoniyi', 'Ike Ugbo', 'Frank Onyeka', 'Tolu Arokodare',
  'Iliman Ndiaye', 'Idrissa Gueye', 'Ismaïla Sarr', 'Pape Matar Sarr', 'Pathé Ciss',
  'Amad Diallo', 'Ibrahim Sangaré', 'Willy Boly', 'Bertrand Traoré', 'Wesley Fofana',
  'Maxwel Cornet', 'Emmanuel Agbadou', 'Simon Adingra', 'Malick Yalcouye', 'Evann Guessand',
  'Bryan Mbeumo', 'Amadou Onana', 'Carlos Baleba', 'Noussair Mazraoui', 'Dara O\'Shea',
  'Amine Adli', 'Nayef Aguerd', 'Rayan Ait Nouri', 'Yoane Wissa', 'Aaron Wan-Bissaka',
  'Yves Bissouma', 'Abdoulaye Doucouré', 'Dango Ouattara', 'Issa Kaboré', 'Manuel Benson',
  'Lyle Foster', 'Hannibal Mejbri', 'Marshall Munetsi', 'Tawanda Chirewa'
]);

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

// Get AFCON availability percentage for a specific gameweek
export function getAFCONAvailability(gameweek: number): number {
  if (gameweek === 17 || gameweek === 18 || gameweek === 19) return 0.0;
  if (gameweek === 20) return 0.25;
  if (gameweek === 21) return 0.50;
  if (gameweek === 22) return 0.75;
  return 1.0;
}

// Apply availability adjustment to a single gameweek's projected points
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
  const isAFCONPlayer = AFCON_PLAYERS.has(playerName);
  
  // Debug logging for Mbeumo
  if (playerName === 'Bryan Mbeumo' && gameweek >= 14 && gameweek <= 22) {
    console.log(`🔍 MBEUMO DEBUG GW${gameweek}: isAFCON=${isAFCONPlayer}, originalPoints=${projectedPoints.toFixed(2)}`);
  }
  
  // AFCON adjustments apply regardless of injury status
  if (isAFCONPlayer) {
    const afconAvailability = getAFCONAvailability(gameweek);
    if (afconAvailability < 1.0) {
      // Debug logging for Mbeumo AFCON adjustment
      if (playerName === 'Bryan Mbeumo') {
        console.log(`🎯 MBEUMO AFCON ADJUSTMENT GW${gameweek}: ${projectedPoints.toFixed(2)} → ${(projectedPoints * afconAvailability).toFixed(2)} (${Math.round(afconAvailability * 100)}% availability)`);
      }
      return {
        adjustedPoints: projectedPoints * afconAvailability,
        reason: `AFCON ${Math.round(afconAvailability * 100)}% availability`
      };
    }
  }
  
  // Injury/suspension adjustments
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
