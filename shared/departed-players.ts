// Players who have left the Premier League and should be excluded from 2025-26 projections
// This list helps filter out players who are no longer in the league

export const DEPARTED_PLAYERS_2025_26 = new Set([
  41, // Marcus Rashford - Left Man Utd
  63, // Luis Díaz - Left Liverpool
  // Add more player IDs as they leave the Premier League
]);

export const DEPARTED_PLAYER_NAMES = new Set([
  "Rashford",
  "Luis Díaz", 
  "Luis Diaz",
  "Díaz",
  "Marcus Rashford",
  "Luis Fernando Díaz Marulanda"
]);

export function isPlayerDeparted(playerId: number): boolean {
  return DEPARTED_PLAYERS_2025_26.has(playerId);
}

export function isPlayerNameDeparted(playerName: string): boolean {
  return DEPARTED_PLAYER_NAMES.has(playerName);
}

export function shouldExcludeFromCurrentSeason(playerId: number, playerName?: string): boolean {
  return isPlayerDeparted(playerId) || (playerName ? isPlayerNameDeparted(playerName) : false);
}