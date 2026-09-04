// FPL's my-team endpoint doesn't always set the flat active_chip field on its response — a
// pending chip (e.g. a wildcard activated for an upcoming gameweek) often only shows up inside
// the chips array, as the entry with status_for_entry === 'active'. This resolves the same
// value from either shape, for any code path that fetches my-team data independently (each does
// its own fetch since they need different auth/caching, so this stays a shared pure helper
// rather than duplicated inline logic — see server/routes.ts's /api/fpl/my-team and
// /api/fpl/recommended-transfers handlers).
export function resolveActiveChip(myTeamData: { active_chip?: string | null; chips?: Array<{ name: string; status_for_entry: string }> }): string | null {
  if (myTeamData.active_chip) return myTeamData.active_chip;
  if (!Array.isArray(myTeamData.chips)) return null;
  const activeChip = myTeamData.chips.find((chip) => chip.status_for_entry === 'active');
  return activeChip ? activeChip.name : null;
}
