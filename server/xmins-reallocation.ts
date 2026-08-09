// Redistributes a player's unavailable minutes to teammates in the same team + position group.
// If a player has 0% availability for a gameweek, all of their expected minutes go to 0 and are
// reallocated to teammates in the same position, weighted by each recipient's own base xMins
// share of the group. If a player has e.g. 75% availability, they keep 75% of their own xMins
// and the remaining 25% is reallocated the same way.

export interface GroupMember {
  playerId: number;
  baseXMins: number; // expected minutes when fully fit and available (0-90)
  availability: number; // 0-1 probability of being available this gameweek (injury/suspension adjusted)
}

const MAX_MINUTES = 90;

export function reallocateGroupXmins(group: GroupMember[]): Map<number, number> {
  const result = new Map<number, number>();
  for (const m of group) result.set(m.playerId, m.baseXMins * m.availability);

  for (const source of group) {
    const freed = source.baseXMins * (1 - source.availability);
    if (freed <= 0) continue;

    const others = group.filter(m => m.playerId !== source.playerId);
    const othersTotalBase = others.reduce((sum, m) => sum + m.baseXMins, 0);
    if (othersTotalBase <= 0) continue; // nobody in the group to reallocate to

    for (const other of others) {
      const share = other.baseXMins / othersTotalBase;
      result.set(other.playerId, (result.get(other.playerId) || 0) + freed * share);
    }
  }

  // A single match can't produce more than 90 minutes for one player, even after reallocation.
  for (const [playerId, mins] of result) {
    result.set(playerId, Math.min(MAX_MINUTES, mins));
  }

  return result;
}
