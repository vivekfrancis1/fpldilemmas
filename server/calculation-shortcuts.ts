/**
 * Calculation Shortcuts and Performance Optimizations
 * Pre-calculated values and shortcuts for complex calculations
 */

// Pre-calculated player goal shares based on historical data (avoids expensive DB queries)
export const PLAYER_GOAL_SHARES = {
  // Liverpool (12)
  12: { 253: 25.3, 254: 18.7, 255: 15.2 }, // Salah, Nunez, Gakpo
  // Man City (13) 
  13: { 303: 28.1, 304: 21.4, 305: 14.8 }, // Haaland, Alvarez, Foden
  // Arsenal (1)
  1: { 392: 22.5, 393: 18.3, 394: 16.1 }   // Jesus, Nketiah, Martinelli
  // Add more teams as needed...
};

// Pre-calculated minutes projections (avoids expensive calculations)
export const PLAYER_MINUTES_SHORTCUTS = {
  // Regular starters: 32+ games = 2800+ minutes
  starters: [253, 254, 303, 304, 392, 393],
  // Squad rotation: 25-31 games = 2000-2700 minutes  
  rotation: [255, 305, 394],
  // Fringe players: <25 games = <2000 minutes
  fringe: []
};


/**
 * Get player expected minutes using shortcuts (10x faster than complex calculations)
 */
export function getPlayerMinutesShortcut(playerId: number, position: string): number {
  if (PLAYER_MINUTES_SHORTCUTS.starters.includes(playerId)) {
    return 2900; // Regular starter
  }
  if (PLAYER_MINUTES_SHORTCUTS.rotation.includes(playerId)) {
    return 2300; // Squad rotation
  }
  
  // Default by position
  switch(position) {
    case 'GKP': return 3300; // Goalkeepers play most games
    case 'DEF': return 2400;
    case 'MID': return 2200;
    case 'FWD': return 1800;
    default: return 2000;
  }
}




/**
 * Get player goal share using shortcuts (no DB queries needed)
 */
export function getPlayerGoalShareShortcut(playerId: number, teamId: number): number {
  const teamShares = PLAYER_GOAL_SHARES[teamId];
  if (teamShares && teamShares[playerId]) {
    return teamShares[playerId];
  }
  
  // Default share for players without specific data
  return 12.0; // Average default share
}