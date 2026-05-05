import { describe, it, expect, vi } from 'vitest';
import {
  buildChainBreakPayload,
  computeCascadeIndicesToRemove,
  executeUndoChainCheck,
  filterBrokenTransfersAfterCascade,
  type ChainBreakPayload,
  type CompletedTransfer,
  type BrokenTransferEntry,
  type CrossGWDepEntry,
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

// Mirrors the logic inside handleUndoSingleTransferWithCheckForGW that derives the
// dependentIndices/dependentTransfers/dependentPlayerPairs used to build the
// "Undo Anyway" confirmation dialog. The production code now delegates to
// computeCascadeIndicesToRemove and filters out the target index itself.
function buildDependentInfo(
  completed: CompletedTransfer[],
  transferIndex: number
): {
  dependentIndices: number[];
  dependentTransfers: string[];
  dependentPlayerPairs: { outPlayerId: number; inPlayerId: number }[];
} {
  const cascadeIndices = computeCascadeIndicesToRemove(completed, transferIndex);
  const dependentIndices = [...cascadeIndices].filter(i => i !== transferIndex);
  const dependentTransfers = dependentIndices.map(i => {
    const t = completed[i];
    return `${t.outPlayerName} → ${t.inPlayerName}`;
  });
  const dependentPlayerPairs = dependentIndices.map(i => ({
    outPlayerId: completed[i].outPlayerId,
    inPlayerId: completed[i].inPlayerId,
  }));
  return { dependentIndices, dependentTransfers, dependentPlayerPairs };
}

describe('handleUndoSingleTransferWithCheckForGW BFS (dependency-finder for "Undo Anyway" dialog)', () => {
  it('returns empty dependents when there are no downstream transfers', () => {
    const completed = [t(1, 2), t(3, 4)];
    const { dependentIndices, dependentTransfers, dependentPlayerPairs } =
      buildDependentInfo(completed, 0);
    expect(dependentIndices).toEqual([]);
    expect(dependentTransfers).toEqual([]);
    expect(dependentPlayerPairs).toEqual([]);
  });

  it('returns the single direct dependent when one transfer uses the undone inPlayer', () => {
    const completed = [t(1, 2), t(2, 3)];
    const { dependentIndices, dependentTransfers, dependentPlayerPairs } =
      buildDependentInfo(completed, 0);
    expect(dependentIndices).toEqual([1]);
    expect(dependentTransfers).toEqual(['Player2 → Player3']);
    expect(dependentPlayerPairs).toEqual([{ outPlayerId: 2, inPlayerId: 3 }]);
  });

  it('returns all downstream dependents for a full chain (A→B, B→C, C→D)', () => {
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const { dependentIndices, dependentTransfers, dependentPlayerPairs } =
      buildDependentInfo(completed, 0);
    expect(dependentIndices).toEqual([1, 2]);
    expect(dependentTransfers).toEqual(['Player2 → Player3', 'Player3 → Player4']);
    expect(dependentPlayerPairs).toEqual([
      { outPlayerId: 2, inPlayerId: 3 },
      { outPlayerId: 3, inPlayerId: 4 },
    ]);
  });

  it('does not include the target transfer itself in dependentIndices', () => {
    const completed = [t(1, 2), t(2, 3)];
    const { dependentIndices } = buildDependentInfo(completed, 0);
    expect(dependentIndices).not.toContain(0);
  });

  it('does not include transfers earlier than the target even if their outPlayer matches', () => {
    // index 0: 5→6 (unrelated, earlier)
    // index 1: 1→2 (target)
    // index 2: 2→3 (dependent)
    const completed = [t(5, 6), t(1, 2), t(2, 3)];
    const { dependentIndices } = buildDependentInfo(completed, 1);
    expect(dependentIndices).toEqual([2]);
    expect(dependentIndices).not.toContain(0);
  });

  it('finds dependents for a branching chain where two transfers share the same outPlayer', () => {
    // index 0: 1→2 (target)
    // index 1: 2→3 (dependent)
    // index 2: 2→4 (also dependent — same outPlayer as index 1)
    const completed = [t(1, 2), t(2, 3), t(2, 4)];
    const { dependentIndices, dependentPlayerPairs } = buildDependentInfo(completed, 0);
    expect(dependentIndices).toContain(1);
    expect(dependentIndices).toContain(2);
    expect(dependentPlayerPairs).toContainEqual({ outPlayerId: 2, inPlayerId: 3 });
    expect(dependentPlayerPairs).toContainEqual({ outPlayerId: 2, inPlayerId: 4 });
  });

  it('only returns downstream dependents when undoing from the middle of a chain', () => {
    // index 0: 1→2 (not the target — should be absent)
    // index 1: 2→3 (target)
    // index 2: 3→4 (dependent)
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const { dependentIndices, dependentTransfers, dependentPlayerPairs } =
      buildDependentInfo(completed, 1);
    expect(dependentIndices).toEqual([2]);
    expect(dependentTransfers).toEqual(['Player3 → Player4']);
    expect(dependentPlayerPairs).toEqual([{ outPlayerId: 3, inPlayerId: 4 }]);
    expect(dependentIndices).not.toContain(0);
  });

  it('returns empty dependents when the target is the last transfer', () => {
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const { dependentIndices } = buildDependentInfo(completed, 2);
    expect(dependentIndices).toEqual([]);
  });

  it('produces dependentPlayerPairs that match broken-transfer entries created by "Undo Anyway"', () => {
    // Simulates the case where "Undo Anyway" was used: the pairs discovered here
    // are the same pairs stored as BrokenTransferEntry objects.
    const completed = [t(10, 20), t(20, 30), t(30, 40)];
    const { dependentPlayerPairs } = buildDependentInfo(completed, 0);
    const expectedBrokenEntries: BrokenTransferEntry[] = [
      { gwId: 5, outPlayerId: 20, inPlayerId: 30 },
      { gwId: 5, outPlayerId: 30, inPlayerId: 40 },
    ];
    dependentPlayerPairs.forEach((pair, idx) => {
      expect(pair.outPlayerId).toBe(expectedBrokenEntries[idx].outPlayerId);
      expect(pair.inPlayerId).toBe(expectedBrokenEntries[idx].inPlayerId);
    });
  });
});

// Mirrors the logic inside handleUndoSingleTransferWithCheck (the non-GW variant).
// That function reads currentCompleted from gameweekTransfers[selectedGameweek],
// then delegates to computeCascadeIndicesToRemove for dependency discovery.
// The dependency-building code is identical to the GW variant — both paths are
// exercised here independently to confirm the non-GW path behaves the same.
function buildDependentInfoNonGW(
  completed: CompletedTransfer[],
  transferIndex: number
): {
  dependentIndices: number[];
  dependentTransfers: string[];
  dependentPlayerPairs: { outPlayerId: number; inPlayerId: number }[];
} {
  // Replicates lines 4258-4267 of transfer-planner.tsx (handleUndoSingleTransferWithCheck)
  const cascadeIndices = computeCascadeIndicesToRemove(completed, transferIndex);
  const dependentIndices = [...cascadeIndices].filter(i => i !== transferIndex);
  const dependentTransfers = dependentIndices.map(i => {
    const tr = completed[i];
    return `${tr.outPlayerName} → ${tr.inPlayerName}`;
  });
  const dependentPlayerPairs = dependentIndices.map(i => ({
    outPlayerId: completed[i].outPlayerId,
    inPlayerId: completed[i].inPlayerId,
  }));
  return { dependentIndices, dependentTransfers, dependentPlayerPairs };
}

describe('handleUndoSingleTransferWithCheck BFS (non-GW variant dependency-finder for "Undo Anyway" dialog)', () => {
  it('returns empty dependents when there are no downstream transfers', () => {
    const completed = [t(1, 2), t(3, 4)];
    const { dependentIndices, dependentTransfers, dependentPlayerPairs } =
      buildDependentInfoNonGW(completed, 0);
    expect(dependentIndices).toEqual([]);
    expect(dependentTransfers).toEqual([]);
    expect(dependentPlayerPairs).toEqual([]);
  });

  it('returns the single direct dependent when one transfer uses the undone inPlayer', () => {
    const completed = [t(1, 2), t(2, 3)];
    const { dependentIndices, dependentTransfers, dependentPlayerPairs } =
      buildDependentInfoNonGW(completed, 0);
    expect(dependentIndices).toEqual([1]);
    expect(dependentTransfers).toEqual(['Player2 → Player3']);
    expect(dependentPlayerPairs).toEqual([{ outPlayerId: 2, inPlayerId: 3 }]);
  });

  it('returns all downstream dependents for a full chain (A→B, B→C, C→D)', () => {
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const { dependentIndices, dependentTransfers, dependentPlayerPairs } =
      buildDependentInfoNonGW(completed, 0);
    expect(dependentIndices).toEqual([1, 2]);
    expect(dependentTransfers).toEqual(['Player2 → Player3', 'Player3 → Player4']);
    expect(dependentPlayerPairs).toEqual([
      { outPlayerId: 2, inPlayerId: 3 },
      { outPlayerId: 3, inPlayerId: 4 },
    ]);
  });

  it('does not include the target transfer itself in dependentIndices', () => {
    const completed = [t(1, 2), t(2, 3)];
    const { dependentIndices } = buildDependentInfoNonGW(completed, 0);
    expect(dependentIndices).not.toContain(0);
  });

  it('does not include transfers earlier than the target even if their outPlayer matches', () => {
    // index 0: 5→6 (unrelated, earlier)
    // index 1: 1→2 (target)
    // index 2: 2→3 (dependent)
    const completed = [t(5, 6), t(1, 2), t(2, 3)];
    const { dependentIndices } = buildDependentInfoNonGW(completed, 1);
    expect(dependentIndices).toEqual([2]);
    expect(dependentIndices).not.toContain(0);
  });

  it('finds dependents for a branching chain where two transfers share the same outPlayer', () => {
    // index 0: 1→2 (target)
    // index 1: 2→3 (dependent)
    // index 2: 2→4 (also dependent — same outPlayer as index 1)
    const completed = [t(1, 2), t(2, 3), t(2, 4)];
    const { dependentIndices, dependentPlayerPairs } = buildDependentInfoNonGW(completed, 0);
    expect(dependentIndices).toContain(1);
    expect(dependentIndices).toContain(2);
    expect(dependentPlayerPairs).toContainEqual({ outPlayerId: 2, inPlayerId: 3 });
    expect(dependentPlayerPairs).toContainEqual({ outPlayerId: 2, inPlayerId: 4 });
  });

  it('only returns downstream dependents when undoing from the middle of a chain', () => {
    // index 0: 1→2 (not the target — should be absent)
    // index 1: 2→3 (target)
    // index 2: 3→4 (dependent)
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const { dependentIndices, dependentTransfers, dependentPlayerPairs } =
      buildDependentInfoNonGW(completed, 1);
    expect(dependentIndices).toEqual([2]);
    expect(dependentTransfers).toEqual(['Player3 → Player4']);
    expect(dependentPlayerPairs).toEqual([{ outPlayerId: 3, inPlayerId: 4 }]);
    expect(dependentIndices).not.toContain(0);
  });

  it('returns empty dependents when the target is the last transfer', () => {
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const { dependentIndices } = buildDependentInfoNonGW(completed, 2);
    expect(dependentIndices).toEqual([]);
  });

  it('produces dependentPlayerPairs that match broken-transfer entries created by "Undo Anyway"', () => {
    // Simulates the case where "Undo Anyway" was used: the pairs discovered here
    // are the same pairs stored as BrokenTransferEntry objects.
    const completed = [t(10, 20), t(20, 30), t(30, 40)];
    const { dependentPlayerPairs } = buildDependentInfoNonGW(completed, 0);
    const expectedBrokenEntries: BrokenTransferEntry[] = [
      { gwId: 5, outPlayerId: 20, inPlayerId: 30 },
      { gwId: 5, outPlayerId: 30, inPlayerId: 40 },
    ];
    dependentPlayerPairs.forEach((pair, idx) => {
      expect(pair.outPlayerId).toBe(expectedBrokenEntries[idx].outPlayerId);
      expect(pair.inPlayerId).toBe(expectedBrokenEntries[idx].inPlayerId);
    });
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

// ---------------------------------------------------------------------------
// buildChainBreakPayload — the pure helper used by both
// handleUndoSingleTransferWithCheck and handleUndoSingleTransferWithCheckForGW
// to decide whether to open the confirmation dialog or call the direct undo.
// Tests here exercise the real production function exported from
// client/src/lib/transfer-cascade.ts.
// ---------------------------------------------------------------------------

describe('buildChainBreakPayload — returns null (direct undo path) when no dependents', () => {
  it('returns null for two unrelated transfers', () => {
    const completed = [t(1, 2), t(3, 4)];
    expect(buildChainBreakPayload(completed, 0, 10, [])).toBeNull();
  });

  it('returns null when the target is the last transfer in the list', () => {
    const completed = [t(1, 2), t(2, 3)];
    expect(buildChainBreakPayload(completed, 1, 10, [])).toBeNull();
  });

  it('returns null when there are no cross-GW dependents and no same-GW chain', () => {
    const completed = [t(5, 6)];
    expect(buildChainBreakPayload(completed, 0, 10, [])).toBeNull();
  });

  it('returns null for an invalid transferIndex', () => {
    const completed = [t(1, 2)];
    expect(buildChainBreakPayload(completed, 99, 10, [])).toBeNull();
  });
});

describe('buildChainBreakPayload — returns payload (dialog path) when dependents exist', () => {
  it('returns a non-null payload when a direct same-GW dependent exists', () => {
    const completed = [t(1, 2), t(2, 3)];
    const result = buildChainBreakPayload(completed, 0, 10, []);
    expect(result).not.toBeNull();
  });

  it('sets transferName to "outPlayerName → inPlayerName" of the target transfer', () => {
    const completed = [t(1, 2), t(2, 3)];
    const result = buildChainBreakPayload(completed, 0, 10, [])!;
    expect(result.transferName).toBe('Player1 → Player2');
  });

  it('sets transferIndex and gwId from the arguments', () => {
    const completed = [t(1, 2), t(2, 3)];
    const result = buildChainBreakPayload(completed, 0, 22, [])!;
    expect(result.transferIndex).toBe(0);
    expect(result.gwId).toBe(22);
  });

  it('lists the dependent transfer label in dependentTransfers', () => {
    const completed = [t(1, 2), t(2, 3)];
    const result = buildChainBreakPayload(completed, 0, 10, [])!;
    expect(result.dependentTransfers).toEqual(['Player2 → Player3']);
  });

  it('includes the dependent player pair with the correct depGwId', () => {
    const completed = [t(1, 2), t(2, 3)];
    const result = buildChainBreakPayload(completed, 0, 10, [])!;
    expect(result.dependentPlayerPairs).toEqual([
      { outPlayerId: 2, inPlayerId: 3, depGwId: 10 },
    ]);
  });

  it('lists all dependents for a full chain (A→B, B→C, C→D)', () => {
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const result = buildChainBreakPayload(completed, 0, 10, [])!;
    expect(result.dependentTransfers).toEqual(['Player2 → Player3', 'Player3 → Player4']);
    expect(result.dependentPlayerPairs).toHaveLength(2);
  });

  it('does not include the target transfer itself in dependentTransfers', () => {
    const completed = [t(1, 2), t(2, 3)];
    const result = buildChainBreakPayload(completed, 0, 10, [])!;
    expect(result.dependentTransfers).not.toContain('Player1 → Player2');
  });

  it('only includes downstream dependents when undoing from the middle of a chain', () => {
    // index 0: 1→2 (upstream, untouched)
    // index 1: 2→3 (target)
    // index 2: 3→4 (downstream dependent)
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const result = buildChainBreakPayload(completed, 1, 10, [])!;
    expect(result.dependentTransfers).toEqual(['Player3 → Player4']);
    expect(result.dependentTransfers).not.toContain('Player1 → Player2');
  });

  it('includes cross-GW dependents in dependentTransfers with the GW prefix', () => {
    const completed = [t(1, 2)];
    const crossGwDeps: CrossGWDepEntry[] = [{
      gwId: 11,
      transferIndex: 0,
      outPlayerId: 2,
      inPlayerId: 3,
      outPlayerName: 'Player2',
      inPlayerName: 'Player3',
    }];
    const result = buildChainBreakPayload(completed, 0, 10, crossGwDeps)!;
    expect(result).not.toBeNull();
    expect(result.dependentTransfers).toContain('GW11: Player2 → Player3');
  });

  it('includes cross-GW dependents in crossGwDependents with gwId and transferIndex', () => {
    const completed = [t(1, 2)];
    const crossGwDeps: CrossGWDepEntry[] = [{
      gwId: 11,
      transferIndex: 2,
      outPlayerId: 2,
      inPlayerId: 3,
      outPlayerName: 'Player2',
      inPlayerName: 'Player3',
    }];
    const result = buildChainBreakPayload(completed, 0, 10, crossGwDeps)!;
    expect(result.crossGwDependents).toEqual([{ gwId: 11, transferIndex: 2 }]);
  });

  it('includes cross-GW dependents in dependentPlayerPairs with the cross-GW gwId', () => {
    const completed = [t(1, 2)];
    const crossGwDeps: CrossGWDepEntry[] = [{
      gwId: 11,
      transferIndex: 0,
      outPlayerId: 2,
      inPlayerId: 3,
      outPlayerName: 'Player2',
      inPlayerName: 'Player3',
    }];
    const result = buildChainBreakPayload(completed, 0, 10, crossGwDeps)!;
    expect(result.dependentPlayerPairs).toContainEqual({ outPlayerId: 2, inPlayerId: 3, depGwId: 11 });
  });

  it('returns null when the only cross-GW list is empty and there are no same-GW dependents', () => {
    const completed = [t(1, 2), t(3, 4)];
    expect(buildChainBreakPayload(completed, 0, 10, [])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// executeUndoChainCheck — the function used by both
// handleUndoSingleTransferWithCheck and handleUndoSingleTransferWithCheckForGW
// to dispatch the branch decision to mocked/injectable callbacks.
// Tests here call the real exported production function with vi.fn() mocks
// and verify exactly which branch is taken and what payload is passed.
// ---------------------------------------------------------------------------

describe('executeUndoChainCheck — calls onChainDetected (dialog) when dependents exist', () => {
  it('calls onChainDetected and NOT onDirectUndo when a same-GW dependent exists', () => {
    const completed = [t(1, 2), t(2, 3)];
    const onChainDetected = vi.fn<[ChainBreakPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoChainCheck(completed, 0, 10, [], onChainDetected, onDirectUndo);

    expect(onChainDetected).toHaveBeenCalledOnce();
    expect(onDirectUndo).not.toHaveBeenCalled();
  });

  it('passes the correct transferName in the payload to onChainDetected', () => {
    const completed = [t(1, 2), t(2, 3)];
    const onChainDetected = vi.fn<[ChainBreakPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoChainCheck(completed, 0, 10, [], onChainDetected, onDirectUndo);

    const payload = onChainDetected.mock.calls[0][0];
    expect(payload.transferName).toBe('Player1 → Player2');
  });

  it('passes the correct dependentTransfers in the payload to onChainDetected', () => {
    const completed = [t(1, 2), t(2, 3)];
    const onChainDetected = vi.fn<[ChainBreakPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoChainCheck(completed, 0, 10, [], onChainDetected, onDirectUndo);

    const payload = onChainDetected.mock.calls[0][0];
    expect(payload.dependentTransfers).toEqual(['Player2 → Player3']);
  });

  it('passes the correct dependentPlayerPairs in the payload to onChainDetected', () => {
    const completed = [t(1, 2), t(2, 3)];
    const onChainDetected = vi.fn<[ChainBreakPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoChainCheck(completed, 0, 10, [], onChainDetected, onDirectUndo);

    const payload = onChainDetected.mock.calls[0][0];
    expect(payload.dependentPlayerPairs).toEqual([{ outPlayerId: 2, inPlayerId: 3, depGwId: 10 }]);
  });

  it('passes gwId and transferIndex correctly in the payload', () => {
    const completed = [t(1, 2), t(2, 3)];
    const onChainDetected = vi.fn<[ChainBreakPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoChainCheck(completed, 0, 22, [], onChainDetected, onDirectUndo);

    const payload = onChainDetected.mock.calls[0][0];
    expect(payload.gwId).toBe(22);
    expect(payload.transferIndex).toBe(0);
  });

  it('lists all dependents in the payload for a full chain (A→B, B→C, C→D)', () => {
    const completed = [t(1, 2), t(2, 3), t(3, 4)];
    const onChainDetected = vi.fn<[ChainBreakPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoChainCheck(completed, 0, 10, [], onChainDetected, onDirectUndo);

    const payload = onChainDetected.mock.calls[0][0];
    expect(payload.dependentTransfers).toEqual(['Player2 → Player3', 'Player3 → Player4']);
    expect(payload.dependentPlayerPairs).toHaveLength(2);
  });

  it('calls onChainDetected when a cross-GW dependent is present (no same-GW chain)', () => {
    const completed = [t(1, 2)];
    const crossGwDeps: CrossGWDepEntry[] = [{
      gwId: 11,
      transferIndex: 0,
      outPlayerId: 2,
      inPlayerId: 3,
      outPlayerName: 'Player2',
      inPlayerName: 'Player3',
    }];
    const onChainDetected = vi.fn<[ChainBreakPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoChainCheck(completed, 0, 10, crossGwDeps, onChainDetected, onDirectUndo);

    expect(onChainDetected).toHaveBeenCalledOnce();
    const payload = onChainDetected.mock.calls[0][0];
    expect(payload.dependentTransfers).toContain('GW11: Player2 → Player3');
    expect(payload.crossGwDependents).toEqual([{ gwId: 11, transferIndex: 0 }]);
    expect(onDirectUndo).not.toHaveBeenCalled();
  });
});

describe('executeUndoChainCheck — calls onDirectUndo when no dependents', () => {
  it('calls onDirectUndo and NOT onChainDetected when transfers are unrelated', () => {
    const completed = [t(1, 2), t(3, 4)];
    const onChainDetected = vi.fn<[ChainBreakPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoChainCheck(completed, 0, 10, [], onChainDetected, onDirectUndo);

    expect(onDirectUndo).toHaveBeenCalledOnce();
    expect(onChainDetected).not.toHaveBeenCalled();
  });

  it('calls onDirectUndo when the target is the last transfer (no downstream)', () => {
    const completed = [t(1, 2), t(2, 3)];
    const onChainDetected = vi.fn<[ChainBreakPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoChainCheck(completed, 1, 10, [], onChainDetected, onDirectUndo);

    expect(onDirectUndo).toHaveBeenCalledOnce();
    expect(onChainDetected).not.toHaveBeenCalled();
  });

  it('calls onDirectUndo for a single-item list with no cross-GW deps', () => {
    const completed = [t(5, 6)];
    const onChainDetected = vi.fn<[ChainBreakPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoChainCheck(completed, 0, 10, [], onChainDetected, onDirectUndo);

    expect(onDirectUndo).toHaveBeenCalledOnce();
    expect(onChainDetected).not.toHaveBeenCalled();
  });

  it('calls onDirectUndo when mid-chain upstream transfer has no downstream', () => {
    // index 0: 1→2 (unrelated), index 1: 3→4 (target, no downstream)
    const completed = [t(1, 2), t(3, 4), t(5, 6)];
    const onChainDetected = vi.fn<[ChainBreakPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoChainCheck(completed, 1, 10, [], onChainDetected, onDirectUndo);

    expect(onDirectUndo).toHaveBeenCalledOnce();
    expect(onChainDetected).not.toHaveBeenCalled();
  });
});
