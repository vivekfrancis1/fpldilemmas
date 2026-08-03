/**
 * Pre-season "GW1 draft" squad cache — stored client-side only (localStorage), so saving never
 * requires a Manager ID or FPL account connection. Recommended Transfers / Transfer Planner treat
 * this as a fallback squad for whatever Manager ID the user enters there, only when FPL has no
 * real picks for that manager yet (pre-season).
 */

const KEY = 'fpl-preseason-draft-v1';

export interface PreseasonDraftPlayer {
  playerId: number;
  isStarting: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface PreseasonDraft {
  players: PreseasonDraftPlayer[]; // exactly 15, starting XI first then bench
  totalValue: number; // £m
  savedAt: string; // ISO timestamp
}

export function savePreseasonDraft(draft: Omit<PreseasonDraft, 'savedAt'>): void {
  try {
    const withTimestamp: PreseasonDraft = { ...draft, savedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(withTimestamp));
  } catch (error) {
    console.warn('Failed to save preseason draft to localStorage:', error);
  }
}

export function getPreseasonDraft(): PreseasonDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PreseasonDraft;
  } catch (error) {
    console.warn('Failed to read preseason draft from localStorage:', error);
    return null;
  }
}

export function clearPreseasonDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch (error) {
    console.warn('Failed to clear preseason draft from localStorage:', error);
  }
}
