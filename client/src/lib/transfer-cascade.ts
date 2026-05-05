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
