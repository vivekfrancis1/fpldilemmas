// Filling, rearranging and switching the slots of an editable Predicted Lineup. Pure; the XI is an array of 11 FPL player
// ids in slot order (goalkeeper first), with null for a slot nobody could fill.

import { formationSlots, slotFit } from "./formations";

export interface EditPlayer {
  id: number;
  fplPosition: "GKP" | "DEF" | "MID" | "FWD";
  /** Detailed positions, main first; null when unknown. */
  codes: string[] | null;
  /** Expected minutes in the gameweek (0 when none). */
  minutes: number;
}

/** A natural left-winger with 40 minutes beats a central midfielder with 60 on the wing: one fit point is worth 30 minutes. */
const FIT_WEIGHT = 30;

/** Best (slot, player) pair first, until no slots or players are left. Ties go to the earlier slot, then the lower id. */
function assign(formation: string, pool: EditPlayer[], xi: Array<number | null>): void {
  const slots = formationSlots(formation);
  const pairs: Array<{ slot: number; id: number; score: number }> = [];
  slots.forEach((s, slot) => {
    if (xi[slot] !== null) return;
    for (const p of pool) {
      const fit = slotFit(s.role, p.codes, p.fplPosition);
      if (fit < 0) continue;
      pairs.push({ slot, id: p.id, score: fit * FIT_WEIGHT + Math.min(90, Math.max(0, p.minutes)) });
    }
  });
  pairs.sort((a, b) => b.score - a.score || a.slot - b.slot || a.id - b.id);
  const used = new Set(xi.filter((id): id is number => id !== null));
  for (const pair of pairs) {
    if (xi[pair.slot] !== null || used.has(pair.id)) continue;
    xi[pair.slot] = pair.id;
    used.add(pair.id);
  }
}

/** The club's likeliest players for a formation: those with expected minutes first, then anyone, only to fill what is left. */
export function assignToFormation(formation: string, squad: EditPlayer[]): Array<number | null> {
  const xi: Array<number | null> = Array(11).fill(null);
  assign(formation, squad.filter((p) => p.minutes > 0), xi);
  assign(formation, squad.filter((p) => p.minutes <= 0), xi);
  return xi;
}

/** The chosen players kept, each moved to the slot that suits him best in the new formation. */
export function arrangeInFormation(formation: string, chosen: number[], squad: EditPlayer[]): Array<number | null> {
  const wanted = new Set(chosen);
  const xi: Array<number | null> = Array(11).fill(null);
  assign(formation, squad.filter((p) => wanted.has(p.id)), xi);
  return xi;
}

/** Puts a player in a slot. If he is already in the XI the two players swap places; the original array is not changed. */
export function replaceSlot(xi: Array<number | null>, slot: number, playerId: number): Array<number | null> {
  const next = [...xi];
  const from = next.indexOf(playerId);
  if (from === slot) return next;
  if (from >= 0) next[from] = next[slot];
  next[slot] = playerId;
  return next;
}
