/**
 * Utility functions for handling Manager ID input
 */

/**
 * Extract Manager ID from a browser URL or return the plain ID
 * Supports formats like:
 * - https://fantasy.premierleague.com/entry/577434/event/10
 * - fantasy.premierleague.com/entry/577434
 * - entry/577434
 * - 577434
 */
export function extractManagerId(input: string): string {
  const trimmed = input.trim();
  
  // Check if it's a URL or contains 'entry/'
  if (trimmed.includes('fantasy.premierleague.com') || trimmed.includes('entry/')) {
    // Extract Manager ID from URL pattern: entry/123456
    const match = trimmed.match(/entry\/(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Otherwise treat as plain Manager ID (remove any non-digit characters)
  return trimmed.replace(/\D/g, '');
}

/**
 * Check if input looks like a URL
 */
export function isUrl(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.includes('fantasy.premierleague.com') ||
         trimmed.includes('entry/') ||
         trimmed.startsWith('http');
}

/**
 * True when a query error came from the server's TEAM_NOT_AVAILABLE case — a manager's squad
 * for the relevant gameweek isn't fetchable yet from FPL (pre-season, or before that gameweek's
 * deadline has passed), rather than a real failure. Pages should show a "check back later"
 * message instead of a generic error in this case. Server routes tag this by prefixing the
 * error string with "SEASON_NOT_STARTED:" (queryClient's error handling only propagates a
 * message string, not a structured error code, so this is matched via substring).
 */
export function isTeamNotAvailableError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('SEASON_NOT_STARTED');
}
