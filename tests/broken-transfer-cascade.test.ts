import { describe, it, expect } from 'vitest';
import {
  computeCascadeIndicesToRemove,
  filterBrokenTransfersAfterCascade,
  type CompletedTransfer,
  type BrokenTransferEntry,
} from '../client/src/lib/transfer-cascade';

const t = (out: number, inp: number): CompletedTransfer => ({
  outPlayerId: out,
  inPlayerId: inp,
  outPlayerName: `Player${out}`,
  inPlayerName: `Player${inp}`,
});

describe('computeCascadeIndicesToRemove', () => {
  it('includes only the target transfer when there are no dependents', () => {
    const completed = [t(1, 2), t(3, 4)];
    const result = computeCascadeIndicesToRemove(completed, 0);
    expect(result).toEqual(new Set([0]));
  });

  it('includes the target and its direct dependent', () => {
    const completed = [t(1, 2), t(2, 3)];
    const result = computeCascadeIndicesToRemove(completed, 0);
    expect(result).toEqual(new Set([0, 1]));
  });

  it('includes the full chain of dependents (A→B, B→C, C→D)', () => {
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const result = computeCascadeIndicesToRemove(completed, 0);
    expect(result).toEqual(new Set([0, 1, 2]));
  });

  it('does not include an unrelated transfer that shares no player with the chain', () => {
    const completed = [t(1, 2), t(2, 3), t(10, 11)];
    const result = computeCascadeIndicesToRemove(completed, 0);
    expect(result).toEqual(new Set([0, 1]));
  });

  it('does not include an earlier transfer even if it matches the inPlayerId (only looks forward)', () => {
    // t(0,1): index 0, t(1,2): index 1 — but index 0 is the one being removed,
    // so a backwards reference should not pull in index 0 again.
    const completed = [t(5, 6), t(1, 2), t(2, 3)];
    const result = computeCascadeIndicesToRemove(completed, 1);
    expect(result).toEqual(new Set([1, 2]));
    expect(result.has(0)).toBe(false);
  });

  it('handles a branching chain where two transfers both use the same inPlayer', () => {
    // index 0: 1→2 (target)
    // index 1: 2→3 (dependent of 0)
    // index 2: 2→4 (another dependent of 0, uses same outPlayer 2)
    const completed = [t(1, 2), t(2, 3), t(2, 4)];
    const result = computeCascadeIndicesToRemove(completed, 0);
    expect(result).toEqual(new Set([0, 1, 2]));
  });

  it('correctly undoes from middle of chain — only removes the selected transfer and its downstream', () => {
    // index 0: 1→2 (untouched)
    // index 1: 2→3 (target)
    // index 2: 3→4 (dependent of 1)
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const result = computeCascadeIndicesToRemove(completed, 1);
    expect(result).toEqual(new Set([1, 2]));
    expect(result.has(0)).toBe(false);
  });
});

describe('filterBrokenTransfersAfterCascade', () => {
  const GW = 30;

  it('removes the broken-transfer entry for the directly-removed transfer', () => {
    const completed = [t(1, 2), t(3, 4)];
    const broken: BrokenTransferEntry[] = [{ gwId: GW, outPlayerId: 1, inPlayerId: 2 }];
    const indicesToRemove = new Set([0]);
    const result = filterBrokenTransfersAfterCascade(broken, GW, indicesToRemove, completed);
    expect(result).toHaveLength(0);
  });

  it('removes broken-transfer entries for ALL transfers in the cascade chain', () => {
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const broken: BrokenTransferEntry[] = [
      { gwId: GW, outPlayerId: 1, inPlayerId: 2 },
      { gwId: GW, outPlayerId: 2, inPlayerId: 3 },
      { gwId: GW, outPlayerId: 3, inPlayerId: 4 },
    ];
    const indicesToRemove = computeCascadeIndicesToRemove(completed, 0);
    const result = filterBrokenTransfersAfterCascade(broken, GW, indicesToRemove, completed);
    expect(result).toHaveLength(0);
  });

  it('preserves broken-transfer entries that are not part of the cascade', () => {
    const completed = [t(1, 2), t(2, 3), t(10, 11)];
    const broken: BrokenTransferEntry[] = [
      { gwId: GW, outPlayerId: 1, inPlayerId: 2 },
      { gwId: GW, outPlayerId: 2, inPlayerId: 3 },
      { gwId: GW, outPlayerId: 10, inPlayerId: 11 },
    ];
    const indicesToRemove = computeCascadeIndicesToRemove(completed, 0);
    const result = filterBrokenTransfersAfterCascade(broken, GW, indicesToRemove, completed);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ outPlayerId: 10, inPlayerId: 11 });
  });

  it('preserves broken-transfer entries from a different GW', () => {
    const completed = [t(1, 2), t(2, 3)];
    const broken: BrokenTransferEntry[] = [
      { gwId: GW, outPlayerId: 1, inPlayerId: 2 },
      { gwId: GW + 1, outPlayerId: 1, inPlayerId: 2 },
    ];
    const indicesToRemove = computeCascadeIndicesToRemove(completed, 0);
    const result = filterBrokenTransfersAfterCascade(broken, GW, indicesToRemove, completed);
    expect(result).toHaveLength(1);
    expect(result[0].gwId).toBe(GW + 1);
  });

  it('clears broken warnings added by a prior "Undo Anyway" when the cascade includes those dependents', () => {
    // Scenario: user did "Undo Anyway" on transfer A→B (index 0 at the time), marking
    // B→C and C→D as broken. Now the user is trying to undo the remaining transfers by
    // running handleUndoWithDependentsForGW on a parent that covers B→C (index 0 now)
    // and C→D (index 1 now). Both broken entries must be cleared.
    const completed = [t(2, 3), t(3, 4)];
    const broken: BrokenTransferEntry[] = [
      { gwId: GW, outPlayerId: 2, inPlayerId: 3 },
      { gwId: GW, outPlayerId: 3, inPlayerId: 4 },
    ];
    const indicesToRemove = computeCascadeIndicesToRemove(completed, 0);
    const result = filterBrokenTransfersAfterCascade(broken, GW, indicesToRemove, completed);
    expect(result).toHaveLength(0);
  });

  it('returns unchanged array when no broken transfers match the removed chain', () => {
    const completed = [t(1, 2), t(2, 3)];
    const broken: BrokenTransferEntry[] = [
      { gwId: GW, outPlayerId: 5, inPlayerId: 6 },
    ];
    const indicesToRemove = computeCascadeIndicesToRemove(completed, 0);
    const result = filterBrokenTransfersAfterCascade(broken, GW, indicesToRemove, completed);
    expect(result).toEqual(broken);
  });

  it('handles an empty brokenTransfers array gracefully', () => {
    const completed = [t(1, 2), t(2, 3)];
    const indicesToRemove = computeCascadeIndicesToRemove(completed, 0);
    const result = filterBrokenTransfersAfterCascade([], GW, indicesToRemove, completed);
    expect(result).toEqual([]);
  });
});
