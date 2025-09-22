/**
 * Enhanced injury and suspension assessment utilities for player-minutes projections
 * Parses FPL API news and status fields to provide more accurate availability projections
 */

interface InjuryAssessment {
  statusCode: string;
  severity: 'available' | 'doubtful' | 'injured' | 'suspended' | 'unavailable';
  estimatedReturnGameweek: number | null;
  confidenceLevel: number; // 0-1 scale
  minutesMultiplier: number; // 0-1 scale for scaling minutes
  description: string;
}

/**
 * Parse FPL injury/status news text to extract return timeline
 * Common patterns:
 * - "Expected back after international break" 
 * - "Out for 2-3 weeks"
 * - "Suspended for next 1 matches"
 * - "75% chance of playing"
 * - "Back in training, will be assessed"
 */
function parseReturnTimeline(news: string, currentGameweek: number): { returnGameweek: number | null; confidence: number } {
  if (!news || news.trim() === '') {
    return { returnGameweek: null, confidence: 0.5 };
  }
  
  const newsLower = news.toLowerCase();
  
  // Pattern 1: Specific week mentions
  const weekPatterns = [
    /(?:out|missing|unavailable).*?(\d+)[-–]?(\d+)?\s*(?:week|wk)s?/i,
    /(\d+)[-–]?(\d+)?\s*(?:week|wk)s?\s*(?:out|injury|injured)/i,
    /expected.*?(?:back|return).*?(\d+)[-–]?(\d+)?\s*(?:week|wk)s?/i
  ];
  
  for (const pattern of weekPatterns) {
    const match = newsLower.match(pattern);
    if (match) {
      const minWeeks = parseInt(match[1]);
      const maxWeeks = match[2] ? parseInt(match[2]) : minWeeks;
      const avgWeeks = Math.ceil((minWeeks + maxWeeks) / 2);
      return { 
        returnGameweek: currentGameweek + avgWeeks, 
        confidence: 0.8 
      };
    }
  }
  
  // Pattern 2: Match suspensions
  const suspensionPatterns = [
    /suspended.*?(?:for|next)?\s*(\d+)\s*(?:match|game|fixture)s?/i,
    /(?:ban|suspension).*?(\d+)\s*(?:match|game|fixture)s?/i
  ];
  
  for (const pattern of suspensionPatterns) {
    const match = newsLower.match(pattern);
    if (match) {
      const matches = parseInt(match[1]);
      return { 
        returnGameweek: currentGameweek + matches, 
        confidence: 0.95 
      };
    }
  }
  
  // Pattern 3: International break references
  if (/international\s*break|after.*break|back.*international/i.test(newsLower)) {
    // Assume 2 gameweeks for international break
    return { returnGameweek: currentGameweek + 2, confidence: 0.7 };
  }
  
  // Pattern 4: Training/assessment mentions (hopeful but uncertain)
  if (/(?:back.*training|training.*back|will.*assess|being.*assess|touch.*go)/i.test(newsLower)) {
    return { returnGameweek: currentGameweek + 1, confidence: 0.4 };
  }
  
  // Pattern 5: Percentage chance mentions
  const percentageMatch = newsLower.match(/(\d+)%\s*(?:chance|likely)/i);
  if (percentageMatch) {
    const percentage = parseInt(percentageMatch[1]);
    if (percentage >= 75) {
      return { returnGameweek: currentGameweek, confidence: 0.8 };
    } else if (percentage >= 50) {
      return { returnGameweek: currentGameweek, confidence: 0.5 };
    } else {
      return { returnGameweek: currentGameweek + 1, confidence: 0.3 };
    }
  }
  
  // Pattern 6: Long-term injury indicators
  if (/(?:long.term|months?|season|surgery|operation|major)/i.test(newsLower)) {
    return { returnGameweek: currentGameweek + 12, confidence: 0.9 }; // Assume rest of season
  }
  
  // Default: Unknown timeline
  return { returnGameweek: null, confidence: 0.3 };
}

/**
 * Assess player injury/suspension status and impact on minutes
 */
