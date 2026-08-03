import type { PreseasonDraft } from "@/lib/preseason-draft-cache";

/**
 * Converts a cached pre-season draft squad into FPL's own "picks" shape, so it can be sent as
 * `authenticatedPicks`/`draftPicks` to the same server endpoints that already accept real FPL
 * picks — Recommended Transfers and Transfer Planner need no server-side awareness of the draft
 * cache itself, only of this one shape.
 */
export interface DraftFplPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  selling_price: number;
  purchase_price: number;
}

export function draftToFplPicks(draft: PreseasonDraft, bootstrapData: any): DraftFplPick[] {
  const priceByPlayerId = new Map<number, number>();
  (bootstrapData?.elements || []).forEach((el: any) => {
    priceByPlayerId.set(el.id, el.now_cost);
  });

  return draft.players.map((player, index) => {
    const price = priceByPlayerId.get(player.playerId) ?? Math.round((draft.totalValue / draft.players.length) * 10);
    return {
      element: player.playerId,
      position: index + 1,
      multiplier: player.isCaptain ? 2 : player.isStarting ? 1 : 0,
      is_captain: player.isCaptain,
      is_vice_captain: player.isViceCaptain,
      selling_price: price,
      purchase_price: price,
    };
  });
}
