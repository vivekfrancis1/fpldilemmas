export interface CompletedTransfer {
  outPlayerId: number;
  inPlayerId: number;
  outPlayerName: string;
  inPlayerName: string;
}

export interface BrokenTransferEntry {
  gwId: number;
  outPlayerId: number;
  inPlayerId: number;
}

export interface CrossGWDepEntry {
  gwId: number;
  transferIndex: number;
  outPlayerId: number;
  inPlayerId: number;
  outPlayerName: string;
  inPlayerName: string;
}

export type GameweekTransfersMap = Record<number, { completed: CompletedTransfer[] }>;

/**
 * BFS across future GWs to find transfers that chain off players brought in
 * by the cascade (identified by cascadeIndices within sourceCompleted).
 *
 * @param sourceGwId     - The GW being undone from.
 * @param cascadeIndices - Set of transfer indices being removed in sourceGwId.
 * @param sourceCompleted - The completed transfers for sourceGwId.
 * @param gameweekTransfers - Map of all GW transfer data (keyed by GW number).
 */
export function findCrossGWDependents(
  sourceGwId: number,
  cascadeIndices: Set<number>,
  sourceCompleted: CompletedTransfer[],
  gameweekTransfers: GameweekTransfersMap
): CrossGWDepEntry[] {
  const trackedPlayerIds = new Set([...cascadeIndices].map(i => sourceCompleted[i].inPlayerId));
  const result: CrossGWDepEntry[] = [];
  const futureGWIds = Object.keys(gameweekTransfers)
    .map(Number)
    .filter(gw => gw > sourceGwId)
    .sort((a, b) => a - b);
  for (const futureGwId of futureGWIds) {
    const futureCompleted = (gameweekTransfers[futureGwId] || { completed: [] }).completed;
    for (let i = 0; i < futureCompleted.length; i++) {
      const t = futureCompleted[i];
      if (trackedPlayerIds.has(t.outPlayerId)) {
        result.push({
          gwId: futureGwId,
          transferIndex: i,
          outPlayerId: t.outPlayerId,
          inPlayerId: t.inPlayerId,
          outPlayerName: t.outPlayerName,
          inPlayerName: t.inPlayerName,
        });
        trackedPlayerIds.add(t.inPlayerId);
      }
    }
  }
  return result;
}

export interface ChainBreakPayload {
  transferIndex: number;
  gwId: number;
  transferName: string;
  dependentTransfers: string[];
  dependentPlayerPairs: { outPlayerId: number; inPlayerId: number; depGwId: number }[];
  crossGwDependents: Array<{ gwId: number; transferIndex: number }>;
}

export function computeCascadeIndicesToRemove(
  completed: CompletedTransfer[],
  transferIndex: number
): Set<number> {
  const indicesToRemove = new Set<number>();
  indicesToRemove.add(transferIndex);
  let queue: Array<[number, number]> = [[completed[transferIndex].inPlayerId, transferIndex]];
  while (queue.length > 0) {
    const nextQueue: Array<[number, number]> = [];
    for (const [playerId, fromIndex] of queue) {
      completed.forEach((t, i) => {
        if (i > fromIndex && !indicesToRemove.has(i) && t.outPlayerId === playerId) {
          indicesToRemove.add(i);
          nextQueue.push([t.inPlayerId, i]);
        }
      });
    }
    queue = nextQueue;
  }
  return indicesToRemove;
}

export function filterBrokenTransfersAfterCascade(
  brokenTransfers: BrokenTransferEntry[],
  gwId: number,
  indicesToRemove: Set<number>,
  completed: CompletedTransfer[]
): BrokenTransferEntry[] {
  const removedTransferKeys = new Set(
    completed
      .filter((_, i) => indicesToRemove.has(i))
      .map(t => `${t.outPlayerId}:${t.inPlayerId}`)
  );
  return brokenTransfers.filter(
    b => !(b.gwId === gwId && removedTransferKeys.has(`${b.outPlayerId}:${b.inPlayerId}`))
  );
}

