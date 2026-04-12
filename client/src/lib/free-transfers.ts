/**
 * Calculate free transfers available for the next gameweek based on manager history
 * Uses the official FPL rules:
 * - Start with 1 FT each GW
 * - Bank unused FTs up to max 5
 * - GW16 AFCON top-up: everyone gets 5 FTs
 * - Wildcard/Free Hit usage: banked FTs are PRESERVED (carry through), not reset
 */

interface GWHistory {
  event: number;
  event_transfers: number;
  event_transfers_cost: number;
}

interface ChipUsage {
  event: number;
  name: string;
}

export function calculateFreeTransfers(
  history: GWHistory[] | undefined,
  chips: ChipUsage[] | undefined,
  currentGameweek: number
): number {
  if (!history || history.length === 0) return 1;

  // Sort history by gameweek
  const sortedHistory = [...history].sort((a, b) => a.event - b.event);
  
  // Create a map of chip usage by gameweek
  const chipsByGW = new Map<number, string>();
  if (chips) {
    chips.forEach(chip => chipsByGW.set(chip.event, chip.name.toLowerCase()));
  }

  let freeTransfers = 1; // Start with 1 FT

  // Walk through each completed gameweek
  for (const gw of sortedHistory) {
    const gwNum = gw.event;
    
    // Skip future gameweeks
    if (gwNum >= currentGameweek) break;
    
    // GW16 AFCON top-up: everyone gets 5 FTs
    if (gwNum === 16) {
      freeTransfers = 5;
    }
    
    // Check if a wildcard or free hit was used this GW
    // FPL rule: banked FTs are preserved through a wildcard or free hit —
    // the chip covers all transfers so the FT bank is untouched
    const chipUsed = chipsByGW.get(gwNum);
    if (chipUsed === 'wildcard' || chipUsed === 'freehit') {
      continue;
    }
    
    // Calculate transfers used this GW
    const transfersMade = gw.event_transfers || 0;
    const transferCost = gw.event_transfers_cost || 0;
    
    // FPL charges 4 points per hit, so hits = cost / 4
    const hitsTaken = Math.floor(transferCost / 4);
    
    // Free transfers used = transfers made - hits taken
    const freeTransfersUsed = Math.max(0, transfersMade - hitsTaken);
    
    // Calculate unused FTs that can be banked
    const unusedFTs = Math.max(0, freeTransfers - freeTransfersUsed);
    
    // Next GW: bank unused FTs + 1 new FT, max 5
    freeTransfers = Math.min(5, unusedFTs + 1);
  }

  return freeTransfers;
}