export function assessPlayerInjuryStatus(
  status: string, 
  news: string, 
  chanceOfPlayingThisRound: number | null,
  chanceOfPlayingNextRound: number | null,
  currentGameweek: number
): InjuryAssessment {
  
  // Parse return timeline from news
  const timeline = parseReturnTimeline(news || '', currentGameweek);
  
  // Use the more restrictive chance of playing
  const effectiveChance = Math.min(
    chanceOfPlayingThisRound || 100,
    chanceOfPlayingNextRound || 100
  );
  
  // Base assessment on status code
  let baseAssessment: InjuryAssessment;
  
  switch (status?.toLowerCase()) {
    case 'd': // Doubtful
      baseAssessment = {
        statusCode: status,
        severity: 'doubtful',
        estimatedReturnGameweek: timeline.returnGameweek || currentGameweek,
        confidenceLevel: Math.max(timeline.confidence, effectiveChance / 100),
        minutesMultiplier: Math.max(0.3, effectiveChance / 100), // Significant reduction but not zero
        description: `Doubtful (${effectiveChance}% chance) - ${news || 'No details'}`
      };
      break;
      
    case 'i': // Injured
      baseAssessment = {
        statusCode: status,
        severity: 'injured',
        estimatedReturnGameweek: timeline.returnGameweek || (currentGameweek + 2),
        confidenceLevel: timeline.confidence,
        minutesMultiplier: Math.max(0.1, effectiveChance / 100), // Major reduction
        description: `Injured - ${news || 'No details'}`
      };
      break;
      
    case 's': // Suspended
      baseAssessment = {
        statusCode: status,
        severity: 'suspended',
        estimatedReturnGameweek: timeline.returnGameweek || (currentGameweek + 1),
        confidenceLevel: timeline.confidence || 0.95, // Suspensions are usually certain
        minutesMultiplier: 0, // No minutes while suspended
        description: `Suspended - ${news || 'No details'}`
      };
      break;
      
    case 'n': // Not available
      baseAssessment = {
        statusCode: status,
        severity: 'unavailable',
        estimatedReturnGameweek: timeline.returnGameweek || (currentGameweek + 4),
        confidenceLevel: timeline.confidence || 0.8,
        minutesMultiplier: 0, // No minutes while unavailable
        description: `Unavailable - ${news || 'No details'}`
      };
      break;
      
    case 'a':
    default: // Available
      // Even if available, consider chance of playing
      const adjustedMultiplier = effectiveChance < 100 ? Math.max(0.7, effectiveChance / 100) : 1.0;
      baseAssessment = {
        statusCode: status || 'a',
        severity: effectiveChance < 75 ? 'doubtful' : 'available',
        estimatedReturnGameweek: null,
        confidenceLevel: effectiveChance / 100,
        minutesMultiplier: adjustedMultiplier,
        description: effectiveChance < 100 ? 
          `Available but ${effectiveChance}% chance - ${news || 'No details'}` :
          'Fully available'
      };
      break;
  }
  
  // Enhanced logic: If news indicates specific timeline, override base assessment
  if (timeline.returnGameweek && timeline.confidence > 0.6) {
    if (timeline.returnGameweek > currentGameweek) {
      // Player won't be back for upcoming gameweek(s)
      baseAssessment.minutesMultiplier = Math.min(baseAssessment.minutesMultiplier, 0.2);
      baseAssessment.estimatedReturnGameweek = timeline.returnGameweek;
      baseAssessment.confidenceLevel = timeline.confidence;
    }
  }
  
  return baseAssessment;
}

/**
 * Calculate injury-adjusted minutes for a specific gameweek
 * @param baseMinutes - Base expected minutes without injury consideration
 * @param injuryAssessment - Assessment of player's injury status
 * @param targetGameweek - The gameweek we're calculating for
 * @returns Adjusted minutes (0-90)
 */
export function calculateInjuryAdjustedMinutes(
  baseMinutes: number,
  injuryAssessment: InjuryAssessment,
  targetGameweek: number
): { adjustedMinutes: number; reasoning: string } {
  
  // If player has a specific return gameweek
  if (injuryAssessment.estimatedReturnGameweek) {
    if (targetGameweek < injuryAssessment.estimatedReturnGameweek) {
      // Player not expected to be back yet
      const weeksUntilReturn = injuryAssessment.estimatedReturnGameweek - targetGameweek;
      
      if (weeksUntilReturn >= 2) {
        // Definitely out for multiple weeks
        return {
          adjustedMinutes: 0,
          reasoning: `Expected return GW${injuryAssessment.estimatedReturnGameweek} (${weeksUntilReturn} weeks away)`
        };
      } else {
        // Might make a late return
        const lateReturnChance = injuryAssessment.confidenceLevel * 0.3; // 30% of normal confidence
        const adjustedMinutes = Math.round(baseMinutes * lateReturnChance);
        return {
          adjustedMinutes,
          reasoning: `Possible late return (${Math.round(lateReturnChance * 100)}% chance)`
        };
      }
    } else if (targetGameweek === injuryAssessment.estimatedReturnGameweek) {
      // Expected return gameweek - but may not be fully match fit
      const returnFitness = Math.min(0.7, injuryAssessment.confidenceLevel); // Max 70% minutes on return
      const adjustedMinutes = Math.round(baseMinutes * returnFitness);
      return {
        adjustedMinutes,
        reasoning: `Expected return gameweek (${Math.round(returnFitness * 100)}% fitness)`
      };
    }
  }
  
  // Apply general minutes multiplier
  const adjustedMinutes = Math.round(baseMinutes * injuryAssessment.minutesMultiplier);
  
  return {
    adjustedMinutes,
    reasoning: `${injuryAssessment.severity} status (${Math.round(injuryAssessment.minutesMultiplier * 100)}% of normal minutes)`
  };
}

/**
 * Check if injury assessment is significant enough to affect projections
 */
export function isInjurySignificant(assessment: InjuryAssessment): boolean {
  return assessment.minutesMultiplier < 0.95 || assessment.severity !== 'available';
}