/**
 * Builds the payload for the chain-break confirmation dialog given the
 * completed transfers, the target transfer index, the gameweek id, and any
 * cross-GW dependents already discovered by findCrossGWDependents.
 *
 * Returns null when there are no dependents (same-GW or cross-GW), which
 * signals that the direct undo handler should be called without a dialog.
 */
export function buildChainBreakPayload(
  completed: CompletedTransfer[],
  transferIndex: number,
  gwId: number,
  crossGwDeps: CrossGWDepEntry[]
): ChainBreakPayload | null {
  const transfer = completed[transferIndex];
  if (!transfer) return null;

  const cascadeIndices = computeCascadeIndicesToRemove(completed, transferIndex);
  const dependentIndices = [...cascadeIndices].filter(i => i !== transferIndex);

  const dependentTransfers: string[] = dependentIndices.map(
    i => `${completed[i].outPlayerName} → ${completed[i].inPlayerName}`
  );
  const dependentPlayerPairs: { outPlayerId: number; inPlayerId: number; depGwId: number }[] =
    dependentIndices.map(i => ({
      outPlayerId: completed[i].outPlayerId,
      inPlayerId: completed[i].inPlayerId,
      depGwId: gwId,
    }));

  const crossGwDependents: Array<{ gwId: number; transferIndex: number }> = [];
  for (const dep of crossGwDeps) {
    dependentTransfers.push(`GW${dep.gwId}: ${dep.outPlayerName} → ${dep.inPlayerName}`);
    dependentPlayerPairs.push({ outPlayerId: dep.outPlayerId, inPlayerId: dep.inPlayerId, depGwId: dep.gwId });
    crossGwDependents.push({ gwId: dep.gwId, transferIndex: dep.transferIndex });
  }

  if (dependentTransfers.length === 0) return null;

  return {
    transferIndex,
    gwId,
    transferName: `${transfer.outPlayerName} → ${transfer.inPlayerName}`,
    dependentTransfers,
    dependentPlayerPairs,
    crossGwDependents,
  };
}

/**
 * Payload passed to onShowDialog by executeUndoAllCheck.
 * The caller uses gwId to label the dialog and transferCount to display
 * the number of transfers that will be undone.
 */
export interface UndoAllPayload {
  gwId: number;
  transferCount: number;
}

/**
 * Executes the branch decision for "undo all transfers for a gameweek".
 *
 * - When completed is non-empty: calls onShowDialog with the payload so the
 *   caller can open a confirmation dialog.
 * - When completed is empty: calls onDirectUndo immediately (no-op in practice
 *   since the button is hidden, but keeps the guard explicit and testable).
 *
 * Accepts injectable callbacks so the branch behavior is directly testable
 * without mounting the React component.
 */
export function executeUndoAllCheck(
  completed: CompletedTransfer[],
  gwId: number,
  onShowDialog: (payload: UndoAllPayload) => void,
  onDirectUndo: () => void
): void {
  if (completed.length === 0) {
    onDirectUndo();
    return;
  }
  onShowDialog({ gwId, transferCount: completed.length });
}

/**
 * Executes the full branch decision for "undo single transfer with chain check".
 * Builds the payload via buildChainBreakPayload and then:
 *   - calls onChainDetected(payload) if dependents exist (opens the dialog), or
 *   - calls onDirectUndo() if there are no dependents (proceeds immediately).
 *
 * Accepts injectable callbacks so the branch behavior is directly testable
 * without mounting the React component.
 */
export function executeUndoChainCheck(
  completed: CompletedTransfer[],
  transferIndex: number,
  gwId: number,
  crossGwDeps: CrossGWDepEntry[],
  onChainDetected: (payload: ChainBreakPayload) => void,
  onDirectUndo: () => void
): void {
  const payload = buildChainBreakPayload(completed, transferIndex, gwId, crossGwDeps);
  if (payload !== null) {
    onChainDetected(payload);
  } else {
    onDirectUndo();
  }
}
